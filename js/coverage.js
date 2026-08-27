import {
  EARTH_J2,
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  EARTH_SIDEREAL_DAY_SECONDS,
  TAU,
  j2Rates,
  periodSeconds,
  positionAtTrue,
  trueFromMean
} from './orbit.js';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const magnitude = vector => Math.hypot(...vector);

export function unitVector(vector) {
  const length = magnitude(vector);
  return length > 0 ? vector.map(value => value / length) : [0, 0, 0];
}

export function rotateZ(vector, angle) {
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  return [cosine * vector[0] - sine * vector[1], sine * vector[0] + cosine * vector[1], vector[2]];
}

export function visibilityCentralAngle(radiusKm, minimumElevation = 0, earthRadiusKm = EARTH_RADIUS_KM) {
  if (!(radiusKm > earthRadiusKm)) return 0;
  const elevation = clamp(minimumElevation, 0, Math.PI / 2);
  return Math.max(0, Math.acos(clamp(earthRadiusKm / radiusKm * Math.cos(elevation), -1, 1)) - elevation);
}

export function sphericalCapAreaKm2(centralAngle, earthRadiusKm = EARTH_RADIUS_KM) {
  return TAU * earthRadiusKm ** 2 * (1 - Math.cos(clamp(centralAngle, 0, Math.PI)));
}

export function earthSurfaceFraction(centralAngle) {
  return (1 - Math.cos(clamp(centralAngle, 0, Math.PI))) / 2;
}

export function stationUnitVector(latitude, longitude, earthRotationAngle = 0) {
  const cosineLatitude = Math.cos(latitude);
  return [
    cosineLatitude * Math.cos(longitude + earthRotationAngle),
    cosineLatitude * Math.sin(longitude + earthRotationAngle),
    Math.sin(latitude)
  ];
}

export function elevationAngle(positionKm, stationDirection, earthRadiusKm = EARTH_RADIUS_KM) {
  const station = stationDirection.map(value => earthRadiusKm * value);
  const lineOfSight = positionKm.map((value, index) => value - station[index]);
  return Math.asin(clamp(dot(unitVector(lineOfSight), stationDirection), -1, 1));
}

export function propagatedOrbitPosition(elements, elapsedSeconds, phase = 0, useJ2 = false) {
  const meanMotion = Math.sqrt(EARTH_MU_KM3_S2 / elements.a ** 3);
  let raan = elements.raan ?? 0, argp = elements.argp ?? 0;
  if (useJ2) {
    const rates = j2Rates(elements, EARTH_J2);
    raan += rates.raan * elapsedSeconds;
    if (elements.e >= .03) argp += rates.argp * elapsedSeconds;
  }
  const meanAnomaly = (elements.meanAnomaly ?? 0) + phase + meanMotion * elapsedSeconds;
  return positionAtTrue({ ...elements, raan, argp }, trueFromMean(meanAnomaly, elements.e));
}

export function earthFixedDirection(positionKm, elapsedSeconds) {
  return rotateZ(unitVector(positionKm), -TAU * elapsedSeconds / EARTH_SIDEREAL_DAY_SECONDS);
}

export function constellationMember(elements, index, satellitesPerPlane, planeCount) {
  const planes = Math.max(1, Math.round(planeCount));
  const perPlane = Math.max(1, Math.round(satellitesPerPlane));
  const plane = Math.floor(index / perPlane);
  const slot = index % perPlane;
  return {
    elements: { ...elements, raan: (elements.raan ?? 0) + TAU * plane / planes },
    phase: TAU * slot / perPlane,
    plane,
    slot
  };
}

export function bestGroundTrackRepeat(elements, options = {}) {
  const period = periodSeconds(elements.a);
  const maximumDays = options.maximumDays ?? 30;
  const maximumOrbits = Math.max(1, Math.ceil(maximumDays * EARTH_SIDEREAL_DAY_SECONDS / period));
  const start = earthFixedDirection(propagatedOrbitPosition(elements, 0, 0, options.useJ2), 0);
  let best = null;
  for (let orbits = 1; orbits <= maximumOrbits; orbits += 1) {
    const elapsedSeconds = orbits * period;
    const current = earthFixedDirection(propagatedOrbitPosition(elements, elapsedSeconds, 0, options.useJ2), elapsedSeconds);
    const errorAngle = Math.acos(clamp(dot(start, current), -1, 1));
    const candidate = {
      orbits,
      elapsedSeconds,
      siderealDays: elapsedSeconds / EARTH_SIDEREAL_DAY_SECONDS,
      errorAngle,
      errorKm: errorAngle * EARTH_RADIUS_KM
    };
    if (!best || candidate.errorAngle < best.errorAngle) best = candidate;
  }
  return best;
}

export function constellationAccess(elements, satellitesPerPlane, planeCount, elapsedSeconds, station, minimumElevation, useJ2 = false) {
  const earthAngle = TAU * elapsedSeconds / EARTH_SIDEREAL_DAY_SECONDS;
  const stationDirection = stationUnitVector(station.latitude, station.longitude, earthAngle);
  let best = { elevation: -Math.PI / 2, index: 0, position: null };
  const satelliteCount = Math.max(1, Math.round(satellitesPerPlane)) * Math.max(1, Math.round(planeCount));
  for (let index = 0; index < satelliteCount; index += 1) {
    const member = constellationMember(elements, index, satellitesPerPlane, planeCount);
    const position = propagatedOrbitPosition(member.elements, elapsedSeconds, member.phase, useJ2);
    const elevation = elevationAngle(position, stationDirection);
    if (elevation > best.elevation) best = { elevation, index, position, plane: member.plane, slot: member.slot };
  }
  return { ...best, visible: best.elevation >= minimumElevation, stationDirection };
}

export function nextAccessEvent(elements, satellitesPerPlane, planeCount, elapsedSeconds, station, minimumElevation, useJ2 = false) {
  const period = periodSeconds(elements.a);
  const start = constellationAccess(elements, satellitesPerPlane, planeCount, elapsedSeconds, station, minimumElevation, useJ2);
  const targetVisible = !start.visible;
  const step = Math.max(5, Math.min(120, period / 240));
  const horizon = Math.min(7 * EARTH_SIDEREAL_DAY_SECONDS, Math.max(2 * EARTH_SIDEREAL_DAY_SECONDS, period * 3));
  let previousTime = elapsedSeconds;
  for (let offset = step; offset <= horizon; offset += step) {
    const time = elapsedSeconds + offset;
    const state = constellationAccess(elements, satellitesPerPlane, planeCount, time, station, minimumElevation, useJ2);
    if (state.visible === targetVisible) {
      let lower = previousTime, upper = time;
      for (let iteration = 0; iteration < 18; iteration += 1) {
        const middle = (lower + upper) / 2;
        const middleVisible = constellationAccess(elements, satellitesPerPlane, planeCount, middle, station, minimumElevation, useJ2).visible;
        if (middleVisible === start.visible) lower = middle;
        else upper = middle;
      }
      return { type: targetVisible ? 'rise' : 'set', elapsedSeconds: upper, inSeconds: upper - elapsedSeconds };
    }
    previousTime = time;
  }
  return null;
}
