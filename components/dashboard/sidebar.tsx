"use client";

import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import type { Role } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth-context";
import { useAppSettings } from "@/lib/app-settings";
import {
  LayoutDashboard,
  Users,
  Monitor,
  Globe,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  ClipboardList,
  CalendarDays,
  LayoutGrid,
  Wallet,
} from "lucide-react";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const allNav: { id: Section; label: string; icon: ElementType; roles: Role[] }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
  { id: "floor", label: "Floor", icon: LayoutGrid, roles: ["admin", "manager"] },
  { id: "employees", label: "Employees", icon: Users, roles: ["admin", "manager"] },
  { id: "computers", label: "Computers", icon: Monitor, roles: ["admin", "manager", "employee"] },
  { id: "sites", label: "Sites / Work", icon: Globe, roles: ["admin", "manager"] },
  { id: "reports", label: "Work Report", icon: ClipboardList, roles: ["admin", "manager", "employee"] },
  { id: "calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "manager", "employee"] },
  { id: "salary", label: "Salary", icon: Wallet, roles: ["admin", "manager"] },
  { id: "salary", label: "Earnings", icon: Wallet, roles: ["employee"] },
  { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "manager"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin", "manager", "employee"] },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const { role, user } = useAuth();
  const { settings } = useAppSettings();
  const navItems = allNav.filter((item) => {
    if (!role || !item.roles.includes(role)) return false;
    if (item.id === "salary" && role === "employee" && !settings?.employee_earnings) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="h-16 flex items-center px-3 border-b border-sidebar-border">
        {collapsed ? (
          <Logo variant="mark" className="h-9 w-full" imgClassName="h-9 w-9" />
        ) : (
          <Logo className="h-10 w-full px-1" />
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-200",
                  isActive ? "text-accent" : "group-hover:scale-110"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user ? (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user.name}
            <div className="text-[11px] uppercase tracking-wide mt-0.5">
              {user.unique_id} · {isStaff(role) ? role : "employee"}
            </div>
          </div>
        ) : null}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
