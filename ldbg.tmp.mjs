import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
const s = { canvas:null, createRadialGradient:()=>({addColorStop(){}}), createLinearGradient:()=>({addColorStop(){}}), fillRect(){}, beginPath(){}, arc(){}, ellipse(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, bezierCurveTo(){}, save(){}, restore(){}, translate(){}, scale(){}, rotate(){}, drawImage(){}, putImageData(){}, getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}), createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), setTransform(){}, clearRect(){}, fillText(){}, strokeText(){}, measureText:()=>({width:1}) };
const orig = dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext = function (t) { if (t === "2d") return { ...s, canvas: this }; return orig.call(this, t); };
const THREE = await import("three");
const tuning = await import("/home/user/CAT-PARTY/src/game/tuning.ts");
tuning.setShapeMode("asset");
const cm = await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const { animalById } = await import("/home/user/CAT-PARTY/src/game/animals.ts");
const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const root = new THREE.Group(); root.add(...v.all); root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos = v.mesh.geometry.attributes.position, col = v.mesh.geometry.attributes.color;
const rows = [];
for (let i = 0; i < pos.count; i++) {
  const p = new THREE.Vector3().fromBufferAttribute(pos, i);
  v.mesh.applyBoneTransform(i, p);
  if (p.x < 0.06 || p.x > 0.26) continue;
  if (p.y < -0.44 || p.y > -0.24) continue;
  rows.push([p.y, p.z, col.getX(i), col.getY(i), col.getZ(i)]);
}
rows.sort((a, b) => a[0] - b[0]);
const bins = new Map();
for (const r of rows) { const k = (Math.round(r[0] * 1000) / 1000); const cur = bins.get(k) ?? [0,0,0,0,0]; cur[0]++; cur[1]+=r[1]; cur[2]+=r[2]; cur[3]+=r[3]; cur[4]+=r[4]; bins.set(k, cur); }
for (const [k, c] of [...bins.entries()].sort((a,b)=>a[0]-b[0])) {
  const n = c[0];
  console.log(k.toFixed(3), "n", String(n).padStart(3), "z", (c[1]/n).toFixed(3), "rgb", (c[2]/n).toFixed(2), (c[3]/n).toFixed(2), (c[4]/n).toFixed(2));
}
