import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA_CENTAURI_DISTANCE_LY,
  AU_KM,
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  GEO_RADIUS_KM,
  JULIAN_YEAR_SECONDS,
  LIGHT_YEAR_KM,
  SUN_MU_KM3_S2,
  earthEscapeDeltaV,
  ellipseTimeFromApoapsis,
  gtoFromEntryScenario,
  gtoInjectionScenario,
  gtoTransferScenario,
  hyperbolaTimeFromPeriapsis,
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

test('solar Oberth burn enters the constructed near-Sun target hyperbola', () => {
  const result = solarOberthScenario();
  assert.ok(Math.abs(result.burn.conic.energy-result.targetConic.energy)<1e-8);
  assert.ok(Math.abs(result.burn.conic.e-result.targetConic.e)<1e-10);
  assert.ok(Math.abs(result.burn.conic.p-result.targetConic.p)<1e-5);
  assert.ok(Math.abs(result.burn.conic.omega-result.targetConic.omega)<1e-12);
  assert.ok(Math.abs(result.burn.conic.periapsis-result.targetConic.periapsis)<1e-5);
  assert.ok(Math.abs(result.burn.velocity[0])<1e-12);
  assert.ok(result.burn.velocity[1]>0);
  assert.ok(Math.abs(result.directState.radius-AU_KM)<1e-5);
});

test('direct and solar-dive departures occur at different Earth orbital phases',()=>{
  const result=solarOberthScenario();
  assert.ok(Math.abs(result.directDepartureTrueLongitude-result.oberthDepartureTrueLongitude)>.1);
  assert.ok(Math.abs(Math.hypot(...result.oberthDeparturePosition)-AU_KM)<1e-6);
  assert.ok(Math.abs(Math.hypot(...result.directState.position)-AU_KM)<1e-5);
});

test('direct departure is prograde at a 1 AU perihelion with the same outgoing asymptote',()=>{
  const result=solarOberthScenario();
  const radialVelocity=result.directState.position[0]*result.directState.velocity[0]+result.directState.position[1]*result.directState.velocity[1];
  const cross=result.earthVelocity[0]*result.directState.velocity[1]-result.earthVelocity[1]*result.directState.velocity[0];
  const directAsymptote=result.directConic.omega+Math.acos(-1/result.directConic.e);
  assert.ok(Math.abs(result.directConic.periapsis-AU_KM)<1e-6);
  assert.ok(Math.abs(radialVelocity)<1e-3);
  assert.ok(Math.abs(cross)<1e-10);
  assert.ok(Math.abs(directAsymptote-result.targetAsymptoteDirection)<1e-12);
  assert.ok(result.directState.velocity[0]*result.earthVelocity[0]+result.directState.velocity[1]*result.earthVelocity[1]>0);
});

test('Solar Oberth timeline uses elliptic and hyperbolic Kepler time of flight',()=>{
  const result=solarOberthScenario(),alphaDistance=ALPHA_CENTAURI_DISTANCE_LY*LIGHT_YEAR_KM;
  const halfPeriod=Math.PI*Math.sqrt(((result.periapsis+AU_KM)/2)**3/SUN_MU_KM3_S2);
  assert.ok(Math.abs(ellipseTimeFromApoapsis(SUN_MU_KM3_S2,result.periapsis,AU_KM,-Math.PI))<1e-9);
  assert.ok(Math.abs(ellipseTimeFromApoapsis(SUN_MU_KM3_S2,result.periapsis,AU_KM,0)-halfPeriod)<1e-6);
  assert.ok(Math.abs(result.diveTimeSeconds-halfPeriod)<1e-9);
  assert.ok(Math.abs(result.directTravelYears-hyperbolaTimeFromPeriapsis(SUN_MU_KM3_S2,result.directConic,alphaDistance)/JULIAN_YEAR_SECONDS)<1e-9);
  assert.ok(Math.abs(result.oberthTravelYears-(halfPeriod+hyperbolaTimeFromPeriapsis(SUN_MU_KM3_S2,result.targetConic,alphaDistance))/JULIAN_YEAR_SECONDS)<1e-9);
  assert.ok(hyperbolaTimeFromPeriapsis(SUN_MU_KM3_S2,result.targetConic,AU_KM)>0);
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

test('GTO delta-v components agree with independent Keplerian formulas',()=>{
  const perigee=EARTH_RADIUS_KM+270,apogee=EARTH_RADIUS_KM+3720;
  const a=(perigee+apogee)/2,e=(apogee-perigee)/(apogee+perigee),p=a*(1-e**2);
  for(const burnAngleDeg of [0,30,90,150,180]){
    const anomaly=burnAngleDeg*Math.PI/180,factor=Math.sqrt(EARTH_MU_KM3_S2/p);
    const expectedRadial=factor*e*Math.sin(anomaly),expectedTransverse=factor*(1+e*Math.cos(anomaly));
    const transfer=gtoFromEntryScenario({burnAngleDeg});
    const expectedTarget=Math.sqrt(EARTH_MU_KM3_S2*(2/transfer.entryState.radius-1/transfer.transferSemiMajorAxis));
    const expectedDelta=Math.hypot(-expectedRadial,expectedTarget-expectedTransverse);
    assert.ok(Math.abs(transfer.entryRadialSpeed-expectedRadial)<1e-12);
    assert.ok(Math.abs(transfer.entryTransverseSpeed-expectedTransverse)<1e-12);
    assert.ok(Math.abs(transfer.deltaRadialSpeed+expectedRadial)<1e-12);
    assert.ok(Math.abs(transfer.deltaTransverseSpeed-(expectedTarget-expectedTransverse))<1e-12);
    assert.ok(Math.abs(transfer.firstDeltaV-expectedDelta)<1e-12);
  }
});

test('GTO injection vector cancels radial motion and leaves a prograde periapsis',()=>{
  for(const burnAngleDeg of [0,30,90,150,180]){
    const transfer=gtoFromEntryScenario({burnAngleDeg}),position=transfer.entryState.position;
    const postBurnVelocity=transfer.entryState.velocity.map((value,index)=>value+transfer.deltaVelocity[index]);
    const radialDot=position[0]*postBurnVelocity[0]+position[1]*postBurnVelocity[1];
    const angularMomentum=position[0]*postBurnVelocity[1]-position[1]*postBurnVelocity[0];
    assert.ok(Math.abs(radialDot)<1e-6);
    assert.ok(angularMomentum>0);
    assert.ok(Math.hypot(postBurnVelocity[0]-transfer.targetVelocity[0],postBurnVelocity[1]-transfer.targetVelocity[1])<1e-12);
  }
});

test('default GTO entry orbit is 270 by 3720 kilometres', () => {
  const transfer=gtoFromEntryScenario();
  assert.ok(Math.abs(transfer.entryPerigee-EARTH_RADIUS_KM-270)<1e-9);
  assert.ok(Math.abs(transfer.entryApogee-EARTH_RADIUS_KM-3720)<1e-9);
});
