/**
 * Header Component
 * Global header with logo, hamburger menu, project selector, and user avatar
 */

import { useState } from "react";
import { List as Menu } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "@/components/workspace/ProjectSelector";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-paper border-b border-rule flex items-center justify-between px-4 shadow-1 overflow-hidden">
      {/* Left Section: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="h-8 w-8 p-0 text-muted hover:text-ink hover:bg-paper-3"
        >
          <Menu className="w-5 h-5" weight="bold" />
        </Button>

        {/* Logo + Text */}
        <div className="flex items-center gap-1 -ml-4">
          <img
            src="/logo.png"
            alt="FunnelHQ"
            className="w-20 h-20 rounded-full object-cover"
            style={{ objectPosition: 'center' }}
          />
          <div className="hidden sm:flex flex-col -ml-4">
            <span className="font-semibold text-ink text-lg leading-tight tracking-tight">
              FunnelHQ
            </span>
            <span className="text-xs text-muted font-medium">
              Workspace
            </span>
          </div>
        </div>

        {/* Project Selector - Compact Box */}
        <div className="hidden md:block ml-4">
          <ProjectSelector compact />
        </div>
      </div>

      {/* Center Section: Empty spacer */}
      <div className="flex-1"></div>

      {/* Right Section: Notifications + User Avatar */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-rule transition-all"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-ink text-paper text-sm font-semibold">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-danger focus:text-danger focus:bg-danger-soft cursor-pointer"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
