import type { VoiceAgentStatus } from "@/hooks/useVoiceAgent";
import { useEffect, useRef } from "react";

interface VoiceOrbProps {
  status: VoiceAgentStatus;
}

/**
 * Animated orb using canvas + CSS.
 * - Idle / disconnected: dim, static
 * - Connecting: slow pulse
 * - Listening: animated rings radiating outward
 * - Thinking: rotating gradient arc
 * - Speaking: fast multi-ring pulse
 * - Error: red pulse
 */
export function VoiceOrb({ status }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 140;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const BASE_R = 38;

    function draw() {
      if (!ctx || !canvas) return;
      tRef.current += 0.02;
      const t = tRef.current;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Status-specific rendering ──────────────────────────────────────────
      if (status === "idle" || status === "disconnected") {
        // Static dim orb
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R);
        grd.addColorStop(0, "rgba(139,92,246,0.18)");
        grd.addColorStop(1, "rgba(99,102,241,0.06)");
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(139,92,246,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (status === "connecting") {
        // Slow gentle pulse
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
        const r = BASE_R + pulse * 4;
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, r);
        grd.addColorStop(0, `rgba(139,92,246,${0.3 + pulse * 0.15})`);
        grd.addColorStop(1, "rgba(99,102,241,0.0)");
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      } else if (status === "listening") {
        // Radiating rings
        const numRings = 3;
        for (let i = 0; i < numRings; i++) {
          const phase = ((t * 0.6 + i / numRings) % 1);
          const ringR = BASE_R + phase * 30;
          const alpha = (1 - phase) * 0.35;
          ctx.beginPath();
          ctx.arc(CX, CY, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Core orb
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R);
        grd.addColorStop(0, "rgba(167,139,250,0.75)");
        grd.addColorStop(0.6, "rgba(139,92,246,0.5)");
        grd.addColorStop(1, "rgba(99,102,241,0.1)");
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      } else if (status === "thinking") {
        // Rotating arc
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R);
        grd.addColorStop(0, "rgba(167,139,250,0.45)");
        grd.addColorStop(1, "rgba(99,102,241,0.05)");
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Rotating bright arc
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(t * 2.5);
        ctx.translate(-CX, -CY);
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 1.3);
        ctx.strokeStyle = "rgba(167,139,250,0.9)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      } else if (status === "speaking") {
        // Fast multi-ring burst
        const numRings = 4;
        for (let i = 0; i < numRings; i++) {
          const phase = ((t * 1.4 + i / numRings) % 1);
          const ringR = BASE_R + phase * 38;
          const alpha = (1 - phase) * 0.45;
          ctx.beginPath();
          ctx.arc(CX, CY, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        const pulse = 0.5 + 0.5 * Math.sin(t * 8);
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R);
        grd.addColorStop(0, `rgba(196,181,253,${0.7 + pulse * 0.25})`);
        grd.addColorStop(0.5, "rgba(139,92,246,0.6)");
        grd.addColorStop(1, "rgba(99,102,241,0.05)");
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      } else if (status === "error") {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R);
        grd.addColorStop(0, `rgba(239,68,68,${0.35 + pulse * 0.2})`);
        grd.addColorStop(1, "rgba(220,38,38,0.05)");
        ctx.beginPath();
        ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // ── Mic icon in center ───────────────────────────────────────────────
      const iconAlpha =
        status === "idle" || status === "disconnected" ? 0.2 : 0.8;
      ctx.save();
      ctx.translate(CX - 8, CY - 12);
      ctx.fillStyle = `rgba(255,255,255,${iconAlpha})`;
      // Body
      ctx.beginPath();
      ctx.roundRect(4, 0, 8, 14, 4);
      ctx.fill();
      // Stand arc
      ctx.beginPath();
      ctx.arc(8, 14, 8, Math.PI, 0);
      ctx.strokeStyle = `rgba(255,255,255,${iconAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Stem
      ctx.beginPath();
      ctx.moveTo(8, 22);
      ctx.lineTo(8, 26);
      ctx.stroke();
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  return (
    <canvas
      ref={canvasRef}
      className="select-none"
      style={{ width: 140, height: 140 }}
      aria-label={`Voice agent orb — ${status}`}
    />
  );
}
