import { useCallback } from 'react';
import confetti from 'canvas-confetti';

type ConfettiType = 'firstDaily' | 'milestone' | 'simple';

export const useConfetti = () => {
  const fire = useCallback((type: ConfettiType = 'simple') => {
    switch (type) {
      case 'firstDaily':
        // Celebration for first activity of the day
        const duration = 500;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
        break;

      case 'milestone':
        // Big celebration for streak milestones
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ff6b35', '#f7c52d', '#ff9500', '#e63946'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 100,
            angle: 60,
            spread: 80,
            origin: { x: 0, y: 0.65 },
          });
          confetti({
            particleCount: 100,
            angle: 120,
            spread: 80,
            origin: { x: 1, y: 0.65 },
          });
        }, 250);
        break;

      case 'simple':
      default:
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
        });
        break;
    }
  }, []);

  return { fire };
};
