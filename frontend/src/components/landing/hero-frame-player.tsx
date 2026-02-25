"use client";

import { useEffect, useRef } from "react";

const TOTAL_FRAMES = 121;
const FPS = 24;
const FRAME_MS = 1000 / FPS;
const PAUSE_MS = 600;

export default function HeroFramePlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let destroyed = false;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Preload all frames as ImageBitmap (decoded off main thread)
    const loadAll = async (): Promise<ImageBitmap[]> => {
      const promises = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
        const src = `/assets/hero-frames/frame-${String(i + 1).padStart(3, "0")}.jpg`;
        return fetch(src)
          .then((r) => r.blob())
          .then((b) => createImageBitmap(b));
      });
      return Promise.all(promises);
    };

    loadAll().then((bitmaps) => {
      if (destroyed) return;

      let frameIdx = 0;
      let direction = 1;
      let lastTime = 0;
      let pauseUntil = 0;

      const draw = () => {
        const bm = bitmaps[frameIdx];
        if (!bm) return;
        const scale = Math.max(
          canvas.width / bm.width,
          canvas.height / bm.height,
        );
        const w = bm.width * scale;
        const h = bm.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bm, x, y, w, h);
      };

      const tick = (time: number) => {
        rafId = requestAnimationFrame(tick);

        if (time < pauseUntil) {
          draw();
          return;
        }

        if (time - lastTime < FRAME_MS) return;
        lastTime = time;

        draw();
        frameIdx += direction;

        if (frameIdx >= TOTAL_FRAMES) {
          frameIdx = TOTAL_FRAMES - 1;
          direction = -1;
          pauseUntil = time + PAUSE_MS;
        } else if (frameIdx < 0) {
          frameIdx = 0;
          direction = 1;
          pauseUntil = time + PAUSE_MS;
        }
      };

      rafId = requestAnimationFrame(tick);
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.18 }}
    />
  );
}
