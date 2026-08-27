import test from 'node:test';
import assert from 'node:assert/strict';
import { ALUMINIUM_DENSITY_KG_M3, sphereAreaToMass, sphereDiameterCm, sphereMassKg } from '../js/drag-object.js';

test('aluminium sphere size and area-to-mass are reciprocal',()=>{
  for(const diameter of [.1,1,10,100]) assert.ok(Math.abs(sphereDiameterCm(sphereAreaToMass(diameter))-diameter)<1e-10);
});

test('one centimetre aluminium sphere has one hundred times the area-to-mass ratio',()=>{
  assert.ok(Math.abs(sphereAreaToMass(1)/sphereAreaToMass(100)-100)<1e-10);
});

test('one millimetre aluminium sphere has one thousand times the area-to-mass ratio',()=>{
  assert.ok(Math.abs(sphereAreaToMass(.1)/sphereAreaToMass(100)-1000)<1e-10);
});

test('sphere mass uses aluminium density',()=>{
  const expected=ALUMINIUM_DENSITY_KG_M3*4*Math.PI*(.005**3)/3;
  assert.ok(Math.abs(sphereMassKg(1)-expected)<1e-14);
});
