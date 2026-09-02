import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AU_KM,
  EARTH_RADIUS_KM,
  GEO_RADIUS_KM,
  earthEscapeDeltaV,
  gtoFromEntryScenario,
  gtoInjectionScenario,
  gtoTransferScenario,
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
  assert.ok(perihelion.optimumTotalDeltaV < perihelion.directTotalDeltaV);
  assert.ok(perihelion.injectionDeltaV > 0);
});

test('Earth exit burn uses the parking-orbit and hyperbolic excess energies',()=>{
  const deltaV=earthEscapeDeltaV(0,300);
  const circular=Math.sqrt(398600.4418/(EARTH_RADIUS_KM+300));
  assert.ok(Math.abs(deltaV-circular*(Math.sqrt(2)-1))<1e-12);
});

test('direct and solar Oberth routes enter the identical target hyperbola', () => {
  const result = solarOberthScenario();
  assert.ok(Math.abs(result.burn.conic.energy-result.targetConic.energy)<1e-8);
  assert.ok(Math.abs(result.burn.conic.e-result.targetConic.e)<1e-10);
  assert.ok(Math.abs(result.burn.conic.periapsis-result.targetConic.periapsis)<1e-5);
  assert.ok(Math.abs(result.directState.radius-AU_KM)<1e-5);
});

test('direct and solar-dive departures occur at different Earth orbital phases',()=>{
  const result=solarOberthScenario();
  assert.ok(Math.abs(result.directDepartureTrueLongitude-result.oberthDepartureTrueLongitude)>.1);
  assert.ok(Math.abs(Math.hypot(...result.oberthDeparturePosition)-AU_KM)<1e-6);
  assert.ok(Math.abs(Math.hypot(...result.directState.position)-AU_KM)<1e-5);
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

test('standard LEO-GTO-GEO transfer has two positive burns and a half-ellipse coast', () => {
  const transfer = gtoTransferScenario({ leoAltitudeKm: 300 });
  assert.ok(transfer.firstDeltaV > 2.4 && transfer.firstDeltaV < 2.5);
  assert.ok(transfer.secondDeltaV > 1.4 && transfer.secondDeltaV < 1.5);
  assert.ok(transfer.totalDeltaV > 3.8 && transfer.totalDeltaV < 4.0);
  assert.ok(transfer.transferTimeSeconds / 3600 > 5.2 && transfer.transferTimeSeconds / 3600 < 5.4);
});

test('every selected entry-orbit burn produces an apoapsis at GEO', () => {
  for(const burnAngleDeg of [0,30,90,150,180]){
    const transfer=gtoFromEntryScenario({burnAngleDeg});
    assert.ok(Math.abs(transfer.transferConic.apoapsis-GEO_RADIUS_KM)<1e-5);
  }
});

test('default GTO entry orbit is 270 by 3720 kilometres', () => {
  const transfer=gtoFromEntryScenario();
  assert.ok(Math.abs(transfer.entryPerigee-EARTH_RADIUS_KM-270)<1e-9);
  assert.ok(Math.abs(transfer.entryApogee-EARTH_RADIUS_KM-3720)<1e-9);
});
