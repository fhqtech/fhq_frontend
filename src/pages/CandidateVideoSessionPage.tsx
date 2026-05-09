import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, User, FileVideo, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoPlayerSection } from '@/components/video/VideoPlayerSection';
import { ConversationSection } from '@/components/video/ConversationSection';
import { AnnotationsPanel } from '@/components/video/AnnotationsPanel';
import { VideoTimeline } from '@/components/video/VideoTimeline';
import { MOCK_VIDEO_SESSION, VideoSessionData, formatTime, formatFileSize } from '@/data/mockVideoData';
import { videoSessionService } from '@/services/videoSessionService';
import { useVideoSync } from '@/hooks/useVideoSync';

export default function CandidateVideoSessionPage() {
  const { interviewId, candidateId, sessionId } = useParams();
  const navigate = useNavigate();

  const [videoData, setVideoData] = useState<VideoSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoAvailable, setVideoAvailable] = useState<boolean>(true);

  // Video synchronization hook
  const {
    currentTime,
    isPlaying,
    playbackSpeed,
    volume,
    handleTimeUpdate,
    handlePlayPause,
    handleSpeedChange,
    handleVolumeChange,
    seekToTime
  } = useVideoSync();

  useEffect(() => {
    const loadVideoData = async () => {
      if (!sessionId || !interviewId) {
        setError('Missing session or interview ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`[VideoSessionPage] Loading data for session: ${sessionId}`);

        // For hardcoded session, use API. For others, fallback to mock data
        if (sessionId === 'X173i42BORJC0uyWQZhT_e1c0e04e-c8fd-4d84-92ac-06a286a35525_1758900621558') {
          // Fetch real data from backend
          const sessionData = await videoSessionService.fetchSessionData(sessionId);

          // Check video availability
          const videoCheck = await videoSessionService.checkVideoAvailability(interviewId, sessionId);
          setVideoAvailable(videoCheck.available);

          // Update video URL if available
          if (videoCheck.available && videoCheck.videoUrl) {
            sessionData.video.url = videoCheck.videoUrl;
          }

          setVideoData(sessionData);
          console.log(`[VideoSessionPage] Loaded session data from API`);
        } else {
          // Fallback to mock data for other sessions
          console.log(`[VideoSessionPage] Using mock data for session: ${sessionId}`);
          setVideoData(MOCK_VIDEO_SESSION);
          setVideoAvailable(true);
        }

      } catch (error) {
        console.error(`[VideoSessionPage] Error loading video data:`, error);
        setError(error instanceof Error ? error.message : 'Failed to load video data');
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
  }, [sessionId, interviewId]);

  const handleBackToInterview = () => {
    navigate(`/interviews/${interviewId}`);
  };

  const handleTranscriptClick = (timestamp: number) => {
    seekToTime(timestamp);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Video</h2>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex space-x-2 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
            <Button onClick={handleBackToInterview} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Video Not Found</h2>
          <p className="text-gray-600 mb-4">The video session could not be loaded.</p>
          <Button onClick={handleBackToInterview} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleBackToInterview}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interview
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Video Session: {videoData.candidate.name}
              </h1>
              <p className="text-sm text-gray-600">
                {videoData.interview.title} • {videoData.interview.type}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(videoData.video.duration)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileVideo className="h-4 w-4" />
              <span>{formatFileSize(videoData.video.fileSize)}</span>
            </div>
            <Badge variant="secondary">
              {videoData.conversation.length} turns
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Video Availability Warning */}
        {!videoAvailable && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Video file is not available for this session. You can still view the conversation transcript and timeline.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Video Player Section - 60% width on large screens */}
          <div className="lg:col-span-3">
            <VideoPlayerSection
              videoUrl={videoData.video.url}
              duration={videoData.video.duration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              volume={volume}
              onTimeUpdate={handleTimeUpdate}
              onPlayPause={handlePlayPause}
              onSpeedChange={handleSpeedChange}
              onVolumeChange={handleVolumeChange}
            />

            {/* Timeline */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Conversation Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoTimeline
                  conversation={videoData.conversation}
                  currentTime={currentTime}
                  totalDuration={videoData.video.duration}
                  onSeek={seekToTime}
                />
              </CardContent>
            </Card>
          </div>

          {/* Conversation Section - 40% width on large screens */}
          <div className="lg:col-span-2">
            <ConversationSection
              conversation={videoData.conversation}
              currentTime={currentTime}
              onTranscriptClick={handleTranscriptClick}
            />
          </div>
        </div>

        {/* Annotations Panel - Full width below */}
        <div className="mt-6">
          <AnnotationsPanel
            sessionId={videoData.sessionId}
            annotations={videoData.annotations}
            currentTime={currentTime}
            onSeekToAnnotation={seekToTime}
          />
        </div>
      </div>
    </div>
  );
}