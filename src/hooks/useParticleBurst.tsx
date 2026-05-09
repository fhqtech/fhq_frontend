import { useCallback } from 'react';

interface ParticleConfig {
  count?: number;
  colors?: string[];
  duration?: number;
}

export const useParticleBurst = () => {
  const createParticleBurst = useCallback((element: HTMLElement, config: ParticleConfig = {}) => {
    const {
      count = 50,
      colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      duration = 1000
    } = config;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    // Create particles
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 6 + 3;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const velocity = Math.random() * 300 + 200;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.style.position = 'absolute';
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
      particle.style.pointerEvents = 'none';

      container.appendChild(particle);

      const endX = centerX + Math.cos(angle) * velocity;
      const endY = centerY + Math.sin(angle) * velocity;

      particle.animate([
        {
          transform: 'translate(0, 0) scale(1) rotate(0deg)',
          opacity: 1
        },
        {
          transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0
        }
      ], {
        duration: duration + Math.random() * 300,
        easing: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
        fill: 'forwards'
      });
    }

    // Clean up after animation
    setTimeout(() => {
      document.body.removeChild(container);
    }, duration + 500);
  }, []);

  return { createParticleBurst };
};
