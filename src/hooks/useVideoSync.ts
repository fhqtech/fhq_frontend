import { useState, useRef, useCallback } from 'react';

export interface VideoSyncState {
  currentTime: number; // milliseconds
  isPlaying: boolean;
  playbackSpeed: number;
  volume: number;
}

export function useVideoSync() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  // Ref to store the video element (will be set by VideoPlayerSection)
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Set the video element reference
  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Handle time updates from video element
  const handleTimeUpdate = useCallback((timeInSeconds: number) => {
    const timeInMs = timeInSeconds * 1000;
    setCurrentTime(timeInMs);
  }, []);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  // Handle speed changes
  const handleSpeedChange = useCallback((speed: string) => {
    const speedValue = parseFloat(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speedValue;
    }
    setPlaybackSpeed(speedValue);
  }, []);

  // Handle volume changes
  const handleVolumeChange = useCallback((volumeValue: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volumeValue;
    }
    setVolume(volumeValue);
  }, []);

  // Seek to specific time (used by transcript clicks and timeline clicks)
  const seekToTime = useCallback((timeInMs: number) => {
    if (videoRef.current) {
      const timeInSeconds = timeInMs / 1000;
      videoRef.current.currentTime = timeInSeconds;
      setCurrentTime(timeInMs);
    }
  }, []);

  // Handle when video starts playing
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Handle when video pauses
  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Handle when video ends
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Skip to next/previous conversation turn
  const skipToTurn = useCallback((direction: 'next' | 'previous', conversation: any[]) => {
    const currentTurnIndex = conversation.findIndex(turn =>
      currentTime >= turn.startTime && currentTime <= turn.endTime
    );

    let targetIndex;
    if (direction === 'next') {
      targetIndex = currentTurnIndex < conversation.length - 1 ? currentTurnIndex + 1 : 0;
    } else {
      targetIndex = currentTurnIndex > 0 ? currentTurnIndex - 1 : conversation.length - 1;
    }

    if (conversation[targetIndex]) {
      seekToTime(conversation[targetIndex].startTime);
    }
  }, [currentTime, seekToTime]);

  // Get current conversation turn
  const getCurrentTurn = useCallback((conversation: any[]) => {
    return conversation.find(turn =>
      currentTime >= turn.startTime && currentTime <= turn.endTime
    );
  }, [currentTime]);

  return {
    // State
    currentTime,
    isPlaying,
    playbackSpeed,
    volume,

    // Video reference
    setVideoRef,

    // Event handlers
    handleTimeUpdate,
    handlePlayPause,
    handleSpeedChange,
    handleVolumeChange,
    handlePlay,
    handlePause,
    handleEnded,

    // Seek functions
    seekToTime,
    skipToTurn,

    // Utility functions
    getCurrentTurn
  };
}