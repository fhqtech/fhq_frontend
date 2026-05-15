import { useState } from "react";
import { ArrowsOut, ArrowsClockwise, CircleNotch, CheckCircle, ClockCounterClockwise } from "phosphor-react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CandidateList } from "@/services/listsApi";

interface CreateFitmentDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 fitmentTitle: string;
 setFitmentTitle: (title: string) => void;
 jobDescription: string;
 setJobDescription: (description: string) => void;
 availableLists: CandidateList[];
 selectedListIds: string[];
 onListSelection: (listId: string) => void;
 isLoadingLists: boolean;
 onRefreshLists: () => void;
 availablePrimaryInterviews: any[];
 selectedPrimaryInterviewIds: string[];
 onPrimaryInterviewSelection: (interviewId: string) => void;
 isLoadingPrimaryInterviews: boolean;
 currentStep: number;
 onNextStep: () => void;
 onPrevStep: () => void;
 onReset: () => void;
 onCreateFitment: () => Promise<void>;
 isCreating: boolean;
}

export function CreateFitmentDialog({
 open,
 onOpenChange,
 fitmentTitle,
 setFitmentTitle,
 jobDescription,
 setJobDescription,
 availableLists,
 selectedListIds,
 onListSelection,
 isLoadingLists,
 onRefreshLists,
 availablePrimaryInterviews,
 selectedPrimaryInterviewIds,
 onPrimaryInterviewSelection,
 isLoadingPrimaryInterviews,
 currentStep,
 onNextStep,
 onPrevStep,
 onReset,
 onCreateFitment,
 isCreating
}: CreateFitmentDialogProps) {
 const [isJobDescriptionModalOpen, setIsJobDescriptionModalOpen] = useState(false);

 return (
 <Dialog open={open} onOpenChange={(open) => {
 if (!open) onReset();
 onOpenChange(open);
 }}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className=" ">Create Role Fitment Interview - Step {currentStep} of 3</DialogTitle>
 <DialogDescription className="uppercase text-[10px]">
 {currentStep === 1 && "Enter interview details and job description"}
 {currentStep === 2 && "Select candidate lists for this interview"}
 {currentStep === 3 && "Link to an existing interview (optional)"}
 </DialogDescription>
 </DialogHeader>

 {/* Progress Bar */}
 <div className="flex items-center gap-2 mb-6">
 {[1, 2, 3].map((step) => (
 <div key={step} className="flex items-center">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
 step === currentStep
 ? 'bg-ink text-paper'
 : step < currentStep
 ? 'bg-green-500 text-paper'
 : 'bg-paper-3 text-muted'
 }`}>
 {step < currentStep ? '✓' : step}
 </div>
 {step < 3 && (
 <div className={`w-16 h-1 ${step < currentStep ? 'bg-green-500' : 'bg-paper-3'}`}></div>
 )}
 </div>
 ))}
 </div>

 {/* Step Content */}
 <div className="space-y-6">
 {/* Step 1: Interview Details */}
 {currentStep === 1 && (
 <Card>
 <CardHeader className="pb-4">
 <CardTitle className="uppercase font-light tracking-widest">Interview Details</CardTitle>
 <CardDescription className="uppercase text-[10px]">Basic information about the fitment interview</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="fitmentTitle" className="uppercase text-xs tracking-wider">Interview Title <span className="text-danger">*</span></Label>
 <Input
 id="fitmentTitle"
 placeholder="Enter a title for this fitment interview..."
 value={fitmentTitle}
 onChange={(e) => setFitmentTitle(e.target.value)}
 className="mt-2 rounded-sm"
 style={{
 boxShadow: 'var(--shadow-clay)'
 }}
 required
 />
 </div>

 <div>
 <Label htmlFor="jobDescription" className="uppercase text-xs tracking-wider">Job Description <span className="text-danger">*</span></Label>
 <div className="relative">
 <Textarea
 id="jobDescription"
 placeholder="Paste the job description and role requirements here..."
 value={jobDescription}
 onChange={(e) => setJobDescription(e.target.value)}
 className="mt-2 min-h-[180px] pr-10 resize-none rounded-sm"
 style={{
 boxShadow: 'var(--shadow-clay)'
 }}
 required
 />
 <Dialog open={isJobDescriptionModalOpen} onOpenChange={setIsJobDescriptionModalOpen}>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="absolute bottom-2 left-2 h-8 w-8 p-0 hover:bg-paper-3"
 onClick={() => setIsJobDescriptionModalOpen(true)}
 >
 <ArrowsOut className="h-4 w-4" />
 </Button>
 <DialogContent className="max-w-4xl max-h-[80vh]">
 <DialogHeader>
 <DialogTitle className=" ">Job Description</DialogTitle>
 <DialogDescription className="uppercase text-[10px]">
 Provide a detailed job description and role requirements for the fitment interview.
 </DialogDescription>
 </DialogHeader>
 <Textarea
 placeholder="Paste the job description and role requirements here..."
 value={jobDescription}
 onChange={(e) => setJobDescription(e.target.value)}
 className="min-h-[400px] resize-none rounded-sm"
 style={{
 boxShadow: 'var(--shadow-clay)'
 }}
 />
 <div className="flex justify-end">
 <Button
 onClick={() => setIsJobDescriptionModalOpen(false)}
 className="text-paper font-medium rounded-sm uppercase transition-all duration-200"
 style={{
 position: 'relative',
 overflow: 'hidden',
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)',
 textTransform: 'uppercase'
 }}
 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
 >
 Done
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Step 2: Candidate Lists */}
 {currentStep === 2 && (
 <Card>
 <CardHeader className="pb-4">
 <CardTitle className="text-lg">Select Candidate Lists</CardTitle>
 <CardDescription className="uppercase text-xs tracking-wider">Choose which candidate lists to include in this fitment interview</CardDescription>
 </CardHeader>
 <CardContent>
 {/* Create New List Section */}
 <div className="mb-6 p-4 bg-paper-2 border border-ink/20 rounded-sm">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="font-medium text-foreground mb-1 text-sm">Create New List Based on Fitment Criteria</h4>
 <p className="text-[10px] text-muted">Generate candidate lists automatically using AI-powered fitment analysis</p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[8px] px-2 py-1 bg-warning-soft text-warning rounded-sm font-bold uppercase">
 Coming Soon
 </span>
 </div>
 </div>
 </div>

 {/* Choose from Existing Lists - Horizontal Scrolling Cards */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-medium text-foreground uppercase">Choose from Existing Lists</h3>
 <button
 onClick={onRefreshLists}
 disabled={isLoadingLists}
 className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 title="Refresh lists"
 >
 <ArrowsClockwise className={`w-3 h-3 ${isLoadingLists ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 </div>
 {isLoadingLists ? (
 <div className="flex items-center justify-center py-8">
 <CircleNotch className="w-6 h-6 animate-spin text-ink" />
 <span className="ml-2 text-sm text-muted-foreground">Loading lists...</span>
 </div>
 ) : availableLists.length > 0 ? (
 <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
 {availableLists.map((list, index) => {
 const isSelected = selectedListIds.includes(list.id);
 const isCurated = list.collection === 'qualified_candidate_pools';
 return (
 <div
 key={`${list.id}-${index}-${isSelected}`}
 onClick={() => onListSelection(list.id)}
 className={`p-6 rounded cursor-pointer transition-all duration-200 min-h-[150px] w-52 shrink-0 relative overflow-hidden ${
 !isSelected ? 'group hover:text-paper' : ''
 }`}
 style={{
 border: isSelected ? '2px solid #22c55e' : 'none',
 position: 'relative',
 overflow: 'hidden',
 backgroundColor: 'transparent',
 boxShadow: 'var(--shadow-clay)',
 backgroundImage: isCurated
 ? 'linear-gradient(to bottom right, rgba(254, 243, 199, 0.4), rgba(254, 252, 232, 0.2), rgba(255, 247, 237, 0.3))'
 : 'none'
 }}
 onMouseEnter={(e) => {
 if (!isSelected) {
 e.currentTarget.style.backgroundColor = '#5a6c7d';
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
 {list.collection === 'qualified_candidate_pools' && (
 <div className="absolute top-0 right-0 z-20 overflow-hidden w-20 h-20 pointer-events-none">
 <div className="absolute top-0 right-0 w-28 h-6 bg-paper-2 from-amber-400 to-yellow-500 text-warning text-[10px] font-bold flex items-center justify-center shadow-2 transform rotate-45 translate-x-6 translate-y-2">
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
 <div className="mt-auto flex flex-col gap-2">
 <div className="flex items-center gap-2">
 <span className={`text-xs text-muted-foreground transition-colors ${!isSelected ? 'group-hover:text-paper/70' : ''}`}>
 {list.totalCandidates} candidates
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className={`text-xs text-muted-foreground transition-colors ${!isSelected ? 'group-hover:text-paper/70' : ''}`}>
 Created {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : 'N/A'}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-8 text-sm text-muted-foreground">
 No existing lists found.
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Step 3: Link to Primary Interviews */}
 {currentStep === 3 && (
 <Card>
 <CardHeader className="pb-4">
 <CardTitle className="uppercase font-light tracking-widest">Link to Primary Interviews</CardTitle>
 <CardDescription className="uppercase text-[10px]">Connect this fitment assessment to existing interviews (optional)</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <h3 className="text-sm font-medium text-foreground uppercase">Available Primary Interviews</h3>
 {isLoadingPrimaryInterviews ? (
 <div className="flex items-center justify-center py-8">
 <CircleNotch className="w-6 h-6 animate-spin text-ink" />
 <span className="ml-2 text-sm text-muted-foreground">Loading interviews...</span>
 </div>
 ) : availablePrimaryInterviews.length > 0 ? (
 <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
 {availablePrimaryInterviews.map((interview, index) => {
 const isSelected = selectedPrimaryInterviewIds.includes(interview.id);
 return (
 <div
 key={`${interview.id}-${index}-${isSelected}`}
 onClick={() => onPrimaryInterviewSelection(interview.id)}
 className={`p-6 rounded cursor-pointer transition-all duration-200 min-h-[150px] w-52 shrink-0 relative overflow-hidden ${
 !isSelected ? 'group hover:text-paper' : ''
 }`}
 style={{
 border: isSelected ? '2px solid #22c55e' : 'none',
 position: 'relative',
 overflow: 'hidden',
 backgroundColor: 'transparent',
 boxShadow: 'var(--shadow-clay)'
 }}
 onMouseEnter={(e) => {
 if (!isSelected) {
 e.currentTarget.style.backgroundColor = '#5a6c7d';
 }
 }}
 onMouseLeave={(e) => {
 if (!isSelected) {
 e.currentTarget.style.backgroundColor = 'transparent';
 }
 }}
 >
 <div className="flex flex-col h-full">
 <div className="mb-3">
 <h4 className={`font-medium text-sm transition-colors ${!isSelected ? 'group-hover:text-paper' : ''}`}>{interview.title}</h4>
 <p className={`text-[10px] text-muted   mt-1 transition-colors ${!isSelected ? 'group-hover:text-paper/60' : ''}`}>
 #{interview.id}
 </p>
 </div>
 <div className="mt-auto flex flex-col gap-2">
 <div className="flex items-center gap-2">
 <span className={`text-xs text-muted-foreground transition-colors ${!isSelected ? 'group-hover:text-paper/70' : ''}`}>
 {interview.candidateCount} candidates
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold transition-colors ${
 interview.status === 'active'
 ? `bg-success-soft text-success ${!isSelected ? 'group-hover:bg-green-600 group-hover:text-paper' : ''}`
 : interview.status === 'completed'
 ? `bg-info-soft text-info ${!isSelected ? 'group-hover:bg-info group-hover:text-paper' : ''}`
 : `bg-paper-3 text-ink-soft ${!isSelected ? 'group-hover:bg-muted group-hover:text-paper' : ''}`
 }`}>
 {interview.status}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-8">
 <div className="text-sm text-muted-foreground mb-3">No primary interviews available</div>
 <div className="text-xs text-muted-foreground">
 You can proceed without linking to primary interviews, or create some interviews first.
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Navigation Buttons */}
 <div className="flex justify-between">
 <Button
 variant="outline"
 onClick={currentStep === 1 ? onReset : onPrevStep}
 className="uppercase rounded-sm"
 >
 {currentStep === 1 ? 'Cancel' : 'Previous'}
 </Button>

 <Button
 onClick={currentStep === 3 ? onCreateFitment : onNextStep}
 disabled={isCreating}
 className="text-paper font-medium rounded-sm uppercase transition-all duration-200"
 style={{
 position: 'relative',
 overflow: 'hidden',
 backgroundColor: 'hsl(var(--ink))',
 boxShadow: 'var(--shadow-clay)',
 textTransform: 'uppercase'
 }}
 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
 >
 {isCreating ? (
 <>
 <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
 Creating...
 </>
 ) : currentStep === 3 ? (
 `Create Role Fitment Interview`
 ) : (
 'Next'
 )}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
