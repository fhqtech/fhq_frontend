import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Info, ArrowsClockwise, Users, Warning } from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DuplicateAnalysis } from '@/services/duplicateDetectionApi';

interface DuplicateAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onCancel: () => void;
  selectedListIds: string[];
  availableLists: Array<{ id: string; name: string; totalCandidates: number }>;
  analyzeDuplicates: (listIds: string[]) => Promise<DuplicateAnalysis>;
}

interface AnalysisStage {
  id: string;
  title: string;
  description: string;
  duration: number; // in milliseconds
}

const analysisStages: AnalysisStage[] = [
  {
    id: 'initializing',
    title: 'Initializing analysis',
    description: 'Preparing to scan candidate lists…',
    duration: 500
  },
  {
    id: 'scanning',
    title: 'Scanning email addresses',
    description: 'Reading candidate data from selected lists…',
    duration: 1500
  },
  {
    id: 'detecting',
    title: 'Detecting duplicates',
    description: 'Analyzing email addresses for duplicates…',
    duration: 1200
  },
  {
    id: 'generating',
    title: 'Generating report',
    description: 'Compiling analysis results…',
    duration: 300
  }
];

export const DuplicateAnalysisModal: React.FC<DuplicateAnalysisModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onCancel,
  selectedListIds,
  availableLists,
  analyzeDuplicates
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<DuplicateAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'analyzing' | 'results'>('analyzing');
  const [showDetails, setShowDetails] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && !hasStarted) {
      setCurrentStage(0);
      setProgress(0);
      setAnalysisResult(null);
      setError(null);
      setStep('analyzing');
      setShowDetails(false);
      setHasStarted(true);
      startAnalysis();
    }

    // Reset hasStarted when modal closes
    if (!isOpen) {
      setHasStarted(false);
    }
  }, [isOpen, hasStarted]);

  const startAnalysis = async () => {
    try {
      // Start actual API call immediately in parallel
      const analysisPromise = analyzeDuplicates(selectedListIds);

      // Run through analysis stages with animations (in parallel with API call)
      for (let i = 0; i < analysisStages.length; i++) {
        setCurrentStage(i);

        // Animate progress for this stage
        const startProgress = (i / analysisStages.length) * 100;
        const endProgress = ((i + 1) / analysisStages.length) * 100;

        await animateProgress(startProgress, endProgress, analysisStages[i].duration);
      }

      // Wait for the API call to complete (if not already done)
      const result = await analysisPromise;
      setAnalysisResult(result);
      setStep('results');

      // No auto-close — users get an explicit Continue button on both the
      // zero-duplicate and duplicates-found paths. The auto-close was
      // confusing recruiters: if they did anything else for 2s the modal
      // closed without persisting the result, leaving the wizard CTA
      // stuck on "Check for Duplicates".

    } catch (err) {
      setError('Failed to analyze duplicates. Please try again.');
      console.error('Duplicate analysis error:', err);
    }
  };

  const animateProgress = (start: number, end: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentProgress = start + (end - start) * progress;
        setProgress(currentProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  const getTotalCandidates = () => {
    return selectedListIds.reduce((total, listId) => {
      const list = availableLists.find(l => l.id === listId);
      return total + (list?.totalCandidates || 0);
    }, 0);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const progressVariants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1 }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-ink/50 backdrop-blur-xs"
          onClick={step === 'results' ? onCancel : undefined}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-paper rounded-xl shadow-3 max-w-lg w-full mx-4 overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-rule">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                {step === 'analyzing' ? 'Analyzing candidate lists' : 'Duplicate analysis results'}
              </h2>
              {step === 'results' && (
                <button
                  onClick={onCancel}
                  aria-label="Close dialog"
                  className="text-muted-2 hover:text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {step === 'analyzing' ? (
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Step {currentStage + 1} of {analysisStages.length}
                    </span>
                    <span className="text-muted font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-paper-3 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-paper-2"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Current Stage */}
                <div className="text-center space-y-4">
                  <motion.div
                    key={currentStage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <ArrowsClockwise className="w-8 h-8 text-info" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-ink">
                      {analysisStages[currentStage]?.title}
                    </h3>
                    <p className="text-sm text-muted">
                      {analysisStages[currentStage]?.description}
                    </p>
                  </motion.div>

                  {/* Lists being analyzed */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted">Analyzing {selectedListIds.length} lists:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {selectedListIds.map((listId) => {
                        const list = availableLists.find(l => l.id === listId);
                        return (
                          <motion.div
                            key={listId}
                            className="px-3 py-1 bg-info-soft text-info rounded-full text-xs"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                          >
                            {list?.name || 'Unknown List'}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-danger-soft border border-danger/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Warning className="w-5 h-5 text-danger" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              // Results Step
              <div className="space-y-6">
                {analysisResult && analysisResult.totalDuplicates === 0 ? (
                  // No Duplicates Found
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                      className="flex justify-center"
                    >
                      <div className="w-16 h-16 bg-success-soft rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-success" />
                      </div>
                    </motion.div>

                    <div>
                      <h3 className="text-base font-semibold text-ink mb-2">
                        Great! No Duplicates Detected
                      </h3>
                      <p className="text-sm text-muted">
                        All {analysisResult.uniqueCandidates} candidates have unique email addresses.
                      </p>
                    </div>

                    <div className="p-4 bg-success-soft border border-success/30 rounded-lg">
                      <p className="text-sm text-ink-soft">
                        Ready to continue.
                      </p>
                    </div>
                    <Button
                      onClick={onContinue}
                      variant="gold"
                      className="w-full mt-4"
                    >
                      Continue
                    </Button>
                  </motion.div>
                ) : (
                  // Duplicates Found
                  analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-warning-soft rounded-full flex items-center justify-center">
                            <Info className="w-10 h-10 text-warning" />
                          </div>
                        </div>

                        <h3 className="text-base font-semibold text-ink mb-2">
                          Duplicate Email Addresses Detected
                        </h3>

                        <div className="grid grid-cols-3 gap-4 p-4 bg-paper-2 rounded-lg">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-ink">{analysisResult.totalCandidates}</div>
                            <div className="text-[10px] text-muted">Total Candidates</div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-warning">{analysisResult.totalDuplicates}</div>
                            <div className="text-[10px] text-muted">Duplicates</div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-success">{analysisResult.uniqueCandidates}</div>
                            <div className="text-[10px] text-muted">Unique Candidates</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-warning-soft border border-warning/30 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>{analysisResult.duplicateRate}%</strong> of candidates have duplicate email addresses.
                          You'll be sending invitations to <strong>{analysisResult.uniqueCandidates} unique candidates</strong>.
                        </p>
                      </div>

                      {analysisResult.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-ink">Recommendations:</h4>
                          <ul className="space-y-1">
                            {analysisResult.recommendations.slice(0, 3).map((recommendation, index) => (
                              <li key={index} className="text-xs text-muted flex items-start gap-2">
                                <span className="text-warning mt-0.5">•</span>
                                {recommendation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.duplicateGroups && analysisResult.duplicateGroups.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-sm text-info hover:text-info underline"
                          >
                            {showDetails ? 'Hide' : 'Show'} duplicate details
                          </button>

                          <AnimatePresence>
                            {showDetails && (
                              // R11.2d: was animating height: 0 → 'auto'.
                              // CLAUDE.md bans width/height/top/left animation.
                              // Now: fade + scaleY transform (GPU-friendly).
                              // overflow-hidden on the container keeps the
                              // pre-animation height contained.
                              <motion.div
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: 1, scaleY: 1 }}
                                exit={{ opacity: 0, scaleY: 0 }}
                                style={{ transformOrigin: "top" }}
                                className="mt-2 p-3 bg-paper-2 rounded-lg text-xs space-y-2 max-h-32 overflow-y-auto"
                              >
                                {analysisResult.duplicateGroups.slice(0, 5).map((group, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span className="text-muted">{group.duplicateKey}</span>
                                    <span className="text-warning">{group.count} times</span>
                                  </div>
                                ))}
                                {analysisResult.duplicateGroups.length > 5 && (
                                  <p className="text-muted text-center">
                                    ... and {analysisResult.duplicateGroups.length - 5} more
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'results' && analysisResult && analysisResult.totalDuplicates > 0 && (
            <div className="px-6 py-4 border-t border-rule bg-paper-2">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="uppercase rounded-sm text-danger hover:text-danger hover:bg-danger-soft"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onContinue}
                  className="uppercase rounded-sm text-paper font-medium transition-all duration-200"
                  style={{
                    backgroundColor: 'hsl(var(--ink))',
                    boxShadow: 'var(--shadow-clay)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
                >
                  Continue Anyway
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};