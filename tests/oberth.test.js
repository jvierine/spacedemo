import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARTH_RADIUS_KM,
  GEO_RADIUS_KM,
  gtoInjectionScenario,
  solarOberthScenario,
  stateOnEllipse
} from '../js/oberth.js';

test('ellipse state reaches the requested apsides', () => {
  const periapsis = stateOnEllipse(398600.4418, 7000, 42000, 0);
  const apoapsis = stateOnEllipse(398600.4418, 7000, 42000, Math.PI);
  assert.ok(Math.abs(periapsis.radius - 7000) < 1e-9);
  assert.ok(Math.abs(apoapsis.radius - 42000) < 1e-8);
});

test('solar perihelion burn minimizes delta v for a fixed excess speed', () => {
  const perihelion = solarOberthScenario({ burnAngleDeg: 0 });
  const quarterOrbit = solarOberthScenario({ burnAngleDeg: 90 });
  const aphelion = solarOberthScenario({ burnAngleDeg: 180 });
  assert.ok(perihelion.totalDeltaV < quarterOrbit.totalDeltaV);
  assert.ok(quarterOrbit.totalDeltaV < aphelion.totalDeltaV);
  assert.ok(Math.abs(perihelion.burn.conic.energy - 100 ** 2 / 2) < 1e-8);
  assert.ok(perihelion.optimumTotalDeltaV < perihelion.directDeltaV);
  assert.ok(perihelion.injectionDeltaV > 0);
});

test('perigee burn from an eccentric parking orbit creates the requested GTO', () => {
  const result = gtoInjectionScenario({ perigeeAltitudeKm: 300, apogeeAltitudeKm: 2000, burnAngleDeg: 0 });
  assert.ok(Math.abs(result.burn.conic.periapsis - (EARTH_RADIUS_KM + 300)) < 1e-6);
  assert.ok(Math.abs(result.burn.conic.apoapsis - GEO_RADIUS_KM) < 1e-6);
  assert.ok(result.circularizationDeltaV > 1.4 && result.circularizationDeltaV < 1.6);
});

test('perigee minimizes the GTO energy burn on an eccentric parking orbit', () => {
  const perigee = gtoInjectionScenario({ burnAngleDeg: 0 });
  const apoapsis = gtoInjectionScenario({ burnAngleDeg: 180 });
  assert.ok(perigee.burn.deltaV < apoapsis.burn.deltaV);
  assert.ok(apoapsis.apogeeError < 0);
});

test('every point of a circular parking orbit is an equivalent GTO perigee', () => {
  const first = gtoInjectionScenario({ perigeeAltitudeKm: 300, apogeeAltitudeKm: 300, burnAngleDeg: 0 });
  const opposite = gtoInjectionScenario({ perigeeAltitudeKm: 300, apogeeAltitudeKm: 300, burnAngleDeg: 180 });
  assert.ok(Math.abs(first.burn.deltaV - opposite.burn.deltaV) < 1e-12);
  assert.ok(Math.abs(opposite.burn.conic.apoapsis - GEO_RADIUS_KM) < 1e-6);
});
