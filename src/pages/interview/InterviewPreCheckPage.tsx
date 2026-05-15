import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { InterviewPreCheck } from "@/components/interview/InterviewPreCheck";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

export default function InterviewPreCheckPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [preCreatedSessionId, setPreCreatedSessionId] = useState<string | null>(null);
  // 503 from /candidate-sessions/start = blueprint or candidate not loadable.
  // Show a retry screen instead of pushing the candidate into a half-prepared
  // interview where the agent would improvise an apology.
  const [contextNotReady, setContextNotReady] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Get data from navigation state (passed from CandidatePortal)
  const stateData = location.state as {
    candidateToken?: string;
    candidateData?: {
      id: string;
      name: string;
      email: string;
      resumes?: Array<{
        id: string;
        filename: string;
        gcsPath: string;
        uploadedAt: string;
        isActive: boolean;
      }>;
    };
    interviewData?: {
      id: string;
      title: string;
      description: string;
      duration: number;
      type: string;
    };
  } | null;

  useEffect(() => {
    if (!stateData?.candidateToken || !stateData?.candidateData?.id) {
      const fallbackToken = sessionStorage.getItem('candidateToken');
      if (fallbackToken) {
        navigate(`/candidate-portal/${fallbackToken}`, { replace: true });
      } else {
        navigate('/candidate/login', { replace: true });
      }
    }
  }, [stateData, navigate]);

  const [localCandidateData, setLocalCandidateData] = useState(stateData?.candidateData || {
    id: "",
    name: "",
    email: ""
  });

  const handleStartInterview = async () => {
    setIsStarting(true);
    setContextNotReady(null);
    try {
      const candidate = localCandidateData;
      const interview = stateData?.interviewData || interviewData;
      const activeSession = stateData?.activeSession;

      const sessionId = activeSession?.session_id || preCreatedSessionId || `interview_${interview.id}_candidate_${candidate.id}_${Date.now()}`;
      console.log(`🚀 Starting interview with session: ${sessionId}`,
        activeSession?.session_id ? '(resuming)' : preCreatedSessionId ? '(pre-created)' : '(new)');

      const sessionResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/candidate-sessions/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_token: stateData?.candidateToken,
            session_id: sessionId,
            interview_id: interview.id,
            candidate_id: candidate.id,
            candidate_data: { id: candidate.id, name: candidate.name, email: candidate.email },
            interview_config: {
              title: interview.title,
              description: interview.description,
              duration: interview.duration,
              type: interview.type,
            },
          }),
        },
      );

      if (sessionResponse.status === 503) {
        // Honest blocking: blueprint/candidate not loadable yet. Show retry
        // screen instead of starting a junk interview.
        const body = await sessionResponse.json().catch(() => ({}));
        setContextNotReady(body?.detail || 'Interview context not ready. Please try again in a moment.');
        return;
      }

      if (!sessionResponse.ok) {
        throw new Error('Failed to create interview session');
      }

      const sessionData = await sessionResponse.json();
      const finalSessionId = sessionData.session_id || sessionId;

      navigate(`/interview/${interviewId}/session`, {
        state: {
          sessionId: finalSessionId,
          candidateToken: stateData?.candidateToken,
          candidateData: candidate,
          interviewData: interview,
          isResumed: sessionData.is_resumed || false,
          conversationHistory: sessionData.conversation_history || [],
          previousActiveDuration: sessionData.active_duration || 0,
        },
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
      setContextNotReady('Something went wrong starting your interview. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const handleResumesUpdate = (resumes: any[]) => {
    setLocalCandidateData(prev => ({
      ...prev,
      resumes
    }));
  };

  // Use data from navigation state or fallback to mock data
  const interviewData = stateData?.interviewData || {
    id: interviewId || "",
    title: "AI Accounting Interview",
    description: "A comprehensive AI-powered interview to assess your accounting knowledge and skills.",
    duration: 30,
    type: "ai_interview"
  };

  // Removed: Pre-create agent session moved to resume selection
  // The /prepare API should only run AFTER a resume is selected, not on page load

  if (contextNotReady) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gold-soft flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-gold-ink" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink">Hold on — almost ready</h1>
            <p className="text-sm text-muted">{contextNotReady}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleCancel} disabled={isStarting}>
              Back
            </Button>
            <Button onClick={handleStartInterview} disabled={isStarting} variant="gold">
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Trying again...
                </>
              ) : (
                'Try again'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InterviewPreCheck
      interviewData={interviewData}
      candidateData={localCandidateData}
      onStartInterview={handleStartInterview}
      onCancel={handleCancel}
      preCreatedSessionId={preCreatedSessionId}
      candidateToken={stateData?.candidateToken}
      onSessionCreated={(sessionId) => setPreCreatedSessionId(sessionId)}
      onResumesUpdate={handleResumesUpdate}
    />
  );
}