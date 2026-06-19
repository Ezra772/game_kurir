import * as THREE from "three";
import { getFallbackTangent, orientToPlanet, planetRadius } from "./utils.js";

const surfaceDecorData = [
  ["tree", -0.3, 0.94, -0.16, 0.9],
  ["tree", 0.18, 0.84, -0.51, 0.75],
  ["tree", -0.58, 0.63, 0.52, 0.72],
  ["tree", 0.48, 0.74, -0.47, 0.68],
  ["tree", -0.86, 0.34, 0.38, 0.62],
  ["tree", 0.86, 0.22, -0.46, 0.58],
  ["tree", 0.38, 0.88, 0.28, 0.58],
  ["tree", -0.48, 0.78, -0.4, 0.56],
  ["bush", -0.05, 0.98, -0.18, 0.75],
  ["bush", 0.34, 0.8, 0.49, 0.66],
  ["bush", -0.68, 0.5, -0.54, 0.62],
  ["bush", 0.76, 0.42, 0.49, 0.54],
  ["bush", -0.38, 0.9, 0.22, 0.5],
  ["bush", 0.9, 0.28, 0.3, 0.48],
  ["rock", -0.18, 0.78, 0.6, 0.78],
  ["rock", 0.4, 0.64, 0.66, 0.66],
  ["rock", -0.84, 0.44, -0.31, 0.7],
  ["rock", 0.7, 0.5, -0.51, 0.54],
  ["rock", 0.1, 0.98, 0.16, 0.5],
  ["rock", -0.58, 0.72, -0.36, 0.44],
  ["rock", 0.58, 0.7, 0.42, 0.42],
  ["house", -0.12, 0.54, 0.83, 0.82],
  ["house", 0.18, 0.58, -0.79, 0.7],
];

const tempVector = new THREE.Vector3();
const tempVectorTwo = new THREE.Vector3();
const tempTangent = new THREE.Vector3();

const palette = {
  grass: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    flatShading: true,
    vertexColors: true,
  }),
  road: new THREE.LineBasicMaterial({
    color: 0xf7d777,
    transparent: true,
    opacity: 0.85,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.9 }),
  leaves: new THREE.MeshStandardMaterial({
    color: 0x2f9e44,
    roughness: 0.82,
    flatShading: true,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.95,
    flatShading: true,
  }),
  wall: new THREE.MeshStandardMaterial({ color: 0xfff1c1, roughness: 0.85 }),
  roof: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.78,
    flatShading: true,
  }),
  marker: new THREE.MeshStandardMaterial({
    color: 0xffd166,
    roughness: 0.45,
    emissive: 0xffaa00,
    emissiveIntensity: 0.45,
  }),
  markerBlue: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
  }),
  markerText: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    side: THREE.DoubleSide,
  }),
};

const sharedGeometry = {
  treeTrunk: new THREE.CylinderGeometry(0.045, 0.065, 0.35, 6),
  treeLeaves: new THREE.ConeGeometry(0.22, 0.48, 7),
  bush: new THREE.DodecahedronGeometry(0.14, 0),
  rock: new THREE.DodecahedronGeometry(0.16, 0),
  houseBody: new THREE.BoxGeometry(0.38, 0.28, 0.34),
  houseRoof: new THREE.ConeGeometry(0.34, 0.28, 4),
};

export function setupScene(scene, options = {}) {
  scene.background = createSkyTexture();
  scene.fog = new THREE.Fog(0x14213d, 20, 50);

  const ambient = new THREE.HemisphereLight(0xdff6ff, 0x3f6f39, 2.75);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4d6, 2.6);
  keyLight.position.set(6, 11, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8bd8ff, 1.05);
  fillLight.position.set(-8, 5, -8);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
  rimLight.position.set(0, -8, -4);
  scene.add(rimLight);

  createStars(scene, options.lowPower ? 220 : 360);
  createClouds(scene, options.lowPower);
}

export function createPlanet(npcs) {
  const geometry = new THREE.IcosahedronGeometry(planetRadius, 3);
  addPlanetVertexColors(geometry);
  const mesh = new THREE.Mesh(geometry, palette.grass);

  const roadPoints = [];
  const basisA = new THREE.Vector3(1, 0.12, 0).normalize();
  const basisB = new THREE.Vector3(0.1, 0, 1).normalize();
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    tempVector
      .copy(basisA)
      .multiplyScalar(Math.cos(angle))
      .add(tempVectorTwo.copy(basisB).multiplyScalar(Math.sin(angle)))
      .normalize()
      .multiplyScalar(planetRadius + 0.035);
    roadPoints.push(tempVector.clone());
  }

  const roadGeometry = new THREE.BufferGeometry().setFromPoints(roadPoints);
  mesh.add(new THREE.Line(roadGeometry, palette.road));

  const routePoints = npcs.map((npc) => npc.normal.clone().multiplyScalar(planetRadius + 0.055));
  routePoints.push(npcs[0].normal.clone().multiplyScalar(planetRadius + 0.055));
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
  const route = new THREE.Line(
    routeGeometry,
    new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.16,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.5,
    }),
  );
  route.computeLineDistances();
  mesh.add(route);

  return mesh;
}

export function createNpcs(npcData) {
  return npcData.map((data) => {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.75 }),
    );
    body.position.y = 0.34;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.85 }),
    );
    head.position.y = 0.72;
    group.add(head);

    const label = createTextLabel(data.name, 0.72, 0.36);
    label.position.y = 1.08;
    label.position.z = -0.03;
    group.add(label);

    return {
      ...data,
      normal: new THREE.Vector3(...data.normal).normalize(),
      group,
    };
  });
}

export function createDecorations(options = {}) {
  const root = new THREE.Group();
  const decorations = options.lowPower
    ? surfaceDecorData.filter((_, index) => index % 3 !== 1)
    : surfaceDecorData;

  decorations.forEach(([type, x, y, z, scale]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    const object =
      type === "tree"
        ? createTree(scale)
        : type === "house"
          ? createHouse(scale)
          : type === "bush"
            ? createBush(scale)
            : createRock(scale);
    placeOnPlanet(object, normal, 0.08);
    root.add(object);
  });
  return root;
}

export function createTargetMarker() {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 6, 18), palette.marker);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.018, 6, 24), palette.markerBlue);
  outerRing.rotation.x = Math.PI / 2;
  group.add(outerRing);

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 8), palette.marker);
  arrow.rotation.x = Math.PI;
  arrow.position.y = 0.5;
  group.add(arrow);

  const icon = createMarkerIcon();
  icon.position.y = 0.84;
  group.add(icon);

  group.userData.parts = { ring, outerRing, arrow, icon };
  return group;
}

export function updateTargetMarker(marker, targetNpc, elapsed) {
  if (!targetNpc) {
    marker.visible = false;
    return;
  }

  const bob = Math.sin(elapsed * 4) * 0.12;
  const actionPulse = marker.userData.pulseUntil && elapsed < marker.userData.pulseUntil ? 0.24 : 0;
  const pulse = 1 + Math.sin(elapsed * 5.5) * (0.08 + actionPulse);
  marker.visible = true;
  marker.position.copy(targetNpc.normal).multiplyScalar(planetRadius + 1.05 + bob);
  orientToPlanet(marker, targetNpc.normal, tempTangent.copy(targetNpc.normal).multiplyScalar(-1));
  marker.scale.setScalar(pulse);
  marker.userData.parts.ring.rotation.z = elapsed * 2.4;
  marker.userData.parts.outerRing.rotation.z = -elapsed * 1.8;
}

export function pulseTargetMarker(marker, elapsed) {
  marker.userData.pulseUntil = elapsed + 0.32;
}

export function createCompletionEffect(options = {}) {
  const particleCount = options.lowPower ? 32 : 52;
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let index = 0; index < particleCount; index += 1) {
    velocities.push(
      new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(1),
        THREE.MathUtils.randFloat(0.15, 1),
        THREE.MathUtils.randFloatSpread(1),
      )
        .normalize()
        .multiplyScalar(THREE.MathUtils.randFloat(0.8, 1.8)),
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xfff1a8,
      size: 0.08,
      transparent: true,
      opacity: 0,
    }),
  );
  points.visible = false;

  return {
    points,
    velocities,
    basePositions,
    age: 0,
    active: false,
  };
}

export function startCompletionEffect(effect, normal) {
  effect.active = true;
  effect.age = 0;
  effect.points.visible = true;
  effect.points.material.opacity = 1;
  effect.points.position.copy(normal).multiplyScalar(planetRadius + 0.85);
  effect.basePositions.fill(0);
  effect.points.geometry.attributes.position.array.fill(0);
  effect.points.geometry.attributes.position.needsUpdate = true;
}

export function updateCompletionEffect(effect, delta) {
  if (!effect.active) {
    return false;
  }

  effect.age += delta;
  const positions = effect.points.geometry.attributes.position.array;
  for (let index = 0; index < effect.velocities.length; index += 1) {
    const velocity = effect.velocities[index];
    positions[index * 3] = effect.basePositions[index * 3] + velocity.x * effect.age;
    positions[index * 3 + 1] = effect.basePositions[index * 3 + 1] + velocity.y * effect.age;
    positions[index * 3 + 2] = effect.basePositions[index * 3 + 2] + velocity.z * effect.age;
  }
  effect.points.geometry.attributes.position.needsUpdate = true;
  effect.points.material.opacity = Math.max(0, 1 - effect.age / 1.4);

  if (effect.age > 1.4) {
    effect.active = false;
    effect.points.visible = false;
  }
  return effect.active;
}

export function updateNpcTransforms(npcs, playerPosition, elapsed) {
  npcs.forEach((npc, index) => {
    const idle = Math.sin(elapsed * 2 + index) * 0.035;
    npc.group.position.copy(npc.normal).multiplyScalar(planetRadius + 0.28 + idle);

    tempVector.copy(playerPosition).sub(npc.group.position).projectOnPlane(npc.normal).normalize();
    if (tempVector.lengthSq() < 0.001) {
      getFallbackTangent(npc.normal, tempVector);
    }
    orientToPlanet(npc.group, npc.normal, tempVector);
  });
}

function createTextLabel(text, width, height) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  context.fillStyle = "#fff7ed";
  context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = "#1f2937";
  context.font = "800 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 64);

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
    }),
  );
}

function addPlanetVertexColors(geometry) {
  const position = geometry.getAttribute("position");
  const colors = [];
  const color = new THREE.Color();
  const low = new THREE.Color(0x4f9f45);
  const mid = new THREE.Color(0x6ec45e);
  const high = new THREE.Color(0x93d66f);
  const flower = new THREE.Color(0xf4d35e);

  for (let index = 0; index < position.count; index += 1) {
    tempVector.fromBufferAttribute(position, index).normalize();
    const variation =
      Math.sin(tempVector.x * 8.2 + tempVector.z * 4.5) * 0.5 +
      Math.cos(tempVector.y * 9.5) * 0.5;

    if (variation > 0.68 && tempVector.y > -0.3) {
      color.copy(flower).lerp(high, 0.35);
    } else if (tempVector.y > 0.5) {
      color.copy(high).lerp(mid, Math.abs(variation) * 0.35);
    } else {
      color.copy(mid).lerp(low, Math.abs(variation) * 0.45);
    }

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function createSkyTexture() {
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 16;
  skyCanvas.height = 256;
  const context = skyCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, skyCanvas.height);
  gradient.addColorStop(0, "#243b67");
  gradient.addColorStop(0.42, "#172554");
  gradient.addColorStop(1, "#0f172a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  return new THREE.CanvasTexture(skyCanvas);
}

function createMarkerIcon() {
  const markerCanvas = document.createElement("canvas");
  markerCanvas.width = 128;
  markerCanvas.height = 128;
  const context = markerCanvas.getContext("2d");
  context.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(64, 64, 44, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f59e0b";
  context.font = "900 74px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("!", 64, 69);

  const texture = new THREE.CanvasTexture(markerCanvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
}

function createTree(scale) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(sharedGeometry.treeTrunk, palette.trunk);
  const leaves = new THREE.Mesh(sharedGeometry.treeLeaves, palette.leaves);
  trunk.position.y = 0.18;
  leaves.position.y = 0.52;
  group.add(trunk, leaves);
  group.scale.setScalar(scale);
  return group;
}

function createBush(scale) {
  const group = new THREE.Group();
  const bushA = new THREE.Mesh(sharedGeometry.bush, palette.leaves);
  const bushB = new THREE.Mesh(sharedGeometry.bush, palette.leaves);
  const bushC = new THREE.Mesh(sharedGeometry.bush, palette.leaves);
  bushA.position.set(0, 0.12, 0);
  bushB.position.set(0.11, 0.1, 0.04);
  bushC.position.set(-0.1, 0.09, -0.04);
  bushB.scale.setScalar(0.82);
  bushC.scale.setScalar(0.72);
  group.add(bushA, bushB, bushC);
  group.scale.setScalar(scale);
  return group;
}

function createRock(scale) {
  const rock = new THREE.Mesh(sharedGeometry.rock, palette.stone);
  rock.scale.set(scale * 1.2, scale * 0.72, scale);
  return rock;
}

function createHouse(scale) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(sharedGeometry.houseBody, palette.wall);
  const roof = new THREE.Mesh(sharedGeometry.houseRoof, palette.roof);
  body.position.y = 0.2;
  roof.position.y = 0.48;
  roof.rotation.y = Math.PI / 4;
  group.add(body, roof);
  group.scale.setScalar(scale);
  return group;
}

function placeOnPlanet(object, normal, lift = 0) {
  object.position.copy(normal).multiplyScalar(planetRadius + lift);
  orientToPlanet(object, normal, getFallbackTangent(normal, tempTangent));
}

function createStars(scene, count = 360) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let index = 0; index < count; index += 1) {
    tempVector
      .set(
        THREE.MathUtils.randFloatSpread(1),
        THREE.MathUtils.randFloatSpread(1),
        THREE.MathUtils.randFloatSpread(1),
      )
      .normalize()
      .multiplyScalar(THREE.MathUtils.randFloat(24, 42));
    positions.push(tempVector.x, tempVector.y, tempVector.z);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.045,
    transparent: true,
    opacity: 0.62,
  });
  scene.add(new THREE.Points(geometry, material));
}

function createClouds(scene, lowPower = false) {
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const cloudGeometry = new THREE.SphereGeometry(0.48, 8, 6);
  const cloudRoot = new THREE.Group();
  const cloudPositions = [
    [-7, 5.5, -10, 1.2],
    [8, 7, -8, 0.9],
    [-9, -3, -11, 0.75],
    [10, -4, -13, 1.05],
  ];

  const visibleClouds = lowPower ? cloudPositions.slice(0, 2) : cloudPositions;

  visibleClouds.forEach(([x, y, z, scale]) => {
    const cloud = new THREE.Group();
    for (let index = 0; index < 3; index += 1) {
      const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
      puff.position.set((index - 1) * 0.42, Math.sin(index) * 0.08, 0);
      puff.scale.setScalar(scale * (1 - index * 0.08));
      cloud.add(puff);
    }
    cloud.position.set(x, y, z);
    cloudRoot.add(cloud);
  });

  scene.add(cloudRoot);
}
