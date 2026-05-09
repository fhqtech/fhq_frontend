import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle,
  User,
  Briefcase,
  MapPin,
  Upload,
  Linkedin,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Professional Info", description: "Your career details" },
  { id: 2, title: "Personality", description: "Tell us about yourself" },
  { id: 3, title: "Review", description: "Confirm & submit" }
];

const PSYCH_QUESTIONS = {
  animal: {
    question: "Which animal represents you best?",
    options: [
      { value: "lion", emoji: "🦁", label: "Lion" },
      { value: "eagle", emoji: "🦅", label: "Eagle" },
      { value: "dolphin", emoji: "🐬", label: "Dolphin" },
      { value: "owl", emoji: "🦉", label: "Owl" }
    ]
  },
  color: {
    question: "Which color resonates with you?",
    options: [
      { value: "red", emoji: "🔴", label: "Red" },
      { value: "blue", emoji: "🔵", label: "Blue" },
      { value: "green", emoji: "🟢", label: "Green" },
      { value: "yellow", emoji: "🟡", label: "Yellow" }
    ]
  },
  environment: {
    question: "Which environment energizes you?",
    options: [
      { value: "mountains", emoji: "⛰️", label: "Mountains" },
      { value: "ocean", emoji: "🌊", label: "Ocean" },
      { value: "forest", emoji: "🌲", label: "Forest" },
      { value: "desert", emoji: "🏜️", label: "Desert" }
    ]
  },
  symbol: {
    question: "Which symbol speaks to you?",
    options: [
      { value: "star", emoji: "⭐", label: "Star" },
      { value: "circle", emoji: "⭕", label: "Circle" },
      { value: "triangle", emoji: "🔺", label: "Triangle" },
      { value: "infinity", emoji: "♾️", label: "Infinity" }
    ]
  }
};

export default function CandidateProfileRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  // States
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: emailFromUrl || "",
    linkedInUrl: "",
    jobTitle: "",
    experience: "",
    experienceYears: "",
    experienceMonths: "",
    location: "",
    availableIn: "",
    portfolioUrl: "",
    psychAssessment: {
      animal: "",
      color: "",
      environment: "",
      symbol: ""
    }
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handlePsychChange = (question: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      psychAssessment: {
        ...prev.psychAssessment,
        [question]: value
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be under 5MB",
          variant: "destructive"
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.linkedInUrl.trim()) errors.linkedInUrl = "LinkedIn URL is required";
    if (!formData.linkedInUrl.includes("linkedin.com")) errors.linkedInUrl = "Invalid LinkedIn URL";
    if (!formData.jobTitle.trim()) errors.jobTitle = "Job title is required";
    if (!formData.experienceYears) errors.experienceYears = "Years of experience is required";
    if (!formData.experienceMonths) errors.experienceMonths = "Months of experience is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.availableIn) errors.availableIn = "Availability is required";
    if (!resumeFile) errors.resume = "Resume is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    if (!formData.psychAssessment.animal) {
      toast({
        title: "Animal question required",
        description: "Please answer at least the first question",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const calculateCompletion = () => {
    let completed = 8; // All professional fields + resume (mandatory)
    if (formData.psychAssessment.animal) completed++;
    if (formData.psychAssessment.color) completed++;
    if (formData.psychAssessment.environment) completed++;
    if (formData.psychAssessment.symbol) completed++;
    return Math.round((completed / 11) * 100);
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Upload resume first
      const formDataPayload = new FormData();
      if (resumeFile) {
        formDataPayload.append("resume", resumeFile);
      }
      // Combine years and months into experience string
      const experienceString = `${formData.experienceYears} years ${formData.experienceMonths} months`;

      formDataPayload.append("data", JSON.stringify({
        personalInfo: {
          name: formData.name,
          email: formData.email,
          linkedInUrl: formData.linkedInUrl,
          jobTitle: formData.jobTitle,
          experience: experienceString,
          location: formData.location
        },
        availability: {
          availableIn: formData.availableIn
        },
        portfolioUrls: {
          portfolio: formData.portfolioUrl || undefined
        },
        psychAssessment: formData.psychAssessment,
        profileCompletion: calculateCompletion(),
        status: "registered",
        token: tokenFromUrl
      }));

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidate/register`,
        {
          method: 'POST',
          body: formDataPayload
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast({
          title: "🎉 Registration Complete!",
          description: `Profile ${calculateCompletion()}% complete`
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.error || "Please try again",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error submitting registration:', err);
      toast({
        title: "Error",
        description: "Failed to submit registration",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressValue = () => {
    return (currentStep / 3) * 100;
  };

  // Success state
  if (success) {
    const completion = calculateCompletion();
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="relative mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <Sparkles className="w-6 h-6 text-yellow-500 absolute top-0 right-1/3 animate-pulse" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              🎉 Registration Complete!
            </h2>
            <p className="text-foreground-muted mb-4">
              Welcome, {formData.name}! Your profile is {completion}% complete.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Professional Info</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex justify-between">
                  <span>Resume Uploaded</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex justify-between">
                  <span>Psych Assessment</span>
                  <span className="text-xs">
                    {Object.values(formData.psychAssessment).filter(Boolean).length}/4 answered
                  </span>
                </div>
              </div>
            </div>
            <Progress value={completion} className="mb-4" />
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Complete Your Profile ✨
          </h1>
          <p className="text-foreground-muted">
            Help us get to know you better in just 3 simple steps
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4 gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                  ${currentStep >= step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`
                    h-1 w-20 mx-2
                    ${currentStep > step.id ? 'bg-primary' : 'bg-muted'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <Progress value={getProgressValue()} className="mb-2" />
          <p className="text-center text-sm text-foreground-muted">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                {currentStep === 1 && <Briefcase className="w-5 h-5 text-primary" />}
                {currentStep === 2 && <User className="w-5 h-5 text-primary" />}
                {currentStep === 3 && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Professional Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={formErrors.name ? "border-destructive" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={formErrors.email ? "border-destructive" : ""}
                    />
                    {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="linkedInUrl" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn URL *
                  </Label>
                  <Input
                    id="linkedInUrl"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedInUrl}
                    onChange={(e) => handleInputChange("linkedInUrl", e.target.value)}
                    className={formErrors.linkedInUrl ? "border-destructive" : ""}
                  />
                  {formErrors.linkedInUrl && <p className="text-sm text-destructive">{formErrors.linkedInUrl}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g., Senior Accountant"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                      className={formErrors.jobTitle ? "border-destructive" : ""}
                    />
                    {formErrors.jobTitle && <p className="text-sm text-destructive">{formErrors.jobTitle}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Experience *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Select value={formData.experienceYears} onValueChange={(v) => handleInputChange("experienceYears", v)}>
                          <SelectTrigger className={formErrors.experienceYears ? "border-destructive" : ""}>
                            <SelectValue placeholder="Years" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 51 }, (_, i) => i).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year} {year === 1 ? 'year' : 'years'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.experienceYears && <p className="text-xs text-destructive">{formErrors.experienceYears}</p>}
                      </div>
                      <div>
                        <Select value={formData.experienceMonths} onValueChange={(v) => handleInputChange("experienceMonths", v)}>
                          <SelectTrigger className={formErrors.experienceMonths ? "border-destructive" : ""}>
                            <SelectValue placeholder="Months" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                              <SelectItem key={month} value={month.toString()}>
                                {month} {month === 1 ? 'month' : 'months'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.experienceMonths && <p className="text-xs text-destructive">{formErrors.experienceMonths}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="City, Country"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className={formErrors.location ? "border-destructive" : ""}
                    />
                    {formErrors.location && <p className="text-sm text-destructive">{formErrors.location}</p>}
                  </div>

                  <div>
                    <Label htmlFor="availableIn">Available In *</Label>
                    <Select value={formData.availableIn} onValueChange={(v) => handleInputChange("availableIn", v)}>
                      <SelectTrigger className={formErrors.availableIn ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="15days">15 days</SelectItem>
                        <SelectItem value="30days">30 days</SelectItem>
                        <SelectItem value="60days">60 days</SelectItem>
                        <SelectItem value="90days">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.availableIn && <p className="text-sm text-destructive">{formErrors.availableIn}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Resume *
                  </Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className={formErrors.resume ? "border-destructive" : ""}
                  />
                  {resumeFile && (
                    <p className="text-sm text-green-600 mt-1">✓ {resumeFile.name}</p>
                  )}
                  {formErrors.resume && <p className="text-sm text-destructive">{formErrors.resume}</p>}
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or DOCX (max 5MB)</p>
                </div>

                <div>
                  <Label htmlFor="portfolioUrl">Portfolio/Website URL (Optional)</Label>
                  <Input
                    id="portfolioUrl"
                    placeholder="https://yourwebsite.com"
                    value={formData.portfolioUrl}
                    onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Psych Assessment */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p>💡 Answer at least the first question. The rest are optional but help us understand you better!</p>
                </div>

                {/* Animal Question (Mandatory) */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {PSYCH_QUESTIONS.animal.question} *
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PSYCH_QUESTIONS.animal.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePsychChange("animal", option.value)}
                        className={`
                          p-4 border-2 rounded-lg text-center transition-all
                          ${formData.psychAssessment.animal === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                          }
                        `}
                      >
                        <div className="text-4xl mb-2">{option.emoji}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Question (Optional) */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {PSYCH_QUESTIONS.color.question} <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PSYCH_QUESTIONS.color.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePsychChange("color", option.value)}
                        className={`
                          p-4 border-2 rounded-lg text-center transition-all
                          ${formData.psychAssessment.color === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                          }
                        `}
                      >
                        <div className="text-4xl mb-2">{option.emoji}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment Question (Optional) */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {PSYCH_QUESTIONS.environment.question} <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PSYCH_QUESTIONS.environment.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePsychChange("environment", option.value)}
                        className={`
                          p-4 border-2 rounded-lg text-center transition-all
                          ${formData.psychAssessment.environment === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                          }
                        `}
                      >
                        <div className="text-4xl mb-2">{option.emoji}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbol Question (Optional) */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {PSYCH_QUESTIONS.symbol.question} <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PSYCH_QUESTIONS.symbol.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePsychChange("symbol", option.value)}
                        className={`
                          p-4 border-2 rounded-lg text-center transition-all
                          ${formData.psychAssessment.symbol === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                          }
                        `}
                      >
                        <div className="text-4xl mb-2">{option.emoji}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Review Your Information</h3>

                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-3">Professional Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> <strong>{formData.name}</strong></div>
                      <div><span className="text-muted-foreground">Email:</span> <strong>{formData.email}</strong></div>
                      <div><span className="text-muted-foreground">Job Title:</span> <strong>{formData.jobTitle}</strong></div>
                      <div><span className="text-muted-foreground">Experience:</span> <strong>{formData.experience}</strong></div>
                      <div><span className="text-muted-foreground">Location:</span> <strong>{formData.location}</strong></div>
                      <div><span className="text-muted-foreground">Available:</span> <strong>{formData.availableIn}</strong></div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-3">Documents & Links</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Resume:</span> <strong>{resumeFile?.name}</strong></div>
                      <div><span className="text-muted-foreground">LinkedIn:</span> <strong className="truncate">{formData.linkedInUrl}</strong></div>
                      {formData.portfolioUrl && (
                        <div><span className="text-muted-foreground">Portfolio:</span> <strong className="truncate">{formData.portfolioUrl}</strong></div>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Personality Assessment</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {formData.psychAssessment.animal && (
                        <div className="flex items-center gap-2">
                          <span>🦁 Animal:</span> <strong className="capitalize">{formData.psychAssessment.animal}</strong>
                        </div>
                      )}
                      {formData.psychAssessment.color && (
                        <div className="flex items-center gap-2">
                          <span>🎨 Color:</span> <strong className="capitalize">{formData.psychAssessment.color}</strong>
                        </div>
                      )}
                      {formData.psychAssessment.environment && (
                        <div className="flex items-center gap-2">
                          <span>🌲 Environment:</span> <strong className="capitalize">{formData.psychAssessment.environment}</strong>
                        </div>
                      )}
                      {formData.psychAssessment.symbol && (
                        <div className="flex items-center gap-2">
                          <span>⭐ Symbol:</span> <strong className="capitalize">{formData.psychAssessment.symbol}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Profile Completion</h4>
                    <span className="text-2xl font-bold text-green-600">{calculateCompletion()}%</span>
                  </div>
                  <Progress value={calculateCompletion()} className="mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {calculateCompletion() === 100
                      ? "🎉 Perfect! Your profile is 100% complete!"
                      : `You've completed ${Object.values(formData.psychAssessment).filter(Boolean).length}/4 personality questions. ${4 - Object.values(formData.psychAssessment).filter(Boolean).length} more to reach 100%!`
                    }
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800">
                  <p>📝 By submitting, you confirm that the information provided is accurate.</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button onClick={handleNext} className="gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
