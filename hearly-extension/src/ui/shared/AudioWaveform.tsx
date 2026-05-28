import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

export function AudioWaveform({ analyser, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw flat line when inactive
      ctx.beginPath();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    if (!analyser) {
      const barCount = 28;
      const barWidth = 4;
      const gap = (canvas.width - barCount * barWidth) / (barCount - 1);

      const drawFallback = (time = 0) => {
        rafRef.current = requestAnimationFrame(drawFallback);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#B5F03D';

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time / 180 + i * 0.55);
          const height = 8 + Math.abs(wave) * 24;
          const x = i * (barWidth + gap);
          const y = (canvas.height - height) / 2;
          ctx.globalAlpha = 0.35 + Math.abs(wave) * 0.55;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, height, barWidth / 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      };

      drawFallback();
      return () => cancelAnimationFrame(rafRef.current);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = '#B5F03D';
      ctx.lineWidth = 1.5;
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={40}
      style={{ width: '100%', height: '40px' }}
    />
  );
}
