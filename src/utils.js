import * as THREE from "three";

export const planetRadius = 4;
export const playerHeight = 0.55;
export const interactionDistance = 0.8;
export const dialogDistance = 1.25;
export const worldUp = new THREE.Vector3(0, 1, 0);

const tempQuaternion = new THREE.Quaternion();
const tempTurnQuaternion = new THREE.Quaternion();
const localForward = new THREE.Vector3();
const projectedForward = new THREE.Vector3();

export function getSurfaceDistance(normalA, normalB) {
  const dot = THREE.MathUtils.clamp(normalA.dot(normalB), -1, 1);
  return Math.acos(dot) * planetRadius;
}

export function orientToPlanet(object, normal, forward) {
  tempQuaternion.setFromUnitVectors(worldUp, normal);
  object.quaternion.copy(tempQuaternion);

  localForward.set(0, 0, -1).applyQuaternion(object.quaternion);
  projectedForward.copy(forward).projectOnPlane(normal).normalize();

  if (projectedForward.lengthSq() > 0.001) {
    tempTurnQuaternion.setFromUnitVectors(localForward.normalize(), projectedForward);
    object.quaternion.premultiply(tempTurnQuaternion);
  }
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getFallbackTangent(normal, target) {
  target.set(normal.z, 0, -normal.x).projectOnPlane(normal).normalize();
  if (target.lengthSq() < 0.01) {
    target.set(1, 0, 0).projectOnPlane(normal).normalize();
  }
  return target;
}
