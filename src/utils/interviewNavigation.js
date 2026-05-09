// Interview Navigation Utilities
// Example usage for interview management interfaces

import { generateStepURL, generateAddCandidatesURL } from '../pages/CreateInterview';

/**
 * Generate URLs for different interview actions
 * These can be used in interview management components
 */

// Example: Quick action buttons for interview cards
export const getInterviewQuickActions = (interviewId) => {
  return [
    {
      label: "Add Candidates",
      icon: "👥",
      url: generateAddCandidatesURL(interviewId),
      description: "Add candidates to this interview"
    },
    {
      label: "Google Sheets",
      icon: "📊",
      url: generateAddCandidatesURL(interviewId, 'google_sheet'),
      description: "Import from Google Sheets"
    },
    {
      label: "Upload Excel/CSV",
      icon: "📄", 
      url: generateAddCandidatesURL(interviewId, 'excel_file'),
      description: "Upload Excel or CSV file"
    },
    {
      label: "Manual Entry",
      icon: "✏️",
      url: generateAddCandidatesURL(interviewId, 'manual_entry'),
      description: "Add candidates manually"
    },
    {
      label: "Edit Interview",
      icon: "⚙️",
      url: null, // Disabled - Interview editing is currently disabled
      description: "Edit interview details (Disabled)",
      disabled: true
    },
    {
      label: "Voice Settings",
      icon: "🎤",
      url: generateStepURL(interviewId, 2),
      description: "Modify voice settings"
    },
    {
      label: "Communication Settings",
      icon: "📧",
      url: generateStepURL(interviewId, 3),
      description: "Update notification preferences"
    }
  ];
};

// Example: Breadcrumb navigation for multi-step flows
export const getStepBreadcrumbs = (currentStep) => {
  const steps = [
    { step: 0, label: "Basic Details", path: "basic" },
    { step: 1, label: "Candidates", path: "candidates" },
    { step: 2, label: "Voice & AI", path: "voice" },
    { step: 3, label: "Communications", path: "communications" }
  ];
  
  return steps.map(({ step, label, path }) => ({
    label,
    path,
    active: step === currentStep,
    completed: step < currentStep,
    url: generateStepURL(null, step) // For create mode
  }));
};

// Example usage in components:
/*
// In InterviewCard component:
const quickActions = getInterviewQuickActions(interview.id);

// In InterviewHeader component: 
const breadcrumbs = getStepBreadcrumbs(currentStep);

// Direct navigation examples:
<Link to={generateAddCandidatesURL(interviewId)}>Add Candidates</Link>
<Link to={generateAddCandidatesURL(interviewId, 'google_sheet')}>Import from Google Sheets</Link>
<Link to={generateStepURL(interviewId, 2)}>Edit Voice Settings</Link>
*/