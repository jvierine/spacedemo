export const ELEMENTARY_CHARGE_C = 1.602176634e-19;
export const ELECTRON_MASS_KG = 9.1093837139e-31;
export const ATOMIC_MASS_UNIT_KG = 1.66053906892e-27;
export const ARGON_ATOMIC_MASS_U = 39.948;
export const ARGON_ION_MASS_KG = ARGON_ATOMIC_MASS_U * ATOMIC_MASS_UNIT_KG;
export const ARGON_IONIZATION_ENERGY_EV = 15.7596119;
export const STANDARD_GRAVITY_M_S2 = 9.80665;

const positive = (value, name) => {
  if (!(value > 0)) throw new RangeError(`${name} must be positive`);
  return value;
};

export const electronSpeed = energyEv => Math.sqrt(2 * ELEMENTARY_CHARGE_C * positive(energyEv, 'electron energy') / ELECTRON_MASS_KG);
export const electronMomentum = energyEv => ELECTRON_MASS_KG * electronSpeed(energyEv);
export const electronCyclotronAngularFrequency = magneticFieldT => ELEMENTARY_CHARGE_C * positive(magneticFieldT, 'magnetic field') / ELECTRON_MASS_KG;
export const electronCyclotronFrequency = magneticFieldT => electronCyclotronAngularFrequency(magneticFieldT) / (2 * Math.PI);
export const electronLarmorRadius = (energyEv, magneticFieldT) => electronSpeed(energyEv) / electronCyclotronAngularFrequency(magneticFieldT);
export const exbDriftSpeed = (electricFieldVm, magneticFieldT) => positive(electricFieldVm, 'electric field') / positive(magneticFieldT, 'magnetic field');
export const singlyChargedIonSpeed = (voltageV, ionMassKg = ARGON_ION_MASS_KG) => Math.sqrt(2 * ELEMENTARY_CHARGE_C * positive(voltageV, 'voltage') / positive(ionMassKg, 'ion mass'));
export const ionizationEnergyRemaining = energyEv => Math.max(0, energyEv - ARGON_IONIZATION_ENERGY_EV);

export function hallThrusterState({
  dischargeVoltageV = 300,
  dischargeCurrentA = 10,
  radialMagneticFieldT = .02,
  electronEnergyEv = 30,
  accelerationLengthM = .03
} = {}) {
  const electricFieldVm = positive(dischargeVoltageV, 'discharge voltage') / positive(accelerationLengthM, 'acceleration length');
  const postCollisionEnergyEv = ionizationEnergyRemaining(electronEnergyEv);
  const ionSpeedMs = singlyChargedIonSpeed(dischargeVoltageV);
  return {
    dischargeVoltageV,
    dischargeCurrentA: positive(dischargeCurrentA, 'discharge current'),
    dischargePowerW: dischargeVoltageV * positive(dischargeCurrentA, 'discharge current'),
    radialMagneticFieldT,
    electronEnergyEv,
    accelerationLengthM,
    electricFieldVm,
    cyclotronAngularFrequency: electronCyclotronAngularFrequency(radialMagneticFieldT),
    cyclotronFrequencyHz: electronCyclotronFrequency(radialMagneticFieldT),
    exbDriftSpeedMs: exbDriftSpeed(electricFieldVm, radialMagneticFieldT),
    electronLarmorRadiusM: electronLarmorRadius(electronEnergyEv, radialMagneticFieldT),
    electronMomentumBefore: electronMomentum(electronEnergyEv),
    postCollisionEnergyEv,
    electronMomentumAfter: postCollisionEnergyEv > 0 ? electronMomentum(postCollisionEnergyEv) : 0,
    ionSpeedMs,
    idealSpecificImpulseS: ionSpeedMs / STANDARD_GRAVITY_M_S2,
    canIonizeArgon: electronEnergyEv >= ARGON_IONIZATION_ENERGY_EV
  };
}
