import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Clock, Calendar, Phone, Mail, MessageSquare, UserCheck, Upload, FileText, Target, Eye, Search, Play, Pause, Square, AlertTriangle, Filter, Copy, Check, CheckCircle, FileCheck, Settings, RefreshCw, Mic, Video, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, Download, Loader2 } from "lucide-react";
import { CloudArrowDown, CaretLeft } from "phosphor-react";
import googleLogo from "@/assets/google_logo.png";
import aiAvatar from "@/assets/ai-avatar.png";
import mountainsBg from "@/assets/moutains.jpg";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, Status } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { checkBlueprintExists } from "@/services/blueprintService";
import { X } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStartInterviewMutation } from "@/queries/interviewsQueries";
import {
  useInterviewDetailQuery,
  useInterviewStatsQuery,
  useInterviewCandidatesQuery,
  useInterviewSourcesQuery,
  useInvalidateInterviewDetailsOnRevision,
} from "@/queries/interviewDetailsQueries";
import { interviewApi } from "@/services/interviewApi";
import { useQueryClient } from "@tanstack/react-query";
import {
  interviewCandidatesQueryKey,
} from "@/queries/interviewDetailsQueries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shimmer, ShimmerCard, ShimmerTable, ShimmerInterviewConfig } from "@/components/ui/shimmer";
import { ArrowsOut, CircleNotch, ClockCounterClockwise, ArrowsClockwise } from "phosphor-react";
import { pauseInterview, stopInterview, resumeInterview } from "@/services/interviewControlService";
import { listsApi } from "@/services/listsApi";
import { qualifiedListsApi } from "@/services/qualifiedListsApi";
import { SwipeQRSection } from "@/components/interview/SwipeQRSection";
import { ShortlistActionCard } from "@/components/interview/ShortlistActionCard";
import { CandidateCard } from "@/components/interview/CandidateCard";
import { AddToQualifiedListModal } from "@/components/modals/AddToQualifiedListModal";
import { cn } from "@/lib/utils";
import { BlueprintViewModal } from "@/components/views/BlueprintViewModal";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { computeInterviewNBA, type InterviewSnapshot, type InterviewStats as NBAStats } from "@/lib/nextBestAction";
import { InterviewKpiTiles } from "@/components/interview-details/InterviewKpiTiles";
import { InterviewHeader } from "@/components/interview-details/InterviewHeader";
import { InterviewSourcesPanel } from "@/components/interview-details/InterviewSourcesPanel";
import { StartInterviewModal } from "@/components/interview-details/StartInterviewModal";


// Data layer lives in src/queries/interviewDetailsQueries.ts (F29.1).
// The component below consumes those hooks; no manual fetch helpers here.

// Map backend status to frontend status (module-scope so it can be referenced
// by hooks at the top of the component body without TDZ).
const mapBackendStatus = (backendStatus: string): Status => {
 const statusMap: Record<string, Status> = {
 'pending': 'pending',
 'invited': 'pending',
 'link_clicked': 'link_clicked',
 'registered': 'registered',
 'linked_to_existing': 'link_clicked',
 'completed': 'completed',
 'in_progress': 'in-progress'
 };
 return statusMap[backendStatus] || 'pending';
};


// ViewResultButton component - Demo Mode
const ViewResultButton = ({ candidate, interviewId }: { candidate: any; interviewId: string }) => {
 const navigate = useNavigate();

 const handleViewDemoResult = () => {
 // Use candidate ID as session ID for demo navigation
 navigate(`/interview/${interviewId}/results/${candidate.id || 'demo-session'}`);
 };

 // Show demo result button for any candidate with an ID
 if (!candidate.id) {
 return <span className="text-muted text-sm">-</span>;
 }

 return (
 <Button
 variant="outline"
 size="sm"
 onClick={handleViewDemoResult}
 aria-label="View demo result"
 className="text-gold-ink hover:text-ink h-8 w-8 p-0"
 >
 <Eye className="w-4 h-4" />
 </Button>
 );
};

// Helper function to format date in "21 September 2025" format
const formatCreatedDate = (dateString: string) => {
 try {
 const date = new Date(dateString);
 const options: Intl.DateTimeFormatOptions = {
 day: 'numeric',
 month: 'long',
 year: 'numeric'
 };
 return date.toLocaleDateString('en-US', options);
 } catch (error) {
 return new Date().toLocaleDateString('en-US', {
 day: 'numeric',
 month: 'long',
 year: 'numeric'
 });
 }
};

export default function InterviewDetails() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { toast } = useToast();
 const { currentWorkspace, currentProject } = useWorkspace();
 const startInterview = useStartInterviewMutation(currentWorkspace?.id, currentProject?.id);
 const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

 // Main table filters
 const [tableSearchQuery, setTableSearchQuery] = useState("");
 const [tableStatusFilter, setTableStatusFilter] = useState("");
 const [tableScoreFilter, setTableScoreFilter] = useState("");

 // F29.1: server state moved to TanStack Query in interviewDetailsQueries.
 // Local state below is for things only the page knows about (UI flags,
 // selections, modal toggles).
 const [duplicateRecords, setDuplicateRecords] = useState<number>(0);

 // Bumps on every SSE 'update' event from the backend. Wired below to
 // useInvalidateInterviewDetailsOnRevision so cached queries refetch.
 const [liveRevision, setLiveRevision] = useState(0);

 // Live updates via Server-Sent Events. Backend emits an 'update' event
 // whenever the interview's status / blueprintStatus / candidate counts /
 // participation rate change. We bump liveRevision to retrigger refetch.
 useEffect(() => {
 if (!id) return;
 const token = localStorage.getItem('auth_token');
 if (!token) return;
 const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
 // TD5: prefer the scoped SSE route when we have workspace + project in
 // context. The unscoped /api/interviews/{id}/events route does an
 // unbounded collection_group scan and is deprecated. Falls back to the
 // legacy route only if workspace/project hasn't resolved yet.
 const wsId = currentWorkspace?.id;
 const pjId = currentProject?.id;
 const url = wsId && pjId
   ? `${apiBase}/api/workspaces/${wsId}/projects/${pjId}/interviews/${id}/events?token=${encodeURIComponent(token)}`
   : `${apiBase}/api/interviews/${id}/events?token=${encodeURIComponent(token)}`;
 const es = new EventSource(url);
 es.addEventListener('update', () => setLiveRevision((r) => r + 1));
 es.addEventListener('not_found', () => es.close());
 es.onerror = () => {
 // EventSource auto-reconnects on transient failures; close to avoid loops
 // if the server explicitly closes the stream (e.g. 401 / 404).
 if (es.readyState === EventSource.CLOSED) {
 // already closed
 }
 };
 return () => es.close();
 }, [id, currentWorkspace?.id, currentProject?.id]);

 // Start interview modal states (similar to ManageInterviewsEnhanced)
 const [startModalOpen, setStartModalOpen] = useState(false);
 const [isStartingInterview, setIsStartingInterview] = useState(false);
 const [startingProgress, setStartingProgress] = useState("");

 // Re-invite (resend invitation email) state
 const [isResendingInvites, setIsResendingInvites] = useState(false);

 // Bulk shortlist modal state
 const [showShortlistModal, setShowShortlistModal] = useState(false);
 
 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize] = useState(10);
 // totalCandidates derived from useInterviewCandidatesQuery below.

 // Blueprint modal state
 const [showBlueprintModal, setShowBlueprintModal] = useState(false);

 // Copy state for invitation links
 const [copiedCandidateId, setCopiedCandidateId] = useState<number | null>(null);

 // Expanded rows state for showing attempts
 const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

 // Candidate sources state for sync feature (UI-only flags; data via query)
 const [checkingSourceIds, setCheckingSourceIds] = useState<Set<string>>(new Set());
 const [syncingSourceIds, setSyncingSourceIds] = useState<Set<string>>(new Set());
 const [sourceUpdates, setSourceUpdates] = useState<Record<string, any>>({});

 const queryClient = useQueryClient();

 // ── F29.1: TanStack Query data layer ───────────────────────────────────
 // Single fetch per concern, deduped + cached. Race-safe via `enabled`.
 const interviewQuery = useInterviewDetailQuery(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 );
 const statsQuery = useInterviewStatsQuery(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 );

 // Map raw API response → JSX shape (mirrors the old loadInterviewData mapping)
 const interview = React.useMemo(() => {
 const raw = interviewQuery.data;
 if (!raw) return null;
 return {
 id: raw.id || id,
 title: raw.title || 'Interview',
 type: raw.type || 'General',
 created: raw.createdAt
 ? formatCreatedDate(raw.createdAt)
 : formatCreatedDate(new Date().toISOString()),
 status: raw.status || 'draft',
 duration: raw.duration ? `${raw.duration} min` : '30 min',
 voiceType: raw.voiceType || 'Professional',
 description: raw.description || 'Interview assessment',
 candidateCount: raw.candidateCount || raw.candidates || 0,
 lists: raw.lists || raw.listIds || [],
 template_id: raw.templateId,
 template_source: raw.template_source,
 communications: {
 email: raw.communications?.email || false,
 phone: raw.communications?.phone || false,
 sms: raw.communications?.sms || false,
 },
 // Surface blueprint fields directly so child components can read them.
 blueprintStatus: raw.blueprintStatus,
 blueprintError: raw.blueprintError,
 };
 }, [interviewQuery.data, id]);

 const stats = statsQuery.data ?? {};
 const loadingInterview = interviewQuery.isPending;
 const loadingStats = statsQuery.isPending;
 const error = interviewQuery.error
 ? (interviewQuery.error instanceof Error
 ? interviewQuery.error.message
 : 'Failed to load interview data')
 : (interviewQuery.data === null && !interviewQuery.isPending
 ? 'Interview not found'
 : null);

 const candidatesQuery = useInterviewCandidatesQuery(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 currentPage,
 pageSize,
 interview?.status,
 );
 const candidatesRaw = candidatesQuery.data?.candidates ?? [];
 const candidates = React.useMemo(() => {
 return candidatesRaw.map((candidate: any, index: number) => ({
 id: (currentPage - 1) * pageSize + index + 1,
 candidateId: candidate.candidateId || candidate.id,
 name: candidate.name || 'Unknown',
 email: candidate.email || '',
 phone: candidate.phone || '',
 status: mapBackendStatus(candidate.status),
 score: candidate.score !== undefined && candidate.score !== null ? candidate.score : null,
 humanScore: candidate.human_score !== undefined && candidate.human_score !== null ? candidate.human_score : null,
 completedAt: candidate.assessment_completed ? candidate.created_at : null,
 duration: candidate.duration || null,
 invitation_token: candidate.invitation_token || '',
 invitation_id: candidate.invitation_id || candidate.id || '',
 email_sent: candidate.email_sent ?? null,
 email_sent_at: candidate.email_sent_at || null,
 email_error: candidate.email_error || null,
 invitationLink: candidate.invitation_token
 ? `${import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:8080'}/register/${candidate.invitation_token}`
 : null,
 sessionId: candidate.session_id,
 attempts: candidate.attempts || [],
 jobTitle: candidate.jobTitle || '',
 role: candidate.role || '',
 experience: candidate.experience || '',
 location: candidate.location || '',
 availableIn: candidate.availableIn || '',
 linkedin: candidate.linkedin || '',
 portfolioUrl: candidate.portfolioUrl || '',
 profilePicture: candidate.profilePicture || '',
 session_status: candidate.session_status || 'no_session',
 swipe_decision: candidate.swipe_decision || null,
 }));
 // mapBackendStatus is hoisted below; the dep array intentionally omits it
 // (stable reference within the component body).
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [candidatesRaw, currentPage, pageSize]);
 const totalCandidates = candidatesQuery.data?.totalCandidates ?? 0;
 const loadingCandidates = candidatesQuery.isPending && Boolean(interview && interview.status !== 'draft');

 // Auto-expand rows that have multiple attempts (mirrors the old behavior).
 useEffect(() => {
 if (candidatesRaw.length === 0) return;
 const withAttempts = new Set<number>();
 candidates.forEach((c) => {
 if (c.attempts && c.attempts.length > 0) withAttempts.add(c.id);
 });
 setExpandedRows((prev) => {
 // Merge — never collapse a row the user already expanded.
 const merged = new Set(prev);
 withAttempts.forEach((id) => merged.add(id));
 return merged;
 });
 // Only re-run when the candidate set changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [candidatesRaw]);

 const sourcesQuery = useInterviewSourcesQuery(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 interview?.lists,
 interview?.candidateCount,
 );
 const candidateSources = sourcesQuery.data?.sources ?? [];
 const hasSharedLists = sourcesQuery.data?.hasSharedLists ?? false;
 const hasQualifiedLists = sourcesQuery.data?.hasQualifiedLists ?? false;
 const loadingCandidateSources = sourcesQuery.isPending && Boolean(interview);

 // Bridge SSE liveRevision → query invalidation.
 useInvalidateInterviewDetailsOnRevision(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 liveRevision,
 );

 // Helper function to format duration from seconds to mm:ss
 const formatDuration = (seconds: number | null) => {
 if (!seconds) return '-';
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins}:${secs.toString().padStart(2, '0')}`;
 };

 // Toggle row expansion
 const toggleRowExpansion = (candidateId: number) => {
 const newExpanded = new Set(expandedRows);
 if (newExpanded.has(candidateId)) {
 newExpanded.delete(candidateId);
 } else {
 newExpanded.add(candidateId);
 }
 setExpandedRows(newExpanded);
 };

 // Patch the cached interview detail so derived state reflects optimistic
 // updates from start/pause/stop/resume mutations without a full refetch.
 // The cache shape is whatever the API returned (raw response); we touch
 // the same fields the JSX consumes via the `interview` memo.
 const patchInterviewCache = (patch: Record<string, any>) => {
 const key = ["interview-detail", currentWorkspace?.id, currentProject?.id, id];
 queryClient.setQueryData<any>(key, (prev: any) => {
 if (!prev) return prev;
 return { ...prev, ...patch };
 });
 };

 // Refresh candidates: invalidate the cached query → triggers a refetch
 // through the same useInterviewCandidatesQuery hook. The auto-expand is
 // handled by the effect colocated with the derived `candidates` value.
 const refreshCandidates = async () => {
 if (!id || !interview || interview.status === 'draft') return;
 try {
 await queryClient.invalidateQueries({
 queryKey: interviewCandidatesQueryKey(
 currentWorkspace?.id,
 currentProject?.id,
 id,
 currentPage,
 pageSize,
 ),
 });
 toast({
 title: "Applicants refreshed",
 description: "Applicant data has been updated successfully",
 });
 } catch {
 toast({
 title: "Refresh failed",
 description: "Failed to refresh applicant data. Please try again.",
 variant: "destructive",
 });
 }
 };

 // Blueprint state management
 const [blueprintExists, setBlueprintExists] = useState<boolean | null>(null);
 const [blueprintData, setBlueprintData] = useState<any>(null);
 const [isCheckingBlueprint, setIsCheckingBlueprint] = useState(false);
 const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
 const [blueprintStatus, setBlueprintStatus] = useState<string | null>(null); // "generating" | "completed" | "failed"
 const [blueprintError, setBlueprintError] = useState<string | null>(null);

 // Sync blueprint status from the interview query result. The local
 // blueprintStatus/blueprintError state is read by other effects + the
 // status pill JSX; this keeps it the source of truth without re-fetching.
 //
 // Guard: only adopt the status when the raw query payload's id matches the
 // URL id. TanStack's cross-query data can briefly surface a sibling
 // interview's payload during navigation; without this guard a freshly
 // created interview can flash "Blueprint failed" inherited from whichever
 // interview the user was looking at moments earlier.
 useEffect(() => {
 const rawId = (interviewQuery.data as any)?.id;
 if (rawId && id && rawId !== id) return;
 if (interview?.blueprintStatus) {
 setBlueprintStatus(interview.blueprintStatus);
 setBlueprintError(interview.blueprintError || null);
 }
 }, [interview?.blueprintStatus, interview?.blueprintError, interviewQuery.data, id]);



 // F29.1: candidate sources fetch moved to useInterviewSourcesQuery (data
 // layer above). The `enabled` gate there ensures we only fire when the
 // interview is loaded, killing the old "fires with status=undefined" race.

 // Handler to check for new candidates
 const handleCheckForNewCandidates = async (source: any) => {
 if (!currentWorkspace || !currentProject) return null;

 try {
 setCheckingSourceIds(prev => new Set(prev).add(source.id));

 const result = await listsApi.checkSourceForNewCandidatesProjectList(currentWorkspace.id, currentProject.id, source.listId, source.id);

 setSourceUpdates(prev => ({
 ...prev,
 [source.id]: result
 }));

 if (result.hasNew) {
 toast({
 title: "Updates Available",
 description: `${result.newRows} new candidates found in sheet`
 });
 } else {
 toast({
 title: "No Updates",
 description: "Sheet is up to date"
 });
 }

 return result; // Return result for chaining
 } catch (error: any) {
 console.error('Error checking for new candidates:', error);
 toast({
 title: "Check Failed",
 description: error.message || "Failed to check for updates",
 variant: "destructive"
 });
 return null;
 } finally {
 setCheckingSourceIds(prev => {
 const newSet = new Set(prev);
 newSet.delete(source.id);
 return newSet;
 });
 }
 };

 // Handler to sync new candidates
 const handleSyncNewCandidates = async (source: any) => {
 if (!currentWorkspace || !currentProject) return;

 try {
 setSyncingSourceIds(prev => new Set(prev).add(source.id));

 const result = await listsApi.syncNewCandidatesFromProjectListSource(currentWorkspace.id, currentProject.id, source.listId, source.id);

 // Clear the update status for this source
 setSourceUpdates(prev => {
 const newUpdates = { ...prev };
 delete newUpdates[source.id];
 return newUpdates;
 });

 toast({
 title: "Sync Complete",
 description: result.message
 });

 // Refresh all caches after sync. Wait 5s for Firestore eventual
 // consistency, then invalidate every interview-detail query so the page
 // re-derives interview / stats / sources / candidates from fresh data.
 if (result.addedCandidates > 0 && id) {
 await new Promise((resolve) => setTimeout(resolve, 5000));
 await Promise.all([
 queryClient.invalidateQueries({ queryKey: ["interview-detail", currentWorkspace?.id, currentProject?.id, id] }),
 queryClient.invalidateQueries({ queryKey: ["interview-stats", currentWorkspace?.id, currentProject?.id, id] }),
 queryClient.invalidateQueries({ queryKey: ["interview-sources", currentWorkspace?.id, currentProject?.id, id] }),
 queryClient.invalidateQueries({ queryKey: ["interview-candidates", currentWorkspace?.id, currentProject?.id, id] }),
 ]);
 }
 } catch (error: any) {
 console.error('Error syncing new candidates:', error);
 toast({
 title: "Sync Failed",
 description: error.message || "Failed to sync new candidates",
 variant: "destructive"
 });
 } finally {
 setSyncingSourceIds(prev => {
 const newSet = new Set(prev);
 newSet.delete(source.id);
 return newSet;
 });
 }
 };

 // Check if blueprint exists
 useEffect(() => {
 const checkBlueprint = async () => {
 if (!id || !currentWorkspace || !currentProject) return;

 try {
 setIsCheckingBlueprint(true);
 const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
 setBlueprintExists(result.exists);
 if (result.exists && result.blueprint) {
 setBlueprintData(result.blueprint);
 }
 } catch (err) {
 console.error('Error checking blueprint:', err);
 setBlueprintExists(false); // Assume doesn't exist on error
 } finally {
 setIsCheckingBlueprint(false);
 }
 };

 checkBlueprint();
 }, [id, currentWorkspace, currentProject, liveRevision]);

 // Auto-refresh blueprint status when generating.
 // P1 U3: exponential backoff after 3 consecutive errors so a flaky
 // network doesn't hammer the API at 5s intervals forever.
 useEffect(() => {
 if (blueprintStatus !== 'generating' || !id) return;
 if (!currentWorkspace || !currentProject) return;

 let cancelled = false;
 let consecutiveErrors = 0;
 let timeoutId: ReturnType<typeof setTimeout> | null = null;

 const tick = async () => {
 if (cancelled) return;
 try {
 const interviewData = await interviewApi.getInterview(currentWorkspace.id, currentProject.id, id);
 consecutiveErrors = 0;

 if (interviewData && interviewData.blueprintStatus) {
 const newStatus = interviewData.blueprintStatus;
 setBlueprintStatus(newStatus);
 setBlueprintError(interviewData.blueprintError || null);

 if (newStatus === 'completed' || newStatus === 'failed') {
 if (newStatus === 'completed') {
 toast({
 title: 'Blueprint Ready',
 description: 'Interview blueprint has been generated successfully!',
 });
 const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
 setBlueprintExists(result.exists);
 if (result.exists && result.blueprint) setBlueprintData(result.blueprint);
 } else {
 toast({
 title: 'Blueprint Generation Failed',
 description: 'Please update the job description with more specific details and try again.',
 variant: 'destructive',
 });
 }
 return; // stop polling
 }
 }
 } catch (error) {
 consecutiveErrors += 1;
 console.error(`Error polling blueprint status (errors=${consecutiveErrors}):`, error);
 }

 // 5s normal cadence; after 3 errors, back off: 10s, 20s, 40s, capped at 60s.
 const delay = consecutiveErrors < 3
 ? 5000
 : Math.min(5000 * Math.pow(2, consecutiveErrors - 2), 60000);
 timeoutId = setTimeout(tick, delay);
 };

 timeoutId = setTimeout(tick, 5000);
 return () => {
 cancelled = true;
 if (timeoutId) clearTimeout(timeoutId);
 };
 }, [blueprintStatus, id, currentWorkspace, currentProject]);

 // Check blueprint again (retry)
 const handleCheckBlueprint = async () => {
 if (!id || !currentWorkspace || !currentProject) return;

 try {
 setIsCheckingBlueprint(true);
 const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
 setBlueprintExists(result.exists);
 if (result.exists && result.blueprint) {
 setBlueprintData(result.blueprint);
 }
 } catch (err) {
 console.error('Error checking blueprint:', err);
 setBlueprintExists(false);
 } finally {
 setIsCheckingBlueprint(false);
 }
 };

 // Regenerate blueprint handler
 const [isRegeneratingBlueprint, setIsRegeneratingBlueprint] = useState(false);

 const handleRegenerateBlueprint = async () => {
 if (!id || !interview || !currentWorkspace || !currentProject) return;

 // Confirm before regenerating
 const confirmed = window.confirm('Regenerate blueprint? This will replace the existing blueprint.');
 if (!confirmed) return;

 try {
 setIsRegeneratingBlueprint(true);

 const token = localStorage.getItem('auth_token');
 const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

 const response = await fetch(`${API_BASE_URL}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/generate-blueprint`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 id: interview.id,
 title: interview.title,
 description: interview.description || '',
 type: interview.type || 'General Assessment',
 duration: interview.duration?.replace(' min', '') || '45'
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Failed to regenerate blueprint');
 }

 toast({
 title: "Blueprint Regenerated",
 description: "Interview blueprint has been successfully regenerated.",
 });

 // Refresh blueprint data
 await handleCheckBlueprint();

 } catch (error) {
 console.error('Blueprint regeneration error:', error);
 toast({
 title: "Regeneration Failed",
 description: error instanceof Error ? error.message : 'Failed to regenerate blueprint',
 variant: "destructive",
 });
 } finally {
 setIsRegeneratingBlueprint(false);
 }
 };

 // F29.1: candidates fetch moved to useInterviewCandidatesQuery (data layer
 // above). The mapping + auto-expand are colocated with the derived state.

 // Error state
 if (error) {
 return (
 <div className="text-center py-12">
 <h2 className="text-2xl font-bold text-foreground">Interview not found</h2>
 <p className="text-muted-foreground mt-2">{error}</p>
 <Button onClick={() => navigate("/interviews/manage")} className="mt-4">
 <ArrowLeft className="w-4 h-4 mr-2" />
 Back to manage interviews
 </Button>
 </div>
 );
 }

 // Interview control functions
 const handleStartInterview = async () => {
 if (!interview || !id) return;

 // Open modal and start the process
 setStartModalOpen(true);
 setIsStartingInterview(true);

 try {
 if (!currentWorkspace || !currentProject) {
 throw new Error('No workspace or project selected');
 }

 // Step 1: Check if blueprint exists
 setStartingProgress("Checking interview blueprint...");
 const blueprintCheck = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);

 if (!blueprintCheck || !blueprintCheck.exists) {
 setStartingProgress("Error: Interview blueprint not found. Please ensure blueprint is generated first.");
 toast({
 title: "Blueprint Missing",
 description: "Interview blueprint not found. Please ensure blueprint is generated before starting the interview.",
 variant: "destructive"
 });
 return;
 }

 await new Promise(resolve => setTimeout(resolve, 500));

 // Step 2: Initializing
 setStartingProgress("Initializing interview settings...");
 await new Promise(resolve => setTimeout(resolve, 800));
 
 // Step 3: Fetching candidates
 setStartingProgress("Loading applicant information...");
 await new Promise(resolve => setTimeout(resolve, 600));

 // Step 4: Generating invitations
 setStartingProgress("Generating invitation links...");
 await new Promise(resolve => setTimeout(resolve, 700));
 
 let data: any;
 try {
 data = await startInterview.mutateAsync(id!);
 } catch (err) {
 const message = err instanceof Error ? err.message : "Failed to start interview";
 setStartingProgress(`Error: ${message}`);
 toast({
 title: "Error starting interview",
 description: message,
 variant: "destructive"
 });
 return;
 }

 // Step 5: Finalizing
 setStartingProgress("Finalizing interview activation...");
 await new Promise(resolve => setTimeout(resolve, 800));

 // Update interview state immediately if we got updated data
 if (data.updated_interview) {
 patchInterviewCache({ status: 'active', ...data.updated_interview });
 } else {
 patchInterviewCache({ status: 'active' });
 }

 // Show success state briefly before closing
 setStartingProgress("Interview started successfully!");
 await new Promise(resolve => setTimeout(resolve, 1500));

 setStartModalOpen(false);
 setStartingProgress("");

 toast({
 title: "Interview started",
 description: `${data.total_invitations_created || ''} invitation links generated for "${interview.title}"`
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "Failed to start interview. Please try again.";
 setStartingProgress(`Error: ${message}`);
 toast({
 title: "Error",
 description: message,
 variant: "destructive"
 });
 } finally {
 setIsStartingInterview(false);
 }
 };

 // Re-invite candidates stuck on scheduling or expired. Resends the
 // invitation email tied to their existing token — no new tokens are
 // minted, so the candidate experience continues from where they left off.
 const handleResendStuck = async () => {
 if (isResendingInvites || !id) return;
 const stuck = candidates.filter((c) =>
 ['scheduling', 'expired', 'invited'].includes((c.status || '').toLowerCase())
 );
 if (stuck.length === 0) {
 toast({ title: 'No applicants to re-invite', description: 'Every invitation has been responded to.' });
 return;
 }
 setIsResendingInvites(true);
 try {
 const result = await interviewApi.resendInvitations(
 id,
 stuck.map((c) => c.candidateId || c.id).filter(Boolean),
 currentWorkspace?.id,
 currentProject?.id,
 );
 toast({
 title: 'Invitations resent',
 description: `${result.emails_sent} sent, ${result.emails_failed} failed${result.errors?.length ? ` (${result.errors.length} lookup issues)` : ''}`,
 });
 } catch (err: any) {
 toast({
 title: 'Resend failed',
 description: err?.message || 'Could not resend invitations.',
 variant: 'destructive',
 });
 } finally {
 setIsResendingInvites(false);
 }
 };

 const handlePauseInterview = async () => {
 if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

 setIsUpdatingStatus(true);
 try {
 await pauseInterview(currentWorkspace.id, currentProject.id, id!);

 // Update local state
 patchInterviewCache({ status: 'paused' });

 toast({
 title: "Interview paused",
 description: "Interview has been paused successfully",
 });
 } catch (error) {
 console.error('Failed to pause interview:', error);
 toast({
 title: "Error",
 description: "Failed to pause interview. Please try again.",
 variant: "destructive"
 });
 } finally {
 setIsUpdatingStatus(false);
 }
 };

 const handleStopInterview = async () => {
 if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

 setIsUpdatingStatus(true);
 try {
 await stopInterview(currentWorkspace.id, currentProject.id, id!);

 // Update local state
 patchInterviewCache({ status: 'stopped' });

 toast({
 title: "Interview stopped",
 description: "Interview has been stopped permanently",
 });
 } catch (error) {
 console.error('Failed to stop interview:', error);
 toast({
 title: "Error",
 description: "Failed to stop interview. Please try again.",
 variant: "destructive"
 });
 } finally {
 setIsUpdatingStatus(false);
 }
 };

 const handleResumeInterview = async () => {
 if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

 setIsUpdatingStatus(true);
 try {
 await resumeInterview(currentWorkspace.id, currentProject.id, id!);

 // Update local state
 patchInterviewCache({ status: 'active' });

 toast({
 title: "Interview resumed",
 description: "Interview has been resumed successfully",
 });
 } catch (error) {
 console.error('Failed to resume interview:', error);
 toast({
 title: "Error",
 description: "Failed to resume interview. Please try again.",
 variant: "destructive"
 });
 } finally {
 setIsUpdatingStatus(false);
 }
 };

 // Use stats from API if available, otherwise calculate from candidates array
 const completedCandidates = candidates.filter(c => c.status === "completed");
 const eligibleForShortlist = completedCandidates.filter(c => c.score && c.score >= 75);
 const participationRate = candidates.length > 0 ? Math.round((candidates.filter(c => c.status !== "pending").length / candidates.length) * 100) : 0;

 // Prefer stats from API for display
 const displayTotalCandidates = stats?.totalCandidates ?? totalCandidates;
 const displayCompletedCandidates = stats?.completedCandidates ?? completedCandidates.length;
 const displayEligibleForFitment = stats?.eligibleForFitment ?? eligibleForShortlist.length;
 const displayParticipationRate = stats?.participationRate ?? participationRate;

 // Calculate total duplicates from candidate sources
 const totalDuplicates = 0; // Removed candidate sources API call

 // Filter candidates for main table (client-side filtering on current page only)
 const filteredCandidatesForTable = candidates.filter(candidate => {
 const matchesSearch =
 candidate.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
 candidate.email.toLowerCase().includes(tableSearchQuery.toLowerCase());

 const matchesStatus = tableStatusFilter === "all" || !tableStatusFilter || candidate.status === tableStatusFilter;

 const matchesScore = (() => {
 if (!tableScoreFilter || tableScoreFilter === "all") return true;
 if (!candidate.score) return tableScoreFilter === "no-score";

 switch (tableScoreFilter) {
 case "high": return candidate.score >= 90;
 case "good": return candidate.score >= 75 && candidate.score < 90;
 case "fair": return candidate.score >= 60 && candidate.score < 75;
 case "low": return candidate.score < 60;
 default: return true;
 }
 })();

 return matchesSearch && matchesStatus && matchesScore;
 });

 // Backend handles pagination, so we use filtered candidates directly
 const paginatedCandidates = filteredCandidatesForTable;

 const uniqueStatusesForTable = [...new Set(candidates.map(c => c.status))];

 const handleCandidateSelect = (candidateId: number, checked: boolean) => {
 setSelectedCandidates(prev => 
 checked 
 ? [...prev, candidateId]
 : prev.filter(id => id !== candidateId)
 );
 };

 const handleSelectAll = (checked: boolean) => {
 setSelectedCandidates(checked ? eligibleForShortlist.map(c => c.id) : []);
 };

 const handleAutoShortlist = () => {
 // Auto-select candidates based on transcript analysis (score >= 75%)
 setSelectedCandidates(eligibleForShortlist.map(c => c.id));
 toast({
 title: "Applicants auto-shortlisted",
 description: `${eligibleForShortlist.length} applicants automatically shortlisted based on transcript analysis (score ≥ 75%).`,
 });
 };

 const getScoreColor = (score: number) => {
 if (score >= 90) return "text-success font-bold";
 if (score >= 80) return "text-info font-semibold";
 if (score >= 70) return "text-warning font-medium";
 return "text-danger font-medium";
 };

 const copyInvitationLink = async (candidateId: number, invitationLink: string) => {
 try {
 await navigator.clipboard.writeText(invitationLink);
 setCopiedCandidateId(candidateId);
 toast({
 title: "Link Copied",
 description: "Invitation link has been copied to clipboard"
 });
 // Reset the copied state after 2 seconds
 setTimeout(() => setCopiedCandidateId(null), 2000);
 } catch (error) {
 toast({
 title: "Copy Failed",
 description: "Failed to copy invitation link to clipboard",
 variant: "destructive"
 });
 }
 };

 return (
 <div className="space-y-8">
 {/* Header - Sticky */}
 <InterviewHeader
 loading={loadingInterview}
 title={interview?.title}
 interviewId={id}
 createdLabel={interview?.created}
 />

 {/* Next Best Action — single CTA driven by interview state */}
 {interview && (
 <NextBestActionCard
 nba={computeInterviewNBA(
 {
 id: interview.id ?? id ?? '',
 status: interview.status,
 candidateCount: stats?.totalCandidates ?? candidates.length,
 blueprintStatus: blueprintStatus ?? interview.blueprintStatus,
 startedAt: interview.startedAt,
 } as InterviewSnapshot,
 {
 totalCandidates: stats?.totalCandidates ?? candidates.length,
 completedCandidates: stats?.completedCandidates ?? completedCandidates.length,
 participationRate: stats?.participationRate ?? participationRate,
 } as NBAStats,
 )}
 onAddCandidates={() => navigate(`/interviews/create?edit=${id}`)}
 onStart={handleStartInterview}
 onShare={async () => {
 try {
 const url = `${window.location.origin}/swipe/${id}`;
 await navigator.clipboard.writeText(url);
 toast({ title: 'Invite link copied', description: url });
 } catch {
 toast({ title: 'Copy failed', description: 'Try again or copy from the address bar.', variant: 'destructive' });
 }
 }}
 />
 )}

 {/* Overview Cards - Compact & Translucent */}
 <InterviewKpiTiles
 loading={loadingStats}
 totalApplicants={displayTotalCandidates}
 completedApplicants={displayCompletedCandidates}
 eligibleForFitment={displayEligibleForFitment}
 participationRate={displayParticipationRate}
 />

 {/* Interview Configuration */}
 <div
 className="rounded-sm bg-paper"
 style={{
 boxShadow: 'var(--shadow-clay)'
 }}
 >
 <div className="px-6 py-5 border-b">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <img src={aiAvatar} alt="AI" className="w-10 h-10 rounded-full" />
 <div>
 <h3 className="text-lg font-semibold text-ink">Interview configuration</h3>
 <p className="text-xs text-muted mt-1">Current settings and interview blueprint</p>
 </div>
 </div>

 {/* Blueprint and Control Buttons Row */}
 <div className="flex items-center gap-4">
 {/* Interview Blueprint - Compact Version
 U3 (2026-05-12): rewritten as a single switch on
 `blueprintStatus` so the four states are mutually
 exclusive. Previously we rendered "Blueprint Ready"
 from `blueprintExists` AND "Blueprint Generating..."
 from a separately-polled `blueprintStatus`, and both
 could be true at once after a stale poll. */}
 {!loadingInterview && interview && (() => {
 // Effective status: explicit blueprintStatus wins; if it's
 // null but a file exists, treat as completed.
 const effectiveStatus = (
 blueprintStatus === 'generating' ? 'generating' :
 blueprintStatus === 'failed' ? 'failed' :
 blueprintStatus === 'completed' ? 'completed' :
 blueprintExists === true ? 'completed' :
 blueprintExists === false ? 'missing' :
 'loading'
 );

 if (effectiveStatus === 'generating') {
 // Show the "preview locked in" caption only on fresh interviews — keeps
 // it useful right after create without showing on every later visit.
 const createdAtRaw = (interviewQuery.data as any)?.createdAt;
 const createdMs = createdAtRaw
 ? (typeof createdAtRaw === 'string' ? Date.parse(createdAtRaw) : Number(createdAtRaw))
 : NaN;
 const isFresh = Number.isFinite(createdMs) && (Date.now() - createdMs) < 120_000;
 return (
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2 px-3 py-2 bg-gold-soft border border-rule rounded-sm">
 <CircleNotch className="w-3.5 h-3.5 text-gold-ink animate-spin" />
 <span className="text-xs font-medium text-gold-ink">Blueprint generating…</span>
 </div>
 {isFresh && (
 <p className="text-[10px] text-muted font-mono px-1">
 Preview locked in. Building proficiency anchors and rubric (~30s).
 </p>
 )}
 </div>
 );
 }

 if (effectiveStatus === 'failed') {
 return (
 <div className="flex items-center gap-2 px-3 py-2 bg-danger-soft border border-rule rounded-sm">
 <AlertTriangle className="w-3.5 h-3.5 text-danger" />
 <span className="text-xs font-medium text-ink">Blueprint failed</span>
 <Button
 onClick={handleRegenerateBlueprint}
 disabled={isRegeneratingBlueprint}
 size="sm"
 variant="destructive"
 className="px-2 py-1 text-xs h-6 rounded-sm"
 >
 {isRegeneratingBlueprint ? (
 <>
 <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
 Retrying…
 </>
 ) : (
 'Try again'
 )}
 </Button>
 <Button
 onClick={() => navigate(`/interviews/create?edit=${id}`)}
 size="sm"
 variant="ghost"
 className="px-2 py-1 text-xs h-6 rounded-sm"
 >
 Edit description
 </Button>
 </div>
 );
 }

 if (effectiveStatus === 'completed') {
 return (
 <div className="flex items-center gap-2 px-3 py-2 bg-gold-soft border border-rule rounded-sm">
 <FileCheck className="w-3.5 h-3.5 text-gold-ink" />
 <span className="text-xs font-medium text-ink">Blueprint ready</span>
 <Button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setShowBlueprintModal(true);
 }}
 size="sm"
 variant="gold"
 className="px-3 py-1 text-xs h-7 rounded-sm"
 >
 View
 </Button>
 {interview.template_source !== 'control_tower' && (
 <Button
 onClick={handleRegenerateBlueprint}
 size="sm"
 disabled={isRegeneratingBlueprint}
 variant="outline"
 className="px-3 py-1 text-xs h-7 rounded-sm"
 >
 {isRegeneratingBlueprint ? (
 <>
 <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
 Regenerating…
 </>
 ) : (
 <>
 <RefreshCw className="w-3 h-3 mr-1" />
 Regenerate
 </>
 )}
 </Button>
 )}
 </div>
 );
 }

 if (effectiveStatus === 'missing') {
 return (
 <div className="flex items-center gap-2 px-3 py-2 bg-warning-soft border border-rule rounded-sm">
 <Settings className="w-3.5 h-3.5 text-warning" />
 <span className="text-xs font-medium text-ink">Blueprint not found</span>
 <Button
 onClick={handleCheckBlueprint}
 size="sm"
 disabled={isCheckingBlueprint}
 variant="outline"
 className="px-2 py-1 text-xs h-6 rounded-sm"
 >
 {isCheckingBlueprint ? (
 <RefreshCw className="w-3 h-3 animate-spin" />
 ) : (
 'Check again'
 )}
 </Button>
 <Button
 onClick={handleRegenerateBlueprint}
 size="sm"
 variant="gold"
 disabled={isRegeneratingBlueprint}
 className="px-2 py-1 text-xs h-6 rounded-sm"
 >
 {isRegeneratingBlueprint ? (
 <RefreshCw className="w-3 h-3 animate-spin" />
 ) : (
 'Regenerate'
 )}
 </Button>
 </div>
 );
 }

 // loading
 return (
 <div className="flex items-center gap-2 px-3 py-2 bg-paper-2 border border-rule rounded-sm">
 <Settings className="w-3.5 h-3.5 text-muted animate-spin" />
 <span className="text-xs font-medium text-ink">Checking…</span>
 </div>
 );
 })()}

 {/* Interview Control Buttons */}
 {!loadingInterview && interview && (
 <div className="flex gap-2">
 {interview.status === 'draft' && (
 <Button onClick={handleStartInterview} variant="gold" className="rounded-sm text-sm h-9 px-4">
 <Play className="w-4 h-4 mr-1.5" />
 Start interview
 </Button>
 )}
 {interview.status === 'active' && (
 <>
 <Button onClick={handlePauseInterview} variant="outline" disabled={isUpdatingStatus} className="rounded-sm text-xs h-7 px-3">
 <Pause className="w-3.5 h-3.5 mr-1.5" />
 {isUpdatingStatus ? 'Pausing…' : 'Pause'}
 </Button>
 <Button onClick={handleStopInterview} variant="destructive" disabled={isUpdatingStatus} className="rounded-sm text-xs h-7 px-3">
 <Square className="w-3.5 h-3.5 mr-1.5" />
 Stop
 </Button>
 </>
 )}
 {interview.status === 'paused' && (
 <>
 <Button onClick={handleResumeInterview} variant="gold" className="rounded-sm text-xs h-7 px-3" disabled={isUpdatingStatus}>
 <Play className="w-3.5 h-3.5 mr-1.5" />
 {isUpdatingStatus ? 'Resuming…' : 'Resume'}
 </Button>
 <Button onClick={handleStopInterview} variant="destructive" disabled={isUpdatingStatus} className="rounded-sm text-xs h-7 px-3">
 <Square className="w-3.5 h-3.5 mr-1.5" />
 Stop
 </Button>
 </>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 <div className="p-6">
 {loadingInterview ? (
 <ShimmerInterviewConfig />
 ) : (
 <div className="space-y-3">
 {/* Configuration Details - Compact Row Layout */}
 <div className="space-y-4">
 {/* First Row: Interview Details - Clean Layout */}
 <div className="flex items-end gap-16">
 {/* Type */}
 <div className="flex flex-col">
 <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">Type</Label>
 <p className="text-sm font-semibold text-ink capitalize">{interview.type}</p>
 </div>

 {/* Voice */}
 <div className="flex flex-col">
 <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">Voice</Label>
 <p className="text-sm font-semibold text-ink capitalize">{interview.voiceType}</p>
 </div>

 {/* Communications */}
 <div className="flex flex-col">
 <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">Communications</Label>
 <div className="flex gap-2 flex-wrap">
 {interview.communications.email && (
 <span className="text-sm font-semibold text-ink">Email</span>
 )}
 {interview.communications.phone && (
 <span className="text-sm font-semibold text-ink">Phone</span>
 )}
 {interview.communications.sms && (
 <span className="text-sm font-semibold text-ink">SMS</span>
 )}
 </div>
 </div>

 {/* Duration */}
 <div className="flex flex-col items-center">
 <div
 className="w-10 h-10 rounded-full flex flex-col items-center justify-center gap-0"
 style={{
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)'
 }}
 >
 <span className="text-lg font-bold leading-tight text-paper">{interview.duration?.replace(' minutes', '').replace(' mins', '').replace('min', '').trim()}</span>
 <span className="text-[8px] leading-tight text-paper">min</span>
 </div>
 </div>
 </div>

 {/* Second Row: Description */}
 <div>
 <Label className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Description</Label>
 <p className="text-foreground text-sm mt-2">{interview.description}</p>
 </div>
 </div>

 </div>
 )}
 </div>
 </div>

 {/* Candidate Sources — only show when sources exist or are loading. */}
 <InterviewSourcesPanel
 show={Boolean(interview) && (loadingCandidateSources || candidateSources.length > 0)}
 loading={loadingCandidateSources}
 sources={candidateSources}
 hasSharedLists={hasSharedLists}
 hasQualifiedLists={hasQualifiedLists}
 interviewStatus={interview?.status}
 sourceUpdates={sourceUpdates}
 checkingSourceIds={checkingSourceIds}
 syncingSourceIds={syncingSourceIds}
 onCheckSource={handleCheckForNewCandidates}
 onSyncSource={handleSyncNewCandidates}
 />

 {/* Candidates Table - Only show if interview is started */}
 {interview?.status === 'draft' ? (
 <div className="text-center py-12 space-y-4">
 <div>
 <h3 className="text-2xl font-semibold text-foreground">Interview not started</h3>
 <p className="text-sm text-muted mt-2">
 Start the interview to begin collecting applicant responses.
 </p>
 </div>
 <Button onClick={handleStartInterview} variant="gold" className="h-9 px-6 rounded-sm">
 <Play className="w-4 h-4 mr-1.5" />
 Start interview
 </Button>
 </div>
 ) : (
 <>
 {/* Swipe QR Code Section — only while interview is actively collecting responses */}
 {(interview?.status === 'active' || interview?.status === 'running' || interview?.status === 'paused') && (
 <SwipeQRSection interviewId={id!} />
 )}

 {/* Shortlist Action Card */}
 <ShortlistActionCard interviewId={id!} interviewName={interview?.title || 'Interview'} />

 {/* Candidate Results Table */}
 <Card className="shadow-2 rounded-sm">
 {/* Sticky Header */}
 <div className="sticky top-[120px] z-40 bg-paper border-b shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-6">
 <CardTitle className="text-lg text-ink">
 Applicant results
 </CardTitle>
 {/* Legend */}
 <div className="flex items-center gap-3 text-xs">
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 bg-success"></div>
 <span className="text-muted">Immediate</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 bg-gold"></div>
 <span className="text-muted">&lt; 2 weeks</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 bg-orange"></div>
 <span className="text-muted">&gt; 1 month</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 bg-rule-strong"></div>
 <span className="text-muted">Not specified</span>
 </div>
 </div>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={refreshCandidates}
 disabled={loadingCandidates}
 className="flex items-center gap-1 h-7 text-xs px-2 rounded-sm"
 >
 <RefreshCw className={`w-3 h-3 ${loadingCandidates ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 <CardDescription className="text-sm text-muted">
 Detailed view of all applicants and their interview performance.
 </CardDescription>
 </CardHeader>

 {/* Table Filters */}
 <div className="px-6 pb-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted" />
 <Input
 placeholder="Search by name or email..."
 value={tableSearchQuery}
 onChange={(e) => setTableSearchQuery(e.target.value)}
 className="pl-8 h-8 text-xs"
 />
 </div>
 <Select value={tableStatusFilter} onValueChange={setTableStatusFilter}>
 <SelectTrigger className="w-36 h-8 text-xs">
 <SelectValue placeholder="All statuses" />
 </SelectTrigger>
 <SelectContent className="bg-surface border-border z-50">
 <SelectItem value="all">All Statuses</SelectItem>
 {uniqueStatusesForTable.map((status: string) => (
 <SelectItem key={status} value={status}>
 {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={tableScoreFilter} onValueChange={setTableScoreFilter}>
 <SelectTrigger className="w-36 h-8 text-xs">
 <SelectValue placeholder="All scores" />
 </SelectTrigger>
 <SelectContent className="bg-surface border-border z-50">
 <SelectItem value="all">All Scores</SelectItem>
 <SelectItem value="high">Excellent (90%+)</SelectItem>
 <SelectItem value="good">Good (75-89%)</SelectItem>
 <SelectItem value="fair">Fair (60-74%)</SelectItem>
 <SelectItem value="low">Low (&lt; 60%)</SelectItem>
 <SelectItem value="no-score">No Score</SelectItem>
 </SelectContent>
 </Select>
 {(tableSearchQuery || tableStatusFilter || tableScoreFilter) && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setTableSearchQuery("");
 setTableStatusFilter("");
 setTableScoreFilter("");
 }}
 className="h-8 px-2 rounded-sm uppercase font-bold"
 >
 <X className="w-3.5 h-3.5" />
 </Button>
 )}
 </div>
 </div>
 </div>

 <CardContent>
 {loadingCandidates ? (
 <ShimmerTable />
 ) : (
 <>
 {/* Re-invite stuck candidates */}
 {candidates.some((c) => ['scheduling', 'expired', 'invited'].includes((c.status || '').toLowerCase())) && (
 <div className="flex items-center justify-between p-3 mb-2 mt-4 rounded-sm bg-warning-soft border border-warning/30">
 <div className="text-sm text-warning">
 {candidates.filter((c) => ['scheduling', 'expired', 'invited'].includes((c.status || '').toLowerCase())).length}{' '}
 candidate(s) haven't started yet. Re-send their invitation email.
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={handleResendStuck}
 disabled={isResendingInvites}
 className="rounded-sm uppercase font-bold text-xs h-8 px-3 border-warning/30 text-warning hover:bg-warning-soft"
 >
 {isResendingInvites ? 'Resending…' : 'Re-invite'}
 </Button>
 </div>
 )}

 {/* Bulk shortlist top performers */}
 {eligibleForShortlist.length > 0 && (
 <div className="flex items-center justify-between p-3 mb-2 mt-4 rounded-sm bg-success-soft border border-rule">
 <div className="text-sm text-success">
 {eligibleForShortlist.length} candidate(s) scored ≥75%. Add them to a qualified list in one click.
 </div>
 <Button
 size="sm"
 variant="gold"
 onClick={() => setShowShortlistModal(true)}
 className="rounded-sm uppercase font-bold text-xs h-8 px-3"
 >
 <UserCheck className="w-3.5 h-3.5 mr-1.5" />
 Shortlist {eligibleForShortlist.length}
 </Button>
 </div>
 )}

 {/* Card Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
 {paginatedCandidates.map((candidate) => {
 const hasSingleAttempt = candidate.attempts && candidate.attempts.length === 1;

 return (
 <CandidateCard
 key={candidate.id}
 candidate={candidate}
 onClick={() => {
 // C1: navigate to InterviewResults (TAG viewer + scores)
 // instead of the deleted VideoPlayerFullPage. New
 // interviews are audio-only; review = TAG, not video.
 if (hasSingleAttempt && candidate.attempts[0].session_id) {
 navigate(`/interview/${id}/results/${candidate.attempts[0].session_id}`);
 }
 }}
 />
 );
 })}
 </div>

 {/* Pagination */}
 {totalCandidates > pageSize && (
 <div className="flex items-center justify-between mt-6">
 <div className="text-sm text-muted">
 Showing {Math.min((currentPage - 1) * pageSize + 1, totalCandidates)} to{' '}
 {Math.min(currentPage * pageSize, totalCandidates)} of {totalCandidates} candidates
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 disabled={currentPage === 1}
 className="rounded-sm uppercase font-bold"
 >
 <ChevronLeft className="w-4 h-4 mr-1" />
 Previous
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCandidates / pageSize), prev + 1))}
 disabled={currentPage >= Math.ceil(totalCandidates / pageSize)}
 className="rounded-sm uppercase font-bold"
 >
 Next
 <ChevronRight className="w-4 h-4 ml-1" />
 </Button>
 </div>
 </div>
 )}
 </>
 )}
 </CardContent>
 </Card>
 </>
 )}

 {/* Start Interview Modal */}
 <StartInterviewModal
 open={startModalOpen}
 onOpenChange={setStartModalOpen}
 isStartingInterview={isStartingInterview}
 startingProgress={startingProgress}
 interviewTitle={interview?.title}
 onClose={() => {
 setStartModalOpen(false);
 setStartingProgress("");
 }}
 onRetry={() => {
 if (interview) handleStartInterview();
 }}
 />


 {/* Blueprint View Modal */}
 {currentWorkspace && (
 <BlueprintViewModal
 isOpen={showBlueprintModal}
 onClose={() => setShowBlueprintModal(false)}
 templateId={interview?.template_id || interview?.id || ''}
 workspaceId={currentWorkspace.id}
 templateTitle={interview?.title || interview?.role || "Interview Blueprint"}
 />
 )}

 {/* Bulk Shortlist Modal */}
 <AddToQualifiedListModal
 isOpen={showShortlistModal}
 onClose={() => setShowShortlistModal(false)}
 selectedCandidates={eligibleForShortlist.map((c) => ({
 id: String(c.candidateId || c.id),
 name: c.name,
 email: c.email,
 }))}
 onSuccess={() => {
 toast({
 title: 'Applicants shortlisted',
 description: `${eligibleForShortlist.length} applicant(s) added to your qualified list.`,
 });
 }}
 />
 </div>
 );
}