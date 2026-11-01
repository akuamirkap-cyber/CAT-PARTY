import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
const orig = dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext = function (t) { if (t === "2d") return { canvas: this, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, ellipse() {}, closePath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w*h*4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w*h*4) }), setTransform() {}, clearRect() {} }; return orig.call(this, t); };
const THREE = await import("three");
const tuning = await import("/home/user/CAT-PARTY/src/game/tuning.ts");
tuning.setShapeMode("asset");
const cm = await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const { animalById } = await import("/home/user/CAT-PARTY/src/game/animals.ts");
const { CatModel } = await import("/home/user/CAT-PARTY/src/catasset/model.ts");
const { buildCat } = await import("/home/user/CAT-PARTY/src/catasset/build.ts");
const { SPECS } = await import("/home/user/CAT-PARTY/src/catasset/specs.ts");
const N = 10;

const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const root = new THREE.Group(); root.add(...v.all); root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos = v.mesh.geometry.attributes.position;
const P = [];
for (let i = 0; i < pos.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i); v.mesh.applyBoneTransform(i, p); P.push(p); }
const gys = P.map(p => p.y); const gbot = Math.min(...gys), gtop = Math.max(...gys); const gh = gtop - gbot;
function prof(points, bot, h, lo, hi, label) {
  const out = [];
  for (let i = 0; i <= N; i++) {
    const t = lo + ((hi - lo) * i) / N;
    const y = bot + t * h;
    let mnx = 9, mxx = -9, mnz = 9, mxz = -9, n = 0;
    for (const p of points) if (Math.abs(p.y - y) < 0.006) { mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x); mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z); n++; }
    out.push(n ? `${t.toFixed(3)} in ${(mnx/h).toFixed(3)} out ${(mxx/h).toFixed(3)} z ${(mnz/h).toFixed(3)}..${(mxz/h).toFixed(3)}` : `${t.toFixed(3)} --`);
  }
  console.log(label + " h=" + h.toFixed(3) + "\n  " + out.join("\n  "));
}
prof(P.filter(p => p.x > 0.02), gbot, gh, 0.0, 0.16, "GAME leg");

const b = buildCat(SPECS.oyen, 0.013);
const m = new CatModel(SPECS.oyen);
const posA = b.body.positions;
const parts = { head: 0, torso: 0, arm: 0, leg: 0, ear: 0, tail: 0, armT: 0, armLat: 0, legLx: 0, earFrac: 0, earInner: 0, earFront: 0, tailS: 0 };
let amin = 1e9, amax = -1e9;
const A = [];
for (let i = 0; i < posA.length; i += 3) {
  const x = posA[i], y = posA[i+1], z = posA[i+2];
  amin = Math.min(amin, y); amax = Math.max(amax, y);
}
const ah = amax - amin;
for (let i = 0; i < posA.length; i += 3) {
  const x = posA[i], y = posA[i+1], z = posA[i+2];
  if (x <= 0.02) continue;
  m.parts(x, y, z, parts);
  const d = [parts.head, parts.torso, parts.arm, parts.leg, parts.ear, parts.tail];
  let bi = 0;
  for (let k = 1; k < 6; k++) if (d[k] < d[bi]) bi = k;
  if (bi === 3) A.push(new THREE.Vector3(x, y, z));
}
prof(A, amin, ah, 0.0, 0.16, "ASSET leg");
