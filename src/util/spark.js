/* Tiny sparkline path generator (deterministic from a string seed). */
export function sparkPath(seed, w, h) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 8) / 0xffffff;
  };
  const pts = 24;
  const xs = (i) => (i / (pts - 1)) * w;
  const ys = (v) => h - 4 - v * (h - 8);
  let d = '';
  for (let i = 0; i < pts; i++) {
    const v = 0.25 + rand() * 0.7;
    d += (i === 0 ? 'M' : 'L') + xs(i).toFixed(1) + ',' + ys(v).toFixed(1) + ' ';
  }
  return d.trim();
}

export function sparkSvg(seed, color) {
  const w = 200,
    h = 32;
  const d = sparkPath(seed, w, h);
  return (
    `<svg class="telemetry__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>` +
    `</svg>`
  );
}
