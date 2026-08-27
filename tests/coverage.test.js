import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bestGroundTrackRepeat,
  constellationMember,
  earthSurfaceFraction,
  elevationAngle,
  sphericalCapAreaKm2,
  stationUnitVector,
  visibilityCentralAngle
} from '../js/coverage.js';
import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM, EARTH_SIDEREAL_DAY_SECONDS, TAU } from '../js/orbit.js';

test('zero-elevation footprint reaches the geometric horizon',()=>{
  const radius=EARTH_RADIUS_KM+400,angle=visibilityCentralAngle(radius,0);
  assert.ok(Math.abs(angle-Math.acos(EARTH_RADIUS_KM/radius))<1e-12);
});

test('higher station elevation mask shrinks the visible footprint',()=>{
  const radius=EARTH_RADIUS_KM+700;
  assert.ok(visibilityCentralAngle(radius,20*Math.PI/180)<visibilityCentralAngle(radius,0));
});

test('spherical cap area and Earth fraction are consistent',()=>{
  const angle=.4,area=sphericalCapAreaKm2(angle),earthArea=4*Math.PI*EARTH_RADIUS_KM**2;
  assert.ok(Math.abs(area/earthArea-earthSurfaceFraction(angle))<1e-14);
});

test('overhead satellite has ninety-degree elevation',()=>{
  const station=stationUnitVector(0,0,0),satellite=[EARTH_RADIUS_KM+500,0,0];
  assert.ok(Math.abs(elevationAngle(satellite,station)-Math.PI/2)<1e-12);
});

test('geostationary orbit closes after one sidereal day',()=>{
  const a=Math.cbrt(EARTH_MU_KM3_S2*(EARTH_SIDEREAL_DAY_SECONDS/TAU)**2);
  const repeat=bestGroundTrackRepeat({a,e:0,i:0,raan:0,argp:0});
  assert.equal(repeat.orbits,1);
  assert.ok(repeat.errorKm<1e-6);
  assert.ok(Math.abs(repeat.siderealDays-1)<1e-12);
});

test('constellation planes are evenly spaced in right ascension',()=>{
  const elements={a:EARTH_RADIUS_KM+600,e:0,i:Math.PI/3,raan:.2,argp:0};
  const first=constellationMember(elements,0,2,3),second=constellationMember(elements,2,2,3),third=constellationMember(elements,4,2,3);
  assert.ok(Math.abs(second.elements.raan-first.elements.raan-TAU/3)<1e-12);
  assert.ok(Math.abs(third.elements.raan-second.elements.raan-TAU/3)<1e-12);
  assert.equal(constellationMember(elements,1,2,3).phase,Math.PI);
});
