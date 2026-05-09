# Phase 2: Video Recording Implementation - Detailed Plan

## 🚧 Status: READY TO IMPLEMENT

**Prerequisites**: Phase 1 completed ✅
**Estimated Duration**: 6-8 hours implementation time
**Target Completion**: Next implementation session

## Overview

Phase 2 implements 15fps video recording during interviews using MediaRecorder API with VP9/WebM compression. Videos are recorded locally during the interview and uploaded to Google Cloud Storage after completion.

## Technical Requirements

### Video Specifications
- **Frame Rate**: 15fps (not 30fps to reduce file size)
- **Codec**: VP9 for optimal compression
- **Container**: WebM format
- **Resolution**: 720p (1280x720) or user's camera native resolution
- **Audio**: AAC encoding, synchronized with video
- **Target File Size**: 50-80MB for 30-minute interview

### Storage Requirements
- **Upload Timing**: Post-interview only (not live streaming)
- **GCS Bucket**: `flowdot-ai` (existing)
- **Path Structure**: `interviews/videos/{interviewId}/{sessionId}_video.webm`
- **Metadata File**: `{sessionId}_metadata.json` (duration, size, timing sync)

## Implementation Plan

### Step 1: Video Recording Hook Component
**File**: `src/components/interview/VideoRecorder.tsx`

```typescript
interface VideoRecorderProps {
  sessionId: string;
  interviewId: string;
  isRecording: boolean;
  onRecordingStart: () => void;
  onRecordingStop: (videoBlob: Blob) => void;
  onError: (error: Error) => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  sessionId,
  interviewId,
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onError
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Get user's camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15, max: 15 } // 15fps constraint
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Configure MediaRecorder with VP9/WebM
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 1000000, // 1Mbps for good quality at 15fps
        audioBitsPerSecond: 128000   // 128kbps for audio
      };

      // Fallback for browsers that don't support VP9
      const mimeType = MediaRecorder.isTypeSupported(options.mimeType)
        ? options.mimeType
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond,
        audioBitsPerSecond: options.audioBitsPerSecond
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, {
          type: mimeType
        });
        onRecordingStop(videoBlob);
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      onRecordingStart();

      console.log('[VideoRecorder] Started recording:', {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond,
        frameRate: '15fps'
      });

    } catch (error) {
      console.error('[VideoRecorder] Failed to start recording:', error);
      onError(error as Error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('[VideoRecorder] Stopped recording');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return null; // This is a hook component, no UI
};
```

### Step 2: GCS Upload Service
**File**: `src/services/videoUploadService.ts`

```typescript
interface VideoUploadMetadata {
  sessionId: string;
  interviewId: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  recordedAt: string;
  videoTimingSync: {
    startTime: number; // When recording started relative to interview
    endTime: number;   // When recording ended
  };
}

export class VideoUploadService {
  private readonly GCS_UPLOAD_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL}/api/videos/upload`;

  async uploadVideoFile(
    videoBlob: Blob,
    metadata: VideoUploadMetadata
  ): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    try {
      console.log('[VideoUpload] Starting upload:', {
        size: videoBlob.size,
        type: videoBlob.type,
        sessionId: metadata.sessionId
      });

      // Create form data with video file and metadata
      const formData = new FormData();
      formData.append('video', videoBlob, `${metadata.sessionId}_video.webm`);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch(this.GCS_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary for FormData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('[VideoUpload] Upload successful:', result);

      return {
        success: true,
        videoUrl: result.videoUrl
      };

    } catch (error) {
      console.error('[VideoUpload] Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Calculate video metadata from blob and timing data
   */
  async createMetadata(
    videoBlob: Blob,
    sessionId: string,
    interviewId: string,
    recordingStartTime: number,
    recordingEndTime: number
  ): Promise<VideoUploadMetadata> {
    // Create a temporary video element to get duration
    const videoDuration = await this.getVideoDuration(videoBlob);

    return {
      sessionId,
      interviewId,
      duration: videoDuration,
      fileSize: videoBlob.size,
      mimeType: videoBlob.type,
      recordedAt: new Date().toISOString(),
      videoTimingSync: {
        startTime: recordingStartTime,
        endTime: recordingEndTime
      }
    };
  }

  private async getVideoDuration(videoBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(videoBlob);
    });
  }
}
```

### Step 3: Backend Video Upload Endpoint
**File**: `services/video_service/video_controller.py` (new backend service)

```python
"""
Video Upload Controller - Handles video file uploads to GCS
"""
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from google.cloud import storage
import json
import os
from datetime import datetime

logger = logging.getLogger(__name__)

# Create Blueprint
video_bp = Blueprint('videos', __name__)

# GCS Configuration
GCS_BUCKET_NAME = os.getenv('GCS_BUCKET_NAME', 'flowdot-ai')
GCS_VIDEO_PATH_PREFIX = 'interviews/videos'

@video_bp.route('/upload', methods=['POST'])
def upload_video():
    """
    Upload video file to Google Cloud Storage

    Form Data:
    - video: Video file (WebM format)
    - metadata: JSON string with video metadata
    """
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400

        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400

        # Get and parse metadata
        metadata_str = request.form.get('metadata')
        if not metadata_str:
            return jsonify({'error': 'No metadata provided'}), 400

        try:
            metadata = json.loads(metadata_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid metadata JSON'}), 400

        # Extract required fields
        session_id = metadata.get('sessionId')
        interview_id = metadata.get('interviewId')

        if not session_id or not interview_id:
            return jsonify({'error': 'sessionId and interviewId required in metadata'}), 400

        # Secure filename
        filename = secure_filename(f"{session_id}_video.webm")

        # Upload to GCS
        video_url = upload_to_gcs(
            video_file,
            filename,
            interview_id,
            metadata
        )

        # Store metadata in database
        store_video_metadata(session_id, interview_id, video_url, metadata)

        logger.info(f"Video uploaded successfully: {video_url}")

        return jsonify({
            'success': True,
            'videoUrl': video_url,
            'message': 'Video uploaded successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return jsonify({'error': 'Video upload failed'}), 500

def upload_to_gcs(video_file, filename: str, interview_id: str, metadata: dict) -> str:
    """Upload file to Google Cloud Storage"""
    try:
        # Initialize GCS client
        client = storage.Client()
        bucket = client.bucket(GCS_BUCKET_NAME)

        # Create blob path
        blob_path = f"{GCS_VIDEO_PATH_PREFIX}/{interview_id}/{filename}"
        blob = bucket.blob(blob_path)

        # Set metadata
        blob.metadata = {
            'session_id': metadata.get('sessionId'),
            'interview_id': interview_id,
            'duration': str(metadata.get('duration', 0)),
            'file_size': str(metadata.get('fileSize', 0)),
            'recorded_at': metadata.get('recordedAt'),
            'upload_timestamp': datetime.utcnow().isoformat()
        }

        # Upload file
        video_file.seek(0)  # Reset file pointer
        blob.upload_from_file(
            video_file,
            content_type=metadata.get('mimeType', 'video/webm')
        )

        # Return public URL
        return f"gs://{GCS_BUCKET_NAME}/{blob_path}"

    except Exception as e:
        logger.error(f"GCS upload failed: {str(e)}")
        raise

def store_video_metadata(session_id: str, interview_id: str, video_url: str, metadata: dict):
    """Store video metadata in Firestore"""
    try:
        from database import DatabaseManager
        db = DatabaseManager()

        # Update interview session with video data
        session_ref = db.db.collection('interview_sessions').document(session_id)
        session_ref.update({
            'video_data': {
                'video_url': video_url,
                'duration': metadata.get('duration'),
                'file_size': metadata.get('fileSize'),
                'mime_type': metadata.get('mimeType'),
                'recorded_at': metadata.get('recordedAt'),
                'timing_sync': metadata.get('videoTimingSync'),
                'uploaded_at': datetime.utcnow().isoformat()
            }
        })

        logger.info(f"Video metadata stored for session: {session_id}")

    except Exception as e:
        logger.error(f"Failed to store video metadata: {str(e)}")
        # Don't fail the upload if metadata storage fails
```

### Step 4: Integration with InterviewSession Component
**Modifications to**: `src/components/interview/InterviewSession.tsx`

```typescript
// Add to imports
import { VideoRecorder } from './VideoRecorder';
import { VideoUploadService } from '@/services/videoUploadService';

// Add to component state
const [isVideoRecording, setIsVideoRecording] = useState(false);
const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
const videoUploadService = new VideoUploadService();

// Add recording start logic (in handleStart function)
const handleStart = () => {
  // ... existing logic ...

  // Start video recording when interview begins
  setIsVideoRecording(true);
  setRecordingStartTime(Date.now());

  console.log('[Interview] Started video recording');
};

// Add video recording stop and upload (in handleEndInterview function)
const handleEndInterview = async () => {
  setIsEndingInterview(true);

  try {
    // Stop video recording first
    setIsVideoRecording(false);
    const recordingEndTime = Date.now();

    // ... existing interview ending logic ...

    console.log('[Interview] Video recording stopped, preparing for upload');

  } catch (error) {
    console.error('[Interview] Error ending interview:', error);
  }
};

// Add video recording handlers
const handleVideoRecordingStart = () => {
  console.log('[Interview] Video recording started successfully');
};

const handleVideoRecordingStop = async (videoBlob: Blob) => {
  if (!recordingStartTime) {
    console.error('[Interview] No recording start time available');
    return;
  }

  try {
    console.log('[Interview] Processing video for upload...', {
      size: videoBlob.size,
      type: videoBlob.type
    });

    // Create upload metadata
    const metadata = await videoUploadService.createMetadata(
      videoBlob,
      sessionId,
      interviewId,
      recordingStartTime,
      Date.now()
    );

    // Upload video to GCS
    const uploadResult = await videoUploadService.uploadVideoFile(videoBlob, metadata);

    if (uploadResult.success) {
      console.log('[Interview] Video uploaded successfully:', uploadResult.videoUrl);
    } else {
      console.error('[Interview] Video upload failed:', uploadResult.error);
    }

  } catch (error) {
    console.error('[Interview] Error processing video:', error);
  }
};

const handleVideoRecordingError = (error: Error) => {
  console.error('[Interview] Video recording error:', error);
  // Continue interview even if video recording fails
  setIsVideoRecording(false);
};

// Add VideoRecorder component to JSX
return (
  <div className="relative h-screen w-screen overflow-hidden bg-background flex flex-col">
    {/* Video Recording Hook - No UI */}
    <VideoRecorder
      sessionId={sessionId}
      interviewId={interviewId}
      isRecording={isVideoRecording}
      onRecordingStart={handleVideoRecordingStart}
      onRecordingStop={handleVideoRecordingStop}
      onError={handleVideoRecordingError}
    />

    {/* ... rest of existing JSX ... */}
  </div>
);
```

## Database Schema Updates

### Firestore Enhancement
The interview session document will be updated with video data:

```typescript
interface InterviewSessionWithVideo {
  // ... existing fields ...

  video_data?: {
    video_url: string;           // GCS path to video file
    duration: number;            // Video duration in seconds
    file_size: number;           // File size in bytes
    mime_type: string;           // e.g., "video/webm;codecs=vp9,opus"
    recorded_at: string;         // ISO timestamp when recording started
    uploaded_at: string;         // ISO timestamp when upload completed
    timing_sync: {
      startTime: number;         // Recording start time (timestamp)
      endTime: number;           // Recording end time (timestamp)
    };
  };
}
```

## Error Handling & Fallbacks

### Camera/Microphone Permission Issues
```typescript
// In VideoRecorder component
const handlePermissionError = (error: Error) => {
  if (error.name === 'NotAllowedError') {
    console.warn('[VideoRecorder] Camera permission denied, continuing without video');
    // Interview continues without video recording
  } else if (error.name === 'NotFoundError') {
    console.warn('[VideoRecorder] No camera found, continuing without video');
  }

  onError(error);
};
```

### Upload Failure Handling
```typescript
// Retry logic in VideoUploadService
async uploadWithRetry(videoBlob: Blob, metadata: VideoUploadMetadata, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.uploadVideoFile(videoBlob, metadata);
      if (result.success) {
        return result;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('[VideoUpload] All retry attempts failed');
        // Store video locally for manual upload later
        await this.storeVideoLocally(videoBlob, metadata);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

## Performance Considerations

### File Size Optimization
- **15fps** instead of 30fps = ~50% smaller files
- **VP9 codec** = better compression than H.264
- **1Mbps bitrate** = good quality vs. size balance
- **Target**: 50-80MB for 30-minute interview

### Browser Compatibility
- **VP9 support**: Chrome, Firefox, Edge (90%+ coverage)
- **Fallback**: WebM with VP8 codec for older browsers
- **Feature detection**: Check `MediaRecorder.isTypeSupported()`

### Upload Strategy
- **Post-interview only** = no real-time bandwidth impact
- **Background upload** = user can leave after interview ends
- **Progressive upload** = start upload immediately when recording stops
- **Local storage fallback** = retry failed uploads

## Testing Plan

### Unit Tests
1. **VideoRecorder Component**:
   - Recording start/stop functionality
   - Permission handling
   - Error scenarios

2. **VideoUploadService**:
   - File upload success/failure
   - Metadata creation
   - Retry logic

### Integration Tests
1. **Full Interview Flow**:
   - Start interview → video recording starts
   - Complete interview → video recording stops + uploads
   - Error scenarios → interview continues without video

2. **Backend Integration**:
   - Video upload endpoint
   - GCS storage
   - Metadata storage in Firestore

### Performance Tests
1. **File Size Validation**: 30-min video ≤ 80MB
2. **Upload Speed**: Reasonable upload times
3. **Browser Compatibility**: VP9 vs. VP8 fallback

## Deployment Requirements

### Environment Variables
```env
# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:8082

# Backend (app.py environment)
GCS_BUCKET_NAME=flowdot-ai
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### Google Cloud Storage Setup
1. **Bucket Configuration**:
   - Name: `flowdot-ai` (existing)
   - Location: Multi-region (US)
   - Access: Private with signed URLs

2. **IAM Permissions**:
   - Service account with Storage Admin role
   - Backend service authenticated with service account key

3. **CORS Configuration**:
```json
[
  {
    "origin": ["http://localhost:8080", "https://yourdomain.com"],
    "method": ["GET", "POST", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

## Success Criteria

### Phase 2 Completion Checklist
- [ ] 15fps video recording during interviews
- [ ] VP9/WebM compression working
- [ ] Video files uploaded to GCS after interview completion
- [ ] Video metadata stored in Firestore
- [ ] Error handling for camera/upload failures
- [ ] Interview continues normally if video fails
- [ ] File sizes meet target (50-80MB for 30min)
- [ ] Compatible with Chrome, Firefox, Edge browsers

### Performance Targets
- [ ] Video recording ≤ 2% CPU impact during interview
- [ ] Upload completes within 2 minutes for 30-min video
- [ ] 95% upload success rate
- [ ] Graceful fallback for 5% failures

## Integration with Phase 1

Phase 2 builds directly on Phase 1's timing infrastructure:

1. **Synchronized Recording**: Video recording starts when `VideoTimingManager` initializes
2. **Timing Correlation**: Video timestamps align with conversation history timing
3. **Metadata Linking**: Upload metadata includes timing sync data
4. **Foundation for Phase 3**: Video URLs + timing data = click-to-seek capability

---

*Phase 2 implementation ready to begin. All technical details and integration points defined.*