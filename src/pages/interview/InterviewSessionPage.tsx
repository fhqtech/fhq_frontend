import { useParams, useNavigate, useLocation } from "react-router-dom";
import { InterviewSession } from "@/components/interview/InterviewSession";

export default function InterviewSessionPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const stateData = location.state as {
    sessionId?: string;
    candidateToken?: string;
    candidateData?: {
      id: string;
      name: string;
      email: string;
    };
    interviewData?: {
      id: string;
      title: string;
      description: string;
      duration: number;
      type: string;
    };
  } | null;

  const handleInterviewComplete = (sessionData: any) => {
    console.log("Interview completed:", sessionData);
    navigate(`/interview/${interviewId}/complete`, { 
      state: { 
        candidateToken: stateData?.candidateToken, // Pass token through
        sessionData,
        candidateData: stateData?.candidateData || candidateData,
        interviewData: stateData?.interviewData || interviewConfig
      } 
    });
  };

  const handleInterviewError = (error: Error) => {
    console.error("Interview error:", error);
    navigate(-1);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this interview? Your progress will be lost.")) {
      navigate(-1);
    }
  };

  // Use data from navigation state or fallback to mock data
  const interviewConfig = stateData?.interviewData || {
    title: "AI Accounting Interview",
    description: "A comprehensive AI-powered interview to assess your accounting knowledge and skills.",
    duration: 30,
    type: "ai_interview"
  };

  const candidateData = stateData?.candidateData || {
    id: "candidate-123",
    name: "Candidate Name",
    email: "candidate@example.com"
  };

  // Generate unique session ID using interview ID and candidate ID (fallback)
  const generateSessionId = (interviewId: string, candidateId: string) => {
    const timestamp = Date.now();
    return `interview_${interviewId}_candidate_${candidateId}_${timestamp}`;
  };

  // Use session ID from navigation state (created in pre-check) or generate fallback
  const sessionId = stateData?.sessionId || generateSessionId(
    interviewId || "unknown",
    candidateData.id
  );

  console.log("🎯 Session ID:", sessionId);

  const mockApiEndpoints = {
    llmBackendUrl: import.meta.env.VITE_LLM_BACKEND_URL || `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interview-prelims-agent`,
    websocketUrl: import.meta.env.VITE_STT_WEBSOCKET_URL || "ws://localhost:8082/ws"
  };

  // Debug: Log the environment variables and endpoints
  console.log("🔧 Environment Variables:", {
    VITE_LLM_BACKEND_URL: import.meta.env.VITE_LLM_BACKEND_URL,
    VITE_STT_WEBSOCKET_URL: import.meta.env.VITE_STT_WEBSOCKET_URL
  });
  console.log("🔗 API Endpoints:", mockApiEndpoints);

  return (
    <InterviewSession
      interviewId={interviewId || ""}
      sessionId={sessionId} // Use deterministic session ID based on interview + candidate
      candidateData={candidateData}
      interviewConfig={interviewConfig}
      candidateToken={stateData?.candidateToken}
      apiEndpoints={mockApiEndpoints}
      isResumed={stateData?.isResumed}
      conversationHistory={stateData?.conversationHistory}
      previousActiveDuration={stateData?.previousActiveDuration || 0}
      onInterviewComplete={handleInterviewComplete}
      onInterviewError={handleInterviewError}
      onCancel={handleCancel}
    />
  );
}