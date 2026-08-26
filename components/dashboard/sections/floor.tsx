"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Attendance, FloorPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: keyof FloorPayload["counts"] | "working"; status: string[]; title: string }[] = [
  { key: "on_timer", status: ["on_timer"], title: "On timer" },
  { key: "idle", status: ["idle"], title: "Idle" },
  { key: "lunch", status: ["lunch"], title: "Lunch" },
  { key: "not_started", status: ["not_started"], title: "Not started" },
  { key: "late", status: ["late"], title: "Late" },
  { key: "on_leave", status: ["on_leave", "holiday", "sunday"], title: "On leave" },
];

function timeLabel(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function remainingLabel(seconds: number | undefined) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")} left`;
}

export function FloorSection() {
  const [payload, setPayload] = useState<FloorPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api<FloorPayload>("/floor");
        if (!cancelled) setPayload(res);
      } catch (e) {
        if (!cancelled) toast.error(errorMessage(e));
      }
    }

    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const grouped = useMemo(() => {
    const rows = payload?.data ?? [];
    return {
      on_timer: rows.filter((r) => r.status === "on_timer"),
      idle: rows.filter((r) => r.status === "idle"),
      lunch: rows.filter((r) => r.status === "lunch"),
      not_started: rows.filter((r) => r.status === "not_started"),
      late: rows.filter((r) => r.status === "late"),
      on_leave: rows.filter((r) => r.status === "on_leave" || r.status === "holiday" || r.status === "sunday"),
      working: rows.filter((r) => r.status === "working" || r.status === "done"),
    };
  }, [payload]);

  if (!payload) return <div className="text-muted-foreground">Loading floor...</div>;

  const counts = payload.counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Live from Work Start. Late after 09:15. Idle after 20 minutes with no running session. Lunch 13:00–13:45 is not idle. Refreshes every 15s.
        </p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(payload.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <CountCard label="On timer" value={counts.on_timer} tone="accent" />
        <CountCard label="Idle" value={counts.idle} tone="warning" />
        <CountCard label="Lunch" value={counts.lunch ?? 0} />
        <CountCard label="Not started" value={counts.not_started} />
        <CountCard label="Late" value={counts.late} tone="warning" />
        <CountCard label="On leave" value={counts.on_leave} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {COLUMNS.map((col) => (
          <FloorColumn key={col.key} title={col.title} rows={grouped[col.key === "working" ? "working" : col.key] ?? []} />
        ))}
      </div>

      {grouped.working.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Working</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {grouped.working.map((row) => (
              <PersonCard key={row.employee_id} row={row} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CountCard({ label, value, tone }: { label: string; value: number; tone?: "accent" | "warning" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-2xl font-bold mt-1",
          tone === "accent" && "text-accent",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FloorColumn({ title, rows }: { title: string; rows: Attendance[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 min-h-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">None</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <PersonCard key={row.employee_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ row }: { row: Attendance }) {
  const remain = remainingLabel(row.remaining_seconds);
  return (
    <div className="rounded-xl border border-border p-3 space-y-1">
      <div className="text-sm font-medium leading-tight">{row.name}</div>
      <div className="text-[11px] text-muted-foreground">{row.unique_id}</div>
      <div className="text-xs">{row.label}</div>
      <div className="text-[11px] text-muted-foreground">
        In {timeLabel(row.in_at)}
        {row.last_at && row.status !== "on_timer" ? ` · last ${timeLabel(row.last_at)}` : ""}
        {remain ? ` · ${remain}` : ""}
      </div>
    </div>
  );
}
