import { Mic, MicOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConnectionStatus } from '../ConnectionStatus';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Settings, Brain, Ear, MessageSquare, CheckCircle, FileText, EyeOff, RefreshCw, Gauge, Camera, CameraOff, Loader2 } from 'lucide-react';
import { ConversationState, ConnectionStatus as ConnectionStatusType } from '@/types/interview';

interface AudioControlsProps {
  isMicOn: boolean;
  onMicToggle: () => void;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDevice: string;
  onAudioChange: (deviceId: string) => void;
  audioLevel: number;
  connectionStatus: ConnectionStatusType;
  conversationState?: ConversationState;
  onEndInterview: () => void;
  isEndingInterview?: boolean;
  onCalibrate?: () => void;
  showTranscripts?: boolean;
  onTranscriptToggle?: () => void;
  onReconnect?: () => void;
  speechRate?: "slow" | "normal" | "fast";
  onSpeechRateChange?: (rate: "slow" | "normal" | "fast") => void;
  showCameraFeed?: boolean;
  onCameraToggle?: (show: boolean) => void;
}

// Mic button component
const MicStatusIndicator = ({ isMicOn, onClick }: { isMicOn: boolean, onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center h-16 w-16 rounded-full border-2 transition-all duration-300",
        isMicOn ? "border-sky-500 bg-sky-500/10" : "border-gray-600 bg-gray-500/10"
      )}
      aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
    >
      <div className="relative z-10">
        {isMicOn ? <Mic size={28} className="text-sky-400" /> : <MicOff size={28} className="text-gray-400" />}
      </div>
    </button>
  );
};

// Conversation state indicator
const ConversationStateIndicator = ({ state }: { state?: ConversationState }) => {
  if (!state) return null;

  const stateConfig = {
    [ConversationState.IDLE]: {
      icon: CheckCircle,
      label: "Ready",
      color: "text-slate-500",
      bgColor: "bg-slate-50 dark:bg-slate-800",
      borderColor: "border-slate-200 dark:border-slate-700"
    },
    [ConversationState.CALIBRATING]: {
      icon: Settings,
      label: "Calibrating",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    [ConversationState.LISTENING]: {
      icon: Ear,
      label: "Listening",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800"
    },
    [ConversationState.THINKING]: {
      icon: Brain,
      label: "Thinking",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-800"
    },
    [ConversationState.SPEAKING]: {
      icon: MessageSquare,
      label: "Speaking",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800"
    }
  };

  const config = stateConfig[state];
  const IconComponent = config.icon;

  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      <IconComponent 
        className={cn(
          "w-4 h-4",
          state === ConversationState.LISTENING && "animate-pulse",
          state === ConversationState.THINKING && "animate-spin",
          state === ConversationState.SPEAKING && "animate-bounce"
        )} 
      />
      <span>{config.label}</span>
    </motion.div>
  );
};

// Audio waveform visualizer
const Waveform = ({ level }: { level: number }) => {
  // Using 9 bars for a detailed crest effect
  const multipliers = [0.4, 0.6, 0.8, 0.9, 1, 0.9, 0.8, 0.6, 0.4];
  const maxBarHeight = 36;
  const minBarHeight = 8;
  const isSpeaking = level > 0.02;

  return (
    <div className="flex items-center justify-center gap-1 h-14 w-full max-w-[160px]">
      {multipliers.map((multiplier, i) => {
        const barHeight = Math.max(minBarHeight, level * maxBarHeight * multiplier);

        return (
          <motion.div
            key={i}
            className={`w-2 rounded-full ${isSpeaking ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            animate={{ height: `${barHeight}px` }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 20,
            }}
          />
        );
      })}
    </div>
  );
};

export const AudioControls = ({
  isMicOn,
  onMicToggle,
  audioDevices,
  selectedAudioDevice,
  onAudioChange,
  audioLevel,
  connectionStatus,
  conversationState,
  onEndInterview,
  isEndingInterview = false,
  onCalibrate,
  showTranscripts = false,
  onTranscriptToggle,
  onReconnect,
  speechRate = "normal",
  onSpeechRateChange,
  showCameraFeed = true,
  onCameraToggle,
}: AudioControlsProps) => {
  const waveformLevel = isMicOn && connectionStatus === 'connected' ? audioLevel : 0;

  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 gap-6">
      {/* Left-side controls */}
      <div className="flex items-center gap-6">
        <MicStatusIndicator isMicOn={isMicOn} onClick={onMicToggle} />
        
        {isMicOn && (
          <div className="w-[160px] h-14 flex items-center justify-center">
            <Waveform level={waveformLevel} />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Select value={selectedAudioDevice} onValueChange={onAudioChange} disabled={audioDevices.length === 0}>
            <SelectTrigger className="w-auto sm:w-[220px] h-12 border-slate-200 dark:border-slate-700 bg-transparent text-base text-foreground focus:ring-sky-500 focus:ring-offset-0">
              <SelectValue placeholder="Select mic" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <ConnectionStatus status={connectionStatus} />
          
          {/* STT Reconnect Button - Show when connection failed */}
          {connectionStatus === 'error' && onReconnect && (
            <Button 
              variant="outline" 
              size="default" 
              className="h-12 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20" 
              onClick={onReconnect}
              title="Reconnect to speech service"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
          
          {/* Conversation State Indicator */}
          <ConversationStateIndicator state={conversationState} />
          
          {/* Manual Calibration Button */}
          {onCalibrate && (
            <Button variant="outline" size="default" className="h-12" onClick={onCalibrate}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
          
          {/* Transcript Toggle Button */}
          {onTranscriptToggle && (
            <Button 
              variant={showTranscripts ? "default" : "outline"} 
              size="default" 
              className="h-12" 
              onClick={onTranscriptToggle}
              title={showTranscripts ? "Hide live transcripts" : "Show live transcripts"}
            >
              {showTranscripts ? <FileText className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>
          )}
          
          {/* Speech Rate Control */}
          {onSpeechRateChange && (
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <Select 
                value={speechRate} 
                onValueChange={(value: "slow" | "normal" | "fast") => onSpeechRateChange?.(value)}
              >
                <SelectTrigger className="w-24 h-12 border-slate-200 dark:border-slate-700 bg-transparent text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Camera Feed Toggle */}
          {onCameraToggle && (
            <Button 
              variant={showCameraFeed ? "default" : "outline"} 
              size="default" 
              className="h-12" 
              onClick={() => onCameraToggle(!showCameraFeed)}
              title={showCameraFeed ? "Hide camera feed" : "Show camera feed"}
            >
              {showCameraFeed ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Right-side button - End Interview */}
      <div className="flex-shrink-0">
        <Button 
          variant="destructive" 
          className="h-12 text-base font-medium" 
          onClick={onEndInterview}
          disabled={isEndingInterview}
        >
          {isEndingInterview ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ending Interview...
            </>
          ) : (
            'End Interview'
          )}
        </Button>
      </div>
    </div>
  );
};