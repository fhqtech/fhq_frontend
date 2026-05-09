/**
 * Video Upload Utility
 * Handles uploading video files to Google Cloud Storage via backend API
 */

interface VideoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    fileSize: number;
    duration: number;
    uploadedAt: string;
  };
}

interface VideoMetadata {
  sessionId: string;
  interviewId: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  recordedAt: string;
}

export class VideoUploadManager {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
  }

  /**
   * Upload video in chunks to bypass Cloud Run 32MB limit
   */
  async uploadVideo(
    videoBlob: Blob,
    sessionId: string,
    interviewId: string,
    duration: number
  ): Promise<VideoUploadResult> {
    try {
      console.log('[VideoUpload] Starting chunked upload:', {
        sessionId,
        interviewId,
        fileSize: videoBlob.size,
        duration,
        type: videoBlob.type
      });

      // Chunk size: 20MB (well under Cloud Run's 32MB limit)
      const CHUNK_SIZE = 20 * 1024 * 1024;
      const totalChunks = Math.ceil(videoBlob.size / CHUNK_SIZE);

      console.log(`[VideoUpload] Splitting into ${totalChunks} chunks of max ${CHUNK_SIZE / 1024 / 1024}MB each`);

      // Upload chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoBlob.size);
        const chunk = videoBlob.slice(start, end);

        console.log(`[VideoUpload] Uploading chunk ${i + 1}/${totalChunks} (${chunk.size} bytes)`);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('sessionId', sessionId);
        formData.append('interviewId', interviewId);

        const response = await fetch(`${this.baseUrl}/api/videos/upload-chunk`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chunk ${i + 1}/${totalChunks} upload failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log(`[VideoUpload] Chunk ${i + 1}/${totalChunks} uploaded successfully`);

        // If this was the last chunk, video is complete
        if (result.complete) {
          console.log('[VideoUpload] All chunks uploaded and combined successfully');
          return {
            success: true,
            url: result.url || result.gcs_path,
            metadata: {
              fileSize: videoBlob.size,
              duration,
              uploadedAt: new Date().toISOString()
            }
          };
        }
      }

      throw new Error('Upload completed but final response not received');

    } catch (error) {
      console.error('[VideoUpload] Upload failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload video with retry logic
   */
  async uploadVideoWithRetry(
    videoBlob: Blob,
    sessionId: string,
    interviewId: string,
    duration: number,
    maxRetries: number = 3
  ): Promise<VideoUploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[VideoUpload] Upload attempt ${attempt}/${maxRetries}`);

        const result = await this.uploadVideo(videoBlob, sessionId, interviewId, duration);

        if (result.success) {
          return result;
        }

        lastError = new Error(result.error || 'Upload failed');

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[VideoUpload] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[VideoUpload] Error on attempt ${attempt}, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'All upload attempts failed'
    };
  }

  /**
   * Check if video upload is supported
   */
  isUploadSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof FormData !== 'undefined' &&
      typeof Blob !== 'undefined'
    );
  }

  /**
   * Estimate upload time based on file size and connection
   */
  estimateUploadTime(fileSize: number, connectionSpeedMbps: number = 10): number {
    // Convert to bytes per second
    const bytesPerSecond = (connectionSpeedMbps * 1024 * 1024) / 8;

    // Add overhead for HTTP and processing
    const effectiveBytesPerSecond = bytesPerSecond * 0.7;

    return Math.ceil(fileSize / effectiveBytesPerSecond);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration for display
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const videoUploadManager = new VideoUploadManager();

export default videoUploadManager;