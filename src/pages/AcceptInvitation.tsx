import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, LogOut } from 'lucide-react';

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'wrong_user'>('loading');
  const [message, setMessage] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [invitedEmail, setInvitedEmail] = useState<string>('');
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }

    // Check if this invitation was previously dismissed
    const dismissedInvitations = JSON.parse(localStorage.getItem('dismissedInvitations') || '[]');
    if (dismissedInvitations.includes(token)) {
      setHasBeenDismissed(true);
      // Redirect silently if already dismissed
      if (user) {
        navigate('/interviews/manage');
        return;
      }
    }

    // Check if user is logged in
    if (!user) {
      // Store token and redirect to login
      localStorage.setItem('pendingInvitationToken', token);
      navigate('/', { state: { message: 'Please log in to accept the invitation' } });
      return;
    }

    // User is logged in, accept the invitation
    acceptInvitation();
  }, [token, user]);

  const acceptInvitation = async () => {
    try {
      // C4: env-driven URLs. Hardcoded localhost shipped to prod meant
      // the candidate flow broke entirely on Vercel.
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const CONTROL_TOWER = import.meta.env.VITE_CONTROL_TOWER_URL || 'http://localhost:8084';
      // First, get invitation details
      const detailsResponse = await fetch(`${API_BASE}/api/accept-invitation/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!detailsResponse.ok) {
        if (detailsResponse.status === 410) {
          const errorData = await detailsResponse.json();
          throw new Error(errorData.error || 'This invitation has already been used or cancelled');
        }
        throw new Error('Invalid or expired invitation');
      }

      const detailsData = await detailsResponse.json();
      const invitation = detailsData.invitation;
      setInvitationDetails(invitation);
      setInvitedEmail(invitation.email);

      // Check if logged in user's email matches the invitation email
      if (user?.email && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        // Check if already dismissed - if so, redirect silently
        if (hasBeenDismissed) {
          navigate('/interviews/manage');
          return;
        }

        // First time seeing this wrong account error - show it
        setCurrentEmail(user.email);
        setStatus('wrong_user');
        setMessage(`This invitation was sent to ${invitation.email}, but you're logged in as ${user.email}`);
        return;
      }

      // Now accept the invitation
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const acceptResponse = await fetch(
        `${API_BASE}/api/workspaces/${invitation.workspaceId}/invitations/${invitation.invitationId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!acceptResponse.ok) {
        const errorData = await acceptResponse.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      // Clear this invitation from dismissed list on successful acceptance
      const dismissedInvitations = JSON.parse(localStorage.getItem('dismissedInvitations') || '[]');
      const updated = dismissedInvitations.filter((t: string) => t !== token);
      localStorage.setItem('dismissedInvitations', JSON.stringify(updated));

      setStatus('success');
      setMessage(`You've been added to the workspace and "${invitation.listName}" list as ${invitation.role}`);

      // Redirect to Control Tower after 2 seconds with workspace ID and token
      setTimeout(() => {
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
        window.location.href = `${CONTROL_TOWER}/talent-pools?workspace=${invitation.workspaceId}&token=${authToken}`;
      }, 2000);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation');
    }
  };

  const handleLogoutAndRetry = async () => {
    // Store the token before logging out
    localStorage.setItem('pendingInvitationToken', token!);
    // Logout and redirect to login
    await logout();
    navigate('/', { state: { message: `Please log in with ${invitedEmail} to accept this invitation` } });
  };

  const handleDismiss = () => {
    // Save to dismissed list
    const dismissedInvitations = JSON.parse(localStorage.getItem('dismissedInvitations') || '[]');
    if (!dismissedInvitations.includes(token)) {
      dismissedInvitations.push(token);
      localStorage.setItem('dismissedInvitations', JSON.stringify(dismissedInvitations));
    }

    // Redirect to dashboard
    navigate('/interviews/manage');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Invitation</h2>
            <p className="text-slate-600">Please wait while we add you to the workspace...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
            <p className="text-slate-600 mb-4">{message}</p>
            {invitationDetails && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-slate-500 mb-1">List</p>
                <p className="font-semibold text-slate-900">{invitationDetails.listName}</p>
                <p className="text-sm text-slate-500 mt-3 mb-1">Role</p>
                <p className="font-semibold text-slate-900">{invitationDetails.role}</p>
                <p className="text-sm text-slate-500 mt-3 mb-1">Invited by</p>
                <p className="font-semibold text-slate-900">{invitationDetails.inviterName}</p>
              </div>
            )}
            <p className="text-sm text-slate-500">Redirecting to Control Tower...</p>
          </div>
        )}

        {status === 'wrong_user' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Wrong Account</h2>
            <p className="text-slate-600 mb-4">{message}</p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-slate-500 mb-1">Invitation sent to</p>
              <p className="font-semibold text-slate-900 mb-3">{invitedEmail}</p>
              <p className="text-sm text-slate-500 mb-1">Currently logged in as</p>
              <p className="font-semibold text-slate-900">{currentEmail}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleLogoutAndRetry}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout and Login with Correct Account
              </button>
              <button
                onClick={handleDismiss}
                className="w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
                aria-label="Dismiss this invitation and continue using your current account"
              >
                Skip this invitation
              </button>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Skipping won't accept the invitation. To join this list as {invitedEmail}, log out and log back in with that email.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
