import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, CheckCircle, Trash, X } from 'lucide-react';
import { CircleNotch } from 'phosphor-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { listsApi } from '@/services/listsApi';

interface CreateListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

// Google Sheets URL row interface
interface SheetUrlRow {
  id: string;
  url: string;
  status: 'idle' | 'validating' | 'valid' | 'error';
  candidateCount: number;
  sheetName: string;
  error?: string;
}

// Manual entry candidate interface
interface ManualCandidate {
  id: string;
  name: string;
  email: string;
}

export function CreateListDialog({ open, onClose, onCreate }: CreateListDialogProps) {
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Source entry type toggle (Google Sheets vs Manual Entry)
  const [sourceEntryType, setSourceEntryType] = useState<'google_sheet' | 'manual_entry'>('google_sheet');

  // Google Sheets URL rows
  const [sheetUrlRows, setSheetUrlRows] = useState<SheetUrlRow[]>([
    { id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }
  ]);

  // Manual entry candidates
  const [manualCandidates, setManualCandidates] = useState<ManualCandidate[]>([
    { id: 'candidate_1', name: '', email: '' }
  ]);

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  const handleCreateList = async () => {
    if (!formData.name.trim() || !currentWorkspace || !currentProject) {
      toast({
        title: "Name Required",
        description: "Please enter a list name.",
        variant: "destructive"
      });
      return;
    }

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
      // Manual entry - create a single source with all candidates
      const validCandidates = manualCandidates.filter(c => c.name.trim() && c.email.trim() && isValidEmail(c.email));
      if (validCandidates.length > 0) {
        validSources = [{
          id: `source_${Date.now()}`,
          type: 'manual_entry' as const,
          name: 'Manual Entry',
          candidateCount: validCandidates.length,
          status: 'validated' as const,
          metadata: { candidates: validCandidates }
        }];
        totalCandidates = validCandidates.length;
      }
    }

    // Initialize progress steps
    const steps = [
      { id: 'validate', title: 'Validating list details', status: 'pending' as const },
      { id: 'create', title: 'Creating list', status: 'pending' as const },
      ...(validSources.length > 0 ? [{ id: 'sources', title: `Adding ${validSources.length} source${validSources.length !== 1 ? 's' : ''} (${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''})`, status: 'pending' as const }] : []),
      { id: 'finalize', title: 'Finalizing setup', status: 'pending' as const }
    ];

    setProgressSteps(steps);
    setOverallProgress(0);
    setProgressModalOpen(true);

    try {
      // Step 1: Validate
      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'active' } : step
      ));
      setOverallProgress(10);

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgressSteps(prev => prev.map(step =>
        step.id === 'validate' ? { ...step, status: 'completed', message: 'List details validated' } : step
      ));
      setOverallProgress(25);

      // Step 2: Create the list
      setProgressSteps(prev => prev.map(step =>
        step.id === 'create' ? { ...step, status: 'active' } : step
      ));

      const listId = await listsApi.createProjectList(currentWorkspace.id, currentProject.id, {
        name: formData.name,
        description: formData.description
      });

      setProgressSteps(prev => prev.map(step =>
        step.id === 'create' ? { ...step, status: 'completed', message: 'List created successfully' } : step
      ));
      setOverallProgress(validSources.length > 0 ? 50 : 75);

      // Step 3: Add sources (if any)
      if (validSources.length > 0) {
        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'active' } : step
        ));

        for (let i = 0; i < validSources.length; i++) {
          const source = validSources[i];
          await listsApi.addSourceToProjectList(currentWorkspace.id, currentProject.id, listId, {
            type: source.type,
            metadata: source.metadata || {},
            name: source.name
          });

          const sourceProgress = 50 + (20 / validSources.length) * (i + 1);
          setOverallProgress(sourceProgress);
        }

        setProgressSteps(prev => prev.map(step =>
          step.id === 'sources' ? { ...step, status: 'completed', message: `${validSources.length} source${validSources.length !== 1 ? 's' : ''} added` } : step
        ));
        setOverallProgress(75);
      }

      // Step 4: Finalize
      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'active' } : step
      ));

      setProgressSteps(prev => prev.map(step =>
        step.id === 'finalize' ? { ...step, status: 'completed', message: 'List ready to use' } : step
      ));
      setOverallProgress(100);

      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      setFormData({ name: '', description: '' });
      setSheetUrlRows([{ id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }]);
      setManualCandidates([{ id: 'candidate_1', name: '', email: '' }]);
      setSourceEntryType('google_sheet');
      setProgressModalOpen(false);
      setProgressSteps([]);
      setOverallProgress(0);

      toast({
        title: "List Created",
        description: `"${formData.name}" has been created successfully.`
      });

      onCreate();
      onClose();
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
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    setSheetUrlRows([{ id: 'row_1', url: '', status: 'idle', candidateCount: 0, sheetName: '' }]);
    setManualCandidates([{ id: 'candidate_1', name: '', email: '' }]);
    setSourceEntryType('google_sheet');
    onClose();
  };

  return (
    <>
      {/* Main Create Dialog */}
      <Dialog open={open && !progressModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider text-ink">
              Create New Candidate Pool
            </DialogTitle>
            <DialogDescription className="uppercase text-xs tracking-wider">
              Create a new candidate pool with sources
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* List Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="listName" className="uppercase text-xs tracking-wider">Candidate Pool Name *</Label>
                <Input
                  id="listName"
                  placeholder="e.g., Marketing Team Candidates"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2 rounded-sm border-none"
                  style={{
                    boxShadow: 'var(--shadow-clay)'
                  }}
                />
              </div>
              <div>
                <Label htmlFor="listDescription" className="uppercase text-xs tracking-wider">Description</Label>
                <Input
                  id="listDescription"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-2 rounded-sm border-none"
                  style={{
                    boxShadow: 'var(--shadow-clay)'
                  }}
                />
              </div>
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
                      ? 'bg-[hsl(var(--ink))] text-paper'
                      : 'bg-paper-3 text-muted-foreground hover:bg-paper-3'
                  }`}
                >
                  Google Sheets
                </button>
                <button
                  type="button"
                  onClick={() => setSourceEntryType('manual_entry')}
                  className={`flex-1 px-4 py-2 text-xs font-medium uppercase rounded transition-colors ${
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
                                    description: `Found ${result.candidateCount} candidate${result.candidateCount !== 1 ? 's' : ''} in "${sheetName}".`
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
                            row.status === 'valid' ? 'ring-2 ring-green-500' :
                            row.status === 'error' ? 'ring-2 ring-red-500' : ''
                          }`}
                          style={{
                            boxShadow: 'var(--shadow-clay)'
                          }}
                        />
                        {/* Status indicator */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {row.status === 'validating' && (
                            <CircleNotch className="w-4 h-4 animate-spin text-[hsl(var(--ink))]" />
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
                  className="text-[hsl(var(--ink))] hover:text-[hsl(var(--ink-soft))] uppercase text-xs mt-2"
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
                      const showNameError = !hasName && hasEmail;
                      const showEmailError = hasEmail && !emailValid;

                      return (
                        <div key={candidate.id} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-5">
                            <Input
                              placeholder="Arjun Mehta"
                              value={candidate.name}
                              onChange={(e) => {
                                setManualCandidates(prev => prev.map(c =>
                                  c.id === candidate.id ? { ...c, name: e.target.value } : c
                                ));
                              }}
                              className={`rounded-sm border-none transition-all duration-300 bg-paper text-sm ${showNameError ? 'ring-1 ring-red-500' : ''}`}
                              style={{
                                boxShadow: 'var(--shadow-clay)'
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
                              className={`rounded-sm border-none transition-all duration-300 bg-paper text-sm ${showEmailError ? 'ring-1 ring-red-500' : ''}`}
                              style={{
                                boxShadow: 'var(--shadow-clay)'
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
                    className="text-[hsl(var(--ink))] hover:text-[hsl(var(--ink-soft))] uppercase text-xs mt-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Another Candidate
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-rule-strong rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={!formData.name.trim()}
                className="bg-ink hover:bg-ink text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
              >
                Save Candidate Pool
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">
              {overallProgress === 100 ? 'CANDIDATE POOL READY!' : 'CREATING CANDIDATE POOL'}
            </DialogTitle>
            <DialogDescription className="uppercase tracking-wider text-xs">
              {overallProgress === 100
                ? (formData.name ? `${formData.name.toUpperCase()} IS READY TO USE` : 'CANDIDATE POOL IS READY TO USE')
                : (formData.name ? `SETTING UP ${formData.name.toUpperCase()}` : 'SETTING UP CANDIDATE POOL')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Overall Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground uppercase tracking-wider">OVERALL PROGRESS</span>
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
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-paper" />
                      </div>
                    ) : step.status === 'active' ? (
                      <div className="w-5 h-5 bg-[hsl(var(--ink-soft))] rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-paper rounded-full animate-pulse"></div>
                      </div>
                    ) : step.status === 'error' ? (
                      <div className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-paper rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-paper-3 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-muted rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium uppercase tracking-wider ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'active' ? 'text-[hsl(var(--ink-soft))]' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-muted-2'
                    }`}>
                      {step.title}
                    </p>
                    {step.message && (
                      <p className="text-xs text-muted mt-1">{step.message}</p>
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
                className="uppercase rounded-sm text-paper font-medium tracking-wider transition-all duration-200"
                style={{
                  backgroundColor: 'hsl(var(--ink))',
                  boxShadow: 'var(--shadow-clay)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
              >
                DONE
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
