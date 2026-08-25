import test from 'node:test';import assert from 'node:assert/strict';
import { DAY_SECONDS, EARTH_J2, EARTH_RADIUS_KM, degrees, ellipseGeometry, j2Rates, periodSeconds, propagateAveragedDrag, radians, sunSynchronousInclination, trueFromMean } from '../js/orbit.js';
test('LEO period is physically plausible',()=>assert.ok(Math.abs(periodSeconds(EARTH_RADIUS_KM+400)/60-92.56)<.1));
test('ellipse apses and axes are consistent',()=>{const g=ellipseGeometry(10000,.2);assert.equal(g.rp,8000);assert.equal(g.ra,12000);assert.ok(Math.abs(g.b-9797.95897)<1e-4)});
test('Kepler conversion preserves periapsis',()=>assert.ok(Math.abs(trueFromMean(0,.7))<1e-12));
test('prograde J2 node regresses',()=>{const r=j2Rates({a:EARTH_RADIUS_KM+700,e:0,i:radians(60)},EARTH_J2);assert.ok(r.raan<0)});
test('700 km sun synchronous inclination is near 98.2 degrees',()=>{const i=degrees(sunSynchronousInclination(EARTH_RADIUS_KM+700));assert.ok(i>98&&i<98.3)});
test('sun synchronous rate matches one revolution per year',()=>{const a=EARTH_RADIUS_KM+700,i=sunSynchronousInclination(a),r=j2Rates({a,e:0,i},EARTH_J2);assert.ok(Math.abs(r.raan*365.2422*DAY_SECONDS-Math.PI*2)<1e-10)});
test('drag reduces semi-major axis and eccentricity',()=>{const initial={a:EARTH_RADIUS_KM+400,e:.01};const p=propagateAveragedDrag(initial,{days:30,rho400:1e-11,scaleHeightKm:58,cd:2.5,areaToMass:.02});assert.ok(p.a<initial.a);assert.ok(p.e<initial.e)});
