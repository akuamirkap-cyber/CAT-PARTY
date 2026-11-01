import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
const ctxStub = { canvas: null, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, ellipse() {}, closePath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), setTransform() {}, clearRect() {}, fillText() {}, strokeText() {}, measureText: () => ({ width: 1 }) };
const orig = dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext = function (t) { if (t === "2d") return { ...ctxStub, canvas: this }; return orig.call(this, t); };
const THREE = await import("three");
const tuning = await import("/home/user/CAT-PARTY/src/game/tuning.ts");
tuning.setShapeMode("asset");
const cm = await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const { animalById } = await import("/home/user/CAT-PARTY/src/game/animals.ts");
const { CatModel } = await import("/home/user/CAT-PARTY/src/catasset/model.ts");
const { buildCat } = await import("/home/user/CAT-PARTY/src/catasset/build.ts");
const { SPECS } = await import("/home/user/CAT-PARTY/src/catasset/specs.ts");

const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const root = new THREE.Group(); root.add(...v.all); root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos = v.mesh.geometry.attributes.position;
const pts = [];
for (let i = 0; i < pos.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i); v.mesh.applyBoneTransform(i, p); if (p.x > 0.02) pts.push(p); }
let bot = 1e9, top = -1e9;
for (const p of pts) { bot = Math.min(bot, p.y); top = Math.max(top, p.y); }
const h = top - bot;
console.log("GAME height", h.toFixed(3));
const rows = [];
for (let y = bot + 0.002; y < bot + 0.30; y += 0.012) {
  let mx = 0, zmin = 9, zmax = -9, cnt = 0;
  for (const p of pts) if (Math.abs(p.y - y) < 0.008) { mx = Math.max(mx, p.x); zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); cnt++; }
  if (cnt) rows.push(`y+${(y - bot).toFixed(3)} (${((y - bot) / h).toFixed(3)}h) halfW ${(mx / h).toFixed(4)}  z ${zmin.toFixed(3)}..${zmax.toFixed(3)} depth ${((zmax - zmin) / h).toFixed(4)}`);
}
console.log(rows.join("\n"));

// ASSET
const b = buildCat(SPECS.oyen, 0.013);
const m = new CatModel(SPECS.oyen);
const P = b.body.positions;
const parts = { head: 0, torso: 0, arm: 0, leg: 0, ear: 0, tail: 0, armT: 0, armLat: 0, legLx: 0, earFrac: 0, earInner: 0, earFront: 0, tailS: 0 };
let amin = 1e9, amax = -1e9;
const foot = [];
for (let i = 0; i < P.length; i += 3) {
  const x = P[i], y = P[i+1], z = P[i+2];
  amin = Math.min(amin, y); amax = Math.max(amax, y);
  if (x <= 0) continue;
  m.parts(x, y, z, parts);
  const d = { head: parts.head, torso: parts.torso, arm: parts.arm, leg: parts.leg, ear: parts.ear, tail: parts.tail };
  let best = "torso", bd = 1e9;
  for (const k of Object.keys(d)) if (d[k] < bd) { bd = d[k]; best = k; }
  if (best === "leg") foot.push({ x, y, z });
}
const ah = amax - amin;
console.log("\nASSET height", ah.toFixed(3));
const arows = [];
for (let y = amin + 0.002; y < amin + 0.30; y += 0.012) {
  let mx = 0, zmin = 9, zmax = -9, cnt = 0;
  for (const p of foot) if (Math.abs(p.y - y) < 0.008) { mx = Math.max(mx, p.x); zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); cnt++; }
  if (cnt) arows.push(`y+${(y - amin).toFixed(3)} (${((y - amin) / ah).toFixed(3)}h) halfW ${(mx / ah).toFixed(4)}  z ${zmin.toFixed(3)}..${zmax.toFixed(3)} depth ${((zmax - zmin) / ah).toFixed(4)}`);
}
console.log(arows.join("\n"));
