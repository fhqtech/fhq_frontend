import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  Settings,
  GitBranch as ProgramsIcon,
  Bookmark as BookmarksIcon,
  Home as HomeIcon,
  Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SpinnerWithCopy } from "@/components/ui/spinner";
import { MadeInIndiaMark } from "@/components/brand/MadeInIndiaMark";
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

// unified_ia: the single collapsed nav. Role is the only object; screening/
// practical/interview/fitment/decision are stages inside a role, so their
// standalone nav entries are gone. Shortlists is the saved-view over Talent.
const UNIFIED_MENU = [
  { title: "Home", url: "/home", icon: HomeIcon },
  { title: "Roles", url: "/roles", icon: ProgramsIcon },
  { title: "Talent", url: "/talent", icon: Users },
  { title: "Shortlists", url: "/lists", icon: BookmarksIcon },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const items = UNIFIED_MENU;

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
        <div className="fixed inset-0 bg-background z-9999 flex items-center justify-center">
          <SpinnerWithCopy size="lg" label="Signing out…" />
        </div>
      )}

      <div className={cn(
        "bg-paper border-r border-rule transition-all duration-300 flex flex-col h-full shadow-1 pt-4",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-2">
        {items.map((item) => {
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={() => cn(
                "flex items-center rounded-sm transition-all text-sm font-medium",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                isActive(item.url)
                  ? "bg-paper-3 text-ink border-l-2 border-gold"
                  : "text-ink-soft hover:text-ink hover:bg-paper-3"
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
                "w-full text-danger hover:text-danger hover:bg-danger-soft text-sm font-medium",
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
                className="bg-danger hover:bg-danger/90 text-paper"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {!collapsed && (
          <div className="pt-3 mt-3 border-t border-rule flex justify-center">
            <MadeInIndiaMark size="sm" className="opacity-70" />
          </div>
        )}
      </div>
    </div>
    </>
  );
}