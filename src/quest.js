export const npcData = [
  {
    id: "a",
    name: "NPC A",
    color: 0x4dabf7,
    normal: [-0.72, 0.5, -0.36],
  },
  {
    id: "b",
    name: "NPC B",
    color: 0xff6b6b,
    normal: [0.72, 0.38, 0.58],
  },
  {
    id: "c",
    name: "NPC C",
    color: 0x22c55e,
    normal: [-0.18, 0.82, 0.54],
  },
  {
    id: "d",
    name: "NPC D",
    color: 0xa78bfa,
    normal: [0.22, 0.72, -0.66],
  },
  {
    id: "e",
    name: "NPC E",
    color: 0xfb923c,
    normal: [-0.86, 0.28, 0.42],
  },
];

export const questList = [
  { from: "a", to: "b" },
  { from: "c", to: "d" },
  { from: "e", to: "a" },
  { from: "b", to: "e" },
  { from: "d", to: "c" },
];

export function createQuestState() {
  return {
    currentIndex: 0,
    phase: "pickup",
    score: 0,
    completedCount: 0,
    reward: 100,
    startedAt: 0,
    finishedAt: null,
    pausedAt: null,
    pausedTotal: 0,
    completedAt: -999,
    lastCompletedNpcId: null,
  };
}

export function resetQuestState(state, elapsed) {
  state.currentIndex = 0;
  state.phase = "pickup";
  state.score = 0;
  state.completedCount = 0;
  state.startedAt = elapsed;
  state.finishedAt = null;
  state.pausedAt = null;
  state.pausedTotal = 0;
  state.completedAt = -999;
  state.lastCompletedNpcId = null;
}

export function getActiveQuest(state) {
  return questList[state.currentIndex] ?? null;
}

export function getTargetNpcId(state) {
  const activeQuest = getActiveQuest(state);
  if (!activeQuest || state.phase === "allDone") {
    return null;
  }
  return state.phase === "pickup" ? activeQuest.from : activeQuest.to;
}

export function getElapsedGameTime(state, elapsed) {
  const endTime = state.finishedAt ?? state.pausedAt ?? elapsed;
  return Math.max(0, endTime - state.startedAt - state.pausedTotal);
}

export function pauseQuestTimer(state, elapsed) {
  if (state.pausedAt === null && state.phase !== "allDone") {
    state.pausedAt = elapsed;
  }
}

export function resumeQuestTimer(state, elapsed) {
  if (state.pausedAt !== null) {
    state.pausedTotal += elapsed - state.pausedAt;
    state.pausedAt = null;
  }
}

export function advanceQuest(state, elapsed) {
  if (state.phase === "pickup") {
    state.phase = "delivery";
    return "picked";
  }

  if (state.phase !== "delivery") {
    return "none";
  }

  const activeQuest = getActiveQuest(state);
  state.score += state.reward;
  state.completedCount += 1;
  state.completedAt = elapsed;
  state.lastCompletedNpcId = activeQuest.to;

  if (state.completedCount >= questList.length) {
    state.phase = "allDone";
    state.finishedAt = elapsed;
    return "allDone";
  }

  state.currentIndex += 1;
  state.phase = "pickup";
  return "completed";
}
