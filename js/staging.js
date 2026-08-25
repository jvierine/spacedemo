export const STANDARD_GRAVITY = 9.80665;

export function stageDeltaV(stage, upperMassKg) {
  const propellant = Math.max(0, stage.wetKg - stage.dryKg);
  const m0 = upperMassKg + stage.wetKg;
  const mf = m0 - propellant;
  return stage.ispS * STANDARD_GRAVITY * Math.log(m0 / mf);
}

export function stagingBudget(stages, payloadKg, targetMps) {
  const deltas = stages.map((stage, index) => {
    const upperMass = payloadKg + stages.slice(index + 1).reduce((sum, upper) => sum + upper.wetKg, 0);
    return stageDeltaV(stage, upperMass);
  });
  const lowerDeltaV = deltas.slice(0, -1).reduce((sum, value) => sum + value, 0);
  return {
    deltas,
    lowerDeltaV,
    finalRequired: Math.max(0, targetMps - lowerDeltaV),
    finalAvailable: deltas.at(-1),
    total: deltas.reduce((sum, value) => sum + value, 0)
  };
}
