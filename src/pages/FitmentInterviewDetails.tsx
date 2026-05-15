import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Clock, Calendar, Phone, Mail, MessageSquare, UserCheck, Upload, FileText, Target, Eye, Search, Play, Pause, Square, AlertTriangle, Filter, Copy, Check, FileCheck, Settings, RefreshCw, Mic, Link as LinkIcon, Video, Loader2 } from "lucide-react";
import { CloudArrowDown, CheckCircle } from "phosphor-react";
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
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shimmer, ShimmerCard, ShimmerTable, ShimmerInterviewConfig } from "@/components/ui/shimmer";
import { fitmentInterviewApi, FitmentInterview } from "@/services/fitmentInterviewApi";
import { pauseFitmentInterview, stopFitmentInterview, resumeFitmentInterview, getFitmentInterviewStatus } from "@/services/fitmentInterviewControlService";
import aiAvatar from "@/assets/ai-avatar.png";

// API functions for backend integration
const fetchFitmentInterviewData = async (fitmentInterviewId: string) => {
 try {
 const response = await fitmentInterviewApi.getFitmentInterview(fitmentInterviewId);
 return response.fitmentInterview;
 } catch (error) {
 console.error('Error fetching fitment interview:', error);
 return null;
 }
};

// Fetch fitment interview candidates from the API
const fetchFitmentCandidates = async (fitmentInterviewId: string) => {
 try {
 const response = await fitmentInterviewApi.getFitmentInterviewCandidates(fitmentInterviewId);
 return response.candidates || [];
 } catch (error) {
 console.error('Error fetching fitment candidates:', error);
 return [];
 }
};

// ViewResultButton component - Demo Mode (copied from InterviewDetails)
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

export default function FitmentInterviewDetails() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { toast } = useToast();

 // Backend data state
 const [fitmentInterview, setFitmentInterview] = useState<FitmentInterview | null>(null);
 const [candidates, setCandidates] = useState<any[]>([]);

 // Separate loading states for each section
 const [loadingFitmentInterview, setLoadingFitmentInterview] = useState(true);
 const [loadingCandidates, setLoadingCandidates] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Start fitment interview modal states
 const [startModalOpen, setStartModalOpen] = useState(false);
 const [isStartingFitment, setIsStartingFitment] = useState(false);
 const [startingProgress, setStartingProgress] = useState("");

 // Control action loading states
 const [isPausing, setIsPausing] = useState(false);
 const [isStopping, setIsStopping] = useState(false);
 const [isResuming, setIsResuming] = useState(false);

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize] = useState(10);
 const [totalCandidates, setTotalCandidates] = useState(0);


 // Copy state for invitation links
 const [copiedCandidateId, setCopiedCandidateId] = useState<number | null>(null);

 // Candidate Lists state
 const [candidateLists, setCandidateLists] = useState<any[]>([]);
 const [loadingCandidateLists, setLoadingCandidateLists] = useState(false);

 // Function to refresh fitment interview status
 const refreshFitmentInterviewStatus = async () => {
 if (!id || !fitmentInterview) return;

 try {
 // Only check status for fitment interviews that could have been paused/stopped/resumed
 if (['active', 'paused', 'stopped'].includes(fitmentInterview.status.toLowerCase())) {
 const statusResponse = await getFitmentInterviewStatus(id);

 if (statusResponse.success && statusResponse.status !== fitmentInterview.status) {
 // Update fitment interview status if it has changed
 setFitmentInterview(prev => prev ? {
 ...prev,
 status: statusResponse.status as any
 } : null);
 }
 }
 } catch (error) {
 // If status check fails, keep original status
 console.warn(`Failed to check status for fitment interview ${id}:`, error);
 }
 };

 // Refresh candidates data
 const refreshCandidates = async () => {
 if (!id || !fitmentInterview || fitmentInterview.status === 'draft') return;

 try {
 setLoadingCandidates(true);
 const candidatesData = await fetchFitmentCandidates(id);

 // Map candidates data for fitment interview context
 const mappedCandidates = candidatesData.map((candidate: any, index: number) => ({
 id: candidate.id || index + 1,
 candidateId: candidate.candidateId || candidate.candidate_id || `candidate_${index + 1}`,
 name: candidate.name || 'Unknown',
 email: candidate.email || '',
 phone: candidate.phone || '',
 status: mapBackendStatus(candidate.status),
 score: candidate.score || null, // Keep as null/- for regular scores
 fitmentScore: candidate.fitment_score || Math.floor(Math.random() * 25) + 75, // Mock fitment score (75-99) for demo
 completedAt: candidate.assessment_completed ? candidate.created_at : null,
 duration: null,
 invitationLink: candidate.invitation_token ? `${import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:8080'}/register/${candidate.invitation_token}` : null,
 // Video session fields
 sessionId: candidate.sessionId,
 hasVideoSession: candidate.hasVideoSession || false,
 recordingStatus: candidate.recordingStatus || 'pending'
 }));

 setCandidates(mappedCandidates);
 setTotalCandidates(mappedCandidates.length);

 toast({
 title: "Candidates Refreshed",
 description: "Candidate data has been updated successfully"
 });
 } catch (err) {
 console.error('Error refreshing candidates:', err);
 toast({
 title: "Refresh Failed",
 description: "Failed to refresh candidate data. Please try again.",
 variant: "destructive"
 });
 } finally {
 setLoadingCandidates(false);
 }
 };

 // Table filters
 const [tableSearchQuery, setTableSearchQuery] = useState("");
 const [tableStatusFilter, setTableStatusFilter] = useState("");
 const [tableScoreFilter, setTableScoreFilter] = useState("");

 // Load fitment interview data
 useEffect(() => {
 const loadFitmentInterviewData = async () => {
 if (!id) return;

 try {
 setLoadingFitmentInterview(true);
 setError(null);

 const fitmentData = await fetchFitmentInterviewData(id);
 console.log('Fitment interview data received:', fitmentData);

 if (fitmentData) {
 setFitmentInterview(fitmentData);
 } else {
 setError('Fitment interview not found');
 }
 } catch (err) {
 console.error('Error loading fitment interview:', err);
 setError('Failed to load fitment interview data');
 } finally {
 setLoadingFitmentInterview(false);
 }
 };

 loadFitmentInterviewData();
 }, [id]);

 // Load candidates data - only when fitment interview starts
 useEffect(() => {
 const loadCandidatesData = async () => {
 if (!id || !fitmentInterview || fitmentInterview.status === 'draft') {
 setLoadingCandidates(false);
 return;
 }

 try {
 setLoadingCandidates(true);
 const candidatesData = await fetchFitmentCandidates(id);

 // Map candidates data for fitment interview context
 const mappedCandidates = candidatesData.map((candidate: any, index: number) => ({
 id: candidate.id || index + 1,
 candidateId: candidate.candidateId || candidate.candidate_id || `candidate_${index + 1}`,
 name: candidate.name || 'Unknown',
 email: candidate.email || '',
 phone: candidate.phone || '',
 status: mapBackendStatus(candidate.status),
 score: candidate.score || null, // Keep as null/- for regular scores
 fitmentScore: candidate.fitment_score || Math.floor(Math.random() * 25) + 75, // Mock fitment score (75-99) for demo
 completedAt: candidate.assessment_completed ? candidate.created_at : null,
 duration: null,
 invitationLink: candidate.invitation_token ? `${import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:8080'}/register/${candidate.invitation_token}` : null,
 // Video session fields
 sessionId: candidate.sessionId,
 hasVideoSession: candidate.hasVideoSession || false,
 recordingStatus: candidate.recordingStatus || 'pending'
 }));

 setCandidates(mappedCandidates);
 setTotalCandidates(mappedCandidates.length);
 } catch (err) {
 console.error('Error loading candidates:', err);
 } finally {
 setLoadingCandidates(false);
 }
 };

 loadCandidatesData();
 }, [id, fitmentInterview?.status]);

 // Periodic status checking
 useEffect(() => {
 if (fitmentInterview && ['active', 'paused'].includes(fitmentInterview.status)) {
 // Initial check after fitment interview is loaded
 refreshFitmentInterviewStatus();

 // Set up interval to check every 30 seconds
 const interval = setInterval(refreshFitmentInterviewStatus, 30000);

 // Cleanup on unmount or dependency change
 return () => clearInterval(interval);
 }
 }, [fitmentInterview?.id, fitmentInterview?.status]); // Only depends on id and status to avoid infinite loops

 // Load candidate lists
 useEffect(() => {
 const loadCandidateLists = async () => {
 if (!fitmentInterview || !fitmentInterview.lists || fitmentInterview.lists.length === 0) {
 setLoadingCandidateLists(false);
 return;
 }

 try {
 setLoadingCandidateLists(true);
 const token = localStorage.getItem('auth_token');

 // Fetch each list
 const listsData = await Promise.all(
 fitmentInterview.lists.map(async (listId) => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/lists/${listId}/details`, {
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
 });

 if (response.ok) {
 const data = await response.json();
 return data.list;
 }
 return null;
 } catch (error) {
 console.error(`Error fetching list ${listId}:`, error);
 return null;
 }
 })
 );

 setCandidateLists(listsData.filter(Boolean));
 } catch (error) {
 console.error('Error loading candidate lists:', error);
 setCandidateLists([]);
 } finally {
 setLoadingCandidateLists(false);
 }
 };

 loadCandidateLists();
 }, [fitmentInterview?.lists]);

 // Map backend status to frontend status
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

 // Error state
 if (error) {
 return (
 <div className="text-center py-12">
 <h2 className="text-2xl font-bold text-foreground">Fitment Interview Not Found</h2>
 <p className="text-muted-foreground mt-2">{error}</p>
 <Button onClick={() => navigate("/interviews/fitment")} className="mt-4">
 <ArrowLeft className="w-4 h-4 mr-2" />
 Back to Fitment Interviews
 </Button>
 </div>
 );
 }

 // Fitment interview control functions
 const handleStartFitmentInterview = async () => {
 console.log('🚀 Start Fitment Interview clicked', { fitmentInterview: fitmentInterview?.title, id, modalOpen: startModalOpen });
 if (!fitmentInterview || !id) return;

 // Open modal and start the process
 setStartModalOpen(true);
 setIsStartingFitment(true);

 try {
 // Step 1: Checking fitment interview configuration
 setStartingProgress("Checking fitment interview configuration...");
 await new Promise(resolve => setTimeout(resolve, 500));

 // Step 2: Loading candidate information
 setStartingProgress("Loading candidates from selected lists...");
 await new Promise(resolve => setTimeout(resolve, 800));

 // Step 3: Generating invitations
 setStartingProgress("Generating fitment assessment invitations...");
 await new Promise(resolve => setTimeout(resolve, 600));

 // Step 4: Creating tokens
 setStartingProgress("Creating fitment assessment tokens...");
 await new Promise(resolve => setTimeout(resolve, 700));

 // Call the real API to start the fitment interview
 const response = await fitmentInterviewApi.startFitmentInterview(id);

 if (response.success) {
 // Step 5: Finalizing
 setStartingProgress("Finalizing fitment interview activation...");
 await new Promise(resolve => setTimeout(resolve, 800));

 // Update fitment interview status with response data
 if (response.updated_fitment_interview) {
 setFitmentInterview(prev => prev ? {
 ...prev,
 status: 'active',
 ...response.updated_fitment_interview
 } : null);
 } else {
 // Fallback to update status
 setFitmentInterview(prev => prev ? { ...prev, status: 'active' } : null);
 }

 // Show success state briefly before closing
 setStartingProgress("Fitment interview started successfully!");
 await new Promise(resolve => setTimeout(resolve, 1500));

 setStartModalOpen(false);
 setStartingProgress("");

 toast({
 title: "Fitment Interview Started!",
 description: `${response.total_invitations_created || ''} invitation links generated for "${fitmentInterview.title}"`
 });
 } else {
 // Don't close modal on error - show error message instead
 setStartingProgress(`Error: ${response.error || "Failed to start fitment interview"}`);
 toast({
 title: "Error Starting Fitment Interview",
 description: response.error || "Failed to start fitment interview",
 variant: "destructive"
 });
 }
 } catch (error) {
 // Don't close modal on error - show error message instead
 setStartingProgress("Error: Failed to start fitment interview. Please try again.");
 toast({
 title: "Error",
 description: "Failed to start fitment interview. Please try again.",
 variant: "destructive"
 });
 } finally {
 setIsStartingFitment(false);
 // Don't reset these on error - keep modal open
 }
 };

 const handlePauseFitmentInterview = async () => {
 if (!fitmentInterview || !id || isPausing) return;

 setIsPausing(true);
 try {
 const response = await pauseFitmentInterview(id);

 if (response.success) {
 // Update fitment interview status locally
 setFitmentInterview(prev => prev ? { ...prev, status: 'paused' } : null);

 toast({
 title: "Fitment Interview Paused",
 description: `"${fitmentInterview.title}" has been paused successfully`,
 });
 }
 } catch (error) {
 console.error('Failed to pause fitment interview:', error);
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : "Failed to pause fitment interview",
 variant: "destructive"
 });
 } finally {
 setIsPausing(false);
 }
 };

 const handleStopFitmentInterview = async () => {
 if (!fitmentInterview || !id || isStopping) return;

 setIsStopping(true);
 try {
 const response = await stopFitmentInterview(id);

 if (response.success) {
 // Update fitment interview status locally
 setFitmentInterview(prev => prev ? { ...prev, status: 'stopped' } : null);

 toast({
 title: "Fitment Interview Stopped",
 description: `"${fitmentInterview.title}" has been stopped permanently`,
 });
 }
 } catch (error) {
 console.error('Failed to stop fitment interview:', error);
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : "Failed to stop fitment interview",
 variant: "destructive"
 });
 } finally {
 setIsStopping(false);
 }
 };

 const handleResumeFitmentInterview = async () => {
 if (!fitmentInterview || !id || isResuming) return;

 setIsResuming(true);
 try {
 const response = await resumeFitmentInterview(id);

 if (response.success) {
 // Update fitment interview status locally
 setFitmentInterview(prev => prev ? { ...prev, status: 'active' } : null);

 toast({
 title: "Fitment Interview Resumed",
 description: `"${fitmentInterview.title}" has been resumed successfully`,
 });
 }
 } catch (error) {
 console.error('Failed to resume fitment interview:', error);
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : "Failed to resume fitment interview",
 variant: "destructive"
 });
 } finally {
 setIsResuming(false);
 }
 };

 const completedCandidates = candidates.filter(c => c.status === "completed");
 const eligibleForShortlist = completedCandidates.filter(c => c.fitmentScore && c.fitmentScore >= 75);
 const participationRate = candidates.length > 0 ? Math.round((candidates.filter(c => c.status !== "pending").length / candidates.length) * 100) : 0;

 // Filter candidates for main table
 const filteredCandidatesForTable = candidates.filter(candidate => {
 const matchesSearch =
 candidate.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
 candidate.email.toLowerCase().includes(tableSearchQuery.toLowerCase());

 const matchesStatus = tableStatusFilter === "all" || !tableStatusFilter || candidate.status === tableStatusFilter;

 const matchesScore = (() => {
 if (!tableScoreFilter || tableScoreFilter === "all") return true;
 if (!candidate.fitmentScore) return tableScoreFilter === "no-score";

 switch (tableScoreFilter) {
 case "high": return candidate.fitmentScore >= 90;
 case "good": return candidate.fitmentScore >= 75 && candidate.fitmentScore < 90;
 case "fair": return candidate.fitmentScore >= 60 && candidate.fitmentScore < 75;
 case "low": return candidate.fitmentScore < 60;
 default: return true;
 }
 })();

 return matchesSearch && matchesStatus && matchesScore;
 });

 const uniqueStatusesForTable = [...new Set(candidates.map(c => c.status))];

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
 {/* Header */}
 <div className="flex items-center gap-4">
 <Button
 variant="outline"
 onClick={() => navigate("/interviews/fitment")}
 className="flex items-center gap-2"
 >
 <ArrowLeft className="w-4 h-4" />
 Back
 </Button>
 <div className="flex-1">
 {loadingFitmentInterview ? (
 <div className="space-y-2">
 <Shimmer className="h-8 w-64" />
 <Shimmer className="h-4 w-96" />
 </div>
 ) : (
 <>
 <h1 className="text-4xl font-bold text-foreground mb-2">{fitmentInterview?.title}</h1>
 <p className="text-foreground text-sm font-semibold uppercase tracking-wider mt-1">
 #{id}
 </p>
 <p className="text-muted text-[10px] uppercase tracking-wider mt-0.5">
 Created on {fitmentInterview?.created}
 </p>
 </>
 )}
 </div>
 </div>

 {/* Overview Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
 {loadingCandidates ? (
 <ShimmerCard />
 ) : (
 <div className="flex items-center gap-4">
 <p className="text-5xl font-bold text-foreground">{fitmentInterview?.candidateCount || 0}</p>
 <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
 <div>Total</div>
 <div>Candidates</div>
 </div>
 </div>
 )}
 </div>
 <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
 {loadingCandidates ? (
 <ShimmerCard />
 ) : (
 <div className="flex items-center gap-4">
 <p className="text-5xl font-bold text-foreground">{completedCandidates.length || 0}</p>
 <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
 <div>Completed</div>
 </div>
 </div>
 )}
 </div>
 <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
 {loadingFitmentInterview ? (
 <ShimmerCard />
 ) : (
 <div className="flex items-center gap-4">
 <p className="text-5xl font-bold text-foreground">{fitmentInterview?.parentInterviewsCount || 0}</p>
 <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
 <div>Linked</div>
 <div>Primary</div>
 <div>Interviews</div>
 </div>
 </div>
 )}
 </div>
 <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
 {loadingCandidates ? (
 <ShimmerCard />
 ) : (
 <div className="flex items-center gap-4">
 <p className="text-5xl font-bold text-foreground">{participationRate || 0}%</p>
 <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
 <div>Participation</div>
 <div>Rate</div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Fitment Interview Configuration */}
 <div className="bg-paper rounded-sm border border-rule" style={{ boxShadow: 'var(--shadow-clay)' }}>
 <div className="px-6 py-5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <img src={aiAvatar} alt="AI" className="w-12 h-12 rounded-full" />
 <div className="flex-1">
 <h3 className="text-lg font-semibold uppercase tracking-wider">Fitment Interview Configuration</h3>
 <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">Current settings and linked interviews</p>
 </div>
 </div>

 {/* Control Buttons Row */}
 <div className="flex items-center gap-4">
 {/* Fitment Interview Control Buttons */}
 {!loadingFitmentInterview && fitmentInterview && (
 <div className="flex gap-2">
 {fitmentInterview.status === 'draft' && (
 <Button
 onClick={handleStartFitmentInterview}
 className="text-paper font-medium rounded-sm uppercase"
 style={{
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)'
 }}
 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
 >
 <Play className="w-4 h-4 mr-2" />
 Begin Fitment Assessment
 </Button>
 )}
 {fitmentInterview.status === 'active' && (
 <>
 <Button
 onClick={handlePauseFitmentInterview}
 variant="outline"
 disabled={isPausing || isStopping}
 >
 {isPausing ? (
 <Spinner size="sm" variant="brand" className="mr-2" />
 ) : (
 <Pause className="w-4 h-4 mr-2" />
 )}
 {isPausing ? 'Pausing...' : 'Pause'}
 </Button>
 <Button
 onClick={handleStopFitmentInterview}
 variant="destructive"
 disabled={isPausing || isStopping}
 >
 {isStopping ? (
 <Spinner size="sm" variant="inverse" className="mr-2" />
 ) : (
 <Square className="w-4 h-4 mr-2" />
 )}
 {isStopping ? 'Stopping...' : 'Stop'}
 </Button>
 </>
 )}
 {fitmentInterview.status === 'paused' && (
 <>
 <Button
 onClick={handleResumeFitmentInterview}
 className="text-paper font-medium rounded-sm uppercase"
 style={{
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)'
 }}
 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
 disabled={isResuming || isStopping}
 >
 {isResuming ? (
 <Spinner size="sm" variant="inverse" className="mr-2" />
 ) : (
 <Play className="w-4 h-4 mr-2" />
 )}
 {isResuming ? 'Resuming...' : 'Resume'}
 </Button>
 <Button
 onClick={handleStopFitmentInterview}
 variant="destructive"
 disabled={isResuming || isStopping}
 >
 {isStopping ? (
 <Spinner size="sm" variant="inverse" className="mr-2" />
 ) : (
 <Square className="w-4 h-4 mr-2" />
 )}
 {isStopping ? 'Stopping...' : 'Stop'}
 </Button>
 </>
 )}
 {fitmentInterview.status === 'stopped' && (
 <Badge variant="destructive" className="px-4 py-2">
 <Square className="w-4 h-4 mr-2" />
 Stopped
 </Badge>
 )}
 {fitmentInterview.status === 'completed' && (
 <Badge variant="secondary" className="px-4 py-2">
 <Check className="w-4 h-4 mr-2" />
 Completed
 </Badge>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 <div className="p-6">
 {loadingFitmentInterview ? (
 <ShimmerInterviewConfig />
 ) : (
 <div className="space-y-4">
 {/* Configuration Details */}
 <div className="space-y-6">

 {/* Linked Interviews */}
 {fitmentInterview?.parentInterviews && fitmentInterview.parentInterviews.length > 0 && (
 <div>
 <Label className="uppercase text-xs tracking-wider font-bold text-ink">Linked Primary Interviews</Label>
 <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {fitmentInterview.parentInterviews.map((interview, index) => (
 <div
 key={index}
 className="p-4 bg-paper border border-rule-strong rounded-sm hover:border-rule-strong transition-colors cursor-pointer"
 style={{ boxShadow: 'var(--shadow-clay)' }}
 onClick={() => navigate(`/interview/${interview.interviewId}`)}
 >
 <div className="flex items-start justify-between mb-2">
 <h4 className="font-semibold text-sm text-ink uppercase tracking-wider">{interview.interviewTitle}</h4>
 </div>
 <p className="text-xs text-muted font-mono break-all">ID: {interview.interviewId}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Job Description */}
 <div>
 <Label className="uppercase text-xs tracking-wider font-bold text-ink">Job Description</Label>
 <p className="mt-2 text-foreground text-sm whitespace-pre-wrap">{fitmentInterview.jobDescription}</p>
 </div>

 </div>
 </div>
 )}
 </div>
 </div>

 {/* Candidate Lists */}
 {fitmentInterview && (
 <div
 className="rounded-sm bg-paper"
 style={{
 boxShadow: 'var(--shadow-clay)'
 }}
 >
 <div className="px-6 py-5">
 <div className="flex items-center gap-4">
 <CloudArrowDown size={48} weight="thin" />
 <div className="flex-1">
 <h3 className="text-lg font-semibold uppercase tracking-wider">Candidate Lists</h3>
 <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">View candidate lists attached to this fitment interview</p>
 <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm">
 <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
 <p className="text-[10px] text-amber-700 uppercase tracking-wider">
 Note: Candidates added to these lists after the fitment interview started will not be included
 </p>
 </div>
 </div>
 </div>
 </div>
 <div className="p-6">
 {loadingCandidateLists ? (
 <div className="space-y-3">
 <Shimmer className="h-20 w-full rounded-sm" />
 <Shimmer className="h-20 w-full rounded-sm" />
 </div>
 ) : candidateLists.length === 0 ? (
 <div className="text-center py-8">
 <FileText className="w-12 h-12 text-muted-2 mx-auto mb-3" />
 <p className="text-sm text-muted">No candidate lists found</p>
 </div>
 ) : (
 <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
 {candidateLists.map((list: any) => {
 const isCurated = list.collection === 'qualified_candidate_pools';
 return (
 <div
 key={list.id}
 onClick={() => navigate(`/lists/${list.id}`)}
 className="p-6 rounded cursor-pointer transition-all duration-200 min-h-[150px] w-52 flex-shrink-0 relative overflow-hidden group hover:text-paper"
 style={{
 border: 'none',
 position: 'relative',
 overflow: 'hidden',
 backgroundColor: 'transparent',
 boxShadow: 'var(--shadow-clay)',
 backgroundImage: isCurated
 ? 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))'
 : 'none'
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.backgroundColor = '#5a6c7d';
 e.currentTarget.style.backgroundImage = 'none';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.backgroundColor = 'transparent';
 if (isCurated) {
 e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))';
 } else {
 e.currentTarget.style.backgroundImage = 'none';
 }
 }}
 >
 {/* Curated Corner Ribbon */}
 {isCurated && (
 <div className="absolute top-0 right-0 z-20 overflow-hidden w-20 h-20 pointer-events-none">
 <div className="absolute top-0 right-0 w-28 h-6 bg-paper-2 from-amber-400 to-yellow-500 text-amber-900 text-[10px] font-bold flex items-center justify-center shadow-2 transform rotate-45 translate-x-6 translate-y-2">
 Curated
 </div>
 </div>
 )}
 <div className="flex flex-col h-full">
 <div className="mb-3">
 <h4 className="font-medium text-sm transition-colors group-hover:text-paper">{list.name}</h4>
 <p className="text-[10px] text-muted uppercase tracking-wider mt-1 transition-colors group-hover:text-paper/60">
 #{list.id}
 </p>
 </div>
 {list.description && (
 <p className="text-xs text-muted-foreground mb-3 line-clamp-2 transition-colors group-hover:text-paper/80">{list.description}</p>
 )}
 <div className="mt-auto flex flex-col gap-2">
 <div className="flex items-center gap-2">
 <span className="text-xs text-muted-foreground transition-colors uppercase group-hover:text-paper/70">
 {list.totalCandidates || 0} Candidates
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground transition-colors uppercase group-hover:text-paper/70">
 {list.sourcesCount || 0} Sources
 </span>
 {list.updatedAt && (
 <span className="text-xs text-muted-foreground transition-colors group-hover:text-paper/60">
 {new Date(list.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Candidates Table - Only show if fitment interview is started */}
 {fitmentInterview?.status === 'draft' ? (
 <div className="text-center py-12 space-y-4">
 <div>
 <h3 className="text-2xl font-semibold text-foreground">Fitment Assessment Not Started</h3>
 <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
 Begin the fitment assessment to start evaluating candidates and view their results here
 </p>
 </div>
 <Button
 onClick={handleStartFitmentInterview}
 className="text-paper font-medium rounded-sm uppercase h-9 px-6 text-xs"
 style={{
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)'
 }}
 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
 >
 <Play className="w-4 h-4 mr-1.5" />
 Begin Fitment Assessment
 </Button>
 </div>
 ) : (
 <div className="bg-paper rounded-sm border border-rule p-6" style={{ boxShadow: 'var(--shadow-clay)' }}>
 <div className="mb-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-bold uppercase tracking-wider mb-1 text-ink">
 Candidate Fitment Results ({loadingCandidates ? '...' : filteredCandidatesForTable.length})
 </h2>
 <p className="text-sm text-muted uppercase tracking-wider">
 Detailed view of all candidates and their fitment assessment performance
 </p>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={refreshCandidates}
 disabled={loadingCandidates}
 className="flex items-center gap-2"
 >
 <RefreshCw className={`w-4 h-4 ${loadingCandidates ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>
 <div>
 {/* Table Filters */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
 <Input
 placeholder="Search by name or email..."
 value={tableSearchQuery}
 onChange={(e) => setTableSearchQuery(e.target.value)}
 className="pl-10"
 />
 </div>
 <Select value={tableStatusFilter} onValueChange={setTableStatusFilter}>
 <SelectTrigger className="w-40">
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
 <SelectTrigger className="w-40">
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
 >
 <X className="w-4 h-4" />
 </Button>
 )}
 </div>

 {loadingCandidates ? (
 <ShimmerTable />
 ) : (
 <>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="uppercase text-xs tracking-wider">Candidate</TableHead>
 <TableHead className="uppercase text-xs tracking-wider">Contact</TableHead>
 <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
 <TableHead className="text-center uppercase text-xs tracking-wider">Score</TableHead>
 <TableHead className="text-center uppercase text-xs tracking-wider">Fitment Score</TableHead>
 <TableHead className="text-center uppercase text-xs tracking-wider">Duration</TableHead>
 <TableHead className="text-center uppercase text-xs tracking-wider">Invitation Link</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredCandidatesForTable.map((candidate) => (
 <TableRow
 key={candidate.id}
 className="cursor-pointer hover:bg-paper-2 transition-colors"
 onClick={() => {
 // C1: route to InterviewResults (TAG) instead of
 // the deleted VideoPlayerFullPage. Same route is
 // used for screening + fitment results.
 if (candidate.sessionId) {
 navigate(`/interview/${id}/results/${candidate.sessionId}`);
 } else {
 toast({
 title: "No Interview Found",
 description: `${candidate.name} has not completed an interview session yet.`,
 variant: "default"
 });
 }
 }}
 title="View candidate details and video session"
 >
 <TableCell className="font-medium">
 <div className="flex items-center gap-2">
 {candidate.name}
 {candidate.sessionId && (
 <Video className="w-4 h-4 text-blue-500" title="Video available" />
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="text-sm">
 <div className="text-muted">{candidate.email}</div>
 {candidate.phone && candidate.phone !== '-' && (
 <div className="text-muted">{candidate.phone}</div>
 )}
 </div>
 </TableCell>
 <TableCell>
 <StatusBadge status={candidate.status} />
 </TableCell>
 <TableCell className="text-center">
 {candidate.score ? (
 <span className={getScoreColor(candidate.score)}>
 {candidate.score}%
 </span>
 ) : (
 <span className="text-muted">-</span>
 )}
 </TableCell>
 <TableCell className="text-center">
 {candidate.fitmentScore ? (
 <div className="flex items-center justify-center gap-2">
 <span className={getScoreColor(candidate.fitmentScore)}>
 {candidate.fitmentScore}%
 </span>
 <ViewResultButton
 candidate={candidate}
 interviewId={id || ''}
 />
 </div>
 ) : (
 <span className="text-muted">-</span>
 )}
 </TableCell>
 <TableCell className="text-center text-muted">
 {candidate.duration || "-"}
 </TableCell>
 <TableCell className="text-center">
 {candidate.invitationLink ? (
 <Button
 variant="ghost"
 size="sm"
 className="h-8 w-8 p-0"
 onClick={() => copyInvitationLink(candidate.id, candidate.invitationLink)}
 title="Copy invitation link"
 >
 {copiedCandidateId === candidate.id ? (
 <Check className="h-4 w-4 text-success" />
 ) : (
 <Copy className="h-4 w-4 text-muted hover:text-foreground" />
 )}
 </Button>
 ) : (
 <span className="text-muted text-sm">-</span>
 )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>

 {/* Pagination */}
 {totalCandidates > pageSize && (
 <div className="flex items-center justify-between mt-4">
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
 >
 <ChevronLeft className="w-4 h-4 mr-1" />
 Previous
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCandidates / pageSize), prev + 1))}
 disabled={currentPage >= Math.ceil(totalCandidates / pageSize)}
 >
 Next
 <ChevronRight className="w-4 h-4 ml-1" />
 </Button>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 )}

 {/* Start Fitment Interview Modal */}
 <Dialog open={startModalOpen} onOpenChange={(open) => {
 if (!isStartingFitment) {
 setStartModalOpen(open);
 if (!open) {
 setStartingProgress("");
 }
 }
 }}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 {isStartingFitment ? (
 <>
 <Spinner size="sm" variant="brand" />
 Starting Fitment Assessment
 </>
 ) : startingProgress?.startsWith('Error:') ? (
 <>
 <div className="rounded-full h-4 w-4 bg-red-500 flex items-center justify-center">
 <span className="text-paper text-xs">!</span>
 </div>
 Fitment Assessment Start Failed
 </>
 ) : (
 <>
 <div className="rounded-full h-4 w-4 bg-green-500 flex items-center justify-center">
 <span className="text-paper text-xs">✓</span>
 </div>
 Fitment Assessment Started
 </>
 )}
 </DialogTitle>
 <DialogDescription>
 {isStartingFitment ? (
 `Setting up "${fitmentInterview?.title}" for candidate fitment assessment`
 ) : startingProgress?.startsWith('Error:') ? (
 `There was an issue starting "${fitmentInterview?.title}"`
 ) : (
 `"${fitmentInterview?.title}" is now ready for candidate assessment`
 )}
 </DialogDescription>
 </DialogHeader>
 <div className="py-6">
 <div className="space-y-4">
 <div className={`text-sm ${startingProgress?.startsWith('Error:') ? 'text-red-600' : 'text-muted'}`}>
 {startingProgress || "Preparing fitment assessment..."}
 </div>
 {isStartingFitment && (
 <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
 <div
 className="bg-paper-2 from-ink to-gold h-full transition-all duration-500 ease-out"
 style={{
 width: '100%',
 animation: 'pulse 1.5s ease-in-out infinite'
 }}
 ></div>
 </div>
 )}
 {startingProgress?.startsWith('Error:') && (
 <div className="flex gap-2 pt-4">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setStartModalOpen(false);
 setStartingProgress("");
 }}
 >
 Close
 </Button>
 <Button
 size="sm"
 onClick={() => {
 if (fitmentInterview) {
 handleStartFitmentInterview();
 }
 }}
 >
 Retry start
 </Button>
 </div>
 )}
 </div>
 </div>
 </DialogContent>
 </Dialog>

 </div>
 );
}