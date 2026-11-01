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

const isWhite = (r, g, b) => r > 0.55 && Math.abs(r - g) < 0.16 && g > b - 0.05;
const isStripe = (r, g, b) => r > 0.2 && r < 0.62 && g < 0.34;

// ---------- GAME ----------
const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const root = new THREE.Group(); root.add(...v.all); root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos = v.mesh.geometry.attributes.position;
const col = v.mesh.geometry.attributes.color;
const nrm = v.mesh.geometry.attributes.normal;
const gp = [];
for (let i = 0; i < pos.count; i++) {
  const p = new THREE.Vector3().fromBufferAttribute(pos, i);
  v.mesh.applyBoneTransform(i, p);
  gp.push({ x: p.x, y: p.y, z: p.z, r: col.getX(i), g: col.getY(i), b: col.getZ(i) });
}
let gbot = 1e9, gtop = -1e9;
for (const p of gp) { gbot = Math.min(gbot, p.y); gtop = Math.max(gtop, p.y); }
const gh = gtop - gbot;

// leg column only: right leg, lateral side, below the hip
const legSel = (p) => p.x > 0.055 && p.y < gbot + 0.42 * gh;
const gLeg = gp.filter(legSel);
const gWhite = gLeg.filter((p) => isWhite(p.r, p.g, p.b));
const gStripe = gLeg.filter((p) => isStripe(p.r, p.g, p.b));
const rel = (y) => (y - gbot) / gh;
const rng = (arr) => arr.length ? [Math.min(...arr.map((p) => rel(p.y))), Math.max(...arr.map((p) => rel(p.y)))] : null;
console.log("GAME  height", gh.toFixed(3), "leg verts", gLeg.length);
console.log("  white rel-y", rng(gWhite)?.map((n) => n.toFixed(3)).join(".."), " count", gWhite.length);
console.log("  stripe rel-y", rng(gStripe)?.map((n) => n.toFixed(3)).join(".."), " count", gStripe.length);
// per-band stripe histogram
const hs = new Map();
for (const p of gStripe) { const k = Math.round(rel(p.y) * 100); hs.set(k, (hs.get(k) ?? 0) + 1); }
console.log("  stripe bands (rel%: n)", [...hs.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}:${n}`).join(" "));
// white boundary waviness across the leg surface
const wb = new Map();
for (const p of gWhite) { const k = Math.round(rel(p.y) * 1000); wb.set(k, 1); }
const top = Math.max(...gWhite.map((p) => rel(p.y)));
console.log("  white top rel", top.toFixed(3));
// boundary y as function of z (front/back) at the lateral surface
const rows = [];
for (const zc of [-0.06, -0.03, 0, 0.03, 0.06, 0.09]) {
  const sel = gLeg.filter((p) => Math.abs(p.z - zc) < 0.012 && Math.abs(p.x - Math.max(...gLeg.filter((q) => Math.abs(q.z - zc) < 0.012).map((q) => q.x))) < 0.02);
  const w = sel.filter((p) => isWhite(p.r, p.g, p.b));
  const o = sel.filter((p) => !isWhite(p.r, p.g, p.b));
  if (w.length && o.length) rows.push(`z ${zc.toFixed(2)} whiteTop ${rel(Math.max(...w.map((p) => p.y))).toFixed(3)} orangeBot ${rel(Math.min(...o.map((p) => p.y))).toFixed(3)}`);
}
console.log("  " + rows.join("\n  "));

// ---------- ASSET ----------
const b = buildCat(SPECS.oyen, 0.013);
const m = new CatModel(SPECS.oyen);
const P = b.body.positions, C = b.body.colors;
const parts = { head: 0, torso: 0, arm: 0, leg: 0, ear: 0, tail: 0, armT: 0, armLat: 0, legLx: 0, earFrac: 0, earInner: 0, earFront: 0, tailS: 0 };
let amin = 1e9, amax = -1e9;
const aLeg = [];
for (let i = 0; i < P.length; i += 3) {
  const x = P[i], y = P[i + 1], z = P[i + 2];
  amin = Math.min(amin, y); amax = Math.max(amax, y);
  if (x <= 0) continue;
  m.parts(x, y, z, parts);
  const d = { head: parts.head, torso: parts.torso, arm: parts.arm, leg: parts.leg, ear: parts.ear, tail: parts.tail };
  let best = "torso", bd = 1e9;
  for (const k of Object.keys(d)) if (d[k] < bd) { bd = d[k]; best = k; }
  if (best === "leg") aLeg.push({ x, y, z, r: C[i], g: C[i + 1], b: C[i + 2] });
}
const ah = amax - amin;
const arel = (y) => (y - amin) / ah;
const aWhite = aLeg.filter((p) => isWhite(p.r, p.g, p.b));
const aStripe = aLeg.filter((p) => isStripe(p.r, p.g, p.b));
console.log("\nASSET height", ah.toFixed(3), "leg verts", aLeg.length);
console.log("  white rel-y", rng(aWhite)?.map((n) => n.toFixed(3)).join(".."), " count", aWhite.length);
const aRelArr = (arr) => arr.map((p) => arel(p.y));
console.log("  white rel-y exact", Math.min(...aRelArr(aWhite)).toFixed(3), Math.max(...aRelArr(aWhite)).toFixed(3));
console.log("  stripe rel-y exact", Math.min(...aRelArr(aStripe)).toFixed(3), Math.max(...aRelArr(aStripe)).toFixed(3), "n", aStripe.length);
const ahs = new Map();
for (const y of aRelArr(aStripe)) { const k = Math.round(y * 100); ahs.set(k, (ahs.get(k) ?? 0) + 1); }
console.log("  stripe bands (rel%: n)", [...ahs.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}:${n}`).join(" "));
