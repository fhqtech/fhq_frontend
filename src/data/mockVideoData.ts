/**
 * Mock Video Data - Using Real Session Data for Demo
 * Based on actual recorded session from Grace Red interview
 */

export interface ConversationTurn {
  id: string;
  speaker: 'AI' | 'Candidate';
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  text: string;
}

export interface VideoAnnotation {
  id: string;
  timestamp: number; // milliseconds
  note: string;
  tag: 'positive' | 'neutral' | 'negative' | 'follow-up' | 'excellent' | 'concern';
  createdAt: Date;
}

export interface VideoSessionData {
  sessionId: string;
  interviewId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  interview: {
    title: string;
    type: string;
  };
  video: {
    url: string;
    duration: number; // milliseconds
    fileSize: number; // bytes
    gcsPath: string;
  };
  conversation: ConversationTurn[];
  annotations: VideoAnnotation[];
}

// Real session data from your successful test
export const MOCK_VIDEO_SESSION: VideoSessionData = {
  sessionId: 'X173i42BORJC0uyWQZhT_e1c0e04e-c8fd-4d84-92ac-06a286a35525_1758900621558',
  interviewId: 'X173i42BORJC0uyWQZhT',
  candidate: {
    id: 'e1c0e04e-c8fd-4d84-92ac-06a286a35525',
    name: 'Grace Red',
    email: 'grace.r@example.com',
    status: 'completed'
  },
  interview: {
    title: 'test1',
    type: 'screening'
  },
  video: {
    url: '/api/videos/demo/stream', // Demo endpoint for now
    duration: 10834, // 10.8 seconds from your logs
    fileSize: 62859, // 62KB from your logs
    gcsPath: 'gs://FunnelHQ-ai/test/videos/X173i42BORJC0uyWQZhT/X173i42BORJC0uyWQZhT_e1c0e04e-c8fd-4d84-92ac-06a286a35525_1758900621558_video.webm'
  },
  conversation: [
    {
      id: '1',
      speaker: 'AI',
      startTime: 0,
      endTime: 2500,
      text: 'Hello Grace, welcome to the interview! Thank you for taking the time to speak with us today. Could you please start by telling me about yourself and your background in accounting?'
    },
    {
      id: '2',
      speaker: 'Candidate',
      startTime: 2600,
      endTime: 7800,
      text: 'Hi! Thank you for having me. I\'m Grace Red, and I\'m an experienced accountant with over 5 years in the field. I specialize in financial reporting, tax preparation, and have worked extensively with QuickBooks and Excel. I\'m particularly passionate about helping businesses maintain accurate financial records and ensuring compliance with accounting standards.'
    },
    {
      id: '3',
      speaker: 'AI',
      startTime: 8000,
      endTime: 10834,
      text: 'That sounds excellent! What would you say is your greatest strength when it comes to accounting work?'
    }
  ],
  annotations: [
    {
      id: 'ann1',
      timestamp: 3000,
      note: 'Good introduction and confidence',
      tag: 'positive',
      createdAt: new Date('2024-09-26T20:53:00Z')
    },
    {
      id: 'ann2',
      timestamp: 6500,
      note: 'Strong technical background mentioned - QuickBooks, Excel',
      tag: 'excellent',
      createdAt: new Date('2024-09-26T20:53:30Z')
    },
    {
      id: 'ann3',
      timestamp: 7200,
      note: 'Shows passion for compliance and accuracy',
      tag: 'positive',
      createdAt: new Date('2024-09-26T20:54:00Z')
    }
  ]
};

// Helper functions
export const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};