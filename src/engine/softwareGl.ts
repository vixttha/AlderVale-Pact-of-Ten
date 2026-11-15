/** Software-GL detection shared by the world canvas and the tailor preview. */

const SOFTWARE_RENDERER =
  /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Paravirtual|Mesa OffScreen/i;

export function isSoftwareRendererString(renderer: string, webdriver = false): boolean {
  // Playwright WebKit on the hosted runner often hides UNMASKED_RENDERER.
  // Treat that as software only when a webdriver is driving the page, so a
  // privacy-restricted hardware browser keeps bloom and antialias.
  if (!renderer.trim()) return webdriver;
  return SOFTWARE_RENDERER.test(renderer);
}

export function probeSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return true;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const webdriver = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const soft = isSoftwareRendererString(name, webdriver);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return soft;
}
