import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useParticleBurst } from "@/hooks/useParticleBurst";
import { WalkingLoader } from '@/components/ui/WalkingLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Target,
  Download,
  CheckCircle,
  Loader2,
  Search,
  Info,
  Sparkles,
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Star,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/contexts/AuthContext";
import { SourceManager } from '@/components/sources/SourceManager';
import { SourceConfigModal } from '@/components/sources/SourceConfigModal';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { listsApi, CandidateList, CandidateSource, DeleteImpact } from '@/services/listsApi';
import { qualifiedListsApi, QualifiedList } from '@/services/qualifiedListsApi';
import { duplicateDetectionApi, DuplicateAnalysis } from '@/services/duplicateDetectionApi';
import { ListCard } from "@/components/analytics/ListCard";
import { EmptyListCard } from "@/components/analytics/EmptyListCard";
import { ScoreDistributionChart } from "@/components/analytics/ScoreDistributionChart";
import { AnalyticsList, AnalyticsCandidate } from "@/types/analytics";
import { scoreAnalyticsApi, CandidateScore } from '@/services/scoreAnalyticsApi';

// Additional types for form state
interface FormData {
  name: string;
  description: string;
  sources: CandidateSource[];
}

export default function Lists() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { createParticleBurst } = useParticleBurst();
  const cardRefsRef = useRef<Record<string, HTMLDivElement>>({});

  // State management
  const [lists, setLists] = useState<CandidateList[]>([]);
  const [qualifiedLists, setQualifiedLists] = useState<QualifiedList[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyticsPanelOpen, setIsAnalyticsPanelOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [allCandidates, setAllCandidates] = useState<AnalyticsCandidate[]>([]);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicate detection states for edit dialog - Email-only duplicate detection
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Track which lists are currently being analyzed for duplicates
  const [analyzingListIds, setAnalyzingListIds] = useState<Set<string>>(new Set());

  // Track which lists are loading enhancement data
  const [enhancementLoadingIds, setEnhancementLoadingIds] = useState<Set<string>>(new Set());
  const [listEnhancements, setListEnhancements] = useState<Record<string, any>>({});

  // Track sources for each list
  const [listSources, setListSources] = useState<Record<string, CandidateSource[]>>({});

  // Track which list is adding a source
  const [addingSourceForList, setAddingSourceForList] = useState<string | null>(null);

  // Cache key for duplicate insights
  const DUPLICATE_CACHE_KEY = 'duplicate_insights_cache';
  const CACHE_EXPIRY_HOURS = 24;

  // Helper functions for caching duplicate insights
  const getCachedInsights = (listId: string) => {
    try {
      const cache = localStorage.getItem(DUPLICATE_CACHE_KEY);
      if (!cache) return null;

      const parsed = JSON.parse(cache);
      const listCache = parsed[listId];

      if (!listCache) return null;

      // Check if cache is expired
      const now = new Date();
      const cacheTime = new Date(listCache.timestamp);
      const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > CACHE_EXPIRY_HOURS) {
        return null;
      }

      return listCache.insights;
    } catch (error) {
      console.error('Error reading duplicate insights cache:', error);
      return null;
    }
  };

  const setCachedInsights = (listId: string, insights: any) => {
    try {
      const cache = localStorage.getItem(DUPLICATE_CACHE_KEY);
      const parsed = cache ? JSON.parse(cache) : {};

      parsed[listId] = {
        insights,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(DUPLICATE_CACHE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error caching duplicate insights:', error);
    }
  };

  // Progress modal state
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<Array<{
    id: string;
    title: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    message?: string;
  }>>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // Form state for creating/editing lists
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sources: []
  });

  // Scroll handling for Lovable UI
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setIsScrolled(mainContentRef.current.scrollTop > 20);
      }
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Load lists from backend on component mount
  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);

      // Fetch regular lists and qualified lists separately
      const [regularLists, qualifiedListsFromAPI] = await Promise.all([
        listsApi.getLists(),
        qualifiedListsApi.getQualifiedLists()
      ]);

      // Initialize lists with cached insights if available
      const listsWithInsights = regularLists.map(list => {
        const cachedInsights = getCachedInsights(list.id);
        if (cachedInsights) {
          console.log(`📋 Loaded cached duplicate insights for list "${list.name}": ${cachedInsights.totalDuplicates} duplicates`);
        }
        return {
          ...list,
          duplicateInsights: cachedInsights,
          isAnalyzingDuplicates: false
        };
      });

      setLists(listsWithInsights);
      setQualifiedLists(qualifiedListsFromAPI);

      // Start background duplicate analysis for eligible lists
      analyzeDuplicatesForLists(listsWithInsights);

      // Start loading enhancement data for all lists (both regular and qualified in parallel)
      enhanceListsData(listsWithInsights, qualifiedListsFromAPI);

      // Load sources for all lists
      loadSourcesForLists([...listsWithInsights, ...qualifiedListsFromAPI]);

      // Fetch all candidate scores for analytics
      try {
        console.log('📊 Fetching candidate scores for analytics...');
        const scores = await scoreAnalyticsApi.getAllScores();

        // Transform scores to AnalyticsCandidate format
        const candidates: AnalyticsCandidate[] = scores.map(score => ({
          id: score.candidate_id,
          name: score.candidate_name || 'Unknown',
          email: score.candidate_email || '',
          stage: 'screening' as const,
          scores: {
            overall: score.ai_interview_score || score.ats_score || 0,
            ats: score.ats_score || 0,
            interview: score.ai_interview_score || 0
          },
          profilePicture: undefined
        }));

        setAllCandidates(candidates);
        console.log(`✅ Loaded ${candidates.length} candidate scores for analytics`);

      } catch (error) {
        console.error('Error fetching candidate scores:', error);
        toast({
          title: "Score Loading Failed",
          description: "Could not load candidate scores for analytics.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error loading lists:', error);
      toast({
        title: "Error Loading Lists",
        description: "Failed to load candidate lists from server.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      // Open analytics panel after loading completes
      setTimeout(() => setIsAnalyticsPanelOpen(true), 300);
    }
  };

  // Load enhancement data for all lists (OPTIMIZED: batch API calls in parallel)
  const enhanceListsData = async (regularLists: CandidateList[], qualifiedLists: QualifiedList[]) => {
    console.log(`✨ Starting batch enhancement for ${regularLists.length} regular + ${qualifiedLists.length} qualified lists`);

    if (regularLists.length === 0 && qualifiedLists.length === 0) return;

    try {
      // Extract IDs
      const regularListIds = regularLists.map(l => l.id);
      const qualifiedListIds = qualifiedLists.map(l => l.id);

      // Mark all lists as loading
      const allListIds = [...regularListIds, ...qualifiedListIds];
      setEnhancementLoadingIds(new Set(allListIds));

      // Parallel batch API calls for regular and qualified lists
      console.log(`📡 Making parallel batch API calls: ${regularListIds.length} regular, ${qualifiedListIds.length} qualified...`);
      const [regularEnhancements, qualifiedEnhancements] = await Promise.all([
        regularListIds.length > 0 ? listsApi.enhanceListsBatch(regularListIds) : Promise.resolve({}),
        qualifiedListIds.length > 0 ? qualifiedListsApi.enhanceBatch(qualifiedListIds) : Promise.resolve({})
      ]);

      console.log(`✅ Received enhancements: ${Object.keys(regularEnhancements).length} regular, ${Object.keys(qualifiedEnhancements).length} qualified`);

      // Merge both enhancement results
      setListEnhancements(prev => ({
        ...prev,
        ...regularEnhancements,
        ...qualifiedEnhancements
      }));

      console.log(`✅ Enhanced ${Object.keys(regularEnhancements).length + Object.keys(qualifiedEnhancements).length} lists total`);
    } catch (error) {
      console.error(`❌ Error batch enhancing lists:`, error);
    } finally {
      // Clear all loading states
      setEnhancementLoadingIds(new Set());
    }
  };

  // Load sources for all lists
  const loadSourcesForLists = async (listsToLoad: (CandidateList | QualifiedList)[]) => {
    console.log(`📂 Loading sources for ${listsToLoad.length} lists`);

    // Process lists concurrently in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < listsToLoad.length; i += BATCH_SIZE) {
      const batch = listsToLoad.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(list => loadSourcesForSingleList(list.id))
      );
    }
  };

  // Load sources for a single list
  const loadSourcesForSingleList = async (listId: string) => {
    try {
      console.log(`📂 Loading sources for list ${listId}...`);
      const sources = await listsApi.getListSources(listId);
      console.log(`✅ Loaded ${sources.length} sources for list ${listId}`);

      setListSources(prev => ({
        ...prev,
        [listId]: sources
      }));
    } catch (error) {
      console.error(`❌ Error loading sources for list ${listId}:`, error);
      // Set empty array on error
      setListSources(prev => ({
        ...prev,
        [listId]: []
      }));
    }
  };

  // Handle syncing a source
  const handleSyncSource = async (listId: string, sourceId: string) => {
    try {
      console.log(`🔄 Syncing source ${sourceId} for list ${listId}...`);

      // Call the sync API endpoint
      const result = await listsApi.syncNewCandidatesFromSource(listId, sourceId);

      console.log(`✅ Sync completed:`, result);

      toast({
        title: "Source Synced",
        description: result.message || `Added ${result.addedCandidates} new candidates`,
      });

      // Reload list data to reflect the changes
      await loadLists();
    } catch (error) {
      console.error(`❌ Error syncing source ${sourceId}:`, error);
      throw error; // Re-throw to let ListCard handle the error
    }
  };

  // Handle adding a source to a list
  const handleAddSource = (listId: string) => {
    setAddingSourceForList(listId);
  };

  // Handle source config save
  const handleSourceConfigSave = async (sourceData: any) => {
    if (!addingSourceForList) return;

    try {
      // Add the source to the list
      await listsApi.addSourceToList(addingSourceForList, sourceData);

      toast({
        title: "Source Added",
        description: "Google Sheet source has been added successfully.",
      });

      // Reload lists to show the new source
      await loadLists();

      // Close the modal
      setAddingSourceForList(null);
    } catch (error) {
      console.error("Error adding source:", error);
      toast({
        title: "Error Adding Source",
        description: error instanceof Error ? error.message : "Failed to add source.",
        variant: "destructive"
      });
    }
  };

  // Batch analyze duplicates for multiple lists
  const analyzeDuplicatesForLists = async (listsToAnalyze: CandidateList[]) => {
    // Filter lists that need analysis (2+ sources and no recent cache)
    const eligibleLists = listsToAnalyze.filter(list => {
      const hasMultipleSources = (list.sourcesCount || 0) >= 2;
      const hasRecentCache = list.duplicateInsights !== null;
      return hasMultipleSources && !hasRecentCache;
    });

    if (eligibleLists.length === 0) return;

    console.log(`🔍 Starting background duplicate analysis for ${eligibleLists.length} lists`);

    // Limit concurrent analysis to avoid overwhelming the API
    const BATCH_SIZE = 3;
    for (let i = 0; i < eligibleLists.length; i += BATCH_SIZE) {
      const batch = eligibleLists.slice(i, i + BATCH_SIZE);

      // Process batch concurrently
      await Promise.all(
        batch.map(list => analyzeSingleListInBackground(list.id))
      );

      // Small delay between batches to be API-friendly
      if (i + BATCH_SIZE < eligibleLists.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // Background analysis for a single list (no UI feedback, just caching)
  const analyzeSingleListInBackground = async (listId: string) => {
    try {
      // Mark as analyzing
      setLists(prev => prev.map(list =>
        list.id === listId
          ? { ...list, isAnalyzingDuplicates: true }
          : list
      ));

      const analysis = await duplicateDetectionApi.analyzeSingleListDuplicates(listId);

      // Create insights object
      const insights = {
        totalDuplicates: analysis.totalDuplicates,
        uniqueCandidates: analysis.uniqueCandidates,
        duplicateRate: analysis.duplicateRate,
        lastAnalyzed: new Date().toISOString(),
        hasMultipleSources: true
      };

      // Cache the insights
      setCachedInsights(listId, insights);

      // Update the list with insights
      setLists(prev => prev.map(list =>
        list.id === listId
          ? {
              ...list,
              duplicateInsights: insights,
              isAnalyzingDuplicates: false
            }
          : list
      ));

      console.log(`✅ Completed duplicate analysis for list ${listId}: ${analysis.totalDuplicates} duplicates found`);

    } catch (error) {
      console.error(`❌ Failed duplicate analysis for list ${listId}:`, error);

      // Mark as not analyzing
      setLists(prev => prev.map(list =>
        list.id === listId
          ? { ...list, isAnalyzingDuplicates: false }
          : list
      ));
    }
  };

  // Email-only duplicate detection function
  const analyzeDuplicates = async (listId: string) => {
    if (!listId) {
      setDuplicateAnalysis(null);
      setShowDuplicateWarning(false);
      return;
    }

    try {
      setIsAnalyzingDuplicates(true);
      console.log('🔍 Analyzing email duplicates for list:', listId);
      const analysis = await duplicateDetectionApi.analyzeSingleListDuplicates(listId);
      setDuplicateAnalysis(analysis);

      // Show warning if duplicates detected
      if (analysis.totalDuplicates > 0) {
        setShowDuplicateWarning(true);
        toast({
          title: "Email Duplicates Detected",
          description: `Found ${analysis.totalDuplicates} email duplicates across ${analysis.listAnalysis[0]?.sources.length || 0} sources.`,
          variant: "destructive"
        });
      } else {
        setShowDuplicateWarning(false);
        toast({
          title: "No Duplicates Found",
          description: "No email duplicates detected in this list.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
      toast({
        title: "Duplicate Analysis Failed",
        description: "Could not analyze duplicates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingDuplicates(false);
    }
  };

  const handleCreateList = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a list name.",
        variant: "destructive"
      });
      return;
    }

    // Initialize progress steps
    const steps = [
      { id: 'validate', title: 'Validating list details', status: 'pending' as const },
      { id: 'create', title: 'Creating list', status: 'pending' as const },
      ...(formData.sources.length > 0 ? [{ id: 'sources', title: `Adding ${formData.sources.length} source${formData.sources.length !== 1 ? 's' : ''}`, status: 'pending' as const }] : []),
      { id: 'finalize', title: 'Finalizing setup', status: 'pending' as const }
    ];

    setProgressSteps(steps);
    setOverallProgress(0);
    setProgressModalOpen(true);
    setLoading(true);

    try {
      // Step 1: Validate
      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'active' } : step
      ));
      setOverallProgress(10);

      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'completed', message: 'List details validated' } : step
      ));
      setOverallProgress(25);

      // Step 2: Create the list
      setProgressSteps(prev => prev.map(step =>
        step.id === 'create' ? { ...step, status: 'active' } : step
      ));

      const listId = await listsApi.createList({
        name: formData.name,
        description: formData.description
      });

      setProgressSteps(prev => prev.map(step =>
        step.id === 'create' ? { ...step, status: 'completed', message: 'List created successfully' } : step
      ));
      setOverallProgress(formData.sources.length > 0 ? 50 : 75);

      // Step 3: Add sources (if any)
      if (formData.sources.length > 0) {
        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'active' } : step
        ));

        for (let i = 0; i < formData.sources.length; i++) {
          const source = formData.sources[i];
          await listsApi.addSourceToList(listId, {
            type: source.type,
            metadata: source.metadata || {},
            name: source.name
          });

          const sourceProgress = 50 + (20 / formData.sources.length) * (i + 1);
          setOverallProgress(sourceProgress);
        }

        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'completed', message: `${formData.sources.length} source${formData.sources.length !== 1 ? 's' : ''} added` } : step
        ));
        setOverallProgress(75);
      }

      // Step 4: Finalize
      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'active' } : step
      ));

      // Reload lists to get updated data
      await loadLists();

      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'completed', message: 'List ready to use' } : step
      ));
      setOverallProgress(100);

      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      setFormData({ name: '', description: '', sources: [] });
      setIsCreating(false);

      toast({
        title: "List Created",
        description: `"${formData.name}" has been created successfully.`
      });
    } catch (error) {
      console.error('Error creating list:', error);

      // Mark current active step as error
      setProgressSteps(prev => prev.map(step =>
        step.status === 'active' ? { ...step, status: 'error', message: 'Failed to complete step' } : step
      ));

      toast({
        title: "Error Creating List",
        description: error instanceof Error ? error.message : "Failed to create list.",
        variant: "destructive"
      });

      // Close progress modal after error
      setTimeout(() => {
        setProgressModalOpen(false);
        setProgressSteps([]);
        setOverallProgress(0);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      setLoading(true);

      // Check if this is a qualified list
      const isQualifiedList = qualifiedLists.some(list => list.id === listId);

      if (isQualifiedList) {
        // For qualified lists, create a simple impact object
        const qualifiedList = qualifiedLists.find(list => list.id === listId);
        const impact = {
          listName: qualifiedList?.name || 'Unknown',
          affectedInterviews: [],
          sourcesToDelete: qualifiedList?.sourcesCount || 0,
          totalCandidates: qualifiedList?.totalCandidates || 0,
          canDelete: true,
          sources: []
        };

        setDeleteImpact(impact);
        setDeletingListId(listId);
        setShowDeleteModal(true);
      } else {
        // Get impact analysis for regular lists
        const impact = await listsApi.getDeleteImpact(listId);
        setDeleteImpact(impact);
        setDeletingListId(listId);
        setShowDeleteModal(true);
      }
    } catch (error) {
      console.error('Error getting delete impact:', error);
      toast({
        title: "Error",
        description: "Failed to analyze delete impact. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async (forceDelete: boolean) => {
    if (!deleteImpact || !deletingListId) return;

    // Close the confirmation modal and show progress modal
    setShowDeleteModal(false);

    // Initialize progress steps with simple language
    const steps = [
      { id: 'backup', title: 'Backing up list', status: 'pending' as const },
      ...(deleteImpact.sourcesToDelete > 0 ? [{ id: 'sources', title: `Removing ${deleteImpact.sourcesToDelete} source${deleteImpact.sourcesToDelete !== 1 ? 's' : ''}`, status: 'pending' as const }] : []),
      ...(forceDelete && deleteImpact.affectedInterviews.length > 0 ? [{ id: 'interviews', title: `Updating ${deleteImpact.affectedInterviews.length} interview${deleteImpact.affectedInterviews.length !== 1 ? 's' : ''}`, status: 'pending' as const }] : []),
      { id: 'cleanup', title: 'Finishing up', status: 'pending' as const }
    ];

    setProgressSteps(steps);
    setOverallProgress(0);
    setProgressModalOpen(true);
    setIsDeleting(true);

    try {
      // Step 1: Backing up list
      setProgressSteps(prev => prev.map(step =>
        step.id === 'backup' ? { ...step, status: 'active' } : step
      ));
      setOverallProgress(20);

      await new Promise(resolve => setTimeout(resolve, 800)); // Show backing up

      setProgressSteps(prev => prev.map(step =>
        step.id === 'backup' ? { ...step, status: 'completed', message: 'List data saved' } : step
      ));
      setOverallProgress(40);

      // Step 2: Remove sources (if any)
      if (deleteImpact.sourcesToDelete > 0) {
        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'active' } : step
        ));

        await new Promise(resolve => setTimeout(resolve, 600)); // Show removing sources

        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'completed', message: 'Sources removed' } : step
        ));
        setOverallProgress(forceDelete && deleteImpact.affectedInterviews.length > 0 ? 60 : 80);
      }

      // Step 3: Update interviews (force delete only)
      if (forceDelete && deleteImpact.affectedInterviews.length > 0) {
        setProgressSteps(prev => prev.map(step =>
          step.id === 'interviews' ? { ...step, status: 'active' } : step
        ));

        await new Promise(resolve => setTimeout(resolve, 700)); // Show updating interviews

        setProgressSteps(prev => prev.map(step =>
          step.id === 'interviews' ? { ...step, status: 'completed', message: 'Interviews updated' } : step
        ));
        setOverallProgress(80);
      }

      // Step 4: Finishing up - actual deletion
      setProgressSteps(prev => prev.map(step =>
        step.id === 'cleanup' ? { ...step, status: 'active' } : step
      ));

      // Check if this is a qualified list
      const isQualifiedList = qualifiedLists.some(list => list.id === deletingListId);

      if (isQualifiedList) {
        await qualifiedListsApi.deleteQualifiedList(deletingListId);
      } else {
        if (forceDelete) {
          await listsApi.forceDeleteList(deletingListId);
        } else {
          await listsApi.deleteList(deletingListId);
        }
      }

      setProgressSteps(prev => prev.map(step =>
        step.id === 'cleanup' ? { ...step, status: 'completed', message: 'List deleted' } : step
      ));
      setOverallProgress(100);

      // Wait to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close progress modal first
      setProgressModalOpen(false);
      setProgressSteps([]);
      setOverallProgress(0);

      // Trigger particle burst animation if card ref exists
      const cardElement = cardRefsRef.current[deletingListId];
      if (cardElement) {
        createParticleBurst(cardElement, {
          count: 80,
          colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', '#8b5cf6', '#ec4899'],
          duration: 800
        });

        // Fade out the card while particles animate
        cardElement.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Cleanup and reload
      await loadLists();
      setDeleteImpact(null);
      setDeletingListId(null);

      toast({
        title: "List Deleted",
        description: `"${deleteImpact?.listName}" has been deleted.`
      });
    } catch (error) {
      console.error('Error deleting list:', error);

      // Mark current active step as error
      setProgressSteps(prev => prev.map(step =>
        step.status === 'active' ? { ...step, status: 'error', message: 'Something went wrong' } : step
      ));

      toast({
        title: "Error Deleting List",
        description: error instanceof Error ? error.message : "Failed to delete list.",
        variant: "destructive"
      });

      // Close progress modal after error
      setTimeout(() => {
        setProgressModalOpen(false);
        setProgressSteps([]);
        setOverallProgress(0);
      }, 2000);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteImpact(null);
    setDeletingListId(null);
  };

  const handleEditList = async (listId: string) => {
    const listToEdit = lists.find(list => list.id === listId);
    if (!listToEdit) return;

    try {
      // Load sources for this list
      const sources = await listsApi.getListSources(listId);

      setFormData({
        name: listToEdit.name,
        description: listToEdit.description || '',
        sources: sources
      });
      setEditingList(listId);
      setIsCreating(true);
    } catch (error) {
      console.error('Error loading list sources:', error);
      toast({
        title: "Error Loading List",
        description: "Failed to load list details for editing.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateList = async () => {
    if (!editingList || !formData.name.trim()) return;

    // Initialize progress steps for update
    const steps = [
      { id: 'validate', title: 'Validating changes', status: 'pending' as const },
      { id: 'update', title: 'Updating list details', status: 'pending' as const },
      { id: 'finalize', title: 'Finalizing changes', status: 'pending' as const }
    ];

    setProgressSteps(steps);
    setOverallProgress(0);
    setProgressModalOpen(true);
    setLoading(true);

    try {
      // Step 1: Validate
      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'active' } : step
      ));
      setOverallProgress(15);

      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'completed', message: 'Changes validated' } : step
      ));
      setOverallProgress(33);

      // Step 2: Update list basic info
      setProgressSteps(prev => prev.map(step =>
        step.id === 'update' ? { ...step, status: 'active' } : step
      ));

      await listsApi.updateList(editingList, {
        name: formData.name,
        description: formData.description
      });

      setProgressSteps(prev => prev.map(step =>
        step.id === 'update' ? { ...step, status: 'completed', message: 'List details updated' } : step
      ));
      setOverallProgress(66);

      // Step 3: Finalize
      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'active' } : step
      ));

      // Reload lists to get updated data
      await loadLists();

      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'completed', message: 'List ready to use' } : step
      ));
      setOverallProgress(100);

      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      setFormData({ name: '', description: '', sources: [] });
      setIsCreating(false);
      setEditingList(null);

      toast({
        title: "List Updated",
        description: "List has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating list:', error);

      // Mark current active step as error
      setProgressSteps(prev => prev.map(step =>
        step.status === 'active' ? { ...step, status: 'error', message: 'Failed to complete step' } : step
      ));

      toast({
        title: "Error Updating List",
        description: error instanceof Error ? error.message : "Failed to update list.",
        variant: "destructive"
      });

      // Close progress modal after error
      setTimeout(() => {
        setProgressModalOpen(false);
        setProgressSteps([]);
        setOverallProgress(0);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSourcesChange = (newSources: CandidateSource[]) => {
    setFormData(prev => ({
      ...prev,
      sources: newSources
    }));

    // If editing an existing list and we have multiple sources, analyze for duplicates
    if (editingList && newSources.length > 1) {
      // Debounce duplicate analysis to avoid too many API calls
      setTimeout(() => {
        analyzeDuplicates(editingList);
      }, 1000);
    }
  };

  const downloadSampleFormat = () => {
    // Create a direct link to the sample CSV file in public folder
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

  const handleViewList = (listId: string) => {
    navigate(`/lists/${listId}`);
  };

  // Lovable UI helpers
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredQualifiedLists = qualifiedLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCandidates = lists.reduce((sum, list) => sum + (list.totalCandidates || 0), 0) +
    qualifiedLists.reduce((sum, list) => sum + (list.totalCandidates || 0), 0);
  const totalLists = lists.length + qualifiedLists.length;
  const allStarred = Object.values(listEnhancements).reduce((sum, enhancement) => sum + (enhancement?.starredCount || 0), 0);
  const avgDiversity = 0;

  const userName = user?.name?.split(' ')[0] || 'there';

  // Transform lists to AnalyticsList format for ListCard component
  const transformedLists: AnalyticsList[] = lists.map((list) => {
    const enhancement = listEnhancements[list.id];
    const isLoading = enhancementLoadingIds.has(list.id);

    // Map sampleCandidates from enhancement or use empty array
    const candidates = enhancement?.sampleCandidates
      ? enhancement.sampleCandidates.map((candidate: any) => ({
          ...candidate,
          stage: 'screening' as const,
          scores: { overall: 75 },
          profilePicture: undefined
        }))
      : [];

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: undefined, // Will be auto-generated from name
      candidates: candidates,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || list.createdAt,
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: (list.usedInInterviews || []).length, // Count interviews from usedInInterviews array
      starredCount: enhancement?.starredCount || 0,
      averageScore: 0,
      topSkills: [], // TODO: Get from analytics API
      aiInsights: enhancement?.aiInsights || {
        summary: isLoading ? undefined : '',
        recommendations: []
      },
      isEnhancementLoading: isLoading
    };
  });

  // Transform qualified lists to AnalyticsList format
  const transformedQualifiedLists: AnalyticsList[] = qualifiedLists.map((list) => {
    const enhancement = listEnhancements[list.id];
    const isLoading = enhancementLoadingIds.has(list.id);

    // Map sampleCandidates from enhancement or use empty array
    const candidates = enhancement?.sampleCandidates
      ? enhancement.sampleCandidates.map((candidate: any) => ({
          ...candidate,
          stage: 'screening' as const,
          scores: { overall: 75 },
          profilePicture: undefined
        }))
      : [];

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: '#f59e0b', // Amber/gold color for qualified lists
      candidates: candidates,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || list.createdAt,
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: (list.usedInInterviews || []).length, // Count interviews from usedInInterviews array
      starredCount: enhancement?.starredCount || 0,
      averageScore: 0,
      topSkills: [],
      aiInsights: enhancement?.aiInsights || {
        summary: isLoading ? undefined : '',
        recommendations: []
      },
      isEnhancementLoading: isLoading,
      isQualified: true // Add marker for qualified lists
    };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main
        ref={mainContentRef}
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          <div className="h-screen flex items-center justify-center bg-background flex-1">
            <div className="flex flex-col items-center">
              <WalkingLoader />
              <p className="text-muted-foreground mt-6">Loading lists...</p>
            </div>
          </div>
        ) : (
          <div className="w-full px-6 pt-2 pb-8 space-y-6">
            <>
              {/* AI Generate List - Sticky on Scroll */}
              <div
                className={`transition-all duration-300 ${isScrolled ? 'sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-4 -mx-2 px-2' : ''}`}
              >
                <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">Generate AI List</h3>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                              <Brain className="h-3 w-3 mr-1" />
                              AI Powered
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create curated talent pools based on interview analysis and skills
                          </p>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        className="gap-2"
                        onClick={() => {
                          setIsCreating(true);
                          setEditingList(null);
                          setFormData({ name: '', description: '', sources: [] });
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lists Grid */}
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold uppercase tracking-wider">Your Lists</h2>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                    Click on a list to view candidates
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Qualified Lists - shown first with rich gold styling */}
                {filteredQualifiedLists.map((list) => {
                  const analyticsListData = transformedQualifiedLists.find(l => l.id === list.id);
                  const sources = listSources[list.id] || [];
                  return analyticsListData ? (
                    <div
                      key={list.id}
                      ref={(el) => {
                        if (el) {
                          cardRefsRef.current[list.id] = el;
                        }
                      }}
                    >
                      <ListCard
                        list={analyticsListData}
                        onClick={() => handleViewList(list.id)}
                        onDelete={handleDeleteList}
                        sources={sources}
                        onSyncSource={(sourceId) => handleSyncSource(list.id, sourceId)}
                        onAddSource={handleAddSource}
                      />
                    </div>
                  ) : null;
                })}

                {/* Regular Lists */}
                {filteredLists.map((list) => {
                  const analyticsListData = transformedLists.find(l => l.id === list.id);
                  const sources = listSources[list.id] || [];
                  return analyticsListData ? (
                    <div
                      key={list.id}
                      ref={(el) => {
                        if (el) {
                          cardRefsRef.current[list.id] = el;
                        }
                      }}
                    >
                      <ListCard
                        list={analyticsListData}
                        onClick={() => handleViewList(list.id)}
                        onDelete={handleDeleteList}
                        sources={sources}
                        onSyncSource={(sourceId) => handleSyncSource(list.id, sourceId)}
                        onAddSource={handleAddSource}
                      />
                    </div>
                  ) : null;
                })}

                {/* Create New List Card - Half width, vertically centered */}
                <div className="md:col-span-1 lg:col-span-1 flex items-center">
                  <EmptyListCard onClick={() => {
                    setIsCreating(true);
                    setEditingList(null);
                    setFormData({ name: '', description: '', sources: [] });
                  }} />
                </div>
              </div>

              {filteredLists.length === 0 && filteredQualifiedLists.length === 0 && (lists.length > 0 || qualifiedLists.length > 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No lists match your search</p>
                </div>
              )}
            </div>
            </>
          </div>
        )}
      </main>

      {/* Analytics Panel - Overlay on top */}
      <div className={`fixed top-0 right-0 h-screen bg-background/90 backdrop-blur-lg border-l border-border/50 transition-all duration-300 z-50 shadow-2xl ${isAnalyticsPanelOpen ? 'w-[30%]' : 'w-0'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsAnalyticsPanelOpen(!isAnalyticsPanelOpen)}
          className="absolute top-4 -left-10 h-10 w-10 bg-card border border-border rounded-lg hover:bg-accent/10 hover:border-primary/30 transition-all duration-300 flex items-center justify-center shadow-md group"
        >
          {isAnalyticsPanelOpen ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </button>

        {isAnalyticsPanelOpen && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col p-2 overflow-hidden">
              <div className="mb-3 text-center flex-shrink-0">
                <h3 className="text-base font-semibold text-foreground">Analytics</h3>
              </div>

              {/* Compact KPI Cards */}
              <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-muted text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Lists</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{totalLists}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs text-primary font-medium">Total</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{totalCandidates}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-accent/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <p className="text-xs text-accent font-medium">Diversity</p>
                  </div>
                  <p className="text-xl font-bold text-accent">{avgDiversity}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-success/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-3.5 w-3.5 text-success" />
                    <p className="text-xs text-success font-medium">Starred</p>
                  </div>
                  <p className="text-xl font-bold text-success">{allStarred}</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <ScoreDistributionChart
                  candidates={allCandidates}
                  aiQuery="All Lists Overview"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit List Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 uppercase tracking-wider text-black">
              <Plus className="w-5 h-5 text-black" />
              <span>{editingList ? 'Edit List' : 'Create New List'}</span>
            </DialogTitle>
            <DialogDescription className="uppercase text-xs tracking-wider">
              {editingList ? 'Update your candidate list details and sources' : 'Create a new candidate list with sources'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* List Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="listName">List Name *</Label>
                <Input
                  id="listName"
                  placeholder="e.g., Marketing Team Candidates"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="listDescription">Description</Label>
                <Input
                  id="listDescription"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Source Manager */}
            <SourceManager
              sources={formData.sources}
              onSourcesChange={handleSourcesChange}
              downloadSampleFormat={downloadSampleFormat}
            />

            {/* Duplicate Analysis Results */}
            {showDuplicateWarning && duplicateAnalysis && duplicateAnalysis.totalDuplicates > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-800">
                      📧 {duplicateAnalysis.totalDuplicates} email duplicate{duplicateAnalysis.totalDuplicates !== 1 ? 's' : ''} detected
                    </div>
                    <div className="text-sm text-amber-700 mt-1">
                      {duplicateAnalysis.duplicateRate}% of candidates have duplicate email addresses.
                      This list contains {duplicateAnalysis.uniqueCandidates} unique candidates.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {duplicateAnalysis && duplicateAnalysis.totalDuplicates === 0 && editingList && formData.sources.length > 1 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    ✅ No email duplicates found across sources
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingList(null);
                  setFormData({ name: '', description: '', sources: [] });
                  setDuplicateAnalysis(null);
                  setShowDuplicateWarning(false);
                }}
                className="border-slate-300 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={editingList ? handleUpdateList : handleCreateList}
                disabled={!formData.name.trim()}
                className="bg-black hover:bg-slate-800 text-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
              >
                {editingList ? 'Update List' : 'Save List'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        impact={deleteImpact}
        isLoading={isDeleting}
      />

      {/* Source Config Modal */}
      {addingSourceForList && (
        <SourceConfigModal
          isOpen={true}
          onClose={() => setAddingSourceForList(null)}
          onSave={handleSourceConfigSave}
          sourceType="google_sheet"
        />
      )}

      {/* Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">
              {overallProgress === 100 ? 'LIST READY!' : `${editingList ? 'UPDATING' : 'CREATING'} LIST`}
            </DialogTitle>
            <DialogDescription className="uppercase tracking-wider text-xs">
              {overallProgress === 100
                ? (formData.name ? `${formData.name.toUpperCase()} IS READY TO USE` : 'LIST IS READY TO USE')
                : (formData.name ? `SETTING UP ${formData.name.toUpperCase()} WITH ${formData.sources.length} SOURCE${formData.sources.length !== 1 ? 'S' : ''}` : `SETTING UP LIST WITH ${formData.sources.length} SOURCE${formData.sources.length !== 1 ? 'S' : ''}`)
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
                    {step.message && (
                      <p className="text-xs text-gray-500 mt-1">{step.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {overallProgress === 100 && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setProgressModalOpen(false);
                  setProgressSteps([]);
                  setOverallProgress(0);
                }}
                className="uppercase rounded-sm text-white font-medium tracking-wider transition-all duration-200"
                style={{
                  backgroundColor: '#222831',
                  boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
              >
                DONE
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
