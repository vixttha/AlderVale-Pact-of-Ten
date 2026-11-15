import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { clearSceneGroup, disposeScene } from './disposeScene.ts';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWizardGroup, type WizardMeshConfig } from './avatarMesh.ts';
import { mountRowanModel, type RowanModelKind } from './rowanModel.ts';
import { addOutlineToGroup, makeAnimeToonMaterial } from './animeShaders.ts';

interface AvatarPreview3DProps {
  config: WizardMeshConfig;
  className?: string;
  rowanModel?: RowanModelKind;
}

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({ config, className = '', rowanModel }) => {
  const [unavailable, setUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const avatarSlotRef = useRef<THREE.Group | null>(null);
  const fallbackRef = useRef<THREE.Group | null>(null);
  const updateModelRef = useRef<((delta: number) => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUnavailable(true);
      return;
    }
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Paravirtual/i.test(rendererStr);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth || 280, el.clientHeight || 340);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = environmentTarget.texture;
    roomEnv.dispose();

    const sun = new THREE.DirectionalLight('#fff2d6', 2.05);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight('#c8e6ff', '#7b6855', 0.8));

    const pedestal = new THREE.Group();
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.88, 0.14, 24),
      makeAnimeToonMaterial({ color: '#dfd3bd', rimColor: '#fff4d4', rimStrength: 0.25 }),
    );
    plinth.position.y = -0.07;
    const runeTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.77, 0.025, 6, 24),
      makeAnimeToonMaterial({ color: '#d4a13e', rimStrength: 0.4 }),
    );
    runeTrim.rotation.x = Math.PI / 2;
    pedestal.add(plinth, runeTrim);
    addOutlineToGroup(pedestal, 1.03);
    scene.add(pedestal);

    const avatarSlot = new THREE.Group();
    const fallback = new THREE.Group();
    avatarSlot.add(fallback);
    fallbackRef.current = fallback;
    scene.add(avatarSlot);
    avatarSlotRef.current = avatarSlot;

    const camera = new THREE.PerspectiveCamera(38, (el.clientWidth || 280) / (el.clientHeight || 340), 0.1, 40);
    camera.position.set(0, 1.32, 3.35);
    camera.lookAt(0, 0.96, 0);

    let disposed = false;
    let rafId = 0;
    let timeoutId = 0;
    let pendingFence: WebGLSync | null = null;
    let angle = 0.25;
    let lastDraw = performance.now();

    function afterDraw(cb: () => void) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      pendingFence = sync;
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          pendingFence = null;
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          pendingFence = null;
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    function renderLoop() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.12, (now - lastDraw) / 1000);
      lastDraw = now;
      updateModelRef.current?.(delta);
      angle += delta * 0.84;
      avatarSlot.rotation.y = Math.sin(angle) * 0.65;
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(renderLoop);
      else rafId = requestAnimationFrame(renderLoop);
    }

    if (isSoftwareGl) afterDraw(renderLoop);
    else rafId = requestAnimationFrame(renderLoop);

    const ro = new ResizeObserver(() => {
      if (!el) return;
      const w = el.clientWidth || 280;
      const h = el.clientHeight || 340;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(el);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      if (pendingFence) gl.deleteSync(pendingFence);
      pendingFence = null;
      ro.disconnect();
      avatarSlotRef.current = null;
      fallbackRef.current = null;
      disposeScene(scene);
      environmentTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const fallback = fallbackRef.current;
    if (!fallback) return;
    clearSceneGroup(fallback);
    fallback.add(buildWizardGroup(config));
  }, [config]);

  useEffect(() => {
    const slot = avatarSlotRef.current;
    const fallback = fallbackRef.current;
    const el = containerRef.current;
    if (!rowanModel || !slot || !fallback || !el) return;
    return mountRowanModel(slot, fallback, el, rowanModel, (model) => {
      updateModelRef.current = model?.update ?? null;
    });
  }, [rowanModel]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {unavailable && <div role="status" className="flex h-full min-h-24 items-center justify-center px-4 text-center text-sm">3D preview unavailable</div>}
    </div>
  );
};
