import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARGON_IONIZATION_ENERGY_EV,
  ELEMENTARY_CHARGE_C,
  ELECTRON_MASS_KG,
  electronCyclotronFrequency,
  electronLarmorRadius,
  hallThrusterState,
  ionizationEnergyRemaining,
  singlyChargedIonSpeed
} from '../js/hall-thruster.js';

test('electron cyclotron and Larmor calculations use the radial magnetic field',()=>{
  const field=.02,energy=30;
  assert.ok(Math.abs(electronCyclotronFrequency(field)-ELEMENTARY_CHARGE_C*field/(2*Math.PI*ELECTRON_MASS_KG))<1e-6);
  assert.ok(electronLarmorRadius(energy,field)>.0008&&electronLarmorRadius(energy,field)<.0011);
});

test('argon ionization removes at least the first ionization energy from the incident electron',()=>{
  assert.equal(ionizationEnergyRemaining(30),30-ARGON_IONIZATION_ENERGY_EV);
  assert.equal(ionizationEnergyRemaining(10),0);
  const state=hallThrusterState({electronEnergyEv:30});
  assert.ok(state.electronMomentumAfter<state.electronMomentumBefore);
  assert.equal(state.canIonizeArgon,true);
});

test('ideal singly charged argon exhaust gains qV kinetic energy',()=>{
  const voltage=300,speed=singlyChargedIonSpeed(voltage),state=hallThrusterState({dischargeVoltageV:voltage});
  assert.ok(speed>38000&&speed<38200);
  assert.ok(Math.abs(speed-state.ionSpeedMs)<1e-12);
  assert.ok(state.idealSpecificImpulseS>3800&&state.idealSpecificImpulseS<3950);
});

test('crossed-field drift responds to electric and magnetic fields',()=>{
  const state=hallThrusterState({dischargeVoltageV:300,dischargeCurrentA:10,radialMagneticFieldT:.02,accelerationLengthM:.03});
  assert.equal(state.electricFieldVm,10000);
  assert.equal(state.exbDriftSpeedMs,500000);
  assert.equal(state.dischargePowerW,3000);
});
