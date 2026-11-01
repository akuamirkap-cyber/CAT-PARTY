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

const name = (r, g, b) => {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (r > 0.5 && Math.abs(r - g) < 0.2 && g > b - 0.06 && lum > 0.45) return "WHITE";
  if (r > 0.5) return "fur  ";
  return "STRIPE";
};

const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const root = new THREE.Group(); root.add(...v.all); root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos = v.mesh.geometry.attributes.position, col = v.mesh.geometry.attributes.color, idx = v.mesh.geometry.index;
const P = [];
for (let i = 0; i < pos.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i); v.mesh.applyBoneTransform(i, p); P.push({ p, c: [col.getX(i), col.getY(i), col.getZ(i)] }); }
let bot = 1e9, top = -1e9;
for (const q of P) { bot = Math.min(bot, q.p.y); top = Math.max(top, q.p.y); }
const h = top - bot;
// front-most surface vertex per y band on the right leg
const rows = [];
for (let y = bot + 0.004; y < bot + 0.48; y += 0.006) {
  let best = null;
  for (const q of P) {
    if (q.p.x < 0.06 || q.p.x > 0.26) continue;
    if (Math.abs(q.p.y - y) > 0.007) continue;
    if (!best || q.p.z > best.p.z) best = q;
  }
  if (best) rows.push(`${((y - bot) / h).toFixed(3)}h  y ${y.toFixed(3)}  z ${best.p.z.toFixed(3)}  ${name(...best.c)}`);
}
console.log("GAME h", h.toFixed(3), "bottom", bot.toFixed(3));
console.log(rows.join("\n"));
