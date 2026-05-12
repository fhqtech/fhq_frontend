import { HistoryItem } from "@/types/interview";
import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";

// Render markdown emphasis (bold text with asterisks) as HTML
const renderMarkdown = (text: string): string => {
  if (!text) return text;

  return text
    // Convert **text** or *text* to <strong>text</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>');     // *bold*
};

interface ConversationPanelProps {
  history: HistoryItem[];
  isWaitingForResponse: boolean;
  onIdleNudge?: () => void;
  interviewerName?: string;
}

// Enhanced typing indicator component
const TypingIndicator = ({ interviewerName = "AI Interviewer" }: { interviewerName?: string }) => {
  const [typingText, setTypingText] = useState(`${interviewerName} is thinking`);

  useEffect(() => {
    const phrases = [
      `${interviewerName} is thinking`,
      "Processing your response",
      "Analyzing your answer",
      "Preparing follow-up"
    ];

    let phraseIndex = 0;
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTypingText(phrases[phraseIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, [interviewerName]);

  return (
    <motion.div
      className="relative max-w-2xl w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-750 rounded-2xl p-6 shadow-lg min-h-[120px] flex flex-col justify-center border border-blue-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <motion.span
            className="text-sm text-slate-600 dark:text-slate-400 font-medium"
            key={typingText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {typingText}
          </motion.span>
          <div className="flex items-center space-x-1">
            <motion.div
              className="h-2 w-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="h-2 w-2 bg-purple-500 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="h-2 w-2 bg-pink-500 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <motion.div
              className="h-3 w-3 bg-slate-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="h-3 w-3 bg-slate-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="h-3 w-3 bg-slate-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[15px] border-b-blue-50 dark:border-b-slate-800"></div>
    </motion.div>
  );
};

const ConversationPanel = ({
  history,
  isWaitingForResponse,
  onIdleNudge,
  interviewerName = "AI Interviewer"
}: ConversationPanelProps) => {
  const lastAiMessage = history.filter(item => item.role === 'model').pop();
  const bubbleRef = useRef(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showIdleNudge, setShowIdleNudge] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  // Render markdown before displaying
  const messageText = lastAiMessage?.parts?.[0]?.text ? renderMarkdown(lastAiMessage.parts[0].text) : undefined;

  // Gentle nudging system for idle users
  useEffect(() => {
    // Clear any existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Reset idle state when there's activity
    setIsIdle(false);
    setShowIdleNudge(false);

    // Only start idle timer when not waiting for response and there's a message
    if (!isWaitingForResponse && messageText) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        setShowIdleNudge(true);
        onIdleNudge?.();
      }, 30000); // 30 seconds of inactivity
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isWaitingForResponse, messageText, onIdleNudge]);

  useGSAP(() => {
    if (messageText && textRef.current) {
      // FIX: The original logic `messageText.split(' ')` discarded newline
      // characters, merging all paragraphs. This new logic preserves them.

      textRef.current.innerHTML = ''; // Clear previous text

      // Split text by whitespace, but keep the whitespace characters (spaces, newlines)
      // in the resulting array. e.g., "Hi\nthere" becomes ["Hi", "\n", "there"]
      const parts = messageText.split(/(\s+)/);

      parts.forEach(part => {
        // If the part is a word (i.e., contains non-whitespace characters)
        if (part.trim().length > 0) {
          const span = document.createElement('span');
          // C2: textContent, not innerHTML. LLM output (or anything that
          // bubbles up from a candidate transcript) is never trusted as
          // HTML. The <strong>-rendering rationale was wishful — Smriti's
          // prompt doesn't produce HTML, and a prompt-injection attempt
          // could.
          span.textContent = part;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.transform = 'translateY(10px)';
          textRef.current!.appendChild(span);
        } else {
          // Otherwise, it's a whitespace part. Append it as a text node
          // to preserve the original formatting (spaces, newlines, etc.).
          textRef.current!.appendChild(document.createTextNode(part));
        }
      });

      // Animate only the <span> elements (the words), not the whitespace text nodes.
      gsap.to(textRef.current.querySelectorAll('span'), {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.2,
      });
    }
  }, { scope: bubbleRef, dependencies: [messageText] });

  return (
    <div className="flex flex-col h-full items-center pt-8">
      <div className="flex-1 flex items-start justify-center p-6 w-full mt-4">
        {isWaitingForResponse ? (
          <TypingIndicator interviewerName={interviewerName} />
        ) : messageText ? (
          <motion.div
            key={messageText}
            ref={bubbleRef}
            className="relative max-w-2xl w-full"
            animate={isIdle ? {
              scale: [1, 1.02, 1],
              transition: { duration: 2, repeat: Infinity }
            } : {}}
          >
            <div className={`bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl p-6 text-left text-xl shadow-lg min-h-[120px] transition-all duration-300 ${isIdle ? 'ring-2 ring-blue-200 dark:ring-blue-800 ring-opacity-60' : ''
              }`}>
              {/* This 'p' tag with 'whitespace-pre-wrap' is essential for rendering the newline characters correctly. */}
              <p ref={textRef} className="whitespace-pre-wrap"></p>

              {/* Gentle nudge indicator */}
              {showIdleNudge && (
                <motion.div
                  className="mt-4 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Take your time...
                  </span>
                </motion.div>
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[15px] border-b-white dark:border-b-slate-800"></div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationPanel;