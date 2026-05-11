import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import RippleLoader from "@/components/RippleLoader";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  Phone,
  MapPin,
  FileText,
  Linkedin,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronRight,
  Upload,
  Globe,
  Calendar,
  Brain,
  Zap,
  Star,
  Target,
  Heart,
  X
} from "lucide-react";
import { extractFromResume } from "@/services/resumeExtractApi";

interface InvitationDetails {
  invitation: {
    id: string;
    name: string;
    email: string;
    interviewId: string;
    token: string;
  };
  interview: {
    id: string;
    title: string;
    description: string;
    duration: number;
  };
  existing_profile?: boolean;
  redirect_to_portal?: boolean;
}

const PSYCH_QUESTIONS = {
  animal: {
    question: "Which animal represents you best?",
    subtitle: "Choose the one that resonates with your work style",
    options: [
      { value: "lion", emoji: "🦁", label: "Lion", trait: "Leader" },
      { value: "eagle", emoji: "🦅", label: "Eagle", trait: "Visionary" },
      { value: "dolphin", emoji: "🐬", label: "Dolphin", trait: "Team Player" },
      { value: "owl", emoji: "🦉", label: "Owl", trait: "Analytical" }
    ]
  },
  color: {
    question: "Which color resonates with you?",
    subtitle: "Pick the color that reflects your energy",
    options: [
      { value: "red", emoji: "🔴", label: "Red", trait: "Passionate" },
      { value: "blue", emoji: "🔵", label: "Blue", trait: "Calm" },
      { value: "green", emoji: "🟢", label: "Green", trait: "Balanced" },
      { value: "yellow", emoji: "🟡", label: "Yellow", trait: "Optimistic" }
    ]
  },
  environment: {
    question: "Where do you thrive best?",
    subtitle: "Your ideal working environment",
    options: [
      { value: "mountain", emoji: "🏔️", label: "Mountain", trait: "Challenge-seeker" },
      { value: "ocean", emoji: "🌊", label: "Ocean", trait: "Go with flow" },
      { value: "forest", emoji: "🌲", label: "Forest", trait: "Grounded" },
      { value: "city", emoji: "🏙️", label: "City", trait: "Fast-paced" }
    ]
  },
  symbol: {
    question: "Which symbol speaks to you?",
    subtitle: "Choose what drives you forward",
    options: [
      { value: "star", emoji: "⭐", label: "Star", trait: "Achiever" },
      { value: "moon", emoji: "🌙", label: "Moon", trait: "Reflective" },
      { value: "sun", emoji: "☀️", label: "Sun", trait: "Energizer" },
      { value: "lightning", emoji: "⚡", label: "Lightning", trait: "Innovator" }
    ]
  }
};

export default function CandidateRegistration() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // States
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectingToPortal, setRedirectingToPortal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome, 1 = form, 2 = psych, 3 = review
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showBonusQuestions, setShowBonusQuestions] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    countryCode: "+1",
    phone: "",
    location: "",
    jobTitle: "",
    experience: "",
    experienceYears: "",
    experienceMonths: "",
    availableIn: "",
    portfolioUrl: "",
    resume_url: "",
    resumeFile: null as File | null,
    linkedin: "",
    psychAssessment: {
      animal: "",
      color: "",
      environment: "",
      symbol: ""
    }
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [bonusQuestionIndex, setBonusQuestionIndex] = useState(0);
  const [consentChecked, setConsentChecked] = useState(false);

  // Fetch invitation details on component mount
  useEffect(() => {
    if (token) {
      fetchInvitationDetails(token);
    }
  }, [token]);

  // Confetti effect for success state
  useEffect(() => {
    if (!success) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#FCD34D', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

    const createConfetti = () => {
      const now = Date.now();
      if (now > animationEnd) return;

      const confettiCount = 5;
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = '1';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';

        document.body.appendChild(confetti);

        const animDuration = Math.random() * 2 + 2;
        const rotation = Math.random() * 360;
        const xMovement = (Math.random() - 0.5) * 200;

        confetti.animate([
          { transform: 'translateY(0) rotate(0deg) translateX(0)', opacity: 1 },
          { transform: `translateY(100vh) rotate(${rotation}deg) translateX(${xMovement}px)`, opacity: 0 }
        ], {
          duration: animDuration * 1000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => confetti.remove();
      }

      requestAnimationFrame(createConfetti);
    };

    createConfetti();
  }, [success]);

  const fetchInvitationDetails = async (invitationToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/register/${invitationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInvitationDetails(data);

        // Check if we should redirect to portal for existing candidates
        if (data.redirect_to_portal && data.existing_profile && token) {
          setRedirectingToPortal(true);
          toast({
            title: "Welcome back! 👋",
            description: `Hi ${data.invitation.name}, redirecting you to your portal...`
          });

          // Redirect to candidate portal after a brief delay
          setTimeout(() => {
            navigate(`/candidate-portal/${token}`);
          }, 2500);
        }
      } else {
        setError(data.error || "Invalid or expired invitation token");
      }
    } catch (err) {
      console.error('Error fetching invitation details:', err);
      setError("Failed to load invitation details. Please try again.");
    } finally {
      setLoading(false);
      // Trigger page load animation after data loads
      setTimeout(() => {
        setIsPageLoading(false);
      }, 100);
    }
  };

  const calculateProfileCompletion = () => {
    let completed = 0;
    const total = 9; // 6 mandatory + 3 optional psych questions

    if (formData.phone.trim()) completed++;
    if (formData.location.trim()) completed++;
    if (formData.jobTitle.trim()) completed++;
    if (formData.experienceYears.trim() || formData.experienceYears === "0") completed++;
    if (formData.availableIn.trim()) completed++;
    if (formData.psychAssessment.animal) completed++;
    if (formData.psychAssessment.color) completed++;
    if (formData.psychAssessment.environment) completed++;
    if (formData.psychAssessment.symbol) completed++;

    return Math.round((completed / total) * 100);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Contact validation
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
      console.log("❌ Validation failed: Phone number is missing");
    } else if (!/^[\+]?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
      console.log("❌ Validation failed: Phone number format invalid");
    }

    if (!formData.location.trim()) {
      errors.location = "Location is required";
      console.log("❌ Validation failed: Location is missing");
    }

    // Professional validation
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = "Job title is required";
      console.log("❌ Validation failed: Job title is missing");
    }
    if (!formData.experienceYears.trim() && formData.experienceYears !== "0") {
      errors.experience = "Years of experience is required";
      console.log("❌ Validation failed: Experience years is missing");
    }
    if (!formData.availableIn.trim()) {
      errors.availableIn = "Available in is required";
      console.log("❌ Validation failed: Available to start is missing");
    }

    // Profile validation
    // LinkedIn validation - only check format if provided
    if (formData.linkedin.trim()) {
      const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[\w\-]+\/?$/i;
      if (!linkedinPattern.test(formData.linkedin.trim())) {
        errors.linkedin = "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourprofile)";
        console.log("❌ Validation failed: LinkedIn URL format invalid:", formData.linkedin);
      }
    }

    // Log success or failure
    if (Object.keys(errors).length === 0) {
      console.log("✅ All validations passed!");
    } else {
      console.log("❌ Validation errors:", errors);
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    // Enforce months constraint (0-11)
    if (field === "experienceMonths") {
      const numValue = parseInt(value);
      if (numValue > 11) {
        value = "11";
      } else if (numValue < 0) {
        value = "0";
      }
    }

    // Enforce years constraint (0-50)
    if (field === "experienceYears") {
      const numValue = parseInt(value);
      if (numValue > 50) {
        value = "50";
      } else if (numValue < 0) {
        value = "0";
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }

    // Handle location autocomplete
    if (field === "location" && value.length > 2) {
      fetchLocationSuggestions(value);
    } else if (field === "location" && value.length <= 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  const fetchLocationSuggestions = async (query: string) => {
    try {
      // Use the backend proxy to call Google Places API
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(
        `${backendUrl}/api/places/autocomplete?input=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.predictions && data.predictions.length > 0) {
          const suggestions = data.predictions.map((item: any) => item.description);
          setLocationSuggestions(suggestions.slice(0, 8));
          setShowLocationDropdown(suggestions.length > 0);
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    }

    // Fallback to comprehensive world cities database
    const worldCities = [
      // USA
      'New York, NY, USA', 'Los Angeles, CA, USA', 'Chicago, IL, USA', 'Houston, TX, USA',
      'Phoenix, AZ, USA', 'Philadelphia, PA, USA', 'San Antonio, TX, USA', 'San Diego, CA, USA',
      'Dallas, TX, USA', 'San Jose, CA, USA', 'Austin, TX, USA', 'Jacksonville, FL, USA',
      'San Francisco, CA, USA', 'Seattle, WA, USA', 'Denver, CO, USA', 'Boston, MA, USA',
      'Miami, FL, USA', 'Atlanta, GA, USA', 'Las Vegas, NV, USA', 'Portland, OR, USA',

      // UK
      'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Leeds, UK', 'Glasgow, UK',
      'Edinburgh, UK', 'Liverpool, UK', 'Bristol, UK', 'Sheffield, UK', 'Newcastle, UK',

      // India
      'Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Hyderabad, India', 'Chennai, India',
      'Kolkata, India', 'Pune, India', 'Ahmedabad, India', 'Jaipur, India', 'Surat, India',

      // Canada
      'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
      'Ottawa, Canada', 'Edmonton, Canada', 'Winnipeg, Canada', 'Quebec City, Canada',

      // Australia
      'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
      'Adelaide, Australia', 'Gold Coast, Australia', 'Canberra, Australia',

      // Europe
      'Paris, France', 'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany',
      'Madrid, Spain', 'Barcelona, Spain', 'Rome, Italy', 'Milan, Italy',
      'Amsterdam, Netherlands', 'Brussels, Belgium', 'Vienna, Austria', 'Zurich, Switzerland',
      'Stockholm, Sweden', 'Copenhagen, Denmark', 'Oslo, Norway', 'Dublin, Ireland',

      // Asia
      'Tokyo, Japan', 'Osaka, Japan', 'Shanghai, China', 'Beijing, China', 'Shenzhen, China',
      'Singapore', 'Hong Kong', 'Seoul, South Korea', 'Bangkok, Thailand', 'Manila, Philippines',
      'Jakarta, Indonesia', 'Kuala Lumpur, Malaysia', 'Ho Chi Minh City, Vietnam',
      'Taipei, Taiwan', 'Hanoi, Vietnam',

      // Middle East
      'Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, Saudi Arabia', 'Tel Aviv, Israel',
      'Doha, Qatar', 'Kuwait City, Kuwait', 'Muscat, Oman', 'Amman, Jordan',

      // South America
      'São Paulo, Brazil', 'Rio de Janeiro, Brazil', 'Buenos Aires, Argentina',
      'Lima, Peru', 'Bogotá, Colombia', 'Santiago, Chile', 'Caracas, Venezuela',

      // Africa
      'Cairo, Egypt', 'Lagos, Nigeria', 'Johannesburg, South Africa', 'Cape Town, South Africa',
      'Nairobi, Kenya', 'Accra, Ghana', 'Casablanca, Morocco'
    ];

    const basicSuggestions = worldCities.filter(city =>
      city.toLowerCase().includes(query.toLowerCase())
    );
    setLocationSuggestions(basicSuggestions.slice(0, 8));
    setShowLocationDropdown(basicSuggestions.length > 0);
  };

  const handleLocationSelect = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  const handlePsychChange = (question: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      psychAssessment: {
        ...prev.psychAssessment,
        [question]: value
      }
    }));

    // Clear error
    if (formErrors.psychAnimal) {
      setFormErrors(prev => ({ ...prev, psychAnimal: "" }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, resume: "File size must be less than 5MB" }));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setFormErrors(prev => ({ ...prev, resume: "Only PDF and DOC files are allowed" }));
      return;
    }

    setFormData(prev => ({ ...prev, resumeFile: file, resume_url: "" }));
    setFormErrors(prev => ({ ...prev, resume: "" }));

    // Fire-and-forget auto-extract: parse the resume and prefill any fields the
    // candidate hasn't already filled. Soft-fails — never blocks the form.
    autoFillFromResume(file);
  };

  const autoFillFromResume = async (file: File) => {
    try {
      setIsExtractingResume(true);
      setExtractionFailed(false);
      const data = await extractFromResume(file);
      setFormData(prev => ({
        ...prev,
        // Only fill blank fields — never overwrite candidate input.
        phone: prev.phone?.trim() ? prev.phone : data.phone,
        jobTitle: prev.jobTitle?.trim() ? prev.jobTitle : data.jobTitle,
        experienceYears:
          prev.experienceYears?.trim?.()
            ? prev.experienceYears
            : (data.experienceYears > 0 ? String(data.experienceYears) : prev.experienceYears),
        location: prev.location?.trim() ? prev.location : data.location,
        linkedin: prev.linkedin?.trim() ? prev.linkedin : data.linkedin,
        portfolioUrl: prev.portfolioUrl?.trim() ? prev.portfolioUrl : data.portfolioUrl,
      }));
    } catch (err) {
      console.warn('[autoFillFromResume] failed:', err);
      setExtractionFailed(true);
    } finally {
      setIsExtractingResume(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate form fields before moving to psych
      const formIsValid = validateForm();
      if (!formIsValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in the missing information to continue",
          variant: "destructive"
        });
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const handlePrevious = () => {
    const newStep = Math.max(currentStep - 1, 0);
    if (newStep === 0 && currentStep === 1) {
      // Going back to step 0, trigger reverse animation
      setIsTransitioning(true);
      // Update step indicator halfway through the animation
      setTimeout(() => {
        setCurrentStep(newStep);
      }, 500);
      // Complete transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);
    } else {
      setCurrentStep(newStep);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Please complete required fields",
        description: "Go back and fill in all required information",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('phone', `${formData.countryCode} ${formData.phone.trim()}`);
      submitData.append('location', formData.location.trim());
      submitData.append('jobTitle', formData.jobTitle.trim());
      const experienceText = formData.experienceMonths ? `${formData.experienceYears} years ${formData.experienceMonths} months` : `${formData.experienceYears} years`;
      submitData.append('experience', experienceText);
      submitData.append('availableIn', formData.availableIn.trim());
      submitData.append('linkedin', formData.linkedin.trim());

      if (formData.portfolioUrl.trim()) {
        submitData.append('portfolioUrl', formData.portfolioUrl.trim());
      }

      if (formData.resumeFile) {
        submitData.append('resume', formData.resumeFile);
      } else if (formData.resume_url.trim()) {
        submitData.append('resume_url', formData.resume_url.trim());
      }

      // Add psych assessment data
      submitData.append('psychAssessment', JSON.stringify(formData.psychAssessment));

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/register/${token}`, {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast({
          title: "🎉 Registration Complete!",
          description: `Profile completion: ${calculateProfileCompletion()}%`
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.error || "Failed to complete registration. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error submitting registration:', err);
      toast({
        title: "Error",
        description: "Failed to submit registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressValue = () => {
    return ((currentStep + 1) / 4) * 100;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RippleLoader />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Oops! Invalid Invitation</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Reload page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecting to portal state
  if (redirectingToPortal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <RippleLoader />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Welcome back! 👋
          </h2>
          <p className="text-lg text-slate-700 mb-2">
            {invitationDetails?.invitation.name}
          </p>
          <p className="text-sm text-slate-600 mb-6">
            We found your existing profile. Taking you to your portal...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
            <Zap className="w-4 h-4 animate-pulse text-amber-500" />
            <span>Redirecting now...</span>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-0 shadow-2xl">
          <CardContent className="p-10 text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-8">
              YOU'RE ALL SET!
            </h2>

            <Button
              size="lg"
              className="w-full gap-2 text-lg h-14 bg-slate-800 hover:bg-slate-900 text-white"
              onClick={() => navigate(`/candidate-portal/${token}`)}
            >
              Enter Your Portal
              <ChevronRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main registration form - CLEAN DESIGN
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: `
        linear-gradient(to bottom, #f8fafc 0%, rgba(248, 250, 252, 0.8) 15%, transparent 35%, transparent 100%),
        linear-gradient(to right, rgba(203, 213, 225, 0.3) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(203, 213, 225, 0.3) 1px, transparent 1px),
        radial-gradient(ellipse 100% 50% at center 85%, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.18) 25%, rgba(248, 250, 252, 0.95) 50%, #f8fafc 70%)
      `,
      backgroundSize: '100% 100%, 80px 80px, 80px 80px, 100% 100%'
    }}>
      {/* Logo and Title - Top Left - Show only on steps 1+ */}
      {currentStep > 0 && (
        <div className="absolute top-6 left-8 z-50">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="FunnelHQ"
              className="h-20 object-contain"
            />
            <div className="-ml-2">
              <h1 className="text-lg font-bold text-slate-900">FunnelHQ</h1>
              <p className="text-xs text-slate-500">Candidate Portal</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`w-full mx-auto px-8 pt-8 pb-8 transition-all duration-1000 ${isPageLoading ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>

        {/* Animated Header - Appears on all steps but animates out on transition */}
        <div className={`px-8 transition-all duration-1000 overflow-hidden ${isTransitioning ? 'opacity-0 -translate-y-12 max-h-0 mb-0' : 'opacity-100 translate-y-0 max-h-60 mb-12'} ${currentStep > 0 ? 'hidden' : ''}`}>
          <div className="max-w-5xl space-y-1">
            <h1 className="text-2xl md:text-3xl font-light text-black uppercase tracking-wider mb-2">
              Let's Get Started, <span className="font-bold tracking-widest">{invitationDetails?.invitation.name}</span>
            </h1>
            <p className="text-base text-slate-600 max-w-2xl">
              We're excited to learn more about you. This will only take few minutes.
            </p>
          </div>
        </div>

        {/* Step Indicators - Simplified */}
        <div className={`mb-10 ${currentStep === 0 ? 'hidden' : ''}`}>
            <div className="flex flex-col gap-2 max-w-2xl ml-auto mr-8">
              {/* Step circles and lines row */}
              <div className="flex items-center justify-end gap-3">
                <div className={`flex flex-col items-center flex-1 transition-all ${
                  currentStep === 0 ? 'scale-105' : ''
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep === 0 ? 'bg-slate-800 text-amber-400 shadow-lg' :
                    currentStep > 0 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {currentStep > 0 ? <CheckCircle className="w-6 h-6" /> : '1'}
                  </div>
                </div>

                <div className={`h-1 flex-1 rounded-full ${currentStep > 0 ? 'bg-green-500' : 'bg-slate-200'}`}></div>

                <div className={`flex flex-col items-center flex-1 transition-all ${
                  currentStep === 1 ? 'scale-105' : ''
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep === 1 ? 'bg-slate-800 text-amber-400 shadow-lg' :
                    currentStep > 1 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {currentStep > 1 ? <CheckCircle className="w-6 h-6" /> : '2'}
                  </div>
                </div>
              </div>

              {/* Labels row */}
              <div className="flex items-center justify-end gap-3">
                <span className={`flex-1 text-center text-xs font-medium ${currentStep === 0 ? 'text-slate-900' : 'text-slate-500'}`}>Welcome</span>
                <div className="flex-1"></div>
                <span className={`flex-1 text-center text-xs font-medium ${currentStep === 1 ? 'text-slate-900' : 'text-slate-500'}`}>About You</span>
              </div>
            </div>
        </div>

        {/* Container for Step 0 card */}
        <div className="px-8">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <>
              {/* Registration Steps - White rectangular boxes - Above black box */}
              <div className="flex items-center gap-6 mb-8 max-w-5xl">
                <div className="rounded border bg-card text-card-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] px-8 py-3 transition-all hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] duration-200 inline-flex">
                  <div className="flex items-center gap-3">
                    <span className="text-black font-bold text-2xl flex-shrink-0">1</span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider whitespace-nowrap">Setup Profile</h4>
                  </div>
                </div>

                <img src="https://uploads-ssl.webflow.com/618ce467f09b34ebf2fdf6be/62761a51b1164cd877db83aa_Arrow%2012.svg" alt="arrow" className="w-20 h-20 rotate-[10deg]" />

                <div className="rounded border bg-card text-card-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] px-8 py-3 transition-all hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] duration-200 inline-flex">
                  <div className="flex items-center gap-3">
                    <span className="text-black font-bold text-2xl flex-shrink-0">2</span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider whitespace-nowrap">Start Interview</h4>
                  </div>
                </div>

                <img src="https://uploads-ssl.webflow.com/618ce467f09b34ebf2fdf6be/62761a51b1164cd877db83aa_Arrow%2012.svg" alt="arrow" className="w-20 h-20 rotate-[10deg]" />

                <div className="rounded border bg-card text-card-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] px-8 py-3 transition-all hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] duration-200 inline-flex">
                  <div className="flex items-center gap-3">
                    <span className="text-black font-bold text-2xl flex-shrink-0">3</span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider whitespace-nowrap">Showcase Skills</h4>
                  </div>
                </div>

                <img src="https://uploads-ssl.webflow.com/618ce467f09b34ebf2fdf6be/62761a51b1164cd877db83aa_Arrow%2012.svg" alt="arrow" className="w-20 h-20 rotate-[10deg]" />

                <div className="rounded border bg-card text-card-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] px-8 py-3 transition-all hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] duration-200 inline-flex">
                  <div className="flex items-center gap-3">
                    <span className="text-black font-bold text-2xl flex-shrink-0">4</span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider whitespace-nowrap">Get Hired</h4>
                  </div>
                </div>
              </div>

              <Card className="bg-black shadow-2xl overflow-hidden border-0 max-w-6xl rounded-none">
                <CardContent className="p-5">
                  <div className="space-y-5">
                  {/* Main Info Card - Compact Layout */}
                  <div className="bg-black rounded-none p-3 shadow-2xl">
                    {/* Interview Details - Compact Header */}
                    <div className="pb-3 mb-3">
                      <div className="flex items-start justify-between gap-2 mb-6">
                        <h3 className="text-2xl font-light text-white uppercase tracking-widest">
                          {invitationDetails?.interview.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-4 py-2 rounded">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-slate-200 font-medium text-sm uppercase tracking-wide">{invitationDetails?.interview.duration} MIN</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-4 py-2 rounded">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-slate-200 font-medium text-sm uppercase tracking-wide">AI-POWERED</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm font-light uppercase tracking-wide">
                        {invitationDetails?.interview.description}
                      </p>
                    </div>
                  </div>

                {/* CTA Button */}
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      onClick={() => {
                        setIsTransitioning(true);
                        // Update step indicator halfway through the animation
                        setTimeout(() => {
                          setCurrentStep(1);
                        }, 500);
                        // Complete transition
                        setTimeout(() => {
                          setIsTransitioning(false);
                        }, 1000);
                      }}
                      className="gap-2 h-10 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md hover:shadow-lg transition-all px-8 uppercase tracking-wider text-xs font-semibold w-full"
                    >
                      Begin Registration
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <p className="text-xs text-slate-500 text-right">By continuing, you agree to our <span className="text-blue-600">terms of service</span> & <span className="text-blue-600">privacy policy</span>.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Step 1: All Form Fields in One View */}
        {currentStep === 1 && (
          <Card className="border border-slate-300 rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full md:w-[95%] mx-auto">
            <CardContent className="p-4 md:p-10">
              <div className="mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 uppercase tracking-widest">Tell Us About Yourself</h2>
                <p className="text-slate-600 uppercase tracking-wide">The essentials that make you, you!</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-6">
                  <div className="space-y-6">
                    {/* Professional Info Card */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 256 256"><path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z"></path></svg>
                        <h3 className="font-medium text-base text-slate-900 uppercase tracking-wider">Professional Background</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="jobTitle" className="uppercase text-xs tracking-wider">Title <span className="text-red-600">*</span></Label>
                          <Input
                            id="jobTitle"
                            placeholder="e.g., Senior Accounting Manager"
                            value={formData.jobTitle}
                            onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                            className="mt-2 rounded border-none transition-all duration-300 bg-white h-10 text-base"
                            style={{
                              boxShadow: formErrors.jobTitle ? 'inset 1px 1px 2px #fee, 2px 2px 4px #fcc' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                            }}
                          />
                          {formErrors.jobTitle && <p className="text-xs text-red-500 mt-1">{formErrors.jobTitle}</p>}
                        </div>

                        <div>
                          <Label className="uppercase text-xs tracking-wider">Experience <span className="text-red-600">*</span></Label>
                          <div className="flex gap-2 mt-2">
                            <div className="flex-1">
                              <Input
                                id="experienceYears"
                                type="number"
                                placeholder="Years"
                                min="0"
                                max="50"
                                value={formData.experienceYears}
                                onChange={(e) => handleInputChange("experienceYears", e.target.value)}
                                className="rounded border-none transition-all duration-300 bg-white h-10 text-base"
                                style={{
                                  boxShadow: formErrors.experience ? 'inset 1px 1px 2px #fee, 2px 2px 4px #fcc' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                id="experienceMonths"
                                type="number"
                                placeholder="Months"
                                min="0"
                                max="11"
                                value={formData.experienceMonths}
                                onChange={(e) => handleInputChange("experienceMonths", e.target.value)}
                                className="rounded border-none transition-all duration-300 bg-white h-10 text-base"
                                style={{
                                  boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                                }}
                              />
                            </div>
                          </div>
                          {formErrors.experience && <p className="text-xs text-red-500 mt-1">{formErrors.experience}</p>}
                        </div>
                      </div>

                      <div>
                        <Label className="uppercase text-xs tracking-wider">Available to Start <span className="text-red-600">*</span></Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            { label: 'Immediate', value: 'Immediate', color: '#10b981' },
                            { label: '< 2 weeks', value: '< 2 weeks', color: '#84cc16' },
                            { label: '< 1 month', value: '< 1 month', color: '#eab308' },
                            { label: '< 2 months', value: '< 2 months', color: '#f97316' }
                          ].map((avail) => {
                            const isSelected = formData.availableIn === avail.value;
                            return (
                              <button
                                key={avail.value}
                                type="button"
                                onClick={() => handleInputChange("availableIn", avail.value)}
                                className="h-10 text-xs font-medium px-6 rounded uppercase transition-all duration-200 text-white"
                                style={{
                                  border: isSelected ? `3px solid ${avail.color}` : 'none',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  backgroundColor: isSelected ? avail.color : '#e2e8f0',
                                  color: isSelected ? 'white' : '#64748b',
                                  opacity: 1,
                                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = avail.color;
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.opacity = '0.8';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                                    e.currentTarget.style.color = '#64748b';
                                    e.currentTarget.style.opacity = '1';
                                  }
                                }}
                              >
                                {avail.label}
                              </button>
                            );
                          })}
                        </div>
                        {formErrors.availableIn && <p className="text-xs text-red-500 mt-1">{formErrors.availableIn}</p>}
                      </div>
                    </div>
                    </div>

                    {/* Contact Info Card */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 256 256"><path d="M168,56a8,8,0,0,1,8-8h16V32a8,8,0,0,1,16,0V48h16a8,8,0,0,1,0,16H208V80a8,8,0,0,1-16,0V64H176A8,8,0,0,1,168,56Zm62.56,54.68a103.92,103.92,0,1,1-85.24-85.24,8,8,0,0,1-2.64,15.78A88.07,88.07,0,0,0,40,128a87.62,87.62,0,0,0,22.24,58.41A79.66,79.66,0,0,1,98.3,157.66a48,48,0,1,1,59.4,0,79.66,79.66,0,0,1,36.06,28.75A87.62,87.62,0,0,0,216,128a88.85,88.85,0,0,0-1.22-14.68,8,8,0,1,1,15.78-2.64ZM128,152a32,32,0,1,0-32-32A32,32,0,0,0,128,152Zm0,64a87.57,87.57,0,0,0,53.92-18.5,64,64,0,0,0-107.84,0A87.57,87.57,0,0,0,128,216Z"></path></svg>
                        <h3 className="font-medium text-base text-slate-900 uppercase tracking-wider">Contact Details</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="linkedin" className="uppercase text-xs tracking-wider">LinkedIn Profile <span className="text-slate-500">(Optional)</span></Label>
                        <Input
                          id="linkedin"
                          type="url"
                          placeholder="https://linkedin.com/in/yourprofile"
                          value={formData.linkedin}
                          onChange={(e) => handleInputChange("linkedin", e.target.value)}
                          className="mt-2 rounded border-none transition-all duration-300 bg-white h-10 text-base"
                          style={{
                            boxShadow: formErrors.linkedin ? 'inset 1px 1px 2px #fee, 2px 2px 4px #fcc' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                          }}
                        />
                        {formErrors.linkedin && <p className="text-xs text-red-500 mt-1">{formErrors.linkedin}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="phone" className="uppercase text-xs tracking-wider">Phone Number <span className="text-red-600">*</span></Label>
                          <div className="flex gap-2 mt-2">
                            <select
                              value={formData.countryCode}
                              onChange={(e) => handleInputChange("countryCode", e.target.value)}
                              className="h-10 pl-2 pr-6 rounded border-none bg-white text-slate-700 font-medium w-24 text-base transition-all duration-300 appearance-none bg-no-repeat"
                              style={{
                                boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '12px'
                              }}
                            >
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+44">🇬🇧 +44</option>
                              <option value="+91">🇮🇳 +91</option>
                              <option value="+86">🇨🇳 +86</option>
                              <option value="+81">🇯🇵 +81</option>
                              <option value="+49">🇩🇪 +49</option>
                              <option value="+33">🇫🇷 +33</option>
                              <option value="+61">🇦🇺 +61</option>
                              <option value="+7">🇷🇺 +7</option>
                              <option value="+55">🇧🇷 +55</option>
                              <option value="+52">🇲🇽 +52</option>
                              <option value="+34">🇪🇸 +34</option>
                              <option value="+39">🇮🇹 +39</option>
                              <option value="+82">🇰🇷 +82</option>
                              <option value="+31">🇳🇱 +31</option>
                              <option value="+46">🇸🇪 +46</option>
                              <option value="+41">🇨🇭 +41</option>
                              <option value="+65">🇸🇬 +65</option>
                              <option value="+60">🇲🇾 +60</option>
                              <option value="+971">🇦🇪 +971</option>
                              <option value="+27">🇿🇦 +27</option>
                              <option value="+64">🇳🇿 +64</option>
                              <option value="+63">🇵🇭 +63</option>
                              <option value="+66">🇹🇭 +66</option>
                              <option value="+84">🇻🇳 +84</option>
                            </select>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="123-456-7890"
                              value={formData.phone}
                              onChange={(e) => handleInputChange("phone", e.target.value)}
                              className="rounded border-none transition-all duration-300 bg-white h-10 text-base flex-1"
                              style={{
                                boxShadow: formErrors.phone ? 'inset 1px 1px 2px #fee, 2px 2px 4px #fcc' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                              }}
                            />
                          </div>
                          {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                        </div>

                        <div className="relative">
                          <Label htmlFor="location" className="uppercase text-xs tracking-wider">Location <span className="text-red-600">*</span></Label>
                          <div className="relative mt-2">
                            <Input
                              id="location"
                              placeholder="Start typing city or country..."
                              value={formData.location}
                              onChange={(e) => handleInputChange("location", e.target.value)}
                              onFocus={() => locationSuggestions.length > 0 && setShowLocationDropdown(true)}
                              className="rounded border-none transition-all duration-300 bg-white h-10 text-base"
                              style={{
                                boxShadow: formErrors.location ? 'inset 1px 1px 2px #fee, 2px 2px 4px #fcc' : 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                              }}
                              autoComplete="off"
                            />
                            {showLocationDropdown && locationSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleLocationSelect(suggestion)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                                  >
                                    <MapPin className="w-3 h-3 inline mr-2 text-slate-500" />
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Right Side Box - resume upload (stacks below on mobile) */}
                  <div>
                    <div className="bg-slate-50 rounded-2xl p-4 h-full flex flex-col">
                      <Label className="uppercase text-xs tracking-wider mb-2 block">Upload Resume <span className="text-slate-500">(Optional)</span></Label>

                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex-1 flex flex-col items-center justify-center ${
                          isDragging
                            ? 'border-slate-800 bg-white'
                            : formErrors.resume
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
                        }`}
                        onClick={() => document.getElementById('resumeFile')?.click()}
                      >
                        <input
                          id="resumeFile"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        {formData.resumeFile ? (
                          <div className="flex flex-col items-center gap-3 w-full">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div className="text-center">
                              <p className="text-slate-900 font-semibold text-sm">{formData.resumeFile.name}</p>
                              <p className="text-xs text-slate-600 mt-1">{(formData.resumeFile.size / 1024).toFixed(2)} KB</p>
                              {isExtractingResume && (
                                <p className="text-[11px] text-blue-600 mt-1 inline-flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Reading your resume to pre-fill the form…
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, resumeFile: null }));
                              }}
                              className="mt-2 text-slate-500 hover:text-red-600 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-900 font-semibold mb-1 text-sm">
                              {isDragging ? 'Drop your file here' : 'Drag & drop your resume here'}
                            </p>
                            <p className="text-xs text-slate-600 mb-2">or click to browse</p>
                            <p className="text-xs text-slate-500">Max 5MB • PDF, DOC, DOCX</p>
                          </div>
                        )}
                      </div>

                      {formErrors.resume && <p className="text-xs text-red-500 mt-2">{formErrors.resume}</p>}
                      {extractionFailed && !formErrors.resume && (
                        <p className="text-xs text-amber-600 mt-2" role="status">
                          We couldn't auto-fill from your resume. No worries — please fill in the fields below manually.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portfolio Link - Full Width */}
                <div className="bg-slate-50 rounded-2xl p-4 hidden">
                  <div>
                    <Label htmlFor="portfolioUrl" className="uppercase text-xs tracking-wider">
                      Portfolio / Website <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      placeholder="https://yoursite.com"
                      value={formData.portfolioUrl}
                      onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
                      className="mt-2 rounded border-none transition-all duration-300 bg-white h-10 text-base"
                      style={{
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Your Vibe (psych assessment) moved to Candidate Portal post-interview
                  as a "Strengthen your profile" nudge — keeps the pre-interview form short. */}

              <div className="flex items-center justify-between mt-10 pt-6">
                <Button onClick={handlePrevious} className="gap-2 border border-slate-300 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-slate-700 bg-white hover:bg-slate-50 h-11 px-6 uppercase tracking-wider">
                  <ArrowLeft className="w-4 h-4" />
                  BACK
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white border-none rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] h-11 px-6 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SUBMITTING...
                    </>
                  ) : (
                    <>
                      COMPLETE REGISTRATION
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Spacer to push FlowDot AI box to bottom */}
      {currentStep === 0 && (
        <div className="flex-grow"></div>
      )}

      {/* About FunnelHQ Box */}
      {currentStep === 0 && (
        <div className="px-8 mt-6">
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="FunnelHQ" className="h-16 object-cover object-top flex-shrink-0" />
              <div className="flex flex-col flex-1">
                <h1 className="text-lg font-bold text-slate-900 whitespace-nowrap">FunnelHQ</h1>
                <p className="text-[10px] text-slate-500 whitespace-nowrap">Candidate Portal</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-xs text-slate-700 whitespace-nowrap">
                  FunnelHQ is an AI-powered candidate screening platform where professionals take a single interview to unlock multiple job opportunities
                </p>
                <div className="flex items-center gap-3 mt-1 whitespace-nowrap">
                  <a href="#" className="text-blue-600 hover:text-blue-700 text-[10px]">LinkedIn</a>
                  <a href="#" className="text-blue-600 hover:text-blue-700 text-[10px]">Twitter</a>
                  <a href="#" className="text-blue-600 hover:text-blue-700 text-[10px]">Facebook</a>
                  <span className="text-slate-300">•</span>
                  <a href="#" className="text-slate-600 hover:text-slate-900 text-[10px]">Terms</a>
                  <a href="#" className="text-slate-600 hover:text-slate-900 text-[10px]">Privacy</a>
                  <a href="#" className="text-slate-600 hover:text-slate-900 text-[10px]">Contact</a>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 text-[10px]">© 2025 FunnelHQ. All rights reserved.</span>
                </div>
              </div>
            </div>
            </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="mt-8 py-4">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs text-center text-slate-500">
            Disclaimer: This interview opportunity is powered by AI. Hiring decisions remain solely with the recruiting companies. No job offer is guaranteed.
          </p>
        </div>
      </footer>
    </div>
  );
}
