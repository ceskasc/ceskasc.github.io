/* A lightweight parametric light field. Geometry lives on the GPU; no 3D library. */
(() => {
  'use strict';
  const canvas = document.getElementById('light-field');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return;
  const vertexSource = `
    attribute vec2 aParam;
    uniform float uTime;
    uniform float uAspect;
    uniform vec2 uPointer;
    varying float vLight;
    varying float vWarm;
    mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
    void main() {
      float a = aParam.x;
      float b = aParam.y;
      float pulse = uTime * 0.12;
      float tube = 0.50 + 0.16 * sin(a * 3.0 + pulse);
      float orbit = 1.46 + 0.11 * cos(a * 2.0 - pulse);
      float twist = b + 0.48 * sin(a * 2.0 + pulse);
      vec3 p = vec3((orbit + tube * cos(twist)) * cos(a), (orbit + tube * cos(twist)) * sin(a), tube * sin(twist));
      p.z += 0.28 * sin(a * 3.0 + pulse * 0.7);
      p.yz = rotate(0.80 + sin(pulse * 0.3) * 0.13 + uPointer.y * 0.10) * p.yz;
      p.xz = rotate(0.35 + cos(pulse * 0.4) * 0.15 + uPointer.x * 0.12) * p.xz;
      p.xy = rotate(-0.55 + sin(pulse * 0.2) * 0.12) * p.xy;
      float perspective = 3.6 / (4.5 - p.z);
      gl_Position = vec4(p.x * perspective * 0.49 / uAspect, p.y * perspective * 0.49, 0.0, 1.0);
      float band = pow(max(0.0, cos(b - a * 0.25 - pulse * 0.3)), 6.0);
      vLight = (0.08 + 0.46 * band) * (0.55 + 0.45 * (p.z + 1.3) / 2.6);
      vWarm = 0.5 + 0.5 * sin(a + b * 0.6);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying float vLight;
    varying float vWarm;
    void main() {
      vec3 copper = mix(vec3(0.71, 0.25, 0.09), vec3(1.0, 0.77, 0.46), vWarm);
      gl_FragColor = vec4(copper, vLight);
    }
  `;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
  gl.useProgram(program);
  const smallScreen = matchMedia('(max-width: 760px)').matches;
  const rings = smallScreen ? 42 : 76;
  const segments = smallScreen ? 130 : 210;
  const params = new Float32Array(rings * segments * 4);
  let offset = 0;
  for (let ring = 0; ring < rings; ring++) {
    for (let point = 0; point < segments; point++) {
      params[offset++] = point / segments * Math.PI * 2;
      params[offset++] = ring / rings * Math.PI * 2;
      params[offset++] = (point + 1) / segments * Math.PI * 2;
      params[offset++] = ring / rings * Math.PI * 2;
    }
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, params, gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'aParam');
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  const timeUniform = gl.getUniformLocation(program, 'uTime');
  const aspectUniform = gl.getUniformLocation(program, 'uAspect');
  const pointerUniform = gl.getUniformLocation(program, 'uPointer');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  let width = 0, height = 0, frame = 0, elapsed = 6, lastTime = 0, previousDraw = 0;
  let inView = true, lost = false;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const shouldAnimate = () => !lost && inView && !document.hidden && document.documentElement.dataset.motion !== 'paused';
  function size() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = Math.min(devicePixelRatio || 1, smallScreen ? 1.2 : 1.5);
    width = Math.round(box.width * ratio); height = Math.round(box.height * ratio);
    canvas.width = width; canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform1f(aspectUniform, width / height);
    draw();
  }
  function draw() {
    if (lost) return;
    pointerX += (targetX - pointerX) * 0.055;
    pointerY += (targetY - pointerY) * 0.055;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeUniform, elapsed);
    gl.uniform2f(pointerUniform, pointerX, pointerY);
    gl.drawArrays(gl.LINES, 0, params.length / 2);
  }
  function tick(now) {
    frame = 0;
    if (!shouldAnimate()) { lastTime = 0; return; }
    if (now - previousDraw >= 1000 / 30) {
      elapsed += lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
      lastTime = now; previousDraw = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (shouldAnimate() && !frame) frame = requestAnimationFrame(tick);
    else if (!shouldAnimate()) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  }
  size();
  canvas.classList.add('is-ready');
  canvas.parentElement.classList.add('has-webgl');
  canvas.dataset.render = 'webgl';
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
  else addEventListener('resize', size, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('portfolio:motion', sync);
  if (matchMedia('(pointer: fine)').matches) {
    document.querySelector('.hero')?.addEventListener('pointermove', event => {
      targetX = (event.clientX / innerWidth - 0.5) * 2;
      targetY = (event.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; sync();
    canvas.classList.remove('is-ready');
    canvas.parentElement.classList.remove('has-webgl');
    canvas.dataset.render = 'fallback';
  });
  sync();
})();
