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

export function initialAngularVelocity(spinAxis, spin, perturbation) {
  if (![0, 1, 2].includes(spinAxis)) throw new RangeError('spin axis must be 0, 1, or 2');
  const omega = [perturbation, perturbation * .63, perturbation * .63];
  omega[spinAxis] = spin;
  return omega;
}

export function adjustMomentsForPhysicalBox(moments, editedIndex, step = .5, minimum = 1, maximum = 9) {
  if (![0, 1, 2].includes(editedIndex)) throw new RangeError('edited index must be 0, 1, or 2');
  const otherIndices = [0, 1, 2].filter(index => index !== editedIndex);
  let best = null;
  for (let first = minimum; first <= maximum + step / 2; first += step) {
    for (let second = minimum; second <= maximum + step / 2; second += step) {
      const candidate = [...moments];candidate[otherIndices[0]] = first;candidate[otherIndices[1]] = second;
      try { boxDimensionsFromMoments(...candidate); } catch { continue; }
      const cost = (first - moments[otherIndices[0]]) ** 2 + (second - moments[otherIndices[1]]) ** 2;
      if (!best || cost < best.cost) best = { moments: candidate, cost };
    }
  }
  if (!best) throw new RangeError('no physical moment combination exists in the requested range');
  return best.moments;
}
