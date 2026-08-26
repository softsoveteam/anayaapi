"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { currentMonth, shiftMonth } from "@/lib/money";
import type { CalendarPayload, Holiday, LeaveRequest } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function iso(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function leaveSlot(leave: LeaveRequest) {
  if (leave.half === "morning") return "Morning";
  if (leave.half === "afternoon") return "Afternoon";
  return leave.days === 1 ? "Full day" : `${leave.days} days`;
}

function leaveLine(leave: LeaveRequest, withName = false) {
  const who = withName && leave.employee_name ? ` · ${leave.employee_name}` : "";
  const slot = leave.half === "morning" ? " AM" : leave.half === "afternoon" ? " PM" : "";
  const status = leave.status === "pending" ? "Leave pending" : "On leave";
  return `${status}${slot}${who}`;
}

export function CalendarSection() {
  const { role, user } = useAuth();
  const staff = isStaff(role);
  const [month, setMonth] = useState(currentMonth());
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [half, setHalf] = useState<"full" | "morning" | "afternoon">("full");
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: todayIso(), name: "", notes: "" });

  async function load() {
    const res = await api<CalendarPayload>(`/calendar?month=${month}`);
    setPayload(res);
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, [month]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const pad = first.getDay();
    const items: ({ type: "empty" } | { type: "day"; date: string; day: number; sunday: boolean })[] = [];
    for (let i = 0; i < pad; i++) items.push({ type: "empty" });
    for (let d = 1; d <= days; d++) {
      const date = iso(y, m - 1, d);
      items.push({ type: "day", date, day: d, sunday: new Date(y, m - 1, d).getDay() === 0 });
    }
    return items;
  }, [month]);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    payload?.holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [payload]);

  function leavesOn(date: string) {
    return (payload?.leaves || []).filter((l) => l.status !== "rejected" && inRange(date, l.start_date, l.end_date));
  }

  function onDayClick(date: string, sunday: boolean) {
    if (staff) {
      if (!holidayByDate.has(date) && !sunday) {
        setHolidayForm({ date, name: "", notes: "" });
        setHolidayOpen(true);
      }
      return;
    }
    if (sunday || holidayByDate.has(date) || date < todayIso()) return;
    if (!selectStart || (selectStart && selectEnd)) {
      setSelectStart(date);
      setSelectEnd(null);
      return;
    }
    if (date < selectStart) {
      setSelectEnd(selectStart);
      setSelectStart(date);
    } else {
      setSelectEnd(date);
    }
  }

  const singleDay = Boolean(selectStart && (!selectEnd || selectEnd === selectStart));

  async function applyLeave() {
    if (!selectStart) return;
    const end = selectEnd || selectStart;
    const sameDay = end === selectStart;
    try {
      await api("/my/leaves", {
        method: "POST",
        body: JSON.stringify({
          start_date: selectStart,
          end_date: end,
          half: sameDay && half !== "full" ? half : null,
          reason: reason || null,
        }),
      });
      toast.success("Leave request sent");
      setSelectStart(null);
      setSelectEnd(null);
      setReason("");
      setHalf("full");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function cancelLeave(leave: LeaveRequest) {
    try {
      await api(`/my/leaves/${leave.id}`, { method: "DELETE" });
      toast.success("Leave cancelled");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function review(leave: LeaveRequest, status: "approved" | "rejected") {
    try {
      await api(`/leaves/${leave.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function saveHoliday() {
    try {
      await api("/holidays", { method: "POST", body: JSON.stringify(holidayForm) });
      toast.success("Holiday added");
      setHolidayOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function deleteHoliday(holiday: Holiday) {
    try {
      await api(`/holidays/${holiday.id}`, { method: "DELETE" });
      toast.success("Holiday removed");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const pending = payload?.pending ?? (payload?.leaves || []).filter((l) => l.status === "pending");
  const rangeStart = selectStart;
  const rangeEnd = selectEnd || selectStart;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[180px] text-center font-semibold">{monthLabel(month)}</div>
          <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Office 9:00–18:00 · Lunch 13:00–13:45 · Mon–Sat · 1 paid leave each month
        </p>
        {staff ? (
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              setHolidayForm({ date: todayIso(), name: "", notes: "" });
              setHolidayOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add holiday
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-xs text-muted-foreground text-center py-2 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.type === "empty") return <div key={`e-${i}`} className="min-h-[88px]" />;
              const holiday = holidayByDate.get(cell.date);
              const dayLeaves = leavesOn(cell.date);
              const selected = rangeStart && rangeEnd && inRange(cell.date, rangeStart, rangeEnd);
              const isToday = cell.date === todayIso();
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => onDayClick(cell.date, cell.sunday)}
                  className={cn(
                    "min-h-[88px] rounded-xl border text-left p-2 transition-colors",
                    cell.sunday ? "border-transparent bg-secondary/40 text-muted-foreground" : "border-border hover:border-accent/50",
                    holiday && "border-chart-3/40 bg-chart-3/10",
                    dayLeaves.some((l) => l.status === "approved") && "border-accent/40 bg-accent/10",
                    dayLeaves.some((l) => l.status === "pending") && "border-warning/40 bg-warning/10",
                    selected && !staff && "ring-2 ring-accent",
                    isToday && "outline outline-1 outline-accent/40"
                  )}
                >
                  <div className="text-sm font-semibold">{cell.day}</div>
                  {holiday ? <div className="text-[10px] text-chart-3 mt-1 leading-tight">{holiday.name}</div> : null}
                  {dayLeaves.map((l) => (
                    <div key={l.id} className="text-[10px] mt-1 leading-tight text-muted-foreground">
                      {leaveLine(l, staff)}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-chart-3/40" /> Holiday</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-accent/40" /> Approved leave</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-warning/40" /> Pending leave</span>
          </div>
        </div>

        <div className="space-y-4">
          {!staff ? (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold">Apply leave</h3>
              <p className="text-xs text-muted-foreground">
                Click a working day, then the last day of the range. Same-day leave can be full, morning (09:00–13:30), or afternoon (13:30–18:00). Paid quota is 1.0 day per month.
              </p>
              <div className="text-sm">
                {selectStart ? (
                  <span>
                    {selectStart}
                    {selectEnd ? ` → ${selectEnd}` : " (click end date or submit a half day)"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No dates selected</span>
                )}
              </div>
              {singleDay ? (
                <div className="grid grid-cols-3 gap-2">
                  {(["full", "morning", "afternoon"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHalf(opt)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs capitalize",
                        half === opt ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"
                      )}
                    >
                      {opt === "full" ? "Full day" : opt}
                    </button>
                  ))}
                </div>
              ) : null}
              <Textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={applyLeave} disabled={!selectStart} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Submit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectStart(null);
                    setSelectEnd(null);
                    setHalf("full");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold">Pending leave</h3>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                pending.map((l) => (
                  <div key={l.id} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="text-sm font-medium">{l.employee_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.start_date} → {l.end_date} · {leaveSlot(l)}
                    </div>
                    {l.reason ? <div className="text-xs">{l.reason}</div> : null}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => review(l, "approved")} className="bg-accent text-accent-foreground hover:bg-accent/90">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(l, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold">Upcoming holidays</h3>
            {(payload?.holidays || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays this month.</p>
            ) : (
              payload?.holidays.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-xs text-muted-foreground">{h.date}</div>
                  </div>
                  {staff ? (
                    <Button variant="ghost" size="sm" onClick={() => deleteHoliday(h)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {!staff ? (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold">My requests</h3>
              {(payload?.leaves || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave this month.</p>
              ) : (
                payload?.leaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <div>
                        {l.start_date} → {l.end_date}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{l.status} · {leaveSlot(l)}</div>
                    </div>
                    {l.status === "pending" && l.employee_id === user?.id ? (
                      <Button variant="ghost" size="sm" onClick={() => cancelLeave(l)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Diwali" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={holidayForm.notes} onChange={(e) => setHolidayForm({ ...holidayForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveHoliday} disabled={!holidayForm.name} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Save holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
