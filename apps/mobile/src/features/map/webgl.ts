let cache: boolean | null = null;

export function isWebglSupported(): boolean {
  if (cache !== null) return cache;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cache = Boolean(gl);
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cache = false;
  }
  return cache;
}
