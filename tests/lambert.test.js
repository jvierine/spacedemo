import test from 'node:test';
import assert from 'node:assert/strict';
import {AU_KM,COMET_IMPACT_DAY,DAY_SECONDS,SUN_MU_KM3_S2,cometImpactState,cross,earthState,hohmannEarthMars,magnitude,solveLambert,subtract} from '../js/lambert.js';

test('Lambert solver recovers a sixty-degree circular transfer',()=>{
  const r1=[AU_KM,0,0],angle=Math.PI/3,r2=[AU_KM*Math.cos(angle),AU_KM*Math.sin(angle),0],period=2*Math.PI*Math.sqrt(AU_KM**3/SUN_MU_KM3_S2),time=period/6;
  const solution=solveLambert(r1,r2,time),expected=[0,Math.sqrt(SUN_MU_KM3_S2/AU_KM),0];
  assert.ok(magnitude(subtract(solution.departureVelocity,expected))<1e-5);
});

test('Lambert solver keeps a prograde long-way transfer prograde',()=>{
  const angle=-Math.PI/3,r1=[AU_KM,0,0],r2=[AU_KM*Math.cos(angle),AU_KM*Math.sin(angle),0],solution=solveLambert(r1,r2,300*DAY_SECONDS);
  assert.ok(cross(r1,solution.departureVelocity)[2]>0);
});

test('Earth-Mars Hohmann transfer has the standard duration and excess speed',()=>{
  const transfer=hohmannEarthMars();
  assert.ok(transfer.timeDays>258&&transfer.timeDays<260);
  assert.ok(transfer.departureVInfinity>2.9&&transfer.departureVInfinity<3.0);
  assert.ok(transfer.arrivalVInfinity>2.6&&transfer.arrivalVInfinity<2.7);
});

test('lecture-note comet impacts the modeled Earth on day 2200',()=>{
  const comet=cometImpactState(),earth=earthState(COMET_IMPACT_DAY);
  assert.ok(magnitude(subtract(comet.position,earth.position))<1e-9);
  assert.ok(Math.abs(magnitude(comet.velocity)-Math.sqrt(15**2+28**2+28**2))<1e-12);
});
