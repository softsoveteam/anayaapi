"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { WorkSession, WorkSessionPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatCountdown(total: number) {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function remainingFromEndsAt(endsAt: string | null | undefined) {
  if (!endsAt) return 0;
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function durationLabel(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function useWorkSession(onChanged?: () => void, enabled = true) {
  const [payload, setPayload] = useState<WorkSessionPayload | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const completingRef = useRef(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const load = useCallback(async () => {
    const res = await api<WorkSessionPayload>("/my/work-session");
    setPayload(res);
    setRemaining(res.current ? remainingFromEndsAt(res.current.ends_at) : 0);
    return res;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load().catch((e) => toast.error(errorMessage(e)));
  }, [enabled, load]);

  useEffect(() => {
    if (!payload?.current) {
      setRemaining(0);
      return;
    }

    const tick = () => setRemaining(remainingFromEndsAt(payload.current?.ends_at));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [payload?.current?.id, payload?.current?.ends_at]);

  useEffect(() => {
    if (!enabled || !payload?.current || remaining > 0 || completingRef.current || busy) return;
    const sessionId = payload.current.id;
    completingRef.current = true;
    load()
      .then((res) => {
        if (res.current?.id === sessionId) {
          window.setTimeout(() => {
            completingRef.current = false;
            setRetry((n) => n + 1);
          }, 800);
          return;
        }
        const done = res.logs.find((log) => log.id === sessionId);
        toast.success(
          done
            ? `Session finished · +${done.clicks_awarded} click${done.clicks_awarded === 1 ? "" : "s"}`
            : "Session finished"
        );
        onChangedRef.current?.();
        completingRef.current = false;
      })
      .catch((e) => {
        toast.error(errorMessage(e));
        completingRef.current = false;
      });
  }, [enabled, payload?.current, remaining, busy, retry, load]);

  async function start() {
    setBusy(true);
    try {
      const res = await api<WorkSessionPayload>("/my/work-session/start", { method: "POST" });
      setPayload(res);
      setRemaining(res.current ? remainingFromEndsAt(res.current.ends_at) : 0);
      onChangedRef.current?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return { payload, remaining, busy, start, load };
}

export function WorkSessionHero({
  payload,
  remaining,
  busy,
  onStart,
}: {
  payload: WorkSessionPayload | null;
  remaining: number;
  busy: boolean;
  onStart: () => void;
}) {
  const running = Boolean(payload?.current);
  const minutes = payload?.session_minutes ?? 5;
  const siteCount = payload?.current?.site_count ?? payload?.pace?.tabs ?? payload?.pace?.sites ?? 0;
  const computers = payload?.current?.computer_count ?? payload?.pace?.computers ?? 0;
  const perSession = payload?.pace?.clicks_per_session ?? computers * siteCount;
  const multipleKeywords = Boolean(payload?.pace?.multiple_keywords);
  const progress = useMemo(() => {
    const total = payload?.current?.duration_seconds ?? minutes * 60;
    if (!total) return 0;
    return Math.min(100, ((total - remaining) / total) * 100);
  }, [payload?.current?.duration_seconds, remaining, minutes]);

  if (!payload) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 min-h-[440px] flex items-center justify-center text-muted-foreground">
        Loading work session...
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-2xl min-h-[440px] px-6 py-10 flex flex-col items-center justify-center text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(0.7_0.18_145/0.12),transparent_58%)]" />
      <div className="relative z-10 flex flex-col items-center">
        {running ? (
          <>
            <div className="text-xs uppercase tracking-[0.28em] text-accent font-semibold mb-4">
              Work in progress
            </div>
            <div className="relative mb-6">
              <div className="absolute inset-[-18px] rounded-full border border-accent/20 animate-pulse" />
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-accent/40 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center shadow-[0_0_80px_oklch(0.7_0.18_145/0.18)]">
                <Timer className="w-6 h-6 text-accent mb-2" />
                <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatCountdown(remaining)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {computers} computer{computers === 1 ? "" : "s"} × {siteCount} tab{siteCount === 1 ? "" : "s"} = {perSession} click{perSession === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <div className="w-56 sm:w-64 h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
              <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              {multipleKeywords
                ? "Keep every keyword open in its own tab on every computer. When the timer ends, each keyword gets one click per computer."
                : "Keep one tab open per site on every computer. When the timer ends, each site gets one click per computer."}
            </p>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-semibold mb-5">
              Ready to work
            </div>
            <button
              type="button"
              onClick={onStart}
              disabled={busy}
              className={cn(
                "group relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-accent/50 bg-accent text-accent-foreground",
                "shadow-[0_0_80px_oklch(0.7_0.18_145/0.28)] transition-all duration-300",
                "hover:scale-[1.03] hover:shadow-[0_0_110px_oklch(0.7_0.18_145/0.4)]",
                "disabled:opacity-70 disabled:hover:scale-100"
              )}
            >
              <span className="absolute inset-3 rounded-full border border-accent-foreground/15" />
              <span className="relative flex flex-col items-center justify-center gap-2">
                <Play className="w-8 h-8 fill-current" />
                <span className="text-3xl sm:text-4xl font-bold tracking-tight">Work Start</span>
                <span className="text-sm font-medium opacity-80">{minutes} min session</span>
              </span>
            </button>
            <p className="text-sm text-muted-foreground mt-6 max-w-md">
              Press once, open the assigned tabs on every computer, and wait. Clicks are counted when this timer finishes — {perSession || "computers × tabs"} per session.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function SessionLogs({ logs }: { logs: WorkSession[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        No work sessions yet. Press Work Start to begin the first timer.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold">Session logs</h3>
        <p className="text-xs text-muted-foreground mt-1">
          When you pressed start, when the timer finished, and clicks added (computers × tabs).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Pressed</th>
              <th className="px-5 py-3 font-medium">Finished</th>
              <th className="px-5 py-3 font-medium">Length</th>
              <th className="px-5 py-3 font-medium">Sites</th>
              <th className="px-5 py-3 font-medium text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      log.status === "running"
                        ? "bg-accent/15 text-accent"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {log.status === "running" ? "Running" : "Finished"}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">{formatWhen(log.started_at)}</td>
                <td className="px-5 py-3 whitespace-nowrap">{formatWhen(log.finished_at)}</td>
                <td className="px-5 py-3">{durationLabel(log.duration_seconds)}</td>
                <td className="px-5 py-3">
                  <div className="text-foreground">
                    {log.sites?.map((s) => s.site_name).filter(Boolean).join(", ") || `${log.site_count} sites`}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-accent">
                  {log.status === "running" ? "—" : `+${log.clicks_awarded}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
