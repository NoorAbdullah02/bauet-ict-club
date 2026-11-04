let cached;

export function hasWebGL() {
  if (cached !== undefined) return cached;
  try {
    const c = document.createElement('canvas');
    cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

export const palette = (dark) => dark
  ? { a: '#9A88FF', b: '#3DE3FF', c: '#FF7AE0' }
  : { a: '#2B3DFF', b: '#0B7A75', c: '#E0338F' };
