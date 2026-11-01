import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
const orig = dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext = function (t) { if (t === "2d") return { canvas: this, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, ellipse() {}, closePath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w*h*4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w*h*4) }), setTransform() {}, clearRect() {} }; return orig.call(this, t); };
const THREE = await import("three");
const cm = await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const rig = await import("/home/user/CAT-PARTY/src/game/rig.ts");
const { animalById } = await import("/home/user/CAT-PARTY/src/game/animals.ts");
// grab recipe via the visual's geometry groups is hard; instead re-derive from a build hook
const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
console.log("HOVER", rig.HOVER, "HIP_L", rig.HIP_L, "groundCut", -rig.HOVER + 0.003);
const box = new THREE.Box3().setFromObject(v.mesh);
console.log("body geom bbox", box.min.toArray().map(n=>n.toFixed(3)), box.max.toArray().map(n=>n.toFixed(3)));
// find min y vertices for left leg (x>0)
const pos = v.mesh.geometry.attributes.position;
let minY = 1e9, at = null;
for (let i = 0; i < pos.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i); if (p.x > 0.05 && p.y < minY) { minY = p.y; at = p; } }
console.log("left leg lowest vertex", at.toArray().map(n=>n.toFixed(3)), "minY", minY.toFixed(3));
