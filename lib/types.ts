import type { Pace } from "./pace";

export type Role = "admin" | "manager" | "employee";

export type EmployeeStatus =
  | "interview"
  | "interview_pass"
  | "onboarded"
  | "joined"
  | "rejected"
  | "inactive";

export type User = {
  id: number;
  unique_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  status: EmployeeStatus;
  status_label: string;
  interview_date: string | null;
  joining_date: string | null;
  monthly_salary: number | null;
  notes: string | null;
  role: Role | null;
  roles: Role[];
  computers?: {
    assignment_id: number;
    computer_id: number;
    unique_number: string;
    label: string | null;
    assigned_at: string | null;
  }[];
  created_at?: string;
};

export type Computer = {
  id: number;
  unique_number: string;
  label: string | null;
  status: "available" | "assigned" | "maintenance" | "retired";
  notes: string | null;
  assigned_to: {
    assignment_id: number;
    employee_id: number;
    name: string;
    unique_id: string;
    assigned_at: string | null;
  } | null;
};

export type Keyword = {
  id: number;
  site_id: number;
  keyword: string;
  status: string;
};

export type Site = {
  id: number;
  name: string;
  url: string;
  status: string;
  notes: string | null;
  keywords: Keyword[];
};

export type Assignment = {
  id: number;
  employee_id: number;
  employee: { id: number; name: string; unique_id: string };
  site_id: number;
  site: { id: number; name: string; url: string };
  keyword_id: number;
  keyword: string;
  work_date: string;
  target_clicks: number | null;
  is_auto_copied: boolean;
  scheduled_by: string | null;
  report: { id: number; click_count: number; submitted_at: string | null } | null;
};

export type TodayTask = {
  assignment_id: number;
  site_id: number;
  site_name: string;
  site_url: string;
  keyword_id: number;
  keyword: string;
  target_clicks?: number | null;
  click_count: number | null;
  remaining?: number | null;
  notes: string | null;
  submitted_at: string | null;
};

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  interview: "Interview",
  interview_pass: "Interview Pass",
  onboarded: "Onboarded",
  joined: "Joined",
  rejected: "Rejected",
  inactive: "Inactive",
};

export type WorkSessionSite = {
  site_id: number;
  site_name: string | null;
  keyword?: string | null;
  assignment_id: number;
};

export type WorkSession = {
  id: number;
  status: "running" | "completed" | string;
  duration_seconds: number;
  remaining_seconds: number;
  started_at: string;
  ends_at: string;
  finished_at: string | null;
  site_count: number;
  computer_count?: number;
  clicks_awarded: number;
  sites: WorkSessionSite[];
};

export type WorkSessionPayload = {
  session_minutes: number;
  today_clicks: number;
  today_sessions: number;
  pace?: Pace;
  current: WorkSession | null;
  logs: WorkSession[];
};

export type Holiday = {
  id: number;
  date: string;
  name: string;
  notes: string | null;
};

export type LeaveRequest = {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  unique_id?: string | null;
  start_date: string;
  end_date: string;
  days: number;
  portion?: number;
  half?: "morning" | "afternoon" | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

export type LeaveItem = {
  date: string;
  portion: number;
  kind: "paid" | "unpaid" | "mixed" | string;
};

export type OvertimeSession = {
  id: number;
  started_at: string;
  finished_at: string;
  overtime_seconds: number;
  overtime_hours: number;
};

export type PayrollRow = {
  employee_id: number;
  name: string;
  unique_id: string;
  month: string;
  calendar_days: number;
  base: number;
  day_rate: number;
  hourly_rate: number;
  overtime_hourly_rate: number;
  paid_leave_quota: number;
  paid_leave_used: number;
  leave_days: number;
  unpaid_leave_days: number;
  leave_dates: string[];
  leave_items?: LeaveItem[];
  leave_deduction: number;
  overtime_seconds: number;
  overtime_hours: number;
  overtime_pay: number;
  net: number;
  frozen?: boolean;
  frozen_at?: string | null;
  overtime_sessions?: OvertimeSession[];
};

export type Attendance = {
  employee_id?: number;
  name?: string;
  unique_id?: string;
  status: string;
  label: string;
  late: boolean;
  in_at: string | null;
  last_at: string | null;
  remaining_seconds?: number;
};

export type FloorPayload = {
  now: string;
  counts: {
    on_timer: number;
    idle: number;
    not_started: number;
    late: number;
    on_leave: number;
    working?: number;
    holiday?: number;
  };
  data: Attendance[];
};

export type CalendarPayload = {
  month: string;
  work_start: string;
  work_end: string;
  paid_leave_quota: number;
  holidays: Holiday[];
  leaves: LeaveRequest[];
  pending?: LeaveRequest[];
};

export function isStaff(role: Role | null | undefined) {
  return role === "admin" || role === "manager";
}
