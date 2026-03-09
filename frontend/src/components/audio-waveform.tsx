"use client";

import { useEffect, useRef, useCallback } from "react";

interface AudioWaveformProps {
  stream: MediaStream | null;
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function AudioWaveform({
  stream,
  isActive,
  barCount = 48,
  className = "",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const gap = 2;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const centerY = height / 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const index = i * step;
        const value = dataArray[index] / 255;
        // Min height so bars are always visible, even when silent
        const barHeight = Math.max(3, value * centerY * 0.9);

        const x = i * (barWidth + gap);

        // Gradient from primary accent to dimmer at edges
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
        const opacity = 0.4 + (1 - distFromCenter) * 0.6;

        // Use CSS variable colors via computed style
        ctx.fillStyle = `rgba(124, 58, 237, ${opacity * (0.3 + value * 0.7)})`;
        ctx.beginPath();
        ctx.roundRect(
          x,
          centerY - barHeight,
          barWidth,
          barHeight * 2,
          barWidth / 2,
        );
        ctx.fill();
      }
    };

    render();
  }, [barCount]);

  useEffect(() => {
    if (!isActive || !stream) {
      // Clean up when stopped
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;

      // Draw idle bars
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, rect.width, rect.height);

          const gap = 2;
          const barWidth = (rect.width - gap * (barCount - 1)) / barCount;
          const centerY = rect.height / 2;

          for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + gap);
            const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
            const opacity = 0.15 + (1 - distFromCenter) * 0.15;
            ctx.fillStyle = `rgba(124, 58, 237, ${opacity})`;
            ctx.beginPath();
            ctx.roundRect(x, centerY - 1.5, barWidth, 3, barWidth / 2);
            ctx.fill();
          }
        }
      }
      return;
    }

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      source.disconnect();
      audioCtx.close();
      sourceRef.current = null;
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isActive, stream, draw, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-12 ${className}`}
      style={{ display: "block" }}
    />
  );
}
