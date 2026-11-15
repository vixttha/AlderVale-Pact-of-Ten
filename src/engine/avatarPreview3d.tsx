import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWizardGroup, type WizardMeshConfig } from './avatarMesh.ts';
import { addOutlineToGroup, makeAnimeToonMaterial } from './animeShaders.ts';
import { probeSoftwareGl } from './softwareGl.ts';

interface AvatarPreview3DProps {
  config: WizardMeshConfig;
  className?: string;
}

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({ config, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const avatarSlotRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isSoftwareGl = probeSoftwareGl();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: isSoftwareGl ? 'low-power' : 'high-performance',
    });
    renderer.domElement.dataset.softwareGl = isSoftwareGl ? '1' : '0';
    const gl = renderer.getContext() as WebGL2RenderingContext;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth || 280, el.clientHeight || 340);
    renderer.toneMapping = isSoftwareGl ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = isSoftwareGl ? null : new THREE.PMREMGenerator(renderer);
    if (pmrem) {
      const roomEnv = new RoomEnvironment();
      scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();
    }

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
    avatarSlot.add(buildWizardGroup(config));
    scene.add(avatarSlot);
    avatarSlotRef.current = avatarSlot;

    const camera = new THREE.PerspectiveCamera(38, (el.clientWidth || 280) / (el.clientHeight || 340), 0.1, 40);
    camera.position.set(0, 1.32, 3.35);
    camera.lookAt(0, 0.96, 0);

    let disposed = false;
    let rafId = 0;
    let timeoutId = 0;
    let angle = 0.25;

    function afterDraw(cb: () => void) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    function renderLoop() {
      if (disposed) return;
      angle += 0.014;
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
      ro.disconnect();
      avatarSlotRef.current = null;
      pmrem?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const slot = avatarSlotRef.current;
    if (!slot) return;
    slot.clear();
    slot.add(buildWizardGroup(config));
  }, [config]);

  return <div ref={containerRef} className={`w-full h-full ${className}`} />;
};
