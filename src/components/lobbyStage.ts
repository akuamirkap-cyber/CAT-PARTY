import * as THREE from "three";
import { animalById } from "../game/animals";
import { buildCharacterVisual, disposeCharacterDetails, poseStatic, type CharacterVisual } from "../game/characterMesh";
import type { LobbyMember } from "./MatchLobby";

/**
 * 3D scenery for the matchmaking lobby: a sunny hill with the whole line-up of
 * cats standing on the crest, exactly like the reference menu layout.
 * Kept outside the component so the stage can be built and measured in tests.
 */

export const LOBBY_FOV = 30;
const HILL_CENTER_Z = -2.2;
const HILL_FLAT = 3.2;

/** Height of the hill surface at a given spot (cats stand at y = 0). */
export function hillY(x: number, z: number): number {
  // The flat crest is a wide ellipse: the whole line-up stands on level ground.
  const r = Math.hypot(x / 1.7, z - HILL_CENTER_Z);
  const roll = -0.055 * Math.pow(Math.max(0, r - HILL_FLAT), 1.5);
  // gentle undulation + a soft bump behind the line-up so it reads as a hill
  const swell = Math.sin(x * 0.22) * Math.cos(z * 0.18) * 0.09 * Math.min(1, Math.max(0, (r - 6) / 8));
  const behind = Math.max(0, -(z - HILL_CENTER_Z + 6)) * 0.02;
  return roll + swell + behind;
}

export interface LobbyScenery {
  clouds: THREE.Group[];
  dispose: () => void;
}

export function buildLobbyScenery(scene: THREE.Scene): LobbyScenery {
  scene.background = new THREE.Color(0x9ed4ff);
  scene.fog = new THREE.Fog(0xd6ecff, 30, 90);

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };

  // --- sky dome: blue above, pale at the horizon, warm sun bloom
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color("#3f9bf5") },
      horizon: { value: new THREE.Color("#dcf0ff") },
      sunCol: { value: new THREE.Color("#fff3cf") },
      sunDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunCol; uniform vec3 sunDir; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP);
        vec3 c = mix(horizon, top, pow(smoothstep(0.0, 0.6, max(d.y, 0.0)), 0.65));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 260.0) * 1.6 + pow(s, 24.0) * 0.32 + pow(s, 4.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  materials.push(skyMat);
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(180, 32, 20)), skyMat);
  sky.renderOrder = -2;
  scene.add(sky);

  // --- hill: flat crest for the cats, rolling away behind them
  const hillGeo = new THREE.PlaneGeometry(160, 160, 110, 110);
  hillGeo.rotateX(-Math.PI / 2);
  hillGeo.translate(0, 0, HILL_CENTER_Z);
  {
    const pos = hillGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const crest = new THREE.Color("#b3ef70");
    const mid = new THREE.Color("#84dd4c");
    const deep = new THREE.Color("#4fae38");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = hillY(x, z);
      pos.setY(i, Math.max(-30, h));
      const r = Math.hypot(x / 1.7, z - HILL_CENTER_Z);
      c.copy(crest).lerp(mid, Math.min(1, Math.max(0, r - HILL_FLAT) / 10)).lerp(deep, Math.min(1, Math.max(0, -h) / 8));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    hillGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    hillGeo.computeVertexNormals();
  }
  const hillMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  materials.push(hillMat);
  const hill = new THREE.Mesh(hillGeo, hillMat);
  hill.receiveShadow = true;
  scene.add(hill);

  // --- far rolling mounds: the green curve on the horizon
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x8bda58, roughness: 1 });
  materials.push(moundMat);
  const moundGeo = track(new THREE.SphereGeometry(1, 24, 16));
  const mounds: [number, number, number, number, number][] = [
    [0, -8, -62, 58, 16],
    [-54, -8, -74, 44, 13],
    [58, -9, -80, 46, 12],
  ];
  for (const [x, y, z, r, h] of mounds) {
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set(x, y, z);
    mound.scale.set(r, h, r * 0.55);
    scene.add(mound);
  }

  // --- drifting clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f9ff, emissiveIntensity: 0.5, roughness: 1 });
  materials.push(cloudMat);
  const puffGeo = track(new THREE.SphereGeometry(1, 14, 10));
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 4.4],
    [4.4, -0.7, 0.4, 3.2],
    [-4.6, -0.8, -0.3, 3.3],
    [1.9, 2.1, 0, 3.0],
    [-2.2, 1.6, 0.3, 2.7],
  ];
  const cloudSpots: [number, number, number, number][] = [
    [-46, 11, -78, 1.25],
    [-6, 14, -96, 1.5],
    [38, 10, -72, 1.15],
    [66, 16, -92, 1.35],
    [-74, 9, -66, 0.95],
  ];
  const clouds: THREE.Group[] = [];
  for (const [x, y, z, scale] of cloudSpots) {
    const group = new THREE.Group();
    for (const [cx, cy, cz, cr] of puffs) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(cx, cy, cz);
      puff.scale.setScalar(cr);
      group.add(puff);
    }
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);
    clouds.push(group);
  }

  // --- scenery framing the line-up
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9a6a3b, roughness: 0.95 });
  const leafMats = [0x63c93f, 0x7ad94b, 0x54b836].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  materials.push(trunkMat, ...leafMats);
  const trunkGeo = track(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 8));
  const crownGeo = track(new THREE.SphereGeometry(1, 14, 10));

  const scatter: { x: number; z: number; s: number; hue: number; kind: "tree" | "bush" }[] = [
    { x: -7.8, z: -5.2, s: 1.3, hue: 0, kind: "tree" },
    { x: 8.1, z: -6.0, s: 1.4, hue: 1, kind: "tree" },
    { x: -11.6, z: -11, s: 1.6, hue: 2, kind: "tree" },
    { x: 12.4, z: -12, s: 1.5, hue: 0, kind: "tree" },
    { x: -4.6, z: -2.6, s: 0.9, hue: 1, kind: "bush" },
    { x: 5.2, z: -3.0, s: 0.95, hue: 2, kind: "bush" },
  ];
  for (const item of scatter) {
    const group = new THREE.Group();
    if (item.kind === "tree") {
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      group.add(trunk);
      for (const [dx, dy, dz, r] of [[0, 1.95, 0, 1.0], [-0.58, 1.55, 0.2, 0.68], [0.6, 1.6, -0.15, 0.72]] as const) {
        const leaf = new THREE.Mesh(crownGeo, leafMats[item.hue % leafMats.length]);
        leaf.position.set(dx, dy, dz);
        leaf.scale.setScalar(r);
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      const leaf = new THREE.Mesh(crownGeo, leafMats[item.hue % leafMats.length]);
      leaf.position.y = 0.38;
      leaf.scale.set(0.62, 0.5, 0.62);
      leaf.castShadow = true;
      group.add(leaf);
    }
    group.position.set(item.x, hillY(item.x, item.z), item.z);
    group.scale.setScalar(item.s);
    scene.add(group);
  }

  // --- grass tufts + flowers scatter the crest so the hill is not a flat plate
  const bladeGeo = track(new THREE.ConeGeometry(0.045, 0.34, 4));
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x6fce41, roughness: 1 });
  materials.push(bladeMat);
  const tuftCount = 190;
  const tufts = new THREE.InstancedMesh(bladeGeo, bladeMat, tuftCount * 3);
  const dummy = new THREE.Object3D();
  let ti = 0;
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < tuftCount; i++) {
    const ang = rnd() * Math.PI * 2;
    const r = 1.6 + rnd() * 22;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r + 1.5;
    for (let k = 0; k < 3; k++) {
      dummy.position.set(x + (rnd() - 0.5) * 0.5, hillY(x, z) + 0.17, z + (rnd() - 0.5) * 0.5);
      dummy.rotation.set((rnd() - 0.5) * 0.35, rnd() * Math.PI, (rnd() - 0.5) * 0.35);
      dummy.scale.setScalar(0.7 + rnd() * 0.7);
      dummy.updateMatrix();
      tufts.setMatrixAt(ti++, dummy.matrix);
    }
  }
  tufts.count = ti;
  tufts.instanceMatrix.needsUpdate = true;
  tufts.frustumCulled = false;
  scene.add(tufts);

  const petalGeo = track(new THREE.SphereGeometry(0.07, 8, 6));
  const flowerMats = [0xfff1a8, 0xffc94d, 0xff9ec4].map((color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, roughness: 0.8 }));
  materials.push(...flowerMats);
  for (let i = 0; i < 46; i++) {
    const ang = rnd() * Math.PI * 2;
    const r = 3 + rnd() * 18;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r + 1.2;
    const flower = new THREE.Mesh(petalGeo, flowerMats[i % flowerMats.length]);
    flower.position.set(x, hillY(x, z) + 0.16, z);
    flower.scale.setScalar(0.8 + rnd() * 0.9);
    scene.add(flower);
  }

  // --- soft contact shadow under the whole line-up
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x2f7a1f, transparent: true, opacity: 0.18, depthWrite: false });
  materials.push(shadowMat);
  const blob = new THREE.Mesh(track(new THREE.CircleGeometry(3.4, 48)), shadowMat);
  blob.rotation.x = -Math.PI / 2;
  blob.scale.set(1.9, 0.55, 1);
  blob.position.set(0, 0.004, 0);
  scene.add(blob);

  return {
    clouds,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

export function addLobbyLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xd8efff, 0x6fbf4c, 1.25));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.6);
  key.position.set(-6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfe0ff, 0.7);
  fill.position.set(8, 5, -10);
  scene.add(fill);
}

export function lobbySpacing(count: number) {
  return count > 6 ? 0.95 : 1.14;
}

/** Frame the whole row of cats, keeping them above the bottom dock. */
export function frameLobbyCamera(camera: THREE.PerspectiveCamera, count: number, aspect: number) {
  const spacing = lobbySpacing(count);
  camera.aspect = aspect;
  camera.fov = LOBBY_FOV;
  const halfTan = Math.tan((LOBBY_FOV * Math.PI) / 360);
  const width = ((count - 1) * spacing) / 2 + 0.7;
  const distForWidth = width / (halfTan * aspect);
  const distForHeight = 1.30 / halfTan;
  const dist = Math.max(distForWidth, distForHeight);
  camera.position.set(0, 1.38, dist);
  camera.lookAt(0, 0.7, 0);
  camera.updateProjectionMatrix();
}

export interface LobbyActor {
  v: CharacterVisual;
  group: THREE.Group;
  x: number;
  phase: number;
  you: boolean;
  top: number;
  base: number;
  born: number;
}

/** Build one cat for the line-up, posed once so the name tag can be measured. */
export function makeLobbyActor(scene: THREE.Scene, member: LobbyMember, index: number, center: number, spacing: number, born: number): LobbyActor {
  const v = buildCharacterVisual(animalById(member.animal), member.accessory, member.eyeStyle ?? "default", member.expression ?? "default");
  const group = new THREE.Group();
  group.add(...v.all);
  const x = (index - center) * spacing;
  // alternating depth keeps a long row from looking like a flat wall
  const z = member.you ? 0.35 : index % 2 === 0 ? -0.4 : 0.02;
  const base = member.you ? 1.12 : 1.0;
  group.position.set(x, 0, z);
  group.scale.setScalar(base);
  group.rotation.y = member.you ? 0.08 : x < 0 ? 0.16 : -0.16;
  scene.add(group);
  poseStatic(v, index * 1.37);
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  return {
    v,
    group,
    x,
    phase: index * 1.37,
    you: !!member.you,
    top: Number.isFinite(box.max.y) && box.max.y > 0.5 ? box.max.y : 1.45,
    base,
    born,
  };
}

/** Remove a cat and free only its own (non-shared) details. */
export function disposeLobbyActor(scene: THREE.Scene, actor: LobbyActor) {
  scene.remove(actor.group);
  disposeCharacterDetails(actor.v.all);
}
