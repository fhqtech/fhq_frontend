import { Badge } from '@/components/ui/badge';
import { ConversationTurn, formatTime } from '@/data/mockVideoData';

interface VideoTimelineProps {
  conversation: ConversationTurn[];
  currentTime: number; // milliseconds
  totalDuration: number; // milliseconds
  onSeek: (timeInMs: number) => void;
}

export function VideoTimeline({ conversation, currentTime, totalDuration, onSeek }: VideoTimelineProps) {
  // Calculate segment positions
  const getSegmentStyle = (turn: ConversationTurn) => {
    const startPercent = (turn.startTime / totalDuration) * 100;
    const durationPercent = ((turn.endTime - turn.startTime) / totalDuration) * 100;

    return {
      left: `${startPercent}%`,
      width: `${durationPercent}%`
    };
  };

  // Get current time position
  const getCurrentTimePosition = () => {
    return (currentTime / totalDuration) * 100;
  };

  // Color scheme for different speakers
  const getSegmentColor = (speaker: 'AI' | 'Candidate') => {
    return speaker === 'AI'
      ? 'bg-blue-500 hover:bg-blue-600'
      : 'bg-green-500 hover:bg-green-600';
  };

  const getSegmentTextColor = (speaker: 'AI' | 'Candidate') => {
    return speaker === 'AI' ? 'text-blue-700' : 'text-green-700';
  };

  return (
    <div className="space-y-4">
      {/* Timeline Legend */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-600">AI Speaking</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Candidate Speaking</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-0.5 h-4 bg-red-500"></div>
          <span className="text-gray-600">Current Position</span>
        </div>
      </div>

      {/* Main Timeline */}
      <div className="relative">
        {/* Timeline Background */}
        <div className="w-full h-20 bg-gray-100 rounded-lg relative overflow-hidden border">

          {/* Conversation Segments */}
          {conversation.map((turn, index) => (
            <div key={turn.id} className="absolute">
              {/* Segment Bar */}
              <div
                className={`absolute h-8 rounded cursor-pointer transition-all duration-200 ${getSegmentColor(turn.speaker)} shadow-sm`}
                style={{
                  ...getSegmentStyle(turn),
                  top: turn.speaker === 'AI' ? '8px' : '40px'
                }}
                onClick={() => onSeek(turn.startTime)}
                title={`${turn.speaker}: ${turn.text.substring(0, 50)}...`}
              />

              {/* Segment Label (for longer segments) */}
              {(turn.endTime - turn.startTime) > totalDuration * 0.1 && (
                <div
                  className="absolute text-xs font-medium text-white px-2 py-1 pointer-events-none"
                  style={{
                    ...getSegmentStyle(turn),
                    top: turn.speaker === 'AI' ? '8px' : '40px',
                    fontSize: '10px',
                    lineHeight: '1.2'
                  }}
                >
                  {turn.speaker}
                </div>
              )}
            </div>
          ))}

          {/* Current Time Indicator */}
          <div
            className="absolute w-0.5 h-full bg-red-500 z-10 transition-all duration-100"
            style={{ left: `${getCurrentTimePosition()}%` }}
          >
            {/* Current time tooltip */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Time markers */}
          <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-between text-xs text-gray-500 px-1">
            <span>0:00</span>
            {totalDuration > 20000 && ( // Show middle marker for videos longer than 20 seconds
              <span>{formatTime(totalDuration / 2)}</span>
            )}
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Conversation Segments List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">Conversation Segments</h4>
        <div className="grid grid-cols-1 gap-2">
          {conversation.map((turn, index) => {
            const isActive = currentTime >= turn.startTime && currentTime <= turn.endTime;

            return (
              <div
                key={turn.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSeek(turn.startTime)}
              >
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={turn.speaker === 'AI' ? 'default' : 'secondary'}
                    className={`${isActive ? 'ring-2 ring-blue-300' : ''}`}
                  >
                    {turn.speaker}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatTime(turn.startTime)} - {formatTime(turn.endTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Duration: {formatTime(turn.endTime - turn.startTime)}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 max-w-md truncate">
                  {turn.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Session Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Total Turns</div>
            <div className="font-medium">{conversation.length}</div>
          </div>
          <div>
            <div className="text-gray-500">AI Speaking Time</div>
            <div className="font-medium">
              {formatTime(
                conversation
                  .filter(turn => turn.speaker === 'AI')
                  .reduce((acc, turn) => acc + (turn.endTime - turn.startTime), 0)
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Candidate Speaking Time</div>
            <div className="font-medium">
              {formatTime(
                conversation
                  .filter(turn => turn.speaker === 'Candidate')
                  .reduce((acc, turn) => acc + (turn.endTime - turn.startTime), 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}