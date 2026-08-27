import test from 'node:test';
import assert from 'node:assert/strict';
import {AU_KM,MOON_DISTANCE_KM,hillRadius,lagrangePoints,sphereOfInfluence} from '../js/three-body.js';

test('Earth Laplace sphere of influence is about 925 thousand kilometres',()=>{
  const radius=sphereOfInfluence();assert.ok(radius>920000&&radius<930000);assert.ok(radius/MOON_DISTANCE_KM>2.39&&radius/MOON_DISTANCE_KM<2.43);
});
test('Earth Hill radius is about 1.47 million kilometres at perihelion',()=>{
  const radius=hillRadius();assert.ok(radius>1460000&&radius<1480000);assert.ok(radius>sphereOfInfluence());
});
test('Sun-Earth collinear points bracket Earth and triangular points are equilateral',()=>{
  const points=lagrangePoints(),earthX=points.earth[0];assert.ok(points.L1[0]<earthX);assert.ok(points.L2[0]>earthX);assert.ok(Math.abs(Math.hypot(points.L4[0]-points.sun[0],points.L4[1])-1)<1e-12);assert.ok(Math.abs((earthX-points.L1[0])*AU_KM-1.49e6)<30000);
});
