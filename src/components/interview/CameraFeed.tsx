import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraFeedProps {
  isVisible?: boolean;
  className?: string;
}

export const CameraFeed = ({
  isVisible = true,
  className = ''
}: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);

  const startCamera = async () => {
    console.log('[CameraFeed] startCamera called');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[CameraFeed] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        } 
      });
      
      console.log('[CameraFeed] Camera access granted, setting up stream');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
        setHasStream(true);
        console.log('[CameraFeed] Camera started successfully');
      } else {
        console.warn('[CameraFeed] videoRef.current is null');
      }
    } catch (err) {
      console.error('[CameraFeed] Error accessing camera:', err);
      setError('Camera access denied or unavailable');
      setIsCameraOn(false); // Ensure camera state is false on error
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = (updateState = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setHasStream(false);
    if (updateState) {
      setIsCameraOn(false);
    }
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Auto-start camera immediately on mount
  useEffect(() => {
    console.log('[CameraFeed] Component mounted, attempting auto-start');
    if (isVisible && isCameraOn && !streamRef.current) {
      startCamera().catch(() => {
        console.log('[CameraFeed] Auto-start failed');
      });
    }
  }, []); // Run only once on mount


  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className={`bg-slate-900 rounded-lg shadow-lg border border-slate-700 overflow-hidden ${className}`}
      >
        {/* Video Feed */}
        <div
          className="relative bg-slate-900 flex items-center justify-center cursor-pointer w-full h-full"
          onClick={() => {
            if (!isCameraOn || !hasStream) {
              setIsCameraOn(true);
              startCamera();
            }
          }}
        >
          {/* Always render video element so ref is available */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isCameraOn && hasStream ? 'block' : 'hidden'}`}
            muted
            playsInline
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Loading/Error state overlay */}
          {!(isCameraOn && hasStream) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              {error ? (
                <>
                  <CameraOff className="w-8 h-8 mb-2" />
                  <span className="text-xs text-center px-2">{error}</span>
                </>
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              )}
            </div>
          )}

          {/* Camera status indicator */}
          {isCameraOn && hasStream && (
            <div className="absolute top-2 left-2">
              <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                REC
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};