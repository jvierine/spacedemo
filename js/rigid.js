export function boxDimensionsFromMoments(ix, iy, iz) {
  const squared = [iy + iz - ix, ix + iz - iy, ix + iy - iz];
  if (squared.some(value => value <= 0)) throw new RangeError('moments must satisfy the rigid-body triangle inequalities');
  const dimensions = squared.map(Math.sqrt);
  const scale = 1.9 / Math.max(...dimensions);
  return dimensions.map(value => value * scale);
}

export function relativeBoxMoments([x, y, z]) {
  return [y * y + z * z, x * x + z * z, x * x + y * y];
}

export function eulerCoefficients(ix, iy, iz) {
  return [(iy - iz) / ix, (iz - ix) / iy, (ix - iy) / iz];
}

export function torqueFreeDerivative([ix, iy, iz], [wx, wy, wz]) {
  const [c1, c2, c3] = eulerCoefficients(ix, iy, iz);
  return [c1 * wy * wz, c2 * wz * wx, c3 * wx * wy];
}
