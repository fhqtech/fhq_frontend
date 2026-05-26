import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ConversationState } from '@/types/interview';

type ConversationMode = 'idle' | 'calibrating' | 'listening' | 'thinking' | 'speaking';

// Map ConversationState enum to internal mode
const stateToMode = (state: ConversationState): ConversationMode => {
  switch (state) {
    case ConversationState.IDLE:
      return 'idle';
    case ConversationState.CALIBRATING:
      return 'calibrating';
    case ConversationState.LISTENING:
      return 'listening';
    case ConversationState.THINKING:
      return 'thinking';
    case ConversationState.SPEAKING:
      return 'speaking';
    default:
      return 'idle';
  }
};

// Animated Particle Sphere Component with different modes
function ParticleSphereInner({
  count = 12000,
  radius = 2.2,
  mode = 'idle' as ConversationMode,
  audioLevel = 0
}: {
  count?: number;
  radius?: number;
  mode?: ConversationMode;
  audioLevel?: number;
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
    // Smoothed audio level for reactive animations
    smoothedAudioLevel: 0,
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
        // LISTENING: Audio-reactive contraction with subtle base breathing
        const smoothedLevel = anim.smoothedAudioLevel;

        // Base gentle breathing even when silent (so user knows it's listening)
        const baseBreathe = Math.sin(time * 1.5) * 0.08; // Subtle slow pulse

        // Audio-reactive contraction when speaking
        const contractStrength = 0.4;
        const particleVariation = 0.6 + particleSeeds[i] * 0.8;
        const audioContract = smoothedLevel * contractStrength * particleVariation;

        // Add subtle wave effect based on distance from center
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz) / radius;
        const waveOffset = Math.sin(time * 3 + dist * Math.PI * 2) * 0.02 * (smoothedLevel + 0.3);

        // Combine: base breathing + audio contraction + wave
        const scale = 1 + baseBreathe - audioContract + waveOffset;

        return [ox * scale, oy * scale, oz * scale];
      }

      case 'thinking': {
        // THINKING: Fast spinning - particles at rest, rotation handled separately
        return [ox, oy, oz];
      }

      case 'speaking': {
        // SPEAKING: Audio-reactive outward pulses based on TTS output
        const smoothedLevel = anim.smoothedAudioLevel;

        // Expand outward proportional to audio level
        const expansionStrength = 0.5; // Max expansion at full audio
        const baseExpansion = smoothedLevel * expansionStrength;

        // Add per-particle variation for organic look
        const variation = 0.6 + particleSeeds[i] * 0.8;
        const particleExpansion = baseExpansion * variation;

        // Add wave ripple effect from center outward
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz) / radius;
        const waveSpeed = 6;
        const waveDelay = dist * 1.5;
        const ripple = Math.sin(time * waveSpeed - waveDelay) * 0.1 * smoothedLevel;

        // Add subtle high-frequency jitter when speaking loudly
        const jitter = smoothedLevel > 0.3
          ? (Math.sin(time * 15 + particleSeeds[i] * 10) * 0.02 * smoothedLevel)
          : 0;

        const scale = 1 + particleExpansion + ripple + jitter;
        return [ox * scale, oy * scale, oz * scale];
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

    // Smooth the audio level for organic animation (prevents jittery movement)
    // Use different smoothing speeds for attack (audio rising) vs release (audio falling)
    const targetLevel = audioLevel;
    const currentSmoothed = anim.smoothedAudioLevel;
    const attackSpeed = 12; // Fast response to audio onset
    const releaseSpeed = 4;  // Slower decay for smooth release
    const smoothingSpeed = targetLevel > currentSmoothed ? attackSpeed : releaseSpeed;
    anim.smoothedAudioLevel = currentSmoothed + (targetLevel - currentSmoothed) * Math.min(1, smoothingSpeed * delta);

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

    // Smooth rotation transitions - now audio-reactive for listening/speaking
    let targetRotationSpeedY = 0.05;
    let wobbleX = 0;
    const smoothedLevel = anim.smoothedAudioLevel;

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
        // LISTENING: Base rotation + increases with audio level
        targetRotationSpeedY = 0.25 + smoothedLevel * 0.5; // Higher base rotation
        // Subtle wobble even without audio, more with audio
        wobbleX = Math.sin(time * 1.5) * 0.03 + smoothedLevel * Math.sin(time * 2) * 0.08;
        break;
      case 'thinking':
        // THINKING: Fast spinning like original calibrating
        targetRotationSpeedY = 2.5;
        wobbleX = Math.sin(time * 0.5) * 0.15;
        break;
      case 'speaking':
        // SPEAKING: Audio-reactive rotation with pulsing
        targetRotationSpeedY = 0.2 + smoothedLevel * 0.3;
        // Add dynamic wobble based on audio
        wobbleX = smoothedLevel * Math.sin(time * 3) * 0.08;
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

interface ParticleSphereProps {
  conversationState: ConversationState;
  audioLevel?: number; // 0-1, audio level for reactive animations
  className?: string;
}

export function ParticleSphere({ conversationState, audioLevel = 0, className = '' }: ParticleSphereProps) {
  const mode = stateToMode(conversationState);

  // Log state changes for debugging
  useEffect(() => {
    console.log('[ParticleSphere] State/Mode changed:', {
      conversationState: ConversationState[conversationState],
      mode,
      audioLevel: audioLevel.toFixed(3)
    });
  }, [conversationState, mode]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        {/* R11.2a: was '#000000'. Read --ink at runtime via computed style so
            the Three.js scene matches the design-system ink token rather than
            hard-coding pure black. Fallback to a near-black if the var is
            missing (SSR / very old browser). */}
        <color attach="background" args={[(typeof window !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()) || '#0a0a0a']} />
        <ParticleSphereInner count={12000} radius={2.2} mode={mode} audioLevel={audioLevel} />
      </Canvas>
    </div>
  );
}

export default ParticleSphere;
