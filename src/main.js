import * as THREE from "three";
import "./styles.css";

const canvas = document.querySelector("#game-canvas");
const missionTitle = document.querySelector("#mission-title");
const missionDetail = document.querySelector("#mission-detail");
const letterStatus = document.querySelector("#letter-status");
const distanceStatus = document.querySelector("#distance-status");
const questStep = document.querySelector("#quest-step");
const questProgressFill = document.querySelector("#quest-progress-fill");
const dialogPanel = document.querySelector("#dialog-panel");
const dialogSpeaker = document.querySelector("#dialog-speaker");
const dialogText = document.querySelector("#dialog-text");
const completionFlash = document.querySelector("#completion-flash");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101827);
scene.fog = new THREE.Fog(0x101827, 18, 46);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);

const clock = new THREE.Clock();
const planetRadius = 4;
const playerHeight = 0.55;
const interactionDistance = 0.8;
const dialogDistance = 1.25;
const keys = new Set();

const playerState = {
  normal: new THREE.Vector3(0.16, 1, 0.08).normalize(),
  forwardHint: new THREE.Vector3(0, 0, -1),
  speed: 1.35,
  isWalking: false,
  walkTime: 0,
};

const quest = {
  phase: "pickup",
  completedAt: 0,
};

const npcData = [
  {
    id: "a",
    name: "NPC A",
    color: 0x4dabf7,
    normal: new THREE.Vector3(-0.72, 0.5, -0.36).normalize(),
    dialogBefore: "Suratnya sudah siap. Tolong antar ke NPC B, ya!",
    dialogAfter: "Terima kasih. NPC B menunggu di seberang planet.",
  },
  {
    id: "b",
    name: "NPC B",
    color: 0xff6b6b,
    normal: new THREE.Vector3(0.72, 0.38, 0.58).normalize(),
    dialogBefore: "Aku menunggu surat dari NPC A.",
    dialogAfter: "Suratnya sampai! Kerja bagus, kurir kecil.",
  },
];

const surfaceDecorData = [
  ["tree", -0.3, 0.94, -0.16, 0.9],
  ["tree", 0.18, 0.84, -0.51, 0.75],
  ["tree", -0.58, 0.63, 0.52, 0.72],
  ["tree", 0.48, 0.74, -0.47, 0.68],
  ["tree", -0.86, 0.34, 0.38, 0.62],
  ["tree", 0.86, 0.22, -0.46, 0.58],
  ["rock", -0.18, 0.78, 0.6, 0.78],
  ["rock", 0.4, 0.64, 0.66, 0.66],
  ["rock", -0.84, 0.44, -0.31, 0.7],
  ["rock", 0.7, 0.5, -0.51, 0.54],
  ["rock", 0.1, 0.98, 0.16, 0.5],
  ["house", -0.12, 0.54, 0.83, 0.82],
  ["house", 0.18, 0.58, -0.79, 0.7],
];

const worldUp = new THREE.Vector3(0, 1, 0);
const tempVector = new THREE.Vector3();
const tempVectorTwo = new THREE.Vector3();
const tempVectorThree = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempTurnQuaternion = new THREE.Quaternion();
const sphericalForward = new THREE.Vector3();
const sphericalRight = new THREE.Vector3();

const palette = {
  grass: new THREE.MeshStandardMaterial({
    color: 0x5fbd5a,
    roughness: 0.94,
    flatShading: true,
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
    emissive: 0x4f2a00,
    emissiveIntensity: 0.18,
  }),
};

const sharedGeometry = {
  treeTrunk: new THREE.CylinderGeometry(0.045, 0.065, 0.35, 6),
  treeLeaves: new THREE.ConeGeometry(0.22, 0.48, 7),
  rock: new THREE.DodecahedronGeometry(0.16, 0),
  houseBody: new THREE.BoxGeometry(0.38, 0.28, 0.34),
  houseRoof: new THREE.ConeGeometry(0.34, 0.28, 4),
};

setupLights();
createStars();

const planet = createPlanet();
scene.add(planet);

const decorationRoot = new THREE.Group();
scene.add(decorationRoot);
createDecorations();

const player = createCourier();
scene.add(player);

const npcs = npcData.map(createNpc);
npcs.forEach((npc) => scene.add(npc.group));

const targetMarker = createTargetMarker();
scene.add(targetMarker);

const completionEffect = createCompletionEffect();
scene.add(completionEffect.points);

updatePlayerTransform();
updateNpcTransforms();
updateQuestUi();
animate();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setupLights() {
  const ambient = new THREE.HemisphereLight(0xcde7ff, 0x244225, 2.35);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
  keyLight.position.set(7, 10, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x9be7ff, 0.9);
  rimLight.position.set(-7, 4, -8);
  scene.add(rimLight);
}

function createPlanet() {
  const geometry = new THREE.IcosahedronGeometry(planetRadius, 3);
  const mesh = new THREE.Mesh(geometry, palette.grass);

  const roadPoints = [];
  const basisA = new THREE.Vector3(1, 0.12, 0).normalize();
  const basisB = new THREE.Vector3(0.1, 0, 1).normalize();
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    const normal = basisA
      .clone()
      .multiplyScalar(Math.cos(angle))
      .add(basisB.clone().multiplyScalar(Math.sin(angle)))
      .normalize();
    roadPoints.push(normal.multiplyScalar(planetRadius + 0.035));
  }

  const roadGeometry = new THREE.BufferGeometry().setFromPoints(roadPoints);
  const road = new THREE.Line(roadGeometry, palette.road);
  mesh.add(road);

  const routePoints = npcData.map((npc) =>
    npc.normal.clone().multiplyScalar(planetRadius + 0.055),
  );
  routePoints.splice(
    1,
    0,
    new THREE.Vector3(-0.2, 1, 0.15)
      .normalize()
      .multiplyScalar(planetRadius + 0.055),
  );
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
  const route = new THREE.Line(
    routeGeometry,
    new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.16,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.55,
    }),
  );
  route.computeLineDistances();
  mesh.add(route);

  return mesh;
}

function createCourier() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.17, 0.36, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.72 }),
  );
  body.position.y = 0.42;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd3ad, roughness: 0.8 }),
  );
  head.position.y = 0.77;
  group.add(head);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c7ed6, roughness: 0.65 }),
  );
  cap.position.y = 0.9;
  group.add(cap);

  const bag = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.85 }),
  );
  bag.position.set(0.21, 0.42, 0.02);
  group.add(bag);

  const pointer = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.45 }),
  );
  pointer.rotation.x = Math.PI / 2;
  pointer.position.set(0, 0.5, -0.22);
  group.add(pointer);

  const limbMaterial = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.72,
  });
  const limbGeometry = new THREE.BoxGeometry(0.07, 0.26, 0.08);
  const leftArm = new THREE.Mesh(limbGeometry, limbMaterial);
  const rightArm = new THREE.Mesh(limbGeometry, limbMaterial);
  const leftLeg = new THREE.Mesh(limbGeometry, limbMaterial);
  const rightLeg = new THREE.Mesh(limbGeometry, limbMaterial);

  leftArm.position.set(-0.19, 0.42, 0);
  rightArm.position.set(0.19, 0.42, 0);
  leftLeg.position.set(-0.08, 0.14, 0);
  rightLeg.position.set(0.08, 0.14, 0);
  group.add(leftArm, rightArm, leftLeg, rightLeg);

  group.userData.parts = {
    body,
    head,
    bag,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };

  return group;
}

function createNpc(data) {
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
    group,
  };
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

function createTargetMarker() {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.025, 6, 18),
    palette.marker,
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 8), palette.marker);
  arrow.rotation.x = Math.PI;
  arrow.position.y = 0.42;
  group.add(arrow);

  return group;
}

function createCompletionEffect() {
  const particleCount = 52;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let index = 0; index < particleCount; index += 1) {
    positions[index * 3] = 0;
    positions[index * 3 + 1] = 0;
    positions[index * 3 + 2] = 0;
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
    age: 0,
    active: false,
  };
}

function createDecorations() {
  surfaceDecorData.forEach(([type, x, y, z, scale]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    const object =
      type === "tree" ? createTree(scale) : type === "house" ? createHouse(scale) : createRock(scale);
    placeOnPlanet(object, normal, 0.08);
    decorationRoot.add(object);
  });
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
  const tangent = tempVectorThree
    .set(normal.z, 0, -normal.x)
    .projectOnPlane(normal)
    .normalize();
  orientToPlanet(object, normal, tangent.lengthSq() > 0.01 ? tangent : new THREE.Vector3(0, 0, -1));
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let index = 0; index < 360; index += 1) {
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

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;
  updateMovement(delta);
  updatePlayerTransform();
  updatePlayerAnimation(delta);
  updateNpcTransforms(elapsed);
  updateTargetMarker(elapsed);
  updateQuest();
  updateDialog();
  updateCompletionEffect(delta);
  updateCamera(delta);

  renderer.render(scene, camera);
}

function updateMovement(delta) {
  const up = playerState.normal;
  sphericalRight.crossVectors(playerState.forwardHint, up).normalize();
  sphericalForward.crossVectors(up, sphericalRight).normalize();

  const move = tempVector.set(0, 0, 0);

  if (keys.has("KeyW")) {
    move.add(sphericalForward);
  }
  if (keys.has("KeyS")) {
    move.sub(sphericalForward);
  }
  if (keys.has("KeyA")) {
    move.sub(sphericalRight);
  }
  if (keys.has("KeyD")) {
    move.add(sphericalRight);
  }

  playerState.isWalking = move.lengthSq() > 0;
  if (!playerState.isWalking) {
    return;
  }

  move.normalize();
  playerState.forwardHint.copy(move);
  playerState.normal
    .addScaledVector(move, (playerState.speed * delta) / planetRadius)
    .normalize();
  playerState.walkTime += delta * 10;
}

function updatePlayerTransform() {
  const bob = playerState.isWalking ? Math.sin(playerState.walkTime * 2) * 0.035 : 0;
  const position = playerState.normal
    .clone()
    .multiplyScalar(planetRadius + playerHeight * 0.5 + bob);

  player.position.copy(position);
  orientToPlanet(player, playerState.normal, playerState.forwardHint);
}

function updatePlayerAnimation(delta) {
  const parts = player.userData.parts;
  const walkBlend = playerState.isWalking ? 1 : 0;
  const swing = Math.sin(playerState.walkTime) * 0.55 * walkBlend;
  const settle = 1 - Math.exp(-delta * 10);

  parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, swing, settle);
  parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, -swing, settle);
  parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, -swing, settle);
  parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, swing, settle);
  parts.body.rotation.z = Math.sin(playerState.walkTime * 0.5) * 0.05 * walkBlend;
  parts.bag.rotation.z = Math.sin(playerState.walkTime + 0.8) * 0.12 * walkBlend;
}

function updateNpcTransforms(elapsed) {
  npcs.forEach((npc, index) => {
    const idle = Math.sin(elapsed * 2 + index) * 0.035;
    const position = npc.normal.clone().multiplyScalar(planetRadius + 0.28 + idle);
    npc.group.position.copy(position);

    const lookDirection = player.position.clone().sub(npc.group.position);
    lookDirection.projectOnPlane(npc.normal).normalize();
    if (lookDirection.lengthSq() < 0.001) {
      lookDirection.copy(new THREE.Vector3(0, 0, 1));
    }
    orientToPlanet(npc.group, npc.normal, lookDirection);
  });
}

function updateTargetMarker(elapsed) {
  if (quest.phase === "done") {
    targetMarker.visible = false;
    return;
  }

  const targetNpc = getTargetNpc();
  const bob = Math.sin(elapsed * 4) * 0.12;
  targetMarker.visible = true;
  targetMarker.position
    .copy(targetNpc.normal)
    .multiplyScalar(planetRadius + 1.05 + bob);
  orientToPlanet(targetMarker, targetNpc.normal, playerState.normal);
  targetMarker.rotateY(elapsed * 1.6);
}

function orientToPlanet(object, normal, forward) {
  tempQuaternion.setFromUnitVectors(worldUp, normal);
  object.quaternion.copy(tempQuaternion);

  const localForward = tempVectorTwo.set(0, 0, -1).applyQuaternion(object.quaternion);
  const projectedForward = tempVectorThree.copy(forward).projectOnPlane(normal).normalize();

  if (projectedForward.lengthSq() > 0.001) {
    tempTurnQuaternion.setFromUnitVectors(localForward.normalize(), projectedForward);
    object.quaternion.premultiply(tempTurnQuaternion);
  }
}

function updateQuest() {
  if (quest.phase === "done") {
    return;
  }

  const targetNpc = getTargetNpc();
  const distance = getSurfaceDistance(playerState.normal, targetNpc.normal);
  distanceStatus.textContent = `Target: ${targetNpc.name} (${distance.toFixed(1)} m)`;

  if (quest.phase === "pickup" && distance < interactionDistance) {
    quest.phase = "delivery";
    updateQuestUi();
    return;
  }

  if (quest.phase === "delivery" && distance < interactionDistance) {
    quest.phase = "done";
    quest.completedAt = clock.elapsedTime;
    startCompletionEffect(npcs[1].normal);
    updateQuestUi();
  }
}

function updateDialog() {
  if (quest.phase === "done") {
    const doneDistance = getSurfaceDistance(playerState.normal, npcs[1].normal);
    if (doneDistance <= dialogDistance || clock.elapsedTime - quest.completedAt < 2.4) {
      showDialog(npcs[1], npcs[1].dialogAfter);
    } else {
      dialogPanel.classList.add("hidden");
    }
    return;
  }

  const nearest = npcs
    .map((npc) => ({
      npc,
      distance: getSurfaceDistance(playerState.normal, npc.normal),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (nearest.distance > dialogDistance) {
    dialogPanel.classList.add("hidden");
    return;
  }

  if (nearest.npc.id === "a") {
    const text = quest.phase === "pickup" ? nearest.npc.dialogBefore : nearest.npc.dialogAfter;
    showDialog(nearest.npc, text);
    return;
  }

  const text = quest.phase === "delivery" ? nearest.npc.dialogBefore : nearest.npc.dialogAfter;
  showDialog(nearest.npc, text);
}

function showDialog(npc, text) {
  dialogSpeaker.textContent = npc.name;
  dialogText.textContent = text;
  dialogPanel.classList.remove("hidden");
}

function updateQuestUi() {
  if (quest.phase === "pickup") {
    missionTitle.textContent = "Ambil surat dari NPC A";
    missionDetail.textContent =
      "Ikuti marker kuning ke NPC A. Surat otomatis diambil saat kamu cukup dekat.";
    letterStatus.textContent = "Surat: belum diambil";
    distanceStatus.textContent = "Target: NPC A";
    questStep.textContent = "1/2";
    questProgressFill.style.width = "18%";
    letterStatus.classList.remove("muted");
    distanceStatus.classList.add("muted");
    completionFlash.classList.add("hidden");
    completionFlash.classList.remove("show");
    return;
  }

  if (quest.phase === "delivery") {
    missionTitle.textContent = "Antar surat ke NPC B";
    missionDetail.textContent =
      "Surat sudah di tas. Ikuti marker ke NPC B untuk menyelesaikan misi.";
    letterStatus.textContent = "Surat: dibawa";
    distanceStatus.textContent = "Target: NPC B";
    questStep.textContent = "2/2";
    questProgressFill.style.width = "62%";
    letterStatus.classList.remove("muted");
    distanceStatus.classList.add("muted");
    return;
  }

  missionTitle.textContent = "Misi selesai";
  missionDetail.textContent = "Surat berhasil diantar. Terima kasih sudah menjaga rute planet.";
  letterStatus.textContent = "Surat: terkirim";
  distanceStatus.textContent = "Target: selesai";
  questStep.textContent = "OK";
  questProgressFill.style.width = "100%";
  letterStatus.classList.add("muted");
  distanceStatus.classList.add("muted");
  completionFlash.classList.remove("hidden");
  requestAnimationFrame(() => completionFlash.classList.add("show"));
}

function startCompletionEffect(normal) {
  completionEffect.active = true;
  completionEffect.age = 0;
  completionEffect.points.visible = true;
  completionEffect.points.material.opacity = 1;
  completionEffect.points.position.copy(normal).multiplyScalar(planetRadius + 0.85);
}

function updateCompletionEffect(delta) {
  if (!completionEffect.active) {
    return;
  }

  completionEffect.age += delta;
  const positions = completionEffect.points.geometry.attributes.position.array;
  for (let index = 0; index < completionEffect.velocities.length; index += 1) {
    const velocity = completionEffect.velocities[index];
    positions[index * 3] += velocity.x * delta;
    positions[index * 3 + 1] += velocity.y * delta;
    positions[index * 3 + 2] += velocity.z * delta;
  }
  completionEffect.points.geometry.attributes.position.needsUpdate = true;
  completionEffect.points.material.opacity = Math.max(0, 1 - completionEffect.age / 1.4);

  if (completionEffect.age > 1.4) {
    completionEffect.active = false;
    completionEffect.points.visible = false;
  }

  if (quest.phase === "done" && clock.elapsedTime - quest.completedAt > 1.9) {
    completionFlash.classList.remove("show");
  }
}

function updateCamera(delta) {
  const up = playerState.normal;
  const behind = playerState.forwardHint
    .clone()
    .projectOnPlane(up)
    .normalize()
    .multiplyScalar(-3.4);
  const desiredPosition = player.position
    .clone()
    .add(up.clone().multiplyScalar(2.15))
    .add(behind);

  camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 5));
  const lookAt = player.position.clone().add(up.clone().multiplyScalar(0.46));
  camera.lookAt(lookAt);
}

function getTargetNpc() {
  return quest.phase === "pickup" ? npcs[0] : npcs[1];
}

function getSurfaceDistance(normalA, normalB) {
  const dot = THREE.MathUtils.clamp(normalA.dot(normalB), -1, 1);
  return Math.acos(dot) * planetRadius;
}
