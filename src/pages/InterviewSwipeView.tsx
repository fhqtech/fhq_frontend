import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CandidateCard } from "@/components/interview/CandidateCard";

interface Candidate {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  score?: number;
  session_id?: string;
  swipe_decision?: {
    decision: 'shortlist' | 'reject';
    decided_at: string;
  };
}

export default function InterviewSwipeView() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [otpVerified, setOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [reviewerName, setReviewerName] = useState(() => localStorage.getItem('swipe_reviewer_name') || "");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  // C3: previously referenced but never declared, crashing the page on the
  // OTP-verify path. Read from query string (?otp=) where the QR code
  // embeds it; null if absent (handler shows a friendly error in that case).
  const expectedOtp = searchParams.get("otp");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [decisions, setDecisions] = useState<Map<string, 'shortlist' | 'reject'>>(new Map());

  // Verify OTP with backend
  const verifyOtpWithBackend = async (otpValue: string, reviewerName?: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/swipe/session/${interviewId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otp: otpValue,
            reviewer_name: reviewerName
          }),
        }
      );

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  };

  // Fetch candidates from interview
  const fetchCandidates = async (page: number = 1) => {
    if (!interviewId) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/swipe/${interviewId}/candidates?page=${page}&limit=${pageSize}`
      );

      if (!response.ok) throw new Error("Failed to fetch candidates");

      const data = await response.json();

      if (page === 1) {
        setCandidates(data.candidates || []);
      } else {
        setCandidates(prev => [...prev, ...(data.candidates || [])]);
      }

      setHasMore(data.has_more || false);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
    }
  };

  // Verify OTP
  const handleOtpVerify = () => {
    if (!expectedOtp) {
      setOtpError("Access code not found in URL. Please scan the QR code or use the link from the desktop.");
      return;
    }
    if (otpInput === expectedOtp) {
      // Save reviewer name to localStorage
      if (reviewerName) {
        localStorage.setItem('swipe_reviewer_name', reviewerName);
      }
      setOtpVerified(true);
      setOtpError("");
      fetchCandidates(1);
    } else {
      setOtpError("Invalid access code. Please try again.");
    }
  };

  // Save swipe decision
  const saveDecision = async (candidateId: string, decision: 'shortlist' | 'reject') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/swipe/${interviewId}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            decision: decision,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save decision");

      const data = await response.json();

      // Update local state
      setDecisions(prev => new Map(prev).set(candidateId, decision));

      return data;
    } catch (error) {
      console.error("Error saving decision:", error);
      toast({
        title: "Error",
        description: "Failed to save decision",
        variant: "destructive",
      });
    }
  };

  // Handle swipe
  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentCandidate = candidates[currentIndex];
    if (!currentCandidate) return;

    const decision = direction === 'right' ? 'shortlist' : 'reject';

    setLoading(true);
    await saveDecision(
      currentCandidate.candidateId,
      decision
    );
    setLoading(false);

    // Move to next candidate
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Load more candidates if approaching end
    if (nextIndex >= candidates.length - 3 && hasMore && !fetchingMore) {
      setFetchingMore(true);
      await fetchCandidates(currentPage + 1);
      setFetchingMore(false);
    }
  };

  // Spring animation for card
  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
  }));

  // Drag gesture
  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      const trigger = vx > 0.2; // velocity threshold
      const dir = xDir < 0 ? -1 : 1;

      if (!active && trigger) {
        // Swiped
        handleSwipe(dir === 1 ? 'right' : 'left');
        api.start({ x: dir * 1000, rotate: dir * 45 });
        setTimeout(() => {
          api.start({ x: 0, rotate: 0, immediate: true });
        }, 300);
      } else {
        // Dragging or released without trigger
        api.start({
          x: active ? mx : 0,
          rotate: active ? mx / 20 : 0,
          immediate: (key) => active && key === "x",
        });
      }
    },
    { axis: "x" }
  );

  const currentCandidate = candidates[currentIndex];
  const progress = candidates.length > 0 ? ((currentIndex + 1) / candidates.length) * 100 : 0;
  const isComplete = currentIndex >= candidates.length && candidates.length > 0;

  // OTP Verification Screen
  if (!otpVerified) {
    return (
      <div className="min-h-dvh bg-paper-2 from-white via-slate-200 to-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Logo and Text - Top Left (matching Sidebar) */}
        <div className="absolute top-6 left-2 z-20">
          <div className="flex items-center justify-start">
            <img src="/logo.png" alt="FunnelHQ" className="w-14 h-9 object-cover" style={{ objectPosition: 'center' }} />
            <div className="-ml-1">
              <div className="font-semibold text-ink whitespace-nowrap text-lg">FunnelHQ</div>
              <div className="text-xs text-ink/70 font-medium -mt-1">Review Portal</div>
            </div>
          </div>
        </div>

        {/* Animated Grid Background with Fade */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: 'gridMove 20s linear infinite',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%)'
          }} />
        </div>
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(40px, 40px); }
          }
        `}</style>

        <Card className="w-full max-w-md shadow-3 rounded-sm border-none relative z-10 bg-paper/95 backdrop-blur-xs">
          <CardHeader className="px-8">
            <CardTitle className="text-2xl text-center text-ink">Enter Access Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Your Name *"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="text-center border-rule-strong rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                required
                autoFocus
              />
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpInput}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setOtpInput(newValue);
                  setOtpError("");

                  // Auto-verify when 6 digits are entered AND name is provided
                  if (newValue.length === 6) {
                    setTimeout(async () => {
                      // Check if name is provided
                      if (!reviewerName || reviewerName.trim() === '') {
                        setOtpError("Please enter your name first");
                        setOtpInput("");
                        return;
                      }

                      const isValid = await verifyOtpWithBackend(newValue, reviewerName);

                      if (isValid) {
                        setOtpVerified(true);
                        setOtpError("");
                        fetchCandidates(1);
                      } else {
                        setOtpError("Invalid access code. Please try again.");
                        setOtpInput("");
                      }
                    }, 300);
                  }
                }}
                className="text-center text-3xl font-mono tracking-widest border-rule-strong rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] py-6"
              />
              {otpError && (
                <p className="text-sm text-destructive text-center uppercase tracking-wide font-medium">{otpError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer - Fixed at bottom */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-paper text-xs z-20">
          <p className="text-paper/90">Swipe right to shortlist • Swipe left to reject</p>
          <p className="mt-1 text-paper/60">© 2025 FunnelHQ. All rights reserved.</p>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (isComplete) {
    const shortlistCount = Array.from(decisions.values()).filter(d => d === 'shortlist').length;
    const rejectCount = Array.from(decisions.values()).filter(d => d === 'reject').length;

    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-sm border border-rule-strong">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2 text-ink">
              <Check className="w-6 h-6 text-green-600" />
              Session Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6 uppercase text-xs tracking-wider">
                You've reviewed all {candidates.length} candidates
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-green-200">
                  <div className="text-3xl font-bold text-ink">{shortlistCount}</div>
                  <div className="text-sm text-green-600 uppercase tracking-wide">Shortlisted</div>
                </div>
                <div className="p-4 bg-red-50 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-red-200">
                  <div className="text-3xl font-bold text-ink">{rejectCount}</div>
                  <div className="text-sm text-red-600 uppercase tracking-wide">Rejected</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Thank you for your review!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You may now close this window.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Swipe Interface
  return (
    <div className="min-h-dvh bg-paper p-4 pb-safe">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOtpVerified(false);
              setOtpInput("");
              setCandidates([]);
              setCurrentIndex(0);
            }}
            className="border-rule-strong rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Exit
          </Button>
          <div className="text-sm font-bold uppercase tracking-wider text-ink">
            {currentIndex + 1} / {candidates.length}
            {hasMore && '+'}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card Stack */}
      <div className="max-w-md mx-auto relative min-h-[700px]">
        {currentCandidate ? (
          <animated.div
            {...bind()}
            style={{
              x,
              rotate,
              touchAction: "none",
              filter: x.to((val) => {
                const absVal = Math.abs(val);
                if (absVal < 50) return 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))';
                const intensity = Math.min((absVal - 50) / 150, 1);
                if (val > 0) {
                  // Swiping right - green shadow
                  return `drop-shadow(0 8px 24px rgba(34, 197, 94, ${intensity * 0.6}))`;
                } else {
                  // Swiping left - red shadow
                  return `drop-shadow(0 8px 24px rgba(239, 68, 68, ${intensity * 0.6}))`;
                }
              }),
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <CandidateCard
              candidate={currentCandidate}
              hideViewButton={true}
            />
            {/* Swipe Instructions */}
            <div className="text-center text-xs text-muted-foreground mt-4 uppercase tracking-wider">
              Swipe right to shortlist • Swipe left to reject
            </div>
          </animated.div>
        ) : (
          <div className="flex items-center justify-center min-h-[700px]">
            <Loader2 className="w-8 h-8 animate-spin text-ink" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto mt-8 flex items-center justify-center gap-8">
        <Button
          size="lg"
          variant="destructive"
          className="w-16 h-16 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          onClick={() => handleSwipe('left')}
          disabled={loading || !currentCandidate}
        >
          <X className="w-8 h-8" />
        </Button>
        <Button
          size="lg"
          variant="default"
          className="w-16 h-16 rounded-full shadow-2 bg-green-600 hover:bg-green-700"
          onClick={() => handleSwipe('right')}
          disabled={loading || !currentCandidate}
        >
          <Check className="w-8 h-8" />
        </Button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-paper" />
        </div>
      )}

      {/* Fetching more indicator */}
      {fetchingMore && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-ink/70 text-paper px-4 py-2 rounded-full text-sm">
          Loading more candidates...
        </div>
      )}
    </div>
  );
}
