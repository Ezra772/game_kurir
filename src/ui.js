import { formatTime } from "./utils.js";
import { getActiveQuest, getElapsedGameTime, questList } from "./quest.js";

export function createUi() {
  const elements = {
    missionTitle: document.querySelector("#mission-title"),
    missionDetail: document.querySelector("#mission-detail"),
    letterStatus: document.querySelector("#letter-status"),
    distanceStatus: document.querySelector("#distance-status"),
    questStep: document.querySelector("#quest-step"),
    questProgressFill: document.querySelector("#quest-progress-fill"),
    dialogPanel: document.querySelector("#dialog-panel"),
    dialogSpeaker: document.querySelector("#dialog-speaker"),
    dialogText: document.querySelector("#dialog-text"),
    completionFlash: document.querySelector("#completion-flash"),
    scorePop: document.querySelector("#score-pop"),
    scoreStatus: document.querySelector("#score-status"),
    completedStatus: document.querySelector("#completed-status"),
    timerStatus: document.querySelector("#timer-status"),
    interactionStatus: document.querySelector("#interaction-status"),
    completeScreen: document.querySelector("#complete-screen"),
    finalScore: document.querySelector("#final-score"),
    finalTime: document.querySelector("#final-time"),
    restartButton: document.querySelector("#restart-button"),
    pauseButton: document.querySelector("#pause-button"),
    fullscreenButton: document.querySelector("#fullscreen-button"),
    muteButton: document.querySelector("#mute-button"),
    volumeSlider: document.querySelector("#volume-slider"),
    actionButton: document.querySelector("#action-button"),
    pauseOverlay: document.querySelector("#pause-overlay"),
    joystickZone: document.querySelector("#joystick-zone"),
    joystickKnob: document.querySelector("#joystick-knob"),
  };

  return {
    elements,
    onRestart(callback) {
      elements.restartButton.addEventListener("click", callback);
    },
    onPause(callback) {
      elements.pauseButton.addEventListener("click", callback);
    },
    onFullscreen(callback) {
      elements.fullscreenButton.addEventListener("click", callback);
    },
    onMute(callback) {
      elements.muteButton.addEventListener("click", callback);
    },
    onVolume(callback) {
      elements.volumeSlider.addEventListener("input", () => {
        callback(Number(elements.volumeSlider.value));
      });
    },
    onAction(callback) {
      elements.actionButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        callback();
      });
    },
    updateHud(state, npcsById, elapsed, targetDistance = null) {
      const activeQuest = getActiveQuest(state);
      const gameTime = getElapsedGameTime(state, elapsed);

      elements.scoreStatus.textContent = `Skor ${state.score}`;
      elements.completedStatus.textContent = `Selesai ${state.completedCount}/${questList.length}`;
      elements.timerStatus.textContent = formatTime(gameTime);

      if (!activeQuest || state.phase === "allDone") {
        elements.missionTitle.textContent = "Semua surat terkirim";
        elements.missionDetail.textContent = "Planet kecil ini sudah menerima semua suratnya.";
        elements.letterStatus.textContent = "Surat: selesai";
        elements.distanceStatus.textContent = "Target: selesai";
        elements.questStep.textContent = "OK";
        elements.questProgressFill.style.width = "100%";
        elements.letterStatus.classList.add("muted");
        elements.distanceStatus.classList.add("muted");
        return;
      }

      const sender = npcsById.get(activeQuest.from);
      const receiver = npcsById.get(activeQuest.to);
      const target = state.phase === "pickup" ? sender : receiver;
      const questNumber = state.currentIndex + 1;
      const phaseProgress = state.phase === "pickup" ? 0.45 : 0.9;
      const progress = ((state.currentIndex + phaseProgress) / questList.length) * 100;

      elements.questStep.textContent = `${questNumber}/${questList.length}`;
      elements.questProgressFill.style.width = `${progress}%`;
      elements.missionTitle.textContent =
        state.phase === "pickup"
          ? `Ambil surat dari ${sender.name}`
          : `Antar surat ke ${receiver.name}`;
      elements.missionDetail.textContent =
        state.phase === "pickup"
          ? `Pergi ke ${sender.name}, lalu tekan E atau Aksi untuk mengambil surat.`
          : `Surat sudah dibawa. Tekan E atau Aksi di dekat ${receiver.name}.`;
      elements.letterStatus.textContent =
        state.phase === "pickup" ? "Surat: belum diambil" : "Surat: dibawa";
      elements.distanceStatus.textContent =
        targetDistance === null
          ? `Target: ${target.name}`
          : `Target: ${target.name} (${targetDistance.toFixed(1)} m)`;
      elements.letterStatus.classList.toggle("muted", state.phase !== "delivery");
      elements.distanceStatus.classList.add("muted");
    },
    showDialog(name, text) {
      elements.dialogSpeaker.textContent = name;
      elements.dialogText.textContent = text;
      elements.dialogPanel.classList.remove("hidden");
    },
    hideDialog() {
      elements.dialogPanel.classList.add("hidden");
    },
    showQuestFlash() {
      elements.completionFlash.textContent = "Misi Selesai!";
      elements.completionFlash.classList.remove("hidden");
      requestAnimationFrame(() => elements.completionFlash.classList.add("show"));
    },
    showScorePop(amount) {
      elements.scorePop.textContent = `+${amount}`;
      elements.scorePop.classList.remove("hidden");
      elements.scoreStatus.classList.remove("bump");
      requestAnimationFrame(() => {
        elements.scorePop.classList.add("show");
        elements.scoreStatus.classList.add("bump");
      });
    },
    hideScorePop() {
      elements.scorePop.classList.remove("show");
      elements.scoreStatus.classList.remove("bump");
    },
    hideScorePopHard() {
      elements.scorePop.classList.add("hidden");
      elements.scorePop.classList.remove("show");
      elements.scoreStatus.classList.remove("bump");
    },
    setInteractionHint(isVisible, text = "Dekat NPC") {
      elements.interactionStatus.textContent = text;
      elements.interactionStatus.classList.toggle("hidden", !isVisible);
      elements.interactionStatus.classList.toggle("ready", isVisible);
    },
    setPaused(isPaused) {
      elements.pauseButton.textContent = isPaused ? "Resume" : "Pause";
      elements.pauseOverlay.classList.toggle("hidden", !isPaused);
    },
    setFullscreenActive(isActive) {
      elements.fullscreenButton.textContent = isActive ? "Exit Fullscreen" : "Fullscreen";
    },
    setActionEnabled(isEnabled) {
      elements.actionButton.disabled = !isEnabled;
      elements.actionButton.textContent = isEnabled ? "Aksi" : "Dekat";
    },
    setAudioState({ muted, volume }) {
      elements.muteButton.textContent = muted ? "Sound Off" : "Sound On";
      elements.volumeSlider.value = String(volume);
    },
    pulseAction() {
      elements.actionButton.classList.remove("feedback");
      requestAnimationFrame(() => elements.actionButton.classList.add("feedback"));
      window.setTimeout(() => elements.actionButton.classList.remove("feedback"), 320);
    },
    hideQuestFlash() {
      elements.completionFlash.classList.remove("show");
    },
    hideQuestFlashHard() {
      elements.completionFlash.classList.add("hidden");
      elements.completionFlash.classList.remove("show");
    },
    showCompleteScreen(state, elapsed) {
      elements.finalScore.textContent = `Total skor: ${state.score}`;
      elements.finalTime.textContent = `Total waktu: ${formatTime(getElapsedGameTime(state, elapsed))}`;
      elements.completeScreen.classList.remove("hidden");
    },
    hideCompleteScreen() {
      elements.completeScreen.classList.add("hidden");
    },
  };
}
