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
  ? { a: '#6C9BFF', b: '#38C8F0', c: '#35D989' }
  : { a: '#1F4FD8', b: '#17A2D8', c: '#18A957' };
