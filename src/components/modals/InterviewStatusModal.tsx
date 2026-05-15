import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pause, Square, Clock, Phone } from 'lucide-react';

interface InterviewStatusModalProps {
  status: 'paused' | 'stopped';
  isOpen: boolean;
  onClose: () => void;
  recruiterContact?: string;
  interviewTitle?: string;
}

export const InterviewStatusModal: React.FC<InterviewStatusModalProps> = ({
  status,
  isOpen,
  onClose,
  recruiterContact,
  interviewTitle
}) => {
  const getModalContent = () => {
    if (status === 'paused') {
      return {
        icon: <Pause className="w-12 h-12 text-yellow-500" />,
        title: "Interview Temporarily Paused",
        message: "The interview has been temporarily halted by the recruiter. Please wait for further instructions.",
        description: "This interview is currently on hold. You will be notified when it becomes available again.",
        actions: [
          {
            icon: <Phone className="w-4 h-4" />,
            text: "Contact the recruiter for more details"
          },
          {
            icon: <Clock className="w-4 h-4" />,
            text: "Wait for notification when interview resumes"
          },
          {
            icon: <Clock className="w-4 h-4" />,
            text: "Check back later for updates"
          }
        ],
        buttonText: "Got it",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        textColor: "text-yellow-800"
      };
    } else {
      return {
        icon: <Square className="w-12 h-12 text-red-500" />,
        title: "Interview Deadline Over",
        message: "This interview has been closed as the deadline has passed.",
        description: "The interview period has ended and submissions are no longer being accepted.",
        actions: [
          {
            icon: <Phone className="w-4 h-4" />,
            text: "Contact the recruiter about future opportunities"
          },
          {
            icon: <Clock className="w-4 h-4" />,
            text: "Look out for new interview invitations"
          },
          {
            icon: <Clock className="w-4 h-4" />,
            text: "Thank you for your interest"
          }
        ],
        buttonText: "Understood",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800"
      };
    }
  };

  const content = getModalContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${content.bgColor} ${content.borderColor} border-2`}>
        <div className="text-center space-y-4">
          <div className="flex justify-center">{content.icon}</div>

          <div className="space-y-2">
            <DialogTitle className="text-lg font-semibold text-ink">
              {content.title}
            </DialogTitle>
            {interviewTitle && (
              <p className="text-sm font-medium text-ink-soft">
                "{interviewTitle}"
              </p>
            )}
          </div>

          <DialogDescription className="text-sm text-muted">
            {content.message}
          </DialogDescription>

          <div className={`p-3 rounded-lg ${content.bgColor} border ${content.borderColor}`}>
            <p className="text-sm text-ink-soft mb-2">
              <strong>What you can do:</strong>
            </p>
            <ul className="text-sm text-muted space-y-2">
              {content.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">{action.icon}</span>
                  <span>{action.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {recruiterContact && (
            <div className="bg-paper p-3 rounded-lg border border-rule">
              <p className="text-sm">
                <strong>Recruiter Contact:</strong>
              </p>
              <p className="text-sm text-muted mt-1">{recruiterContact}</p>
            </div>
          )}

          <Button
            onClick={onClose}
            className="w-full"
            variant="default"
          >
            {content.buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewStatusModal;