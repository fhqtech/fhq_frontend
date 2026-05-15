import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Mic, Video, Settings, ChevronDown, Wifi, Clock } from 'lucide-react';
import aiAvatar from '@/assets/ai-avatar.png';

// Custom PhoneDisconnect icon from Phosphor
const PhoneDisconnectIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256" className={className}>
    <path d="M53.93,34.62A8,8,0,1,0,42.09,45.38L69.68,75.74a141.26,141.26,0,0,0-45.27,30.44c-20,20-21.92,49.46-4.69,71.67a16,16,0,0,0,18.38,5.07l49-17.37.29-.11a16,16,0,0,0,9.75-11.72l5.9-29.51a75.89,75.89,0,0,1,8.56-2.4l90.51,99.57a8,8,0,1,0,11.84-10.76Zm43.7,74.52a16,16,0,0,0-10.32,11.94l-5.9,29.5-48.78,17.3c-.1,0-.17.13-.27.17-12.33-15.9-11-36.22,3.36-50.56a125.79,125.79,0,0,1,45.47-29.1l18.3,20.14C98.87,108.73,98.25,108.92,97.63,109.14Zm138.65,68.71a16,16,0,0,1-18.38,5.07l-9.25-3.28A8,8,0,0,1,214,164.56l9.37,3.32.3.12c12.3-15.85,11-36.17-3.39-50.51-25.66-25.66-61.88-39.27-99.35-37.31a8,8,0,1,1-.83-16c42-2.19,82.63,13.1,111.49,42C251.58,126.17,253.51,155.64,236.28,177.85Z"></path>
  </svg>
);

type ConversationMode = 'idle' | 'calibrating' | 'listening' | 'thinking' | 'speaking';

// Animated Particle Sphere Component with different modes
function ParticleSphere({
  count = 8000,
  radius = 3.5,
  mode = 'idle' as ConversationMode
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const prevModeRef = useRef<ConversationMode>(mode);
  const transitionRef = useRef({
    progress: 1, // 1 = fully transitioned
    startTime: 0,
    duration: 0.5, // 500ms transition
  });

  const animStateRef = useRef({
    // For idle/speaking pulse
    phase: 'waiting' as 'waiting' | 'expanding' | 'returning',
    startTime: 0,
    selectedParticles: new Set<number>(),
    lastPulseTime: 0,
    // For calibrating ring animation
    ringPhase: 0,
    // For thinking spiral
    spiralAngle: 0,
    // Track current rotation for smooth transitions
    currentRotationY: 0,
    currentRotationX: 0,
    targetRotationSpeed: 0.14,
  });

  // Create particle positions - includes current positions for interpolation
  const { positions, originalPositions, particleSeeds, currentPositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    const currentPositions = new Float32Array(count * 3);
    const particleSeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const u3 = Math.random();

      const rNorm = Math.pow(u1, 0.4);
      const r = radius * rNorm;

      const theta = u2 * Math.PI * 2;
      const phi = Math.acos(2 * u3 - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      currentPositions[i * 3] = x;
      currentPositions[i * 3 + 1] = y;
      currentPositions[i * 3 + 2] = z;

      particleSeeds[i] = Math.random();
    }

    return { positions, originalPositions, particleSeeds, currentPositions };
  }, [count, radius]);

  // Detect mode changes and start transition
  useEffect(() => {
    if (mode !== prevModeRef.current) {
      // Save current positions before transition
      if (pointsRef.current) {
        const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count * 3; i++) {
          currentPositions[i] = posArray[i];
        }
      }

      transitionRef.current.progress = 0;
      transitionRef.current.startTime = -1; // Will be set on first frame
      prevModeRef.current = mode;

      // Reset pulse state for clean transition
      animStateRef.current.phase = 'waiting';
      animStateRef.current.lastPulseTime = 0;
    }
  }, [mode, count, currentPositions]);

  // Calculate target position for a particle based on mode
  const getTargetPosition = (
    i: number,
    time: number,
    anim: typeof animStateRef.current
  ): [number, number, number] => {
    const i3 = i * 3;
    const ox = originalPositions[i3];
    const oy = originalPositions[i3 + 1];
    const oz = originalPositions[i3 + 2];

    switch (mode) {
      case 'idle': {
        // IDLE: Static - particles at rest, no animation
        return [ox, oy, oz];
      }

      case 'calibrating': {
        // CALIBRATING: Heartbeat - slow breathing outward pulse
        const breathCycle = 4.0;
        const breathProgress = (Math.sin(time * (Math.PI * 2 / breathCycle)) + 1) / 2;
        const breathScale = 1 + breathProgress * 0.45;
        const variation = 0.8 + particleSeeds[i] * 0.4;
        const scale = 1 + (breathScale - 1) * variation;
        return [ox * scale, oy * scale, oz * scale];
      }

      case 'listening': {
        // LISTENING: Reverse heartbeat - particles contract inward
        const contractStrength = 0.55;
        let contractProgress = 0;

        if (anim.phase === 'expanding') {
          const contractDuration = 0.8;
          const t = (time - anim.startTime) / contractDuration;
          contractProgress = 1 - Math.pow(1 - Math.min(t, 1), 2);
        } else if (anim.phase === 'returning') {
          const returnDuration = 1.2;
          const t = (time - anim.startTime) / returnDuration;
          const clampedT = Math.min(t, 1);
          contractProgress = 1 - (clampedT < 0.5 ? 2 * clampedT * clampedT : 1 - Math.pow(-2 * clampedT + 2, 2) / 2);
        }

        if (anim.selectedParticles.has(i)) {
          const particleVariation = 0.5 + particleSeeds[i] * 1.0;
          const scale = 1 - (1 - contractStrength) * contractProgress * particleVariation;
          return [ox * scale, oy * scale, oz * scale];
        }
        return [ox, oy, oz];
      }

      case 'thinking': {
        // THINKING: Fast spinning - particles at rest, rotation handled separately
        return [ox, oy, oz];
      }

      case 'speaking': {
        // SPEAKING: Rhythmic outward pulses simulating speech
        const speechRhythm =
          Math.sin(time * 8) * 0.3 +
          Math.sin(time * 3) * 0.2 +
          Math.sin(time * 1.2) * 0.15;
        const pulseIntensity = Math.max(0, speechRhythm) * 0.25;
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz) / radius;
        const waveDelay = dist * 0.5;
        const delayedPulse = Math.sin(time * 8 - waveDelay * Math.PI) * 0.15;
        const scale = 1 + pulseIntensity + Math.max(0, delayedPulse) * dist;
        const variation = 0.7 + particleSeeds[i] * 0.6;
        const finalScale = 1 + (scale - 1) * variation;
        return [ox * finalScale, oy * finalScale, oz * finalScale];
      }

      default:
        return [ox, oy, oz];
    }
  };

  // Animation based on mode
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const time = state.clock.elapsedTime;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const anim = animStateRef.current;
    const transition = transitionRef.current;

    // Initialize transition start time on first frame after mode change
    if (transition.startTime === -1) {
      transition.startTime = time;
    }

    // Calculate transition progress (0 to 1)
    if (transition.progress < 1) {
      transition.progress = Math.min(1, (time - transition.startTime) / transition.duration);
    }

    // Smooth easing function
    const easeProgress = transition.progress < 0.5
      ? 2 * transition.progress * transition.progress
      : 1 - Math.pow(-2 * transition.progress + 2, 2) / 2;

    // Update listening pulse state
    if (mode === 'listening') {
      const waitDuration = 2.0;
      const contractDuration = 0.8;
      const returnDuration = 1.2;
      const pulseParticleRatio = 0.85;

      if (anim.phase === 'waiting') {
        if (time - anim.lastPulseTime > waitDuration) {
          anim.phase = 'expanding';
          anim.startTime = time;
          anim.selectedParticles.clear();
          for (let i = 0; i < count; i++) {
            if (Math.random() < pulseParticleRatio) {
              anim.selectedParticles.add(i);
            }
          }
        }
      } else if (anim.phase === 'expanding') {
        if (time - anim.startTime > contractDuration) {
          anim.phase = 'returning';
          anim.startTime = time;
        }
      } else if (anim.phase === 'returning') {
        if (time - anim.startTime > returnDuration) {
          anim.phase = 'waiting';
          anim.lastPulseTime = time;
        }
      }
    }

    // Update particle positions with smooth interpolation
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const [targetX, targetY, targetZ] = getTargetPosition(i, time, anim);

      if (transition.progress < 1) {
        // Interpolate from saved current position to target
        posArray[i3] = currentPositions[i3] + (targetX - currentPositions[i3]) * easeProgress;
        posArray[i3 + 1] = currentPositions[i3 + 1] + (targetY - currentPositions[i3 + 1]) * easeProgress;
        posArray[i3 + 2] = currentPositions[i3 + 2] + (targetZ - currentPositions[i3 + 2]) * easeProgress;
      } else {
        posArray[i3] = targetX;
        posArray[i3 + 1] = targetY;
        posArray[i3 + 2] = targetZ;
      }
    }

    // Smooth rotation transitions
    let targetRotationSpeedY = 0.05;
    let wobbleX = 0;

    switch (mode) {
      case 'idle':
        // IDLE: Very slow rotation, almost static
        targetRotationSpeedY = 0.05;
        break;
      case 'calibrating':
        // CALIBRATING: Slow rotation with heartbeat
        targetRotationSpeedY = 0.14;
        break;
      case 'listening':
        // LISTENING: Active rotation
        targetRotationSpeedY = 0.25;
        break;
      case 'thinking':
        // THINKING: Fast spinning like original calibrating
        targetRotationSpeedY = 2.5;
        wobbleX = Math.sin(time * 0.5) * 0.15;
        break;
      case 'speaking':
        // SPEAKING: Rhythmic rotation
        targetRotationSpeedY = 0.3 + Math.sin(time * 2) * 0.05;
        break;
    }

    // Smoothly interpolate rotation
    const rotationLerp = 0.05; // How fast rotation speed changes
    anim.targetRotationSpeed = anim.targetRotationSpeed + (targetRotationSpeedY - anim.targetRotationSpeed) * rotationLerp;

    anim.currentRotationY += anim.targetRotationSpeed * delta;
    anim.currentRotationX = anim.currentRotationX + (wobbleX - anim.currentRotationX) * 0.1;

    pointsRef.current.rotation.y = anim.currentRotationY;
    pointsRef.current.rotation.x = anim.currentRotationX;

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function TestAssets() {
  const [mode, setMode] = useState<ConversationMode>('idle');

  const modes: { key: ConversationMode; label: string; color: string }[] = [
    { key: 'idle', label: 'IDLE', color: '#64748b' },
    { key: 'calibrating', label: 'CALIBRATING', color: '#3b82f6' },
    { key: 'listening', label: 'LISTENING', color: '#22c55e' },
    { key: 'thinking', label: 'THINKING', color: '#f97316' },
    { key: 'speaking', label: 'SPEAKING', color: '#a855f7' },
  ];

  return (
    <div className="w-screen h-screen bg-ink relative">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <color attach="background" args={['#1a1a24']} />
        <ParticleSphere count={12000} radius={2.2} mode={mode} />
      </Canvas>

      {/* Mode Selection Buttons */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
        {modes.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`
              px-4 py-2 rounded-lg font-semibold text-sm uppercase tracking-wider
              transition-all duration-200
              ${mode === key
                ? 'text-paper shadow-2 scale-105'
                : 'text-muted-2 bg-ink/50 hover:bg-ink/50 hover:text-paper'
              }
            `}
            style={{
              backgroundColor: mode === key ? color : undefined,
              boxShadow: mode === key ? `0 0 20px ${color}50` : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Logo - Top Left */}
      <div className="absolute top-6 left-6">
        <h1 className="text-xl font-bold text-paper whitespace-nowrap">FunnelHQ</h1>
        <p className="text-xs text-muted-2 whitespace-nowrap">Applicant Portal</p>
      </div>

      {/* Interview Title & Connection Status - Center Top */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <h2 className="text-paper text-lg font-semibold mb-2">Senior Product Manager</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-red-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">00:00</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-500">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
      </div>

      {/* Camera Feed Tile - Larger black rectangle at top right */}
      <div className="absolute top-6 right-6 w-72 h-52 bg-ink rounded-lg border border-ink flex items-center justify-center">
        <div className="text-center">
          <Video className="w-12 h-12 text-muted mx-auto mb-2" />
          <span className="text-muted text-xs uppercase tracking-wider">Camera Feed</span>
        </div>
      </div>

      {/* Transcript Box - Below Camera Feed */}
      <div className="absolute top-[240px] right-6 w-72 h-[420px] bg-ink/80 rounded-lg border border-ink flex flex-col">
        <div className="px-3 py-2 border-b border-ink">
          <span className="text-muted-2 text-xs uppercase tracking-wider font-medium">Transcript</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* AI Message - Left aligned */}
          <div className="flex items-start gap-2">
            <img
              src={aiAvatar}
              alt="Flowy"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-sky-500/10 rounded-lg rounded-tl-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">Hello! Welcome to your interview for the Senior Product Manager position. Can you start by telling me about yourself?</p>
            </div>
          </div>

          {/* Candidate Message - Right aligned */}
          <div className="flex items-start gap-2 flex-row-reverse">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=candidate"
              alt="You"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-emerald-500/10 rounded-lg rounded-tr-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">Thank you! I'm a product manager with 6 years of experience in B2B SaaS. I've led cross-functional teams and launched multiple products.</p>
            </div>
          </div>

          {/* AI Message - Left aligned */}
          <div className="flex items-start gap-2">
            <img
              src={aiAvatar}
              alt="Flowy"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-sky-500/10 rounded-lg rounded-tl-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">That's great! Can you walk me through a challenging product decision you had to make?</p>
            </div>
          </div>

          {/* Candidate Message - Right aligned */}
          <div className="flex items-start gap-2 flex-row-reverse">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=candidate"
              alt="You"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-emerald-500/10 rounded-lg rounded-tr-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">Sure! At my previous company, we had to decide between building a new feature or improving our core product...</p>
            </div>
          </div>

          {/* AI Message - Left aligned */}
          <div className="flex items-start gap-2">
            <img
              src={aiAvatar}
              alt="Flowy"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-sky-500/10 rounded-lg rounded-tl-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">How did you approach that decision? What factors did you consider?</p>
            </div>
          </div>

          {/* Candidate Message - Right aligned */}
          <div className="flex items-start gap-2 flex-row-reverse">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=candidate"
              alt="You"
              className="w-6 h-6 rounded-full shrink-0"
            />
            <div className="max-w-[80%] bg-emerald-500/10 rounded-lg rounded-tr-none px-3 py-2">
              <p className="text-muted-2 text-xs leading-relaxed">We analyzed user feedback, looked at retention metrics, and ran customer interviews to understand their pain points...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Controls Bar - Compact and centered */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Mic Button */}
        <button className="relative flex items-center justify-center h-12 w-12 rounded-full border-2 border-sky-500 bg-sky-500/10">
          <Mic size={20} className="text-sky-400" />
        </button>

        {/* Device Selector */}
        <button className="flex items-center gap-2 h-10 px-3 border border-rule-strong rounded-md bg-transparent text-muted-2 text-xs">
          <span>MacBook Pro Mic</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Calibration Button */}
        <button className="h-10 w-10 flex items-center justify-center border border-rule-strong rounded-md hover:bg-ink">
          <Settings className="w-4 h-4 text-muted-2" />
        </button>

        {/* Speech Rate Control - 3 Radio Buttons */}
        <div className="flex items-center gap-0.5 bg-ink rounded-md p-0.5">
          <button className="px-3 py-1.5 rounded text-xs text-muted-2 hover:bg-ink transition-colors">
            Slow
          </button>
          <button className="px-3 py-1.5 rounded text-xs bg-sky-600 text-paper">
            Normal
          </button>
          <button className="px-3 py-1.5 rounded text-xs text-muted-2 hover:bg-ink transition-colors">
            Fast
          </button>
        </div>

        {/* End Call Button */}
        <button className="h-12 w-12 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full">
          <PhoneDisconnectIcon size={20} className="text-paper" />
        </button>
      </div>
    </div>
  );
}
