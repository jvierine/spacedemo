import test from 'node:test';
import assert from 'node:assert/strict';
import { boxDimensionsFromMoments, relativeBoxMoments } from '../js/rigid.js';

test('box dimensions reproduce principal moment ratios',()=>{
  const target=[2.5,3.5,4.5],dimensions=boxDimensionsFromMoments(...target),moments=relativeBoxMoments(dimensions),ratio=moments[0]/target[0];
  target.forEach((value,index)=>assert.ok(Math.abs(moments[index]-value*ratio)<1e-12));
});

test('larger dimension corresponds to smaller axial moment',()=>{
  const [x,y,z]=boxDimensionsFromMoments(2.5,3.5,4.5);
  assert.ok(x>y&&y>z);
});

test('nonphysical moments are rejected',()=>assert.throws(()=>boxDimensionsFromMoments(1,2,4),RangeError));
