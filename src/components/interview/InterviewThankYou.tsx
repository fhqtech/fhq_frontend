import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Lottie Animation Component for success checkmark
function LottieSuccessAnimation() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div style={{ width: '120px', height: '120px' }}>
      <dotlottie-wc
        src="https://lottie.host/db5b5b60-3c23-4be9-b4d0-14cf5f7aec52/BSWIQQvqZx.lottie"
        style={{ width: '120px', height: '120px' } as any}
        autoplay="true"
        loop="false"
      />
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

  const firstName = candidateData.name.split(' ')[0];

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
    <div className="min-h-screen bg-[#EEEEEE] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/20 rounded-full blur-3xl" />
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
                  ['bg-green-400', 'bg-blue-400', 'bg-yellow-400', 'bg-pink-400', 'bg-purple-400'][
                    Math.floor(Math.random() * 5)
                  ]
                } ${Math.random() > 0.5 ? 'rounded-full' : 'rounded-sm rotate-45'}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className={`w-full max-w-lg transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Header with role title + badge on same line, Lottie on left */}
              <div className="px-6 py-6">
                {/* Role title and type badge on same line */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    {interviewData.title}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {getInterviewTypeLabel(interviewData.type)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <LottieSuccessAnimation />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[#222831] mb-1">
                      Great job, {firstName}!
                    </h1>
                    <p className="text-gray-500 text-sm mb-3">
                      Your interview has been successfully completed
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span><span className="font-semibold">{formatTime(sessionData.duration)}</span> duration</span>
                      <span className="text-gray-300">•</span>
                      <span>{getCompletedDate()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Next Section */}
              <div className="px-8 py-6 bg-gradient-to-b from-gray-50 to-white">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">What happens next?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-700">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Confirmation sent</p>
                      <p className="text-xs text-gray-500">Check your email at {candidateData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-700">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Review in progress</p>
                      <p className="text-xs text-gray-500">Our team will evaluate your responses</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-purple-700">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">We'll be in touch</p>
                      <p className="text-xs text-gray-500">Expect updates within 3-5 business days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
                <Button
                  onClick={onReturnToPortal}
                  className="w-full bg-[#222831] hover:bg-[#393E46] text-white py-6 rounded-xl font-medium transition-all hover:shadow-lg"
                >
                  Close Window
                </Button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Reference: {sessionData.sessionId.slice(0, 12).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Powered by */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Powered by <span className="font-semibold">FunnelHQ</span>
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
