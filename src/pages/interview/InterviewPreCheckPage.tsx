import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { InterviewPreCheck } from "@/components/interview/InterviewPreCheck";

export default function InterviewPreCheckPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [preCreatedSessionId, setPreCreatedSessionId] = useState<string | null>(null);

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

  // Local state for candidate data to allow updates
  const [localCandidateData, setLocalCandidateData] = useState(stateData?.candidateData || {
    id: "candidate-123",
    name: "Candidate Name",
    email: "candidate@example.com"
  });

  const handleStartInterview = async () => {
    try {
      const candidate = localCandidateData;
      const interview = stateData?.interviewData || interviewData;
      const activeSession = stateData?.activeSession;

      // Priority: 1) Active session ID, 2) Pre-created session ID, 3) Generate new one
      const sessionId = activeSession?.session_id || preCreatedSessionId || `interview_${interview.id}_candidate_${candidate.id}_${Date.now()}`;
      console.log(`🚀 Starting interview with session: ${sessionId}`,
        activeSession?.session_id ? '(resuming)' : preCreatedSessionId ? '(pre-created)' : '(new)');

      // Create interview session (using candidate endpoint)
      const sessionResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/candidate-sessions/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            candidate_token: stateData?.candidateToken,
            session_id: sessionId,
            interview_id: interview.id,
            candidate_id: candidate.id,
            candidate_data: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email
            },
            interview_config: {
              title: interview.title,
              description: interview.description,
              duration: interview.duration,
              type: interview.type
            }
          })
        }
      );

      if (!sessionResponse.ok) {
        throw new Error('Failed to create interview session');
      }

      const sessionData = await sessionResponse.json();
      // sessionId is already declared above, use the one from response or our pre-created one
      const finalSessionId = sessionData.session_id || sessionId;

      // Pass sessionId and data to the session page
      navigate(`/interview/${interviewId}/session`, {
        state: {
          sessionId: finalSessionId,
          candidateToken: stateData?.candidateToken,
          candidateData: candidate,
          interviewData: interview,
          isResumed: sessionData.is_resumed || false,
          conversationHistory: sessionData.conversation_history || [],
          previousActiveDuration: sessionData.active_duration || 0  // Cumulative active time from previous sessions
        }
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
      // Fallback to navigating without session (for backward compatibility)
      navigate(`/interview/${interviewId}/session`, {
        state: {
          candidateToken: stateData?.candidateToken,
          candidateData: localCandidateData,
          interviewData: stateData?.interviewData || interviewData
        }
      });
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