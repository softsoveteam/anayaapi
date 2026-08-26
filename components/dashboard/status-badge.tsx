import { cn } from "@/lib/utils";
import type { EmployeeStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const styles: Record<EmployeeStatus, string> = {
  interview: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  interview_pass: "bg-warning/15 text-warning border-warning/30",
  onboarded: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  joined: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[status] || styles.inactive
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
