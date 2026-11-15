import React, { useEffect, useRef } from 'react';

export type BackgroundMode = 'hyper4d' | 'orbit3d' | 'flow2d' | 'minimal';

interface LiveAmbientBackgroundProps {
  mode: BackgroundMode;
}

interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Projected2D {
  x: number;
  y: number;
  depth: number;
  wCoord: number;
}

interface StarParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  hue: 'emerald' | 'sky' | 'amber' | 'indigo';
  alpha: number;
}

interface ArcRoute {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
  speed: number;
  phase: number;
  hue: 'emerald' | 'sky' | 'amber';
}

// Precomputed 16 vertices & 32 edges of a 4D Tesseract (Hypercube)
const TESSERACT_VERTICES: Vec4[] = (() => {
  const verts: Vec4[] = [];
  for (let i = 0; i < 16; i += 1) {
    verts.push({
      x: i & 1 ? 1 : -1,
      y: i & 2 ? 1 : -1,
      z: i & 4 ? 1 : -1,
      w: i & 8 ? 1 : -1,
    });
  }
  return verts;
})();

const TESSERACT_EDGES: Array<[number, number]> = (() => {
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 16; i += 1) {
    for (let j = i + 1; j < 16; j += 1) {
      const diff = i ^ j;
      if (diff !== 0 && (diff & (diff - 1)) === 0) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
})();

const COLOR_RGB: Record<'emerald' | 'sky' | 'amber' | 'indigo', string> = {
  emerald: '16, 185, 129',
  sky: '56, 189, 248',
  amber: '251, 191, 36',
  indigo: '129, 140, 248',
};

const ORBIT_ROUTES: ArcRoute[] = [
  { lat1: 0.45, lon1: 0.2, lat2: 0.9, lon2: 1.5, speed: 0.28, phase: 0.0, hue: 'emerald' },
  { lat1: -0.3, lon1: 1.1, lat2: 0.6, lon2: 2.8, speed: 0.22, phase: 0.35, hue: 'sky' },
  { lat1: 0.75, lon1: 2.3, lat2: -0.45, lon2: 4.1, speed: 0.25, phase: 0.65, hue: 'amber' },
  { lat1: -0.6, lon1: 3.4, lat2: 0.35, lon2: 5.2, speed: 0.3, phase: 0.18, hue: 'emerald' },
  { lat1: 0.15, lon1: 4.6, lat2: 0.8, lon2: 0.4, speed: 0.24, phase: 0.8, hue: 'sky' },
];

export function LiveAmbientBackground({ mode }: LiveAmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const effectiveMode: BackgroundMode =
      prefersReducedMotion && mode !== 'minimal' ? 'minimal' : mode;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Pointer parallax state (exponentially damped in render loop)
    const pointerTarget = { x: 0, y: 0 };
    const pointerSmooth = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      if (width <= 0 || height <= 0) return;
      pointerTarget.x = (e.clientX / width - 0.5) * 2;
      pointerTarget.y = (e.clientY / height - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', resize);

    // Pre-allocate particles for all dynamic modes
    const hues: Array<StarParticle['hue']> = ['emerald', 'sky', 'indigo', 'amber'];
    const particleCount = width < 768 ? 34 : 58;
    const particles: StarParticle[] = Array.from({ length: particleCount }, (_, idx) => ({
      x: Math.random() * Math.max(1200, width),
      y: Math.random() * Math.max(800, height),
      z: 0.35 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 14,
      size: 1.1 + Math.random() * 1.9,
      hue: hues[idx % hues.length],
      alpha: 0.16 + Math.random() * 0.34,
    }));

    // Pre-allocate projected tesseract buffer
    const projectedTesseract: Projected2D[] = Array.from({ length: 16 }, () => ({
      x: 0,
      y: 0,
      depth: 0,
      wCoord: 0,
    }));

    // Helper: draw ambient soft radial nebula glows (common base depth)
    const drawAmbientGlows = (t: number, px: number, py: number) => {
      const gx1 = width * 0.18 + Math.sin(t * 0.18) * 35 + px * 18;
      const gy1 = height * 0.18 + Math.cos(t * 0.14) * 25 + py * 14;
      const rad1 = Math.max(width, height) * 0.42;
      const grad1 = ctx.createRadialGradient(gx1, gy1, 0, gx1, gy1, rad1);
      grad1.addColorStop(0, 'rgba(16, 185, 129, 0.13)');
      grad1.addColorStop(0.55, 'rgba(16, 185, 129, 0.04)');
      grad1.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const gx2 = width * 0.84 + Math.cos(t * 0.15) * 40 - px * 22;
      const gy2 = height * 0.32 + Math.sin(t * 0.19) * 30 - py * 16;
      const rad2 = Math.max(width, height) * 0.44;
      const grad2 = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, rad2);
      grad2.addColorStop(0, 'rgba(14, 165, 233, 0.13)');
      grad2.addColorStop(0.55, 'rgba(99, 102, 241, 0.04)');
      grad2.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      const gx3 = width * 0.48 + Math.sin(t * 0.11 + 1.2) * 30;
      const gy3 = height * 0.86 + Math.cos(t * 0.12) * 20;
      const rad3 = Math.max(width, height) * 0.38;
      const grad3 = ctx.createRadialGradient(gx3, gy3, 0, gx3, gy3, rad3);
      grad3.addColorStop(0, 'rgba(245, 158, 11, 0.07)');
      grad3.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);
    };

    // Mode 1: 4D HyperSpace (4D Tesseract Rotation + 3D Perspective Wave Terrain + Depth Particles)
    const drawHyper4D = (t: number, dt: number, px: number, py: number) => {
      // 1) Lower 3D Perspective Wave Terrain Grid
      const cols = width < 768 ? 16 : 26;
      const rows = width < 768 ? 12 : 16;
      const horizonY = height * 0.44 + py * 14;
      const fov = Math.min(width, height) * 0.82;
      const gridPointsX = new Float32Array(cols * rows);
      const gridPointsY = new Float32Array(cols * rows);

      for (let r = 0; r < rows; r += 1) {
        const zNorm = r / (rows - 1); // 0 = near bottom, 1 = far horizon
        const zWorld = 1.6 + zNorm * 9.5;
        for (let c = 0; c < cols; c += 1) {
          const xNorm = c / (cols - 1) - 0.5;
          const xWorld = xNorm * 16 + px * 0.65;
          const wave =
            Math.sin(xWorld * 0.55 + t * 0.85) * 0.42 +
            Math.cos(zWorld * 0.72 - t * 0.68) * 0.36 +
            Math.sin((xWorld + zWorld) * 0.4 + t * 0.45) * 0.22;
          const yWorld = 2.45 + wave;

          const idx = r * cols + c;
          gridPointsX[idx] = width * 0.5 + (xWorld / zWorld) * fov;
          gridPointsY[idx] = horizonY + (yWorld / zWorld) * fov;
        }
      }

      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r += 1) {
        const depthFade = Math.max(0.02, 1 - r / rows) * 0.22;
        ctx.strokeStyle =
          r % 3 === 0
            ? `rgba(16, 185, 129, ${depthFade.toFixed(3)})`
            : `rgba(56, 189, 248, ${(depthFade * 0.78).toFixed(3)})`;
        ctx.beginPath();
        for (let c = 0; c < cols; c += 1) {
          const idx = r * cols + c;
          if (c === 0) ctx.moveTo(gridPointsX[idx], gridPointsY[idx]);
          else ctx.lineTo(gridPointsX[idx], gridPointsY[idx]);
        }
        ctx.stroke();
      }

      for (let c = 0; c < cols; c += 1) {
        ctx.strokeStyle =
          c % 4 === 0 ? 'rgba(16, 185, 129, 0.11)' : 'rgba(148, 163, 184, 0.07)';
        ctx.beginPath();
        for (let r = 0; r < rows; r += 1) {
          const idx = r * cols + c;
          if (r === 0) ctx.moveTo(gridPointsX[idx], gridPointsY[idx]);
          else ctx.lineTo(gridPointsX[idx], gridPointsY[idx]);
        }
        ctx.stroke();
      }

      // Highlight gentle horizon intersection nodes
      for (let r = 1; r < rows - 2; r += 2) {
        const alpha = (1 - r / rows) * 0.34;
        for (let c = 2; c < cols - 2; c += 3) {
          const idx = r * cols + c;
          ctx.fillStyle = (c + r) % 2 === 0 ? `rgba(52, 211, 153, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
          ctx.beginPath();
          ctx.arc(gridPointsX[idx], gridPointsY[idx], 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2) True 4D Rotating Tesseract (XW, YW, XZ hyper-rotations -> 3D -> 2D)
      const angleXW = t * 0.34 + px * 0.25;
      const angleYW = t * 0.24 + py * 0.22;
      const angleXZ = t * 0.29;
      const cosXW = Math.cos(angleXW);
      const sinXW = Math.sin(angleXW);
      const cosYW = Math.cos(angleYW);
      const sinYW = Math.sin(angleYW);
      const cosXZ = Math.cos(angleXZ);
      const sinXZ = Math.sin(angleXZ);

      const tesseractCenterX = width < 768 ? width * 0.78 : width * 0.83 + px * 16;
      const tesseractCenterY = width < 768 ? height * 0.24 : height * 0.30 + py * 14;
      const tesseractScale = Math.min(width, height) * (width < 768 ? 0.19 : 0.24);

      for (let i = 0; i < 16; i += 1) {
        const v = TESSERACT_VERTICES[i];

        // 4D Rotation XW
        const x1 = v.x * cosXW - v.w * sinXW;
        const w1 = v.x * sinXW + v.w * cosXW;

        // 4D Rotation YW
        const y2 = v.y * cosYW - w1 * sinYW;
        const w2 = v.y * sinYW + w1 * cosYW;

        // 3D Rotation XZ
        const x3 = x1 * cosXZ - v.z * sinXZ;
        const z3 = x1 * sinXZ + v.z * cosXZ;

        // 4D -> 3D stereographic perspective
        const wDist = 2.85 - w2;
        const factor4D = 1.65 / Math.max(0.8, wDist);
        const px3 = x3 * factor4D;
        const py3 = y2 * factor4D;
        const pz3 = z3 * factor4D;

        // 3D -> 2D perspective
        const zDist = 3.8 - pz3;
        const factor3D = 2.15 / Math.max(1.0, zDist);

        projectedTesseract[i].x = tesseractCenterX + px3 * factor3D * tesseractScale;
        projectedTesseract[i].y = tesseractCenterY + py3 * factor3D * tesseractScale;
        projectedTesseract[i].depth = factor3D * factor4D;
        projectedTesseract[i].wCoord = w2;
      }

      // Draw 32 tesseract edges with smooth depth color shifting between emerald & sky
      for (let e = 0; e < TESSERACT_EDGES.length; e += 1) {
        const [aIdx, bIdx] = TESSERACT_EDGES[e];
        const a = projectedTesseract[aIdx];
        const b = projectedTesseract[bIdx];
        const avgW = (a.wCoord + b.wCoord) * 0.5;
        const edgeAlpha = Math.max(0.08, Math.min(0.32, 0.17 + avgW * 0.08));
        ctx.strokeStyle =
          avgW >= 0
            ? `rgba(16, 185, 129, ${edgeAlpha.toFixed(3)})`
            : `rgba(56, 189, 248, ${edgeAlpha.toFixed(3)})`;
        ctx.lineWidth = avgW >= 0 ? 1.25 : 0.95;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Draw tesseract vertices
      for (let i = 0; i < 16; i += 1) {
        const p = projectedTesseract[i];
        const radius = Math.max(1.4, Math.min(3.1, p.depth * 1.6));
        const alpha = Math.max(0.18, Math.min(0.55, 0.34 + p.wCoord * 0.14));
        ctx.fillStyle = p.wCoord >= 0 ? `rgba(52, 211, 153, ${alpha})` : `rgba(125, 211, 252, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3) Subtle Parallax Ambient Particles
      for (let i = 0; i < particles.length; i += 1) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.x < -30) pt.x = width + 30;
        if (pt.x > width + 30) pt.x = -30;
        if (pt.y < -30) pt.y = height + 30;
        if (pt.y > height + 30) pt.y = -30;

        const drawX = pt.x + px * 26 * pt.z;
        const drawY = pt.y + py * 20 * pt.z;
        ctx.fillStyle = `rgba(${COLOR_RGB[pt.hue]}, ${pt.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, pt.size * pt.z, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Mode 2: 3D Courier Orbit Sphere & Animated Delivery Route Arcs
    const drawOrbit3D = (t: number, dt: number, px: number, py: number) => {
      const cx = width < 768 ? width * 0.72 : width * 0.78 + px * 22;
      const cy = width < 768 ? height * 0.36 : height * 0.44 + py * 18;
      const radius = Math.min(width, height) * (width < 768 ? 0.34 : 0.38);
      const rotY = t * 0.18 + px * 0.35;
      const tiltX = 0.36 + py * 0.2;
      const cosTilt = Math.cos(tiltX);
      const sinTilt = Math.sin(tiltX);

      const projectSphere = (lat: number, lon: number, rScale = 1) => {
        const phi = lat;
        const theta = lon + rotY;
        const x0 = Math.cos(phi) * Math.cos(theta);
        const y0 = Math.sin(phi);
        const z0 = Math.cos(phi) * Math.sin(theta);

        const y1 = y0 * cosTilt - z0 * sinTilt;
        const z1 = y0 * sinTilt + z0 * cosTilt;
        const persp = 2.6 / Math.max(0.9, 2.6 - z1);
        return {
          x: cx + x0 * radius * rScale * persp,
          y: cy - y1 * radius * rScale * persp,
          z: z1,
        };
      };

      // Latitude rings
      ctx.lineWidth = 1;
      for (let latIdx = -3; latIdx <= 3; latIdx += 1) {
        const lat = (latIdx / 4) * (Math.PI / 2);
        ctx.strokeStyle = latIdx === 0 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.11)';
        ctx.beginPath();
        for (let step = 0; step <= 48; step += 1) {
          const lon = (step / 48) * Math.PI * 2;
          const p = projectSphere(lat, lon);
          if (step === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Longitude meridians
      for (let lonIdx = 0; lonIdx < 8; lonIdx += 1) {
        const lon = (lonIdx / 8) * Math.PI * 2;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
        ctx.beginPath();
        for (let step = 0; step <= 36; step += 1) {
          const lat = -Math.PI / 2 + (step / 36) * Math.PI;
          const p = projectSphere(lat, lon);
          if (step === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Animated high-altitude courier routes over globe
      for (const route of ORBIT_ROUTES) {
        const p1 = projectSphere(route.lat1, route.lon1, 1);
        const p2 = projectSphere(route.lat2, route.lon2, 1);
        const midLat = (route.lat1 + route.lat2) * 0.5;
        const midLon = (route.lon1 + route.lon2) * 0.5;
        const ctrl = projectSphere(midLat, midLon, 1.38);

        const visibility = Math.max(0.08, Math.min(0.42, 0.24 + ((p1.z + p2.z) * 0.5) * 0.18));
        ctx.strokeStyle = `rgba(${COLOR_RGB[route.hue]}, ${visibility.toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(ctrl.x, ctrl.y, p2.x, p2.y);
        ctx.stroke();

        // Moving packet light along bezier curve
        const u = (t * route.speed + route.phase) % 1;
        const oneMinusU = 1 - u;
        const pulseX =
          oneMinusU * oneMinusU * p1.x + 2 * oneMinusU * u * ctrl.x + u * u * p2.x;
        const pulseY =
          oneMinusU * oneMinusU * p1.y + 2 * oneMinusU * u * ctrl.y + u * u * p2.y;
        ctx.fillStyle = `rgba(${COLOR_RGB[route.hue]}, 0.72)`;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft starfield drift
      for (let i = 0; i < particles.length; i += 1) {
        const pt = particles[i];
        pt.x += pt.vx * 0.5 * dt;
        pt.y += pt.vy * 0.5 * dt;
        if (pt.x < -20) pt.x = width + 20;
        if (pt.x > width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = height + 20;
        if (pt.y > height + 20) pt.y = -20;
        ctx.fillStyle = `rgba(${COLOR_RGB[pt.hue]}, ${(pt.alpha * 0.75).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pt.x + px * 16 * pt.z, pt.y + py * 12 * pt.z, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Mode 3: 2D Live Mesh Constellation (Clean Floating Filaments + Interactive Cursor Nodes)
    const drawFlow2D = (dt: number, px: number, py: number) => {
      const linkDist = width < 768 ? 115 : 155;
      const linkDistSq = linkDist * linkDist;

      for (let i = 0; i < particles.length; i += 1) {
        const pt = particles[i];
        pt.x += pt.vx * 1.25 * dt;
        pt.y += pt.vy * 1.25 * dt;
        if (pt.x < -30) pt.x = width + 30;
        if (pt.x > width + 30) pt.x = -30;
        if (pt.y < -30) pt.y = height + 30;
        if (pt.y > height + 30) pt.y = -30;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        const ax = a.x + px * 18 * a.z;
        const ay = a.y + py * 14 * a.z;

        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const bx = b.x + px * 18 * b.z;
          const by = b.y + py * 14 * b.z;
          const dx = ax - bx;
          const dy = ay - by;
          const distSq = dx * dx + dy * dy;
          if (distSq < linkDistSq) {
            const strength = (1 - Math.sqrt(distSq) / linkDist) * 0.22;
            ctx.strokeStyle = `rgba(${COLOR_RGB[a.hue]}, ${strength.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${COLOR_RGB[a.hue]}, ${(a.alpha * 1.15).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(ax, ay, a.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const renderFrame = (timeMs: number, dt: number) => {
      const t = timeMs * 0.001;
      const damp = 1 - Math.exp(-4.5 * dt);
      pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * damp;
      pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * damp;

      ctx.clearRect(0, 0, width, height);
      drawAmbientGlows(t, pointerSmooth.x, pointerSmooth.y);

      if (effectiveMode === 'hyper4d') {
        drawHyper4D(t, dt, pointerSmooth.x, pointerSmooth.y);
      } else if (effectiveMode === 'orbit3d') {
        drawOrbit3D(t, dt, pointerSmooth.x, pointerSmooth.y);
      } else if (effectiveMode === 'flow2d') {
        drawFlow2D(dt, pointerSmooth.x, pointerSmooth.y);
      }
    };

    if (effectiveMode === 'minimal') {
      renderFrame(0, 0.016);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('resize', resize);
      };
    }

    let rafId = 0;
    let prevTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) * 0.001));
      prevTime = now;
      if (!document.hidden) {
        renderFrame(now, dt);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050912]"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Measured Readability Scrim: keeps all dashboard cards, tables & text crisp */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(5,9,18,0.18)_0%,rgba(5,9,18,0.48)_62%,rgba(5,9,18,0.82)_100%)]" />
    </div>
  );
}
