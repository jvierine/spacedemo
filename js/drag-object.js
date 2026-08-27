export const ALUMINIUM_DENSITY_KG_M3 = 2700;
export const FIXED_DRAG_COEFFICIENT = 2.2;

export function sphereAreaToMass(diameterCm, densityKgM3 = ALUMINIUM_DENSITY_KG_M3) {
  const diameterM = diameterCm / 100;
  return 3 / (2 * densityKgM3 * diameterM);
}

export function sphereDiameterCm(areaToMass, densityKgM3 = ALUMINIUM_DENSITY_KG_M3) {
  return 300 / (2 * densityKgM3 * areaToMass);
}

export function sphereMassKg(diameterCm, densityKgM3 = ALUMINIUM_DENSITY_KG_M3) {
  const radiusM = diameterCm / 200;
  return densityKgM3 * 4 * Math.PI * radiusM ** 3 / 3;
}
