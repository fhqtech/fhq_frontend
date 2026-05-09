import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

type Status = 'idle' | 'connecting' | 'connected' | 'error';

interface ConnectionStatusProps {
  status: Status;
}

const statusInfo = {
  idle: { text: 'Not Connected', Icon: WifiOff, color: 'text-destructive' },
  connecting: { text: 'Connecting...', Icon: Wifi, color: 'text-amber-500 animate-pulse' },
  connected: { text: 'Connected', Icon: Wifi, color: 'text-green-500' },
  error: { text: 'Connection Error', Icon: WifiOff, color: 'text-destructive' },
};

export const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  const { text, Icon, color } = statusInfo[status];

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex items-center gap-2"
        >
          <Icon size={14} className={color} />
          <p className={`text-xs font-medium ${color}`}>{text}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};