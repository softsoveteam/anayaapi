export type Pace = {
  employee_id?: number;
  name?: string;
  unique_id?: string;
  computers: number;
  sites: number;
  keywords?: number;
  tabs?: number;
  multiple_keywords?: boolean;
  clicks_per_session: number;
  session_minutes: number;
  done: number;
  sessions_left: number;
  expected_remaining: number;
  expected_today: number;
  window_start_at: string;
  work_end_at: string;
  lunch_start_at?: string;
  lunch_end_at?: string;
  off: string | null;
};

export type TeamPace = {
  now: string;
  remaining: number;
  done: number;
  expected_today: number;
  data: Pace[];
};

function overlapSeconds(startMs: number, endMs: number, lunchStartMs: number, lunchEndMs: number) {
  const overlapStart = Math.max(startMs, lunchStartMs);
  const overlapEnd = Math.min(endMs, lunchEndMs);
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 1000;
}

export function liveSessionsLeft(
  pace: Pick<Pace, "window_start_at" | "work_end_at" | "session_minutes" | "lunch_start_at" | "lunch_end_at">,
  now = Date.now()
) {
  const start = Math.max(now, new Date(pace.window_start_at).getTime());
  const end = new Date(pace.work_end_at).getTime();
  if (end <= start || pace.session_minutes < 1) return 0;
  let seconds = (end - start) / 1000;
  if (pace.lunch_start_at && pace.lunch_end_at) {
    seconds -= overlapSeconds(
      start,
      end,
      new Date(pace.lunch_start_at).getTime(),
      new Date(pace.lunch_end_at).getTime()
    );
  }
  if (seconds <= 0) return 0;
  return Math.floor(seconds / (pace.session_minutes * 60));
}

export function liveExpectedRemaining(pace: Pace, now = Date.now()) {
  return liveSessionsLeft(pace, now) * pace.clicks_per_session;
}

export function liveTeamRemaining(rows: Pace[] | undefined, now = Date.now()) {
  return (rows || []).reduce((sum, row) => sum + liveExpectedRemaining(row, now), 0);
}
