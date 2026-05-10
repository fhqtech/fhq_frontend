import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { suggestFromTitle, type InterviewSuggestion } from "@/services/suggestionsApi";
import { BlueprintPreviewRail } from "@/components/create-interview/BlueprintPreviewRail";
import { ArrowLeft, FloppyDisk as Save, Users, Robot as Bot, SpeakerHigh as Volume2, Envelope as Mail, Phone, ChatCircle as MessageSquare, Upload, Download, FileXls as FileSpreadsheet, Gear as Settings, Calculator, Receipt, Briefcase, ArrowsOut, CheckCircle, Info, Play, Stop, CircleNotch, Trash, X, Plus, ArrowsClockwise, CloudArrowUp, ClockCounterClockwise, AddressBook, CaretLeft, CaretRight } from "phosphor-react";
import aiAvatar from "@/assets/ai-avatar.png";
import blueprintGuideImg1 from "@/assets/create-interview-guide/interview-blueprint.png";
import blueprintGuideImg2 from "@/assets/create-interview-guide/edit-interview-blueprint.png";
import { DuplicateAnalysisModal } from "@/components/modals/DuplicateAnalysisModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listsApi, CandidateList } from "@/services/listsApi";
import { qualifiedListsApi, QualifiedList } from "@/services/qualifiedListsApi";
import { duplicateDetectionApi, DuplicateAnalysis } from "@/services/duplicateDetectionApi";
import { SourceManager } from "@/components/sources/SourceManager";
import { useStepper } from "@/hooks/useStepper";
import { GoogleSheetsPreview } from "@/components/ui/google-sheets-preview";
import { FilePreview } from "@/components/ui/file-preview";
import { SourceDeleteConfirmationModal } from "@/components/ui/source-delete-confirmation-modal";
import { templateApi, InterviewTemplate } from "@/services/templateApi";
import { creditApi, CreditInfo } from "@/services/creditApi";

export default function CreateInterview() {
  const [searchParams] = useSearchParams();
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
      if (typeParam && (typeParam === 'screening' || typeParam === 'fitment')) {
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

  // Credit info states
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [isLoadingCreditInfo, setIsLoadingCreditInfo] = useState(false);
  const [maxCandidates, setMaxCandidates] = useState<number | null>(null);

  // Blueprint guide modal states
  const [showBlueprintGuideModal, setShowBlueprintGuideModal] = useState(false);
  const [blueprintGuideSlide, setBlueprintGuideSlide] = useState(0);
  const [hasClosedBlueprintGuide, setHasClosedBlueprintGuide] = useState(false);

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
        setAvailableTemplates(templates);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        // Don't show error toast - templates are optional
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
              title: "Ready to Add Candidates",
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
      console.log('🔑 User token exists:', !!userToken);
      
      // Fetch interview data (using lists-based approach)
      console.log('📡 Fetching interview data...');
      const interviewResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews/${interviewId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken && { 'Authorization': `Bearer ${userToken}` })
        }
      });

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

  // Try browser SpeechSynthesis first (personalized line). Fall back to the
  // static accent/speed WAV file if the browser doesn't support TTS or the
  // requested voice isn't installed.
  const playAudioPreview = () => {
    stopAudioPreview();

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (synth && 'SpeechSynthesisUtterance' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(personalizedGreeting());
        utter.rate = formData.voiceSpeed === 'slow' ? 0.85 : formData.voiceSpeed === 'fast' ? 1.15 : 1.0;
        utter.pitch = formData.voiceType === 'professional-male' ? 0.85 : 1.05;
        // Pick a voice matching the requested gender + accent if installed.
        const voices = synth.getVoices();
        const accentTag = formData.voiceAccent === 'british' ? 'en-GB' : formData.voiceAccent === 'indian' ? 'en-IN' : 'en-US';
        const wantMale = formData.voiceType === 'professional-male';
        const match = voices.find(v => v.lang?.startsWith(accentTag) && (wantMale ? /male/i.test(v.name) : /female/i.test(v.name)))
                   || voices.find(v => v.lang?.startsWith(accentTag))
                   || voices.find(v => v.lang?.startsWith('en'));
        if (match) utter.voice = match;
        utter.onstart = () => setIsPlayingAudio(true);
        utter.onend = () => setIsPlayingAudio(false);
        utter.onerror = () => setIsPlayingAudio(false);
        synth.speak(utter);
        return;
      } catch {
        // fall through to WAV fallback
      }
    }

    // Fallback: original generic WAV preview
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
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

  // Check if duplicate analysis is needed
  const needsDuplicateAnalysis = () => {
    const hasMultipleLists = formData.selectedListIds.length >= 2;
    if (!hasMultipleLists) return false;

    const storedAnalysis = formData.duplicateAnalysis;
    if (!storedAnalysis) return true;

    // Check if selected lists changed since last analysis
    const currentLists = [...formData.selectedListIds].sort();
    const analyzedLists = [...storedAnalysis.analyzedListIds].sort();
    const listsChanged = JSON.stringify(currentLists) !== JSON.stringify(analyzedLists);

    return listsChanged;
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

    console.log('🔧 Button Config Debug:', {
      selectedListsCount: formData.selectedListIds.length,
      duplicateAnalysisCompleted,
      hasSelectedLists,
      hasSingleList,
      hasMultipleLists,
      needsAnalysis,
      storedAnalysis: !!formData.duplicateAnalysis
    });

    if (!hasSelectedLists) {
      console.log('🔧 → No lists selected');
      return { text: "Next", action: "next", disabled: true };
    }

    if (hasSingleList) {
      console.log('🔧 → Single list selected');
      return { text: "Next", action: "next", disabled: false };
    }

    if (needsAnalysis) {
      console.log('🔧 → Multiple lists, analysis needed');
      return { text: "Check for Duplicates", action: "analyze", disabled: false };
    }

    if (hasMultipleLists && !needsAnalysis) {
      console.log('🔧 → Multiple lists, analysis up to date');
      return { text: "Next", action: "next", disabled: false };
    }

    console.log('🔧 → Fallback case');
    return { text: "Next", action: "next", disabled: true };
  };

  // Handle button click for candidates step
  const handleCandidatesStepButtonClick = () => {
    const config = getCandidatesStepButtonConfig();

    if (config.action === "analyze") {
      // Open duplicate analysis modal
      setShowDuplicateModal(true);
    } else if (config.action === "next") {
      // Proceed to next step
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
        if (!data.description?.trim()) requiredFields.push('Description');
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
    }
  };

  // Real-time validation for current step
  const getCurrentStepValidation = () => {
    return validateStep(stepper.currentStep, formData);
  };

  const isCurrentStepValid = getCurrentStepValidation().isValid;


  const handlePrevious = () => {
    stepper.goToPrevStep();
  };

  // Blueprint generation function (fire-and-forget with status tracking in backend)
  const triggerBlueprintGeneration = async (interviewId: string, title: string, description: string) => {
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
        description
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
              formData.description
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
      toast({
        title: `Failed to ${isEditMode ? 'Update' : 'Create'} Interview`,
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
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

  // Loading state for edit mode
  if (isLoadingInterview) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <CircleNotch className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Loading Interview</h3>
            <p className="text-sm text-foreground-muted">Please wait while we fetch your interview data...</p>
          </div>
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
          <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider mb-3">
            Create Interview
          </h1>
          <p className="text-foreground-muted uppercase text-xs tracking-wider">
            Choose the type of interview you want to create
          </p>
        </div>

        <div className="flex gap-8">
          {/* Screening Card */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, type: 'screening' }));
              setShowTypeSelection(false);
            }}
            className="group relative w-96 p-12 rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: '#f5f5f5',
              boxShadow: '6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff'
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: '#222831',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(255,255,255,0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground uppercase tracking-wider mb-3">
                Screening
              </h2>
              <p className="text-foreground-muted text-sm uppercase tracking-wider leading-relaxed">
                Quick initial assessment to filter candidates at scale
              </p>
            </div>
          </button>

          {/* Fitment Card */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, type: 'fitment' }));
              setShowTypeSelection(false);
            }}
            className="group relative w-96 p-12 rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: '#f5f5f5',
              boxShadow: '6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff'
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: '#222831',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(255,255,255,0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground uppercase tracking-wider mb-3">
                Fitment
              </h2>
              <p className="text-foreground-muted text-sm uppercase tracking-wider leading-relaxed">
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
      <div className="flex-shrink-0 bg-background px-4 pt-10 pb-2">
        {/* Stepper */}
        <div className="flex justify-center">
          <div className="w-full max-w-5xl px-4">
            <Stepper
              steps={steps.map((step, index) => ({
                ...step,
                hasError: index === stepper.currentStep ? !isCurrentStepValid : stepper.stepValidations[index]?.isValid === false
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
              boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={aiAvatar} alt="AI" className="w-12 h-12 rounded-full" />
                  <div>
                    <CardTitle className="uppercase font-light tracking-widest">
                      Interview Details
                    </CardTitle>
                    <CardDescription className="uppercase text-[10px] mt-1">
                      Configure the basic information about your interview
                    </CardDescription>
                  </div>
                </div>
                {isEditMode && <EditModeIndicator lastSavedAt={lastSavedAt} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Blueprint Mode Toggle - Only in create mode */}
              {!isEditMode && (
                <div className="space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Label className="uppercase text-xs tracking-wider">Start From</Label>
                      <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={blueprintMode === 'new' ? 'default' : 'outline'}
                        className={`h-9 text-xs font-medium px-4 rounded uppercase transition-all duration-200 ${
                          blueprintMode === 'new' ? 'text-white' : 'hover:text-white'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: blueprintMode === 'new' ? '#222831' : 'transparent',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                        onMouseEnter={(e) => {
                          if (blueprintMode !== 'new') e.currentTarget.style.backgroundColor = '#393E46';
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
                        variant={blueprintMode === 'template' ? 'default' : 'outline'}
                        className={`h-9 text-xs font-medium px-4 rounded uppercase transition-all duration-200 ${
                          blueprintMode === 'template' ? 'text-white' : 'hover:text-white'
                        }`}
                        style={{
                          border: 'none',
                          backgroundColor: blueprintMode === 'template' ? '#222831' : 'transparent',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                        onMouseEnter={(e) => {
                          if (blueprintMode !== 'template') e.currentTarget.style.backgroundColor = '#393E46';
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
                      {/* FAQ Hover Button */}
                      <div className="relative inline-flex items-center ml-2">
                        <button
                          type="button"
                          className="faq-button-start w-8 h-8 rounded-full border-none flex items-center justify-center cursor-pointer relative"
                          style={{
                            background: 'linear-gradient(147deg, #00ADB5 0%, #222831 74%)',
                            boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.15)'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="h-4 w-4 fill-white">
                            <path d="M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"></path>
                          </svg>
                          <span
                            className="faq-tooltip-start absolute opacity-0 text-white py-1 px-2 rounded text-xs flex items-center justify-center pointer-events-none transition-all duration-200 whitespace-nowrap"
                            style={{
                              top: '-40px',
                              background: 'linear-gradient(147deg, #00ADB5 0%, #222831 74%)',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Create or purchase Interview Blueprints from Control Tower
                            <span
                              className="absolute w-2 h-2 rotate-45"
                              style={{
                                bottom: '-4px',
                                backgroundColor: '#222831'
                              }}
                            ></span>
                          </span>
                        </button>
                        <style>{`
                          .faq-button-start:hover svg {
                            animation: jello-vertical-start 0.7s both;
                          }
                          .faq-button-start:hover .faq-tooltip-start {
                            opacity: 1 !important;
                            top: -45px !important;
                          }
                          @keyframes jello-vertical-start {
                            0% { transform: scale3d(1, 1, 1); }
                            30% { transform: scale3d(0.75, 1.25, 1); }
                            40% { transform: scale3d(1.25, 0.75, 1); }
                            50% { transform: scale3d(0.85, 1.15, 1); }
                            65% { transform: scale3d(1.05, 0.95, 1); }
                            75% { transform: scale3d(0.95, 1.05, 1); }
                            100% { transform: scale3d(1, 1, 1); }
                          }
                        `}</style>
                      </div>
                    </div>
                    {availableTemplates.length === 0 && !isLoadingTemplates && (
                      <span className="text-xs text-gray-400">No blueprints available</span>
                    )}
                    </div>

                    {/* Credits Info - Right Side */}
                    {creditInfo && (
                      <div
                        className="flex items-center gap-4 px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor: '#f8f9fa',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#222831]">
                            {creditInfo.creditCosts[parseInt(formData.duration)] || 0}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Credits Per Interview</div>
                        </div>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#00ADB5]">
                            {creditInfo.available}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Available Credits</div>
                        </div>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#393E46]">
                            {maxCandidates ?? 0}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Max Candidates</div>
                        </div>
                      </div>
                    )}
                    {isLoadingCreditInfo && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor: '#f8f9fa',
                          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                        }}
                      >
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    )}
                  </div>

                  {/* Template Selection List */}
                  {blueprintMode === 'template' && (
                    <div className="space-y-3">
                      {isLoadingTemplates ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
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
                                  ? 'ring-2 ring-[#222831] bg-gray-50'
                                  : 'hover:bg-gray-50'
                              }`}
                              style={{
                                boxShadow: selectedTemplate?.id === template.id
                                  ? '2px 2px 6px #c0c0c0, -2px -2px 6px #ffffff'
                                  : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                                  {template.title}
                                </h4>
                                {selectedTemplate?.id === template.id && (
                                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {template.type}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {template.duration} min
                                </Badge>
                                {template.scope === 'global' ? (
                                  <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                                    Global
                                  </Badge>
                                ) : (
                                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                                    Project
                                  </Badge>
                                )}
                              </div>
                              {template.topics && (
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {template.topics}
                                </p>
                              )}
                              {template.usageCount > 0 && (
                                <p className="text-[10px] text-gray-400 mt-2">
                                  Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No blueprints available for this project.
                        </div>
                      )}

                    </div>
                  )}

                  <Separator />
                </div>
              )}

              {/* Top row: Title, Interview Type, and Duration */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Title */}
                <div className="lg:col-span-2">
                  <Label htmlFor="title" className="uppercase text-xs tracking-wider flex items-center gap-2">
                    Interview Title <span className="text-red-600">*</span>
                    {isSuggesting && (
                      <span className="text-[10px] font-mono normal-case text-blue-600 inline-flex items-center gap-1">
                        <CircleNotch className="w-3 h-3 animate-spin" /> AI is filling defaults…
                      </span>
                    )}
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Senior Accountant Assessment"
                    value={formData.title}
                    onChange={(e) => {
                      clearBlueprintOnEdit();
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                    }}
                    className="mt-2 rounded border-none transition-all duration-300 bg-white"
                    style={{
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                    }}
                  />
                </div>

                {/* Interview Type */}
                <div className="lg:col-span-2">
                  <Label className="uppercase text-xs tracking-wider">Interview Type <span className="text-red-600">*</span></Label>
                  <div className="flex gap-3 mt-2">
                    {[
                      { value: "screening", label: "Screening" },
                      { value: "fitment", label: "Fitment" }
                    ].map((type) => {
                      const isSelected = formData.type === type.value;
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`h-10 text-xs font-medium px-6 rounded uppercase transition-all duration-200 ${
                            isSelected
                              ? 'text-white'
                              : 'hover:text-white'
                          }`}
                          style={{
                            border: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: isSelected ? '#222831' : 'transparent',
                            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#393E46';
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
                  <Label className="uppercase text-xs tracking-wider">Duration <span className="text-red-600">*</span></Label>
                  <div className="flex gap-4 mt-2 justify-start">
                    {[
                      { value: "10", label: "10", recommendedFor: "screening" },
                      { value: "20", label: "20", recommendedFor: "fitment" }
                    ].map((duration) => {
                      const isSelected = formData.duration === duration.value;
                      const isRecommended = formData.type === duration.recommendedFor;
                      return (
                        <div key={duration.value} className="flex flex-col items-center gap-1">
                          <Button
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`w-10 h-10 rounded-full p-0 flex flex-col items-center justify-center gap-0 transition-all duration-200 ${
                              isSelected
                                ? 'text-white'
                                : 'hover:text-white'
                            }`}
                            style={{
                              border: 'none',
                              position: 'relative',
                              overflow: 'hidden',
                              backgroundColor: isSelected ? '#222831' : 'transparent',
                              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#393E46';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => {
                              clearBlueprintOnEdit();
                              setFormData(prev => ({ ...prev, duration: duration.value }));
                            }}
                          >
                            <span className="text-lg font-bold leading-tight">{duration.label}</span>
                            <span className="text-[8px] leading-tight">min</span>
                          </Button>
                          {isRecommended && (
                            <span className="text-[10px] text-[#00ADB5] font-medium uppercase tracking-wider">Recommended</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="uppercase text-xs tracking-wider">Description <span className="text-red-600">*</span></Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Describe the interview objectives and what candidates can expect..."
                    value={formData.description}
                    onChange={(e) => {
                      clearBlueprintOnEdit();
                      setFormData(prev => ({ ...prev, description: e.target.value }));
                    }}
                    className="mt-2 min-h-[190px] pr-10 resize-none rounded border-none transition-all duration-300 bg-white"
                    style={{
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                    }}
                    required
                  />
                  <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 left-2 h-8 w-8 p-0 hover:bg-gray-100"
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

              {/* Preview the AI interviewer's greeting — uses formData.title for personalization. */}
              {formData.title?.trim().length >= 4 && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50/40 border border-blue-100 rounded-sm">
                  <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-0.5">Voice preview</p>
                    <p className="text-xs text-gray-700 truncate italic">"{personalizedGreeting()}"</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isPlayingAudio ? stopAudioPreview : playAudioPreview}
                    className="rounded-sm uppercase font-bold flex-shrink-0"
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
              <div className="flex items-start justify-between pt-8 border-t border-gray-100 mt-6">
                <div className="pt-6">
                  {!isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/interviews/manage')}
                      className="uppercase rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                    style={{
                      width: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: '#222831',
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
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
                          return "Update Interview";
                        }
                        return selectedTemplate ? "Create & Start Interview" : "Create Interview";
                      }
                      return "Next";
                    })()}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {stepper.currentStep === steps.length - 1 && !isEditMode && !selectedTemplate && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Starts in draft. Review blueprint before starting.</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {!isEditMode && (
            <BlueprintPreviewRail
              title={formData.title}
              type={formData.type}
              description={formData.description}
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
              boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CloudArrowUp size={48} weight="thin" />
                  <div>
                    <CardTitle className="uppercase font-light tracking-widest">
                      Configure Candidate Pool
                    </CardTitle>
                    <CardDescription className="uppercase text-[10px] mt-1">
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
                  className="p-4 rounded-lg border-2 border-amber-400 bg-amber-50"
                  style={{
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-600 text-xl font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                        Over Credit Budget
                      </h4>
                      <p className="text-sm text-amber-700 mt-1">
                        You have selected <span className="font-bold">{getEffectiveCandidateCount()}</span> candidates
                        but only have credits for <span className="font-bold">{maxCandidates}</span> interviews.
                        {getCreditShortfall() > 0 && (
                          <span className="block mt-1">
                            <span className="font-semibold">{getCreditShortfall()}</span> candidates will not be interviewed
                            unless more credits are added.
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-amber-600">
                        <span>Credits needed: <strong>{getTotalCreditsNeeded()}</strong></span>
                        <span className="text-amber-400">|</span>
                        <span>Available: <strong>{creditInfo.available}</strong></span>
                        <span className="text-amber-400">|</span>
                        <span>Shortfall: <strong className="text-red-600">{getTotalCreditsNeeded() - creditInfo.available}</strong></span>
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
                      <DialogTitle className="uppercase tracking-wider text-black">
                        Create New Candidate Pool
                      </DialogTitle>
                      <DialogDescription className="uppercase text-xs tracking-wider">
                        Add a name and candidate sources
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Pool Name */}
                      <div>
                        <Label htmlFor="listName" className="uppercase text-xs tracking-wider">
                          Candidate Pool Name <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="listName"
                          placeholder="e.g., Senior Frontend Developers"
                          value={createListFormData.name}
                          onChange={(e) => setCreateListFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-2 rounded-sm border-none transition-all duration-300 bg-white"
                          style={{
                            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                          }}
                        />
                      </div>

                      {/* Source Type Toggle */}
                      <div>
                        <Label className="uppercase text-xs tracking-wider">Source Type</Label>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setSourceEntryType('google_sheet')}
                            className={`flex-1 px-4 py-2 text-xs font-medium uppercase rounded transition-colors ${
                              sourceEntryType === 'google_sheet'
                                ? 'bg-[#222831] text-white'
                                : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                            }`}
                          >
                            Google Sheets
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceEntryType('manual_entry')}
                            className={`flex-1 px-4 py-2 text-xs font-medium uppercase rounded transition-colors ${
                              sourceEntryType === 'manual_entry'
                                ? 'bg-[#222831] text-white'
                                : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
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
                          <Label className="uppercase text-xs tracking-wider">Google Sheets Sources</Label>
                          {sheetUrlRows.some(r => r.status === 'valid') && (
                            <span className="text-xs font-medium text-green-600">
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
                                  className={`rounded-sm border-none transition-all duration-300 bg-white pr-24 ${
                                    row.status === 'valid' ? 'ring-2 ring-green-500' :
                                    row.status === 'error' ? 'ring-2 ring-red-500' : ''
                                  }`}
                                  style={{
                                    boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                                  }}
                                />
                                {/* Status indicator */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  {row.status === 'validating' && (
                                    <CircleNotch className="w-4 h-4 animate-spin text-[#222831]" />
                                  )}
                                  {row.status === 'valid' && (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      {row.candidateCount}
                                    </span>
                                  )}
                                  {row.status === 'error' && (
                                    <span className="text-xs text-red-600">
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
                                  className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                          className="text-[#222831] hover:text-[#393E46] uppercase text-xs mt-2"
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
                          <Label className="uppercase text-xs tracking-wider">Enter Candidates</Label>
                          {manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length > 0 && (
                            <span className="text-xs font-medium text-green-600">
                              {manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length} candidate{manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email)).length !== 1 ? 's' : ''} ready
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium px-1 mb-2">
                            <div className="col-span-5">Name <span className="text-red-600">*</span></div>
                            <div className="col-span-6">Email <span className="text-red-600">*</span></div>
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
                                      placeholder="John Doe"
                                      value={candidate.name}
                                      onChange={(e) => {
                                        setManualCandidates(prev => prev.map(c =>
                                          c.id === candidate.id ? { ...c, name: e.target.value } : c
                                        ));
                                      }}
                                      className={`rounded-sm border-none transition-all duration-300 bg-white text-sm ${showNameError ? 'ring-1 ring-red-500' : ''}`}
                                      style={{
                                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                                      }}
                                    />
                                    {showNameError && (
                                      <p className="text-xs text-red-500 mt-1">Name is required</p>
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
                                      className={`rounded-sm border-none transition-all duration-300 bg-white text-sm ${showEmailError ? 'ring-1 ring-red-500' : ''}`}
                                      style={{
                                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                                      }}
                                    />
                                    {showEmailError && (
                                      <p className="text-xs text-red-500 mt-1">Invalid email format</p>
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
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                            className="text-[#222831] hover:text-[#393E46] uppercase text-xs mt-2"
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
                        className="border-slate-300 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
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
                        className="bg-black hover:bg-slate-800 text-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
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
                        className={`px-4 py-2 text-sm font-medium uppercase rounded transition-colors ${
                          listViewType === 'existing'
                            ? 'bg-brand-primary text-white'
                            : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                        }`}
                      >
                        Candidate Pools
                      </button>
                      <button
                        onClick={() => {
                          setListViewType('shared');
                          loadAvailableLists('shared');
                        }}
                        className={`px-4 py-2 text-sm font-medium uppercase rounded transition-colors ${
                          listViewType === 'shared'
                            ? 'bg-brand-primary text-white'
                            : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                        }`}
                      >
                        Shared Candidate Pools
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Compact selection summary with info tooltip */}
                      {formData.selectedListIds.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-800">
                            {formData.selectedListIds.length} pool{formData.selectedListIds.length !== 1 ? 's' : ''} · {getEffectiveCandidateCount()} candidate{getEffectiveCandidateCount() !== 1 ? 's' : ''}
                          </span>
                          <div className="relative group">
                            <Info className="w-3.5 h-3.5 text-green-600 cursor-help" />
                            <div className="absolute right-0 top-6 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                              <div className="text-xs space-y-1.5">
                                <div className="font-medium text-gray-900">Selection Summary</div>
                                <div className="text-gray-600">
                                  {formData.selectedListIds.length} list{formData.selectedListIds.length !== 1 ? 's' : ''} selected
                                </div>
                                <div className="text-gray-600">
                                  {getEffectiveCandidateCount()} total candidates
                                  {isUsingDuplicateExcludedCount() && (
                                    <span className="text-green-600 ml-1">(duplicates excluded)</span>
                                  )}
                                </div>
                                {duplicateAnalysis && duplicateAnalysis.totalDuplicates > 0 && (
                                  <div className="text-amber-600">
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
                  {console.log('🔍 isLoadingLists:', isLoadingLists, 'availableLists:', availableLists.length)}
                  {isLoadingLists ? (
                    <div className="flex items-center justify-center py-8">
                      <CircleNotch className="w-6 h-6 animate-spin text-brand-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading candidate pools...</span>
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
                              className={`p-6 rounded cursor-pointer transition-all duration-200 min-h-[150px] w-52 flex-shrink-0 relative overflow-hidden ${
                                !isSelected ? 'group hover:text-white' : ''
                              }`}
                              style={{
                                border: isSelected ? '2px solid #22c55e' : 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                backgroundColor: 'transparent',
                                boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                                backgroundImage: isCurated
                                  ? 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))'
                                  : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#222831';
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
                                  <div className="absolute top-0 right-0 w-28 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 text-[10px] font-bold flex items-center justify-center shadow-lg transform rotate-45 translate-x-6 translate-y-2">
                                    Curated
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-col h-full">
                                <div className="mb-3">
                                  <h4 className={`font-medium text-sm transition-colors ${!isSelected ? 'group-hover:text-white' : ''}`}>{list.name}</h4>
                                  <p className={`text-[10px] text-gray-500 uppercase tracking-wider mt-1 transition-colors ${!isSelected ? 'group-hover:text-white/60' : ''}`}>
                                    #{list.id}
                                  </p>
                                </div>
                                {list.description && (
                                  <p className={`text-xs text-muted-foreground mb-3 line-clamp-2 transition-colors ${!isSelected ? 'group-hover:text-white/80' : ''}`}>{list.description}</p>
                                )}
                                <div className="mt-auto flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs text-muted-foreground transition-colors uppercase ${!isSelected ? 'group-hover:text-white/70' : ''}`}>
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
                                      <span className={`text-xs text-muted-foreground transition-colors uppercase ${!isSelected ? 'group-hover:text-white/70' : ''}`}>
                                        {list.sourcesCount} {list.sourcesCount === 1 ? 'Source' : 'Sources'}
                                      </span>
                                    )}
                                    {list.updatedAt && (
                                      <div className={`flex items-center gap-1 ${isCurated || listViewType === 'shared' ? 'ml-0' : 'ml-auto'}`}>
                                        <ClockCounterClockwise
                                          size={10}
                                          className={`transition-colors ${!isSelected ? 'text-gray-500 group-hover:text-white/60' : 'text-gray-500'}`}
                                        />
                                        <span className={`text-[8px] text-gray-500 transition-colors ${!isSelected ? 'group-hover:text-white/60' : ''}`}>
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
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center mt-4">
                          <div className="text-xs text-muted-foreground mb-2 uppercase">
                            Don't see the Candidate Pool you need?
                          </div>
                          <Button
                            onClick={() => {
                              console.log('🆕 Create New Candidate Pool clicked - opening form');
                              setShowCreateListForm(true);
                            }}
                            variant="outline"
                            className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white uppercase text-xs h-8 px-3 rounded-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create New Candidate Pool
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-center pt-16">
                      <div className="py-12 px-10 border-2 border-dashed border-gray-200 rounded-lg text-center max-w-md">
                        <div className="text-xs text-muted-foreground mb-4 uppercase">
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
                              className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white uppercase text-xs h-8 px-3 rounded-sm"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Create New Candidate Pool
                            </Button>
                            {/* Download Sample - priming UX */}
                            <div className="mt-6 pt-4 border-t border-gray-100">
                              <button
                                onClick={downloadSampleFormat}
                                className="text-muted-foreground hover:text-brand-primary uppercase text-xs font-medium transition-colors flex items-center gap-1 mx-auto"
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
                      className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                      style={{
                        width: '9em',
                        height: '3em',
                        fontSize: '15px',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#222831',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
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
                    className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                    style={{
                      minWidth: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'visible',
                      backgroundColor: '#222831',
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5em',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
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
                          return "Update Interview";
                        }
                        return selectedTemplate ? "Create & Start Interview" : "Create Interview";
                      }
                      return "Next";
                    })()}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {stepper.currentStep === steps.length - 1 && !isEditMode && !selectedTemplate && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
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

        {stepper.currentStep === 2 && (
          <div key="step-2">
          <Card
            className="border-0"
            style={{
              borderRadius: '0.5em',
              position: 'relative',
              boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={aiAvatar} alt="AI" className="w-12 h-12 rounded-full" />
                  <div>
                    <CardTitle className="uppercase font-light tracking-widest">
                      Voice Calibration
                    </CardTitle>
                    <CardDescription className="uppercase text-[10px] mt-1">
                      Customize the AI interviewer's voice characteristics
                    </CardDescription>
                  </div>
                </div>
                {isEditMode && <EditModeIndicator lastSavedAt={lastSavedAt} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Voice Type - Single Line */}
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider">Voice Type</Label>
                <div className="flex gap-3 mt-4">
                  {[
                    { 
                      value: "professional-male", 
                      label: "Professional Male",
                      icon: "👨‍💼",
                      disabled: true
                    },
                    { 
                      value: "professional-female", 
                      label: "Professional Female",
                      icon: "👩‍💼",
                      disabled: false
                    }
                  ].map((voice) => {
                    const isSelected = formData.voiceType === voice.value;
                    const isDisabled = voice.disabled;
                    return (
                      <div
                        key={voice.value}
                        className={`relative flex-1 p-3 rounded-lg border transition-all duration-200 ${
                          isDisabled 
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
                            : isSelected 
                              ? 'border-brand-primary bg-brand-primary/15 shadow-md cursor-pointer' 
                              : 'border-gray-200 bg-white hover:border-brand-primary/40 hover:shadow-sm hover:bg-gray-50/50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && setFormData(prev => ({ ...prev, voiceType: voice.value }))}
                      >
                        {isSelected && !isDisabled && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" weight="fill" />
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          <div className={`text-lg ${isDisabled ? 'opacity-30' : 'opacity-60'}`}>{voice.icon}</div>
                          <div className={`font-medium text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{voice.label}</div>
                        </div>
                        
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">Coming Soon</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Speaking Speed and Accent - Single Line */}
              <div className="grid grid-cols-2 gap-8">
                {/* Speaking Speed */}
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider">Speaking Speed</Label>
                  <div className="mt-4 max-w-sm">
                    <div className="relative flex items-start justify-between">
                      {/* Connecting Line - positioned at radio button level */}
                      <div className="absolute top-2 left-2 right-2 h-0.5 bg-gray-300 z-0"></div>
                      
                      {[
                        { value: "slow", label: "0.75x", display: "Slow" },
                        { value: "normal", label: "1x", display: "Normal" },
                        { value: "fast", label: "1.25x", display: "Fast" }
                      ].map((speed, index) => {
                        const isSelected = formData.voiceSpeed === speed.value;
                        return (
                          <div key={speed.value} className="relative z-10 flex flex-col items-center">
                            <label className="cursor-pointer flex flex-col items-center">
                              <input
                                type="radio"
                                name="voiceSpeed"
                                value={speed.value}
                                checked={isSelected}
                                onChange={(e) => setFormData(prev => ({ ...prev, voiceSpeed: e.target.value }))}
                                className="w-4 h-4 rounded-full bg-white border-2 border-gray-300 checked:border-brand-primary checked:bg-brand-primary focus:outline-none focus:ring-0 focus:ring-offset-0 appearance-none relative checked:after:content-[''] checked:after:w-2 checked:after:h-2 checked:after:rounded-full checked:after:bg-white checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:transform checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                              />
                              <span className="text-xs font-semibold text-gray-900 mt-2">{speed.label}</span>
                              <span className="text-xs text-gray-500 mt-1">{speed.display}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Accent with Audio Preview */}
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider">Accent</Label>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "indian", label: "Indian" },
                        { value: "american", label: "American" }
                      ].map((accent) => {
                        const isSelected = formData.voiceAccent === accent.value;
                        return (
                          <Button
                            key={accent.value}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`h-10 text-xs font-medium px-6 rounded uppercase transition-all duration-200 ${
                              isSelected ? 'text-white' : 'hover:text-white'
                            }`}
                            style={{
                              border: 'none',
                              position: 'relative',
                              overflow: 'hidden',
                              backgroundColor: isSelected ? '#222831' : 'transparent',
                              boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#393E46';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => setFormData(prev => ({ ...prev, voiceAccent: accent.value }))}
                          >
                            {accent.label}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {/* Audio Preview */}
                    {formData.voiceAccent && formData.voiceSpeed && (
                      <div className="flex items-center gap-6">
                        {/* Visual Synthesizer */}
                        {isPlayingAudio && (
                          <div className="flex items-center gap-2 h-6">
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-brand-primary rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 20 + 6}px`,
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                                }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Control Button */}
                        {!isPlayingAudio ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={playAudioPreview}
                            className="flex items-center gap-1 px-3 py-1 text-xs border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                          >
                            <Play className="w-3 h-3" weight="fill" />
                            Preview
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={stopAudioPreview}
                            className="flex items-center gap-1 px-3 py-1 text-xs border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Stop className="w-3 h-3" weight="fill" />
                            Stop
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
                      className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                      style={{
                        width: '9em',
                        height: '3em',
                        fontSize: '15px',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#222831',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
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
                    className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                    style={{
                      minWidth: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'visible',
                      backgroundColor: '#222831',
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5em',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
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
                          return "Update Interview";
                        }
                        return selectedTemplate ? "Create & Start Interview" : "Create Interview";
                      }
                      return "Next";
                    })()}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {stepper.currentStep === steps.length - 1 && !isEditMode && !selectedTemplate && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
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

        {stepper.currentStep === 3 && (
          <div key="step-3">
          <Card
            className="border-0"
            style={{
              borderRadius: '0.5em',
              position: 'relative',
              boxShadow: '3px 3px 6px #d0d0d0, -3px -3px 6px #ffffff'
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AddressBook size={48} weight="thin" />
                  <div>
                    <CardTitle className="uppercase font-light tracking-widest">
                      Communication Settings
                    </CardTitle>
                    <CardDescription className="uppercase text-[10px] mt-1">
                      Configure how candidates will be contacted and receive updates
                    </CardDescription>
                  </div>
                </div>
                {isEditMode && <EditModeIndicator lastSavedAt={lastSavedAt} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brand-primary" />
                  <div>
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Email Notifications</p>
                    <p className="text-xs text-foreground-muted mt-1">Send interview invites via email</p>
                  </div>
                </div>
                <Switch
                  checked={formData.communications.email}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    communications: { ...prev.communications, email: checked }
                  }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Phone Calls</p>
                      <p className="text-xs text-gray-400 mt-1">Enable phone-based interviews</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-sm uppercase tracking-wider">Coming Soon</span>
                  </div>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                  onCheckedChange={() => {}}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">SMS Messages</p>
                      <p className="text-xs text-gray-400 mt-1">Send reminders and updates via SMS</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-sm uppercase tracking-wider">Coming Soon</span>
                  </div>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                  onCheckedChange={() => {}}
                />
              </div>
              
              {/* Navigation */}
              <div className="flex items-start justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                  style={{
                    width: '9em',
                    height: '3em',
                    fontSize: '15px',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#222831',
                    boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                    textTransform: 'uppercase'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
                >
                  Previous
                </Button>
                <div className="flex flex-col items-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isCurrentStepValid || isSubmitting}
                    className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                    style={{
                      minWidth: '9em',
                      height: '3em',
                      fontSize: '15px',
                      border: 'none',
                      position: 'relative',
                      overflow: 'visible',
                      backgroundColor: '#222831',
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5em',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
                  >
                    {isSubmitting ? (
                      <>
                        <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      isEditMode ? "Update Interview" : (selectedTemplate ? "Create & Start Interview" : "Create Interview")
                    )}
                  </Button>
                  {/* Warning for new blueprint flow */}
                  {!isEditMode && !selectedTemplate && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
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
            <DialogTitle className="uppercase tracking-wider text-black">
              {overallProgress === 100
                ? (wasInterviewStarted ? 'INTERVIEW IS LIVE!' : 'INTERVIEW READY!')
                : `${isEditMode ? 'UPDATING' : 'CREATING'} INTERVIEW`}
            </DialogTitle>
            <DialogDescription className="uppercase tracking-wider text-xs">
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
                <span className="text-sm font-medium text-foreground uppercase tracking-wider">OVERALL PROGRESS</span>
                <span className="text-sm text-foreground-muted font-medium">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-[#222831] h-full transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Step Progress List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {progressSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    ) : step.status === 'active' ? (
                      <div className="w-5 h-5 bg-[#393E46] rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    ) : step.status === 'error' ? (
                      <div className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-200 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium uppercase tracking-wider ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'active' ? 'text-[#393E46]' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 mt-1">{step.description}</p>
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
              <DialogTitle className="text-xl font-bold text-[#222831] uppercase">
                Introducing Interview Blueprints
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Save time by using reusable Interview Blueprints from the Control Tower. Create once, use everywhere.
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
                    <div className="w-full flex-shrink-0">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <img
                          src={blueprintGuideImg1}
                          alt="Create Interview Blueprint"
                          className="w-full h-[420px] object-contain rounded-lg shadow-md"
                        />
                      </div>
                    </div>

                    {/* Slide 2 Image */}
                    <div className="w-full flex-shrink-0">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <img
                          src={blueprintGuideImg2}
                          alt="Edit Interview Blueprint"
                          className="w-full h-[420px] object-contain rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows - centered on image */}
                {blueprintGuideSlide > 0 && (
                  <button
                    onClick={() => setBlueprintGuideSlide(prev => prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <CaretLeft size={20} className="text-gray-700" />
                  </button>
                )}
                {blueprintGuideSlide < 1 && (
                  <button
                    onClick={() => setBlueprintGuideSlide(prev => prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <CaretRight size={20} className="text-gray-700" />
                  </button>
                )}
              </div>

              {/* Description text - outside the image container */}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${blueprintGuideSlide * 100}%)` }}
                >
                  <p className="w-full flex-shrink-0 mt-3 text-center text-sm text-gray-700">
                    <strong>Create reusable Interview Blueprints</strong> from the Control Tower to standardize your interview process across teams.
                  </p>
                  <p className="w-full flex-shrink-0 mt-3 text-center text-sm text-gray-700">
                    <strong>Customize blueprints</strong> to match your specific hiring needs. Edit topics, duration, and interview structure anytime.
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
                      blueprintGuideSlide === index ? 'bg-[#00ADB5]' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t">
            <Button
              onClick={handleCloseBlueprintGuide}
              className="w-full"
              style={{ backgroundColor: '#222831' }}
            >
              Got it, let's create an interview!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Edit Mode Indicator Component
function EditModeIndicator({ lastSavedAt }) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      {lastSavedAt && (
        <span className="text-success">
          ✓ Last saved: {lastSavedAt.toLocaleTimeString()}
        </span>
      )}
      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        <span className="text-xs font-medium">Edit Mode</span>
      </div>
    </div>
  );
}

// Multi-Source Candidate Manager Component for Interview Creation
function MultiSourceCandidateManager({ formData, setFormData, isEditMode, interviewId, initialSourceType }) {
  // Validate initial source type
  const validSourceTypes = ['google_sheet', 'excel_file', 'manual_entry'];
  const validInitialSourceType = initialSourceType && validSourceTypes.includes(initialSourceType) ? initialSourceType : null;
  
  const [showSourceSelector, setShowSourceSelector] = useState(!!validInitialSourceType);
  const [selectedSourceType, setSelectedSourceType] = useState(validInitialSourceType);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const sourceTypeOptions = [
    {
      type: 'google_sheet',
      title: 'Google Sheets',
      description: 'Import candidates from Google Sheets',
      icon: '📊',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      type: 'excel_file',
      title: 'Excel/CSV File',
      description: 'Upload Excel or CSV file with candidates',
      icon: '📄',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    }
  ];

  const handleAddSource = (sourceType) => {
    setSelectedSourceType(sourceType);
    setShowSourceSelector(true);
  };

  const handleSourceAdded = async (sourceData) => {
    if (isEditMode && interviewId) {
      // In edit mode, save directly to database
      try {
        const userToken = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews/${interviewId}/candidate-sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
            'user-id': (typeof user !== 'undefined' && user?.id) || '87c0388e-5f74-4a30-8e32-06869f852cc3'
          },
          body: JSON.stringify(sourceData)
        });

        if (response.ok) {
          const result = await response.json();
          // Add the new source with real ID to local state
          setFormData(prev => ({
            ...prev,
            candidateSources: [...prev.candidateSources, {
              id: result.sourceId, // Real ID from database
              ...sourceData,
              createdAt: new Date().toISOString()
            }]
          }));

          // Check for duplicate warnings
          if (result.duplicates_detected && result.duplicate_warning) {
            toast({
              title: "Source Added with Duplicates Detected",
              description: result.duplicate_warning,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Source Added",
              description: `${sourceData.name} has been added and saved.`
            });
          }
        } else {
          throw new Error('Failed to add source');
        }
      } catch (error) {
        toast({
          title: "Failed to Add Source",
          description: error.message || "Please try again.",
          variant: "destructive"
        });
        return; // Don't close modal on error
      }
    } else {
      // In create mode, just add to local state
      setFormData(prev => ({
        ...prev,
        candidateSources: [...prev.candidateSources, {
          id: `temp_${Date.now()}`, // Temporary ID for UI
          ...sourceData,
          createdAt: new Date().toISOString()
        }]
      }));

      toast({
        title: "Source Added",
        description: `${sourceData.name} has been added successfully.`
      });
    }
    
    setShowSourceSelector(false);
    setSelectedSourceType(null);
  };

  const handleDeleteSource = (sourceId, sourceName) => {
    const source = formData.candidateSources.find(s => s.id === sourceId);
    if (source) {
      setSourceToDelete(source);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteSource = async () => {
    if (!sourceToDelete) return;

    setIsDeleting(true);
    
    try {
      if (isEditMode && interviewId) {
        // In edit mode, delete from database
        const userToken = localStorage.getItem('auth_token');
        const userId = (typeof user !== 'undefined' && user?.id) || '87c0388e-5f74-4a30-8e32-06869f852cc3';
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidate-sources/${sourceToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'user-id': userId
          }
        });

        if (response.ok) {
          toast({
            title: "Source Removed",
            description: `${sourceToDelete.name} has been removed from the database.`
          });
          
          // Also remove from local state
          setFormData(prev => ({
            ...prev,
            candidateSources: prev.candidateSources.filter(source => source.id !== sourceToDelete.id)
          }));
        } else {
          throw new Error('Failed to remove source from database');
        }
      } else {
        // For creation mode, just remove from local state
        setFormData(prev => ({
          ...prev,
          candidateSources: prev.candidateSources.filter(source => source.id !== sourceToDelete.id)
        }));

        toast({
          title: "Source Removed",
          description: `${sourceToDelete.name} has been removed.`
        });
      }
      
      setShowDeleteModal(false);
      setSourceToDelete(null);
    } catch (error) {
      toast({
        title: "Failed to Remove Source",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTotalCandidates = () => {
    return formData.candidateSources.reduce((total, source) => total + (source.candidateCount || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Current Sources */}
      {formData.candidateSources.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Current Sources</h3>
            <span className="text-xs text-muted-foreground">
              {getTotalCandidates()} candidates from {formData.candidateSources.length} sources
            </span>
          </div>
          <div className="grid gap-3">
            {formData.candidateSources.map((source) => (
              <div key={source.id} className="bg-white rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">
                      {source.type === 'google_sheet' && '📊'}
                      {source.type === 'excel_file' && '📄'}
                      {source.type === 'manual_entry' && '✏️'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm text-foreground">{source.name}</h4>
                        <Badge 
                          variant={source.status === 'validated' ? 'default' : 'secondary'}
                          className={`text-xs ${
                            source.status === 'validated' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {source.status === 'validated' ? 'Validated' : 'Ready'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-foreground-muted">
                          {source.candidateCount} candidates • {source.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {source.metadata?.sheetUrl && (
                          <a 
                            href={source.metadata.sheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Sheet
                          </a>
                        )}
                        {source.metadata?.fileName && (
                          <span className="text-xs text-gray-600">
                            {source.metadata.fileName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                    onClick={() => handleDeleteSource(source.id, source.name)}
                  >
                    <Trash className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Source */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          {formData.candidateSources.length > 0 ? 'Add Another Source' : 'Add Candidate Sources'}
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          {sourceTypeOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleAddSource(option.type)}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${option.color}`}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <h4 className="font-semibold text-sm text-foreground mb-1">{option.title}</h4>
              <p className="text-xs text-foreground-muted">{option.description}</p>
            </button>
          ))}
        </div>
        
        {formData.candidateSources.length === 0 && (
          <div className="text-center p-4 text-xs text-muted-foreground">
            Choose one or more methods to add candidates to your interview
          </div>
        )}
      </div>

      {/* Source Selector Modal */}
      {showSourceSelector && (
        <SourceConfigModal
          sourceType={selectedSourceType}
          onClose={() => {
            setShowSourceSelector(false);
            setSelectedSourceType(null);
          }}
          onSave={handleSourceAdded}
          existingCandidateSources={formData.candidateSources}
          mainFormData={formData}
          uploadedFilePath={formData.candidateUpload?.gcpFilePath}
        />
      )}

      {/* Delete Confirmation Modal */}
      <SourceDeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSourceToDelete(null);
        }}
        onConfirm={confirmDeleteSource}
        sourceName={sourceToDelete?.name || ''}
        candidateCount={sourceToDelete?.candidateCount || 0}
        isDeleting={isDeleting}
      />
    </div>
  );
}


// Source Configuration Modal Component
function SourceConfigModal({ sourceType, onClose, onSave, existingCandidateSources = [], mainFormData, uploadedFilePath }) {
  const [formData, setFormData] = useState({
    name: '',
    googleSheetUrl: '',
    file: null,
    candidateCount: 0
  });

  const [isValid, setIsValid] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [columnMapping, setColumnMapping] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleValidation = (valid, data, mapping) => {
    setIsValid(valid);
    setValidationData(data);
    setColumnMapping(mapping || []);
    
    if (valid && data) {
      setFormData(prev => ({ 
        ...prev, 
        candidateCount: data.totalRows || 0 
      }));
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    setFormData(prev => ({ ...prev, file: selectedFile }));
  };

  const handleSave = async () => {
    // For manual entry, we don't need validation data
    if (sourceType !== 'manual_entry' && (!isValid || !validationData)) {
      return;
    }

    setIsProcessing(true);

    try {
      // Auto-generate names for all source types
      let sourceName;
      if (sourceType === 'google_sheet') {
        // Use sheet name from validation data if available, otherwise fallback to sheet ID
        if (validationData?.sheet_info?.sheet_name) {
          sourceName = validationData.sheet_info.sheet_name;
        } else {
          // Fallback: Extract sheet ID from URL
          const urlMatch = formData.googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          const sheetId = urlMatch ? urlMatch[1].substring(0, 8) : 'sheet';
          sourceName = `Google Sheet (${sheetId}...)`;
        }
      } else if (sourceType === 'excel_file' && formData.file) {
        // Use filename without extension
        const fileName = formData.file.name.replace(/\.[^/.]+$/, "");
        sourceName = fileName;
      } else {
        // Manual entry - generate unique name based on existing sources
        const existingManualSources = existingCandidateSources.filter(s => s.type === 'manual_entry');
        sourceName = `Manual Entry ${existingManualSources.length + 1}`;
      }

      const sourceData = {
        type: sourceType,
        name: sourceName,
        candidateCount: sourceType === 'manual_entry' ? 0 : validationData.totalRows,
        status: sourceType === 'manual_entry' ? 'ready' : 'validated',
        metadata: sourceType === 'manual_entry' ? {} : {
          columnMapping: columnMapping,
          totalCandidates: validationData.totalRows
        }
      };

      if (sourceType === 'google_sheet') {
        sourceData.metadata.sheetUrl = formData.googleSheetUrl;
      } else if (sourceType === 'excel_file') {
        if (formData.file) {
          sourceData.metadata.fileName = formData.file.name;
          sourceData.metadata.fileSize = formData.file.size;
        }
        // FIXED: Use GCS URL from validation data (FilePreview upload) or main form data
        const gcpFilePath = validationData?.gcsUrl || 
                           mainFormData?.candidateUpload?.gcpFilePath || 
                           uploadedFilePath;
        if (gcpFilePath) {
          sourceData.metadata.file_path = gcpFilePath;
          sourceData.metadata.gcs_url = gcpFilePath;  // Also set gcs_url
          console.log(`🔗 Setting file paths for CSV source: ${gcpFilePath}`);
        } else {
          console.warn('⚠️ No GCP file path available for CSV source');
        }
      }

      await onSave(sourceData);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed bg-black/70 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        margin: 0,
        padding: '16px'
      }}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-[#222831]">
            Configure {sourceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-600 hover:text-[#222831] hover:bg-gray-100">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">

          {sourceType === 'google_sheet' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheetUrl" className="text-[#222831] mb-2 block">Google Sheets URL</Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  value={formData.googleSheetUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleSheetUrl: e.target.value }))}
                  className="bg-white border-gray-300 text-[#222831] placeholder:text-gray-400 focus:border-[#948979] focus:ring-[#948979]"
                />
              </div>

              <GoogleSheetsPreview
                url={formData.googleSheetUrl}
                onValidation={handleValidation}
                className="mt-4"
              />
            </div>
          )}

          {sourceType === 'excel_file' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fileUpload" className="text-[#222831] mb-2 block">Upload Excel/CSV File</Label>
                <div className="mt-2">
                  <input
                    id="fileUpload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-600
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#948979] file:text-white
                      hover:file:bg-[#948979]/90"
                  />
                </div>
              </div>

              <FilePreview
                file={formData.file}
                onValidation={handleValidation}
                className="mt-4"
              />
            </div>
          )}

          {sourceType === 'manual_entry' && (
            <div className="p-5 bg-[#DFD0B8]/30 rounded-lg border border-[#948979]/30">
              <p className="text-sm text-gray-600 mb-2">
                Manual entry mode allows you to add candidates one by one during the interview process.
              </p>
              <p className="text-sm font-medium text-[#222831]">
                This source will be created and ready for manual candidate addition.
              </p>
            </div>
          )}

          {isValid && validationData && (
            <div className="p-5 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Validation Successful
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Found {validationData.totalRows} candidates ready to import
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-[#222831]">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#948979] hover:bg-[#948979]/90 text-white font-semibold border-0 shadow-md"
            disabled={isProcessing || (sourceType !== 'manual_entry' && (!isValid || !validationData))}
          >
            {isProcessing ? (
              <>
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                Adding Source...
              </>
            ) : (
              'Add Source'
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}

// Utility functions for generating step navigation URLs
export const generateStepURL = (interviewId, step, sourceType = null) => {
  const baseUrl = `/interviews/create`;
  const params = new URLSearchParams();
  
  if (interviewId) {
    params.append('edit', interviewId);
  }
  
  if (step > 0) {
    params.append('step', step.toString());
  }
  
  if (sourceType && ['google_sheet', 'excel_file', 'manual_entry'].includes(sourceType)) {
    params.append('source', sourceType);
  }
  
  return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
};

// Helper function specifically for adding candidates to step 2 (Lists)
export const generateAddCandidatesURL = (interviewId, sourceType = null) => {
  return generateStepURL(interviewId, 2, sourceType);
};