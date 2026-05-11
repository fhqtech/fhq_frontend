import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Mail, Lock, Loader2, User, Briefcase, FileText, Brain, MessageSquare, Clock, Users, Zap, BarChart3, Calendar } from "lucide-react";

const ProductLanding = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
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
      const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
      if (pendingInvitationToken) {
        localStorage.removeItem('pendingInvitationToken');
        navigate(`/accept-invitation/${pendingInvitationToken}`);
      } else {
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
    <div className="min-h-screen flex overflow-hidden relative bg-[#0a0a0b]">
      {/* Subtle gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
             style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15"
             style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* Left Side - Hero Section */}
      <div className="flex-1 hidden lg:flex flex-col justify-center px-12 xl:px-16 relative z-10">
        <div className="max-w-xl">
          {/* Logo */}
          <div className="mb-12">
            <span className="text-2xl font-bold text-white">FunnelHQ</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Hire Smarter.<br />
            Hire Faster.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              90% Lower Cost.
            </span>
          </h1>

          <p className="text-lg text-white/50 mb-12">
            AI handles the screening. You make the decisions.
          </p>

          {/* Two Portal Cards */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {/* Candidate Portal */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-white">Candidate Portal</span>
              </div>
              <p className="text-xs text-white/40 mb-3">Self-service, AI-driven</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <FileText className="w-3 h-3 text-blue-400/70" />
                  Resume parsing
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Brain className="w-3 h-3 text-blue-400/70" />
                  AI skill assessment
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <MessageSquare className="w-3 h-3 text-blue-400/70" />
                  Voice/text Q&A
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Clock className="w-3 h-3 text-blue-400/70" />
                  Real-time tracking
                </li>
              </ul>
            </div>

            {/* Recruiter App */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-white">Recruiter App</span>
              </div>
              <p className="text-xs text-white/40 mb-3">Control Tower</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Users className="w-3 h-3 text-purple-400/70" />
                  AI-ranked shortlists
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <BarChart3 className="w-3 h-3 text-purple-400/70" />
                  Skill gap scoring
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Zap className="w-3 h-3 text-purple-400/70" />
                  Auto-generated questions
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="w-3 h-3 text-purple-400/70" />
                  One-click scheduling
                </li>
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-bold text-white">10K+</div>
              <div className="text-xs text-white/40">Interviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">95%</div>
              <div className="text-xs text-white/40">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">90%</div>
              <div className="text-xs text-white/40">Cost Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold text-white">FunnelHQ</span>
          </div>

          <Card className="border-0 rounded-2xl shadow-2xl" style={{ background: 'rgba(255, 255, 255, 0.98)' }}>
            <CardHeader className="text-center pb-4 pt-8 px-8">
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
              <CardDescription className="text-gray-500">Sign in to your dashboard</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-8 pb-6">
              <Button
                variant="outline"
                className="w-full h-12 text-sm font-medium border rounded-lg hover:bg-gray-50"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative py-2">
                <Separator />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 text-xs text-gray-400 bg-white">or</span>
                </span>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 text-sm"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium bg-gray-900 hover:bg-gray-800"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 text-center text-xs px-8 pb-8 text-gray-500">
              <div>
                Don't have an account?{" "}
                <button className="font-medium text-blue-600 hover:underline">Contact Sales</button>
              </div>
              <button className="text-gray-400 hover:underline">Forgot password?</button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductLanding;
