import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustMomentsForPhysicalBox, boxDimensionsFromMoments, eulerCoefficients, initialAngularVelocity, relativeBoxMoments, torqueFreeDerivative } from '../js/rigid.js';

test('box dimensions reproduce principal moment ratios',()=>{
  const target=[2.5,3.5,4.5],dimensions=boxDimensionsFromMoments(...target),moments=relativeBoxMoments(dimensions),ratio=moments[0]/target[0];
  target.forEach((value,index)=>assert.ok(Math.abs(moments[index]-value*ratio)<1e-12));
});

test('larger dimension corresponds to smaller axial moment',()=>{
  const [x,y,z]=boxDimensionsFromMoments(2.5,3.5,4.5);
  assert.ok(x>y&&y>z);
});

test('nonphysical moments are rejected',()=>assert.throws(()=>boxDimensionsFromMoments(1,2,4),RangeError));

test('equal moments produce a symmetric body and constant angular velocity',()=>{
  const dimensions=boxDimensionsFromMoments(4,4,4),derivative=torqueFreeDerivative([4,4,4],[.2,1.3,-.4]);
  assert.ok(dimensions.every(value=>Math.abs(value-dimensions[0])<1e-14));
  assert.ok(derivative.every(value=>Math.abs(value)===0));
});

test('changing moments immediately changes Euler coefficients and derivative',()=>{
  const omega=[.06,1.4,.0378],before=torqueFreeDerivative([2.5,3.5,4.5],omega),after=torqueFreeDerivative([3,3.5,4.5],omega);
  assert.notDeepEqual(eulerCoefficients(2.5,3.5,4.5),eulerCoefficients(3,3.5,4.5));
  assert.notDeepEqual(before,after);
});

test('Euler derivative conserves rotational energy instantaneously',()=>{
  const moments=[2.5,3.5,4.5],omega=[.12,1.4,.08],derivative=torqueFreeDerivative(moments,omega);
  const energyRate=moments.reduce((sum,moment,index)=>sum+moment*omega[index]*derivative[index],0);
  assert.ok(Math.abs(energyRate)<1e-14);
});

test('initial spin can be assigned to any principal axis',()=>{
  assert.deepEqual(initialAngularVelocity(0,1.4,.06),[1.4,.0378,.0378]);
  assert.deepEqual(initialAngularVelocity(1,1.4,.06),[.06,1.4,.0378]);
  assert.deepEqual(initialAngularVelocity(2,1.4,.06),[.06,.0378,1.4]);
  assert.throws(()=>initialAngularVelocity(3,1.4,.06),RangeError);
});

test('edited moment keeps its full range while other moments preserve a physical box',()=>{
  for(const editedIndex of [0,1,2])for(const requested of [1,5,9])for(const otherA of [1,5,9])for(const otherB of [1,5,9]){
    const moments=[otherA,otherB,otherB];moments[editedIndex]=requested;
    const adjusted=adjustMomentsForPhysicalBox(moments,editedIndex);
    assert.equal(adjusted[editedIndex],requested);
    assert.doesNotThrow(()=>boxDimensionsFromMoments(...adjusted));
  }
});
