export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_MU_KM3_S2 = 398600.4418;
export const EARTH_J2 = 1.08262668e-3;
export const EARTH_OBLIQUITY_DEG = 23.4392911;
export const DAY_SECONDS = 86400;
export const EARTH_SIDEREAL_DAY_SECONDS = 86164.0905;
export const TAU = Math.PI * 2;

export const radians = degrees => degrees * Math.PI / 180;
export const degrees = angle => angle * 180 / Math.PI;

export function earthRotationCycles(elapsedDays, siderealDaySeconds = EARTH_SIDEREAL_DAY_SECONDS) {
  return elapsedDays * DAY_SECONDS / siderealDaySeconds;
}

export function eclipticDirection(longitude, obliquity = radians(EARTH_OBLIQUITY_DEG)) {
  return [Math.cos(longitude), Math.sin(longitude) * Math.cos(obliquity), Math.sin(longitude) * Math.sin(obliquity)];
}

export function hasWellDefinedPeriapsis(eccentricity) {
  return eccentricity >= 0.03;
}

export function periodSeconds(aKm, mu = EARTH_MU_KM3_S2) {
  return TAU * Math.sqrt(aKm ** 3 / mu);
}

export function solveKepler(meanAnomaly, eccentricity, iterations = 12) {
  let E = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < iterations; i += 1) {
    E -= (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
  }
  return E;
}

export function trueFromMean(meanAnomaly, eccentricity) {
  const E = solveKepler(((meanAnomaly % TAU) + TAU) % TAU, eccentricity);
  return 2 * Math.atan2(Math.sqrt(1 + eccentricity) * Math.sin(E / 2), Math.sqrt(1 - eccentricity) * Math.cos(E / 2));
}

export function perifocalToInertial(point, inclination, raan, argumentOfPeriapsis) {
  const [x, y, z = 0] = point;
  const cw = Math.cos(argumentOfPeriapsis), sw = Math.sin(argumentOfPeriapsis);
  const ci = Math.cos(inclination), si = Math.sin(inclination);
  const co = Math.cos(raan), so = Math.sin(raan);
  const x1 = cw * x - sw * y;
  const y1 = sw * x + cw * y;
  return [co * x1 - so * ci * y1 + so * si * z, so * x1 + co * ci * y1 - co * si * z, si * y1 + ci * z];
}

export function positionAtTrue(elements, trueAnomaly) {
  const p = elements.a * (1 - elements.e ** 2);
  const r = p / (1 + elements.e * Math.cos(trueAnomaly));
  return perifocalToInertial([r * Math.cos(trueAnomaly), r * Math.sin(trueAnomaly), 0], elements.i, elements.raan, elements.argp);
}

export function sampleOrbit(elements, count = 256) {
  const points = [];
  for (let k = 0; k <= count; k += 1) points.push(positionAtTrue(elements, TAU * k / count));
  return points;
}

export function ellipseGeometry(a, e) {
  return {
    b: a * Math.sqrt(1 - e ** 2),
    c: a * e,
    p: a * (1 - e ** 2),
    rp: a * (1 - e),
    ra: a * (1 + e)
  };
}

export function j2Rates(elements, j2 = EARTH_J2) {
  const p = elements.a * (1 - elements.e ** 2);
  const n = Math.sqrt(EARTH_MU_KM3_S2 / elements.a ** 3);
  const factor = j2 * n * (EARTH_RADIUS_KM / p) ** 2;
  return {
    raan: -1.5 * factor * Math.cos(elements.i),
    argp: 0.75 * factor * (5 * Math.cos(elements.i) ** 2 - 1)
  };
}

export function sunSynchronousInclination(a, e = 0, j2 = EARTH_J2) {
  const targetRate = TAU / (365.2422 * DAY_SECONDS);
  const p = a * (1 - e ** 2);
  const n = Math.sqrt(EARTH_MU_KM3_S2 / a ** 3);
  const cosI = -targetRate / (1.5 * j2 * n * (EARTH_RADIUS_KM / p) ** 2);
  if (Math.abs(cosI) > 1) return NaN;
  return Math.acos(cosI);
}

// Educational averaged model: drag lowers apogee first, then contracts a near-circle.
// Adaptive steps limit altitude loss, so very long lifetimes do not require day-sized loops.
const DRAG_STEP_KM = .5;
const REENTRY_ALTITUDE_KM = 80;
const REENTRY_EPSILON_KM = 1e-4;
const MAX_DECAY_DAYS = 10_000_000 * 365.25;

function densityFunction(options) {
  return options.densityAtAltitude ??
    (altitudeKm => options.rho400 * Math.exp(-(altitudeKm - 400) / options.scaleHeightKm));
}

function dragState(initial, options) {
  const rp = initial.a * (1 - initial.e);
  const densityAtAltitude = densityFunction(options);
  return {
    a: initial.a, e: initial.e, rp, elapsed: 0, reentered: false, steps: 0,
    densityAtAltitude, density: densityAtAltitude(rp - EARTH_RADIUS_KM)
  };
}

function advanceDrag(state, targetSeconds, options) {
  while (!state.reentered && state.elapsed < targetSeconds) {
    const hp = state.rp - EARTH_RADIUS_KM;
    state.density = state.densityAtAltitude(hp);
    const aMetres = state.a * 1000;
    const muSI = EARTH_MU_KM3_S2 * 1e9;
    const daKmPerSecond = -state.density * options.cd * options.areaToMass * Math.sqrt(muSI * aMetres) / 1000;
    const remainingDrop = Math.max(0, state.a - EARTH_RADIUS_KM - REENTRY_ALTITUDE_KM);
    if (!(daKmPerSecond < 0) || remainingDrop <= REENTRY_EPSILON_KM) {
      if (remainingDrop <= REENTRY_EPSILON_KM) state.a = EARTH_RADIUS_KM + REENTRY_ALTITUDE_KM;
      state.reentered = remainingDrop <= REENTRY_EPSILON_KM;
      state.elapsed = targetSeconds;
      break;
    }
    const adaptiveSeconds = Math.min(DRAG_STEP_KM, remainingDrop) / -daKmPerSecond;
    const dt = Math.min(targetSeconds - state.elapsed, adaptiveSeconds);
    if (!(dt > 0) || !Number.isFinite(dt)) { state.elapsed = targetSeconds; break; }
    state.a += Math.max(daKmPerSecond * dt, -remainingDrop);
    state.elapsed += dt;
    state.steps += 1;
    if (state.e > .001) {
      // Perigee is nearly unchanged by an impulse opposite velocity at perigee.
      state.e = Math.max(0, 1 - state.rp / state.a);
      if (state.e === 0) state.rp = state.a;
    } else {
      state.e = 0;
      state.rp = state.a;
    }
    if (state.a - EARTH_RADIUS_KM <= REENTRY_ALTITUDE_KM + REENTRY_EPSILON_KM) {
      state.a = EARTH_RADIUS_KM + REENTRY_ALTITUDE_KM;
      state.reentered = true;
    }
  }
  return state;
}

function dragResult(state) {
  return { a: state.a, e: state.e, density: state.density, reentered: state.reentered, steps: state.steps };
}

export function propagateAveragedDrag(initial, options) {
  const state = dragState(initial, options);
  advanceDrag(state, Math.max(0, options.days) * DAY_SECONDS, options);
  return dragResult(state);
}

export function estimateDecayDays(initial, options, maxDays = MAX_DECAY_DAYS) {
  const state = dragState(initial, options);
  advanceDrag(state, maxDays * DAY_SECONDS, options);
  return state.reentered ? state.elapsed / DAY_SECONDS : Infinity;
}

export function sampleAveragedDrag(initial, options, days, sampleCount = 72) {
  const state = dragState(initial, options);
  const history = [];
  const endSeconds = Math.max(0, days) * DAY_SECONDS;
  for (let k = 0; k <= sampleCount; k += 1) {
    const targetSeconds = endSeconds * k / sampleCount;
    advanceDrag(state, targetSeconds, options);
    history.push({ day: targetSeconds / DAY_SECONDS, altitude: state.a - EARTH_RADIUS_KM, e: state.e });
  }
  return history;
}

// A schematic trajectory for displaying many physical revolutions as a readable spiral.
export function compressedDecaySpiral(elements, history, turns = 8) {
  const denominator = Math.max(1, history.length - 1);
  return history.map((point, index) => positionAtTrue({
    ...elements,
    a: EARTH_RADIUS_KM + point.altitude,
    e: point.e
  }, Math.PI + turns * TAU * index / denominator));
}
