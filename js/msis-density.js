// NRLMSISE-00 gtd7d total drag density, generated from the public-domain reference code.
// Profile: 2026-03-20, 69.65 N, 18.96 E, local solar time 12 h. F10.7a = F10.7.
const ALTITUDES = Array.from({ length: 93 }, (_, i) => 80 + i * 10);
const F107_VALUES = [70, 120, 180, 250];
const AP_VALUES = [0, 4, 20, 100];
const LOG_SCALE = 2000;
const ENCODED_LOG_DENSITY = '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';

function decodeInt16(base64) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return Int16Array.from({ length: bytes.length / 2 }, (_, i) => view.getInt16(i * 2, true));
}

const LOG_DENSITY = decodeInt16(ENCODED_LOG_DENSITY);

function bracket(grid, value) {
  const clamped = Math.min(grid.at(-1), Math.max(grid[0], value));
  const upper = grid.findIndex(item => item >= clamped);
  if (upper <= 0) return [0, 0, 0];
  const lower = upper - 1;
  return [lower, upper, (clamped - grid[lower]) / (grid[upper] - grid[lower])];
}

function valueAt(fIndex, apIndex, altitudeIndex) {
  const index = (fIndex * AP_VALUES.length + apIndex) * ALTITUDES.length + altitudeIndex;
  return LOG_DENSITY[index] / LOG_SCALE;
}

function mix(a, b, t) { return a + (b - a) * t; }

export function msisDensity(altitudeKm, f107 = 150, ap = 4) {
  const [h0, h1, ht] = bracket(ALTITUDES, altitudeKm);
  const [f0, f1, ft] = bracket(F107_VALUES, f107);
  const [a0, a1, at] = bracket(AP_VALUES, ap);
  const atAltitude = (fi, ai) => mix(valueAt(fi, ai, h0), valueAt(fi, ai, h1), ht);
  const atSolarFlux = ai => mix(atAltitude(f0, ai), atAltitude(f1, ai), ft);
  const logDensity = mix(atSolarFlux(a0), atSolarFlux(a1), at);
  return 10 ** logDensity;
}

export const MSIS_PROFILE = Object.freeze({
  model: 'NRLMSISE-00 gtd7d',
  date: '2026-03-20',
  latitudeDeg: 69.65,
  longitudeDeg: 18.96,
  localSolarTimeHours: 12
});
