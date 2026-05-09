import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const OAuth2Handler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/?error=oauth_failed');
        return;
      }

      if (token) {
        try {
          // Store the token
          localStorage.setItem('auth_token', token);
          
          // Trigger the AuthContext to re-check authentication status
          // This will fetch user data and update the context
          await checkAuthStatus();

          setIsProcessing(false);

          // Check for pending invitation
          const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
          if (pendingInvitationToken) {
            localStorage.removeItem('pendingInvitationToken');
            navigate(`/accept-invitation/${pendingInvitationToken}`);
          } else {
            // Navigate to manage interviews after successful authentication
            navigate('/interviews/manage');
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          setIsProcessing(false);
          navigate('/?error=oauth_failed');
        }
      } else {
        setIsProcessing(false);
        navigate('/');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, checkAuthStatus]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuth2Handler;