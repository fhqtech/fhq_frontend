import { useParams, useNavigate, useLocation } from "react-router-dom";
import { InterviewThankYou } from "@/components/interview/InterviewThankYou";

export default function InterviewThankYouPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get all data from navigation state (passed from InterviewSessionV2Page or end-early flow).
  const stateData = location.state as {
    candidateToken?: string;
    sessionData?: {
      sessionId: string;
      duration: number;
      completedAt: string;
      candidateName?: string;
      candidateEmail?: string;
      conversationHistory?: any[];
    };
    candidateData?: {
      id: string;
      name: string;
      email: string;
    };
    interviewData?: {
      id?: string;
      title: string;
      description?: string;
      duration: number;
      type: string;
    };
  } | null;

  const handleReturnToPortal = () => {
    // Get the candidate token from location state or sessionStorage
    const candidateToken = stateData?.candidateToken || stateData?.sessionData?.candidateToken;

    if (candidateToken) {
      // Navigate back to the candidate portal with their token
      navigate(`/candidate-portal/${candidateToken}`);
    } else {
      // Fallback: try to extract token from sessionStorage or go to root
      const storedToken = sessionStorage.getItem('candidateToken');
      if (storedToken) {
        navigate(`/candidate-portal/${storedToken}`);
      } else {
        console.warn("No candidate token found, redirecting to root");
        navigate("/");
      }
    }
  };

  // Use real data from navigation state with sensible fallbacks
  const sessionDataForDisplay = {
    sessionId: stateData?.sessionData?.sessionId || `${interviewId || "unknown"}_${Date.now()}`,
    duration: stateData?.sessionData?.duration || 0,
    completedAt: stateData?.sessionData?.completedAt || new Date().toISOString()
  };

  // Candidate data - prefer sessionData names, fallback to candidateData
  const candidateDataForDisplay = {
    name: stateData?.sessionData?.candidateName || stateData?.candidateData?.name || "Candidate",
    email: stateData?.sessionData?.candidateEmail || stateData?.candidateData?.email || ""
  };

  // Interview data from navigation state
  const interviewDataForDisplay = {
    title: stateData?.interviewData?.title || "Interview",
    type: stateData?.interviewData?.type || "ai_interview",
    interviewId: interviewId || stateData?.interviewData?.id || ""
  };

  return (
    <InterviewThankYou
      sessionData={sessionDataForDisplay}
      candidateData={candidateDataForDisplay}
      interviewData={interviewDataForDisplay}
      onReturnToPortal={handleReturnToPortal}
    />
  );
}