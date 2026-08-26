"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { OverviewSection } from "@/components/dashboard/sections/overview";
import { EmployeesSection } from "@/components/dashboard/sections/employees";
import { ComputersSection } from "@/components/dashboard/sections/computers";
import { SitesSection } from "@/components/dashboard/sections/sites";
import { ReportsSection } from "@/components/dashboard/sections/reports";
import { AnalyticsSection } from "@/components/dashboard/sections/analytics";
import { SettingsSection } from "@/components/dashboard/sections/settings";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";

export type Section =
  | "overview"
  | "employees"
  | "computers"
  | "sites"
  | "reports"
  | "analytics"
  | "settings";

export default function Dashboard() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!isStaff(role) && (activeSection === "employees" || activeSection === "sites" || activeSection === "analytics")) {
      setActiveSection("overview");
    }
  }, [role, activeSection]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Logo variant="mark" className="h-16" />
        <p className="text-muted-foreground text-sm">Loading Anaya...</p>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "employees":
        return <EmployeesSection />;
      case "computers":
        return <ComputersSection />;
      case "sites":
        return <SitesSection />;
      case "reports":
        return <ReportsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <Header activeSection={activeSection} />
        <main className="flex-1 p-6 overflow-auto">
          <div
            key={activeSection}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
