import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Clock, User, FileVideo, AlertCircle, Bot, CheckCircle, TrendingDown, Lightbulb, MessageSquareQuote, Zap, ChevronLeft, Star, Save, X, Briefcase, MapPin, ThumbsDown, XCircle, FileText, Flag } from 'lucide-react';
import aiAvatar from '../assets/ai-avatar.png';
import cursingIcon from '../assets/cursing.png';
import { useToast } from '@/hooks/use-toast';
import { resultsApi } from '@/services/resultsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { VideoAnalyticsDrawer } from '@/components/video/VideoAnalyticsDrawer';
import { WalkingLoader } from '@/components/ui/WalkingLoader';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

// --- UTILITY FUNCTIONS ---
const formatDuration = (seconds: number | null) => {
  if (!seconds) return '-';
  const totalSeconds = Math.floor(seconds); // Round to whole seconds
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- DATA INTERFACES ---
interface Competency {
  pillar_name: string;
  pillar_score: number;
  overall_strength?: string;
  overall_weakness?: string;
  skills?: any[];
}

interface ResultsData {
  overall_summary?: string;
  hireability_recommendation?: string;
  suggested_next_steps?: string | string[];
  competencies?: Competency[];
}

// --- Radar Chart Component ---
const SkillsRadarChart = ({ competencies }: { competencies: Competency[] }) => {
  const size = 500;
  const center = size / 2;
  const radius = 130;

  const displayCompetencies = competencies.filter(c => c.pillar_name);
  const numSides = Math.max(displayCompetencies.length, 3);

  const getPointOnCircle = (index: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / numSides - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, angle };
  };

  const gridLevels = [20, 40, 60, 80, 100];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: numSides }, (_, i) => {
      const point = getPointOnCircle(i, (radius * level) / 100);
      return `${point.x},${point.y}`;
    });
    return `M${points.join('L')}Z`;
  });

  const axisLines = Array.from({ length: numSides }, (_, i) => {
    const outerPoint = getPointOnCircle(i, radius);
    return {
      x1: center,
      y1: center,
      x2: outerPoint.x,
      y2: outerPoint.y
    };
  });

  const dataPoints = displayCompetencies.map((comp, index) => {
    const score = comp.pillar_score;
    const dataRadius = (radius * Math.max(score, 1)) / 100;
    return getPointOnCircle(index, dataRadius);
  });

  const dataPath = dataPoints.length > 0
    ? `M${dataPoints.map(p => `${p.x},${p.y}`).join('L')}Z`
    : '';

  const labelPoints = displayCompetencies.map((comp, index) => {
    const point = getPointOnCircle(index, radius + 50);
    const name = comp.pillar_name || '';
    const score = comp.pillar_score;
    return { ...point, name, score };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ marginBottom: '16px' }}>
        <defs>
          <radialGradient id="skillsGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        {gridPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.3}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.4}
          />
        ))}

        {/* Score labels on axes */}
        {gridLevels.map((level) => (
          <text
            key={level}
            x={center}
            y={center - (radius * level) / 100 - 5}
            textAnchor="middle"
            fontSize="10"
            fill="rgb(100, 116, 139)"
          >
            {level}
          </text>
        ))}

        {/* Data area */}
        {dataPath && (
          <path
            d={dataPath}
            fill="url(#skillsGradient)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            fillOpacity="0.6"
          />
        )}

        {/* Data points */}
        {dataPoints.map((point, index) => {
          const comp = displayCompetencies[index];
          const score = comp.pillar_score;
          if (score === 0) return null;

          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="rgb(59, 130, 246)"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        {/* Skill labels with multi-line support */}
        {labelPoints.map((point, index) => {
          const comp = displayCompetencies[index];
          if (!comp.pillar_name) return null;

          const fullName = point.name || '';

          // Split long names into multiple lines
          const words = fullName.split(' ');
          let lines = [];

          if (words.length === 1) {
            if (fullName.length > 12) {
              const mid = Math.ceil(fullName.length / 2);
              lines = [fullName.slice(0, mid), fullName.slice(mid)];
            } else {
              lines = [fullName];
            }
          } else if (words.length === 2) {
            lines = words;
          } else {
            const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
            lines = [firstLine, secondLine];
          }

          const maxLineLength = Math.max(...lines.map(line => line.length));
          const charWidth = 7;
          const padding = 20;
          const rectWidth = Math.max(maxLineLength * charWidth + padding, 80);
          const lineHeight = 13;
          const rectHeight = lines.length * lineHeight + 12;

          const rectX = Math.max(10, Math.min(point.x - rectWidth / 2, size - rectWidth - 10));
          const rectY = Math.max(10, Math.min(point.y - rectHeight / 2 - 15, size - rectHeight - 30));

          return (
            <g key={index}>
              <rect
                x={rectX}
                y={rectY}
                width={rectWidth}
                height={rectHeight}
                fill="rgba(255, 255, 255, 0.95)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
                rx="8"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
              />

              {lines.map((line, lineIndex) => (
                <text
                  key={lineIndex}
                  x={rectX + rectWidth / 2}
                  y={rectY + 18 + (lineIndex * lineHeight)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="rgb(15, 23, 42)"
                  style={{ userSelect: 'none' }}
                >
                  {line}
                </text>
              ))}

              <g>
                <rect
                  x={rectX + rectWidth / 2 - 18}
                  y={rectY + rectHeight + 2}
                  width="36"
                  height="18"
                  fill="rgb(59, 130, 246)"
                  stroke="white"
                  strokeWidth="2"
                  rx="9"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />

                <text
                  x={rectX + rectWidth / 2}
                  y={rectY + rectHeight + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="white"
                  style={{ userSelect: 'none' }}
                >
                  {point.score.toFixed(1)}
                </text>
              </g>
            </g>
          );
        })}

        <circle
          cx={center}
          cy={center}
          r="3"
          fill="rgb(59, 130, 246)"
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Skills Assessment Overview</h3>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {displayCompetencies.length} competencies evaluated
        </p>
      </div>
    </div>
  );
};

// Full Video Player Interface - All-in-one component to avoid import issues
export default function VideoPlayerFullPage() {
  const { interviewId, fitmentInterviewId, candidateId, sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get duration from navigation state
  const passedDuration = location.state?.duration;

  // Determine the actual interview ID and type
  const actualInterviewId = fitmentInterviewId || interviewId;
  const interviewType = fitmentInterviewId ? 'fitment' : 'regular';

  // Use the session ID from URL params - no fallbacks to demo content
  const actualSessionId = sessionId;

  const [sessionData, setSessionData] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(false); // Separate state for video playback errors
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [noInterviewTaken, setNoInterviewTaken] = useState(false);

  // Video player state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef(null);

  // Results state
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Analytics drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate speaking duration percentages
  const calculateSpeakingPercentages = () => {
    if (!sessionData?.conversation || !sessionData.conversation.length) {
      console.log('[Speaking Duration] No conversation data available');
      return { aiPercentage: 0, userPercentage: 0 };
    }

    let aiTime = 0;
    let userTime = 0;

    console.log('[Speaking Duration] Conversation data:', sessionData.conversation);
    console.log('[Speaking Duration] First turn:', sessionData.conversation[0]);

    sessionData.conversation.forEach((turn, index) => {
      const duration = (turn.endTime || 0) - (turn.startTime || 0);
      console.log(`[Speaking Duration] Turn ${index}:`, {
        speaker: turn.speaker,
        startTime: turn.startTime,
        endTime: turn.endTime,
        duration
      });

      if (turn.speaker === 'AI') {
        aiTime += duration;
      } else {
        userTime += duration;
      }
    });

    const totalTime = aiTime + userTime;
    console.log('[Speaking Duration] Results:', { aiTime, userTime, totalTime });

    if (totalTime === 0) {
      return { aiPercentage: 0, userPercentage: 0 };
    }

    const percentages = {
      aiPercentage: Math.round((aiTime / totalTime) * 100),
      userPercentage: Math.round((userTime / totalTime) * 100)
    };

    console.log('[Speaking Duration] Percentages:', percentages);
    return percentages;
  };

  const { aiPercentage, userPercentage } = calculateSpeakingPercentages();

  // Candidate profile state
  const [candidateProfile, setCandidateProfile] = useState<any>(null);

  // Rating state
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [hasRatingChanges, setHasRatingChanges] = useState(false);
  const [loadedRating, setLoadedRating] = useState<number>(0);
  const [loadedNotes, setLoadedNotes] = useState<string>("");
  const { toast} = useToast();

  // Fetch candidate profile
  useEffect(() => {
    const fetchCandidateProfile = async () => {
      if (!candidateId) return;

      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${API_BASE_URL}/api/candidate-profiles/${candidateId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log('Candidate profile response:', data);

        if (response.ok && data.success) {
          setCandidateProfile(data.candidate);
        } else {
          console.error('Failed to fetch candidate profile:', data);
        }
      } catch (error) {
        console.error("Error fetching candidate profile:", error);
      }
    };

    fetchCandidateProfile();
  }, [candidateId]);

  // Fetch existing rating on mount
  useEffect(() => {
    const fetchRating = async () => {
      if (!actualSessionId) return;

      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${API_BASE_URL}/api/sessions/${actualSessionId}/rating`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.success && data.has_rating) {
          setLoadedRating(data.rating.rating);
          setRating(data.rating.rating);
          setLoadedNotes(data.rating.notes || "");
          setNotes(data.rating.notes || "");
        }
      } catch (error) {
        console.error("Error fetching rating:", error);
      }
    };

    fetchRating();
  }, [actualSessionId]);

  // Track rating and notes changes
  useEffect(() => {
    const ratingChanged = rating !== loadedRating;
    const notesChanged = notes !== loadedNotes;
    setHasRatingChanges(ratingChanged || notesChanged);
  }, [rating, loadedRating, notes, loadedNotes]);

  // Handle rating save
  const handleSaveRating = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSavingRating(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/api/sessions/${actualSessionId}/rating`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Rating Saved",
          description: "Your rating has been saved successfully",
        });
        setLoadedRating(rating);
        setLoadedNotes(notes);
        setHasRatingChanges(false);
      } else {
        throw new Error(data.error || "Failed to save rating");
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rating",
        variant: "destructive",
      });
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleClearRating = () => {
    setRating(loadedRating);
    setNotes(loadedNotes);
    setHasRatingChanges(false);
  };

  // Color helpers for rating
  const getRatingColor = (currentRating: number): string => {
    if (currentRating >= 9) return "text-blue-500";
    if (currentRating >= 7) return "text-green-500";
    if (currentRating >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const getRatingLabel = (currentRating: number): string => {
    if (currentRating >= 9) return "Excellent";
    if (currentRating >= 7) return "Good";
    if (currentRating >= 4) return "Average";
    return "Poor";
  };

  // Load all sessions for this candidate - will be populated after session data loads
  useEffect(() => {
    // Function to load real sessions from API for multiple attempts
    const loadRealSessions = async (realCandidateId) => {
      try {
        console.log(`[VideoPlayer] Loading real sessions for candidate: ${realCandidateId} (${interviewType})`);

        // Call the appropriate API endpoint based on interview type
        const apiEndpoint = interviewType === 'fitment'
          ? `${API_BASE_URL}/api/sessions/candidate/${realCandidateId}/fitment-interview/${actualInterviewId}`
          : `${API_BASE_URL}/api/sessions/candidate/${realCandidateId}/interview/${actualInterviewId}`;

        const response = await fetch(apiEndpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.log(`[VideoPlayer] No sessions found for candidate: ${response.status}`);
          return;
        }

        const data = await response.json();
        console.log(`[VideoPlayer] Real sessions API response:`, data);

        if (data.success && data.sessions && data.sessions.length > 0) {
          // Backend returns all sessions with videos for this candidate
          console.log(`[VideoPlayer] Sessions from API:`, data.sessions);

          setAllSessions(data.sessions);

          // Set current attempt based on which session matches the URL
          const matchingSession = data.sessions.find(s => s.session_id === actualSessionId);
          console.log(`[VideoPlayer] Matching session for ${actualSessionId}:`, matchingSession);
          if (matchingSession) {
            console.log(`[VideoPlayer] Setting current attempt to:`, matchingSession.attempt);
            setCurrentAttempt(matchingSession.attempt);
          } else {
            // If current session not found in multiple sessions, default to first attempt
            setCurrentAttempt(1);
          }
        }

      } catch (error) {
        console.error(`[VideoPlayer] Error loading real sessions:`, error);
        // No fallback - let the main video loading handle errors
      }
    };

    // This effect will be triggered by sessionData changes
    if (sessionData?.candidate?.id && actualSessionId) {
      console.log(`[VideoPlayer] Session data loaded, real candidate ID: ${sessionData.candidate.id}`);
      loadRealSessions(sessionData.candidate.id);
    }
  }, [sessionData, interviewId, actualSessionId]);

  useEffect(() => {
    const loadVideoData = async () => {
      setLoading(true);
      setError(null);

      // If no session ID provided, show "No interview found"
      if (!actualSessionId) {
        setNoInterviewTaken(true);
        setLoading(false);
        return;
      }

      try {
        console.log(`[VideoPlayer] Loading data for session: ${actualSessionId}, interview type: ${interviewType}`);

        let response;
        if (interviewType === 'fitment') {
          // For fitment interviews, use the fitment interview API
          response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${actualInterviewId}/candidates/${candidateId}/video/${actualSessionId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json'
            }
          });
        } else {
          // For regular interviews, use the regular video session API
          response = await fetch(`${API_BASE_URL}/api/videos/session/${actualSessionId}`);
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[VideoPlayer] API Response:', data);
        setSessionData(data);

        // Check if video has actual content and a playable URL
        if (data.video.duration === 0 || (!data.video.gcsPath && !data.video.signedUrl && !data.video.url)) {
          setVideoAvailable(false);
        }

      } catch (error) {
        console.error(`[VideoPlayer] Error loading video data:`, error);

        // Check if this is a "session not found" error, which means no interview was taken
        if (error instanceof Error && (
          error.message.includes('Session not found') ||
          error.message.includes('404') ||
          error.message.includes('API error: 404')
        )) {
          setNoInterviewTaken(true);
          setError(null);
        } else {
          setError(error instanceof Error ? error.message : 'Failed to load video data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
  }, [actualSessionId]);

  // Fetch results data
  useEffect(() => {
    const fetchResults = async () => {
      if (!actualSessionId) return;

      try {
        setResultsLoading(true);
        setResultsError(null);

        const results = await resultsApi.fetchSessionResults(actualSessionId);

        if (results) {
          // Extract blueprint data like before
          const blueprintData = results?.blueprint || results;
          setResultsData(blueprintData);
        }
      } catch (err: any) {
        console.error('Error fetching results:', err);
        setResultsError(err.message || 'Failed to fetch results');
      } finally {
        setResultsLoading(false);
      }
    };

    fetchResults();
  }, [actualSessionId]);

  const handleBackToInterview = () => {
    if (interviewType === 'fitment') {
      navigate(`/fitment-interviews/${actualInterviewId}`);
    } else {
      navigate(`/interviews/${actualInterviewId || 'X173i42BORJC0uyWQZhT'}`);
    }
  };

  const handleAttemptChange = (attemptNumber) => {
    // Find the session for the selected attempt
    const selectedSession = allSessions.find(session => session.attempt === attemptNumber);
    if (selectedSession) {
      // Navigate to the appropriate URL based on interview type
      if (interviewType === 'fitment') {
        navigate(`/fitment-interviews/${actualInterviewId}/candidate/${candidateId}/video/${selectedSession.session_id}`);
      } else {
        navigate(`/interview/${actualInterviewId}/candidate/${candidateId}/video/${selectedSession.session_id}`);
      }
    }
  };

  // Filter out system setup messages from conversation
  const filterSystemMessages = (conversation) => {
    const systemMessages = [
      'Setting up interview environment',
      'Initializing AI interviewer agent',
      'Processing candidate information',
      'Loading interview blueprint',
      'Preparing personalized questions'
    ];

    // Filter out system messages
    let filtered = conversation.filter((turn) =>
      !systemMessages.some(msg => turn.text.includes(msg))
    );

    // Remove initial "Hi" message before first AI message
    if (filtered.length > 0 && filtered[0].speaker !== 'AI' && filtered[0].text.trim().toLowerCase() === 'hi') {
      filtered = filtered.slice(1);
    }

    return filtered;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000); // Convert to milliseconds
    }
  };

  const seekToTime = (timeInMs) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeInMs / 1000; // Convert to seconds
      setCurrentTime(timeInMs);
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Helper functions for results display
  const getBadgeClass = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return "bg-red-100 text-red-800 border-red-300";
    if (lowerDecision.includes("reservations")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (lowerDecision.includes("recommend")) return "bg-green-100 text-green-800 border-green-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown style={{ width: '20px', height: '20px', color: '#dc2626' }} />;
    if (lowerDecision.includes("reservations")) return <Lightbulb style={{ width: '20px', height: '20px', color: '#ca8a04' }} />;
    if (lowerDecision.includes("recommend")) return <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a' }} />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <WalkingLoader />
          <p className="text-muted-foreground mt-6">Loading video session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Error Loading Video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} className="flex-1">
                Retry
              </Button>
              <Button variant="outline" onClick={handleBackToInterview} className="flex-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (noInterviewTaken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <FileVideo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No Interview Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              No interview recording was found for this session. The candidate may not have completed the interview yet.
            </p>
            <Button variant="outline" onClick={handleBackToInterview} className="mx-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <FileVideo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Video Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">The video session could not be loaded.</p>
            <Button variant="outline" onClick={handleBackToInterview} className="mx-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Logo */}
            <div className="relative flex items-center justify-start -ml-2">
              <img
                src="/logo.png"
                alt="FunnelHQ"
                className="w-14 h-9 rounded-full object-cover"
                style={{ objectPosition: 'center center' }}
              />
              <span className="absolute left-[2.8rem] top-1/2 -translate-y-1/2 font-semibold text-foreground whitespace-nowrap text-lg">
                FunnelHQ
              </span>
            </div>

            {/* Right - Duration and Analytics */}
            <div className="flex items-center gap-3">
              {(passedDuration || sessionData?.video?.duration) && (
                <>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDuration(passedDuration || sessionData.video.duration)}
                  </Badge>
                  {resultsData && resultsData.competencies && resultsData.competencies.length > 0 && (
                    <div className="w-px h-6 bg-border"></div>
                  )}
                </>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={() => setDrawerOpen(!drawerOpen)}
                disabled={!resultsData || !resultsData.competencies || resultsData.competencies.length === 0}
                className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="h-3.5 w-3.5" />
                Analytics
                <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", drawerOpen && "rotate-180")} />
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 pt-3 pb-6">
        {/* 2 Column Grid: Candidate | Video+Transcript+Bento */}
        <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left Column - Candidate Profile Card + Rating & Notes */}
          <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToInterview}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Manage Interview
          </Button>

          {/* Candidate Profile Card */}
          {sessionData && (
            <Card className="w-full bg-white p-2 rounded-lg shadow-md h-fit sticky top-20">
              {/* Card Image - Profile Picture */}
              <div
                className="w-full h-[130px] rounded-t-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden transition-transform hover:scale-[0.98] cursor-pointer"
              >
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={candidateProfile?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sessionData.candidate.name)}`}
                    alt={sessionData.candidate.name}
                  />
                  <AvatarFallback className="text-2xl font-semibold">
                    {sessionData.candidate.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Job Title - Blue Text */}
              <div className="px-2 pt-2.5 pb-0">
                <div className="text-base font-semibold text-blue-600 uppercase tracking-wide text-left">
                  {candidateProfile?.jobTitle || sessionData.candidate.role || 'Candidate'}
                </div>
              </div>

              {/* Heading - Candidate Name */}
              <div className="px-2 pt-1.5 pb-0.5">
                <div className="font-semibold text-gray-700 text-xs leading-tight hover:cursor-pointer">
                  {sessionData.candidate.name}
                </div>
              </div>

              {/* Location */}
              {candidateProfile?.location && (
                <div className="px-2 pb-1">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">
                      {(() => {
                        const parts = candidateProfile.location.split(',').map(p => p.trim());
                        const city = parts[0] || '';
                        const country = parts[parts.length - 1] || '';
                        return `${city}, ${country}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* ID */}
              {candidateProfile?.id && (
                <div className="px-2 pb-2 pt-2">
                  <div className="text-[10px] text-gray-400 font-mono">
                    #{candidateProfile.id}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Rating and Notes - Below Candidate Card */}
          {sessionData && actualSessionId && (
            <div className="space-y-6">
              {/* Rating Section */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-gray-800" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
                  Please Rate Me accordingly!
                </h4>

                {/* Stars Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 10 }, (_, index) => {
                      const starNumber = index + 1;
                      const isFilled = starNumber <= rating;

                      return (
                        <button
                          key={starNumber}
                          type="button"
                          onClick={() => setRating(starNumber)}
                          className="transition-all duration-200 hover:scale-110 cursor-pointer"
                          aria-label={`Rate ${starNumber} out of 10`}
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              isFilled ? getRatingColor(rating) : "text-gray-300",
                              isFilled && "fill-current"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {rating > 0 && (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={cn("font-bold text-sm", getRatingColor(rating))}>
                        {rating}/10
                      </span>
                      <Badge className={cn(
                        "text-xs",
                        rating >= 9 && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                        rating >= 7 && rating < 9 && "bg-green-100 text-green-700 hover:bg-green-100",
                        rating >= 4 && rating < 7 && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                        rating < 4 && "bg-red-100 text-red-700 hover:bg-red-100"
                      )}>
                        {getRatingLabel(rating)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Rating Display and Actions */}
                {rating > 0 && (
                  <div className="space-y-2">
                    <div className="hidden">
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSaveRating}
                        disabled={isSavingRating || !hasRatingChanges}
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {isSavingRating ? "Saving..." : "Save Rating & Notes"}
                      </Button>
                      {hasRatingChanges && (
                        <Button
                          onClick={handleClearRating}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={isSavingRating}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Note - Notes Section */}
              <div className="relative">
                <div className="bg-yellow-100 rounded-sm shadow-lg p-4 transform rotate-1 hover:rotate-0 transition-transform duration-200">
                  {/* Sticky note top tape effect - positioned at top right */}
                  <div className="absolute -top-2 right-8 w-16 h-4 bg-yellow-200/60 rounded-sm"></div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down your thoughts..."
                    className="w-full min-h-[160px] bg-transparent text-sm text-gray-700 placeholder:text-gray-500/70 focus:outline-none resize-none font-handwriting"
                    style={{
                      fontFamily: "'Caveat', 'Comic Sans MS', cursive",
                      lineHeight: '1.8'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Right Column - Video Player + (Transcript + Bento Grid) */}
          <div className="space-y-6">
            {/* Video Player */}
            <Card className="border-2 shadow-lg overflow-hidden h-[500px]">
              <CardContent className="p-0 h-full">
                {videoAvailable ? (
                  <div className="relative bg-black overflow-hidden h-full">
                    <video
                      ref={videoRef}
                      src={(() => {
                        const videoUrl = sessionData?.video?.signedUrl || sessionData?.video?.url;
                        // If URL is relative, prepend API_BASE_URL
                        if (videoUrl && videoUrl.startsWith('/')) {
                          return `${API_BASE_URL}${videoUrl}`;
                        }
                        return videoUrl;
                      })()}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleTimeUpdate}
                      onError={(e) => {
                        console.error('[VideoPlayer] Video error:', e);
                        console.error('[VideoPlayer] Video error details:', e.target.error);
                        console.error('[VideoPlayer] Video src:', e.target.src);
                        console.error('[VideoPlayer] Video currentSrc:', e.target.currentSrc);
                        console.error('[VideoPlayer] Video readyState:', e.target.readyState);
                        console.error('[VideoPlayer] Video networkState:', e.target.networkState);
                        console.error('[VideoPlayer] Video CORS error code:', e.target.error?.code);
                        console.error('[VideoPlayer] Video CORS error message:', e.target.error?.message);

                        // Show video fallback UI without breaking entire page
                        setVideoAvailable(false);
                        setVideoError(true);
                        // Don't call setError() - that breaks the entire page
                      }}
                      onLoadStart={() => console.log('[VideoPlayer] Video load started')}
                      onCanPlay={() => console.log('[VideoPlayer] Video can play')}
                      onLoadedData={() => console.log('[VideoPlayer] Video data loaded')}
                      onProgress={() => console.log('[VideoPlayer] Video progress')}
                      onSuspend={() => console.log('[VideoPlayer] Video suspend')}
                      onStalled={() => console.log('[VideoPlayer] Video stalled')}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <div className="bg-black p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                      <FileVideo className="h-10 w-10 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Video Not Available</h3>
                    <p className="text-sm text-slate-400 max-w-sm">
                      The video recording for this session is currently unavailable.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Section: Transcript + Bento Grid (2 columns) */}
            <div className="grid grid-cols-[1fr_1.5fr] gap-6">
              {/* Conversation Transcript */}
              <Card className="border shadow-sm h-[300px] flex flex-col overflow-hidden bg-white">
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Transcript</h3>

                    {/* Speaking Duration Meter */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-purple-600">AI</span>
                        <span className="text-sm font-semibold text-purple-700">{aiPercentage}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-blue-600">USER</span>
                        <span className="text-sm font-semibold text-blue-700">{userPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {filterSystemMessages(sessionData.conversation).length > 0 ? (
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                      {filterSystemMessages(sessionData.conversation).map((turn, index) => {
                        const isCurrentTurn = currentTime >= turn.startTime && currentTime <= turn.endTime;
                        const isAI = turn.speaker === 'AI';

                        return (
                          <div
                            key={index}
                            onClick={() => !isAI ? seekToTime(turn.startTime) : null}
                            className={cn(
                              "p-2.5 rounded-lg border transition-all",
                              isCurrentTurn
                                ? "bg-blue-50 border-blue-200"
                                : isAI
                                  ? "bg-gray-100 border-gray-200 hover:border-gray-300"
                                  : "bg-white border-gray-100 hover:border-gray-200",
                              !isAI && "cursor-pointer"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Avatar */}
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                {isAI ? (
                                  <AvatarImage
                                    src={aiAvatar}
                                    alt="Smriti"
                                  />
                                ) : (
                                  <>
                                    <AvatarImage
                                      src={candidateProfile?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sessionData.candidate.name)}`}
                                      alt={sessionData.candidate.name}
                                    />
                                    <AvatarFallback className="text-[10px] font-medium bg-gray-200">
                                      {sessionData.candidate.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </>
                                )}
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isAI ? "text-blue-600" : "text-gray-900"
                                  )}>
                                    {isAI ? 'Smriti' : sessionData.candidate.name.split(' ')[0]}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {formatTime(turn.startTime)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                  {turn.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* End of Transcript Marker */}
                      <div className="flex items-center justify-center py-4">
                        <div className="flex items-center gap-3 text-gray-400">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-xs font-medium">End of Transcript</span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <p className="text-xs">No transcript available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bento Grid with Coming Soon Overlay */}
              <div className="relative">
                {/* Bento Grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {/* Row 0: Orange Grid - spans 2 columns */}
                  <div className="col-span-2 h-[80px] bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-md relative overflow-hidden">
                    {/* Geeky terminal-style overlay */}
                    <div className="absolute inset-0 bg-black/10"></div>

                    {/* Terminal text */}
                    <div className="relative z-10 h-full flex items-center px-4">
                      <div className="font-mono text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-green-300 text-lg">$</span>
                          <span className="text-base font-semibold tracking-wider">Interview Playback Context</span>
                        </div>
                      </div>
                    </div>

                    {/* Scanline effect */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.1) 3px)'
                    }}></div>
                  </div>

                  {/* Row 1: Hireability Recommendation - Ticket Style */}
                  <div className="relative h-[50px] overflow-visible group">
                    {/* SVG Container for ticket shape */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="100%" stopColor="#f3f4f6" />
                        </linearGradient>
                      </defs>

                      {/* Main ticket body with serrated edges */}
                      <path
                        d="M 0,2 L 3,0 L 6,2 L 9,0 L 12,2 L 15,0 L 18,2 L 21,0 L 24,2 L 27,0 L 30,2 L 33,0 L 36,2 L 39,0 L 42,2 L 45,0 L 48,2 L 51,0 L 54,2 L 57,0 L 60,2 L 63,0 L 66,2 L 69,0 L 72,2 L 75,0 L 78,2 L 81,0 L 84,2 L 87,0 L 90,2 L 93,0 L 96,2 L 99,0 L 102,2 L 105,0 L 108,2 L 111,0 L 114,2 L 117,0 L 120,2 L 123,0 L 126,2 L 129,0 L 132,2 L 135,0 L 138,2 L 141,0 L 144,2 L 147,0 L 150,2 L 153,0 L 156,2 L 159,0 L 162,2 L 165,0 L 168,2 L 171,0 L 174,2 L 177,0 L 180,2 L 183,0 L 186,2 L 189,0 L 192,2 L 195,0 L 198,2 L 201,0 L 204,2 L 207,0 L 210,2 L 213,0 L 216,2 L 219,0 L 222,2 L 225,0 L 228,2 L 231,0 L 234,2 L 237,0 L 240,2 L 243,0 L 246,2 L 249,0 L 252,2 L 255,0 L 258,2 L 261,0 L 264,2 L 267,0 L 270,2 L 273,0 L 276,2 L 279,0 L 282,2 L 285,0 L 288,2 L 291,0 L 294,2 L 297,0 L 300,2 L 300,48 L 297,50 L 294,48 L 291,50 L 288,48 L 285,50 L 282,48 L 279,50 L 276,48 L 273,50 L 270,48 L 267,50 L 264,48 L 261,50 L 258,48 L 255,50 L 252,48 L 249,50 L 246,48 L 243,50 L 240,48 L 237,50 L 234,48 L 231,50 L 228,48 L 225,50 L 222,48 L 219,50 L 216,48 L 213,50 L 210,48 L 207,50 L 204,48 L 201,50 L 198,48 L 195,50 L 192,48 L 189,50 L 186,48 L 183,50 L 180,48 L 177,50 L 174,48 L 171,50 L 168,48 L 165,50 L 162,48 L 159,50 L 156,48 L 153,50 L 150,48 L 147,50 L 144,48 L 141,50 L 138,48 L 135,50 L 132,48 L 129,50 L 126,48 L 123,50 L 120,48 L 117,50 L 114,48 L 111,50 L 108,48 L 105,50 L 102,48 L 99,50 L 96,48 L 93,50 L 90,48 L 87,50 L 84,48 L 81,50 L 78,48 L 75,50 L 72,48 L 69,50 L 66,48 L 63,50 L 60,48 L 57,50 L 54,48 L 51,50 L 48,48 L 45,50 L 42,48 L 39,50 L 36,48 L 33,50 L 30,48 L 27,50 L 24,48 L 21,50 L 18,48 L 15,50 L 12,48 L 9,50 L 6,48 L 3,50 L 0,48 Z"
                        fill="url(#ticketGradient)"
                        stroke="#9ca3af"
                        strokeWidth="0.5"
                      />

                      {/* Left semi-circle notch */}
                      <circle cx="0" cy="25" r="5" fill="#f9fafb" stroke="#9ca3af" strokeWidth="0.5" />

                      {/* Right semi-circle notch */}
                      <circle cx="300" cy="25" r="5" fill="#f9fafb" stroke="#9ca3af" strokeWidth="0.5" />

                      {/* Dashed perforation line (middle horizontal) */}
                      <line x1="10" y1="25" x2="290" y2="25" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3,3" />
                    </svg>

                    {/* Content overlay */}
                    <div className="relative z-10 h-full flex items-center justify-between gap-3 px-4">
                      {/* Gray accent bar on left */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-gray-400 via-gray-500 to-gray-600 rounded-l"></div>

                      {/* Left side - Recommendation Text */}
                      <div className="flex-1 ml-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                          {resultsData?.hireability_recommendation || 'AWAITING ANALYSIS...'}
                        </p>
                      </div>

                      {/* Right side - Document Icon */}
                      <div className="relative flex-shrink-0">
                        <div className="relative w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-300 shadow-sm">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert/Warning indicators with counts */}
                  <div className="flex items-center justify-center gap-2 h-[40px]">
                    {/* Yellow Alert (!) */}
                    <div className="relative cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 shadow flex items-center justify-center">
                        <div className="text-base font-bold text-yellow-600">!</div>
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-gray-700">0</span>
                    </div>

                    {/* Red Critical (!!) */}
                    <div className="relative cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow flex items-center justify-center">
                        <div className="text-sm font-bold text-red-600">!!</div>
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-gray-700">0</span>
                    </div>

                    {/* Blue Question (?) */}
                    <div className="relative cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow flex items-center justify-center">
                        <div className="text-base font-bold text-blue-600">?</div>
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-gray-700">0</span>
                    </div>

                    {/* Cursing - Profanity */}
                    <div className="relative cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow flex items-center justify-center p-1">
                        <img src={cursingIcon} alt="Cursing" className="w-full h-full object-contain" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-gray-700">0</span>
                    </div>
                  </div>

                  {/* Row 2: Timeline of Events - spans 2 columns */}
                  <div className="col-span-2 h-[160px] bg-white border border-gray-200 rounded-lg shadow-md p-3 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {/* Yellow Alert (!) - Warning */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm">
                        <div className="text-xs font-bold text-yellow-600">!</div>
                        <span className="flex-1 text-[10px] text-gray-700">Hesitation when asked about previous project experience</span>
                        <span className="text-[8px] font-medium text-gray-500 bg-white px-1 py-0.5 rounded">02:34</span>
                      </div>

                      {/* Red Alert (!!) - Double Warning */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow-sm">
                        <div className="text-xs font-bold text-red-600">!!</div>
                        <span className="flex-1 text-[10px] text-gray-700">Contradicted earlier statement about team size</span>
                        <span className="text-[8px] font-medium text-gray-500 bg-white px-1 py-0.5 rounded">05:12</span>
                      </div>

                      {/* Blue Question (?) - Suspicious Activity */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm">
                        <div className="text-xs font-bold text-blue-600">?</div>
                        <span className="flex-1 text-[10px] text-gray-700">Vague response about technical implementation details</span>
                        <span className="text-[8px] font-medium text-gray-500 bg-white px-1 py-0.5 rounded">08:45</span>
                      </div>

                      {/* Cursing - Profanity */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow-sm">
                        <img src={cursingIcon} alt="Cursing" className="w-3 h-3 object-contain" />
                        <span className="flex-1 text-[10px] text-gray-700">Used profanity during the interview</span>
                        <span className="text-[8px] font-medium text-gray-500 bg-white px-1 py-0.5 rounded">12:30</span>
                      </div>

                      {/* Yellow Alert (!) - Warning */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm">
                        <div className="text-xs font-bold text-yellow-600">!</div>
                        <span className="flex-1 text-[10px] text-gray-700">Unable to explain key concept mentioned in resume</span>
                        <span className="text-[8px] font-medium text-gray-500 bg-white px-1 py-0.5 rounded">18:05</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-20">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white tracking-wide">In Development</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Drawer */}
      <VideoAnalyticsDrawer
        resultsData={resultsData}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        candidateName={sessionData.candidate.name}
        SkillsRadarChart={SkillsRadarChart}
      />
    </div>
  );
}
