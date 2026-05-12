import { useRef, useEffect } from 'react';
import aiAvatar from '@/assets/ai-avatar.png';

export interface TranscriptMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp?: number;
}

interface TranscriptBoxProps {
  messages: TranscriptMessage[];
  currentUtterance?: string;  // Live user speech (partial)
  isUserSpeaking?: boolean;   // Show typing indicator
  className?: string;
}

export function TranscriptBox({
  messages,
  currentUtterance = '',
  isUserSpeaking = false,
  className = ''
}: TranscriptBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or user is speaking
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentUtterance]);

  return (
    <div className={`bg-slate-900/95 rounded-lg border border-slate-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700">
        <span className="text-slate-400 text-xs uppercase tracking-wider font-normal">TRANSCRIPT</span>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {messages.map((message, index) => (
          message.role === 'ai' ? (
            // AI Message - Left aligned
            <div key={index} className="flex items-start gap-2">
              <img
                src={aiAvatar}
                alt="Flowy"
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
              <div className="max-w-[80%] bg-sky-500/10 rounded-lg rounded-tl-none px-3 py-2">
                <p className="text-slate-300 text-xs leading-relaxed">{message.content}</p>
              </div>
            </div>
          ) : (
            // User Message - Right aligned
            <div key={index} className="flex items-start gap-2 flex-row-reverse">
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=candidate"
                alt="You"
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
              <div className="max-w-[80%] bg-emerald-500/10 rounded-lg rounded-tr-none px-3 py-2">
                <p className="text-slate-300 text-xs leading-relaxed">{message.content}</p>
              </div>
            </div>
          )
        ))}

        {/* Live typing indicator while user is speaking */}
        {(isUserSpeaking || currentUtterance) && (
          <div className="flex items-start gap-2 flex-row-reverse">
            <img
              src="https://api.dicebear.com/7.x/initials/svg?seed=candidate"
              alt="You"
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
            <div className="max-w-[80%] bg-emerald-500/10 rounded-lg rounded-tr-none px-3 py-2">
              {currentUtterance ? (
                <p className="text-slate-300 text-xs leading-relaxed italic">{currentUtterance}</p>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptBox;
