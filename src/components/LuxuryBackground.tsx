import { useEffect, useRef } from 'react';

export default function LuxuryBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class description
    class Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      fadeSpeed: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height + height; // Start below or randomly inside
        this.size = Math.random() * 2 + 0.5;
        this.speedY = -(Math.random() * 0.8 + 0.2);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.fadeSpeed = Math.random() * 0.002 + 0.0005;

        // Luxury golden tones
        const goldTones = [
          'rgba(212, 175, 55, ', // #D4AF37
          'rgba(191, 149, 63, ',  // metallic gold
          'rgba(251, 245, 183, ', // bright light gold
          'rgba(170, 119, 28, '   // dark copper gold
        ];
        this.color = goldTones[Math.floor(Math.random() * goldTones.length)];
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.opacity -= this.fadeSpeed;

        if (this.y < 0 || this.opacity <= 0) {
          // Reset at bottom
          this.x = Math.random() * width;
          this.y = height + Math.random() * 20;
          this.opacity = Math.random() * 0.6 + 0.1;
          this.size = Math.random() * 2 + 0.5;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = `${this.color}${this.opacity})`;
        c.shadowColor = '#D4AF37';
        c.shadowBlur = this.size * 2;
        c.fill();
        c.closePath();
      }
    }

    const embers: Ember[] = Array.from({ length: 45 }, () => {
      const ember = new Ember();
      ember.y = Math.random() * height; // Distribute evenly at start
      return ember;
    });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial background simulation for deep space feel
      const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height));
      grad.addColorStop(0, '#111115');
      grad.addColorStop(0.5, '#070709');
      grad.addColorStop(1, '#020203');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      embers.forEach((ember) => {
        ember.update();
        ember.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-20 pointer-events-none"
    />
  );
}
