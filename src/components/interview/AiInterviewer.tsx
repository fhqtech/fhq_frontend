import { motion, AnimatePresence } from 'framer-motion';
import aiAvatar from '@/assets/ai-avatar.png';

interface AiInterviewerProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export const AiInterviewer = ({ isListening, isSpeaking }: AiInterviewerProps) => {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      {/* Pulsing ring for when the AI is speaking */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* Pulsing ring for when the AI is listening */}
      <AnimatePresence>
        {isListening && !isSpeaking && ( // Only show if not also speaking
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.15, opacity: 1 }}
            exit={{ scale: 1, opacity: 0.5 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            aria-label="AI is listening"
          />
        )}
      </AnimatePresence>

      {/* The central avatar image */}
      <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-slate-800">
        <img src={aiAvatar} alt="AI Interviewer" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};