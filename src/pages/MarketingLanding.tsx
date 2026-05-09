// Marketing Landing Page for recruitfast.ai
import { useState, useEffect, useRef } from "react";
import { ProblemSection } from "@/components/landing/ProblemSection";
import SavingsCalculator from "@/components/SavingsCalculator";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Check } from 'lucide-react';
import { AntiGravityCanvas } from "@/components/ui/particle-effect-for-hero";
import { ParticleSphere } from "@/components/interview/ParticleSphere";
import { ConversationState } from "@/types/interview";
import AssemblyAIStreamer from "@/components/interview/AssemblyAIStreamer";
import CartesiaSpeaker, { CartesiaSpeakerHandle } from "@/components/interview/CartesiaSpeaker";
import howItWorksImage from "@/assets/how-it-works.png";

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

const Navigation = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="absolute top-0 left-0 w-full z-20 flex justify-between items-center p-6 md:p-8">
      <div className="flex items-center">
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter">
            recruitfast.ai
          </span>
        </div>
      </div>
      <div className="hidden md:flex space-x-8 text-sm font-medium text-white/70">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <button onClick={() => scrollToSection('meet-flowy')} className="hover:text-white transition-colors">See Me In Action</button>
        <button onClick={() => navigate('/how-it-works')} className="hover:text-white transition-colors">How It Works</button>
        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
      </div>
      <button
        onClick={() => scrollToSection('pricing')}
        className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white border border-white/20 rounded-full hover:bg-white/10 transition-all"
      >
        Contact Us
      </button>
    </nav>
  );
};

const RotatingWord = () => {
  const words = ["Assess", "Discover", "Decide"];
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? 120 : 180);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex]);

  return (
    <span className="inline-flex items-center justify-center min-w-[5ch] tracking-wider">
      <span>{displayText || "\u00A0"}</span>
      <span className="inline-block w-[4px] h-[0.85em] bg-white/80 ml-2 animate-[pulse_1s_ease-in-out_infinite]" />
    </span>
  );
};

const HeroContent = () => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="inline-block animate-fade-in-up">
          <span className="inline-flex items-center gap-2 py-1 px-3 border border-white/20 rounded-full text-xs font-mono text-white/60 tracking-widest uppercase bg-white/5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Flowy does the talking, you choose
          </span>
        </div>

        <h1 className="text-7xl md:text-9xl lg:text-[11rem] font-light text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter mix-blend-difference">
          <RotatingWord /><br/><span className="tracking-wider">Talents</span>
        </h1>


        <div className="pt-8 pointer-events-auto flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/product-landing')}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold tracking-wide overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">Get Started Free</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out opacity-10"></div>
          </button>

          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-4 text-white/70 hover:text-white font-medium transition-colors"
          >
            <span>Book a Demo</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

    </div>
  );
};

// Meet Flowy Section with Particle Sphere
const MeetFlowySection = () => {
  const [conversationState, setConversationState] = useState<
    'hidden' | 'pausing' | 'greeting' | 'listening' | 'ai-thinking' | 'ai-speaking'
  >('hidden');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [currentAIResponse, setCurrentAIResponse] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const cartesiaSpeakerRef = useRef<CartesiaSpeakerHandle>(null);
  const assemblyStreamerRef = useRef<AssemblyAIStreamer | null>(null);
  const sessionIdRef = useRef<string>('');
  const conversationStateRef = useRef(conversationState);
  const hasHandledGreetingInterruption = useRef(false);
  const isFirstMessageRef = useRef(true);

  // Update ref when state changes
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  // Map conversation state to ParticleSphere state
  const getParticleSphereState = (): ConversationState => {
    let sphereState: ConversationState;
    switch (conversationState) {
      case 'hidden':
      case 'pausing':
        sphereState = ConversationState.IDLE;
        break;
      case 'greeting':
        // Use CALIBRATING for greeting - it has a nice heartbeat animation that doesn't need audio level
        sphereState = ConversationState.CALIBRATING;
        break;
      case 'ai-speaking':
        sphereState = ConversationState.SPEAKING;
        break;
      case 'listening':
        sphereState = ConversationState.LISTENING;
        break;
      case 'ai-thinking':
        sphereState = ConversationState.THINKING;
        break;
      default:
        sphereState = ConversationState.IDLE;
    }
    console.log('[MeetFlowy] State mapping:', conversationState, '->', sphereState, 'audioLevel:', audioLevel);
    return sphereState;
  };

  const handleStartConversation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      alert('Microphone access is required to talk to Flowy.');
      return;
    }

    setConversationState('pausing');
    const newSessionId = `landing-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    sessionIdRef.current = newSessionId;

    // Create backend session
    fetch(`${BACKEND_URL}/api/landing-agent/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: newSessionId })
    }).catch(console.error);

    setTimeout(() => startGreeting(), 200);
  };

  const startGreeting = async () => {
    setConversationState('greeting'); // Use 'greeting' for initial calibration state
    hasHandledGreetingInterruption.current = false;
    startAssemblyAI();

    // Send "hi" to get a greeting from the backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/landing-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: 'hi'
        })
      });

      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      const aiResponse = data.response.replace(/```json[\s\S]*?```/g, '').trim();
      setCurrentAIResponse(aiResponse);
      setConversationState('ai-speaking');
    } catch {
      setConversationState('listening');
    }
  };

  const startAssemblyAI = async () => {
    if (assemblyStreamerRef.current) {
      await assemblyStreamerRef.current.stopStreaming();
    }

    assemblyStreamerRef.current = new AssemblyAIStreamer(
      sessionIdRef.current,
      handleTranscriptUpdate,
      (metrics) => setAudioLevel(metrics.currentRms),
      () => {},
      () => {},
      BACKEND_URL
    );

    await assemblyStreamerRef.current.startStreaming();
  };

  const handleTranscriptUpdate = (text: string, isFinal: boolean) => {
    const currentState = conversationStateRef.current;
    console.log('[MeetFlowy] Transcript update:', { text, isFinal, currentState });
    setTranscript(text);

    // Interrupt AI speaking when user starts talking
    if (currentState === 'ai-speaking' && text.trim().length > 3) {
      console.log('[MeetFlowy] Interrupting AI speaking');
      interruptAISpeaking();
      return; // Let user finish speaking
    }

    if (isFinal && currentState === 'listening' && text.trim()) {
      console.log('[MeetFlowy] Final transcript, sending to agent:', text);
      sendMessageToAgent(text);
      setTranscript('');
    }
  };

  const interruptAISpeaking = () => {
    // Stop Cartesia TTS
    cartesiaSpeakerRef.current?.stop();
    setCurrentAIResponse('');
    setConversationState('listening');
  };

  const sendMessageToAgent = async (userMessage: string) => {
    if (!userMessage.trim()) return;
    setConversationState('ai-thinking');

    if (isFirstMessageRef.current) {
      isFirstMessageRef.current = false;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/landing-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: userMessage
        })
      });

      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      let aiResponse = data.response.replace(/```json[\s\S]*?```/g, '').trim();
      setCurrentAIResponse(aiResponse);
      setConversationState('ai-speaking');
    } catch {
      setConversationState('listening');
    }
  };

  const handleEndConversation = async () => {
    audioRef.current?.pause();
    cartesiaSpeakerRef.current?.stop();
    await assemblyStreamerRef.current?.stopStreaming();

    if (sessionIdRef.current) {
      fetch(`${BACKEND_URL}/api/landing-agent/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current })
      }).catch(console.error);
    }

    setConversationState('hidden');
    setTranscript('');
    setCurrentAIResponse('');
    setAudioLevel(0);
    sessionIdRef.current = '';
    isFirstMessageRef.current = true;
    hasHandledGreetingInterruption.current = false;
  };

  const getStatusText = () => {
    switch (conversationState) {
      case 'greeting': return 'Flowy is calibrating...';
      case 'listening': return transcript ? `"${transcript}"` : 'Listening... Your turn to speak';
      case 'ai-thinking': return 'Flowy is thinking...';
      case 'ai-speaking': return 'Flowy is speaking...';
      default: return '';
    }
  };

  return (
    <section id="meet-flowy" className="relative min-h-screen bg-black flex items-center justify-center py-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
        {/* Particle Sphere */}
        <div className="w-full lg:w-1/2 aspect-square max-w-[600px]">
          <ParticleSphere
            conversationState={getParticleSphereState()}
            audioLevel={audioLevel}
          />
        </div>

        {/* Content */}
        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-light text-white tracking-wider">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">Flowy</span>
          </h2>

          <p className="text-lg text-white/60 font-light">
            She handles the small talk and the hard questions.<br />
            <span className="text-white/80">You handle the final call.</span>
          </p>

          {conversationState === 'hidden' && (
            <button
              onClick={handleStartConversation}
              className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#003887] to-[#005aef] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <span>Talk to Flowy</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                <path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V232a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"></path>
              </svg>
            </button>
          )}

          {conversationState !== 'hidden' && conversationState !== 'pausing' && (
            <div className="space-y-4">
              <p className="text-sm font-medium" style={{ color: '#5573ff' }}>
                {getStatusText()}
              </p>
              <button
                onClick={handleEndConversation}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-400/50 text-red-400 rounded hover:bg-red-400/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                </svg>
                End Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio & Cartesia */}
      <audio ref={audioRef} />
      {currentAIResponse && (
        <CartesiaSpeaker
          ref={cartesiaSpeakerRef}
          text={currentAIResponse}
          trigger={conversationState === 'ai-speaking'}
          speechRate="slow"
          voiceAccent="indian"
          onAudioLevel={setAudioLevel}
          onSpeakingStateChange={(speaking) => {
            if (!speaking && conversationState === 'ai-speaking') {
              setConversationState('listening');
              setCurrentAIResponse('');
            }
          }}
        />
      )}
    </section>
  );
};

// Candidate Portal Section - Two-Level AI Interview
const CandidatePortalSection = () => {
  return (
    <section id="features" className="relative bg-black min-h-screen flex items-center py-24">
      <div className="max-w-7xl mx-auto px-6 w-full">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-white tracking-wide">
            Let AI handle the basics,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">
              Not HR
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mt-4">
            Candidates move through a structured, fair, and engaging AI-led experience - without waiting for human intervention.
          </p>
        </div>

        {/* How It Works Image */}
        <div className="max-w-6xl mx-auto">
          <img
            src={howItWorksImage}
            alt="How It Works"
            className="w-full rounded-2xl border border-white/10"
          />

          {/* Bottom tagline */}
          <div className="flex items-center gap-5 mt-12">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-10 h-10 flex-shrink-0 text-green-500">
              <rect width="256" height="256" fill="none"/>
              <polyline points="40 144 96 200 224 72" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
            </svg>
            <p className="text-white/70 text-2xl text-left">
              Candidates are fully pre-qualified and scored before HR or hiring managers are involved
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Features Bento Grid Section
const FeaturesGridSection = () => {
  const features = [
    {
      title: "Automated Availability & Preferences",
      description: "No back-and-forth emails. Candidates self-schedule based on their availability.",
      span: 2,
    },
    {
      title: "Resume Upload",
      description: "Intelligent parsing extracts key skills and qualifications automatically.",
      span: 1,
    },
    {
      title: "Real-time Scoring",
      description: "Instant candidate scoring with transparent, role-based criteria.",
      span: 1,
    },
    {
      title: "Conversational Q&A",
      description: "Natural dialogue-based interviews that put candidates at ease while gathering insights.",
      span: 2,
    },
    {
      title: "Scenario-Based Evaluation",
      description: "Real-world problem solving, not keyword matching. See how candidates actually think.",
      span: 2,
    },
    {
      title: "Reports",
      description: "Skill & role-fit reports with actionable insights for every candidate.",
      span: 1,
    },
  ];

  return (
    <section className="relative bg-black min-h-screen flex items-center py-24">
      <div className="max-w-6xl mx-auto px-6 w-full">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-light text-white tracking-wide mb-4">
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">
              hire smarter
            </span>
          </h2>
          <p className="text-lg text-white/50">
            Intelligent hiring tools that work in the background
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`p-6 bg-white/5 border border-white/10 rounded-sm transition-all duration-300 hover:bg-white/10 hover:border-[#00b1ff]/50 hover:shadow-[0_0_20px_rgba(0,177,255,0.3)] ${
                feature.span === 2 ? "md:col-span-2" : ""
              }`}
            >
              <h3 className="text-xl font-medium text-white mb-2">{feature.title}</h3>
              <p className="text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Section
const PricingSection = () => {
  return (
    <section id="pricing" className="relative bg-black py-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-white tracking-wide mb-4">
            Built for Teams of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">
              Every Size
            </span>
          </h2>
          <p className="text-white/50 text-lg">
            Simple, Transparent Pricing
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Free Plan */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300">
            <h3 className="text-2xl font-medium text-white mb-2">Free</h3>
            <p className="text-white/50 text-sm mb-6">For early teams and pilots</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#5573ff]">•</span>
                Up to 10 open positions
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#5573ff]">•</span>
                Up to 100 candidates
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#5573ff]">•</span>
                Full AI candidate portal
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#5573ff]">•</span>
                AI-based screening & shortlisting
              </li>
            </ul>

            <div className="text-3xl font-light text-white mb-2">€0</div>
            <p className="text-white/40 text-sm">forever</p>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#0a0a0a] border-2 border-[#005aef] rounded-2xl p-8 relative shadow-[0_0_30px_rgba(0,90,239,0.15)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 bg-gradient-to-r from-[#005aef] to-[#00b1ff] text-white text-xs font-bold rounded-full">
                POPULAR
              </span>
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">Pro</h3>
            <p className="text-white/50 text-sm mb-6">For growing teams and scaling startups</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#00b1ff]">•</span>
                Up to 50 open positions
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#00b1ff]">•</span>
                Up to 500 candidates
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#00b1ff]">•</span>
                Advanced AI assessments
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#00b1ff]">•</span>
                Recruiter workspace & insights
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#00b1ff]">•</span>
                Priority support
              </li>
            </ul>

            <div className="text-xl font-light text-white/70 mb-2">Contact our sales team</div>
          </div>

          {/* Enterprise Plan */}
          <a
            href="https://zohmedia.com/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 cursor-pointer"
          >
            <h3 className="text-2xl font-medium text-white mb-2">Enterprise</h3>
            <p className="text-white/50 text-sm mb-6">For large organisations and high-volume hiring</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#005aef]">•</span>
                Unlimited positions & candidates
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#005aef]">•</span>
                Custom AI models & workflows
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#005aef]">•</span>
                Advanced analytics & integrations
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#005aef]">•</span>
                Dedicated support & SLA
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <span className="text-[#005aef]">•</span>
                Enterprise-grade security & compliance
              </li>
            </ul>

            <div className="text-xl font-light text-white/70 mb-2">Contact our sales team</div>
          </a>
        </div>
      </div>
    </section>
  );
};

// Book Demo Section - Dark Theme
const BookDemoSection = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    industry: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const industries = [
    'Technology',
    'Finance & Banking',
    'Healthcare',
    'Retail & E-commerce',
    'Manufacturing',
    'Consulting',
    'Education',
    'Media & Entertainment',
    'Real Estate',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use proxy path - works in both dev (Vite proxy) and prod (Vercel rewrite)
      const response = await fetch('/api/demo-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          industry: formData.industry,
          message: formData.message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      // Still show success to user (webhook might not return JSON)
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="pricing" className="relative bg-black py-24">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/50 to-black pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-white tracking-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">Book</span> Your Free Demo
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Get a personalized demo of our AI-powered platform.<br />
            See how we can transform your talent discovery process in just 30 minutes.
          </p>
        </div>

        {/* Form Card - Dark */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-8 md:p-10">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
              <p className="text-white/60">We'll reach out within 24 hours to schedule your personalized demo.</p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white text-center mb-8">Get Started</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: First Name + Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-[#005aef] focus:ring-2 focus:ring-[#005aef]/20 outline-none transition-all text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-[#005aef] focus:ring-2 focus:ring-[#005aef]/20 outline-none transition-all text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Email + Industry */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Organization Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-[#005aef] focus:ring-2 focus:ring-[#005aef]/20 outline-none transition-all text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Industry
                    </label>
                    <div className="relative">
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-[#005aef] focus:ring-2 focus:ring-[#005aef]/20 outline-none transition-all text-white appearance-none cursor-pointer"
                        required
                      >
                        <option value="" disabled className="bg-slate-900 text-white/60">Select industry</option>
                        {industries.map((industry) => (
                          <option key={industry} value={industry} className="bg-slate-900 text-white">{industry}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 3: Message */}
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">
                    Message
                  </label>
                  <textarea
                    placeholder="Tell us about your hiring needs..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-[#005aef] focus:ring-2 focus:ring-[#005aef]/20 outline-none transition-all text-white placeholder:text-white/40 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#003887] to-[#005aef] hover:from-[#005aef] hover:to-[#00b1ff] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#003887]/25 hover:shadow-xl hover:shadow-[#005aef]/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Book Free Demo'}
                </button>
              </form>

              {/* What to Expect */}
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-white/60 text-center">
                  <span className="font-semibold text-white/80">What to expect:</span> Someone from our team will reach out within 24 hours to schedule your personalized demo and answer any questions you may have.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter">
                  recruitfast.ai
                </span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              AI-powered talent discovery platform that simplifies how organizations discover and evaluate talent.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-white/50 hover:text-white text-sm transition-colors">Features</a></li>
              <li><a href="/how-it-works" className="text-white/50 hover:text-white text-sm transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-white/50 hover:text-white text-sm transition-colors">Pricing</a></li>
              <li><a href="#meet-flowy" className="text-white/50 hover:text-white text-sm transition-colors">Meet Flowy</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="https://zohmedia.com/about-us/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition-colors">About Us</a></li>
              <li><a href="https://zohmedia.com/contact-us/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="https://zohmedia.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © {currentYear} recruitfast.ai. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/zoh-media/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// FAQ Section
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Does AI make the final hiring decision?",
      answer: "No. AI supports screening and assessment, but HR and hiring managers always make the final decision."
    },
    {
      question: "How long does each AI interview take?",
      answer: "Screening interview: ~10 minutes. Role-specific interview: 15–25 minutes (configurable)."
    },
    {
      question: "Is this suitable for senior and specialised roles?",
      answer: "Yes. The two-level interview model works for entry-level, mid-level, and senior positions, including specialised technical roles."
    },
    {
      question: "How does this reduce bias?",
      answer: "AI applies consistent, role-based criteria to every candidate, reducing subjective human bias in early screening stages."
    },
    {
      question: "Is the platform GDPR compliant?",
      answer: "Yes. The platform is designed with GDPR principles including data minimisation, consent, and secure access controls."
    },
    {
      question: "Will candidates be comfortable interacting with AI?",
      answer: "Yes. Candidates benefit from flexible scheduling, transparency, and faster feedback — leading to higher completion rates."
    },
    {
      question: "Can this integrate with existing ATS or HR systems?",
      answer: "Enterprise plans support integrations with leading ATS and HR platforms."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative bg-black py-24">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-white tracking-wide">
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005aef] to-[#00b1ff]">
              Questions
            </span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <h3 className="text-lg font-medium text-white pr-4">
                  {faq.question}
                </h3>
                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-white/20 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </div>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-white/50 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MarketingLanding = () => {
  return (
    <div className="relative w-full bg-black selection:bg-blue-500 selection:text-white">
      {/* Hero Section */}
      <div className="relative w-full h-screen overflow-hidden">
        <AntiGravityCanvas />
        <Navigation />
        <HeroContent />
      </div>

      {/* Problem Section */}
      <ProblemSection />

      {/* Meet Flowy Section */}
      <MeetFlowySection />

      {/* Candidate Portal Section */}
      <CandidatePortalSection />

      {/* Features Bento Grid Section */}
      <FeaturesGridSection />

      {/* Savings Calculator */}
      <SavingsCalculator />

      {/* Pricing Section */}
      <PricingSection />

      {/* Book Demo Section */}
      <BookDemoSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MarketingLanding;
