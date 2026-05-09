# Video Recording & Transcript Synchronization - Complete Implementation Plan

## Overview
Implementation of 15fps video recording for interviews with transcript synchronization, enabling click-to-seek functionality. Designed for scale: 1000 interviews/day distributed over 16 hours.

## All Phases Overview

### ✅ Phase 1: Enhanced Conversation History with Video Timing (COMPLETED)
**Status**: Fully implemented and tested
**Duration**: 3-4 hours implementation time

**What it does**:
- Tracks video timing for AI and user speech in real-time
- Detects interruptions when user speaks while AI is talking
- Enhances existing conversation history with timing data
- Stores timing data in backend with conversation completion

**Key Features**:
- Second-level precision video timing (not sub-second as requested)
- Automatic interruption detection and flagging
- Backward compatible with existing conversation flow
- No changes to STT WebSocket required
- Enhanced conversation history entries with `video_start`, `video_end`, `was_interrupted`

**Files Created/Modified**:
- `src/types/videoTiming.ts` - Video timing type definitions
- `src/utils/videoTimingManager.ts` - Core timing tracking logic
- `src/components/interview/InterviewSession.tsx` - Integration with interview flow

### 🚧 Phase 2: Video Recording Implementation (NEXT)
**Status**: Ready to implement
**Duration**: 6-8 hours implementation time
**Dependencies**: Phase 1 complete ✅

**What it will do**:
- Record 15fps video during interviews using MediaRecorder API
- Compress video using VP9 codec with WebM container
- Store video files in Google Cloud Storage after interview completion
- Link video files to conversation history with timing data

**Key Technical Requirements**:
- 15fps recording (not 30fps to reduce file size)
- VP9/WebM compression for optimal size/quality ratio
- Post-interview upload to GCS (not live streaming)
- Video file naming: `{sessionId}_video.webm`
- Storage path: `interviews/videos/{interviewId}/{sessionId}_video.webm`

### 🎯 Phase 3: Click-to-Seek Video Playback (FUTURE)
**Status**: Planned after Phase 2
**Duration**: 4-6 hours implementation time
**Dependencies**: Phase 1 ✅ + Phase 2 required

**What it will do**:
- Video player component for interview playback
- Click-to-seek: clicking transcript text jumps to video timestamp
- Synchronized playback of video with highlighted conversation entries
- Admin interface for reviewing completed interviews

**Key Features**:
- HTML5 video player with custom controls
- Transcript overlay with clickable entries
- Visual indicators for interruptions
- Seek to exact `video_start` timestamps from conversation history

## Technical Architecture

### Data Flow:
1. **Recording**: Video + Audio captured simultaneously
2. **Timing**: VideoTimingManager tracks speech events in real-time
3. **Storage**: Enhanced conversation history saved with timing data
4. **Upload**: Video file uploaded to GCS post-interview
5. **Playback**: Video player synchronized with conversation history timing

### Database Schema Enhancement:
```typescript
// Existing conversation history enhanced with:
interface ConversationEntryWithTiming {
  type: 'question' | 'answer';
  text: string;
  timestamp: string;
  video_start?: number;    // NEW: Second into video when speaking started
  video_end?: number;      // NEW: Second into video when speaking ended
  was_interrupted?: boolean; // NEW: True if user interrupted AI
}
```

### File Storage Structure:
```
GCS Bucket: flowdot-ai
├── interviews/
│   └── videos/
│       └── {interviewId}/
│           ├── {sessionId}_video.webm
│           └── {sessionId}_metadata.json
```

## Scale Considerations

### Performance Targets:
- **1000 interviews/day** = ~62 interviews/hour peak
- **16 hour window** = distributed load
- **15fps recording** = smaller files than 30fps
- **Post-interview upload** = no live streaming overhead

### Storage Estimates (per 30min interview):
- **Video file**: ~50-80MB (15fps VP9/WebM)
- **Conversation history**: ~5-10KB with timing data
- **Daily storage**: ~50-80GB for videos + minimal metadata

### Infrastructure Requirements:
- **GCS bucket** with appropriate permissions
- **CDN** for video playback (optional but recommended)
- **Background job processing** for video compression/upload
- **Database optimization** for conversation history queries

## Success Metrics

### Phase 1 ✅:
- [x] Video timing data captured for all speech events
- [x] Interruption detection working correctly
- [x] Enhanced conversation history stored in backend
- [x] No breaking changes to existing interview flow

### Phase 2 (Target):
- [ ] 15fps video recording during interviews
- [ ] VP9/WebM compression working
- [ ] Successful upload to GCS post-interview
- [ ] Video files linked to conversation sessions

### Phase 3 (Target):
- [ ] Video player with seek functionality
- [ ] Click-to-seek from conversation history
- [ ] Smooth video playback synchronized with timestamps
- [ ] Admin interface for interview review

## Next Steps

1. **Phase 2 Implementation** - Start with video recording
2. **GCS Setup** - Configure bucket and permissions
3. **Compression Testing** - Validate VP9/WebM quality vs size
4. **Upload Pipeline** - Background processing for post-interview upload
5. **Phase 3 Planning** - Detailed video player specifications

---

*This document serves as the complete roadmap for video recording implementation across all phases.*