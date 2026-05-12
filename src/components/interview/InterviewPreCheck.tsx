import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Volume2,
  Mic,
  Wifi,
  Focus,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  XCircle,
  Play,
  ArrowRight,
  ArrowLeft,
  Settings,
  FileText,
  Upload,
  CloudUpload,
  Loader2
} from "lucide-react";

interface Resume {
  id: string;
  filename: string;
  gcsPath: string;
  uploadedAt: string;
  isActive: boolean;
}

interface InterviewPreCheckProps {
  interviewData: {
    id: string;
    title: string;
    description: string;
    duration: number;
    type: string;
  };
  candidateData: {
    id: string;
    name: string;
    email: string;
    resumes?: Resume[];
  };
  onStartInterview: () => void;
  onCancel: () => void;
  preCreatedSessionId: string | null;
  candidateToken?: string;
  onSessionCreated?: (sessionId: string) => void;
  onResumesUpdate?: (resumes: Resume[]) => void;
}

export const InterviewPreCheck = ({
  interviewData,
  candidateData,
  onStartInterview,
  onCancel,
  preCreatedSessionId,
  candidateToken,
  onSessionCreated,
  onResumesUpdate
}: InterviewPreCheckProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [microphoneStatus, setMicrophoneStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [microphoneError, setMicrophoneError] = useState<string>('');
  const [speakerStatus, setSpeakerStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [hasReadInstructions, setHasReadInstructions] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [isSelectingResume, setIsSelectingResume] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [isPreparingResume, setIsPreparingResume] = useState(false);
  const [prepareCompleted, setPrepareCompleted] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const micStatusRef = useRef<'idle' | 'testing' | 'success' | 'error'>('idle');

  const resumes = candidateData.resumes || [];

  // Call /prepare API to provision the agent session for this resume.
  // Honest failure: if it fails, surface the error so the candidate sees
  // a Retry button instead of a stuck-disabled Continue.
  const callPrepareAPI = async (resumeId: string) => {
    if (!candidateToken || !candidateData?.id || !interviewData?.id) {
      return;
    }

    setIsPreparingResume(true);
    setPrepareCompleted(false);
    setPrepareError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/agent-sessions/prepare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_token: candidateToken,
            interview_id: interviewData.id,
            candidate_id: candidateData.id,
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.success !== false) {
        if (result.session_id && onSessionCreated) {
          onSessionCreated(result.session_id);
        }
        setPrepareCompleted(true);
        setPrepareError(null);
      } else {
        const msg = result?.error || result?.detail || 'Could not prepare your resume. Please retry.';
        setPrepareError(msg);
        toast({
          title: 'Resume preparation failed',
          description: msg,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const msg = 'Network error while preparing your resume. Please retry.';
      setPrepareError(msg);
      toast({
        title: 'Network error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsPreparingResume(false);
    }
  };

  // Single source of truth for the "candidate selected a resume" action.
  // Runs the three sequential API calls honestly:
  //   1. /select-resume (lock to this interview) — fatal if it fails
  //   2. /set-active     (update profile)        — warn if it fails, continue
  //   3. /prepare        (provision agent)       — surfaced via prepareError
  // Returns ok=true only when the lock step succeeded; caller decides
  // whether to roll back UI state.
  const selectAndPrepareResume = async (resumeId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const selectResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/candidates/${candidateData.id}/interviews/${interviewData.id}/select-resume`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeId, candidate_token: candidateToken }),
        },
      );

      if (!selectResponse.ok) {
        const body = await selectResponse.json().catch(() => ({}));
        const msg = body?.detail || body?.error || 'Could not select this resume for the interview.';
        return { ok: false, error: msg };
      }

      // Step 2 — best effort. A failed set-active still leaves the
      // interview correctly locked to the chosen resume (step 1), so
      // we proceed to /prepare regardless.
      try {
        const setActiveResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/candidates/${candidateData.id}/resumes/${resumeId}/set-active`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_token: candidateToken }),
          },
        );
        if (!setActiveResponse.ok) {
          toast({
            title: 'Active resume not updated',
            description: 'Your interview will still use the selected file.',
          });
        }
      } catch {
        // Same as non-OK above — non-fatal.
      }

      await callPrepareAPI(resumeId);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error while selecting resume.' };
    }
  };

  // Auto-select active resume or first resume as default
  useEffect(() => {
    if (!selectedResumeId && resumes.length > 0) {
      // First priority: select the active resume
      const activeResume = resumes.find(r => r.isActive);
      const resumeToSelect = activeResume || resumes[0];

      setSelectedResumeId(resumeToSelect.id);

      // Call /prepare API when resume is auto-selected
      callPrepareAPI(resumeToSelect.id);
    }
  }, [resumes, selectedResumeId]);

  // Removed: Redundant resume fetching - resumes already available from candidateData
  // The portal API returns candidate data with resumes included

  useEffect(() => {
    return () => {
      // Cleanup audio context and stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Passive device checks — kick off mic test as soon as the precheck step renders;
  // speaker test fires automatically once mic is verified. Removes two click-through
  // gates from the candidate experience (per UX simplification spec).
  useEffect(() => {
    if (currentStep === 1 && microphoneStatus === 'idle') {
      testMicrophone();
    }
  }, [currentStep, microphoneStatus]);

  useEffect(() => {
    if (microphoneStatus === 'success' && speakerStatus === 'idle') {
      testSpeaker();
    }
  }, [microphoneStatus, speakerStatus]);

  // Keep ref in sync with state so async callbacks (10s timer, RAF) read
  // the latest value instead of the stale closure they captured at start.
  const updateMicStatus = (next: 'idle' | 'testing' | 'success' | 'error') => {
    micStatusRef.current = next;
    setMicrophoneStatus(next);
  };

  const testMicrophone = async () => {
    updateMicStatus('testing');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);

        if (average > 10) {
          updateMicStatus('success');
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
          }, 1000);
        } else if (micStatusRef.current === 'testing') {
          requestAnimationFrame(checkAudioLevel);
        }
      };

      checkAudioLevel();

      // Auto-fail after 10s. Reads ref, not the stale state closure — a
      // success that fired at t=9s won't get overwritten back to 'error'.
      setTimeout(() => {
        if (micStatusRef.current === 'testing') {
          updateMicStatus('error');
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
      }, 10000);

    } catch (error) {
      updateMicStatus('error');
      const err = error as DOMException;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicrophoneError('Microphone access was blocked. Click the lock icon in your browser address bar and allow microphone, then retry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicrophoneError('No microphone detected. Plug in a microphone (or check Bluetooth) and retry.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicrophoneError('Your microphone is in use by another app (Zoom, Meet, Teams). Close it and retry.');
      } else if (err.name === 'OverconstrainedError') {
        setMicrophoneError('Selected microphone does not meet our audio requirements. Try a different microphone.');
      } else {
        setMicrophoneError('Unable to access your microphone. Try a different browser (Chrome/Edge recommended) or check your OS permissions.');
      }
    }
  };

  const testSpeaker = () => {
    setSpeakerStatus('testing');

    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);

    setTimeout(() => {
      setSpeakerStatus('success');
      audioContext.close();
    }, 600);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (candidateToken) formData.append('candidate_token', candidateToken);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/candidates/${candidateData.id}/resumes`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resume');
      }

      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded successfully!",
      });

      // Update resumes list from upload response
      if (data.resumes && onResumesUpdate) {
        onResumesUpdate(data.resumes);
      }

      // Lock + set-active + prepare. Only flip the selection UI if the
      // lock step succeeded; revert (don't select) if it failed.
      const newResumeId = data.resume?.id;
      if (newResumeId) {
        const result = await selectAndPrepareResume(newResumeId);
        if (result.ok) {
          setSelectedResumeId(newResumeId);
        } else {
          toast({
            title: 'Could not attach resume',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleResumeSelect = async (resumeId: string) => {
    const previousId = selectedResumeId;
    setIsSettingActive(true);
    setSelectedResumeId(resumeId);

    const result = await selectAndPrepareResume(resumeId);
    setIsSettingActive(false);

    if (result.ok) {
      toast({
        title: 'Resume Selected',
        description: 'This resume is now set as active.',
      });
    } else {
      setSelectedResumeId(previousId);
      toast({
        title: 'Could not select resume',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleContinueToStep2 = async () => {
    if (!selectedResumeId && resumes.length === 0) {
      toast({
        title: "Resume Required",
        description: "Please upload or select a resume before continuing.",
        variant: "destructive"
      });
      return;
    }

    if (resumes.length > 0 && !selectedResumeId) {
      toast({
        title: "Resume Required",
        description: "Please select a resume before continuing.",
        variant: "destructive"
      });
      return;
    }

    // Pre-generate AI greeting in background if session is ready
    if (preCreatedSessionId) {
      const greetingStartTime = Date.now();

      const greetingPromise = fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/interview-prelims-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: preCreatedSessionId,
            interviewId: interviewData.id,
            newUserMessage: "hi"
          })
        }
      ).then(async (greetingResponse) => {
        if (greetingResponse.ok) {
          const greetingElapsed = Date.now() - greetingStartTime;
          const greetingData = await greetingResponse.json();
          const greetingText = greetingData[0]?.output?.response || '';

          // Store greeting in sessionStorage so interview page can use it
          if (greetingText) {
            sessionStorage.setItem(`greeting_${preCreatedSessionId}`, greetingText);
          }
          return greetingText;
        } else {
          return null;
        }
      }).catch(error => {
        return null;
      });

      // Store promise globally so interview page can await it
      (window as any)[`greetingPromise_${preCreatedSessionId}`] = greetingPromise;
    }

    setCurrentStep(2);
  };

  const handleStartInterview = () => {
    if (resumes.length > 0 && !selectedResumeId) {
      toast({
        title: 'Resume Required',
        description: 'Please select a resume before starting the interview.',
        variant: 'destructive',
      });
      return;
    }
    // Step 1 already locked + prepared the resume via selectAndPrepareResume.
    // No need to re-call /select-resume here — that path was wasted RTT
    // (and silently swallowed errors).
    onStartInterview();
  };

  const dosList = [
    {
      icon: Focus,
      title: "Find a quiet space",
      description: `Choose a place where you won't be disturbed for the next ${interviewData.duration} minutes.`
    },
    {
      icon: Mic,
      title: "Use a good microphone",
      description: "A headset with a microphone is highly recommended for the best audio quality."
    },
    {
      icon: Wifi,
      title: "Check your connection",
      description: "A stable internet connection is necessary to complete the interview."
    },
    {
      icon: CheckCircle,
      title: "Be yourself",
      description: "This is an opportunity to showcase your unique skills. Relax and answer to the best of your ability."
    }
  ];

  const dontsList = [
    {
      icon: RefreshCw,
      title: "Don't refresh the page",
      description: "Refreshing or closing the browser window will end your interview."
    },
    {
      icon: HelpCircle,
      title: "Don't seek outside help",
      description: "This interview must be completed independently."
    }
  ];

  const resumeSelected = resumes.length === 0 || selectedResumeId !== "";
  const isReadyToStart = microphoneStatus === 'success' &&
                          speakerStatus === 'success' &&
                          hasReadInstructions &&
                          resumeSelected;
  const canContinueToStep2 = selectedResumeId !== "" || resumes.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-8 py-2.5 overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center relative h-10 -ml-4">
              <img
                src="/logo.png"
                alt="FunnelHQ"
                className="h-16 object-cover object-top -mt-2"
              />
              <div className="absolute left-14">
                <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap">FunnelHQ</h1>
                <p className="text-[10px] text-slate-500 whitespace-nowrap">Interview Setup</p>
              </div>
            </div>

            {/* Candidate Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 capitalize">{candidateData.name}</p>
                <p className="text-xs text-slate-500">{candidateData.email}</p>
              </div>
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candidateData.name)}`}
                alt={candidateData.name}
                className="w-10 h-10 rounded-full shadow-md"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-12 py-6 mt-4">
        {/* Page Title */}
        <div className="mb-4 pl-0">

          {/* Step Indicator */}
          <div className="max-w-6xl mx-auto pl-20">
            <div className="flex items-center justify-start gap-6 mt-4 mb-12">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${currentStep === 1 ? 'bg-black text-white' : 'bg-green-500 text-white'}`}>
                {currentStep === 1 ? '1' : <CheckCircle className="w-6 h-6" />}
              </div>
              <span className={`text-lg font-semibold uppercase ${currentStep === 1 ? 'text-black' : 'text-slate-600'}`}>
                Resume Upload
              </span>
            </div>
            <div className="w-20 h-0.5 bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${currentStep === 2 ? 'bg-black text-white' : 'bg-slate-200 text-slate-600'}`}>
                2
              </div>
              <span className={`text-lg font-semibold uppercase ${currentStep === 2 ? 'text-black' : 'text-slate-600'}`}>
                System Check & Terms
              </span>
            </div>
            </div>
          </div>
        </div>

        {/* Step 1: Resume Upload/Selection */}
        {currentStep === 1 && (
          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 max-w-6xl mx-auto items-center">
            {/* LEFT SIDE - Upload Resume */}
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-medium text-slate-900 uppercase tracking-[0.3em]">
                    Upload New Resume
                  </h2>
                </div>

                {/* Upload New Resume */}
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative mx-auto max-w-xs h-48 border-[3px] border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
                      isUploadingResume
                        ? 'border-slate-400 bg-slate-50/30'
                        : 'border-slate-300 hover:border-slate-900 hover:bg-slate-50/30'
                    } group/upload`}
                    style={{ borderSpacing: '8px' }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <div className="relative">
                        {isUploadingResume ? (
                          <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 256 256" className="group-hover/upload:scale-110 transition-transform">
                            <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z"></path>
                          </svg>
                        )}
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                          {isUploadingResume ? 'Uploading...' : 'Click to Upload'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          PDF • Max 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center justify-end pr-8">
              <div className="text-xl font-semibold text-slate-400 uppercase tracking-widest">
                OR
              </div>
            </div>

            {/* RIGHT CARD - Choose from Existing */}
            <Card className="p-8 rounded relative overflow-hidden group transition-all duration-300 bg-white" style={{
              border: 'none',
              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
            }}>

              <div className="flex flex-col h-full relative z-10">
                <div className="text-left mb-6">
                  <div className="mb-2">
                    <h2 className="text-2xl font-semibold text-slate-900 uppercase tracking-[0.3em]">
                      Existing Resumes
                    </h2>
                    <p className="text-sm text-slate-600 uppercase tracking-wider">Select from uploaded files</p>
                  </div>
                </div>

                <div className="overflow-y-scroll space-y-3 pr-2 flex-1 pb-4" style={{ minHeight: '330px', maxHeight: '330px' }}>
                  {resumes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-semibold">No resumes yet</p>
                      <p className="text-sm text-slate-500 mt-1">Upload your first resume to get started</p>
                    </div>
                  ) : (
                    <>
                    {resumes.map((resume, index) => (
                      <div
                        key={resume.id}
                        onClick={() => handleResumeSelect(resume.id)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                          border: 'none',
                          position: 'relative',
                          overflow: 'hidden',
                          backgroundColor: 'white',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                        className="p-4 rounded cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                      >
                        <div className="flex items-start gap-3">
                          <svg className="w-7 h-7 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                            <text x="7" y="16" fontSize="6" fontWeight="bold" fill="currentColor">PDF</text>
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate uppercase tracking-wide text-left text-slate-800">
                              {resume.filename}
                            </p>
                            <p className="text-xs mt-1 text-left text-slate-500">
                              {new Date(resume.uploadedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                          {isSettingActive && selectedResumeId === resume.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-slate-900 flex-shrink-0" />
                          ) : selectedResumeId === resume.id ? (
                            <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          ) : resume.isActive && (
                            <Badge className="bg-slate-700 text-white border-0 text-xs uppercase flex-shrink-0 font-semibold shadow-sm">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="h-4" />
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Bottom Action Buttons - Step 1 */}
        {currentStep === 1 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-40">
            {prepareError && (
              <div className="max-w-6xl mx-auto px-12 pt-4">
                <div className="flex items-center justify-between gap-4 rounded border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{prepareError}</span>
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedResumeId) callPrepareAPI(selectedResumeId);
                    }}
                    disabled={isPreparingResume || !selectedResumeId}
                    className="bg-red-600 hover:bg-red-700 text-white h-8 px-4 rounded text-xs uppercase tracking-wider"
                  >
                    {isPreparingResume ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      'Retry'
                    )}
                  </Button>
                </div>
              </div>
            )}
            <div className="max-w-6xl mx-auto px-12 py-6 flex justify-between items-center">
              <Button
                onClick={onCancel}
                disabled={isUploadingResume}
                style={{
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  color: '#000000',
                  boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                }}
                className="h-12 px-8 rounded uppercase text-xs font-medium tracking-wider transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleContinueToStep2}
                disabled={!selectedResumeId || isUploadingResume || isPreparingResume || !prepareCompleted || !!prepareError}
                className="bg-black hover:bg-slate-800 text-white rounded h-12 px-8 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 uppercase tracking-wider text-xs"
              >
                {isPreparingResume ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing Resume...
                  </>
                ) : (
                  <>
                    Continue to System Check
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: System Check & Terms */}
        {currentStep === 2 && (
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8">
            {/* Left Column - Instructions */}
            <div className="space-y-6">
            {/* Do's */}
            <Card className="p-6 rounded bg-white" style={{
              border: 'none',
              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
            }}>
              <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-[0.2em]">
                How to Succeed
              </h2>
              <div className="space-y-4">
                {dosList.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#22c55e" viewBox="0 0 256 256" strokeWidth="8">
                        <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-black uppercase">{item.title}</div>
                      <div className="text-sm text-slate-600">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Don'ts */}
            <Card className="p-6 rounded bg-white" style={{
              border: 'none',
              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
            }}>
              <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-[0.2em]">
                Important Precautions
              </h2>
              <div className="space-y-4">
                {dontsList.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ef4444" viewBox="0 0 256 256" strokeWidth="8">
                        <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-black uppercase">{item.title}</div>
                      <div className="text-sm text-slate-600">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - System Check */}
          <div className="flex flex-col space-y-6">
            {/* Microphone Test */}
            <Card className="p-6 rounded bg-white" style={{
              border: 'none',
              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
            }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="font-bold text-black text-5xl leading-none">1</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-black uppercase tracking-wider">Microphone Check</span>
                    <p className="text-sm text-slate-600 mt-2">
                      Please speak a few words.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {microphoneStatus === 'idle' && (
                    <Button
                      onClick={testMicrophone}
                      style={{
                        border: 'none',
                        backgroundColor: '#000000',
                        color: 'white',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                      className="uppercase text-sm tracking-wider font-medium h-10 px-6 rounded transition-all duration-200"
                    >
                      TEST
                    </Button>
                  )}
                  {microphoneStatus === 'testing' && (
                    <div className="flex gap-1 items-end h-10">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-black rounded-full transition-all duration-100"
                          style={{
                            height: `${Math.max(4, (audioLevel / 255) * 16 + Math.random() * 4)}px`
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {microphoneStatus === 'success' && (
                    <Button
                      onClick={testMicrophone}
                      style={{
                        border: 'none',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                      className="uppercase text-sm tracking-wider font-medium h-10 px-6 rounded transition-all duration-200"
                    >
                      SUCCESS
                    </Button>
                  )}
                  {microphoneStatus === 'error' && (
                    <>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        <XCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                      <Button
                        onClick={testMicrophone}
                        style={{
                          border: 'none',
                          backgroundColor: 'white',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                        className="uppercase text-xs tracking-wider h-8 px-4 rounded transition-all duration-200"
                      >
                        RETRY
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {microphoneStatus === 'error' && microphoneError && (
                <p className="mt-3 text-xs text-destructive leading-relaxed" role="alert">
                  {microphoneError}
                </p>
              )}
            </Card>

            {/* Speaker Test */}
            <Card className="p-6 rounded bg-white" style={{
              border: 'none',
              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
            }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="font-bold text-black text-5xl leading-none">2</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-black uppercase tracking-wider">Speaker Check</span>
                    <p className="text-sm text-slate-600 mt-2">
                      Click the button to play a test sound.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {speakerStatus === 'idle' && (
                    <Button
                      onClick={testSpeaker}
                      style={{
                        border: 'none',
                        backgroundColor: '#000000',
                        color: 'white',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                      className="uppercase text-sm tracking-wider font-medium h-10 px-6 rounded transition-all duration-200"
                    >
                      TEST
                    </Button>
                  )}
                  {speakerStatus === 'testing' && (
                    <Button
                      disabled
                      style={{
                        border: 'none',
                        backgroundColor: '#000000',
                        color: 'white',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                      className="uppercase text-sm tracking-wider font-medium h-10 px-6 rounded transition-all duration-200"
                    >
                      TESTING...
                    </Button>
                  )}
                  {speakerStatus === 'success' && (
                    <Button
                      onClick={testSpeaker}
                      style={{
                        border: 'none',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                      className="uppercase text-sm tracking-wider font-medium h-10 px-6 rounded transition-all duration-200"
                    >
                      SUCCESS
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Final Confirmation */}
            <div className="flex items-center space-x-3 mb-6">
              <Checkbox
                id="instructions"
                checked={hasReadInstructions}
                onCheckedChange={(checked) => setHasReadInstructions(checked === true)}
                className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 w-5 h-5"
              />
              <label
                htmlFor="instructions"
                className="text-base text-slate-600 cursor-pointer whitespace-nowrap"
              >
                I have read the instructions and my system is ready
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={isSelectingResume}
                style={{
                  border: 'none',
                  backgroundColor: 'white',
                  color: '#000000',
                  boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                }}
                className="flex-1 h-12 rounded uppercase text-xs font-medium tracking-wider transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={!isReadyToStart || isSelectingResume}
                className="flex-1 bg-black hover:bg-slate-800 text-white h-12 rounded uppercase text-xs font-medium tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSelectingResume ? 'Processing...' : 'Start Interview'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};
