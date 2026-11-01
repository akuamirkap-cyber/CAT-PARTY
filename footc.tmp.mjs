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
const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
const g = v.mesh.geometry;
const pos = g.attributes.position, col = g.attributes.color;
const P = new THREE.Vector3();
const rows = [];
for (let y = -0.60; y <= -0.20; y += 0.02) {
  let best = null, bz = -9;
  for (let i = 0; i < pos.count; i++) {
    P.fromBufferAttribute(pos, i);
    if (P.y < y - 0.006 || P.y > y + 0.006) continue;
    if (Math.abs(P.x) > 0.25) continue;
    if (P.z > bz) { bz = P.z; best = i; }
  }
  if (best === null) continue;
  rows.push(`y ${y.toFixed(2)} z ${bz.toFixed(3)} x ${P.fromBufferAttribute(pos, best).x.toFixed(3)} col ${[col.getX(best), col.getY(best), col.getZ(best)].map(n=>n.toFixed(2)).join(",")}`);
}
console.log(rows.join("\n"));
