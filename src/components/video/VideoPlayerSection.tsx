/**
 * Video Player Section Component
 * Handles video playback with intelligent error handling and state management
 */
import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTime } from '@/data/mockVideoData';

interface VideoPlayerSectionProps {
  videoUrl: string;
  duration: number; // milliseconds
  currentTime: number; // milliseconds
  isPlaying: boolean;
  playbackSpeed: number;
  volume: number;
  onTimeUpdate: (timeInSeconds: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: string) => void;
  onVolumeChange: (volume: number) => void;
}

export interface VideoPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
}

export const VideoPlayerSection = forwardRef<VideoPlayerRef, VideoPlayerSectionProps>(
  ({
    videoUrl,
    duration,
    currentTime,
    isPlaying,
    playbackSpeed,
    volume,
    onTimeUpdate,
    onPlayPause,
    onSpeedChange,
    onVolumeChange
  }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [videoError, setVideoError] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Expose video control methods to parent
    useImperativeHandle(ref, () => ({
      seekTo: (timeInSeconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = timeInSeconds;
        }
      },
      play: () => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }));

    // Set up video event listeners
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        // Set initial volume
        video.volume = volume;
        video.playbackRate = playbackSpeed;
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }, [onTimeUpdate, volume, playbackSpeed]);

    // Handle progress bar click
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !videoRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progressWidth = rect.width;
      const clickPercent = clickX / progressWidth;
      const newTime = clickPercent * (duration / 1000); // Convert to seconds

      videoRef.current.currentTime = newTime;
    };

    // Handle fullscreen
    const handleFullscreen = () => {
      if (videoRef.current) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          videoRef.current.requestFullscreen();
        }
      }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!videoRef.current) return;

        switch (e.code) {
          case 'Space':
            e.preventDefault();
            onPlayPause();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
            break;
          case 'ArrowRight':
            e.preventDefault();
            videoRef.current.currentTime = Math.min(
              duration / 1000,
              videoRef.current.currentTime + 5
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            onVolumeChange(Math.min(1, volume + 0.1));
            break;
          case 'ArrowDown':
            e.preventDefault();
            onVolumeChange(Math.max(0, volume - 0.1));
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onPlayPause, onVolumeChange, volume, duration]);

    // Handle video error
    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      const error = video.error;

      console.log('[VideoPlayer] Video error:', e);
      console.log('[VideoPlayer] Video error details:', error);
      console.log('[VideoPlayer] Video src:', video.src);
      console.log('[VideoPlayer] Video currentSrc:', video.currentSrc);
      console.log('[VideoPlayer] Video readyState:', video.readyState);
      console.log('[VideoPlayer] Video networkState:', video.networkState);

      if (error) {
        console.log('[VideoPlayer] Video error code:', error.code);
        console.log('[VideoPlayer] Video error message:', error.message);
      }

      setVideoError(true);
      setVideoLoaded(false);
    };

    // Handle video loaded successfully
    const handleVideoLoaded = () => {
      console.log('[VideoPlayer] Video loaded successfully');
      setVideoError(false);
      setVideoLoaded(true);
    };

    // Reset states when video URL changes
    useEffect(() => {
      setVideoError(false);
      setVideoLoaded(false);
    }, [videoUrl]);

    // For demo purposes, show a placeholder since we don't have the actual video file
    const isDemo = videoUrl.includes('/demo/');

    // Show error fallback if video failed to load
    if (videoError) {
      return (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center px-8">
                <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Video Unavailable</h3>
                <p className="text-sm text-gray-600 max-w-md">
                  The recording is currently processing. Interview transcript and analysis are available below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full">
        <CardContent className="p-0">
          {/* Video Element */}
          <div className="relative bg-black rounded-t-lg overflow-hidden aspect-video">
            {isDemo ? (
              // Demo placeholder
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">Grace Red Interview</h3>
                  <p className="text-gray-300 text-sm">Accounting Position • {formatTime(duration)}</p>
                  <p className="text-gray-400 text-xs mt-2">Demo Mode - Video player UI</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full"
                  preload="metadata"
                  onClick={onPlayPause}
                  onError={handleVideoError}
                  onLoadedData={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                >
                  Your browser does not support the video tag.
                </video>

                {/* Loading state - show while video is loading */}
                {!videoLoaded && !videoError && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white text-sm">Loading video...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Video Overlay Controls */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
              <Button
                variant="secondary"
                size="lg"
                onClick={onPlayPause}
                className="bg-white bg-opacity-90 hover:bg-opacity-100"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="w-full h-2 bg-gray-200 cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-blue-600 transition-all duration-100"
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
              }}
            />
            {/* Progress handle */}
            <div
              className="absolute top-1/2 w-4 h-4 bg-blue-600 rounded-full transform -translate-y-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity"
              style={{
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
              }}
            />
          </div>

          {/* Controls Panel */}
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPlayPause}
                  className="hover:bg-gray-100"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex items-center space-x-2">
                  <SkipBack
                    className="h-4 w-4 cursor-pointer text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                      }
                    }}
                  />
                  <SkipForward
                    className="h-4 w-4 cursor-pointer text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(
                          duration / 1000,
                          videoRef.current.currentTime + 10
                        );
                      }
                    }}
                  />
                </div>

                <div className="text-sm text-gray-600 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-4">
                {/* Speed Control */}
                <Select value={playbackSpeed.toString()} onValueChange={onSpeedChange}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">0.25x</SelectItem>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>

                {/* Volume Control */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
                    className="hover:bg-gray-100"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Slider
                    value={[volume]}
                    onValueChange={([value]) => onVolumeChange(value)}
                    max={1}
                    step={0.1}
                    className="w-20"
                  />
                </div>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  className="hover:bg-gray-100"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="mt-2 text-xs text-gray-500">
              Shortcuts: Space (play/pause) • ←/→ (seek 5s) • ↑/↓ (volume)
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);