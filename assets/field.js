/* A lightweight parametric light field. Geometry lives on the GPU; no 3D library. */
(() => {
  'use strict';
  const canvas = document.getElementById('light-field');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { renderCanvasField(canvas); return; }
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
  if (!vertex || !fragment) { renderCanvasField(canvas); return; }
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); renderCanvasField(canvas); return; }
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
  function renderCanvasField(original) {
    // Canvas 2D uses the same parametric form on devices without WebGL.
    const field = original.cloneNode();
    original.replaceWith(field);
    const ctx = field.getContext('2d', { alpha: true });
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, last = 0, phase = 0.8, visible = true;
    let px = 0, py = 0, tx = 0, ty = 0;
    const compact = matchMedia('(max-width: 760px)').matches;
    const count = compact ? 35 : 56;
    const steps = compact ? 90 : 150;
    const tau = Math.PI * 2;
    const running = () => visible && !document.hidden && document.documentElement.dataset.motion !== 'paused';
    function paint() {
      ctx.clearRect(0, 0, w, h);
      px += (tx - px) * .08; py += (ty - py) * .08;
      const size = Math.min(w, h) * .24;
      const xrot = .80 + Math.sin(phase * .3) * .13 + py * .1;
      const yrot = .35 + Math.cos(phase * .4) * .15 + px * .12;
      const zrot = -.55 + Math.sin(phase * .2) * .12;
      const cx = Math.cos(xrot), sx = Math.sin(xrot), cy = Math.cos(yrot), sy = Math.sin(yrot), cz = Math.cos(zrot), sz = Math.sin(zrot);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = compact ? .8 : .85;
      for (let j = 0; j < count; j++) {
        const b = j / count * tau;
        const light = .14 + .44 * Math.pow(Math.max(0, Math.cos(b - phase * .3)), 4);
        ctx.strokeStyle = `rgba(239, ${Math.round(107 + 57 * (Math.sin(b) * .5 + .5))}, 67, ${light})`;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const a = i / steps * tau;
          const tube = .5 + .16 * Math.sin(a * 3 + phase);
          const orbit = 1.46 + .11 * Math.cos(a * 2 - phase);
          const twist = b + .48 * Math.sin(a * 2 + phase);
          let x = (orbit + tube * Math.cos(twist)) * Math.cos(a);
          let y = (orbit + tube * Math.cos(twist)) * Math.sin(a);
          let z = tube * Math.sin(twist) + .28 * Math.sin(a * 3 + phase * .7);
          const y1 = y * cx - z * sx; z = y * sx + z * cx; y = y1;
          const x1 = x * cy - z * sy; z = x * sy + z * cy; x = x1;
          const x2 = x * cz - y * sz; y = x * sz + y * cz; x = x2;
          const perspective = 3.6 / (4.5 - z);
          const dx = w * .5 + x * size * perspective;
          const dy = h * .5 - y * size * perspective;
          if (i === 0) ctx.moveTo(dx, dy); else ctx.lineTo(dx, dy);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    function resize() {
      const box = field.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = box.width; h = box.height;
      field.width = Math.round(w * dpr); field.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }
    function tick(now) {
      raf = 0;
      if (!running()) { last = 0; return; }
      if (!last || now - last >= 1000 / 24) {
        phase += last ? Math.min((now - last) / 1000, .1) * .12 : 0;
        last = now; paint();
      }
      raf = requestAnimationFrame(tick);
    }
    function resume() {
      if (running() && !raf) raf = requestAnimationFrame(tick);
      if (!running()) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }
    resize();
    field.classList.add('is-ready');
    field.parentElement.classList.add('has-webgl');
    field.dataset.render = 'canvas2d';
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(field);
    else addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }).observe(field);
    document.addEventListener('visibilitychange', resume);
    document.addEventListener('portfolio:motion', resume);
    if (matchMedia('(pointer: fine)').matches) document.querySelector('.hero')?.addEventListener('pointermove', event => {
      tx = (event.clientX / innerWidth - .5) * 2; ty = (event.clientY / innerHeight - .5) * 2;
    }, { passive: true });
    resume();
  }
})();
