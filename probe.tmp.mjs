import { JSDOM } from "jsdom";
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
const ctxStub = { canvas: null, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, ellipse() {}, closePath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), setTransform() {}, clearRect() {}, fillText() {}, strokeText() {}, measureText: () => ({ width: 1 }) };
const orig = dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext = function (t) { if (t === "2d") return { ...ctxStub, canvas: this }; return orig.call(this, t); };
const THREE = await import("three");
const CANNON = await import("cannon-es");
const tuning = await import("/home/user/CAT-PARTY/src/game/tuning.ts");
tuning.setShapeMode("asset");
const cm = await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const { animalById } = await import("/home/user/CAT-PARTY/src/game/animals.ts");
const { Character } = await import("/home/user/CAT-PARTY/src/game/Character.ts");
const { emptyControl } = await import("/home/user/CAT-PARTY/src/game/input.ts");
const { buildCat } = await import("/home/user/CAT-PARTY/src/catasset/build.ts");
const { SPECS } = await import("/home/user/CAT-PARTY/src/catasset/specs.ts");

const CW = Number(process.env.CW ?? 400), CH = Number(process.env.CH ?? 540), GAP = 4;
const ANGLE = Number(process.env.ANGLES ?? 0);
const ZOOM = Number(process.env.ZOOM ?? 1), FOCUS = Number(process.env.FOCUS ?? 0.5);
const MODE = process.env.MODE ?? "all";

function collect(v) {
  const ROOT = new THREE.Group();
  ROOT.add(...v.all);
  ROOT.updateMatrixWorld(true);
  const tris = [];
  let mn = 1e9, mx = -1e9;
  for (const obj of v.all) {
    if (!obj.isSkinnedMesh) continue;
    obj.skeleton.update();
    const pos = obj.geometry.attributes.position, idx = obj.geometry.index, c = obj.geometry.attributes.color;
    const verts = [], cols = [];
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i);
      obj.applyBoneTransform(i, p);
      obj.localToWorld(p);
      mn = Math.min(mn, p.y); mx = Math.max(mx, p.y);
      verts.push(p); cols.push(c ? [c.getX(i), c.getY(i), c.getZ(i)] : [1, 0.5, 0.2]);
    }
    if (!idx) continue;
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), e = idx.getX(t + 2);
      const pa = verts[a], pb = verts[b], pc = verts[e];
      if (!pa || !pb || !pc) continue;
      const n = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa)).normalize();
      tris.push([pa, pb, pc, n, cols[a], cols[b], cols[e]]);
    }
  }
  return { tris, mn, mx };
}
function menuVisual() {
  const v = cm.buildCharacterVisual(animalById("oyen"), "none", "default", "default");
  cm.poseStatic(v, 0.6);
  return v;
}
function gameVisual() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 10;
  const floor = new CANNON.Body({ mass: 0 });
  floor.addShape(new CANNON.Box(new CANNON.Vec3(100, 1, 100)));
  floor.position.y = -1;
  world.addBody(floor);
  const hooks = { onHit() {}, onKO() {}, onLand() {}, onStep() {} };
  const c = new Character(world, 0, animalById("oyen"), "Cat", 1, hooks, new THREE.Vector3(0, 0.05, 0), 0, emptyControl());
  Character.all = [c];
  const H = 1 / 120;
  for (let i = 0; i < 700; i++) { if (i % 2 === 0) c.frameActions(1 / 60); c.physicsStep(H); world.step(H); c.updateHolds(H); }
  c.syncVisual();
  return c.visual;
}
const panels = [];
if (MODE === "menu" || MODE === "all") panels.push({ label: "menu", v: menuVisual() });
if (MODE === "game" || MODE === "all") panels.push({ label: "game", v: gameVisual() });
if (MODE !== "menu" && MODE !== "game") panels.push({ label: "asset", v: null });
else panels.push({ label: "asset", v: null });

const N = panels.length;
const W = N * CW + (N - 1) * GAP, HH = CH;
const img = new Uint8Array(W * HH * 3);
for (let i = 0; i < W * HH; i++) { img[i * 3] = 246; img[i * 3 + 1] = 238; img[i * 3 + 2] = 218; }
const LIGHT = new THREE.Vector3(-0.35, 0.55, 0.76).normalize();
const srgb = (x) => 255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055);
const prepared = [];
for (const p of panels) {
  if (p.v) { const { tris, mn, mx } = collect(p.v); prepared.push({ tris, mn, mx }); }
  else {
    const S = 0.6265;
    const built = buildCat(SPECS.oyen, 0.013);
    const P = built.body.positions, C = built.body.colors, IDX = built.body.indices;
    const av = [];
    let amin = 1e9, amax = -1e9;
    for (let i = 0; i < P.length; i += 3) {
      const q = new THREE.Vector3(P[i] * S, P[i + 1] * S, P[i + 2] * S);
      amin = Math.min(amin, q.y); amax = Math.max(amax, q.y);
      av.push(q);
    }
    const tris = [];
    for (let t = 0; t < IDX.length; t += 3) {
      const a = IDX[t], b = IDX[t + 1], e = IDX[t + 2];
      const pa = av[a], pb = av[b], pc = av[e];
      const n = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa)).normalize();
      tris.push([pa, pb, pc, n, [C[a*3], C[a*3+1], C[a*3+2]], [C[b*3], C[b*3+1], C[b*3+2]], [C[e*3], C[e*3+1], C[e*3+2]]]);
    }
    prepared.push({ tris, mn: amin, mx: amax });
  }
}
function draw(tris, minY, maxY, offsetX) {
  const ry = (ANGLE * Math.PI) / 180;
  const sc = ((HH * 0.9) / (maxY - minY)) * ZOOM, cx = offsetX + CW / 2;
  const by = HH / 2 + (minY + (maxY - minY) * FOCUS) * sc;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const depth = new Float32Array(CW * HH).fill(Infinity);
  for (const [a0, b0, c0, n0, ca, cb, cc] of tris) {
    const A = new THREE.Vector3(-(a0.x * cos + a0.z * sin), a0.y, -(-a0.x * sin + a0.z * cos));
    const B = new THREE.Vector3(-(b0.x * cos + b0.z * sin), b0.y, -(-b0.x * sin + b0.z * cos));
    const C = new THREE.Vector3(-(c0.x * cos + c0.z * sin), c0.y, -(-c0.x * sin + c0.z * cos));
    const n = new THREE.Vector3(-(n0.x * cos + n0.z * sin), n0.y, -(-n0.x * sin + n0.z * cos));
    if (n.z < 0) n.multiplyScalar(-1);
    const p0 = [cx + A.x * sc, by - A.y * sc, A.z], p1 = [cx + B.x * sc, by - B.y * sc, B.z], p2 = [cx + C.x * sc, by - C.y * sc, C.z];
    const minx = Math.max(offsetX, Math.floor(Math.min(p0[0], p1[0], p2[0])));
    const maxx = Math.min(offsetX + CW - 1, Math.ceil(Math.max(p0[0], p1[0], p2[0])));
    const miny = Math.max(0, Math.floor(Math.min(p0[1], p1[1], p2[1])));
    const maxy = Math.min(HH - 1, Math.ceil(Math.max(p0[1], p1[1], p2[1])));
    if (maxx < minx || maxy < miny) continue;
    const d = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]);
    if (Math.abs(d) < 1e-9) continue;
    const nl = Math.hypot(n.x, n.y, n.z) || 1;
    const diff = Math.max(0, (n.x / nl) * LIGHT.x + (n.y / nl) * LIGHT.y + (n.z / nl) * LIGHT.z);
    const sh = process.env.FLAT ? 1 : 0.42 + 0.8 * diff;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const w0 = ((p1[1] - p2[1]) * (x - p2[0]) + (p2[0] - p1[0]) * (y - p2[1])) / d;
      const w1 = ((p2[1] - p0[1]) * (x - p2[0]) + (p0[0] - p2[0]) * (y - p2[1])) / d;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * p0[2] + w1 * p1[2] + w2 * p2[2];
      const idx = y * CW + (x - offsetX);
      if (z >= depth[idx]) continue;
      depth[idx] = z;
      const o = (y * W + x) * 3;
      img[o] = Math.min(255, srgb((w0 * ca[0] + w1 * cb[0] + w2 * cc[0]) * sh));
      img[o + 1] = Math.min(255, srgb((w0 * ca[1] + w1 * cb[1] + w2 * cc[1]) * sh));
      img[o + 2] = Math.min(255, srgb((w0 * ca[2] + w1 * cb[2] + w2 * cc[2]) * sh));
    }
  }
}
prepared.forEach((p, i) => draw(p.tris, p.mn, p.mx, i * (CW + GAP)));
const crcTable = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = ~0; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return ~c; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0); return Buffer.concat([len, t, data, crc]); };
const raw = Buffer.alloc((W * 3 + 1) * HH);
for (let y = 0; y < HH; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(HH, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync("/home/user/probe.png", Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log("wrote /home/user/probe.png panels:", panels.map((p) => p.label).join(","));
