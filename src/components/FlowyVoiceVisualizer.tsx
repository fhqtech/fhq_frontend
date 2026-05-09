import React, { useEffect, useState } from 'react';

interface FlowyVoiceVisualizerProps {
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
}

export default function FlowyVoiceVisualizer({
  isAISpeaking,
  isUserSpeaking
}: FlowyVoiceVisualizerProps) {
  const bars = Array.from({ length: 20 }); // Reduced from 25 to 20 bars
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    if (!isAISpeaking && !isUserSpeaking) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.1);
    }, 50);

    return () => clearInterval(interval);
  }, [isAISpeaking, isUserSpeaking]);

  return (
    <div className="flex items-center justify-start gap-1 h-16 py-2">
      {bars.map((_, i) => {
        let height = 8; // Minimum height when idle

        if (isAISpeaking) {
          // Animated wave pattern when AI speaks - reduced amplitude
          const wave1 = Math.sin(i * 0.5 + animationTime * 3) * 20;
          const wave2 = Math.cos(i * 0.3 + animationTime * 2) * 15;
          height = Math.abs(wave1 + wave2) + 10;
        } else if (isUserSpeaking) {
          // Animated wave pattern when user speaks - more visible
          const wave1 = Math.sin(i * 0.4 + animationTime * 5) * 18;
          const wave2 = Math.cos(i * 0.3 + animationTime * 4) * 12;
          height = Math.abs(wave1 + wave2) + 12;
        }

        return (
          <div
            key={i}
            className="w-1.5 rounded-full transition-all duration-150"
            style={{
              height: `${height}px`,
              background: isUserSpeaking
                ? 'linear-gradient(135deg, #34d399, #10b981, #059669)'
                : 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
              opacity: isUserSpeaking ? 0.8 : 1,
              boxShadow: isUserSpeaking
                ? '0 0 8px rgba(16, 185, 129, 0.5)'
                : isAISpeaking
                ? '0 0 8px rgba(102, 126, 234, 0.5)'
                : 'none'
            }}
          />
        );
      })}
    </div>
  );
}
