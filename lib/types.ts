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
  target_clicks: number | null;
  click_count: number | null;
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

export function isStaff(role: Role | null | undefined) {
  return role === "admin" || role === "manager";
}
