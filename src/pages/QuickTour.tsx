import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Play, Robot as Bot, Users, Target, ChartBar as BarChart3, CheckCircle, Clock, FileText, Phone, Envelope as Mail, ChatCircle as MessageSquare, X } from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import aiAvatar from "@/assets/ai-avatar.png";

// Lottie Animation Component
function LottieAnimation() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="mx-auto" style={{ width: '300px', height: '300px' }}>
      <dotlottie-wc
        src="https://lottie.host/22e77ece-baf6-4748-9058-c4617cfbf842/wz1gp2QbX7.lottie"
        style={{ width: '300px', height: '300px' } as any}
        autoplay="true"
        loop="true"
      />
    </div>
  );
}

const getTourSteps = (navigate: ReturnType<typeof useNavigate>) => [
  {
    id: 1,
    title: "Welcome to FunnelHQ",
    subtitle: "Your Complete AI-Powered Interview Solution",
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <img
            src={aiAvatar}
            alt="AI Assistant"
            className="w-24 h-24 mx-auto mb-6 object-cover animate-bounce"
            style={{
              animation: 'float 3s ease-in-out infinite',
            }}
          />
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
          <p className="text-base text-muted">
            Transform your hiring process with AI-powered interviews that scale with your needs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-sm shadow-1 hover:shadow-2 transition-shadow duration-200">
            <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground">Automated Screening</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI conducts interviews automatically</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-sm shadow-1 hover:shadow-2 transition-shadow duration-200">
            <BarChart3 className="w-5 h-5 text-blue-600" weight="fill" />
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground">Smart Analytics</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Detailed insights and scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-sm shadow-1 hover:shadow-2 transition-shadow duration-200">
            <Target className="w-5 h-5 text-orange-600" weight="fill" />
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground">Role-Specific Fitment</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assess for specific positions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 bg-purple-50 rounded-sm shadow-1 hover:shadow-2 transition-shadow duration-200">
            <Clock className="w-5 h-5 text-purple-600" weight="fill" />
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground">Save Time</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">80% less screening time</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Scenario 1: Mass Recruitment",
    subtitle: "Screening 500+ Candidates for Accounting Roles",
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-subtle p-6 rounded-lg">
          <h4 className="font-bold text-lg mb-2">The Challenge</h4>
          <p className="text-muted mb-4">
            TechCorp needs to hire 50 junior accountants from 500+ applications. Traditional interviews would take months.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-danger/10 p-4 rounded-lg border border-danger/20">
              <h5 className="font-semibold text-danger mb-2">Traditional Approach</h5>
              <ul className="text-sm space-y-1 text-muted">
                <li>• 500 applications to review manually</li>
                <li>• 200+ phone screenings (40 hours)</li>
                <li>• 100+ in-person interviews (80 hours)</li>
                <li>• 3-4 months timeline</li>
                <li>• High interviewer fatigue</li>
              </ul>
            </div>
            <div className="bg-success/10 p-4 rounded-lg border border-success/20">
              <h5 className="font-semibold text-success mb-2">AI Recruiter Solution</h5>
              <ul className="text-sm space-y-1 text-muted">
                <li>• AI screens all 500 candidates</li>
                <li>• Automated scoring and ranking</li>
                <li>• Focus on top 50 candidates only</li>
                <li>• 2-3 weeks timeline</li>
                <li>• Consistent evaluation criteria</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold uppercase tracking-wider">How It Works:</h4>
          <div className="space-y-2">
            <div
              className="flex items-center gap-3 p-4 bg-paper rounded-sm"
              style={{ boxShadow: 'var(--shadow-clay)' }}
            >
              <div className="w-8 h-8 bg-[hsl(var(--ink))] rounded-full flex items-center justify-center text-paper text-sm font-bold">1</div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-sm">Create Accounting Interview</p>
                <p className="text-xs text-muted uppercase tracking-wider">Set up questions covering tax, financial reporting, and analytical skills</p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-4 bg-paper rounded-sm"
              style={{ boxShadow: 'var(--shadow-clay)' }}
            >
              <div className="w-8 h-8 bg-[hsl(var(--ink))] rounded-full flex items-center justify-center text-paper text-sm font-bold">2</div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-sm">Bulk Import Candidates</p>
                <p className="text-xs text-muted uppercase tracking-wider">Upload CSV/Excel with 500 candidate details</p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-4 bg-paper rounded-sm"
              style={{ boxShadow: 'var(--shadow-clay)' }}
            >
              <div className="w-8 h-8 bg-[hsl(var(--ink))] rounded-full flex items-center justify-center text-paper text-sm font-bold">3</div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-sm">AI Conducts Interviews</p>
                <p className="text-xs text-muted uppercase tracking-wider">Each candidate gets personalized phone/video interview</p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-4 bg-paper rounded-sm"
              style={{ boxShadow: 'var(--shadow-clay)' }}
            >
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-paper text-sm font-bold">4</div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-sm">Review Results</p>
                <p className="text-xs text-muted uppercase tracking-wider">Get scored candidates ranked by performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Scenario 2: Specialized Role Fitment",
    subtitle: "Finding the Perfect Senior Developer",
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-subtle p-6 rounded-lg">
          <h4 className="font-bold text-lg mb-2">The Challenge</h4>
          <p className="text-muted mb-4">
            StartupXYZ needs a Senior React Developer with specific skills in TypeScript, Node.js, and cloud architecture.
          </p>
          
          <div className="bg-info/10 p-4 rounded-lg border border-info/20">
            <h5 className="font-semibold text-info mb-2">The Opportunity</h5>
            <p className="text-sm text-muted">
              You already have 50 candidates from previous screening interviews — say, generic Tax Manager screens. Instead of starting from scratch,
              use fitment interviews to assess their specific match for a more specialised role (e.g. Transfer Pricing Manager, GST Litigation Specialist).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Fitment Interview Process:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center text-paper text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Upload Job Description</p>
                <p className="text-sm text-muted">Paste the specific Senior React Developer requirements</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center text-paper text-sm font-bold">2</div>
              <div>
                <p className="font-medium">Auto-Shortlist or Manual Select</p>
                <p className="text-sm text-muted">Choose high-scoring candidates or manually select specific ones</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center text-paper text-sm font-bold">3</div>
              <div>
                <p className="font-medium">AI Generates Role-Specific Questions</p>
                <p className="text-sm text-muted">Creates questions about React hooks, TypeScript patterns, cloud deployment</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-paper text-sm font-bold">4</div>
              <div>
                <p className="font-medium">Get Fitment Scores</p>
                <p className="text-sm text-muted">Each candidate gets a role-specific fitment score (0-100%)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-success/10 p-4 rounded-lg border border-success/20">
          <h5 className="font-semibold text-success mb-2">Multiple Fitment Interviews</h5>
          <p className="text-sm text-muted">
            The same candidate pool can be assessed for different roles - Frontend Developer, Full-Stack Developer, 
            Tech Lead - each with its own fitment interview and scoring.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Key Features Walkthrough",
    subtitle: "Master the Platform",
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-1 hover:shadow-2 transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wider">
                <Bot className="w-5 h-5 text-ink" />
                Interview Creation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted">
                <li>• Choose from Accounting, Taxation, or Consulting</li>
                <li>• Set interview duration (15-60 minutes)</li>
                <li>• Select AI voice type (Male/Female, Professional/Friendly)</li>
                <li>• Configure communication channels (Email, Phone, SMS)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-1 hover:shadow-2 transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wider">
                <Users className="w-5 h-5 text-info" />
                Candidate Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted">
                <li>• Bulk import via CSV/Excel</li>
                <li>• Google Sheets integration</li>
                <li>• Manual candidate addition</li>
                <li>• Real-time status tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-1 hover:shadow-2 transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wider">
                <Target className="w-5 h-5 text-warning" />
                Fitment Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted">
                <li>• Upload job descriptions</li>
                <li>• Auto-generate role-specific questions</li>
                <li>• Multiple fitment interviews per candidate</li>
                <li>• Detailed compatibility scoring</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-1 hover:shadow-2 transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wider">
                <BarChart3 className="w-5 h-5 text-success" />
                Analytics & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted">
                <li>• Interview completion rates</li>
                <li>• Candidate performance scoring</li>
                <li>• Time-to-hire metrics</li>
                <li>• Comparative analysis</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-ink/10 p-6 rounded-lg border border-ink/20">
          <h4 className="font-bold text-lg mb-2 text-ink uppercase tracking-wider">Communication Channels</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-ink" />
              <div>
                <p className="font-medium">Email Invitations</p>
                <p className="text-sm text-muted">Automated personalized emails</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-6 h-6 text-ink" />
              <div>
                <p className="font-medium">Phone Interviews</p>
                <p className="text-sm text-muted">AI-powered voice calls</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-ink" />
              <div>
                <p className="font-medium">SMS Reminders</p>
                <p className="text-sm text-muted">Automated follow-ups</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Get Started",
    subtitle: "",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-8">
          <div style={{ width: '300px', height: '300px', flexShrink: 0 }}>
            <LottieAnimation />
          </div>
          <div className="text-left flex-1 pt-8 space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-1">YOU'RE ALL SET!</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                NOW YOU UNDERSTAND HOW TO LEVERAGE FUNNELHQ FOR EFFICIENT, SCALABLE HIRING.
              </p>
            </div>

            <div className="bg-paper p-6 rounded-sm shadow-1" style={{ boxShadow: 'var(--shadow-clay)' }}>
              <h4 className="font-bold mb-2 uppercase tracking-wider">Pro Tips for Success</h4>
              <ul className="text-[10px] text-left space-y-2 text-muted-foreground uppercase tracking-wider">
                <li>• Start with a small batch (10-20 candidates) to test your interview setup</li>
                <li>• Use clear, specific job descriptions for better fitment interview results</li>
                <li>• Set up multiple communication channels to maximize candidate response rates</li>
                <li>• Review and adjust AI voice settings based on your company culture</li>
                <li>• Use bulk import features for large-scale recruitment drives</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-8">
          <div style={{ width: '280px', flexShrink: 0 }}></div>
          <div className="flex-1 p-6 bg-paper rounded-sm text-left">
            <h4 className="font-bold mb-4 uppercase tracking-wider text-base">
              Create your first interview in under 5 minutes
            </h4>
            <Button
              className="bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper uppercase tracking-wider text-xs font-bold px-8"
              onClick={() => navigate("/interviews/create")}
            >
              Create Interview
            </Button>
          </div>
        </div>
      </div>
    )
  }
];

export default function QuickTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();
  const { updateTourStatus } = useAuth();

  const handleCreateInterview = () => {
    navigate("/interviews/create");
  };

  const scrollToTop = () => {
    // Try to find the main content area first
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTimeout(scrollToTop, 100);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTimeout(scrollToTop, 100);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setTimeout(scrollToTop, 100);
  };

  const handleSkipTour = async () => {
    setIsSkipping(true);
    try {
      const success = await updateTourStatus('skipped');
      if (success) {
        toast.success("Tour skipped successfully");
        navigate("/interviews/manage");
      } else {
        toast.error("Failed to skip tour");
      }
    } catch (error) {
      console.error('Error skipping tour:', error);
      toast.error("Failed to skip tour");
    } finally {
      setIsSkipping(false);
    }
  };

  const handleCompleteTour = async () => {
    setIsCompleting(true);
    try {
      const success = await updateTourStatus('completed');
      if (success) {
        toast.success("Tour completed! Welcome to your interview management!");
        navigate("/interviews/manage");
      } else {
        toast.error("Failed to complete tour");
      }
    } catch (error) {
      console.error('Error completing tour:', error);
      toast.error("Failed to complete tour");
    } finally {
      setIsCompleting(false);
    }
  };

  const tourSteps = getTourSteps(navigate);
  const currentStepData = tourSteps[currentStep];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-50 bg-background pb-4 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Quick Tour</h1>
            <p className="text-muted mt-2 text-xs uppercase tracking-wider">
              Learn how to maximize your hiring efficiency with AI Recruiter
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSkipTour}
              disabled={isSkipping || isCompleting}
              className="flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
            >
              <X className="w-4 h-4" />
              {isSkipping ? "Skipping..." : "Skip Tour"}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pb-4">
          <div className="flex justify-between text-sm text-muted-foreground uppercase tracking-wider font-bold">
            <span>Step {currentStep + 1} of {tourSteps.length}</span>
            <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-paper-3 rounded-full h-2">
            <div
              className="bg-[hsl(var(--ink))] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex gap-2 justify-center overflow-x-auto">
          {tourSteps.map((step, index) => (
            <Button
              key={step.id}
              variant={index === currentStep ? "default" : "outline-solid"}
              size="sm"
              onClick={() => handleStepClick(index)}
              className={`${index === currentStep ? "bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper border-0" : ""} text-[10px] px-3 py-1 h-8 whitespace-nowrap shrink-0 uppercase tracking-wider font-bold`}
            >
              <span className="hidden md:inline">{step.title}</span>
              <span className="md:hidden">{index + 1}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-8">

      {/* Main Content */}
      <div
        className="min-h-96 rounded-sm bg-paper transition-shadow duration-200"
        style={{ boxShadow: 'var(--shadow-clay)' }}
      >
        <div className="text-center pb-6 p-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary" className="uppercase tracking-wider text-xs rounded-sm">Step {currentStep + 1}</Badge>
          </div>
          {currentStep !== 4 && (
            <>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              {currentStepData.subtitle && (
                <p className="text-sm text-muted-foreground uppercase tracking-wider mt-2">{currentStepData.subtitle}</p>
              )}
            </>
          )}
        </div>
        <div className="px-6 pb-6">
          {currentStepData.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pb-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentStep === tourSteps.length - 1 ? (
            <Button
              onClick={handleCompleteTour}
              disabled={isCompleting || isSkipping}
              className="bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper border-0 flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
            >
              <CheckCircle className="w-4 h-4" />
              {isCompleting ? "Completing..." : "Finish Tour"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}