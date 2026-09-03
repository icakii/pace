import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function ensureSubscription() {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return subscription;
}

async function saveSubscription(userId, subscription) {
  const json = subscription.toJSON();
  await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );
}

export async function getNotificationSettings(userId) {
  const { data } = await supabase.from("notification_settings").select("*").eq("user_id", userId).maybeSingle();
  return (
    data || {
      user_id: userId,
      task_reminders: false,
      thoughts_reminder: false,
      thoughts_reminder_time: "20:00",
      payment_reminders: false,
      payment_reminder_days: 2,
    }
  );
}

export async function enablePush(userId, kind) {
  if (!pushSupported()) throw new Error("Notifications aren't supported on this browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const subscription = await ensureSubscription();
  await saveSubscription(userId, subscription);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await supabase
    .from("notification_settings")
    .upsert({ user_id: userId, [kind]: true, timezone }, { onConflict: "user_id" })
    .select()
    .single();
  return data;
}

export async function disablePush(userId, kind) {
  const { data } = await supabase
    .from("notification_settings")
    .upsert({ user_id: userId, [kind]: false }, { onConflict: "user_id" })
    .select()
    .single();
  return data;
}

export async function setThoughtsReminderTime(userId, time) {
  const { data } = await supabase
    .from("notification_settings")
    .upsert({ user_id: userId, thoughts_reminder_time: time }, { onConflict: "user_id" })
    .select()
    .single();
  return data;
}

export async function setPaymentReminderDays(userId, days) {
  const { data } = await supabase
    .from("notification_settings")
    .upsert({ user_id: userId, payment_reminder_days: days }, { onConflict: "user_id" })
    .select()
    .single();
  return data;
}
