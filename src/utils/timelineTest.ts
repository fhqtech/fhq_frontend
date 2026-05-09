/**
 * Simple test utility for timeline system
 * This file can be removed after testing
 */

import { TimelineManager } from './timelineManager';

export function testTimelineSystem() {
  console.log('=== Testing Timeline System ===');

  // Initialize timeline manager
  const timeline = new TimelineManager('test-session-123');

  // Simulate AI speaking
  console.log('1. AI starts speaking...');
  timeline.addEvent('AI_SPEECH_START', 1.0, {
    aiMessage: 'Hello, tell me about your background.'
  });

  // Simulate user interrupting AI
  setTimeout(() => {
    console.log('2. User interrupts AI...');
    timeline.addEvent('AI_INTERRUPTED', 1.0, {
      interruptedBy: 'USER_SPEECH_START'
    });

    timeline.addEvent('USER_SPEECH_START', 0.9);

    // Simulate STT returning result (delayed)
    setTimeout(() => {
      console.log('3. STT returns user speech...');
      timeline.addSTTSynchronization(
        'I have 5 years of React experience',
        Date.now(),
        0.95
      );

      timeline.addEvent('USER_SPEECH_END', 0.9);

      // AI responds
      setTimeout(() => {
        console.log('4. AI responds...');
        timeline.addEvent('AI_SPEECH_START', 1.0, {
          aiMessage: 'That\'s great! Can you tell me more about your React projects?'
        });

        setTimeout(() => {
          timeline.addEvent('AI_SPEECH_END', 1.0);

          // Show final results
          setTimeout(() => {
            console.log('5. Final timeline data:');
            const timelineData = timeline.getTimelineForStorage();
            console.log(JSON.stringify(timelineData, null, 2));
            console.log('=== Test Complete ===');
          }, 100);
        }, 1000);
      }, 500);
    }, 2000); // Simulate 2 second STT delay
  }, 1000);
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).testTimelineSystem = testTimelineSystem;
}