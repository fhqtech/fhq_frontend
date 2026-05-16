import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface StartInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStartingInterview: boolean;
  startingProgress: string;
  interviewTitle?: string;
  onClose: () => void;
  onRetry: () => void;
}

export function StartInterviewModal({
  open,
  onOpenChange,
  isStartingInterview,
  startingProgress,
  interviewTitle,
  onClose,
  onRetry,
}: StartInterviewModalProps) {
  const isError = startingProgress?.startsWith('Error:');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isStartingInterview) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ink">
            {isStartingInterview ? (
              <>
                <Spinner size="sm" variant="brand" />
                Starting interview
              </>
            ) : isError ? (
              <>
                <div className="rounded-sm h-4 w-4 bg-danger flex items-center justify-center">
                  <span className="text-paper text-xs">!</span>
                </div>
                Interview start failed
              </>
            ) : (
              <>
                <div className="rounded-sm h-4 w-4 bg-success flex items-center justify-center">
                  <span className="text-paper text-xs">✓</span>
                </div>
                Interview started
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs tracking-wider">
            {isStartingInterview
              ? `Setting up "${interviewTitle}" for applicant interviews`
              : isError
              ? `There was an issue starting "${interviewTitle}"`
              : `"${interviewTitle}" is now ready for applicants`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="space-y-4">
            <div className={`text-sm ${isError ? 'text-danger' : 'text-muted'}`}>
              {startingProgress || "Preparing interview..."}
            </div>
            {isStartingInterview && (
              <div className="w-full bg-muted rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-paper-2 from-ink to-gold h-full transition-all duration-500 ease-out"
                  style={{
                    width: '100%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            )}
            {isError && (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button size="sm" onClick={onRetry}>
                  Retry start
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
