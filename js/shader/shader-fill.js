/*!
 * shader-fill.js — Figma 셰이더 런타임(ShaderFill) 바닐라 JS 포팅
 * 원본: Figma MCP shader-runtime (components/ShaderFill.tsx, useShaderRuntime.ts, webgpu.ts)
 *
 * - 절차적(procedural) 셰이더만 지원 (DOM 을 텍스처로 쓰는 ShaderEffect 는 이 화면에 없음)
 * - WebGPU 를 지원하지 않는 브라우저에서는 원본과 동일하게 캔버스를 제거(표시 안 함)
 *
 * React 이식 시: Figma 가 제공하는 원본 ShaderFill 컴포넌트를 그대로 쓰면 됩니다.
 *
 * 사용법: PB.ShaderFill.mount(canvasElement, shader)
 *   shader = { setup(device, frame), render(device, frame), params, manifest }
 */
(function (window) {
  'use strict';

  var DEFAULT_MANIFEST = { version: 2, isAnimated: false, usesMouse: false, name: '' };

  /* ---------- 공유 GPU 디바이스 (webgpu.ts) ---------- */
  var devicePromise = null;
  function acquireDevice() {
    if (!devicePromise) {
      devicePromise = (async function () {
        var gpu = navigator.gpu;
        if (!gpu) throw new Error('WebGPU unsupported.');
        var adapter = await gpu.requestAdapter();
        if (!adapter) throw new Error('Failed to get WebGPU adapter.');
        return adapter.requestDevice();
      })();
      devicePromise.catch(function () { devicePromise = null; });
    }
    return devicePromise;
  }

  /* ---------- RuntimeState (useShaderRuntime.ts) ---------- */
  function RuntimeState(gpu, input) {
    this.gpu = gpu;
    this.input = input;
    this.output = null;
    this.shaderData = [];
    this.intermediateTextures = [];
    this._time = 0;
    this._deltaTime = 0;
    this._frame = 0;
    this._mousePosition = { x: 0, y: 0, down: false };
    this.isAnimated = false;
    this.usesMouse = false;
  }

  RuntimeState.prototype.getShaderState = function (index) {
    var renderScale = window.devicePixelRatio || 1;
    return {
      gpu: this.gpu,
      input: index === 0 ? this.input : this.intermediateTextures[index % 2],
      output: index === this.shaderData.length - 1 ? this.output : this.intermediateTextures[(index + 1) % 2],
      time: this._time,
      deltaTime: this._deltaTime,
      frame: this._frame,
      mousePosition: this._mousePosition,
      renderScale: renderScale,
      params: this.shaderData[index].shader.params,
      state: this.shaderData[index].state
    };
  };

  RuntimeState.prototype.createIntermediateTexture = function (input) {
    return this.gpu.device.createTexture({
      size: [input.width, input.height, 1],
      format: this.gpu.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
  };

  RuntimeState.prototype.updateIntermediateTextures = function () {
    if (!this.input) return;
    var w = this.input.width;
    var h = this.input.height;
    var cur = this.intermediateTextures;
    if (cur[0] && cur[0].width === w && cur[0].height === h) return;
    cur.forEach(function (t) { t.destroy(); });
    this.intermediateTextures = [this.createIntermediateTexture(this.input), this.createIntermediateTexture(this.input)];
  };

  function createInputTexture(device, canvas, format) {
    return device.createTexture({
      size: [canvas.width, canvas.height, 1],
      format: format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  /* ---------- mount ---------- */
  function mount(canvas, shader) {
    var shaders = [shader];
    var runtime = null;
    var setupComplete = false;
    var raf = null;
    var lastTs = null;
    var observer = null;

    function fail(e) {
      console.warn('[ShaderFill] 셰이더를 표시할 수 없어요 — 배경색으로 대체됩니다.', e);
      stopClock();
      if (observer) observer.disconnect();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);   // 원본과 동일: 에러 시 렌더 안 함
    }

    function renderCore() {
      if (!setupComplete || !runtime || !runtime.input) return;
      try {
        runtime.updateIntermediateTextures();
        runtime.output = runtime.gpu.context.getCurrentTexture();
        shaders.forEach(function (effect, idx) {
          effect.render(runtime.gpu.device, runtime.getShaderState(idx));
        });
      } catch (e) {
        console.warn('Failed to render effect', e);
        return;
      }
      if (runtime.isAnimated) startClock(); else stopClock();
    }

    function startClock() {
      if (raf != null) return;
      lastTs = null;
      var tick = function (ts) {
        if (!runtime) { raf = null; return; }
        raf = requestAnimationFrame(tick);
        runtime._deltaTime = lastTs == null ? 0 : ts - lastTs;
        lastTs = ts;
        runtime._time += runtime._deltaTime;
        runtime._frame += 1;
        renderCore();
      };
      raf = requestAnimationFrame(tick);
    }

    function stopClock() {
      if (raf != null) { cancelAnimationFrame(raf); raf = null; }
      lastTs = null;
    }

    acquireDevice().then(function (device) {
      // 컨텍스트 설정 + 입력 텍스처
      var context = canvas.getContext('webgpu');
      if (!context) throw new Error('Failed to get WebGPU context.');
      var format = 'rgba8unorm';
      context.configure({ device: device, format: format, alphaMode: 'premultiplied' });
      var rect = canvas.getBoundingClientRect();
      var scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(Math.round(rect.width * scale), 1);
      canvas.height = Math.max(Math.round(rect.height * scale), 1);
      runtime = new RuntimeState({ device: device, context: context, format: format }, createInputTexture(device, canvas, format));

      // 셰이더 setup
      runtime.isAnimated = shaders.some(function (s) { return (s.manifest || DEFAULT_MANIFEST).isAnimated; });
      runtime.usesMouse = shaders.some(function (s) { return (s.manifest || DEFAULT_MANIFEST).usesMouse; });
      runtime.shaderData = shaders.map(function (s) { return { shader: s, state: {} }; });
      runtime.updateIntermediateTextures();
      shaders.forEach(function (s, idx) { s.setup(runtime.gpu.device, runtime.getShaderState(idx)); });
      setupComplete = true;
      renderCore();

      // 크기 변경 시 해상도 맞춰 다시 그리기
      observer = new ResizeObserver(function (entries) {
        var s = window.devicePixelRatio || 1;
        entries.forEach(function (entry) {
          var size = entry.contentBoxSize && entry.contentBoxSize[0];
          canvas.width = Math.max(Math.round(((size && size.inlineSize) || entry.contentRect.width) * s), 1);
          canvas.height = Math.max(Math.round(((size && size.blockSize) || entry.contentRect.height) * s), 1);
        });
        if (!runtime) return;
        if (runtime.input) runtime.input.destroy();
        try {
          runtime.input = createInputTexture(runtime.gpu.device, canvas, runtime.gpu.format);
          runtime.updateIntermediateTextures();
        } catch (e) { fail(e); return; }
        renderCore();
      });
      try { observer.observe(canvas, { box: 'device-pixel-content-box' }); }
      catch (e) { observer.observe(canvas); }
    }).catch(fail);

    return {
      destroy: function () {
        stopClock();
        if (observer) observer.disconnect();
        if (runtime) {
          if (runtime.input) runtime.input.destroy();
          runtime.intermediateTextures.forEach(function (t) { t.destroy(); });
          runtime = null;
        }
      }
    };
  }

  window.PB = window.PB || {};
  window.PB.ShaderFill = { mount: mount };
})(window);
