export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_MU_KM3_S2 = 398600.4418;
export const EARTH_J2 = 1.08262668e-3;
export const EARTH_OBLIQUITY_DEG = 23.4392911;
export const DAY_SECONDS = 86400;
export const TAU = Math.PI * 2;

export const radians = degrees => degrees * Math.PI / 180;
export const degrees = angle => angle * 180 / Math.PI;

export function eclipticDirection(longitude, obliquity = radians(EARTH_OBLIQUITY_DEG)) {
  return [Math.cos(longitude), Math.sin(longitude) * Math.cos(obliquity), Math.sin(longitude) * Math.sin(obliquity)];
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
export function propagateAveragedDrag(initial, options) {
  let a = initial.a;
  let e = initial.e;
  let rp = a * (1 - e);
  const elapsed = Math.max(0, options.days) * DAY_SECONDS;
  const steps = Math.max(1, Math.ceil(options.days * 8));
  const dt = elapsed / steps;
  let reentered = false;
  let lastDensity = options.rho400;
  for (let k = 0; k < steps; k += 1) {
    const hp = rp - EARTH_RADIUS_KM;
    lastDensity = options.rho400 * Math.exp(-(hp - 400) / options.scaleHeightKm);
    const aMetres = a * 1000;
    const muSI = EARTH_MU_KM3_S2 * 1e9;
    const daMetres = -lastDensity * options.cd * options.areaToMass * Math.sqrt(muSI * aMetres) * dt;
    const daKm = Math.max(daMetres / 1000, -Math.max(0, a - EARTH_RADIUS_KM - 80));
    a += daKm;
    if (e > 0.001) {
      // Perigee is nearly unchanged by an impulse opposite velocity at perigee.
      e = Math.max(0, 1 - rp / a);
      if (e === 0) rp = a;
    } else {
      e = 0;
      rp = a;
    }
    if (a - EARTH_RADIUS_KM <= 80) { reentered = true; break; }
  }
  return { a, e, density: lastDensity, reentered };
}
