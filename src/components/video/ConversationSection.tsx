import { useState, useRef, useEffect } from 'react';
import { Search, MessageSquare, Clock, User, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ConversationTurn, formatTime } from '@/data/mockVideoData';

// Utility function to render basic markdown (bold text with asterisks)
const renderMarkdown = (text: string): string => {
  // Convert **text** or *text* to <strong>text</strong>
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>');     // *bold*
};

interface ConversationSectionProps {
  conversation: ConversationTurn[];
  currentTime: number; // milliseconds
  onTranscriptClick: (timestamp: number) => void;
}

export function ConversationSection({
  conversation,
  currentTime,
  onTranscriptClick
}: ConversationSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLDivElement>(null);

  // Find current conversation turn
  const getCurrentTurn = () => {
    return conversation.find(turn =>
      currentTime >= turn.startTime && currentTime <= turn.endTime
    );
  };

  const currentTurn = getCurrentTurn();

  // Filter conversation based on search
  const filteredConversation = conversation.filter(turn =>
    turn.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turn.speaker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-scroll to current turn
  useEffect(() => {
    if (autoScroll && activeElementRef.current && scrollAreaRef.current) {
      activeElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, autoScroll]);

  // Check if a turn is currently active
  const isActiveTurn = (turn: ConversationTurn) => {
    return currentTime >= turn.startTime && currentTime <= turn.endTime;
  };

  // Get speaker icon
  const getSpeakerIcon = (speaker: 'AI' | 'Candidate') => {
    return speaker === 'AI' ? (
      <Bot className="h-4 w-4" />
    ) : (
      <User className="h-4 w-4" />
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Conversation Transcript</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={autoScroll ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              Auto-scroll
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Current Status */}
        {currentTurn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant={currentTurn.speaker === 'AI' ? 'default' : 'secondary'}>
                {currentTurn.speaker}
              </Badge>
              <span className="text-blue-700 font-medium">Currently Speaking</span>
              <span className="text-blue-600">
                {formatTime(currentTurn.startTime)} - {formatTime(currentTurn.endTime)}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-96 px-6">
          <div className="space-y-4 pb-4">
            {filteredConversation.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversation found matching "{searchTerm}"</p>
              </div>
            ) : (
              filteredConversation.map((turn, index) => {
                const isActive = isActiveTurn(turn);
                const isAI = turn.speaker === 'AI';

                return (
                  <div
                    key={turn.id}
                    ref={isActive ? activeElementRef : null}
                    className={`group relative cursor-pointer rounded-lg border transition-all duration-200 ${isActive
                      ? 'bg-blue-50 border-blue-300 shadow-md scale-[1.02]'
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    onClick={() => onTranscriptClick(turn.startTime)}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
                    )}

                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-full ${isAI ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                            {getSpeakerIcon(turn.speaker)}
                          </div>
                          <Badge
                            variant={isAI ? 'default' : 'secondary'}
                            className={isActive ? 'ring-2 ring-blue-300' : ''}
                          >
                            {turn.speaker}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatTime(turn.startTime)} - {formatTime(turn.endTime)}
                            </span>
                          </span>
                        </div>

                        <div className="text-xs text-gray-400">
                          Turn {index + 1}
                        </div>
                      </div>

                      {/* Content */}
                      <div className={`text-sm leading-relaxed ${isActive ? 'text-blue-900 font-medium' : 'text-gray-700'
                        }`}>
                        {/* Highlight search terms */}
                        {searchTerm ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(turn.text).replace(
                                new RegExp(`(${searchTerm})`, 'gi'),
                                '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                              )
                            }}
                          />
                        ) : (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(turn.text)
                            }}
                          />
                        )}
                      </div>

                      {/* Duration */}
                      <div className="mt-2 text-xs text-gray-500">
                        Duration: {formatTime(turn.endTime - turn.startTime)}
                      </div>

                      {/* Hover indicator */}
                      {!isActive && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
                            Click to jump
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer Statistics */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Turns</div>
              <div className="font-medium">{conversation.length}</div>
            </div>
            <div>
              <div className="text-gray-500">
                {searchTerm ? 'Filtered' : 'Total'} Results
              </div>
              <div className="font-medium">{filteredConversation.length}</div>
            </div>
          </div>

          {/* Current progress */}
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>
                {currentTurn ?
                  `Turn ${conversation.findIndex(t => t.id === currentTurn.id) + 1} of ${conversation.length}` :
                  'Not speaking'
                }
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}