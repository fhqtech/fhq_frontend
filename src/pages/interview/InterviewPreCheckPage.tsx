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
  // 403 credits_required = recruiter's workspace didn't pay for this seat.
  // Non-retryable from the candidate's side; show a blocking message.
  const [interviewBlocked, setInterviewBlocked] = useState<string | null>(null);
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

      // P7: candidate session JWT — required by the gated /candidate-sessions/start.
      const candidateJwt = localStorage.getItem('candidate_auth_token');
      const sessionHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (candidateJwt) sessionHeaders['Authorization'] = `Bearer ${candidateJwt}`;
      const sessionResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/candidate-sessions/start`,
        {
          method: 'POST',
          headers: sessionHeaders,
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

      if (sessionResponse.status === 403) {
        // Recruiter workspace lacks credits for this seat. Non-retryable
        // from candidate side — they need to reach the recruiter.
        const body = await sessionResponse.json().catch(() => ({}));
        const detail = body?.detail;
        if (detail && typeof detail === 'object' && detail.error === 'credits_required') {
          setInterviewBlocked(
            detail.message ||
              'This interview is not active. Please contact the recruiter.'
          );
          return;
        }
      }

      if (!sessionResponse.ok) {
        throw new Error('Failed to create interview session');
      }

      const sessionData = await sessionResponse.json();
      const finalSessionId = sessionData.session_id || sessionId;

      // H3 (2026-05-24): fire prepare-greeting in the background so the
      // gateway has the personalised opener cached by WS-open. Covers
      // BOTH paths (fresh resume select AND session resume) because we
      // run it here at start-interview time, not buried inside the
      // resume-selection callPrepareAPI. Best-effort: H1 means the
      // gateway will inline-generate if the cache is still empty.
      // 8s timeout matches the typical prelims latency.
      try {
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 8_000);
        (() => {
          // P7: include candidate session JWT.
          const candidateJwt = localStorage.getItem('candidate_auth_token');
          const greetingHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (candidateJwt)
            greetingHeaders['Authorization'] = `Bearer ${candidateJwt}`;
          return fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/agent-sessions/prepare-greeting`,
            {
              method: 'POST',
              headers: greetingHeaders,
              body: JSON.stringify({
                candidate_token: stateData?.candidateToken,
                session_id: finalSessionId,
                interview_id: interview.id,
                candidate_id: candidate.id,
              }),
              signal: abort.signal,
            },
          );
        })()
          .then((resp) => {
            clearTimeout(timer);
            if (!resp.ok) {
              console.warn('[precheck] prepare-greeting non-ok:', resp.status);
            }
          })
          .catch(() => {
            clearTimeout(timer);
            /* best-effort, gateway has its own inline fallback */
          });
      } catch {
        /* noop */
      }

      // v2 is the only engine. C2 (2026-05-24) removed the v1 page +
      // the ?engine=v1 escape hatch and the VITE_INTERVIEW_ENGINE
      // fallback. Always route to /session-v2.
      navigate(`/interview/${interviewId}/session-v2`, {
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

  if (interviewBlocked) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gold-soft flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-gold-ink" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink">Interview not active</h1>
            <p className="text-sm text-muted">{interviewBlocked}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleCancel}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

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