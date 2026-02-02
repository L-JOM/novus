import { useState } from "react";
import Link from "next/link";
import { NovusLogo } from "@/components/novus/NovusLogo";
import { SystemStatus } from "@/components/novus/SystemStatus";
import { RoleSelector } from "@/components/novus/RoleSelector";
import { SalesRepDashboard } from "@/components/novus/SalesRepDashboard";
import { ManagerDashboard } from "@/components/novus/ManagerDashboard";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/novus";

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('sales_rep');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <NovusLogo />
            <div className="flex items-center gap-6">
              <SystemStatus />
              <RoleSelector currentRole={currentRole} onRoleChange={setCurrentRole} />
              <Button asChild variant="outline" className="font-mono text-xs uppercase tracking-wider">
                <Link href="/intake">Open Intake</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scan line effect */}
      <div className="relative h-px overflow-hidden">
        <div className="absolute inset-0 bg-primary/30 animate-scan-line" />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {currentRole === 'sales_rep' ? (
          <SalesRepDashboard />
        ) : (
          <ManagerDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>NOVUS v1.0.0</span>
            <span>PRE-QUALIFICATION & DATA SAFETY SYSTEM</span>
            <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
