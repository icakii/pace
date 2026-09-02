// Deno Edge Function — run every 15 minutes by a Supabase Cron Job.
// Sends: (1) "1 hour before" reminders for timed tasks, (2) a midday summary
// for today's tasks that have no set time, (3) a configurable daily nudge to
// write a thought if none was written yet today.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// -- date helpers (mirrors src/lib/occurrences.js, reimplemented for Deno/plain dates) --

function isoWeekday(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

function mondayOnOrBefore(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (isoWeekday(dateStr) - 1));
  return d;
}

function weeksBetween(dateStr: string, anchorStr: string) {
  const a = mondayOnOrBefore(dateStr).getTime();
  const b = mondayOnOrBefore(anchorStr).getTime();
  return Math.round((a - b) / (7 * 24 * 60 * 60 * 1000));
}

function occursOnDate(task: any, dateStr: string) {
  const isRecurring = Array.isArray(task.recurrence_days) && task.recurrence_days.length > 0;
  if (!isRecurring) return task.due_date === dateStr;
  if (!task.due_date) return false;
  if (dateStr < task.due_date) return false;
  if (!task.recurrence_days.includes(isoWeekday(dateStr))) return false;
  const interval = task.recurrence_interval || 1;
  return weeksBetween(dateStr, task.due_date) % interval === 0;
}

function isCompletedForDate(task: any, dateStr: string) {
  const isRecurring = Array.isArray(task.recurrence_days) && task.recurrence_days.length > 0;
  if (isRecurring) return (task.completed_dates || []).includes(dateStr);
  return !!task.completed;
}

// Interpret `${dateStr}T${timeStr}` as wall-clock time in `timeZone`, return the equivalent UTC Date.
function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string) {
  const asUTC = new Date(`${dateStr}T${timeStr}:00Z`);
  const tzString = asUTC.toLocaleString("en-US", { timeZone });
  const utcString = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const offset = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asUTC.getTime() + offset);
}

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    minutesSinceMidnight: parseInt(get("hour")!, 10) * 60 + parseInt(get("minute")!, 10),
  };
}

// -- push sending --

async function sendToUser(userId: string, subsByUser: Map<string, any[]>, payload: Record<string, unknown>) {
  const subs = subsByUser.get(userId) || [];
  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("push failed", userId, err?.message);
      }
    }
  }
}

Deno.serve(async () => {
  const now = new Date();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .or("task_reminders.eq.true,thoughts_reminder.eq.true");

  if (!settings || settings.length === 0) {
    return new Response(JSON.stringify({ ok: true, checked: 0 }), { status: 200 });
  }

  const userIds = settings.map((s) => s.user_id);

  const [{ data: subs }, { data: tasks }] = await Promise.all([
    supabase.from("push_subscriptions").select("*").in("user_id", userIds),
    supabase.from("tasks").select("*").in("user_id", userIds),
  ]);

  const subsByUser = new Map<string, any[]>();
  for (const s of subs || []) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }

  const tasksByUser = new Map<string, any[]>();
  for (const t of tasks || []) {
    if (!tasksByUser.has(t.user_id)) tasksByUser.set(t.user_id, []);
    tasksByUser.get(t.user_id)!.push(t);
  }

  let sent = 0;

  for (const setting of settings) {
    const userId = setting.user_id;
    if (!subsByUser.has(userId)) continue;

    const timezone = setting.timezone || "UTC";
    const { dateStr: todayLocal, minutesSinceMidnight } = localParts(now, timezone);
    const userTasks = (tasksByUser.get(userId) || []).filter(
      (t) => occursOnDate(t, todayLocal) && !isCompletedForDate(t, todayLocal)
    );

    if (setting.task_reminders) {
      // Timed tasks due in ~55-70 minutes.
      for (const task of userTasks) {
        if (!task.start_time) continue;
        const startUtc = zonedTimeToUtc(todayLocal, task.start_time.slice(0, 5), timezone);
        const minutesUntil = (startUtc.getTime() - now.getTime()) / 60000;
        if (minutesUntil >= 55 && minutesUntil <= 70) {
          await sendToUser(userId, subsByUser, {
            title: "⏰ Coming up",
            body: `${task.title} is due in about an hour`,
            url: "/tasks",
          });
          sent++;
        }
      }

      // Midday summary for floating (no start_time) tasks.
      if (
        minutesSinceMidnight >= 12 * 60 &&
        minutesSinceMidnight < 12 * 60 + 15 &&
        setting.last_floating_task_nudge !== todayLocal
      ) {
        const floating = userTasks.filter((t) => !t.start_time);
        if (floating.length > 0) {
          const body =
            floating.length <= 2
              ? `Today: ${floating.map((t) => t.title).join(", ")}`
              : `You've got ${floating.length} tasks on your plate today`;
          await sendToUser(userId, subsByUser, { title: "🗒️ Today's tasks", body, url: "/tasks" });
          sent++;
        }
        await supabase
          .from("notification_settings")
          .update({ last_floating_task_nudge: todayLocal })
          .eq("user_id", userId);
      }
    }

    if (setting.thoughts_reminder && setting.last_thoughts_nudge !== todayLocal) {
      const reminderTime = (setting.thoughts_reminder_time || "20:00").slice(0, 5);
      const [rh, rm] = reminderTime.split(":").map(Number);
      const reminderMinutes = rh * 60 + rm;
      if (minutesSinceMidnight >= reminderMinutes && minutesSinceMidnight < reminderMinutes + 15) {
        const dayStartUtc = zonedTimeToUtc(todayLocal, "00:00", timezone);
        const { data: existingThought } = await supabase
          .from("thoughts")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", dayStartUtc.toISOString())
          .limit(1)
          .maybeSingle();

        if (!existingThought) {
          await sendToUser(userId, subsByUser, {
            title: "📝 Haven't written today's thought yet?",
            body: "Take a minute to jot something down.",
            url: "/thoughts",
          });
          sent++;
        }
        await supabase.from("notification_settings").update({ last_thoughts_nudge: todayLocal }).eq("user_id", userId);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: settings.length, sent }), { status: 200 });
});
