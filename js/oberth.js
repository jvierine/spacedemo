export const AU_KM = 149597870.7;
export const SUN_RADIUS_KM = 695700;
export const SUN_MU_KM3_S2 = 132712440018;
export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_MU_KM3_S2 = 398600.4418;
export const GEO_RADIUS_KM = 42164;
export const LIGHT_YEAR_KM = 9.4607304725808e12;
export const ALPHA_CENTAURI_DISTANCE_LY = 4.2465;

const radians = degrees => degrees * Math.PI / 180;
export const magnitude = vector => Math.hypot(...vector);

export function stateOnEllipse(mu, periapsis, apoapsis, trueAnomaly) {
  if (!(mu > 0 && periapsis > 0 && apoapsis >= periapsis)) throw new RangeError('invalid ellipse');
  const a = (periapsis + apoapsis) / 2;
  const e = (apoapsis - periapsis) / (apoapsis + periapsis);
  const p = a * (1 - e ** 2);
  const radius = p / (1 + e * Math.cos(trueAnomaly));
  const factor = Math.sqrt(mu / p);
  return {
    position: [radius * Math.cos(trueAnomaly), radius * Math.sin(trueAnomaly)],
    velocity: [-factor * Math.sin(trueAnomaly), factor * (e + Math.cos(trueAnomaly))],
    radius, a, e, p
  };
}

export function conicFromState(mu, position, velocity) {
  const radius = magnitude(position), speed2 = velocity[0] ** 2 + velocity[1] ** 2;
  const radialDot = position[0] * velocity[0] + position[1] * velocity[1];
  const energy = speed2 / 2 - mu / radius;
  const eccentricityVector = [
    ((speed2 - mu / radius) * position[0] - radialDot * velocity[0]) / mu,
    ((speed2 - mu / radius) * position[1] - radialDot * velocity[1]) / mu
  ];
  const e = magnitude(eccentricityVector);
  const h = position[0] * velocity[1] - position[1] * velocity[0];
  const a = Math.abs(energy) < 1e-12 ? Infinity : -mu / (2 * energy);
  const p = h ** 2 / mu;
  const omega = Math.atan2(eccentricityVector[1], eccentricityVector[0]);
  return {
    a, e, p, omega, energy,
    periapsis: p / (1 + e),
    apoapsis: e < 1 ? p / (1 - e) : Infinity
  };
}

export function progradeBurnToEnergy(mu, state, targetEnergy) {
  const initialSpeed = magnitude(state.velocity);
  const targetSpeed2 = 2 * (targetEnergy + mu / state.radius);
  if (!(targetSpeed2 >= 0)) throw new RangeError('target energy is unreachable at this radius');
  const finalSpeed = Math.sqrt(targetSpeed2);
  const scale = finalSpeed / initialSpeed;
  const velocity = state.velocity.map(component => component * scale);
  return {
    deltaV: finalSpeed - initialSpeed,
    initialSpeed,
    finalSpeed,
    velocity,
    conic: conicFromState(mu, state.position, velocity)
  };
}

export function sampleConic(conic, count = 300, maximumRadius = Infinity) {
  const hyperbolicLimit = conic.e > 1 ? Math.acos(-1 / conic.e) - 1e-4 : Math.PI;
  const limit = conic.e > 1 ? hyperbolicLimit : Math.PI;
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const anomaly = -limit + 2 * limit * index / count;
    const denominator = 1 + conic.e * Math.cos(anomaly);
    if (!(denominator > 0)) continue;
    const radius = conic.p / denominator;
    if (radius > maximumRadius) continue;
    const angle = anomaly + conic.omega;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return points;
}

export function solarOberthScenario({
  perihelionSolarRadii = 3,
  targetVInfinity = 100,
  burnAngleDeg = 0
} = {}) {
  const periapsis = perihelionSolarRadii * SUN_RADIUS_KM;
  const apoapsis = AU_KM;
  const angle = radians(burnAngleDeg);
  const state = stateOnEllipse(SUN_MU_KM3_S2, periapsis, apoapsis, angle);
  const targetEnergy = targetVInfinity ** 2 / 2;
  const burn = progradeBurnToEnergy(SUN_MU_KM3_S2, state, targetEnergy);
  const perihelionState = stateOnEllipse(SUN_MU_KM3_S2, periapsis, apoapsis, 0);
  const optimum = progradeBurnToEnergy(SUN_MU_KM3_S2, perihelionState, targetEnergy);
  const earthCircularSpeed = Math.sqrt(SUN_MU_KM3_S2 / AU_KM);
  const diveAphelionSpeed = magnitude(stateOnEllipse(SUN_MU_KM3_S2, periapsis, apoapsis, Math.PI).velocity);
  const injectionDeltaV = earthCircularSpeed - diveAphelionSpeed;
  const directDeltaV = Math.sqrt(targetVInfinity ** 2 + 2 * SUN_MU_KM3_S2 / AU_KM) - earthCircularSpeed;
  const totalDeltaV = injectionDeltaV + burn.deltaV;
  const optimumTotalDeltaV = injectionDeltaV + optimum.deltaV;
  const travelYears = ALPHA_CENTAURI_DISTANCE_LY * LIGHT_YEAR_KM / targetVInfinity / (365.25 * 86400);
  return {
    periapsis, apoapsis, angle, state, burn, optimum, targetEnergy,
    injectionDeltaV, directDeltaV, totalDeltaV, optimumTotalDeltaV, travelYears,
    penalty: totalDeltaV - optimumTotalDeltaV,
    fluxMultiple: (AU_KM / state.radius) ** 2
  };
}

export function gtoInjectionScenario({
  perigeeAltitudeKm = 300,
  apogeeAltitudeKm = 2000,
  burnAngleDeg = 0
} = {}) {
  const periapsis = EARTH_RADIUS_KM + perigeeAltitudeKm;
  const apoapsis = EARTH_RADIUS_KM + Math.max(perigeeAltitudeKm, apogeeAltitudeKm);
  const angle = radians(burnAngleDeg);
  const targetSemiMajorAxis = (periapsis + GEO_RADIUS_KM) / 2;
  const targetEnergy = -EARTH_MU_KM3_S2 / (2 * targetSemiMajorAxis);
  const state = stateOnEllipse(EARTH_MU_KM3_S2, periapsis, apoapsis, angle);
  const burn = progradeBurnToEnergy(EARTH_MU_KM3_S2, state, targetEnergy);
  const perigeeState = stateOnEllipse(EARTH_MU_KM3_S2, periapsis, apoapsis, 0);
  const optimum = progradeBurnToEnergy(EARTH_MU_KM3_S2, perigeeState, targetEnergy);
  const transferApogeeSpeed = Math.sqrt(EARTH_MU_KM3_S2 * (2 / GEO_RADIUS_KM - 1 / targetSemiMajorAxis));
  const geoSpeed = Math.sqrt(EARTH_MU_KM3_S2 / GEO_RADIUS_KM);
  return {
    periapsis, apoapsis, angle, state, burn, optimum, targetEnergy,
    targetSemiMajorAxis,
    circularizationDeltaV: geoSpeed - transferApogeeSpeed,
    standardTotalDeltaV: optimum.deltaV + geoSpeed - transferApogeeSpeed,
    penalty: burn.deltaV - optimum.deltaV,
    apogeeError: burn.conic.apoapsis - GEO_RADIUS_KM
  };
}
