import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  SquaresFour as LayoutDashboard,
  UserPlus,
  Users,
  Gear as Settings,
  ChartBar as BarChart3,
  Briefcase,
  CaretDown as ChevronDown,
  Robot as Bot,
  List as Menu,
  X,
  Play,
  Power
} from "phosphor-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SpinnerWithCopy } from "@/components/ui/spinner";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  // { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }, // Hidden - users go directly to Manage Interviews
  { title: "Quick Tour", url: "/quick-tour", icon: Play },
  {
    title: "Interviews",
    icon: Briefcase,
    subItems: [
      { title: "Create Interview", url: "/interviews/create" },
      { title: "Screening", url: "/interviews/manage" },
      { title: "Role Fitment", url: "/interviews/fitment" }
    ]
  },
  { title: "Candidate Pools", url: "/lists", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings }
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<string[]>(["Interviews"]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => {
    // Special case: /analytics/list/* should highlight Lists menu
    if (path === "/lists" && location.pathname.startsWith("/analytics/list/")) {
      return true;
    }
    // Special case: /interviews/:id should highlight Manage Interviews
    if (path === "/interviews/manage" && location.pathname.match(/^\/interviews\/[^/]+$/)) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isSubItemActive = (item: any) => {
    return item.subItems?.some((sub: any) => isActive(sub.url)) || isActive(item.url);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Logout Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center">
          <SpinnerWithCopy size="lg" label="Signing out…" />
        </div>
      )}

      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full shadow-sm pt-4",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-2">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isMenuOpen = openMenus.includes(item.title);

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                open={isMenuOpen && !collapsed}
                onOpenChange={() => toggleMenu(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between text-left px-3 py-2 rounded-sm transition-all !font-semibold text-xs uppercase tracking-widest",
                      isSubItemActive(item) && "bg-[#222831] text-white shadow-md",
                      !isSubItemActive(item) && "text-gray-700 hover:bg-[#393E46] hover:text-white",
                      collapsed && "justify-center"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
                    </div>
                    {!collapsed && <ChevronDown className={cn("w-4 h-4 transition-transform", isMenuOpen && "rotate-180")} />}
                  </Button>
                </CollapsibleTrigger>
                {!collapsed && (
                  <CollapsibleContent className="space-y-1 mt-1">
                    {item.subItems?.map((subItem) => (
                      <NavLink
                        key={subItem.url}
                        to={subItem.url}
                        className={({ isActive }) => cn(
                          "block py-2 px-3 ml-7 text-xs rounded-sm transition-all font-semibold uppercase tracking-wider",
                          isActive
                            ? "bg-[#222831] text-white shadow-md"
                            : "text-gray-600 hover:bg-[#393E46] hover:text-white"
                        )}
                      >
                        {subItem.title}
                      </NavLink>
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          }

          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={() => cn(
                "flex items-center rounded-sm transition-all font-semibold text-xs uppercase tracking-widest",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                isActive(item.url)
                  ? "bg-[#222831] text-white shadow-md"
                  : "text-gray-700 hover:bg-[#393E46] hover:text-white"
              )}
            >
              <item.icon className={cn("transition-all", collapsed ? "w-6 h-6" : "w-4 h-4")} />
              {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 mt-auto">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold text-xs uppercase tracking-wider",
                collapsed ? "justify-center p-2" : "justify-start"
              )}
              disabled={isLoggingOut}
            >
              <Power className={cn("transition-all", collapsed ? "w-6 h-6" : "w-4 h-4")} />
              {!collapsed && (
                <span className="ml-3 whitespace-nowrap">
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </span>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out? You'll be redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </>
  );
}