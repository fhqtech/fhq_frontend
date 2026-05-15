/**
 * NotificationBell Component
 * Shows pending invitations and allows users to accept/dismiss them
 */

import { useState, useEffect } from "react";
import { Bell, X, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  email: string;
  role: string;
  context: string;
  resourceId?: string;
  projectName?: string;
  workspaceId: string;
  workspaceName?: string;
  status: string;
  invitedBy: string;
  inviterName?: string;
  invitedAt: any;
  expiresAt: any;
}

export function NotificationBell() {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch invitations on mount and when user changes
  useEffect(() => {
    if (user?.email) {
      fetchInvitations();
      // Poll every 30 seconds for new invitations
      const interval = setInterval(fetchInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  const fetchInvitations = async () => {
    if (!user?.email) return;

    try {
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');

      // Fetch ALL invitations across all workspaces
      const response = await fetch(
        `http://localhost:8082/api/invitations/all?email=${encodeURIComponent(user.email)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        console.error('Failed to fetch invitations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    // Check if email matches
    if (user?.email && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      toast({
        title: "Wrong Account",
        description: `This invitation is for ${invitation.email}. Please log out and sign in with the correct account.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8082/api/workspaces/${invitation.workspaceId}/invitations/${invitation.id}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Invitation Accepted",
          description: `You've been added to ${invitation.projectName || 'the project'} as ${invitation.role}`,
        });

        // Refresh invitations list
        await fetchInvitations();

        // Close dropdown
        setIsOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (invitation: Invitation) => {
    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8082/api/workspaces/${invitation.workspaceId}/invitations/${invitation.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Invitation Dismissed",
          description: "The invitation has been removed from your notifications",
        });

        // Refresh invitations list
        await fetchInvitations();
      } else {
        throw new Error('Failed to dismiss invitation');
      }
    } catch (error: any) {
      console.error('Error dismissing invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAndRetry = async (invitation: Invitation) => {
    toast({
      title: "Logging out",
      description: `Please log in with ${invitation.email} to accept this invitation`,
    });

    setTimeout(async () => {
      await logout();
      navigate('/', { state: { message: `Please log in with ${invitation.email} to accept this invitation` } });
    }, 1000);
  };

  const pendingCount = invitations.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full hover:bg-paper-3 transition-all"
        >
          <Bell className="w-5 h-5 text-muted" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-paper text-xs font-bold flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-4 border-b border-rule bg-paper-2">
          <h3 className="font-bold text-ink">Project Invitations</h3>
          <p className="text-xs text-muted mt-1">
            {pendingCount === 0 ? 'No pending invitations' : `You have ${pendingCount} pending ${pendingCount === 1 ? 'invitation' : 'invitations'}`}
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {invitations.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-2 mx-auto mb-2" />
              <p className="text-sm text-muted">No pending invitations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invitations.map((invitation) => {
                const isWrongAccount = user?.email && user.email.toLowerCase() !== invitation.email.toLowerCase();

                return (
                  <div key={invitation.id} className={`p-4 ${isWrongAccount ? 'bg-orange-soft' : 'hover:bg-paper-2'} transition-colors`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-ink">
                            {invitation.projectName || 'Project'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-paper-3 text-ink-soft font-medium">
                            {invitation.role}
                          </span>
                        </div>

                        {invitation.workspaceName && (
                          <p className="text-xs text-muted mb-1">
                            Workspace: <span className="font-medium">{invitation.workspaceName}</span>
                          </p>
                        )}

                        <p className="text-xs text-muted mb-2">
                          Invited by <span className="font-medium">{invitation.inviterName || 'Administrator'}</span>
                        </p>

                        {isWrongAccount && (
                          <div className="mb-2 p-2 bg-orange-soft border border-rule rounded-md">
                            <p className="text-xs text-orange-ink font-medium">Wrong account</p>
                            <p className="text-xs text-orange-ink/80 mt-1">
                              This invitation is for <span className="font-semibold">{invitation.email}</span>
                            </p>
                            <p className="text-xs text-orange-ink/80">
                              You're logged in as <span className="font-semibold">{user?.email}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          {isWrongAccount ? (
                            <>
                              <button
                                onClick={() => handleLogoutAndRetry(invitation)}
                                disabled={isLoading}
                                className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-paper text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <LogOut className="w-3 h-3" />
                                Switch Account
                              </button>
                              <button
                                onClick={() => handleDismiss(invitation)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-paper-3 hover:bg-paper-4 text-ink-soft text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAccept(invitation)}
                                disabled={isLoading}
                                className="flex-1 px-3 py-1.5 bg-ink hover:bg-ink-soft text-paper text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleDismiss(invitation)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-paper-3 hover:bg-paper-4 text-ink-soft text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
