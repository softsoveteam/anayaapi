"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { currentMonth, inr, shiftMonth } from "@/lib/money";
import type { PayrollRow } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SalaryIndex = {
  month: string;
  calendar_days: number;
  totals: { employees: number; base: number; leave_deduction: number; overtime_pay: number; net: number };
  data: PayrollRow[];
};

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function SalarySection() {
  const { role } = useAuth();
  if (isStaff(role)) return <AdminSalary />;
  return <EmployeeEarnings />;
}

function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="min-w-[180px] text-center font-semibold">{monthLabel(month)}</div>
      <Button variant="outline" size="icon" onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AdminSalary() {
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<SalaryIndex | null>(null);

  useEffect(() => {
    api<SalaryIndex>(`/salary?month=${month}`)
      .then(setReport)
      .catch((e) => toast.error(errorMessage(e)));
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} onChange={setMonth} />
        <p className="text-sm text-muted-foreground">
          Day rate = monthly salary ÷ {report?.calendar_days ?? "—"} calendar days. OT after 6:00 PM is 2×.
        </p>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Employees" value={String(report.totals.employees)} />
            <Stat label="Base payroll" value={inr(report.totals.base)} />
            <Stat label="Leave deductions" value={inr(report.totals.leave_deduction)} />
            <Stat label="Net payout" value={inr(report.totals.net)} sub={`OT ${inr(report.totals.overtime_pay)}`} />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Paid leave</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                  <TableHead className="text-right">Leave cut</TableHead>
                  <TableHead className="text-right">OT hours</TableHead>
                  <TableHead className="text-right">OT pay</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.map((row) => (
                  <TableRow key={row.employee_id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.unique_id}</div>
                    </TableCell>
                    <TableCell className="text-right">{inr(row.base)}</TableCell>
                    <TableCell className="text-right">{row.paid_leave_used}/{row.paid_leave_quota}</TableCell>
                    <TableCell className="text-right">{row.unpaid_leave_days}</TableCell>
                    <TableCell className="text-right">{inr(row.leave_deduction)}</TableCell>
                    <TableCell className="text-right">{row.overtime_hours}</TableCell>
                    <TableCell className="text-right">{inr(row.overtime_pay)}</TableCell>
                    <TableCell className="text-right font-semibold text-accent">{inr(row.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">Loading salary report...</div>
      )}
    </div>
  );
}

function EmployeeEarnings() {
  const [month, setMonth] = useState(currentMonth());
  const [row, setRow] = useState<PayrollRow | null>(null);

  useEffect(() => {
    api<PayrollRow>(`/my/earnings?month=${month}`)
      .then(setRow)
      .catch((e) => toast.error(errorMessage(e)));
  }, [month]);

  if (!row) return <div className="text-muted-foreground">Loading earnings...</div>;

  return (
    <div className="space-y-6">
      <MonthNav month={month} onChange={setMonth} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Base salary" value={inr(row.base)} sub={`${row.calendar_days} days · ${inr(row.day_rate)} / day`} />
        <Stat label="Paid leave used" value={`${row.paid_leave_used}/${row.paid_leave_quota}`} sub={`${row.leave_days} leave day${row.leave_days === 1 ? "" : "s"} this month`} />
        <Stat label="Leave deduction" value={inr(row.leave_deduction)} sub={`${row.unpaid_leave_days} extra day${row.unpaid_leave_days === 1 ? "" : "s"}`} />
        <Stat label="Net earnings" value={inr(row.net)} sub={`OT ${row.overtime_hours}h · ${inr(row.overtime_pay)}`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-2">
          <h3 className="font-semibold">How this month is calculated</h3>
          <Line k="Hourly rate" v={inr(row.hourly_rate)} />
          <Line k="Overtime rate (2×)" v={inr(row.overtime_hourly_rate)} />
          <Line k="OT after 6:00 PM" v={`${row.overtime_hours} hours`} />
          <Line k="Extra leave days" v={String(row.unpaid_leave_days)} />
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-2">
          <h3 className="font-semibold">Approved leave dates</h3>
          {row.leave_dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved leave this month.</p>
          ) : (
            row.leave_dates.map((d, i) => (
              <div key={d} className="text-sm flex justify-between">
                <span>{d}</span>
                <span className="text-muted-foreground">{i === 0 ? "Paid" : "Deducted"}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Overtime sessions</h3>
          <p className="text-xs text-muted-foreground mt-1">Work Start time after 6:00 PM, plus Sunday or holiday sessions.</p>
        </div>
        {(row.overtime_sessions || []).length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No overtime this month.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead className="text-right">OT hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {row.overtime_sessions?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.started_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(s.finished_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{s.overtime_hours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
