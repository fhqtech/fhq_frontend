import { useState, useCallback } from "react";

export interface StepValidation {
  isValid: boolean;
  errors: string[];
}

interface UseStepperProps {
  totalSteps: number;
  initialStep?: number;
  validateStep?: (stepIndex: number, formData: any) => StepValidation;
}

export function useStepper({ 
  totalSteps, 
  initialStep = 0,
  validateStep 
}: UseStepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepValidations, setStepValidations] = useState<Record<number, StepValidation>>({});

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps && stepIndex <= currentStep + 1) {
      setCurrentStep(stepIndex);
    }
  }, [totalSteps, currentStep]);

  const goToNextStep = useCallback((formData?: any) => {
    if (currentStep < totalSteps - 1) {
      let canProceed = true;
      
      // Validate current step if validator is provided
      if (validateStep && formData) {
        const validation = validateStep(currentStep, formData);
        setStepValidations(prev => ({
          ...prev,
          [currentStep]: validation
        }));
        canProceed = validation.isValid;
      }
      
      if (canProceed) {
        // Mark current step as completed
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(currentStep + 1);
        return true;
      }
    }
    return false;
  }, [currentStep, totalSteps, validateStep]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return true;
    }
    return false;
  }, [currentStep]);

  const markStepAsCompleted = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  }, []);

  const isStepCompleted = useCallback((stepIndex: number) => {
    return completedSteps.has(stepIndex);
  }, [completedSteps]);

  const canGoToStep = useCallback((stepIndex: number) => {
    // Can go to current step, previous steps, or next step if current is completed
    return stepIndex <= currentStep || (stepIndex === currentStep + 1 && isStepCompleted(currentStep));
  }, [currentStep, isStepCompleted]);

  const getProgress = useCallback(() => {
    return ((completedSteps.size) / totalSteps) * 100;
  }, [completedSteps.size, totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps(new Set());
    setStepValidations({});
  }, [initialStep]);

  return {
    currentStep,
    completedSteps: Array.from(completedSteps),
    stepValidations,
    goToStep,
    goToNextStep,
    goToPrevStep,
    markStepAsCompleted,
    isStepCompleted,
    canGoToStep,
    getProgress,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
  };
}