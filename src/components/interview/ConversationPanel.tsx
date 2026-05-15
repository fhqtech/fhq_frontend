import { HistoryItem } from "@/types/interview";
import { useRef, useState, useEffect, useMemo } from "react";
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
      <div className="bg-paper-2   rounded-2xl p-6 shadow-2 min-h-[120px] flex flex-col justify-center border border-rule ">
        <div className="flex items-center justify-between mb-3">
          <motion.span
            className="text-sm text-muted font-medium"
            key={typingText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {typingText}
          </motion.span>
          <div className="flex items-center space-x-1">
            <motion.div
              className="h-2 w-2 bg-info rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="h-2 w-2 bg-gold rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="h-2 w-2 bg-gold rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <motion.div
              className="h-3 w-3 bg-muted rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="h-3 w-3 bg-muted rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="h-3 w-3 bg-muted rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-15 border-l-transparent border-r-15 border-r-transparent border-b-15 border-b-blue-50 "></div>
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

  // Word-stagger reveal — split the message into word + whitespace parts so
  // newlines render correctly. Whitespace stays as inert text nodes; only
  // word spans animate. textContent (not innerHTML) — LLM output is never
  // trusted as HTML, and prompt-injection attempts must not become DOM.
  const wordParts = useMemo(
    () => (messageText ? messageText.split(/(\s+)/) : []),
    [messageText],
  );

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
            <div className={`bg-paper text-ink rounded-2xl p-6 text-left text-xl shadow-2 min-h-[120px] transition-all duration-300 ${isIdle ? 'ring-2 ring-gold ring-opacity-60' : ''
              }`}>
              {/* whitespace-pre-wrap preserves newlines from the LLM. */}
              <motion.p
                key={messageText}
                className="whitespace-pre-wrap"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
                }}
              >
                {wordParts.map((part, i) =>
                  part.trim().length > 0 ? (
                    <motion.span
                      key={`${i}-${part}`}
                      style={{ display: "inline-block" }}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      {part}
                    </motion.span>
                  ) : (
                    <span key={`${i}-ws`}>{part}</span>
                  ),
                )}
              </motion.p>

              {/* Gentle nudge indicator */}
              {showIdleNudge && (
                <motion.div
                  className="mt-4 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-sm text-muted italic">
                    Take your time...
                  </span>
                </motion.div>
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-15 border-l-transparent border-r-15 border-r-transparent border-b-15 border-b-white "></div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationPanel;