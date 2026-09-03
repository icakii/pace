import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Check,
  CreditCard,
  FolderPlus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  CYCLES,
  COMMON_CURRENCIES,
  monthlyEquivalent,
  yearlyEquivalent,
  formatMoney,
  formatNextCharge,
} from "@/lib/payments";
import {
  getNotificationSettings,
  enablePush,
  disablePush,
  setPaymentReminderDays,
} from "@/lib/push";

const emptyForm = {
  title: "",
  description: "",
  amount: "",
  currency: "USD",
  billing_cycle: "monthly",
  next_charge_date: "",
  card_last4: "",
  group_id: "",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [newGroupName, setNewGroupName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const [notifSettings, setNotifSettings] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("payment_groups").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("recurring_payments").select("*").eq("user_id", user.id).order("created_at"),
      getNotificationSettings(user.id),
    ]).then(([groupsRes, paymentsRes, settings]) => {
      setGroups(groupsRes.data || []);
      setPayments(paymentsRes.data || []);
      setNotifSettings(settings);
      setLoading(false);
    });
  }, [user]);

  const currencies = useMemo(() => {
    const set = new Set(payments.map((p) => p.currency));
    return [...set].sort();
  }, [payments]);

  useEffect(() => {
    if (!selectedCurrency && currencies.length > 0) setSelectedCurrency(currencies[0]);
  }, [currencies, selectedCurrency]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    const { data } = await supabase
      .from("payment_groups")
      .insert({ user_id: user.id, name: newGroupName.trim() })
      .select()
      .single();
    if (data) {
      setGroups((prev) => [...prev, data]);
      setNewGroupName("");
    }
  };

  const removeGroup = async (group) => {
    await supabase.from("payment_groups").delete().eq("id", group.id);
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    setPayments((prev) => prev.map((p) => (p.group_id === group.id ? { ...p, group_id: null } : p)));
  };

  const resetForm = () => setForm(emptyForm);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.next_charge_date) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("recurring_payments")
      .insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        amount: Number(form.amount),
        currency: form.currency,
        billing_cycle: form.billing_cycle,
        next_charge_date: form.next_charge_date,
        card_last4: form.card_last4 || null,
        group_id: form.group_id || null,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setPayments((prev) => [...prev, data]);
      resetForm();
    }
  };

  const togglePaused = async (payment) => {
    const { data } = await supabase
      .from("recurring_payments")
      .update({ active: !payment.active })
      .eq("id", payment.id)
      .select()
      .single();
    if (data) setPayments((prev) => prev.map((p) => (p.id === payment.id ? data : p)));
  };

  const removePayment = async (payment) => {
    await supabase.from("recurring_payments").delete().eq("id", payment.id);
    setPayments((prev) => prev.filter((p) => p.id !== payment.id));
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      title: p.title,
      description: p.description || "",
      amount: String(p.amount),
      currency: p.currency,
      billing_cycle: p.billing_cycle,
      next_charge_date: p.next_charge_date,
      card_last4: p.card_last4 || "",
      group_id: p.group_id || "",
    });
  };

  const saveEdit = async (payment) => {
    const { data } = await supabase
      .from("recurring_payments")
      .update({
        title: editForm.title.trim() || payment.title,
        description: editForm.description.trim() || null,
        amount: Number(editForm.amount),
        currency: editForm.currency,
        billing_cycle: editForm.billing_cycle,
        next_charge_date: editForm.next_charge_date,
        card_last4: editForm.card_last4 || null,
        group_id: editForm.group_id || null,
      })
      .eq("id", payment.id)
      .select()
      .single();
    if (data) setPayments((prev) => prev.map((p) => (p.id === payment.id ? data : p)));
    setEditingId(null);
  };

  const handleReminderToggle = async (checked) => {
    setNotifLoading(true);
    try {
      const updated = checked ? await enablePush(user.id, "payment_reminders") : await disablePush(user.id, "payment_reminders");
      setNotifSettings(updated);
    } catch (err) {
      alert(err.message || "Something went wrong enabling reminders");
    } finally {
      setNotifLoading(false);
    }
  };

  const handleReminderDays = async (e) => {
    const days = Math.max(0, Number(e.target.value) || 0);
    setNotifSettings((prev) => ({ ...prev, payment_reminder_days: days }));
    const updated = await setPaymentReminderDays(user.id, days);
    setNotifSettings(updated);
  };

  const groupTotals = (groupId) => {
    const items = payments.filter(
      (p) => p.active && p.currency === selectedCurrency && (p.group_id || null) === groupId
    );
    const monthly = items.reduce((sum, p) => sum + monthlyEquivalent(Number(p.amount), p.billing_cycle), 0);
    const yearly = items.reduce((sum, p) => sum + yearlyEquivalent(Number(p.amount), p.billing_cycle), 0);
    return { monthly, yearly, count: items.length };
  };

  const grandTotal = groupTotals(null);
  const grandTotalAll = groups.reduce(
    (acc, g) => {
      const t = groupTotals(g.id);
      return { monthly: acc.monthly + t.monthly, yearly: acc.yearly + t.yearly };
    },
    { monthly: grandTotal.monthly, yearly: grandTotal.yearly }
  );

  const sections = [...groups.map((g) => ({ id: g.id, name: g.name })), { id: null, name: "Ungrouped" }];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl md:text-5xl font-medium">Recurring Payments</h1>
          <p className="mt-2 text-muted-foreground">
            Subscriptions, bills, installments — anything that charges you on a cycle.
          </p>
        </div>
        {currencies.length > 1 && (
          <Select value={selectedCurrency || ""} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      {selectedCurrency && (
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Per month</p>
            <p className="mt-2 font-heading text-2xl font-medium">{formatMoney(grandTotalAll.monthly, selectedCurrency)}</p>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Per year</p>
            <p className="mt-2 font-heading text-2xl font-medium">{formatMoney(grandTotalAll.yearly, selectedCurrency)}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Netflix, Rent, Gym..."
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-28"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Cycle</label>
            <Select value={form.billing_cycle} onValueChange={(v) => setForm((f) => ({ ...f, billing_cycle: v }))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CYCLES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Next charge</label>
            <Input
              type="date"
              value={form.next_charge_date}
              onChange={(e) => setForm((f) => ({ ...f, next_charge_date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Card last 4</label>
            <Input
              value={form.card_last4}
              onChange={(e) => setForm((f) => ({ ...f, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              placeholder="4242"
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Group</label>
            <Select value={form.group_id} onValueChange={(v) => setForm((f) => ({ ...f, group_id: v }))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional note"
            />
          </div>
          <Button type="submit" disabled={saving} className="md:ml-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-background/60 p-3">
          <FolderPlus className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name (e.g. Personal, Client X)"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGroup();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addGroup}>Add group</Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3 rounded-3xl bg-card p-6 shadow-soft">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        sections.map((section) => {
          const items = payments.filter((p) => (p.group_id || null) === section.id);
          // Hide the "Ungrouped" bucket entirely when nothing's in it; real groups
          // always show so they can still be managed/deleted even when empty.
          if (section.id === null && items.length === 0) return null;
          const totals = selectedCurrency ? groupTotals(section.id) : null;

          return (
            <section key={section.id ?? "ungrouped"} className="rounded-3xl bg-card p-4 shadow-soft md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-medium">{section.name}</h2>
                  {section.id && (
                    <button
                      onClick={() => removeGroup(groups.find((g) => g.id === section.id))}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete group"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {totals && totals.count > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(totals.monthly, selectedCurrency)}/mo · {formatMoney(totals.yearly, selectedCurrency)}/yr
                  </p>
                )}
              </div>

              {items.length === 0 ? (
                <p className="py-6 text-center text-sm italic text-muted-foreground">Nothing here yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {items.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                      {editingId === p.id ? (
                        <>
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                            className="flex-1 min-w-[120px]"
                            autoFocus
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                            className="w-24"
                          />
                          <Select value={editForm.currency} onValueChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}>
                            <SelectTrigger className="w-[85px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COMMON_CURRENCIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={editForm.billing_cycle} onValueChange={(v) => setEditForm((f) => ({ ...f, billing_cycle: v }))}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CYCLES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={editForm.next_charge_date}
                            onChange={(e) => setEditForm((f) => ({ ...f, next_charge_date: e.target.value }))}
                          />
                          <Select value={editForm.group_id} onValueChange={(v) => setEditForm((f) => ({ ...f, group_id: v }))}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button onClick={() => saveEdit(p)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Save">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Switch checked={p.active} onCheckedChange={() => togglePaused(p)} aria-label="Active" />
                          <div className="flex-1 min-w-[120px]">
                            <span className={`text-sm ${!p.active ? "text-muted-foreground line-through" : ""}`}>
                              {p.title}
                            </span>
                            {p.description && (
                              <span className="ml-2 text-xs text-muted-foreground">{p.description}</span>
                            )}
                          </div>
                          {p.card_last4 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CreditCard className="h-3 w-3" />•••• {p.card_last4}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{p.billing_cycle}</span>
                          <span className="text-xs text-muted-foreground">Next: {formatNextCharge(p)}</span>
                          <span className="text-sm font-medium">{formatMoney(Number(p.amount), p.currency)}</span>
                          <button onClick={() => startEdit(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => removePayment(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {!loading && payments.length === 0 && (
        <p className="rounded-3xl bg-card p-10 text-center text-sm italic text-muted-foreground shadow-soft">
          No recurring payments yet — add your first one above. 💳
        </p>
      )}

      <section className="max-w-md rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="font-heading text-xl font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" /> Reminders
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Get a push notification before a charge hits.</p>
        {notifSettings && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Payment reminders</p>
              <Switch
                checked={!!notifSettings.payment_reminders}
                onCheckedChange={handleReminderToggle}
                disabled={notifLoading}
              />
            </div>
            {notifSettings.payment_reminders && (
              <div className="flex items-center justify-between">
                <Label htmlFor="reminder-days" className="text-xs text-muted-foreground">Days before charge</Label>
                <Input
                  id="reminder-days"
                  type="number"
                  min="0"
                  max="30"
                  value={notifSettings.payment_reminder_days}
                  onChange={handleReminderDays}
                  className="w-20"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
