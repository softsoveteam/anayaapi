"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import { Logo } from "@/components/brand/logo";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";
import { useRouter } from "next/navigation";

interface HeaderProps {
  activeSection: Section;
}

const sectionTitles: Record<Section, string> = {
  overview: "Overview",
  floor: "Floor",
  employees: "Employees",
  computers: "Computers",
  sites: "Sites / Work",
  reports: "Work Report",
  calendar: "Calendar",
  salary: "Salary",
  analytics: "Analytics",
  settings: "Settings",
};

export function Header({ activeSection }: HeaderProps) {
  const { user, logout, role } = useAuth();
  const router = useRouter();
  const initials = (user?.name || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <Logo variant="mark" className="h-8 w-8 md:hidden" imgClassName="h-8 w-8" />
        <h1 className="text-xl font-semibold text-foreground">
          {activeSection === "salary" && !isStaff(role) ? "Earnings" : sectionTitles[activeSection]}
        </h1>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-foreground">{user?.name}</div>
          <div className="text-xs text-muted-foreground">{user?.unique_id}</div>
        </div>
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary">
          <div className="w-full h-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-xs font-semibold text-accent-foreground">
            {initials}
          </div>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          )}
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
