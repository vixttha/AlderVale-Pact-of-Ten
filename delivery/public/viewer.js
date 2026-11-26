import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const status=document.getElementById("status"), panel=document.getElementById("stage");
let renderer,scene,camera,controls,model,center,radius;
window.aagp={ready:false};
function render(){renderer.render(scene,camera);}
function resize(){if(!renderer)return;const w=panel.clientWidth,h=panel.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
function orient(v){camera.position.copy(center).add(new THREE.Vector3(...v).normalize().multiplyScalar(radius*3.6));controls.target.copy(center);camera.up.set(0,1,0);controls.update();render();}
async function run(){
  renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));panel.appendChild(renderer.domElement);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x202831);
  camera=new THREE.PerspectiveCamera(42,1,0.001,1000);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.addEventListener("change",render);
  scene.add(new THREE.HemisphereLight(0xffffff,0x4a4b50,2.2));
  for(const [p,i] of [[[3,5,4],3],[[-4,2,-3],1.8]]){const light=new THREE.DirectionalLight(0xffffff,i);light.position.set(...p);scene.add(light);}
  const b64=document.getElementById("model-data").textContent.trim(), bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer,"");
  model=gltf.scene;scene.add(model);
  const box=new THREE.Box3().setFromObject(model);center=box.getCenter(new THREE.Vector3());radius=box.getBoundingSphere(new THREE.Sphere()).radius;
  if(!(radius>0&&Number.isFinite(radius)))throw Error("invalid model bounds");
  let triangles=0,textured=0;model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.material.map)textured++;}});
  if(!triangles||!textured)throw Error("no textured triangles");
  camera.near=radius/100;camera.far=radius*100;camera.updateProjectionMatrix();
  controls.minDistance=radius*1.1;controls.maxDistance=radius*12;
  const dirs={front:[0,0,1],rear:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0.0001],underside:[0,-1,0.0001],"three-quarter":[2.8,2,4]};
  for(const btn of document.querySelectorAll("[data-view]"))btn.addEventListener("click",()=>orient(dirs[btn.dataset.view]));
  resize();orient(dirs["three-quarter"]);
  window.addEventListener("resize",resize);
  window.aagp={ready:true,triangles,texturedMeshes:textured,camera:()=>camera.position.toArray(),render};
  status.textContent=triangles.toLocaleString()+" triangles · embedded texture · drag to orbit, scroll to zoom";
}
run().catch(e=>{status.textContent="Viewer error: "+e.message;window.aagp.error=e.message;console.error(e);});
