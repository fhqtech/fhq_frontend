import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// R11.3d: replaced external Lottie CDN dependency (unpkg + lottie.host) with
// a self-contained SVG + CSS animation. The original load could fail
// silently on flaky connections / CDN outages, leaving a blank 120×120 box.
// Now the checkmark is shipped with the bundle (~1KB) and animates with
// stroke-dashoffset which is GPU-friendly and respects the
// "transform + opacity only" motion rule.
function LottieSuccessAnimation() {
  return (
    <div
      style={{ width: '120px', height: '120px' }}
      className="flex items-center justify-center"
      aria-label="Interview complete"
      role="img"
    >
      <svg
        viewBox="0 0 120 120"
        width="120"
        height="120"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          @keyframes flowdot-ring-draw {
            from { stroke-dashoffset: 326; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes flowdot-check-draw {
            0%, 30%  { stroke-dashoffset: 50; }
            100%     { stroke-dashoffset: 0; }
          }
          .fd-ring  { animation: flowdot-ring-draw 0.7s ease-out forwards; }
          .fd-check { animation: flowdot-check-draw 1.0s ease-out forwards; }
        `}</style>
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="326"
          strokeDashoffset="326"
          className="fd-ring"
        />
        <path
          d="M40 62 L55 76 L82 48"
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="50"
          strokeDashoffset="50"
          className="fd-check"
        />
      </svg>
    </div>
  );
}

interface InterviewThankYouProps {
  sessionData: {
    sessionId: string;
    duration: number; // in seconds
    completedAt: string;
  };
  candidateData: {
    name: string;
    email: string;
  };
  interviewData: {
    title: string;
    type: string;
    interviewId: string;
  };
  onReturnToPortal: () => void;
}

export const InterviewThankYou = ({
  sessionData,
  candidateData,
  interviewData,
  onReturnToPortal
}: InterviewThankYouProps) => {
  const [showContent, setShowContent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Trigger animations
    const timer = setTimeout(() => setShowContent(true), 300);
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getCompletedDate = () => {
    return new Date(sessionData.completedAt).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // R11.2g: fall back to full name when the first token is too short
  // (e.g. "M. Sharma" → first split = "M.", awkward greeting).
  const firstName = (() => {
    const head = (candidateData.name || "").split(" ")[0] || "";
    return head.replace(/\.$/, "").length >= 2 ? head : (candidateData.name || "").trim();
  })();

  // Format interview type for display
  const getInterviewTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'ai_interview': 'AI-Powered',
      'screening': 'Screening',
      'fitment': 'Fitment',
      'technical': 'Technical',
      'behavioral': 'Behavioral'
    };
    return typeMap[type.toLowerCase()] || type.replace(/_/g, ' ');
  };

  return (
    <div className="min-h-dvh bg-paper-2 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-success/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-info/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-success-soft/20 rounded-full blur-3xl" />
      </div>

      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div
                className={`w-3 h-3 ${
                  ['bg-success', 'bg-info', 'bg-warning', 'bg-gold', 'bg-gold'][
                    Math.floor(Math.random() * 5)
                  ]
                } ${Math.random() > 0.5 ? 'rounded-full' : 'rounded-sm rotate-45'}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-center justify-center min-h-dvh p-6">
        <div className={`w-full max-w-lg transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Card className="bg-paper/80 backdrop-blur-xs shadow-2 border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Header with role title + badge on same line, Lottie on left */}
              <div className="px-6 py-6">
                {/* Role title and type badge on same line */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-bold text-ink-soft">
                    {interviewData.title}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-soft text-info">
                    {getInterviewTypeLabel(interviewData.type)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <LottieSuccessAnimation />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[hsl(var(--ink))] mb-1">
                      Interview complete, {firstName}.
                    </h1>
                    <p className="text-muted text-sm mb-3">
                      Your interview has been successfully completed
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <span><span className="font-semibold">{formatTime(sessionData.duration)}</span> duration</span>
                      <span className="text-muted-2">•</span>
                      <span>{getCompletedDate()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Next Section */}
              <div className="px-8 py-6 bg-paper-2 from-gray-50">
                <h3 className="text-sm font-bold text-ink-soft mb-4">What happens next?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-soft rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-success">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">Confirmation sent</p>
                      <p className="text-xs text-muted">Check your email at {candidateData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-info-soft rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-info">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">Talent Analysis Graph in progress</p>
                      <p className="text-xs text-muted">Your responses are being scored against the role rubric. Usually ready in 1–2 minutes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gold-soft rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-gold-ink">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">You'll hear back</p>
                      <p className="text-xs text-muted">The hiring team reviews your TAG and reaches out within 3–5 business days.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 bg-paper-2 border-t border-rule">
                <Button
                  onClick={onReturnToPortal}
                  className="w-full bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper py-6 rounded-xl font-medium transition-all hover:shadow-2"
                >
                  Close Window
                </Button>
                <p className="text-center text-xs text-muted-2 mt-3">
                  Reference: {sessionData.sessionId.slice(0, 12).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Powered by */}
          <p className="text-center text-xs text-muted-2 mt-6">
            Powered by <span className="font-semibold">FlowDot AI</span>
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
