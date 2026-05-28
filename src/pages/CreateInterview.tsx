import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { suggestFromTitle, type InterviewSuggestion } from "@/services/suggestionsApi";
import { FINANCE_DOMAINS, FINANCE_DOMAIN_IDS, getSubDomains, type FinanceDomainId } from "@/lib/financeTaxonomy";
import { RoleCuratorModal } from "@/components/role-curator/RoleCuratorModal";
import { Wand2 } from "lucide-react";
import { previewVoice } from "@/services/voicePreviewApi";
import { BlueprintPreviewRail } from "@/components/create-interview/BlueprintPreviewRail";
import { DurationField } from "@/components/create-interview/DurationField";
import { EditModeIndicator } from "@/components/create-interview/EditModeIndicator";
import { ArrowLeft, FloppyDisk as Save, Users, Robot as Bot, SpeakerHigh as Volume2, Envelope as Mail, Phone, ChatCircle as MessageSquare, Upload, Download, FileXls as FileSpreadsheet, Gear as Settings, Calculator, Receipt, Briefcase, ArrowsOut, CheckCircle, Info, Play, Stop, CircleNotch, Trash, X, Plus, ArrowsClockwise, CloudArrowUp, ClockCounterClockwise, AddressBook, CaretLeft, CaretRight } from "phosphor-react";
import aiAvatar from "@/assets/ai-avatar.png";
import blueprintGuideImg1 from "@/assets/create-interview-guide/interview-blueprint.png";
import blueprintGuideImg2 from "@/assets/create-interview-guide/edit-interview-blueprint.png";
import { DuplicateAnalysisModal } from "@/components/modals/DuplicateAnalysisModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShimmerInterviewConfig } from "@/components/ui/shimmer";
import { SpinnerWithCopy } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Stepper, StepperNavigation, Step } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toastPlanError } from "@/lib/planErrorToast";
import { useCredits, useRefreshCredits } from "@/hooks/usePlan";
import { listsApi, CandidateList } from "@/services/listsApi";
import { qualifiedListsApi, QualifiedList } from "@/services/qualifiedListsApi";
import { duplicateDetectionApi, DuplicateAnalysis } from "@/services/duplicateDetectionApi";
import { SourceManager } from "@/components/sources/SourceManager";
import { useStepper } from "@/hooks/useStepper";
import { GoogleSheetsPreview } from "@/components/ui/google-sheets-preview";
import { FilePreview } from "@/components/ui/file-preview";
import { templateApi, InterviewTemplate } from "@/services/templateApi";
import { creditApi, CreditInfo } from "@/services/creditApi";
import { track, Events } from "@/lib/analytics";
import { extractFromJDFile, extractFromJDText, type ExtractedJD } from "@/services/jdExtractApi";

export default function CreateInterview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentWorkspace, currentProject } = useWorkspace();
  const editId = searchParams.get('edit');
  const mode = searchParams.get('mode');
  const stepParam = searchParams.get('step');
  const sourceParam = searchParams.get('source');
  const typeParam = searchParams.get('type'); // Pre-select interview type from URL (screening/fitment)
  const durationParam = searchParams.get('duration'); // Pre-select duration from URL
  const isEditMode = !!editId;
  // Note: add-candidates mode is deprecated, use step=1 instead

  // Parse initial step from URL parameter
  const getInitialStep = () => {
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      // Validate step is within bounds
      if (step >= 0 && step < 4) {
        // For edit mode, allow jumping to any step
        // For create mode, validate we can access the step
        if (isEditMode || step === 0) {
          return step;
        }
        // In create mode, only allow step 1 if we have form data
        // Step 2+ require validation
        return step;
      }
    }
    return 0; // Default to first step
  };

  // State to track if we need to validate completed steps on load
  const [needsStepValidation, setNeedsStepValidation] = useState(stepParam && parseInt(stepParam, 10) > 0);
  
  // Load initial form data from localStorage or use defaults
  const getInitialFormData = () => {
    // If URL params are present, ignore localStorage and use URL param values
    const hasUrlParams = !!(typeParam || durationParam);

    if (!hasUrlParams) {
      // No URL params - try to load from localStorage
      const saved = localStorage.getItem('createInterviewForm');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            candidateUpload: {
              ...parsed.candidateUpload,
              uploadedFile: null, // Don't persist file objects
              sheetValidation: {
                isValid: false,
                data: null,
                mapping: null
              },
              fileValidation: {
                isValid: false,
                data: null,
                mapping: null
              }
            }
          };
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      }
    }

    // Default form data (used when no localStorage OR when URL params are present)
    const defaultData = {
      title: "",
      type: "",
      description: "",
      blueprintNotes: "", // recruiter "Refine this preview" notes
      financeDomain: "" as FinanceDomainId | "",
      subDomain: "",
      duration: "10",
      voiceType: "professional-female",
      voiceSpeed: "normal",
      voiceAccent: "indian",
      communications: {
        email: true,
        phone: false,
        sms: false
      },
      candidateSources: [],
      selectedListIds: [],
      duplicateAnalysis: null, // Store duplicate analysis results
      candidateUpload: {
        method: "manual", // manual, sheet, file
        addLaterSelected: false,
        googleSheetUrl: "",
        uploadedFile: null as File | null,
        gcpFilePath: "", // Store GCP location after upload
        totalRows: 0,
        sheetValidation: {
          isValid: false,
          data: null,
          mapping: null
        },
        fileValidation: {
          isValid: false,
          data: null,
          mapping: null
        }
      }
    };

    // If URL params are present, pre-fill them
    if (hasUrlParams) {
      if (typeParam && (typeParam === 'screening' || typeParam === 'fitment' || typeParam === 'skill_analysis')) {
        defaultData.type = typeParam;
        // Auto-select recommended duration based on type (can be overridden by durationParam)
        defaultData.duration = typeParam === 'fitment' ? '20' : '10';
      }

      // Override duration if explicitly provided in URL
      if (durationParam) {
        defaultData.duration = durationParam;
      }
    }

    return defaultData;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Phase A.4: out-of-scope rejection modal state. Set when the backend's
  // admission gate (services/domain_fit/) classifies the candidate's
  // resume as non-finance. Renders a clear modal explaining the scope.
  const [outOfScopeDetail, setOutOfScopeDetail] = useState<{
    message: string;
    nonFinanceSignals: string[];
    financeSignals: string[];
  } | null>(null);

  // AI suggestion state — populated by debounced fetch on title typing.
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [lastSuggestedTitle, setLastSuggestedTitle] = useState<string>('');

  // Progress modal states
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState([]);
  const [currentProgressStep, setCurrentProgressStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [wasInterviewStarted, setWasInterviewStarted] = useState(false); // Track if interview was auto-started (template flow)

  // JD intake (screening + fitment only). 'design' = use the existing
  // "Help me design the role" flow; 'jd' = paste or upload a JD which
  // seeds title/description/domain.
  const [jdMode, setJdMode] = useState<'design' | 'jd'>('design');
  const [jdText, setJdText] = useState("");
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);

  // Backend returns domain in the LangGraph form (management_consulting);
  // the frontend dropdown uses the shorter "consulting" key. Map across.
  const jdDomainToFinanceDomain = (d: ExtractedJD['domain']): FinanceDomainId | "" => {
    switch (d) {
      case 'accounting': return 'accounting';
      case 'taxation': return 'taxation';
      case 'management_consulting': return 'consulting';
      default: return '';
    }
  };

  const applyJdExtraction = (jd: ExtractedJD) => {
    const composedDescription = [
      jd.summary,
      jd.responsibilities.length ? `\nResponsibilities:\n- ${jd.responsibilities.join("\n- ")}` : "",
      jd.requiredSkills.length ? `\nRequired skills: ${jd.requiredSkills.join(", ")}` : "",
      jd.experienceYears > 0 ? `\nMinimum experience: ${jd.experienceYears} years` : "",
    ].filter(Boolean).join("\n").trim();

    setFormData((prev) => ({
      ...prev,
      title: jd.title || prev.title,
      description: composedDescription || prev.description,
      financeDomain: jdDomainToFinanceDomain(jd.domain) || prev.financeDomain,
    }));
    setJdError(null);
    toast({
      title: "JD applied",
      description: jd.title
        ? `Pre-filled the role as "${jd.title}". You can edit anything before continuing.`
        : "Pre-filled the form from the JD. You can edit anything before continuing.",
    });
  };

  // Lists-related states
  const [availableLists, setAvailableLists] = useState<CandidateList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [listViewType, setListViewType] = useState<'existing' | 'shared'>('existing');
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [createListFormData, setCreateListFormData] = useState({
    name: '',
    description: '',
    sources: []
  });

  // Google Sheets URL rows for the modal
  interface SheetUrlRow {
    id: string;
    url: string;
    status: 'idle' | 'validating' | 'valid' | 'error';
    candidateCount: number;
    sheetName: string;
    error?: string;
  }
  const [sheetUrlRows, setSheetUrlRows] = useState<SheetUrlRow[]>([
    { id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }
  ]);

  // Source type toggle for modal (Google Sheets vs Manual Entry)
  const [sourceEntryType, setSourceEntryType] = useState<'google_sheet' | 'manual_entry'>('google_sheet');

  // Manual entry candidates
  interface ManualCandidate {
    id: string;
    name: string;
    email: string;
  }
  const [manualCandidates, setManualCandidates] = useState<ManualCandidate[]>([
    { id: 'candidate_1', name: '', email: '' }
  ]);

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Duplicate detection states - Email-only duplicate detection
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Modal-based duplicate analysis states
  const [showDuplicateModal, setShowDuplicateModalInternal] = useState(false);

  // Wrapped setter to log all calls
  const setShowDuplicateModal = (value: boolean | ((prev: boolean) => boolean)) => {
    setShowDuplicateModalInternal(value);
  };

  // Original values tracking for edit mode blueprint regeneration
  const [originalInterviewData, setOriginalInterviewData] = useState<{
    title: string;
    description: string;
    type: string;
    duration: string;
  } | null>(null);

  const [duplicateAnalysisCompleted, setDuplicateAnalysisCompleted] = useState(false);
  const [duplicateAnalysisStage, setDuplicateAnalysisStage] = useState<string>('');
  const [modalStep, setModalStep] = useState<'analyzing' | 'results'>('analyzing');

  // Template selection states
  const [blueprintMode, setBlueprintMode] = useState<'new' | 'template'>('new');
  const [availableTemplates, setAvailableTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InterviewTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Interview type selection (shown before form in create mode)
  // If typeParam is provided in URL, we'll skip the type selection screen
  // Also check formData.type which is now pre-filled from URL params in getInitialFormData
  const [showTypeSelection, setShowTypeSelection] = useState(!isEditMode && !typeParam);
  // Blueprint preview trigger: incremented on explicit user events (title/
  // description blur, Enter in title) so the rail only fires Gemini when
  // the user is "done" typing — not on every keystroke.
  const [previewTrigger, setPreviewTrigger] = useState(0);
  const bumpPreview = () => setPreviewTrigger((n) => n + 1);

  // Credit info states
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [isLoadingCreditInfo, setIsLoadingCreditInfo] = useState(false);
  const [maxCandidates, setMaxCandidates] = useState<number | null>(null);

  // Blueprint guide modal states
  const [showBlueprintGuideModal, setShowBlueprintGuideModal] = useState(false);
  const [blueprintGuideSlide, setBlueprintGuideSlide] = useState(0);
  const [hasClosedBlueprintGuide, setHasClosedBlueprintGuide] = useState(false);

  // Phase 4 — role curator chat modal
  const [showRoleCurator, setShowRoleCurator] = useState(false);

  // Debug effect for modal state changes
  useEffect(() => {
    // Modal state change tracking
  }, [showDuplicateModal]);

  // Handle closing the blueprint guide modal
  const handleCloseBlueprintGuide = () => {
    setShowBlueprintGuideModal(false);
    setBlueprintGuideSlide(0);
    setHasClosedBlueprintGuide(true);
  };

  // Fetch available templates when project is ready (only in create mode)
  // Re-fetch when interview type changes to get matching templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentProject?.id || !currentWorkspace?.id || isEditMode) return;

      setIsLoadingTemplates(true);
      try {
        // Pass interview type to filter templates by screening/fitment
        const templateType = (formData.type === 'screening' || formData.type === 'fitment')
          ? formData.type as 'screening' | 'fitment'
          : undefined;

        const templates = await templateApi.getAvailableTemplates(
          currentProject.id,
          currentWorkspace.id,
          templateType
        );
        setAvailableTemplates(Array.isArray(templates) ? templates : []);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        setAvailableTemplates([]); // Templates are optional — empty array unblocks the UI.
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [currentProject?.id, currentWorkspace?.id, isEditMode, formData.type]);

  // Fetch credit info when project and duration change
  useEffect(() => {
    const fetchCreditInfo = async () => {
      if (!currentProject?.id || !currentWorkspace?.id) return;

      const duration = parseInt(formData.duration, 10);
      if (duration !== 10 && duration !== 20) return;

      setIsLoadingCreditInfo(true);
      try {
        const estimate = await creditApi.getCreditEstimate(
          currentWorkspace.id,
          currentProject.id,
          duration,
          0 // candidate count - will be updated in Step 1
        );
        setCreditInfo({
          hardLimit: estimate.projectBudget.hardLimit,
          softLimit: estimate.projectBudget.softLimit,
          used: estimate.projectBudget.used,
          available: estimate.availableCredits,
          creditCosts: { 10: 2, 20: 4 }
        });
        setMaxCandidates(estimate.maxCandidatesPossible);
      } catch (error) {
        console.error('Failed to fetch credit info:', error);
        // Don't show error toast - credit info is supplementary
      } finally {
        setIsLoadingCreditInfo(false);
      }
    };

    fetchCreditInfo();
  }, [currentProject?.id, currentWorkspace?.id, formData.duration]);

  const { toast } = useToast();
  const credits = useCredits();
  const refreshCredits = useRefreshCredits();

  // Helper to clear blueprint when user edits form fields
  const clearBlueprintOnEdit = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    }
  };

  // Handle template selection - populate form fields from the blueprint
  const handleTemplateSelect = (template: InterviewTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      title: template.title || prev.title,
      type: template.type || prev.type,
      description: template.topics || prev.description,
      duration: template.duration !== undefined ? String(template.duration) : prev.duration
    }));

    toast({
      title: "Blueprint Selected",
      description: `Using blueprint: ${template.title}`
    });
  };
  const navigate = useNavigate();

  // Helper function to initialize progress steps based on selected lists and template selection
  const initializeProgressSteps = (selectedListsCount: number, usingTemplate: boolean = false) => {
    const baseSteps = [
      { id: 1, title: 'Validating Interview Details', status: 'pending', description: 'Checking all required fields...' },
      { id: 2, title: 'Creating Interview', status: 'pending', description: 'Setting up your interview configuration...' },
      { id: 3, title: 'Linking Candidate Lists', status: 'pending', description: `Connecting ${selectedListsCount} candidate list${selectedListsCount !== 1 ? 's' : ''}...` }
    ];

    // Step 4 changes based on whether using existing template or generating new blueprint
    const step4 = usingTemplate
      ? {
          id: 4,
          title: 'Starting Interview',
          status: 'pending',
          description: 'Activating interview for candidates...'
        }
      : {
          id: 4,
          title: 'Generating Blueprint',
          status: 'pending',
          description: 'Triggering automated blueprint generation...'
        };

    const finalStep = {
      id: 5,
      title: 'Finalizing Setup',
      status: 'pending',
      description: 'Completing interview setup...'
    };

    const allSteps = [...baseSteps, step4, finalStep];
    setProgressSteps(allSteps);
    setTotalSteps(allSteps.length);
    return allSteps;
  };

  // Helper function to update progress steps
  const updateProgressStep = (stepId: number, status: 'pending' | 'active' | 'completed' | 'error', description?: string) => {
    setProgressSteps(prev => {
      const updated = prev.map(step => {
        if (step.id === stepId) {
          return { ...step, status, ...(description && { description }) };
        }
        return step;
      });
      
      // Calculate overall progress
      const completedSteps = updated.filter(step => step.status === 'completed').length;
      const progress = Math.round((completedSteps / updated.length) * 100);
      setOverallProgress(progress);
      
      return updated;
    });
  };

  // Add candidate source to the list
  const addCandidateSource = (sourceData) => {
    const newSource = {
      id: `temp_${Date.now()}`, // Temporary ID until saved
      type: sourceData.type,
      name: sourceData.name,
      candidateCount: sourceData.candidateCount,
      status: sourceData.status || 'validated',
      metadata: sourceData.metadata || {},
      createdAt: new Date()
    };

    setFormData(prev => ({
      ...prev,
      candidateSources: [...prev.candidateSources, newSource]
    }));
  };

  // Remove candidate source from list
  const removeCandidateSource = (sourceId) => {
    setFormData(prev => ({
      ...prev,
      candidateSources: prev.candidateSources.filter(source => source.id !== sourceId)
    }));
  };

  // Get total candidates from all sources
  const getTotalCandidates = () => {
    return formData.candidateSources.reduce((total, source) => {
      return total + (source.candidateCount || 0);
    }, 0);
  };

  // Save candidate sources to backend with progress tracking
  const saveCandidateSources = async (interviewId, sources) => {
    try {
      const userToken = localStorage.getItem('auth_token');
      let sourceIndex = 0;
      
      for (const source of sources) {
        // Skip temporary sources that are already saved
        if (source.id.startsWith('temp_')) {
          const currentStepId = 3 + sourceIndex;
          updateProgressStep(currentStepId, 'active', `Processing "${source.name}"...`);
          setCurrentProgressStep(currentStepId);
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews/${interviewId}/candidate-sources`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
              'user-id': user?.id || '87c0388e-5f74-4a30-8e32-06869f852cc3'
            },
            body: JSON.stringify({
              type: source.type,
              name: source.name,
              candidateCount: source.candidateCount,
              validCandidates: source.candidateCount,
              duplicates: 0,
              status: source.status,
              metadata: {
                ...source.metadata,
                // Ensure GCS URL is included in metadata
                gcs_url: source.metadata?.gcs_url || source.gcpFilePath || formData.candidateUpload?.gcpFilePath,
                file_path: source.metadata?.file_path || source.gcpFilePath || formData.candidateUpload?.gcpFilePath
              }
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Mark this source as completed
            updateProgressStep(currentStepId, 'completed', `"${source.name}" added successfully`);
            
            // Check for duplicate warnings
            if (result.duplicates_detected && result.duplicate_warning) {
              toast({
                title: `Duplicates Detected in ${source.name}`,
                description: result.duplicate_warning,
                variant: "destructive"
              });
            }
          } else {
            updateProgressStep(currentStepId, 'error', `Failed to add "${source.name}"`);
            console.error(`Failed to save candidate source: ${source.name}`);
          }
          
          sourceIndex++;
          
          // Add small delay between sources for better UX
          if (sourceIndex < sources.filter(s => s.id.startsWith('temp_')).length) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    } catch (error) {
      console.error('Error saving candidate sources:', error);
    }
  };
  
  // Clear form states when switching between create/edit modes
  useEffect(() => {
    // Clear any previous states when URL changes
    if (audioRef) {
      audioRef.pause();
      setAudioRef(null);
    }
    setIsPlayingAudio(false);
    setIsDescriptionModalOpen(false);
    setLastSavedAt(null);
    
    // If not in edit mode, reset to initial form data
    if (!isEditMode) {
      setFormData(getInitialFormData());
      localStorage.removeItem('createInterviewForm');
    }
  }, [isEditMode, editId]);

  // Load interview data for editing
  useEffect(() => {
    console.log('Edit useEffect triggered:', { isEditMode, editId });
    if (isEditMode && editId) {
      console.log('Setting loading to true and fetching data for:', editId);
      setIsLoadingInterview(true);
      fetchInterviewData(editId);
    }
  }, [isEditMode, editId]);

  // Debug: Log form data changes
  useEffect(() => {
    console.log('📋 FormData updated:', formData);
  }, [formData]);

  // Reset list creation states ONLY on initial component mount
  useEffect(() => {
    console.log('🔄 Component initial mount, resetting list creation states');
    setShowCreateListForm(false);
    setIsCreatingList(false);
  }, []); // Empty dependency array = only runs once on mount

  // Global click listener for debugging stuck states
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (isCreatingList) {
        const target = e.target as HTMLElement;
        // If click is outside the create list form and button is stuck, show warning
        if (!target.closest('[data-create-list-form]')) {
          console.warn('⚠️ Create list button is stuck in loading state. Consider resetting.');
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isCreatingList]);

  // Validate previous steps when jumping to a later step via URL
  useEffect(() => {
    if (needsStepValidation && formData) {
      const initialStep = getInitialStep();
      
      // For jumping to step 2 (candidates), validate step 1 (basic details)
      if (initialStep >= 1) {
        // In edit mode, don't validate until form data is loaded
        // Check if we have meaningful form data (not just defaults)
        const hasLoadedData = formData.title && formData.title.trim() && 
                            formData.type && formData.type.trim() && 
                            formData.description && formData.description.trim();
                            
        if (isEditMode && !hasLoadedData) {
          // In edit mode but data not loaded yet, wait
          return;
        }
        
        const step1Validation = validateStep(0, formData);
        if (step1Validation.isValid) {
          // Mark step 1 as completed
          stepper.markStepAsCompleted(0);
          
          // Show success message for direct navigation
          if (sourceParam) {
            toast({
              title: "Ready to add applicants",
              description: `Source type "${sourceParam}" is ready for configuration.`,
            });
          }
        } else {
          // If step 1 is invalid, redirect to step 1 with error
          stepper.goToStep(0);
          toast({
            title: "Complete Previous Step",
            description: "Please complete the basic details before adding candidates.",
            variant: "destructive"
          });
        }
      }
      
      // Validate source parameter if provided
      if (sourceParam && !['google_sheet', 'excel_file', 'manual_entry'].includes(sourceParam)) {
        toast({
          title: "Invalid Source Type",
          description: `"${sourceParam}" is not a valid source type. Please use: google_sheet, excel_file, or manual_entry.`,
          variant: "destructive"
        });
      }
      
      setNeedsStepValidation(false);
    }
  }, [formData, needsStepValidation, isEditMode, sourceParam]);
  
  const fetchInterviewData = async (interviewId: string) => {
    console.log('🔄 Starting fetchInterviewData for:', interviewId);
    try {
      const userToken = localStorage.getItem('auth_token');

      // Edit mode requires a workspace + project context — the only
      // existing backend route is the workspace-scoped one. Bail out
      // gracefully if context isn't ready yet (the parent useEffect
      // will retrigger once it loads).
      if (!currentWorkspace?.id || !currentProject?.id) {
        console.log('⏸ fetchInterviewData waiting for workspace/project context');
        return;
      }

      const interviewResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/${interviewId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(userToken && { 'Authorization': `Bearer ${userToken}` })
          }
        }
      );

      console.log('📥 Interview response status:', interviewResponse.status);
      
      if (interviewResponse.ok) {
        const interviewResult = await interviewResponse.json();
        console.log('📦 Raw interview result:', interviewResult);
        
        // Extract interview data - handle different possible structures
        let interviewData = interviewResult.interview || interviewResult.data || interviewResult;
        
        // If it's still empty, check if the data is in the top level but not in expected fields
        if (!interviewData || Object.keys(interviewData).length === 0) {
          // Use the entire result but filter out non-interview fields
          const { success, status, id, ...restData } = interviewResult;
          interviewData = restData;
        }
        
        console.log('📋 Interview data:', interviewData);
        
        // Using lists-based approach - no need to load candidate sources
        
        // Map backend data to form structure
        console.log('🔍 Loading interview data for editing:', interviewData);
        const newFormData = {
          title: interviewData.title || "",
          type: interviewData.type || "",
          description: interviewData.description || "",
          blueprintNotes: interviewData.blueprintNotes || "",
          financeDomain: (interviewData.financeDomain || "") as FinanceDomainId | "",
          subDomain: interviewData.subDomain || "",
          duration: interviewData.duration || "30",
          voiceType: interviewData.voiceType || "professional-female",
          voiceSpeed: interviewData.voiceSpeed || "normal",
          voiceAccent: interviewData.voiceAccent || "indian",
          communications: {
            email: interviewData.communications?.email ?? true,
            phone: interviewData.communications?.phone ?? false,
            sms: interviewData.communications?.sms ?? false
          },
          candidateSources: [], // Using lists-based approach
          selectedListIds: interviewData.selectedListIds || [], // Load selected lists if available
          candidateUpload: {
            method: interviewData.candidateUpload?.method || "manual",
            addLaterSelected: interviewData.candidateUpload?.addLaterSelected || false,
            googleSheetUrl: interviewData.candidateUpload?.googleSheetUrl || "",
            uploadedFile: null,
            gcpFilePath: interviewData.candidateUpload?.gcpFilePath || "",
            totalRows: interviewData.candidateUpload?.totalRows || 0,
            sheetValidation: {
              isValid: false,
              data: null,
              mapping: null
            },
            fileValidation: {
              isValid: false,
              data: null,
              mapping: null
            }
          }
        };
        
        console.log('🔄 About to set form data:', newFormData);
        setFormData(newFormData);
        console.log('✅ Form data has been set');

        // Store original values for blueprint regeneration detection
        setOriginalInterviewData({
          title: interviewData.title || "",
          description: interviewData.description || "",
          type: interviewData.type || "",
          duration: interviewData.duration || "30"
        });
        console.log('📝 Original interview data stored for blueprint change detection');

        toast({
          title: "Interview Loaded",
          description: `"${interviewData.title}" is ready for editing.`
        });
      } else {
        const error = await interviewResponse.json();
        throw new Error(error.error || 'Failed to load interview');
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
      toast({
        title: "Failed to Load Interview",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingInterview(false);
    }
  };

  // Audio file mapping for preview
  const getAudioFile = (accent: string, speed: string) => {
    return `/${accent}_${speed}.wav`;
  };

  // Build the personalized greeting the AI interviewer will use.
  const personalizedGreeting = (): string => {
    const role = formData.title?.trim() || "this role";
    return `Hi there, I'm Flowy. I'll be helping you with the ${role} interview today. Ready when you are.`;
  };

  // Calls backend Cartesia preview so the recruiter hears the same voice the
  // runtime interviewer uses. Falls back to the static accent/speed WAV file
  // only if Cartesia is unavailable.
  const playAudioPreview = async () => {
    stopAudioPreview();
    setIsPlayingAudio(true);
    try {
      const { audio_base64, mime } = await previewVoice({
        voice_type: formData.voiceType,
        voice_speed: formData.voiceSpeed,
        voice_accent: formData.voiceAccent,
        sample_text: personalizedGreeting(),
      });
      const audio = new Audio(`data:${mime || 'audio/mpeg'};base64,${audio_base64}`);
      setAudioRef(audio);
      audio.onended = () => { setIsPlayingAudio(false); setAudioRef(null); };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setAudioRef(null);
        playWavFallback();
      };
      await audio.play();
    } catch {
      playWavFallback();
    }
  };

  const playWavFallback = () => {
    const audioFile = getAudioFile(formData.voiceAccent, formData.voiceSpeed);
    const audio = new Audio(audioFile);
    setAudioRef(audio);
    setIsPlayingAudio(true);
    audio.onended = () => { setIsPlayingAudio(false); setAudioRef(null); };
    audio.onerror = () => {
      setIsPlayingAudio(false);
      setAudioRef(null);
      toast({ title: "Error", description: "Could not play audio preview", variant: "destructive" });
    };
    audio.play().catch(() => {
      setIsPlayingAudio(false);
      setAudioRef(null);
      toast({ title: "Error", description: "Could not play audio preview", variant: "destructive" });
    });
  };

  const stopAudioPreview = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setAudioRef(null);
    }
    setIsPlayingAudio(false);
  };

  // Lists-related functions
  const loadAvailableLists = async (viewType: 'existing' | 'shared' = listViewType) => {
    if (!currentWorkspace || !currentProject) {
      console.error('❌ No workspace or project available');
      return;
    }

    try {
      console.log('📋 Setting loading to true...');
      setIsLoadingLists(true);
      console.log(`📋 Fetching ${viewType} lists from API...`);

      if (viewType === 'existing') {
        // Fetch both regular lists and qualified lists in parallel (project-scoped)
        const [regularLists, qualifiedLists] = await Promise.all([
          listsApi.getProjectLists(currentWorkspace.id, currentProject.id),
          qualifiedListsApi.getProjectQualifiedLists(currentWorkspace.id, currentProject.id)
        ]);

        console.log('📋 Regular lists received:', regularLists);
        console.log('📋 Qualified lists received:', qualifiedLists);

        // Combine both lists - qualified lists are also CandidateList compatible
        const allLists = [...regularLists, ...qualifiedLists];
        console.log('📋 Total lists:', allLists.length);

        setAvailableLists(allLists);
      } else {
        // Fetch both shared regular lists and shared qualified lists
        const [regularSharedLists, qualifiedSharedLists] = await Promise.all([
          listsApi.getSharedLists(currentWorkspace.id, currentProject.id),
          qualifiedListsApi.getSharedQualifiedLists(currentWorkspace.id, currentProject.id)
        ]);

        const allSharedLists = [...regularSharedLists, ...qualifiedSharedLists];
        console.log('📋 Shared lists received:', allSharedLists.length, '(regular:', regularSharedLists.length, 'qualified:', qualifiedSharedLists.length, ')');
        setAvailableLists(allSharedLists);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
      toast({
        title: "Error Loading Lists",
        description: "Failed to load candidate lists.",
        variant: "destructive"
      });
    } finally {
      console.log('📋 Setting loading to false...');
      setIsLoadingLists(false);
    }
  };

  // Email-only duplicate detection function
  const analyzeDuplicates = async (listIds: string[]) => {
    if (listIds.length === 0) {
      setDuplicateAnalysis(null);
      setShowDuplicateWarning(false);
      return null;
    }

    if (!currentWorkspace || !currentProject) {
      console.error('❌ No workspace or project available for duplicate analysis');
      return null;
    }

    try {
      setIsAnalyzingDuplicates(true);
      const analysis = await duplicateDetectionApi.analyzeCrossListDuplicates(
        listIds,
        currentWorkspace.id,
        currentProject.id
      );
      setDuplicateAnalysis(analysis);

      // Show warning if duplicates detected
      if (analysis.totalDuplicates > 0) {
        setShowDuplicateWarning(true);
      } else {
        setShowDuplicateWarning(false);
      }
      return analysis; // Return the analysis result
    } catch (error) {
      console.error('Error analyzing email duplicates:', error);
      toast({
        title: "Duplicate Analysis Failed",
        description: "Could not analyze email duplicates across selected lists.",
        variant: "destructive"
      });
      throw error; // Re-throw error so modal can handle it
    } finally {
      setIsAnalyzingDuplicates(false);
    }
  };

  const handleListSelection = (listId: string) => {
    const newSelectedListIds = formData.selectedListIds.includes(listId)
      ? formData.selectedListIds.filter(id => id !== listId)
      : [...formData.selectedListIds, listId];

    setFormData(prev => ({
      ...prev,
      selectedListIds: newSelectedListIds
    }));

    // Clear previous duplicate analysis when selection changes
    setDuplicateAnalysis(null);
    setShowDuplicateWarning(false);
    setDuplicateAnalysisCompleted(false);
  };

  const getTotalCandidatesFromLists = () => {
    return formData.selectedListIds.reduce((total, listId) => {
      const list = availableLists.find(l => l.id === listId);
      return total + (list?.totalCandidates || 0);
    }, 0);
  };

  // Smart candidate count that uses unique candidates when duplicate analysis is available
  const getEffectiveCandidateCount = () => {
    // Use stored analysis from formData if available
    if (formData.duplicateAnalysis?.uniqueCandidates) {
      return formData.duplicateAnalysis.uniqueCandidates;
    }

    // Fallback to current duplicateAnalysis state (for modal flow)
    if (duplicateAnalysis?.uniqueCandidates) {
      return duplicateAnalysis.uniqueCandidates;
    }

    // Fallback to raw count if no analysis available
    return getTotalCandidatesFromLists();
  };

  // Check if count is based on duplicate-excluded data
  const isUsingDuplicateExcludedCount = () => {
    // Check stored analysis from formData
    if (formData.duplicateAnalysis?.totalDuplicates > 0) {
      return true;
    }

    // Fallback to current duplicateAnalysis state
    return duplicateAnalysis && duplicateAnalysis.totalDuplicates > 0;
  };

  // Check if duplicate analysis is needed. Considers BOTH the persisted
  // formData.duplicateAnalysis AND the live `duplicateAnalysis` local state
  // — the latter unblocks the Create-Interview CTA even if the modal close
  // path didn't persist the result (e.g. user dismissed the modal early
  // after the success animation already showed "no duplicates").
  const needsDuplicateAnalysis = () => {
    const hasMultipleLists = formData.selectedListIds.length >= 2;
    if (!hasMultipleLists) return false;

    const currentLists = [...formData.selectedListIds].sort();

    const storedAnalysis = formData.duplicateAnalysis;
    if (storedAnalysis) {
      const analyzedLists = [...storedAnalysis.analyzedListIds].sort();
      if (JSON.stringify(currentLists) === JSON.stringify(analyzedLists)) {
        return false;
      }
    }

    // Fallback: live state — if the modal completed in this session against
    // the current list selection, treat the check as done even if formData
    // didn't get the persistence write.
    if (duplicateAnalysis && duplicateAnalysisCompleted) {
      return false;
    }

    return true;
  };

  // Check if selected candidates exceed credit budget
  const isOverCreditBudget = () => {
    if (maxCandidates === null) return false;
    const candidateCount = getEffectiveCandidateCount();
    return candidateCount > maxCandidates;
  };

  // Get the credit shortfall (how many candidates over budget)
  const getCreditShortfall = () => {
    if (maxCandidates === null) return 0;
    const candidateCount = getEffectiveCandidateCount();
    return Math.max(0, candidateCount - maxCandidates);
  };

  // Calculate total credits needed for current candidates
  const getTotalCreditsNeeded = () => {
    const candidateCount = getEffectiveCandidateCount();
    const creditsPerInterview = creditInfo?.creditCosts[parseInt(formData.duration)] || 0;
    return candidateCount * creditsPerInterview;
  };

  // Download sample format function
  const downloadSampleFormat = () => {
    const link = document.createElement('a');
    link.href = '/Sample Template.csv';
    link.download = 'candidate_sample_format.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sample Downloaded",
      description: "Candidate sample format has been downloaded."
    });
  };

  // Determine button text and action for candidates step
  const getCandidatesStepButtonConfig = () => {
    const hasSelectedLists = formData.selectedListIds.length > 0;
    const hasSingleList = formData.selectedListIds.length === 1;
    const hasMultipleLists = formData.selectedListIds.length >= 2;
    const needsAnalysis = needsDuplicateAnalysis();

    // Candidates is the LAST step in the create wizard (2 steps total).
    // The proceed action submits the interview, not "next" — without this
    // the button silently no-ops because stepper.goToNextStep refuses to
    // advance past the last step.
    const isLastStep = stepper.currentStep === steps.length - 1;
    const proceedAction = isLastStep ? "submit" : "next";
    const proceedText = isLastStep
      ? (isEditMode ? "Update interview" : (selectedTemplate ? "Create & start interview" : "Create interview"))
      : "Next";

    if (!hasSelectedLists) {
      return { text: proceedText, action: proceedAction, disabled: true };
    }

    if (hasSingleList) {
      return { text: proceedText, action: proceedAction, disabled: false };
    }

    if (needsAnalysis) {
      return { text: "Check for Duplicates", action: "analyze", disabled: false };
    }

    if (hasMultipleLists && !needsAnalysis) {
      return { text: proceedText, action: proceedAction, disabled: false };
    }

    return { text: proceedText, action: proceedAction, disabled: true };
  };

  // Handle button click for candidates step
  const handleCandidatesStepButtonClick = () => {
    const config = getCandidatesStepButtonConfig();

    if (config.action === "analyze") {
      // Open duplicate analysis modal
      setShowDuplicateModal(true);
    } else if (config.action === "submit") {
      // Last step — actually create / update the interview
      handleSubmit();
    } else if (config.action === "next") {
      // Proceed to next step (only reached if there are >2 wizard steps)
      handleNext();
    }
  };

  // Modal handlers
  const handleModalContinue = () => {
    console.log('🔥 handleModalContinue called');
    console.log('🔥 duplicateAnalysis state:', duplicateAnalysis);

    // Store duplicate analysis in formData if available
    if (duplicateAnalysis) {
      console.log('🔥 Storing analysis in formData:', {
        totalCandidates: duplicateAnalysis.totalCandidates,
        uniqueCandidates: duplicateAnalysis.uniqueCandidates,
        totalDuplicates: duplicateAnalysis.totalDuplicates,
        duplicateRate: duplicateAnalysis.duplicateRate,
        analyzedAt: new Date().toISOString(),
        analyzedListIds: [...formData.selectedListIds]
      });

      setFormData(prev => ({
        ...prev,
        duplicateAnalysis: {
          totalCandidates: duplicateAnalysis.totalCandidates,
          uniqueCandidates: duplicateAnalysis.uniqueCandidates,
          totalDuplicates: duplicateAnalysis.totalDuplicates,
          duplicateRate: duplicateAnalysis.duplicateRate,
          analyzedAt: new Date().toISOString(),
          analyzedListIds: [...formData.selectedListIds]
        }
      }));
    } else {
      console.log('🔥 No duplicateAnalysis found to store');
    }

    setShowDuplicateModal(false);
    setDuplicateAnalysisCompleted(true);
    // Proceed to next step
    handleNext();
  };

  const handleModalCancel = () => {
    setShowDuplicateModal(false);
    // Stay on current step
  };

  const handleModalClose = () => {
    setShowDuplicateModal(false);
    // If analysis ran successfully (even with duplicates), persist the
    // result so the wizard CTA flips from "Check for Duplicates" to
    // "Create interview" instead of staying stuck. Dismissing the modal
    // is an explicit user choice; we treat the check as acknowledged.
    if (duplicateAnalysis) {
      setFormData((prev) => ({
        ...prev,
        duplicateAnalysis: {
          totalCandidates: duplicateAnalysis.totalCandidates,
          uniqueCandidates: duplicateAnalysis.uniqueCandidates,
          totalDuplicates: duplicateAnalysis.totalDuplicates,
          duplicateRate: duplicateAnalysis.duplicateRate,
          analyzedAt: new Date().toISOString(),
          analyzedListIds: [...formData.selectedListIds],
        },
      }));
      setDuplicateAnalysisCompleted(true);
    }
  };

  // Enhanced duplicate analysis function that updates parent state
  const analyzeWithModalState = async (listIds: string[]) => {
    const result = await analyzeDuplicates(listIds);
    // Update parent component state with the results
    setDuplicateAnalysis(result);
    return result;
  };

  const handleCreateList = async () => {
    console.log('🚀 handleCreateList called!', { createListFormData, currentlyCreating: isCreatingList });

    // Prevent multiple simultaneous calls
    if (isCreatingList) {
      console.log('⚠️ Already creating list, ignoring duplicate call');
      return;
    }

    if (!createListFormData.name.trim()) {
      console.log('❌ No list name provided');
      toast({
        title: "Name Required",
        description: "Please enter a list name.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Starting list creation...');

    // Set up a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ List creation timeout reached, force resetting state');
      setIsCreatingList(false);
      setShowCreateListForm(false);
      toast({
        title: "Request Timeout",
        description: "List creation took too long. Please try again.",
        variant: "destructive"
      });
    }, 60000); // 60 second timeout

    if (!currentWorkspace || !currentProject) {
      console.error('❌ No workspace or project available');
      toast({
        title: "Error",
        description: "No workspace or project selected",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingList(true);
      console.log('🔄 Set isCreatingList to true');

      // Create the list (project-scoped)
      console.log('📝 Creating list with data:', { name: createListFormData.name, description: createListFormData.description });
      const listId = await listsApi.createList(currentProject.id, {
        name: createListFormData.name,
        description: createListFormData.description
      });
      console.log('✅ List created with ID:', listId);

      // Add sources if any
      if (createListFormData.sources.length > 0) {
        console.log('📎 Adding sources to list:', createListFormData.sources);
        for (const source of createListFormData.sources) {
          const apiPayload = {
            type: source.type,
            metadata: source.metadata || {},
            name: source.name
            // Removed candidateCount to match Lists.tsx exactly
          };
          console.log('🔍 Debug - API payload for source:', apiPayload);
          console.log('🔍 Debug - metadata structure:', JSON.stringify(apiPayload.metadata, null, 2));
          await listsApi.addSourceToList(currentWorkspace.id, listId, apiPayload);
        }
        console.log('✅ All sources added successfully');

        // Check for email duplicates within the new list if it has multiple sources
        if (createListFormData.sources.length > 1) {
          try {
            console.log('🔍 Checking for email duplicates within new list...');
            const analysis = await duplicateDetectionApi.analyzeSingleListDuplicates(listId);
            if (analysis.totalDuplicates > 0) {
              toast({
                title: "Email Duplicates Detected",
                description: `Found ${analysis.totalDuplicates} email duplicates in "${createListFormData.name}". Consider reviewing the sources.`,
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error checking email duplicates in new list:', error);
          }
        }
      }

      // Reload lists to get updated data
      console.log('🔄 Reloading available lists...');
      await loadAvailableLists();

      // Auto-select the new list
      setFormData(prev => ({
        ...prev,
        selectedListIds: [...prev.selectedListIds, listId]
      }));

      // Capture values before resetting form (to avoid async state issues)
      const listName = createListFormData.name;
      const sourcesCount = createListFormData.sources.length;

      // Reset form and close it
      setCreateListFormData({ name: '', description: '', sources: [] });
      setShowCreateListForm(false);

      // Force a re-render by ensuring state is truly cleared
      setTimeout(() => {
        setCreateListFormData({ name: '', description: '', sources: [] });
        console.log('🔄 Force cleared form data after successful creation');
      }, 100);

      const sourcesText = sourcesCount > 0
        ? ` with ${sourcesCount} source${sourcesCount !== 1 ? 's' : ''}`
        : '';

      console.log('🎉 List creation completed successfully');
      toast({
        title: "List Created",
        description: `"${listName}" has been created${sourcesText} and selected.`
      });
    } catch (error) {
      console.error('❌ Error creating list:', error);
      toast({
        title: "Error Creating List",
        description: error instanceof Error ? error.message : "Failed to create list. Please try again.",
        variant: "destructive"
      });
    } finally {
      console.log('🔄 Finally block: clearing timeout and resetting isCreatingList to false');
      clearTimeout(timeoutId);
      setIsCreatingList(false);

      // Extra safety: ensure state is reset after a small delay
      setTimeout(() => {
        setIsCreatingList(false);
        console.log('🛡️ Safety reset: ensured isCreatingList is false');
      }, 100);
    }
  };

  // Handle source changes for SourceManager component
  const handleSourcesChange = (newSources) => {
    setCreateListFormData(prev => ({
      ...prev,
      sources: newSources
    }));
  };

  // Handle source addition to create list form (kept for compatibility)
  const handleSourceAddedToList = (sourceData) => {
    setCreateListFormData(prev => ({
      ...prev,
      sources: [...prev.sources, {
        id: `source_${Date.now()}`, // Generate unique ID like Lists.tsx
        type: sourceData.type,
        name: sourceData.name,
        candidateCount: sourceData.candidateCount,
        status: 'validated' as const, // Add status field
        metadata: sourceData.metadata || {}
      }]
    }));

    setShowSourceConfigModal(false);
    setSelectedSourceType(null);

    toast({
      title: "Source Added",
      description: `${sourceData.name} has been added to the list.`
    });
  };

  // Load lists when workspace and project are available
  useEffect(() => {
    if (currentWorkspace && currentProject) {
      console.log('🔄 Workspace and project ready, loading lists...');
      loadAvailableLists();
    }
  }, [currentWorkspace, currentProject]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('createInterviewForm', JSON.stringify({
      ...formData,
      candidateUpload: {
        ...formData.candidateUpload,
        uploadedFile: null // Don't persist file objects
      }
    }));
  }, [formData]);

  // Stop audio when voice settings change
  useEffect(() => {
    if (isPlayingAudio) {
      stopAudioPreview();
    }
  }, [formData.voiceAccent, formData.voiceSpeed]);

  // Cleanup when leaving the component/page
  useEffect(() => {
    return () => {
      // Clear form data from localStorage
      localStorage.removeItem('createInterviewForm');
      
      // Stop any playing audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      
      console.log('CreateInterview component unmounted - state cleared');
    };
  }, [audioRef]);

  // Stepper configuration
  // Streamlined wizard — Voice + Communications now use smart defaults; recruiters
  // can fine-tune them later via Edit Interview. This collapses the create flow
  // from 4 steps to 2.
  const steps: Step[] = [
    {
      id: "basic",
      title: "Basic Details",
      description: "Interview information"
    },
    {
      id: "candidates",
      title: "Candidates",
      description: "Upload candidate data"
    }
  ];

  const validateStep = (stepIndex: number, data: any) => {
    switch (stepIndex) {
      case 0: // Basic Details
        const requiredFields = [];
        if (!data.title?.trim()) requiredFields.push('Interview Title');
        if (!data.type?.trim()) requiredFields.push('Interview Type');
        // Skill analysis is profile-driven — no role description required.
        if (data.type !== 'skill_analysis' && !data.description?.trim()) requiredFields.push('Description');
        if (!data.duration || (typeof data.duration === 'string' && !data.duration.trim()) || (typeof data.duration === 'number' && data.duration <= 0)) requiredFields.push('Duration');
        
        if (requiredFields.length > 0) {
          return {
            isValid: false,
            errors: [`Please fill in: ${requiredFields.join(', ')}`]
          };
        }
        return { isValid: true, errors: [] };
      case 1: // Candidates (Lists)
        // Check if at least one list has been selected
        if (!data.selectedListIds || data.selectedListIds.length === 0) {
          return {
            isValid: false,
            errors: ['Please select at least one candidate list']
          };
        }

        return { isValid: true, errors: [] };
      default:
        return { isValid: true, errors: [] };
    }
  };

  const stepper = useStepper({
    totalSteps: steps.length,
    initialStep: getInitialStep(),
    validateStep
  });

  // Show blueprint guide modal when entering step 0 (only in create mode, once per page visit)
  useEffect(() => {
    if (!isEditMode && !showTypeSelection && stepper.currentStep === 0 && !hasClosedBlueprintGuide) {
      setShowBlueprintGuideModal(true);
    }
  }, [isEditMode, showTypeSelection, stepper.currentStep, hasClosedBlueprintGuide]);

  // AI auto-fill: when the recruiter pauses typing the title (≥4 chars) on Step 1
  // in create mode, fetch suggested description / type / duration / voice settings.
  // Only overwrites fields the recruiter hasn't already filled — never clobbers
  // user input. Re-runs only when the title changes substantively.
  useEffect(() => {
    if (isEditMode || showTypeSelection || stepper.currentStep !== 0) return;
    const trimmed = formData.title?.trim() ?? '';
    if (trimmed.length < 4) return;
    if (trimmed === lastSuggestedTitle) return;

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const s: InterviewSuggestion = await suggestFromTitle(trimmed, controller.signal);
        setLastSuggestedTitle(trimmed);
        setFormData((prev) => ({
          ...prev,
          // Only fill blank fields; never overwrite recruiter input.
          description: prev.description?.trim() ? prev.description : s.description,
          type: prev.type || s.type,
          duration: prev.duration || s.duration_minutes,
          voiceType: prev.voiceType || s.voice_type,
          voiceAccent: prev.voiceAccent || s.voice_accent,
          voiceSpeed: prev.voiceSpeed || s.voice_speed,
        }));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('[suggestFromTitle] failed:', err);
        }
      } finally {
        setIsSuggesting(false);
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [formData.title, isEditMode, showTypeSelection, stepper.currentStep, lastSuggestedTitle]);

  const handleNext = () => {
    const success = stepper.goToNextStep(formData);
    if (!success && stepper.stepValidations[stepper.currentStep]) {
      const validation = stepper.stepValidations[stepper.currentStep];
      toast({
        title: "Validation Error",
        description: validation.errors[0] || "Please check your inputs.",
        variant: "destructive"
      });
      return;
    }
    if (success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Real-time validation for current step
  const getCurrentStepValidation = () => {
    return validateStep(stepper.currentStep, formData);
  };

  const isCurrentStepValid = getCurrentStepValidation().isValid;


  const handlePrevious = () => {
    stepper.goToPrevStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Blueprint generation function (fire-and-forget with status tracking in backend)
  const triggerBlueprintGeneration = async (interviewId: string, title: string, description: string, notes?: string) => {
    try {
      if (!currentWorkspace || !currentProject) {
        console.error('No workspace or project available for blueprint generation');
        return false;
      }

      console.log('🔧 Blueprint Generation Started:', {
        workspaceId: currentWorkspace.id,
        projectId: currentProject.id,
        interviewId,
        title: title.substring(0, 50)
      });

      await interviewApi.generateBlueprint(currentWorkspace.id, currentProject.id, {
        id: interviewId,
        title,
        description,
        notes,
      });

      console.log('Blueprint generation triggered successfully for interview:', interviewId);
      return true;
    } catch (error) {
      console.error('Blueprint generation error:', error);
      return false;
    }
  };

  // Check if critical blueprint fields have changed in edit mode
  const hasBlueprintFieldsChanged = (): boolean => {
    if (!isEditMode || !originalInterviewData) {
      return false; // Not in edit mode or no original data
    }

    const currentData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      duration: formData.duration
    };

    const hasChanged = (
      currentData.title !== originalInterviewData.title ||
      currentData.description !== originalInterviewData.description ||
      currentData.type !== originalInterviewData.type ||
      currentData.duration !== originalInterviewData.duration
    );

    console.log('🔍 Blueprint fields change detection:', {
      hasChanged,
      original: originalInterviewData,
      current: currentData
    });

    return hasChanged;
  };

  const handleSubmit = async () => {
    const validation = validateStep(0, formData);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0] || "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Initialize dynamic progress steps based on selected lists count and template selection
    const selectedListsCount = formData.selectedListIds.length;
    const usingTemplate = !!selectedTemplate;
    const steps = initializeProgressSteps(selectedListsCount, usingTemplate);
    
    // Open progress modal and reset states
    setProgressModalOpen(true);
    setIsSubmitting(true);
    setCurrentProgressStep(1);
    setOverallProgress(0);
    setWasInterviewStarted(false); // Reset for new submission
    
    // Step 1: Validation
    updateProgressStep(1, 'active');
    await new Promise(resolve => setTimeout(resolve, 800));
    updateProgressStep(1, 'completed', 'All interview details validated successfully');
    
    setCurrentProgressStep(2);

    // Console log all collected data from 4 steps
    console.log("=== INTERVIEW CREATION DATA ===");
    console.log("Step 1 - Basic Details:", {
      title: formData.title,
      type: formData.type,
      description: formData.description,
      duration: formData.duration
    });
    // Get selected lists data for API
    const selectedLists = formData.selectedListIds.map(listId => {
      const list = availableLists.find(l => l.id === listId);
      return {
        listId: listId,
        name: list?.name || 'Unknown List',
        totalCandidates: list?.totalCandidates || 0
      };
    });

    console.log("Step 2 - Selected Lists:", {
      totalLists: formData.selectedListIds.length,
      totalCandidates: getEffectiveCandidateCount(),
      lists: selectedLists
    });
    console.log("Step 3 - Voice Settings:", {
      voiceType: formData.voiceType,
      voiceSpeed: formData.voiceSpeed,
      voiceAccent: formData.voiceAccent
    });
    console.log("Step 4 - Communications:", {
      email: formData.communications.email,
      phone: formData.communications.phone,
      sms: formData.communications.sms
    });

    // Clean API payload (exactly what you'll send)
    const apiPayload = {
      title: formData.title,
      type: formData.type,
      description: formData.description,
      duration: formData.duration,
      voiceType: formData.voiceType,
      voiceSpeed: formData.voiceSpeed,
      voiceAccent: formData.voiceAccent,
      communications: {
        email: formData.communications.email,
        phone: formData.communications.phone,
        sms: formData.communications.sms
      },
      selectedListIds: formData.selectedListIds, // Selected candidate lists
      duplicateAnalysis: formData.duplicateAnalysis, // Store duplicate analysis results
      // Phase B: finance sub-domain taxonomy (both fields optional today)
      ...(formData.financeDomain && { financeDomain: formData.financeDomain }),
      ...(formData.subDomain && { subDomain: formData.subDomain }),
      // Template ID if using an existing template
      ...(selectedTemplate && { templateId: selectedTemplate.id })
    };

    console.log("CLEAN API PAYLOAD (Ready to send):", apiPayload);
    console.log("===============================");

    // Step 2: Creating Interview
    updateProgressStep(2, 'active');
    try {
      if (!currentWorkspace || !currentProject) {
        throw new Error('No workspace or project selected');
      }

      console.log("🚀 Creating interview in workspace:", currentWorkspace.id, "project:", currentProject.id);

      // Use the interviewApi service for project-scoped creation
      const result = isEditMode
        ? await interviewApi.updateInterview(currentWorkspace.id, currentProject.id, editId!, apiPayload)
        : await interviewApi.createInterview(currentWorkspace.id, currentProject.id, apiPayload);

      const interviewId = (result as any).interviewId || result.id || editId;

      if (!isEditMode && interviewId) {
        track(Events.interview.created, {
          interview_id: interviewId,
          type: formData.type || "screening",
          duration_min: Number(formData.duration) || 0,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 600)); // Brief delay for UX

      console.log(`Interview ${isEditMode ? 'updated' : 'created'} successfully:`, result);

      updateProgressStep(2, 'completed', `Interview ${isEditMode ? 'updated' : 'created'} successfully`);
      setCurrentProgressStep(3);

      // Step 3: Processing Selected Lists
      updateProgressStep(3, 'active');

        // Lists are already processed via the API payload, no separate API calls needed
        console.log(`✅ Selected lists (${formData.selectedListIds.length}) processed with interview`);
        updateProgressStep(3, 'completed', `${formData.selectedListIds.length} lists linked successfully`);

        // Step 4: Blueprint or Start Interview (conditional based on template)
        const step4Id = 4;
        const usingTemplate = !!selectedTemplate;

        if (usingTemplate && !isEditMode) {
          // EXISTING BLUEPRINT FLOW: Start the interview immediately
          updateProgressStep(step4Id, 'active', 'Starting Interview...');
          setCurrentProgressStep(step4Id);

          try {
            const token = localStorage.getItem('auth_token');
            const startResponse = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/${interviewId}/start`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            const startData = await startResponse.json();

            if (startResponse.ok && startData.success) {
              updateProgressStep(step4Id, 'completed', 'Interview started successfully!');
              setWasInterviewStarted(true); // Mark interview as started for modal title
            } else {
              // Even if start fails, continue - user can start from details page
              console.error('Failed to auto-start interview:', startData.error);
              updateProgressStep(step4Id, 'completed', 'Interview created (manual start required)');
            }
          } catch (startError) {
            console.error('Error auto-starting interview:', startError);
            updateProgressStep(step4Id, 'completed', 'Interview created (manual start required)');
          }

          await new Promise(resolve => setTimeout(resolve, 600));

          // Show success message briefly before closing modal
          await new Promise(resolve => setTimeout(resolve, 1000));
          setProgressModalOpen(false);

          // Clear saved form data on successful submission
          localStorage.removeItem('createInterviewForm');

          toast({
            title: 'Interview is LIVE!',
            description: `"${formData.title}" is now active and ready for candidates.`,
          });

          // P1 U7: clear the stale localStorage form data so a future
          // "Create New Interview" click starts from a clean slate
          // (don't re-fill the user's title/JD from a 2-week-old draft).
          try { localStorage.removeItem('createInterviewForm'); } catch {}

          // Navigate to interview details page
          setTimeout(() => {
            navigate(`/interviews/${interviewId}`);
          }, 1500);
          return; // Exit early

        } else {
          // NEW BLUEPRINT FLOW: Trigger blueprint generation
          updateProgressStep(step4Id, 'active', 'Checking Blueprint Status...');
          setCurrentProgressStep(step4Id);

          const shouldRegenerateBlueprint = !usingTemplate && (!isEditMode || (isEditMode && hasBlueprintFieldsChanged()));

          if (usingTemplate) {
            // Using template - blueprint will be copied by backend
            updateProgressStep(step4Id, 'completed', 'Using blueprint from template');
          } else if (shouldRegenerateBlueprint) {
            // Trigger blueprint generation asynchronously (fire-and-forget)
            const actionType = isEditMode ? 'regenerating' : 'generating';
            updateProgressStep(step4Id, 'active', `Triggering blueprint ${actionType}...`);

            // Fire-and-forget: Don't await, let it run in background
            triggerBlueprintGeneration(
              interviewId,
              formData.title,
              formData.description,
              formData.blueprintNotes
            ).then((success) => {
              console.log(`Blueprint ${actionType} ${success ? 'triggered successfully' : 'queued for retry'}`);
            }).catch((error) => {
              console.error(`Blueprint ${actionType} error:`, error);
            });

            // Immediately mark as completed - blueprint will generate in background
            const successMsg = isEditMode
              ? 'Blueprint regeneration started in background'
              : 'Blueprint generation started in background';
            updateProgressStep(step4Id, 'completed', successMsg);
          } else {
            // For edit mode with no critical changes, skip blueprint generation
            updateProgressStep(step4Id, 'completed', 'Blueprint unchanged - no regeneration needed');
          }

          await new Promise(resolve => setTimeout(resolve, 600));

          // Final step: Finalization
          const finalStepId = 5;
          updateProgressStep(finalStepId, 'active', 'Finishing up...');
          setCurrentProgressStep(finalStepId);

          await new Promise(resolve => setTimeout(resolve, 800));
          updateProgressStep(finalStepId, 'completed', 'Interview setup completed successfully!');

          // Show success message briefly before closing modal
          await new Promise(resolve => setTimeout(resolve, 1000));
          setProgressModalOpen(false);

          // Clear saved form data on successful submission
          localStorage.removeItem('createInterviewForm');

          // Update last saved timestamp for edit mode
          if (isEditMode) {
            setLastSavedAt(new Date());
          }

          toast({
            title: `Interview ${isEditMode ? 'Updated' : 'Created'} Successfully!`,
            description: `"${formData.title}" has been ${isEditMode ? 'updated' : 'created'}${!isEditMode ? '. Blueprint generation started and will be ready shortly.' : ''}`,
          });

          // P1 U7: clear stale draft on successful create (not on edit —
          // edit always loads from backend so localStorage isn't reused).
          if (!isEditMode) {
            try { localStorage.removeItem('createInterviewForm'); } catch {}
          }

          // Navigate to interview details page (both edit and create modes)
          setTimeout(() => {
            navigate(`/interviews/${interviewId}`);
          }, 1500);

          if (isEditMode) {
            return; // Exit early for edit mode to prevent form reset
          }
        }

        // Clear all form states and reset to initial state
        setTimeout(() => {
          // Reset form data to initial state
          setFormData(getInitialFormData());

          // Reset stepper to first step
          stepper.goToStep(0);

          // Clear audio states
          if (audioRef) {
            audioRef.pause();
            setAudioRef(null);
          }
          setIsPlayingAudio(false);

          // Clear modal states
          setIsDescriptionModalOpen(false);
        }, 2000); // Wait 2 seconds to let user see the success message
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} interview:`, error);

      // Phase A.4: detect the admission-gate rejection (HTTP 400 with
      // structured detail). Render a dedicated modal instead of a
      // generic destructive toast — the recruiter needs to understand
      // it's a scope issue, not a transient failure to retry.
      const errAny = error as Error & {
        code?: string;
        detail?: { non_finance_signals?: string[]; finance_signals?: string[]; message?: string };
      };
      if (errAny?.code === 'out_of_scope') {
        setProgressModalOpen(false);
        setOutOfScopeDetail({
          message: errAny.detail?.message || errAny.message || 'This platform is for India finance hiring only.',
          nonFinanceSignals: errAny.detail?.non_finance_signals || [],
          financeSignals: errAny.detail?.finance_signals || [],
        });
        return; // skip the generic toast; the modal will surface the explanation
      }

      // Update current step to show error
      if (progressSteps.length > 0) {
        const currentStep = progressSteps.find(step => step.status === 'active');
        if (currentStep) {
          updateProgressStep(currentStep.id, 'error', `Error: ${error.message || 'Something went wrong'}`);
        }

        // Show error state briefly before closing
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setProgressModalOpen(false);
      // P-Plans F2: surface credit/plan denials with specific copy
      // (createInterview itself doesn't charge today — invite-candidates
      // does — but if the policy changes, this is ready).
      if (toastPlanError(toast, error)) {
        // W-FE-P1: plan/credit denial — backend's `remaining` is the source
        // of truth; refresh so the Header badge + downstream checks update.
        void refreshCredits();
      } else {
        toast({
          title: `Failed to ${isEditMode ? 'Update' : 'Create'} Interview`,
          description: error.message || "Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // First, update form data with the file
        setFormData(prev => ({
          ...prev,
          candidateUpload: {
            ...prev.candidateUpload,
            uploadedFile: file
          }
        }));

        // Show initial upload toast
        toast({
          title: "Uploading File",
          description: `${file.name} is being uploaded...`,
        });

        // Create form data for upload
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', 'candidate_upload');

        // Upload to backend
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/upload-file`, {
          method: 'POST',
          body: uploadFormData
        });

        if (response.ok) {
          const result = await response.json();
          
          // Debug: Log the full response to see what we're getting
          console.log("=== FILE UPLOAD RESPONSE ===");
          console.log("Full response:", result);
          console.log("upload_info:", result.upload_info);
          console.log("Checking paths:");
          console.log("- upload_info.gcs_path:", result.upload_info?.gcs_path);
          console.log("- upload_info.file_path:", result.upload_info?.file_path);
          console.log("- file_path:", result.file_path);
          console.log("- upload_info.gcs_url:", result.upload_info?.gcs_url);
          console.log("- upload_info.bucket_path:", result.upload_info?.bucket_path);
          console.log("===============================");
          
          // Update form data with GCP path - with extensive logging
          const gcpPath = result.upload_info?.gcs_url || 
                         result.upload_info?.gcs_path || 
                         result.upload_info?.file_path || 
                         result.upload_info?.bucket_path ||
                         result.file_path || 
                         'Unknown';
          
          console.log("📁 File upload complete - storing GCP path:", gcpPath);
          
          // Capture totalRows from the response
          const totalRows = result.file_info?.total_rows || result.total_rows || 0;
          
          setFormData(prev => ({
            ...prev,
            candidateUpload: {
              ...prev.candidateUpload,
              gcpFilePath: gcpPath,
              totalRows: totalRows
            }
          }));

          toast({
            title: "File Uploaded Successfully",
            description: `${file.name} has been uploaded to cloud storage.`,
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('File upload error:', error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    }
  };

  const downloadSampleTemplate = () => {
    try {
      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = '/Sample Template.csv';
      link.download = 'Sample Template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Sample candidate template is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the template file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSheetValidation = (isValid: boolean, data?: any, mapping?: any) => {
    // Capture totalRows from the sheet validation data
    const totalRows = data?.totalRows || 0;
    
    setFormData(prev => ({
      ...prev,
      candidateUpload: {
        ...prev.candidateUpload,
        totalRows: totalRows,
        sheetValidation: {
          isValid,
          data,
          mapping
        }
      }
    }));
  };

  const handleFileValidation = (isValid: boolean, data?: any, mapping?: any) => {
    setFormData(prev => ({
      ...prev,
      candidateUpload: {
        ...prev.candidateUpload,
        fileValidation: {
          isValid,
          data,
          mapping
        }
      }
    }));
  };

  // Loading state for edit mode — show form skeleton matching the layout
  // the user is about to see, with a contextual status line.
  if (isLoadingInterview) {
    return (
      <div className="container mx-auto py-6 space-y-6" role="status" aria-busy="true">
        <SpinnerWithCopy label="Loading interview…" />
        <div className="rounded-lg border border-border p-6">
          <ShimmerInterviewConfig />
        </div>
      </div>
    );
  }

  // Note: Add candidates mode is now handled by step=1 parameter

  // Type Selection Screen - shown before the main form in create mode
  if (showTypeSelection) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Create interview
          </h1>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            Choose the type of interview you want to create
          </p>
        </div>

        <div className="flex gap-8">
          {/* Screening Card */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, type: 'screening' }));
              setShowTypeSelection(false);
              setSearchParams((prev) => {
                prev.set('type', 'screening');
                return prev;
              }, { replace: true });
            }}
            className="group relative w-96 p-12 rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'hsl(var(--paper))',
              border: '1px solid hsl(var(--rule))',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: 'hsl(var(--ink))',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(255,255,255,0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Screening
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Quick initial assessment to filter candidates at scale
              </p>
            </div>
          </button>

          {/* Deep role fit Card (internal template_type = 'fitment') */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, type: 'fitment' }));
              setShowTypeSelection(false);
              setSearchParams((prev) => {
                prev.set('type', 'fitment');
                return prev;
              }, { replace: true });
            }}
            className="group relative w-96 p-12 rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'hsl(var(--paper))',
              border: '1px solid hsl(var(--rule))',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: 'hsl(var(--ink))',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(255,255,255,0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Deep role fit
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                In-depth role-specific evaluation with detailed analysis
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header & Stepper Section */}
      <div className="shrink-0 bg-background px-4 pt-10 pb-2">
        {/* Stepper */}
        <div className="flex justify-center">
          <div className="w-full max-w-5xl px-4">
            <Stepper
              steps={steps.map((step, index) => ({
                ...step,
                hasError: stepper.stepValidations[index]?.isValid === false
              }))}
              currentStep={stepper.currentStep}
              onStepClick={stepper.goToStep}
              allowClickNavigation={true}
              className="scale-90 origin-top"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Step Content */}
      <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4">
        <div className="max-w-6xl mx-auto">
        {stepper.currentStep === 0 && (
          <div key="step-0" className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <Card
            className="border-0"
            style={{
              borderRadius: '0.5em',
              position: 'relative',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={aiAvatar} alt="AI" className="w-12 h-12 rounded-full" />
                  <div>
                    <CardTitle className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                      Interview Details
                    </CardTitle>
                    <CardDescription className="text-xs text-muted mt-1">
                      Configure the basic information about your interview
                    </CardDescription>
                  </div>
                </div>
                {isEditMode ? (
                  <EditModeIndicator lastSavedAt={lastSavedAt} />
                ) : creditInfo ? (
                  <p className="text-[11px] font-mono tabular-nums text-muted">
                    <span className="text-ink">{creditInfo.creditCosts[parseInt(formData.duration)] || 0}</span> credits per interview
                    <span className="mx-2 text-rule">·</span>
                    <span className="text-gold-ink">{creditInfo.available}</span> available
                    <span className="mx-2 text-rule">·</span>
                    <span className="text-ink-soft">{maxCandidates ?? 0}</span> max applicants
                  </p>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Blueprint Mode Toggle — only when templates exist. Pilot users
                  with no saved blueprints get a quieter Step 1 by default. */}
              {!isEditMode && (availableTemplates.length > 0 || isLoadingTemplates) && (
                <div className="space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Start From</Label>
                      <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={blueprintMode === 'new' ? 'default' : 'outline-solid'}
                        className={`h-9 text-xs font-medium px-4 rounded  transition-all duration-200 ${
                          blueprintMode === 'new' ? 'text-paper' : 'hover:text-paper'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: blueprintMode === 'new' ? 'hsl(var(--ink))' : 'transparent',
                          boxShadow: 'var(--shadow-1)'
                        }}
                        onMouseEnter={(e) => {
                          if (blueprintMode !== 'new') e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))';
                        }}
                        onMouseLeave={(e) => {
                          if (blueprintMode !== 'new') e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => {
                          setBlueprintMode('new');
                          setSelectedTemplate(null);
                        }}
                      >
                        <Plus size={14} className="mr-1" />
                        Create New
                      </Button>
                      <Button
                        type="button"
                        variant={blueprintMode === 'template' ? 'default' : 'outline-solid'}
                        className={`h-9 text-xs font-medium px-4 rounded  transition-all duration-200 ${
                          blueprintMode === 'template' ? 'text-paper' : 'hover:text-paper'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: blueprintMode === 'template' ? 'hsl(var(--ink))' : 'transparent',
                          boxShadow: 'var(--shadow-1)'
                        }}
                        onMouseEnter={(e) => {
                          if (blueprintMode !== 'template') e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))';
                        }}
                        onMouseLeave={(e) => {
                          if (blueprintMode !== 'template') e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => setBlueprintMode('template')}
                        disabled={availableTemplates.length === 0 && !isLoadingTemplates}
                      >
                        <AddressBook size={14} className="mr-1" />
                        Use Blueprint {availableTemplates.length > 0 && `(${availableTemplates.length})`}
                      </Button>
                      </div>
                    </div>
                  </div>

                  {/* Template Selection List */}
                  {blueprintMode === 'template' && (
                    <div className="space-y-3">
                      {isLoadingTemplates ? (
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <CircleNotch size={16} className="animate-spin" />
                          Loading blueprints...
                        </div>
                      ) : availableTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {availableTemplates.map((template) => (
                            <div
                              key={template.id}
                              onClick={() => handleTemplateSelect(template)}
                              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedTemplate?.id === template.id
                                  ? 'ring-2 ring-[hsl(var(--ink))] bg-paper-2'
                                  : 'hover:bg-paper-2'
                              }`}
                              style={{
                                boxShadow: selectedTemplate?.id === template.id
                                  ? 'var(--shadow-2)'
                                  : 'var(--shadow-1)'
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-ink line-clamp-1">
                                  {template.title}
                                </h4>
                                {selectedTemplate?.id === template.id && (
                                  <CheckCircle size={16} className="text-success shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {template.type}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {template.duration} min
                                </Badge>
                                {template.scope === 'global' ? (
                                  <Badge className="text-[10px] bg-info-soft text-info border-rule">
                                    Global
                                  </Badge>
                                ) : (
                                  <Badge className="text-[10px] bg-success-soft text-success border-rule">
                                    Project
                                  </Badge>
                                )}
                              </div>
                              {template.topics && (
                                <p className="text-xs text-muted line-clamp-2">
                                  {template.topics}
                                </p>
                              )}
                              {template.usageCount > 0 && (
                                <p className="text-[10px] text-muted-2 mt-2">
                                  Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted py-4 text-center">
                          No blueprints available for this project.
                        </div>
                      )}

                    </div>
                  )}

                  <Separator />
                </div>
              )}

              {/* JD intake — screening + fitment only, create mode only.
                  Recruiter chooses between "design the role" (existing flow)
                  and "I have a JD" (paste/upload → backend extract → seed
                  title/description/domain). Skill analysis is profile-driven
                  and skips this entirely. */}
              {!isEditMode && formData.type !== 'skill_analysis' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                      Start with
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={jdMode === 'design' ? 'default' : 'outline-solid'}
                        className={`h-8 text-xs font-medium px-3 rounded ${
                          jdMode === 'design' ? 'text-paper' : 'hover:text-paper'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: jdMode === 'design' ? 'hsl(var(--ink))' : 'transparent',
                          boxShadow: 'var(--shadow-1)',
                        }}
                        onClick={() => {
                          setJdMode('design');
                          setJdError(null);
                        }}
                      >
                        Design with AI
                      </Button>
                      <Button
                        type="button"
                        variant={jdMode === 'jd' ? 'default' : 'outline-solid'}
                        className={`h-8 text-xs font-medium px-3 rounded ${
                          jdMode === 'jd' ? 'text-paper' : 'hover:text-paper'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: jdMode === 'jd' ? 'hsl(var(--ink))' : 'transparent',
                          boxShadow: 'var(--shadow-1)',
                        }}
                        onClick={() => setJdMode('jd')}
                      >
                        I have a JD
                      </Button>
                    </div>
                  </div>

                  {jdMode === 'jd' && (
                    <div
                      className="p-4 rounded-sm bg-paper-2 space-y-3"
                      style={{ boxShadow: 'var(--shadow-1)' }}
                    >
                      <Textarea
                        placeholder="Paste the job description here (or upload a PDF/DOCX below)…"
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="min-h-[140px] resize-none rounded border-none bg-paper"
                        style={{ boxShadow: 'var(--shadow-1)' }}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!jdText.trim()) {
                              setJdError("Paste a job description first, or upload a file.");
                              return;
                            }
                            setJdLoading(true);
                            setJdError(null);
                            try {
                              const result = await extractFromJDText(jdText);
                              applyJdExtraction(result);
                            } catch (err: any) {
                              setJdError(err?.message || "Could not read this JD. Try again or paste it instead.");
                            } finally {
                              setJdLoading(false);
                            }
                          }}
                          disabled={jdLoading || !jdText.trim()}
                          className="h-9 text-xs font-medium px-4 rounded text-paper"
                          style={{
                            border: 'none',
                            backgroundColor: 'hsl(var(--ink))',
                            boxShadow: 'var(--shadow-1)',
                          }}
                        >
                          {jdLoading ? (
                            <><CircleNotch className="w-3.5 h-3.5 mr-2 animate-spin" />Reading…</>
                          ) : (
                            <>Use this JD</>
                          )}
                        </Button>
                        <Label
                          htmlFor="jdFileUpload"
                          className="inline-flex items-center gap-2 px-3 h-9 text-xs font-medium rounded cursor-pointer hover:bg-paper-3"
                          style={{ boxShadow: 'var(--shadow-1)' }}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload PDF / DOCX
                        </Label>
                        <input
                          id="jdFileUpload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          disabled={jdLoading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setJdLoading(true);
                            setJdError(null);
                            try {
                              const result = await extractFromJDFile(file);
                              applyJdExtraction(result);
                            } catch (err: any) {
                              setJdError(err?.message || "Could not read this file. Try pasting the text instead.");
                            } finally {
                              setJdLoading(false);
                              // Reset so re-selecting the same file fires onChange again
                              e.target.value = '';
                            }
                          }}
                        />
                        <p className="text-[11px] text-muted">
                          We read the JD and pre-fill title, domain, and description. You can edit anything before continuing.
                        </p>
                      </div>
                      {jdError && (
                        <p className="text-xs text-danger" role="alert">{jdError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Top row: Title, Interview Type, and Duration */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Title */}
                <div className="lg:col-span-2">
                  {/* R11.2b: was ALL CAPS via `uppercase` class. Switched to
                      sentence case per CLAUDE.md form-label rule. */}
                  <Label htmlFor="title" className="text-sm flex items-center gap-2">
                    Interview title <span className="text-danger">*</span>
                    {formData.type !== 'skill_analysis' && (
                      <button
                        type="button"
                        onClick={() => setShowRoleCurator(true)}
                        className="ml-auto text-[10px] font-mono normal-case text-gold-ink hover:underline inline-flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Help me design this role
                      </button>
                    )}
                    {isSuggesting && (
                      <span className="text-[10px] font-mono normal-case text-info inline-flex items-center gap-1">
                        <CircleNotch className="w-3 h-3 animate-spin" /> Suggesting defaults…
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                              Only fills empty fields. Your edits stay.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    )}
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior Tax Manager · Financial Controller · FP&A Lead"
                    value={formData.title}
                    onChange={(e) => {
                      clearBlueprintOnEdit();
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                    }}
                    onBlur={() => {
                      if ((formData.title?.trim().length ?? 0) >= 4) bumpPreview();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if ((formData.title?.trim().length ?? 0) >= 4) bumpPreview();
                      }
                    }}
                    className="mt-2 rounded border-none transition-all duration-300 bg-paper"
                    style={{
                      boxShadow: 'var(--shadow-1)'
                    }}
                  />
                </div>

                {/* Interview Type */}
                <div className="lg:col-span-2">
                  <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Interview Type <span className="text-danger">*</span></Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[
                      { value: "screening", label: "Screening" },
                      { value: "fitment", label: "Deep role fit" },
                      { value: "skill_analysis", label: "Skill analysis" }
                    ].map((type) => {
                      const isSelected = formData.type === type.value;
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={isSelected ? "default" : "outline-solid"}
                          className={`h-10 text-xs font-medium px-3.5 rounded transition-all duration-200 ${
                            isSelected
                              ? 'text-paper'
                              : 'hover:text-paper'
                          }`}
                          style={{
                            border: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: isSelected ? 'hsl(var(--ink))' : 'transparent',
                            boxShadow: 'var(--shadow-1)'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onClick={() => {
                            clearBlueprintOnEdit();
                            setFormData(prev => ({
                              ...prev,
                              type: type.value,
                              // Auto-select recommended duration: 20min for fitment, 10min for screening
                              duration: type.value === 'fitment' ? '20' : '10'
                            }));
                            setSearchParams((prev) => {
                              prev.set('type', type.value);
                              return prev;
                            }, { replace: true });
                          }}
                        >
                          {type.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration */}
                <div className="lg:col-span-1">
                  <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Duration <span className="text-danger">*</span></Label>
                  <DurationField
                    value={formData.duration}
                    onChange={(next) => {
                      clearBlueprintOnEdit();
                      setFormData((prev) => ({ ...prev, duration: next }));
                    }}
                    recommendedFor={formData.type}
                  />
                </div>
              </div>

              {/* Skill analysis: no role anchor — interview is driven by each
                  candidate's resume/profile at runtime. Hide domain, sub-domain,
                  description, and the blueprint rail; show a one-line hint instead. */}
              {formData.type === 'skill_analysis' && (
                <div className="p-4 bg-info-soft/40 border border-rule rounded-sm">
                  <p className="text-sm text-ink-soft">
                    Skill analysis interviews are driven by each candidate's
                    profile. No role description needed — just name the
                    interview, pick a duration, and attach candidates.
                  </p>
                </div>
              )}

              {/* Domain row — finance sub-domain taxonomy (Phase B) */}
              {formData.type !== 'skill_analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="financeDomain" className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                    Domain <span className="text-muted normal-case font-normal tracking-normal">(optional)</span>
                  </Label>
                  <Select
                    value={formData.financeDomain || ""}
                    onValueChange={(value) => {
                      const next = value as FinanceDomainId | "";
                      setFormData((prev) => ({
                        ...prev,
                        financeDomain: next,
                        subDomain: "", // reset when domain changes
                      }));
                    }}
                  >
                    <SelectTrigger
                      id="financeDomain"
                      className="mt-2 rounded border-none bg-paper"
                      style={{ boxShadow: 'var(--shadow-1)' }}
                    >
                      <SelectValue placeholder="Pick a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_DOMAIN_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {FINANCE_DOMAINS[id].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subDomain" className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                    Sub-domain <span className="text-muted normal-case font-normal tracking-normal">(optional)</span>
                  </Label>
                  <Select
                    value={formData.subDomain || ""}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, subDomain: value }));
                    }}
                    disabled={!formData.financeDomain}
                  >
                    <SelectTrigger
                      id="subDomain"
                      className="mt-2 rounded border-none bg-paper"
                      style={{ boxShadow: 'var(--shadow-1)' }}
                    >
                      <SelectValue placeholder={formData.financeDomain ? "Pick a sub-domain" : "Pick a domain first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubDomains(formData.financeDomain).map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}

              {/* Description — role-anchored, skipped for skill analysis. */}
              {formData.type !== 'skill_analysis' && (
              <div>
                <Label htmlFor="description" className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Description <span className="text-danger">*</span></Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Describe the finance role: vertical (accounting / taxation / advisory), seniority, must-have technical depth, regulatory frameworks involved..."
                    value={formData.description}
                    onChange={(e) => {
                      clearBlueprintOnEdit();
                      setFormData(prev => ({ ...prev, description: e.target.value }));
                    }}
                    onBlur={() => {
                      if ((formData.title?.trim().length ?? 0) >= 4) bumpPreview();
                    }}
                    className="mt-2 min-h-[190px] pr-10 resize-none rounded border-none transition-all duration-300 bg-paper"
                    style={{
                      boxShadow: 'var(--shadow-1)'
                    }}
                    required
                  />
                  <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 left-2 h-8 w-8 p-0 hover:bg-paper-3"
                      >
                        <ArrowsOut className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Interview Description</DialogTitle>
                        <DialogDescription>
                          Provide a detailed description of the interview objectives and what candidates can expect.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="Describe the interview objectives and what candidates can expect..."
                        value={formData.description}
                        onChange={(e) => {
                          clearBlueprintOnEdit();
                          setFormData(prev => ({ ...prev, description: e.target.value }));
                        }}
                        onBlur={() => {
                          if ((formData.title?.trim().length ?? 0) >= 4) bumpPreview();
                        }}
                        className="min-h-[300px] resize-none"
                      />
                      <DialogFooter>
                        <Button onClick={() => setIsDescriptionModalOpen(false)}>
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              )}

              {/* Preview the AI interviewer's greeting — uses formData.title for personalization. */}
              {formData.title?.trim().length >= 4 && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-info-soft/40 border border-rule rounded-sm">
                  <Volume2 className="w-4 h-4 text-info shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-muted mb-0.5">Voice preview</p>
                    <p className="text-xs text-ink-soft truncate italic">"{personalizedGreeting()}"</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isPlayingAudio ? stopAudioPreview : playAudioPreview}
                    className="rounded-sm  font-bold shrink-0"
                  >
                    {isPlayingAudio ? (
                      <><Stop className="w-3 h-3 mr-1" /> Stop</>
                    ) : (
                      <><Play className="w-3 h-3 mr-1" /> Preview</>
                    )}
                  </Button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-start justify-between pt-8 border-t border-rule mt-6">
                <div className="pt-6">
                  {!isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/interviews/manage')}
                      className="uppercase rounded-sm text-danger hover:text-danger hover:bg-danger-soft"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                  {isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/interviews/manage')}
                      className="uppercase"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Interviews
                    </Button>
                  )}
                </div>
                <div className="pt-6 flex flex-col items-end">
                  <Button
                    onClick={stepper.currentStep === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={!isCurrentStepValid || (stepper.currentStep === steps.length - 1 && isSubmitting)}
                    className="text-paper font-medium rounded-sm  transition-all duration-200"
                    style={{
                      width: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: 'hsl(var(--ink))',
                      boxShadow: 'var(--shadow-1)',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
                  >
                    {(() => {
                      const isOnLastStep = stepper.currentStep === steps.length - 1;
                      const isUpdateButton = isOnLastStep || (isEditMode && stepper.currentStep === steps.length - 1);
                      const showSpinner = isSubmitting && (isOnLastStep || isEditMode);

                      if (showSpinner && isUpdateButton) {
                        return (
                          <>
                            <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                            {isEditMode ? "Updating..." : "Creating..."}
                          </>
                        );
                      }

                      if (isOnLastStep) {
                        if (isEditMode) {
                          return "Update interview";
                        }
                        return selectedTemplate ? "Create & start interview" : "Create interview";
                      }
                      return "Next";
                    })()}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {stepper.currentStep === steps.length - 1 && !isEditMode && !selectedTemplate && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Starts in draft. Review blueprint before starting.</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {!isEditMode && formData.type !== 'skill_analysis' && (
            <BlueprintPreviewRail
              title={formData.title}
              type={formData.type}
              description={formData.description}
              triggerKey={previewTrigger}
              notes={formData.blueprintNotes}
              onNotesChange={(next) =>
                setFormData((prev) => ({ ...prev, blueprintNotes: next }))
              }
            />
          )}
          </div>
        )}

        {stepper.currentStep === 1 && (
          <div key="step-1">
          <Card
            className="border-0"
            style={{
              borderRadius: '0.5em',
              position: 'relative',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CloudArrowUp size={48} weight="thin" />
                  <div>
                    <CardTitle className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                      Configure Candidate Pool
                    </CardTitle>
                    <CardDescription className="text-xs text-muted mt-1">
                      Add candidate sources to your interview
                    </CardDescription>
                  </div>
                </div>
{isEditMode && <EditModeIndicator lastSavedAt={lastSavedAt} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Credit Budget Warning Banner */}
              {isOverCreditBudget() && creditInfo && (
                <div
                  className="p-4 rounded-lg border-2 border-rule bg-warning-soft"
                  style={{
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                      <span className="text-warning text-xl font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-warning">
                        Over Credit Budget
                      </h4>
                      <p className="text-sm text-warning mt-1">
                        You have selected <span className="font-bold">{getEffectiveCandidateCount()}</span> candidates
                        but only have credits for <span className="font-bold">{maxCandidates}</span> interviews.
                        {getCreditShortfall() > 0 && (
                          <span className="block mt-1">
                            <span className="font-semibold">{getCreditShortfall()}</span> candidates will not be interviewed
                            unless more credits are added.
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-warning">
                        <span>Credits needed: <strong>{getTotalCreditsNeeded()}</strong></span>
                        <span className="text-warning">|</span>
                        <span>Available: <strong>{creditInfo.available}</strong></span>
                        <span className="text-warning">|</span>
                        <span>Shortfall: <strong className="text-danger">{getTotalCreditsNeeded() - creditInfo.available}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lists Interface */}
              <div className="space-y-6">
                {/* Create New Candidate Pool Form */}
                {/* Create Candidate Pool Modal */}
                <Dialog open={showCreateListForm} onOpenChange={(open) => {
                  if (!open) {
                    console.log('🔄 Modal closed - resetting form');
                    setShowCreateListForm(false);
                    setIsCreatingList(false);
                    setCreateListFormData({ name: '', description: '', sources: [] });
                    setSheetUrlRows([{ id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }]);
                    setSourceEntryType('google_sheet');
                    setManualCandidates([{ id: 'candidate_1', name: '', email: '' }]);
                  }
                }}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
                    <DialogHeader>
                      <DialogTitle className=" text-ink">
                        Create New Candidate Pool
                      </DialogTitle>
                      <DialogDescription className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                        Add a name and candidate sources
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Pool Name */}
                      <div>
                        <Label htmlFor="listName" className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                          Candidate Pool Name <span className="text-danger">*</span>
                        </Label>
                        <Input
                          id="listName"
                          placeholder="e.g., Senior Tax Managers · GST Specialists · FP&A Leads"
                          value={createListFormData.name}
                          onChange={(e) => setCreateListFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-2 rounded-sm border-none transition-all duration-300 bg-paper"
                          style={{
                            boxShadow: 'var(--shadow-1)'
                          }}
                        />
                      </div>

                      {/* Source Type Toggle */}
                      <div>
                        <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Source Type</Label>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setSourceEntryType('google_sheet')}
                            className={`flex-1 px-4 py-2 text-xs font-medium  rounded transition-colors ${
                              sourceEntryType === 'google_sheet'
                                ? 'bg-[hsl(var(--ink))] text-paper'
                                : 'bg-paper-3 text-muted-foreground hover:bg-paper-3'
                            }`}
                          >
                            Google Sheets
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceEntryType('manual_entry')}
                            className={`flex-1 px-4 py-2 text-xs font-medium  rounded transition-colors ${
                              sourceEntryType === 'manual_entry'
                                ? 'bg-[hsl(var(--ink))] text-paper'
                                : 'bg-paper-3 text-muted-foreground hover:bg-paper-3'
                            }`}
                          >
                            Manual Entry
                          </button>
                        </div>
                      </div>

                      {/* Google Sheets URL Rows */}
                      {sourceEntryType === 'google_sheet' && (
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Google Sheets Sources</Label>
                          {sheetUrlRows.some(r => r.status === 'valid') && (
                            <span className="text-xs font-medium text-success">
                              {sheetUrlRows.filter(r => r.status === 'valid').reduce((sum, r) => sum + r.candidateCount, 0)} candidate{sheetUrlRows.filter(r => r.status === 'valid').reduce((sum, r) => sum + r.candidateCount, 0) !== 1 ? 's' : ''} ready
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-[200px] overflow-y-auto space-y-2 pr-1">
                          {sheetUrlRows.map((row) => (
                            <div key={row.id} className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                <Input
                                  placeholder="https://docs.google.com/spreadsheets/d/..."
                                  value={row.url}
                                  onChange={(e) => {
                                    const newUrl = e.target.value;
                                    setSheetUrlRows(prev => prev.map(r =>
                                      r.id === row.id ? { ...r, url: newUrl, status: 'idle', error: undefined } : r
                                    ));
                                  }}
                                  onPaste={async (e) => {
                                    const pastedUrl = e.clipboardData.getData('text');
                                    if (pastedUrl.includes('docs.google.com/spreadsheets')) {
                                      e.preventDefault();
                                      // Update the URL immediately
                                      setSheetUrlRows(prev => prev.map(r =>
                                        r.id === row.id ? { ...r, url: pastedUrl, status: 'validating' } : r
                                      ));
                                      // Auto-validate on paste
                                      try {
                                        const result = await listsApi.validateGoogleSheet(pastedUrl);
                                        if (result.success) {
                                          const sheetName = result.sheet_info?.sheet_name || 'Google Sheet';
                                          setSheetUrlRows(prev => prev.map(r =>
                                            r.id === row.id ? {
                                              ...r,
                                              status: 'valid',
                                              candidateCount: result.candidateCount,
                                              sheetName: sheetName
                                            } : r
                                          ));
                                          toast({
                                            title: "Sheet Validated",
                                            description: `Found ${result.candidateCount} candidates in "${sheetName}".`
                                          });
                                        } else {
                                          setSheetUrlRows(prev => prev.map(r =>
                                            r.id === row.id ? {
                                              ...r,
                                              status: 'error',
                                              error: result.errors?.[0] || 'Validation failed'
                                            } : r
                                          ));
                                          toast({
                                            title: "Validation Failed",
                                            description: result.errors?.[0] || "Failed to validate Google Sheet.",
                                            variant: "destructive"
                                          });
                                        }
                                      } catch (error) {
                                        setSheetUrlRows(prev => prev.map(r =>
                                          r.id === row.id ? {
                                            ...r,
                                            status: 'error',
                                            error: 'Failed to validate'
                                          } : r
                                        ));
                                        toast({
                                          title: "Validation Error",
                                          description: "Failed to validate Google Sheet.",
                                          variant: "destructive"
                                        });
                                      }
                                    }
                                  }}
                                  className={`rounded-sm border-none transition-all duration-300 bg-paper pr-24 ${
                                    row.status === 'valid' ? 'ring-2 ring-success' :
                                    row.status === 'error' ? 'ring-2 ring-danger' : ''
                                  }`}
                                  style={{
                                    boxShadow: 'var(--shadow-1)'
                                  }}
                                />
                                {/* Status indicator */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  {row.status === 'validating' && (
                                    <CircleNotch className="w-4 h-4 animate-spin text-[hsl(var(--ink))]" />
                                  )}
                                  {row.status === 'valid' && (
                                    <span className="text-xs text-success font-medium flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      {row.candidateCount}
                                    </span>
                                  )}
                                  {row.status === 'error' && (
                                    <span className="text-xs text-danger">
                                      <X className="w-4 h-4" />
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Remove button - only show if more than one row */}
                              {sheetUrlRows.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSheetUrlRows(prev => prev.filter(r => r.id !== row.id));
                                  }}
                                  className="h-10 w-10 p-0 text-danger hover:text-danger hover:bg-danger-soft"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add another row button - outside scrollable area */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSheetUrlRows(prev => [...prev, {
                              id: `row_${Date.now()}`,
                              url: '',
                              status: 'idle',
                              candidateCount: 0,
                              sheetName: ''
                            }]);
                          }}
                          className="text-[hsl(var(--ink))] hover:text-[hsl(var(--ink-soft))] text-xs mt-2"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Another Sheet
                        </Button>
                      </div>
                      )}

                      {/* Manual Entry Table */}
                      {sourceEntryType === 'manual_entry' && (
                      <div>
                        {/* Title row with candidate count on right */}
                        <div className="flex items-center justify-between">
                          <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Applicants</Label>
                          {manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length > 0 && (
                            <span className="text-xs font-medium text-success">
                              {manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length} candidate{manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length !== 1 ? 's' : ''} ready
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1 mb-2">
                            <div className="col-span-5">Name <span className="text-danger">*</span></div>
                            <div className="col-span-6">Email <span className="text-danger">*</span></div>
                            <div className="col-span-1"></div>
                          </div>

                          {/* Scrollable Candidate Rows */}
                          <div className="h-[200px] overflow-y-auto space-y-2 pr-1">
                            {manualCandidates.map((candidate) => {
                              const hasName = candidate.name.trim().length > 0;
                              const hasEmail = candidate.email.trim().length > 0;
                              const emailValid = !hasEmail || isValidEmail(candidate.email);
                              const showNameError = !hasName && (hasEmail);
                              const showEmailError = hasEmail && !emailValid;

                              return (
                                <div key={candidate.id} className="grid grid-cols-12 gap-2 items-start">
                                  <div className="col-span-5">
                                    <Input
                                      placeholder="Rohan Iyer"
                                      value={candidate.name}
                                      onChange={(e) => {
                                        setManualCandidates(prev => prev.map(c =>
                                          c.id === candidate.id ? { ...c, name: e.target.value } : c
                                        ));
                                      }}
                                      className={`rounded-sm border-none transition-all duration-300 bg-paper text-sm ${showNameError ? 'ring-1 ring-red-500' : ''}`}
                                      style={{
                                        boxShadow: 'var(--shadow-1)'
                                      }}
                                    />
                                    {showNameError && (
                                      <p className="text-xs text-danger mt-1">Name is required</p>
                                    )}
                                  </div>
                                  <div className="col-span-6">
                                    <Input
                                      placeholder="john@example.com"
                                      type="email"
                                      value={candidate.email}
                                      onChange={(e) => {
                                        setManualCandidates(prev => prev.map(c =>
                                          c.id === candidate.id ? { ...c, email: e.target.value } : c
                                        ));
                                      }}
                                      className={`rounded-sm border-none transition-all duration-300 bg-paper text-sm ${showEmailError ? 'ring-1 ring-red-500' : ''}`}
                                      style={{
                                        boxShadow: 'var(--shadow-1)'
                                      }}
                                    />
                                    {showEmailError && (
                                      <p className="text-xs text-danger mt-1">Invalid email format</p>
                                    )}
                                  </div>
                                  <div className="col-span-1 flex justify-center pt-1">
                                    {manualCandidates.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setManualCandidates(prev => prev.filter(c => c.id !== candidate.id));
                                        }}
                                        className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger-soft"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add another candidate button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setManualCandidates(prev => [...prev, {
                                id: `candidate_${Date.now()}`,
                                name: '',
                                email: ''
                              }]);
                            }}
                            className="text-[hsl(var(--ink))] hover:text-[hsl(var(--ink-soft))] text-xs mt-2"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Another Candidate
                          </Button>
                        </div>
                      </div>
                      )}
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          console.log('🔄 Cancel clicked: closing modal and resetting state');
                          setShowCreateListForm(false);
                          setIsCreatingList(false);
                          setCreateListFormData({ name: '', description: '', sources: [] });
                          setSheetUrlRows([{ id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }]);
                          setSourceEntryType('google_sheet');
                          setManualCandidates([{ id: 'candidate_1', name: '', email: '' }]);
                        }}
                        className="border-rule-strong rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          // Prepare sources based on entry type
                          let validSources: any[] = [];
                          let totalCandidates = 0;

                          if (sourceEntryType === 'google_sheet') {
                            // Convert validated sheet URLs to sources format
                            validSources = sheetUrlRows
                              .filter(r => r.status === 'valid')
                              .map(r => ({
                                id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                type: 'google_sheet' as const,
                                name: r.sheetName,
                                candidateCount: r.candidateCount,
                                status: 'validated' as const,
                                metadata: { url: r.url }
                              }));
                            totalCandidates = validSources.reduce((sum, s) => sum + s.candidateCount, 0);
                          } else {
                            // Manual entry - create a single source with candidates
                            const validCandidates = manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email));
                            if (validCandidates.length > 0) {
                              validSources = [{
                                id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                type: 'manual_entry' as const,
                                name: 'Manual Entry',
                                candidateCount: validCandidates.length,
                                status: 'validated' as const,
                                metadata: {
                                  candidates: validCandidates.map(c => ({
                                    name: c.name.trim(),
                                    email: c.email.trim()
                                  }))
                                }
                              }];
                              totalCandidates = validCandidates.length;
                            }
                          }

                          console.log('🖱️ Create Candidate Pool clicked!', { isCreatingList, sourceEntryType, sources: validSources });

                          // Call handleCreateList with sources directly inline
                          if (isCreatingList) {
                            console.log('⚠️ Already creating, ignoring');
                            return;
                          }

                          if (!createListFormData.name.trim()) {
                            toast({
                              title: "Name Required",
                              description: "Please enter a candidate pool name.",
                              variant: "destructive"
                            });
                            return;
                          }

                          if (!currentWorkspace || !currentProject) {
                            toast({
                              title: "Error",
                              description: "No workspace or project selected",
                              variant: "destructive"
                            });
                            return;
                          }

                          setIsCreatingList(true);

                          try {
                            // Generate auto description using Option 3 template
                            let autoDescription = '';
                            if (sourceEntryType === 'google_sheet' && validSources.length > 0) {
                              autoDescription = `${createListFormData.name} - Sourced from ${validSources.length} Google Sheet${validSources.length !== 1 ? 's' : ''} containing ${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}`;
                            } else if (sourceEntryType === 'manual_entry' && totalCandidates > 0) {
                              autoDescription = `${createListFormData.name} - ${totalCandidates} manually entered candidate${totalCandidates !== 1 ? 's' : ''}`;
                            } else {
                              autoDescription = createListFormData.name;
                            }

                            // Create the list with auto-generated description
                            const listId = await listsApi.createList(currentProject.id, {
                              name: createListFormData.name,
                              description: autoDescription
                            });
                            console.log('✅ Pool created with ID:', listId);

                            // Add sources if any
                            if (validSources.length > 0) {
                              console.log('📎 Adding sources to pool:', validSources);
                              for (const source of validSources) {
                                const apiPayload = {
                                  type: source.type,
                                  metadata: source.metadata || {},
                                  name: source.name
                                };
                                await listsApi.addSourceToList(currentWorkspace.id, listId, apiPayload);
                              }
                              console.log('✅ All sources added successfully');
                            }

                            // Reload lists
                            await loadAvailableLists();

                            // Auto-select the new list
                            setFormData(prev => ({
                              ...prev,
                              selectedListIds: [...prev.selectedListIds, listId]
                            }));

                            // Reset and close modal
                            setCreateListFormData({ name: '', description: '', sources: [] });
                            setSheetUrlRows([{ id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }]);
                            setSourceEntryType('google_sheet');
                            setManualCandidates([{ id: 'candidate_1', name: '', email: '' }]);
                            setShowCreateListForm(false);

                            toast({
                              title: "Candidate Pool Created",
                              description: `"${createListFormData.name}" has been created${validSources.length > 0 ? ` with ${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}` : ''} and selected.`
                            });
                          } catch (error) {
                            console.error('❌ Error creating pool:', error);
                            toast({
                              title: "Error Creating Pool",
                              description: error instanceof Error ? error.message : "Failed to create pool. Please try again.",
                              variant: "destructive"
                            });
                          } finally {
                            setIsCreatingList(false);
                          }
                        }}
                        disabled={!createListFormData.name.trim() || isCreatingList}
                        className="bg-ink hover:bg-ink text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                      >
                        {isCreatingList ? (
                          <>
                            <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Candidate Pool'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Select from Existing Lists */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setListViewType('existing');
                          loadAvailableLists('existing');
                        }}
                        className={`px-4 py-2 text-sm font-medium  rounded transition-colors ${
                          listViewType === 'existing'
                            ? 'bg-ink text-paper'
                            : 'bg-paper-3 text-muted-foreground hover:bg-paper-3'
                        }`}
                      >
                        Candidate Pools
                      </button>
                      <button
                        onClick={() => {
                          setListViewType('shared');
                          loadAvailableLists('shared');
                        }}
                        className={`px-4 py-2 text-sm font-medium  rounded transition-colors ${
                          listViewType === 'shared'
                            ? 'bg-ink text-paper'
                            : 'bg-paper-3 text-muted-foreground hover:bg-paper-3'
                        }`}
                      >
                        Shared Candidate Pools
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Compact selection summary with info tooltip */}
                      {formData.selectedListIds.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-success-soft border border-rule rounded">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-success">
                            {formData.selectedListIds.length} pool{formData.selectedListIds.length !== 1 ? 's' : ''} · {getEffectiveCandidateCount()} candidate{getEffectiveCandidateCount() !== 1 ? 's' : ''}
                          </span>
                          <div className="relative group">
                            <Info className="w-3.5 h-3.5 text-success cursor-help" />
                            <div className="absolute right-0 top-6 w-64 p-3 bg-paper border border-rule rounded-lg shadow-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                              <div className="text-xs space-y-1.5">
                                <div className="font-medium text-ink">Selection Summary</div>
                                <div className="text-muted">
                                  {formData.selectedListIds.length} list{formData.selectedListIds.length !== 1 ? 's' : ''} selected
                                </div>
                                <div className="text-muted">
                                  {getEffectiveCandidateCount()} total candidates
                                  {isUsingDuplicateExcludedCount() && (
                                    <span className="text-success ml-1">(duplicates excluded)</span>
                                  )}
                                </div>
                                {duplicateAnalysis && duplicateAnalysis.totalDuplicates > 0 && (
                                  <div className="text-warning">
                                    {duplicateAnalysis.totalDuplicates} duplicate{duplicateAnalysis.totalDuplicates !== 1 ? 's' : ''} detected
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => loadAvailableLists(listViewType)}
                        disabled={isLoadingLists}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh lists"
                      >
                        <ArrowsClockwise className={`w-3 h-3 ${isLoadingLists ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  </div>
                  {isLoadingLists ? (
                    <div className="flex items-center justify-center py-8">
                      <SpinnerWithCopy label="Loading candidate pools…" variant="brand" />
                    </div>
                  ) : availableLists.length > 0 ? (
                    <>
                      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                        {availableLists.map((list, index) => {
                          const isSelected = formData.selectedListIds.includes(list.id);
                          const isCurated = (list as any).isQualified === true;
                          return (
                            <div
                              key={`${list.id}-${index}-${isSelected}`}
                              onClick={() => handleListSelection(list.id)}
                              className={`p-6 rounded cursor-pointer transition-all duration-200 min-h-[150px] w-52 shrink-0 relative overflow-hidden ${
                                !isSelected ? 'group hover:text-paper' : ''
                              }`}
                              style={{
                                border: isSelected ? '2px solid hsl(var(--success))' : 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                backgroundColor: 'transparent',
                                boxShadow: 'var(--shadow-1)',
                                backgroundImage: isCurated
                                  ? 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))'
                                  : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'hsl(var(--ink))';
                                  e.currentTarget.style.backgroundImage = 'none';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  if (isCurated) {
                                    e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))';
                                  } else {
                                    e.currentTarget.style.backgroundImage = 'none';
                                  }
                                }
                              }}
                            >
                              {/* Curated Corner Ribbon */}
                              {isCurated && (
                                <div className="absolute top-0 right-0 z-20 overflow-hidden w-20 h-20 pointer-events-none">
                                  <div className="absolute top-0 right-0 w-28 h-6 bg-paper-2 from-warning to-warning text-warning text-[10px] font-bold flex items-center justify-center shadow-2 transform rotate-45 translate-x-6 translate-y-2">
                                    Curated
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-col h-full">
                                <div className="mb-3">
                                  <h4 className={`font-medium text-sm transition-colors ${!isSelected ? 'group-hover:text-paper' : ''}`}>{list.name}</h4>
                                  <p className={`text-[10px] text-muted   mt-1 transition-colors ${!isSelected ? 'group-hover:text-paper/60' : ''}`}>
                                    #{list.id}
                                  </p>
                                </div>
                                {list.description && (
                                  <p className={`text-xs text-muted-foreground mb-3 line-clamp-2 transition-colors ${!isSelected ? 'group-hover:text-paper/80' : ''}`}>{list.description}</p>
                                )}
                                <div className="mt-auto flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs text-muted-foreground transition-colors ${!isSelected ? 'group-hover:text-paper/70' : ''}`}>
                                      {(() => {
                                        const listDuplicateInsights = availableLists.find(l => l.id === list.listId)?.duplicateInsights;
                                        const effectiveCount = listDuplicateInsights && listDuplicateInsights.totalDuplicates > 0
                                          ? listDuplicateInsights.uniqueCandidates
                                          : list.totalCandidates;
                                        return effectiveCount;
                                      })()} {(() => {
                                        const listDuplicateInsights = availableLists.find(l => l.id === list.listId)?.duplicateInsights;
                                        const effectiveCount = listDuplicateInsights && listDuplicateInsights.totalDuplicates > 0
                                          ? listDuplicateInsights.uniqueCandidates
                                          : list.totalCandidates;
                                        return effectiveCount === 1 ? 'Candidate' : 'Candidates';
                                      })()}{(() => {
                                        const listDuplicateInsights = availableLists.find(l => l.id === list.listId)?.duplicateInsights;
                                        return listDuplicateInsights && listDuplicateInsights.totalDuplicates > 0
                                          ? ' (excl. duplicates)'
                                          : '';
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    {/* Hide sources count for shared lists and curated lists */}
                                    {!isCurated && listViewType !== 'shared' && (
                                      <span className={`text-xs text-muted-foreground transition-colors ${!isSelected ? 'group-hover:text-paper/70' : ''}`}>
                                        {list.sourcesCount} {list.sourcesCount === 1 ? 'Source' : 'Sources'}
                                      </span>
                                    )}
                                    {list.updatedAt && (
                                      <div className={`flex items-center gap-1 ${isCurated || listViewType === 'shared' ? 'ml-0' : 'ml-auto'}`}>
                                        <ClockCounterClockwise
                                          size={10}
                                          className={`transition-colors ${!isSelected ? 'text-muted group-hover:text-paper/60' : 'text-muted'}`}
                                        />
                                        <span className={`text-[8px] text-muted transition-colors ${!isSelected ? 'group-hover:text-paper/60' : ''}`}>
                                          {new Date(list.updatedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Don't see the Candidate Pool you need? - shown when pools exist, only for existing view */}
                      {listViewType === 'existing' && (
                        <div className="p-4 border-2 border-dashed border-rule rounded-lg text-center mt-4">
                          <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">
                            Don't see the Candidate Pool you need?
                          </div>
                          <Button
                            onClick={() => {
                              console.log('🆕 Create New Candidate Pool clicked - opening form');
                              setShowCreateListForm(true);
                            }}
                            variant="outline"
                            className="border-ink text-ink hover:bg-ink hover:text-paper text-xs h-8 px-3 rounded-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create New Candidate Pool
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-center pt-16">
                      <div className="py-12 px-10 border-2 border-dashed border-rule rounded-lg text-center max-w-md">
                        <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-4">
                          {listViewType === 'existing'
                            ? 'No existing Candidate Pools'
                            : 'No candidate pools shared with you'}
                        </div>
                        {listViewType === 'existing' && (
                          <>
                            <Button
                              onClick={() => {
                                console.log('🆕 Create New Candidate Pool clicked - opening form');
                                setShowCreateListForm(true);
                              }}
                              variant="outline"
                              className="border-ink text-ink hover:bg-ink hover:text-paper text-xs h-8 px-3 rounded-sm"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Create New Candidate Pool
                            </Button>
                            {/* Download Sample - priming UX */}
                            <div className="mt-6 pt-4 border-t border-rule">
                              <button
                                onClick={downloadSampleFormat}
                                className="text-muted-foreground hover:text-ink text-xs font-medium transition-colors flex items-center gap-1 mx-auto"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"></path></svg>
                                Download Sample Format
                              </button>
                            </div>
                          </>
                        )}
                        {listViewType === 'shared' && (
                          <div className="text-xs text-muted-foreground">
                            Ask a team member to share their candidate pools with you.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
              
              {/* Navigation */}
              <div className="flex items-start justify-between pt-6">
                <div className="flex items-center space-x-3">
                  {isEditMode && stepper.currentStep === 0 && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/interviews/manage')}
                      className="uppercase"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Cancel & Return
                    </Button>
                  )}
                  {stepper.currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="text-paper font-medium rounded-sm  transition-all duration-200"
                      style={{
                        width: '9em',
                        height: '3em',
                        fontSize: '15px',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: 'hsl(var(--ink))',
                        boxShadow: 'var(--shadow-1)',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
                    >
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <Button
                    onClick={stepper.currentStep === 1
                      ? handleCandidatesStepButtonClick
                      : (stepper.currentStep === steps.length - 1 ? handleSubmit : handleNext)
                    }
                    disabled={stepper.currentStep === 1
                      ? getCandidatesStepButtonConfig().disabled
                      : (!isCurrentStepValid || (stepper.currentStep === steps.length - 1 && isSubmitting))
                    }
                    className={`font-medium rounded-sm  transition-all duration-200 ${stepper.currentStep === steps.length - 1 ? 'text-ink' : 'text-paper'}`}
                    style={{
                      minWidth: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'visible',
                      backgroundColor: stepper.currentStep === steps.length - 1 ? 'hsl(var(--gold))' : 'hsl(var(--ink))',
                      boxShadow: 'var(--shadow-1)',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5em',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = stepper.currentStep === steps.length - 1 ? 'hsl(var(--gold) / 0.9)' : 'hsl(var(--ink-soft))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = stepper.currentStep === steps.length - 1 ? 'hsl(var(--gold))' : 'hsl(var(--ink))'}
                  >
                    {(() => {
                      // Special handling for candidates step (step 1)
                      if (stepper.currentStep === 1) {
                        const buttonText = getCandidatesStepButtonConfig().text;
                        console.log('🎯 Button text being rendered:', buttonText);
                        return buttonText;
                      }

                      // Original logic for other steps
                      const isOnLastStep = stepper.currentStep === steps.length - 1;
                      const isUpdateButton = isOnLastStep || (isEditMode && stepper.currentStep === steps.length - 1);
                      const showSpinner = isSubmitting && (isOnLastStep || isEditMode);

                      if (showSpinner && isUpdateButton) {
                        return (
                          <>
                            <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                            {isEditMode ? "Updating..." : "Creating..."}
                          </>
                        );
                      }

                      if (isOnLastStep) {
                        if (isEditMode) {
                          return "Update interview";
                        }
                        return selectedTemplate ? "Create & start interview" : "Create interview";
                      }
                      return "Next";
                    })()}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {stepper.currentStep === steps.length - 1 && !isEditMode && !selectedTemplate && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Starts in draft. Review blueprint before starting.</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}


        </div> {/* Close max-w-6xl container */}
      </div> {/* Close scrollable content */}

      {/* Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md rounded-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className=" text-ink">
              {overallProgress === 100
                ? (wasInterviewStarted ? 'INTERVIEW IS LIVE!' : 'INTERVIEW READY!')
                : `${isEditMode ? 'UPDATING' : 'CREATING'} INTERVIEW`}
            </DialogTitle>
            <DialogDescription className=" text-xs">
              {overallProgress === 100
                ? (wasInterviewStarted
                    ? `${formData.title.toUpperCase()} IS NOW ACTIVE`
                    : `${formData.title.toUpperCase()} IS READY FOR CANDIDATES`)
                : `SETTING UP ${formData.title.toUpperCase()}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Overall Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">OVERALL PROGRESS</span>
                <span className="text-sm text-muted font-medium">{overallProgress}%</span>
              </div>
              <div className="w-full bg-paper-3 rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-[hsl(var(--ink))] h-full transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Step Progress List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {progressSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <div className="w-5 h-5 bg-success rounded-sm flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-paper" />
                      </div>
                    ) : step.status === 'active' ? (
                      <div className="w-5 h-5 bg-[hsl(var(--ink-soft))] rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-paper rounded-full animate-pulse"></div>
                      </div>
                    ) : step.status === 'error' ? (
                      <div className="w-5 h-5 bg-danger rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-paper rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-paper-3 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-muted rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium   ${
                      step.status === 'completed' ? 'text-success' :
                      step.status === 'active' ? 'text-[hsl(var(--ink-soft))]' :
                      step.status === 'error' ? 'text-danger' :
                      'text-muted-2'
                    }`}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-muted mt-1">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Analysis Modal */}
      <DuplicateAnalysisModal
        isOpen={showDuplicateModal}
        onClose={handleModalClose}
        onContinue={handleModalContinue}
        onCancel={handleModalCancel}
        selectedListIds={formData.selectedListIds}
        availableLists={availableLists}
        analyzeDuplicates={analyzeWithModalState}
      />

      {/* Blueprint Guide Modal */}
      <Dialog open={showBlueprintGuideModal} onOpenChange={(open) => !open && handleCloseBlueprintGuide()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-ink tracking-tight">
                Your interview blueprint
              </DialogTitle>
              <DialogDescription className="text-muted mt-2">
                Every interview gets an AI-generated rubric tuned to the role. Here's how it works.
              </DialogDescription>
            </DialogHeader>

            {/* Carousel */}
            <div className="mt-6">
              {/* Image container with navigation arrows */}
              <div className="relative">
                <div className="overflow-hidden rounded-lg">
                  <div
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${blueprintGuideSlide * 100}%)` }}
                  >
                    {/* Slide 1 Image */}
                    <div className="w-full shrink-0">
                      <div className="bg-paper-2 rounded-lg p-4">
                        <img
                          src={blueprintGuideImg1}
                          alt="Create interview blueprint"
                          className="w-full h-[420px] object-contain rounded-lg shadow-2"
                        />
                      </div>
                    </div>

                    {/* Slide 2 Image */}
                    <div className="w-full shrink-0">
                      <div className="bg-paper-2 rounded-lg p-4">
                        <img
                          src={blueprintGuideImg2}
                          alt="Edit Interview Blueprint"
                          className="w-full h-[420px] object-contain rounded-lg shadow-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows - centered on image */}
                {blueprintGuideSlide > 0 && (
                  <button
                    onClick={() => setBlueprintGuideSlide(prev => prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-paper/90 shadow-2 flex items-center justify-center hover:bg-paper transition-colors"
                  >
                    <CaretLeft size={20} className="text-ink-soft" />
                  </button>
                )}
                {blueprintGuideSlide < 1 && (
                  <button
                    onClick={() => setBlueprintGuideSlide(prev => prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-paper/90 shadow-2 flex items-center justify-center hover:bg-paper transition-colors"
                  >
                    <CaretRight size={20} className="text-ink-soft" />
                  </button>
                )}
              </div>

              {/* Description text - outside the image container */}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${blueprintGuideSlide * 100}%)` }}
                >
                  <p className="w-full shrink-0 mt-3 text-center text-sm text-ink-soft">
                    <strong>Generated from your role.</strong> Type the title and description; we'll produce a 10-skill rubric, expected proficiency levels, and the topics the interview should cover.
                  </p>
                  <p className="w-full shrink-0 mt-3 text-center text-sm text-ink-soft">
                    <strong>Yours to refine.</strong> Add specifics like "include GST compliance" or "lean Big-4" to steer the blueprint. Edit topics, duration, and structure anytime.
                  </p>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {[0, 1].map((index) => (
                  <button
                    key={index}
                    onClick={() => setBlueprintGuideSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      blueprintGuideSlide === index ? 'bg-gold' : 'bg-paper-4'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-paper-2 border-t">
            <Button
              onClick={handleCloseBlueprintGuide}
              className="w-full"
              style={{ backgroundColor: 'hsl(var(--ink))' }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 4 — Role curator chat */}
      <RoleCuratorModal
        isOpen={showRoleCurator}
        onClose={() => setShowRoleCurator(false)}
        onAccept={(proposal) => {
          setFormData((prev) => ({
            ...prev,
            title: proposal.title || prev.title,
            description: proposal.description || prev.description,
            blueprintNotes: proposal.notes || prev.blueprintNotes,
          }));
          // Bump the preview trigger so the right rail re-runs the
          // preview against the new title + description + notes.
          setPreviewTrigger((n) => n + 1);
        }}
      />

      {/* Phase A.4 — Out-of-scope rejection modal. Surfaces when the
         backend admission gate (services/domain_fit/) classifies the
         candidate's resume as non-finance. */}
      <Dialog
        open={outOfScopeDetail !== null}
        onOpenChange={(open) => { if (!open) setOutOfScopeDetail(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This candidate's profile is outside our scope</DialogTitle>
            <DialogDescription>
              {outOfScopeDetail?.message ||
                'FlowDot AI supports India finance hiring only — accounting, taxation, and management consulting.'}
            </DialogDescription>
          </DialogHeader>
          {outOfScopeDetail && outOfScopeDetail.nonFinanceSignals.length > 0 && (
            <div className="border-t pt-3">
              <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted-foreground mb-2">
                Signals we read as non-finance
              </div>
              <ul className="text-sm space-y-1">
                {outOfScopeDetail.nonFinanceSignals.map((s) => (
                  <li key={s} className="font-mono text-foreground">{s}</li>
                ))}
              </ul>
              {outOfScopeDetail.financeSignals.length > 0 && (
                <>
                  <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted-foreground mt-3 mb-2">
                    Finance signals also present
                  </div>
                  <ul className="text-sm space-y-1">
                    {outOfScopeDetail.financeSignals.slice(0, 5).map((s) => (
                      <li key={s} className="font-mono text-muted-foreground">{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            If this is a mistake — say the resume was misclassified or the candidate
            has finance experience our keywords missed — open the candidate record
            and update the resume, then create the interview again.
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOutOfScopeDetail(null)}
              className="w-full"
              style={{ backgroundColor: 'hsl(var(--ink))' }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

