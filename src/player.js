import * as THREE from "three";
import { orientToPlanet, planetRadius, playerHeight } from "./utils.js";

const tempMove = new THREE.Vector3();
const sphericalForward = new THREE.Vector3();
const sphericalRight = new THREE.Vector3();

export function createPlayer() {
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

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 18),
    new THREE.MeshBasicMaterial({
      color: 0x1f2937,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  return {
    group,
    state: {
      normal: new THREE.Vector3(0.16, 1, 0.08).normalize(),
      forwardHint: new THREE.Vector3(0, 0, -1),
      speed: 1.35,
      isWalking: false,
      walkTime: 0,
      idleTime: 0,
    },
    parts: {
      body,
      bag,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    },
  };
}

export function resetPlayer(player) {
  player.state.normal.set(0.16, 1, 0.08).normalize();
  player.state.forwardHint.set(0, 0, -1);
  player.state.isWalking = false;
  player.state.walkTime = 0;
  player.state.idleTime = 0;
  Object.values(player.parts).forEach((part) => {
    part.rotation.set(0, 0, 0);
  });
  updatePlayerTransform(player);
}

export function updateMovement(player, keys, touchVector, delta) {
  const { state } = player;
  const up = state.normal;
  sphericalRight.crossVectors(state.forwardHint, up).normalize();
  sphericalForward.crossVectors(up, sphericalRight).normalize();

  tempMove.set(0, 0, 0);

  if (keys.has("KeyW")) {
    tempMove.add(sphericalForward);
  }
  if (keys.has("KeyS")) {
    tempMove.sub(sphericalForward);
  }
  if (keys.has("KeyA")) {
    tempMove.sub(sphericalRight);
  }
  if (keys.has("KeyD")) {
    tempMove.add(sphericalRight);
  }
  if (touchVector.y !== 0) {
    tempMove.addScaledVector(sphericalForward, touchVector.y);
  }
  if (touchVector.x !== 0) {
    tempMove.addScaledVector(sphericalRight, touchVector.x);
  }

  state.isWalking = tempMove.lengthSq() > 0;
  if (!state.isWalking) {
    state.idleTime += delta;
    return;
  }

  tempMove.normalize();
  state.forwardHint.copy(tempMove);
  state.normal.addScaledVector(tempMove, (state.speed * delta) / planetRadius).normalize();
  state.walkTime += delta * 10;
  state.idleTime += delta;
}

export function updatePlayerTransform(player) {
  const { state } = player;
  const idleBob = Math.sin(state.idleTime * 2.4) * 0.012;
  const walkBob = state.isWalking ? Math.sin(state.walkTime * 2) * 0.035 : 0;
  const bob = idleBob + walkBob;
  player.group.position.copy(state.normal).multiplyScalar(planetRadius + playerHeight * 0.5 + bob);
  orientToPlanet(player.group, state.normal, state.forwardHint);
}

export function updatePlayerAnimation(player, delta) {
  const { parts, state } = player;
  const walkBlend = state.isWalking ? 1 : 0;
  const swing = Math.sin(state.walkTime) * 0.55 * walkBlend;
  const settle = 1 - Math.exp(-delta * 10);
  const idleBreath = Math.sin(state.idleTime * 2.4) * (1 - walkBlend);

  parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, swing, settle);
  parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, -swing, settle);
  parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, -swing, settle);
  parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, swing, settle);
  parts.body.rotation.x = THREE.MathUtils.lerp(parts.body.rotation.x, -0.08 * walkBlend, settle);
  parts.body.rotation.z = Math.sin(state.walkTime * 0.5) * 0.05 * walkBlend + idleBreath * 0.025;
  parts.bag.rotation.z = Math.sin(state.walkTime + 0.8) * 0.12 * walkBlend;
}
