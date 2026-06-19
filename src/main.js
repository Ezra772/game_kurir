import * as THREE from "three";
import "./styles.css";
import { createAudioManager } from "./audio.js";
import {
  advanceQuest,
  createQuestState,
  getActiveQuest,
  getTargetNpcId,
  npcData,
  pauseQuestTimer,
  resetQuestState,
  resumeQuestTimer,
} from "./quest.js";
import {
  createPlayer,
  resetPlayer,
  updateMovement,
  updatePlayerAnimation,
  updatePlayerTransform,
} from "./player.js";
import { createUi } from "./ui.js";
import { dialogDistance, getSurfaceDistance } from "./utils.js";
import {
  createCompletionEffect,
  createDecorations,
  createNpcs,
  createPlanet,
  createTargetMarker,
  pulseTargetMarker,
  setupScene,
  startCompletionEffect,
  updateCompletionEffect,
  updateNpcTransforms,
  updateTargetMarker,
} from "./world.js";

const canvas = document.querySelector("#game-canvas");
let isCompactView = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
const scene = new THREE.Scene();
setupScene(scene, { lowPower: isCompactView });

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
renderer.setSize(window.innerWidth, window.innerHeight);
updateRendererQuality();

const clock = new THREE.Clock();
const keys = new Set();
const ui = createUi();
const audio = createAudioManager();
const questState = createQuestState();
const touchVector = { x: 0, y: 0 };
const joystickCenter = { x: 0, y: 0 };

const npcs = createNpcs(npcData);
const npcsById = new Map(npcs.map((npc) => [npc.id, npc]));

const planet = createPlanet(npcs);
const decorations = createDecorations({ lowPower: isCompactView });
const player = createPlayer();
const targetMarker = createTargetMarker();
const completionEffect = createCompletionEffect({ lowPower: isCompactView });

scene.add(planet, decorations, player.group, targetMarker, completionEffect.points);
npcs.forEach((npc) => scene.add(npc.group));

const cameraBehind = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const cameraLookAt = new THREE.Vector3();
const tempUp = new THREE.Vector3();

let lastTargetDistance = null;
let allDoneScreenShown = false;
let isPaused = false;
let pendingInteraction = false;
let canInteract = false;
let joystickPointerId = null;

resetGame();
animate();

window.addEventListener("keydown", (event) => {
  audio.unlock();
  keys.add(event.code);
  if (event.code === "KeyE") {
    requestInteraction();
  }
  if (event.code === "KeyP" || event.code === "Escape") {
    togglePause();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  isCompactView = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  updateRendererQuality();
});

ui.onRestart(resetGame);
ui.onPause(togglePause);
ui.onFullscreen(toggleFullscreen);
ui.onAction(requestInteraction);
ui.onMute(toggleMute);
ui.onVolume(updateVolume);
ui.setAudioState({ muted: audio.muted, volume: audio.volume });
setupJoystick();
document.addEventListener("fullscreenchange", () => {
  ui.setFullscreenActive(Boolean(document.fullscreenElement));
});

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;
  const delta = isPaused ? 0 : rawDelta;

  if (!isPaused) {
    updateMovement(player, keys, touchVector, delta);
    updatePlayerTransform(player);
    updatePlayerAnimation(player, delta);
    audio.tickWalk(player.state.isWalking, delta);
    updateNpcTransforms(npcs, player.group.position, elapsed);
    updateQuest(elapsed);
    updateTargetMarker(targetMarker, getTargetNpc(), elapsed);
    updateDialog(elapsed);
    updateCompletionVisuals(delta, elapsed);
    updateCamera(delta);
  }

  ui.updateHud(questState, npcsById, elapsed, lastTargetDistance);

  renderer.render(scene, camera);
}

function updateQuest(elapsed) {
  const targetNpc = getTargetNpc();
  if (!targetNpc || questState.phase === "allDone") {
    lastTargetDistance = null;
    canInteract = false;
    ui.setActionEnabled(false);
    pendingInteraction = false;
    return;
  }

  lastTargetDistance = getSurfaceDistance(player.state.normal, targetNpc.normal);
  canInteract = lastTargetDistance < 0.8;
  ui.setActionEnabled(canInteract);

  if (!canInteract || !pendingInteraction) {
    pendingInteraction = false;
    return;
  }

  const result = advanceQuest(questState, elapsed);
  pendingInteraction = false;
  lastTargetDistance = null;
  audio.play("interact");

  if (result === "picked") {
    audio.play("pickup");
    ui.pulseAction();
  }

  if (result === "completed" || result === "allDone") {
    const completedNpc = npcsById.get(questState.lastCompletedNpcId);
    startCompletionEffect(completionEffect, completedNpc.normal);
    ui.showQuestFlash();
    ui.showScorePop(questState.reward);
    audio.play(result === "allDone" ? "gameComplete" : "questComplete");
  }

  if (result === "allDone" && !allDoneScreenShown) {
    allDoneScreenShown = true;
    ui.showCompleteScreen(questState, elapsed);
  }
}

function updateDialog(elapsed) {
  const nearestNpc = getNearestNpc();
  if (!nearestNpc || nearestNpc.distance > dialogDistance) {
    ui.setInteractionHint(false);
    if (!(questState.phase === "allDone" && elapsed - questState.completedAt < 2.4)) {
      ui.hideDialog();
    }
    return;
  }

  ui.setInteractionHint(true, `Dekat ${nearestNpc.npc.name}`);
  const activeQuest = getActiveQuest(questState);
  if (!activeQuest || questState.phase === "allDone") {
    ui.showDialog(nearestNpc.npc.name, "Terima kasih, semua suratnya sudah sampai.");
    return;
  }

  if (questState.phase === "pickup" && nearestNpc.npc.id === activeQuest.from) {
    ui.showDialog(nearestNpc.npc.name, "Tolong antar surat ini. Tekan E atau tombol Aksi.");
    return;
  }

  if (questState.phase === "delivery" && nearestNpc.npc.id === activeQuest.to) {
    ui.showDialog(nearestNpc.npc.name, "Terima kasih, suratnya sudah sampai. Tekan E atau tombol Aksi.");
    return;
  }

  ui.showDialog(nearestNpc.npc.name, "Semoga harimu menyenangkan.");
}

function updateCompletionVisuals(delta, elapsed) {
  updateCompletionEffect(completionEffect, delta);

  if (elapsed - questState.completedAt > 1.9) {
    ui.hideQuestFlash();
  }

  if (elapsed - questState.completedAt > 1.15) {
    ui.hideScorePop();
  }
}

function updateCamera(delta) {
  tempUp.copy(player.state.normal);
  cameraBehind
    .copy(player.state.forwardHint)
    .projectOnPlane(tempUp)
    .normalize()
    .multiplyScalar(isCompactView ? -4.35 : -3.75);

  desiredCameraPosition
    .copy(player.group.position)
    .addScaledVector(tempUp, isCompactView ? 2.7 : 2.35)
    .add(cameraBehind);

  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-delta * (isCompactView ? 4 : 5)));
  cameraLookAt.copy(player.group.position).addScaledVector(tempUp, 0.46);
  camera.lookAt(cameraLookAt);
}

function resetGame() {
  audio.unlock();
  audio.play("ui");
  const elapsed = clock.elapsedTime;
  keys.clear();
  touchVector.x = 0;
  touchVector.y = 0;
  pendingInteraction = false;
  canInteract = false;
  isPaused = false;
  resetQuestState(questState, elapsed);
  resetPlayer(player);
  allDoneScreenShown = false;
  lastTargetDistance = null;
  completionEffect.active = false;
  completionEffect.points.visible = false;
  ui.hideCompleteScreen();
  ui.hideDialog();
  ui.hideQuestFlashHard();
  ui.hideScorePopHard();
  ui.setInteractionHint(false);
  ui.setPaused(false);
  ui.setActionEnabled(false);
  ui.updateHud(questState, npcsById, elapsed, null);
  updateTargetMarker(targetMarker, getTargetNpc(), elapsed);
}

function requestInteraction() {
  if (!isPaused) {
    audio.unlock();
    ui.pulseAction();
    pulseTargetMarker(targetMarker, clock.elapsedTime);
    if (!canInteract) {
      audio.play("ui");
    }
    pendingInteraction = true;
  }
}

function togglePause() {
  if (questState.phase === "allDone") {
    return;
  }

  isPaused = !isPaused;
  const elapsed = clock.elapsedTime;
  if (isPaused) {
    audio.play("ui");
    audio.stopBgm();
    pauseQuestTimer(questState, elapsed);
    touchVector.x = 0;
    touchVector.y = 0;
    resetJoystickKnob();
    ui.setActionEnabled(false);
  } else {
    audio.play("ui");
    resumeQuestTimer(questState, elapsed);
    audio.startBgm();
  }
  ui.setPaused(isPaused);
}

function toggleFullscreen() {
  audio.unlock();
  audio.play("ui");
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
    return;
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function toggleMute() {
  const nextMuted = !audio.muted;
  audio.setMuted(nextMuted);
  if (!nextMuted) {
    audio.play("ui");
  }
  ui.setAudioState({ muted: audio.muted, volume: audio.volume });
}

function updateVolume(volume) {
  audio.setVolume(volume);
  ui.setAudioState({ muted: audio.muted, volume: audio.volume });
}

function setupJoystick() {
  const { joystickZone } = ui.elements;
  joystickZone.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    audio.unlock();
    joystickPointerId = event.pointerId;
    joystickZone.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  joystickZone.addEventListener("pointermove", (event) => {
    if (event.pointerId === joystickPointerId) {
      updateJoystick(event);
    }
  });

  joystickZone.addEventListener("pointerup", endJoystick);
  joystickZone.addEventListener("pointercancel", endJoystick);
}

function updateJoystick(event) {
  const { joystickZone, joystickKnob } = ui.elements;
  const rect = joystickZone.getBoundingClientRect();
  joystickCenter.x = rect.left + rect.width * 0.5;
  joystickCenter.y = rect.top + rect.height * 0.5;
  const maxDistance = rect.width * 0.34;
  const dx = event.clientX - joystickCenter.x;
  const dy = event.clientY - joystickCenter.y;
  const distance = Math.min(Math.hypot(dx, dy), maxDistance);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * distance;
  const knobY = Math.sin(angle) * distance;

  touchVector.x = knobX / maxDistance;
  touchVector.y = -knobY / maxDistance;
  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
}

function endJoystick(event) {
  if (event.pointerId !== joystickPointerId) {
    return;
  }
  joystickPointerId = null;
  touchVector.x = 0;
  touchVector.y = 0;
  resetJoystickKnob();
}

function resetJoystickKnob() {
  ui.elements.joystickKnob.style.transform = "translate(-50%, -50%)";
}

function updateRendererQuality() {
  const isSmallScreen = window.innerWidth <= 720 || window.innerHeight <= 560;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.25 : 1.75));
}

function getTargetNpc() {
  const targetNpcId = getTargetNpcId(questState);
  return targetNpcId ? npcsById.get(targetNpcId) : null;
}

function getNearestNpc() {
  let nearestNpc = null;
  let nearestDistance = Infinity;

  for (const npc of npcs) {
    const distance = getSurfaceDistance(player.state.normal, npc.normal);
    if (distance < nearestDistance) {
      nearestNpc = npc;
      nearestDistance = distance;
    }
  }

  return nearestNpc
    ? {
        npc: nearestNpc,
        distance: nearestDistance,
      }
    : null;
}
