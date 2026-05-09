/**
 * MainLayout Component
 * Layout wrapper with Header and Sidebar for recruiter portal pages
 */

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleMenuClick = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="h-screen bg-background flex flex-col w-full overflow-hidden">
      {/* Header - Fixed at top */}
      <Header onMenuClick={handleMenuClick} />

      {/* Content area with Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto">
          <div className="pl-6 pr-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
