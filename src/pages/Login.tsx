import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Mail, Lock, Loader2, Sparkles, Zap, Users2, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import FlowyConversationBox from "@/components/FlowyConversationBox";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const phrases = [
    "Full Attention",
    "Real Chance"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check for pending invitation
      const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
      if (pendingInvitationToken) {
        localStorage.removeItem('pendingInvitationToken');
        navigate(`/accept-invitation/${pendingInvitationToken}`);
      } else {
        navigate("/interviews/manage");
      }
    }
  }, [isAuthenticated, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    try {
      await login(email, password);

      // Check for pending invitation
      const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
      if (pendingInvitationToken) {
        localStorage.removeItem('pendingInvitationToken');
        toast({
          title: "Success",
          description: "Login successful! Processing your invitation...",
        });
        navigate(`/accept-invitation/${pendingInvitationToken}`);
      } else {
        toast({
          title: "Success",
          description: "Login successful! Redirecting to manage interviews...",
        });
        navigate("/interviews/manage");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during login.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      toast({
        title: "Google Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during Google login.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1420 100%)' }}>
      {/* Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dot Grid Pattern */}
        <div className="absolute inset-0"
             style={{
               backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               opacity: 0.3
             }}>
        </div>

        {/* Subtle Line Grid Overlay */}
        <div className="absolute inset-0"
             style={{
               backgroundImage: `
                 linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
               `,
               backgroundSize: '80px 80px'
             }}>
        </div>

        {/* Glow Gradient Orbs - These will mask/hide the grid */}
        <div className="absolute -top-64 -right-64 w-[800px] h-[800px] rounded-full blur-[120px] opacity-40"
             style={{
               background: 'radial-gradient(circle, hsl(217, 91%, 35%) 0%, transparent 60%)',
               mixBlendMode: 'screen'
             }}></div>
        <div className="absolute -top-64 -right-64 w-[900px] h-[900px] rounded-full blur-[140px] opacity-35"
             style={{
               background: 'radial-gradient(circle, hsl(32, 95%, 45%) 0%, transparent 60%)',
               mixBlendMode: 'screen'
             }}></div>
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full blur-[100px] opacity-25"
             style={{
               background: 'radial-gradient(circle, hsl(280, 70%, 45%) 0%, transparent 65%)',
               mixBlendMode: 'screen'
             }}></div>
      </div>

      {/* Left Side - Hero Section */}
      <div className="flex-1 hidden lg:flex flex-col justify-center px-8 xl:px-12 relative z-10">
        <div className="max-w-2xl">
          {/* Logo and Brand */}
          <div className="mb-20">
            <span className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              Flowdot AI
            </span>
          </div>

          {/* Hero Headline */}
          <div className="mb-16">
            <style>{`
              @keyframes gradientFlow {
                0% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
                100% {
                  background-position: 0% 50%;
                }
              }
              @keyframes fadeIn {
                0% {
                  opacity: 0;
                  transform: translateY(10px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
{/* <h2 className="text-6xl font-bold leading-tight mb-6" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              <span className="block">Every candidate deserves</span>
              <span className="block">
                <span className="inline-block" style={{ minWidth: '550px' }}>
                  your <span className="text-7xl font-bold inline-block whitespace-nowrap"
                        key={phraseIndex}
                        style={{
                          background: 'linear-gradient(90deg, hsl(217, 91%, 45%), hsl(280, 70%, 50%), hsl(32, 95%, 55%), hsl(217, 91%, 45%))',
                          backgroundSize: '300% 100%',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          letterSpacing: '0.02em',
                          animation: 'gradientFlow 6s ease infinite, fadeIn 0.5s ease-in-out'
                        }}>{phrases[phraseIndex]}</span>
                </span>
              </span>
            </h2> */}

          </div>

          {/* Talk to Flowy Section with AI-inspired design */}
          <div className="mb-16 relative inline-block w-full max-w-xl">
            <style>{`
              @keyframes glowWave {
                0% {
                  background-position: 0% 50%;
                  border-radius: 16px 40px 24px 32px;
                }
                25% {
                  background-position: 50% 0%;
                  border-radius: 40px 24px 32px 16px;
                }
                50% {
                  background-position: 100% 50%;
                  border-radius: 24px 32px 16px 40px;
                }
                75% {
                  background-position: 50% 100%;
                  border-radius: 32px 16px 40px 24px;
                }
                100% {
                  background-position: 0% 50%;
                  border-radius: 16px 40px 24px 32px;
                }
              }
            `}</style>

            {/* Outer glow effect */}
            <div className="absolute -inset-2 opacity-75 blur-lg"
                 style={{
                   background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #764ba2 75%, #667eea 100%)',
                   backgroundSize: '400% 400%',
                   animation: 'glowWave 6s ease-in-out infinite'
                 }}></div>

            {/* Main container */}
            <div className="relative border-2 rounded-sm p-10 px-12 text-center backdrop-blur-sm"
                 style={{
                   borderColor: 'rgba(102, 126, 234, 0.5)',
                   background: 'rgba(15, 20, 32, 0.8)'
                 }}>
              <div>
                {/* Speak to her section */}
                <div className="flex items-center gap-3 mb-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" className="text-white/70">
                    <path d="M56,96v64a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0ZM88,24a8,8,0,0,0-8,8V224a8,8,0,0,0,16,0V32A8,8,0,0,0,88,24Zm40,32a8,8,0,0,0-8,8V192a8,8,0,0,0,16,0V64A8,8,0,0,0,128,56Zm40,32a8,8,0,0,0-8,8v64a8,8,0,0,0,16,0V96A8,8,0,0,0,168,88Zm40-16a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V80A8,8,0,0,0,208,72Z"></path>
                  </svg>
                  <span className="text-sm uppercase" style={{ color: '#f093fb', letterSpacing: '0.3em' }}>talk to her</span>
                </div>

                <p className="font-normal text-left text-6xl tracking-wide"
                   style={{
                     background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     backgroundClip: 'text'
                   }}>
                  Ready to meet<br />Flowy?
                </p>
                <p className="text-base mt-4 text-white/60 italic text-left">
                  Talent Discovery made human, powered by AI
                </p>

                {/* Flowy Conversation Box - replaces button */}
                <FlowyConversationBox />
              </div>
            </div>
          </div>

          <p className="text-lg leading-relaxed mb-8 whitespace-nowrap" style={{ color: 'rgba(156, 163, 175, 0.9)' }}>
            AI that interviews thousands while you sleep. You wake up to Actionable insights.
          </p>

          {/* Stats Only - Minimal and Clean */}
          <div className="grid grid-cols-3 gap-12">
            <div>
              <div className="text-4xl font-bold mb-1"
                   style={{
                     background: 'linear-gradient(135deg, hsl(217, 91%, 55%) 0%, hsl(32, 95%, 65%) 100%)',
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     backgroundClip: 'text'
                   }}>
                10K+
              </div>
              <div className="text-sm text-gray-400">Interviews Conducted</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1"
                   style={{
                     background: 'linear-gradient(135deg, hsl(142, 76%, 56%) 0%, hsl(142, 76%, 36%) 100%)',
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     backgroundClip: 'text'
                   }}>
                95%
              </div>
              <div className="text-sm text-gray-400">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1"
                   style={{
                     background: 'linear-gradient(135deg, hsl(32, 95%, 65%) 0%, hsl(38, 92%, 50%) 100%)',
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     backgroundClip: 'text'
                   }}>
                50%
              </div>
              <div className="text-sm text-gray-400">Time Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              Flowdot AI
            </span>
          </div>

          <Card className="border-0 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden"
                style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <CardHeader className="text-center pb-6 pt-10 px-8">
              <CardTitle className="text-3xl font-bold mb-2" style={{ color: 'hsl(210, 24%, 16%)' }}>
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base" style={{ color: 'hsl(210, 12%, 52%)' }}>
                Sign in to continue to your dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-8 pb-8">
              {/* Google Sign In Button */}
              <Button
                variant="outline"
                className="w-full h-13 text-base font-medium border-2 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] hover:bg-white"
                style={{ borderColor: 'hsl(210, 16%, 90%)', backgroundColor: 'white', color: 'hsl(210, 24%, 16%)' }}
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="relative py-3">
                <Separator style={{ backgroundColor: 'hsl(210, 16%, 90%)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-4 text-sm font-medium"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'hsl(210, 12%, 52%)' }}>
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-5 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold" style={{ color: 'hsl(210, 24%, 16%)' }}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4"
                          style={{ color: 'hsl(210, 12%, 52%)' }} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-13 border-2 rounded-xl text-base transition-all focus:scale-[1.01]"
                      style={{ borderColor: 'hsl(210, 16%, 90%)', backgroundColor: 'white' }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold" style={{ color: 'hsl(210, 24%, 16%)' }}>
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4"
                          style={{ color: 'hsl(210, 12%, 52%)' }} />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-13 border-2 rounded-xl text-base transition-all focus:scale-[1.01]"
                      style={{ borderColor: 'hsl(210, 16%, 90%)', backgroundColor: 'white' }}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-13 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(217, 91%, 45%) 0%, hsl(217, 91%, 35%) 100%)',
                    color: 'white',
                    border: 'none'
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 text-center text-sm px-8 pb-8"
                        style={{ color: 'hsl(210, 12%, 52%)' }}>
              <div>
                <span>Don't have an account? </span>
                <button className="font-semibold hover:underline transition-all"
                        style={{ color: 'hsl(217, 91%, 45%)' }}>
                  Contact Sales
                </button>
              </div>
              <div>
                <button className="font-medium hover:underline transition-all"
                        style={{ color: 'hsl(210, 12%, 52%)' }}>
                  Forgot password?
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
