import React from "react";
import { CheckCircle, Warning, X } from "phosphor-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface Step {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  isValid?: boolean;
  hasError?: boolean;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  showStepNumbers?: boolean;
  allowClickNavigation?: boolean;
}

export function Stepper({ 
  steps, 
  currentStep, 
  onStepClick,
  orientation = "horizontal", 
  className,
  showStepNumbers = true,
  allowClickNavigation = true
}: StepperProps) {
  const handleStepClick = (index: number) => {
    if (allowClickNavigation && onStepClick && index <= currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className={cn("w-full", className)}>

      {/* Stepper Navigation */}
      <nav 
        className={cn(
          "flex justify-between gap-8",
          orientation === "vertical" && "flex-col space-y-4",
          orientation === "horizontal" && "flex-row"
        )}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isClickable = allowClickNavigation && index <= currentStep;
          const hasError = step.hasError && !isCompleted;

          return (
            <div key={step.id} className="flex-1 relative">
              <Button
                variant="ghost"
                className={cn(
                  "w-full p-0 h-auto flex flex-col items-center text-center space-y-2",
                  isClickable && "cursor-pointer hover:bg-muted/50",
                  !isClickable && "cursor-default"
                )}
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
              >
                {/* Step Circle */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 relative",
                  isCompleted && "bg-success border-success text-white shadow-md",
                  isActive && !isCompleted && !hasError && "border-ink bg-ink text-white shadow-lg ring-2 ring-ink/20",
                  hasError && "border-danger bg-danger text-white",
                  !isActive && !isCompleted && !hasError && "border-border bg-surface text-muted hover:border-ink/50"
                )}>
                  {hasError ? (
                    <X className="w-5 h-5" weight="bold" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-6 h-6" weight="fill" />
                  ) : showStepNumbers ? (
                    <span className="text-base font-semibold">{index + 1}</span>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-current" />
                  )}
                </div>

                {/* Step Content */}
                <div className="space-y-0.5">
                  <div className={cn(
                    "text-xs font-bold uppercase tracking-wider transition-colors",
                    isActive && "text-ink",
                    isCompleted && "text-success",
                    hasError && "text-danger",
                    !isActive && !isCompleted && !hasError && "text-muted"
                  )}>
                    {step.title}
                    {step.isOptional && (
                      <span className="ml-1 text-[9px] font-normal opacity-70">
                        (Optional)
                      </span>
                    )}
                  </div>

                  {step.description && (
                    <div className={cn(
                      "text-[9px] transition-colors max-w-[120px]",
                      isActive && "text-foreground",
                      !isActive && "text-muted"
                    )}>
                      {step.description}
                    </div>
                  )}
                </div>
              </Button>

              {/* Connector Dots */}
              {index < steps.length - 1 && orientation === "horizontal" && (
                <div className="absolute top-5 -right-8 flex items-center gap-0">
                  {Array.from({ length: 15 }, (_, dotIndex) => (
                    <div
                      key={dotIndex}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-200",
                        isCompleted ? "bg-success" : "bg-border"
                      )}
                      style={{
                        animation: `pulse 1.5s ease-in-out infinite`,
                        animationDelay: `${dotIndex * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

// Navigation Buttons Component
interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  className?: string;
}

export function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSubmit,
  isNextDisabled = false,
  isLoading = false,
  nextLabel = "Next",
  previousLabel = "Previous",
  submitLabel = "Create Interview",
  className
}: StepperNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className={cn("flex items-center justify-between pt-6", className)}>
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className={cn(isFirstStep && "invisible")}
      >
        {previousLabel}
      </Button>

      <div className="flex items-center space-x-2 text-sm text-muted">
        <span>{currentStep + 1}</span>
        <span>of</span>
        <span>{totalSteps}</span>
      </div>

      <Button
        onClick={isLastStep ? onSubmit : onNext}
        disabled={isNextDisabled || isLoading}
        className="bg-ink border-0 shadow-2"
      >
        {isLoading ? "Processing..." : isLastStep ? submitLabel : nextLabel}
      </Button>
    </div>
  );
}