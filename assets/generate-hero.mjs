// Generates assets/hero-dark.svg and assets/hero-light.svg.
// Run with: node assets/generate-hero.mjs
import { writeFileSync } from 'node:fs';

const W = 1000;
const H = 340;

// Torus mesh. It spins around its own axis, so one mesh cell of rotation loops seamlessly.
const MAJOR_SEGMENTS = 36;
const MINOR_SEGMENTS = 14;
const MAJOR_RADIUS = 1;
const MINOR_RADIUS = 0.42;
const FRAMES = 8;
const FRAME_MS = 50;

const CENTER = [770, 170];
const SCALE = 118;
const TILT_X = 1.05;
const TILT_Z = -0.32;

const THEMES = {
  dark: { bg: '#0b0d10', grid: '#ffffff', gridAlpha: 0.05, ink: '#f4f1ea', muted: '#9aa3ad', accent: '#f2a14f', wire: '#c9d1d9', wireAlpha: 0.62, backAlpha: 0.08 },
  light: { bg: '#f7f4ee', grid: '#1b1f24', gridAlpha: 0.07, ink: '#1b1f24', muted: '#5c6670', accent: '#c4640f', wire: '#39424c', wireAlpha: 0.6, backAlpha: 0.09 },
};

const round = (n) => Math.round(n * 10) / 10;

function rotate([x, y, z]) {
  const y1 = y * Math.cos(TILT_X) - z * Math.sin(TILT_X);
  const z1 = y * Math.sin(TILT_X) + z * Math.cos(TILT_X);
  const x2 = x * Math.cos(TILT_Z) - y1 * Math.sin(TILT_Z);
  const y2 = x * Math.sin(TILT_Z) + y1 * Math.cos(TILT_Z);
  return [x2, y2, z1];
}

function surface(u, v) {
  const ring = MAJOR_RADIUS + MINOR_RADIUS * Math.cos(v);
  return {
    point: rotate([ring * Math.cos(u), ring * Math.sin(u), MINOR_RADIUS * Math.sin(v)]),
    normal: rotate([Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)]),
  };
}

const project = ([x, y]) => `${round(CENTER[0] + x * SCALE)} ${round(CENTER[1] + y * SCALE)}`;

function frame(index) {
  const offset = ((index / FRAMES) * 2 * Math.PI) / MAJOR_SEGMENTS;
  const paths = { front: '', back: '', equator: '' };

  const addEdge = (u0, v0, u1, v1, bucketForFront) => {
    const a = surface(u0, v0);
    const b = surface(u1, v1);
    const facing = a.normal[2] + b.normal[2] > 0;
    paths[facing ? bucketForFront : 'back'] += `M${project(a.point)}L${project(b.point)}`;
  };

  for (let i = 0; i < MAJOR_SEGMENTS; i++) {
    const u0 = (i / MAJOR_SEGMENTS) * 2 * Math.PI + offset;
    const u1 = ((i + 1) / MAJOR_SEGMENTS) * 2 * Math.PI + offset;
    for (let j = 0; j < MINOR_SEGMENTS; j++) {
      const v0 = (j / MINOR_SEGMENTS) * 2 * Math.PI;
      const v1 = ((j + 1) / MINOR_SEGMENTS) * 2 * Math.PI;
      addEdge(u0, v0, u1, v0, j === 0 ? 'equator' : 'front');
      addEdge(u0, v0, u0, v1, 'front');
    }
  }
  return paths;
}

function hero(theme) {
  const t = THEMES[theme];
  const frames = Array.from({ length: FRAMES }, (_, i) => frame(i));
  const duration = FRAMES * FRAME_MS;
  const delays = frames
    .map((_, i) => `.f${i}{animation-delay:${-i * FRAME_MS}ms}`)
    .join('');
  const groups = frames
    .map(
      (p, i) =>
        `<g class="f f${i}"><path class="back" d="${p.back}"/><path class="front" d="${p.front}"/><path class="equator" d="${p.equator}"/></g>`,
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ash Zhang, real-time 3D for the web">
<style>
.f{opacity:0;animation:flip ${duration}ms steps(1) infinite}
.f0{opacity:1}
${delays}
@keyframes flip{0%{opacity:1}${round(100 / FRAMES)}%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.f{animation:none}}
path{fill:none;stroke-linecap:round}
.front{stroke:${t.wire};stroke-opacity:${t.wireAlpha};stroke-width:1}
.back{stroke:${t.wire};stroke-opacity:${t.backAlpha};stroke-width:1}
.equator{stroke:${t.accent};stroke-width:2.2}
text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.mono{font-family:ui-monospace,SFMono-Regular,Consolas,Menlo,monospace;letter-spacing:.14em}
</style>
<defs>
<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="${t.grid}" fill-opacity="${t.gridAlpha}"/></pattern>
<clipPath id="panel"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<g clip-path="url(#panel)">
<rect width="${W}" height="${H}" fill="${t.bg}"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
${groups}
<rect x="56" y="98" width="30" height="3" fill="${t.accent}"/>
<text x="98" y="105" class="mono" font-size="17" fill="${t.accent}">REAL-TIME 3D</text>
<text x="54" y="182" font-size="76" font-weight="700" fill="${t.ink}">Ash Zhang</text>
<text x="56" y="228" font-size="29" fill="${t.ink}">I build real-time 3D for the web.</text>
<text x="56" y="266" class="mono" font-size="16" fill="${t.muted}">BABYLON.JS / THREE.JS / CESIUM / GLSL</text>
</g>
</svg>
`;
}

// Illustration for the AR glasses project: screens floating above a wireframe floor.
function spatial(theme) {
  const t = THEMES[theme];
  const width = 960;
  const height = 540;
  const horizon = 350;
  const vanish = width / 2;

  let floor = '';
  for (let x = -2400; x <= 3360; x += 160) floor += `M${x} ${height}L${vanish} ${horizon}`;
  for (let i = 1; i <= 7; i++) {
    const y = round(horizon + (height - horizon) * (i / 7) ** 2.2);
    floor += `M0 ${y}L${width} ${y}`;
  }

  const screens = [
    [[70, 130], [290, 100], [290, 300], [70, 300]],
    [[350, 70], [610, 70], [610, 280], [350, 280]],
    [[670, 100], [890, 130], [890, 300], [670, 300]],
  ]
    .map((q, i) => {
      const [[x0, y0], [x1, y1], [, y2]] = q;
      const bar = (f) => `M${x0 + 20} ${round(y0 + (y2 - y0) * f + (y1 - y0) * 0.1)}L${x0 + (x1 - x0) * (0.5 + f * 0.4)} ${round(y0 + (y2 - y0) * f + (y1 - y0) * 0.5)}`;
      const accent = i === 1;
      return `<polygon points="${q.map((p) => p.join(',')).join(' ')}" fill="${t.ink}" fill-opacity="0.05" stroke="${accent ? t.accent : t.wire}" stroke-opacity="${accent ? 1 : t.wireAlpha}" stroke-width="${accent ? 2.5 : 1.5}"/><path d="${bar(0.25)}${bar(0.42)}${bar(0.59)}" stroke="${t.muted}" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Virtual screens floating above a wireframe floor">
<defs><clipPath id="panel"><rect width="${width}" height="${height}" rx="12"/></clipPath></defs>
<g clip-path="url(#panel)">
<rect width="${width}" height="${height}" fill="${t.bg}"/>
<path d="${floor}" fill="none" stroke="${t.wire}" stroke-opacity="${t.wireAlpha * 0.4}"/>
<rect width="${width}" height="${horizon + 1}" fill="${t.bg}"/>
${screens}
</g>
</svg>
`;
}

for (const theme of Object.keys(THEMES)) {
  writeFileSync(new URL(`./hero-${theme}.svg`, import.meta.url), hero(theme));
  writeFileSync(new URL(`./spatial-${theme}.svg`, import.meta.url), spatial(theme));
}
