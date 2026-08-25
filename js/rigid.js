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
