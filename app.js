const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core"
];

const EQUIPMENT_OPTIONS = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "smith-machine",
  "bodyweight",
  "kettlebell",
  "ez-bar",
  "sled",
  "landmine"
];

const SPLIT_FOCUS_MAP = {
  "full-body": ["full body"],
  "upper-lower": ["upper", "lower"],
  "push-pull-legs": ["push", "pull", "legs"]
};

const FOCUS_GROUPS = {
  "full body": MUSCLE_GROUPS,
  upper: ["chest", "back", "shoulders", "biceps", "triceps", "core"],
  lower: ["quads", "hamstrings", "glutes", "calves", "core"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "core"],
  legs: ["quads", "hamstrings", "glutes", "calves", "core"]
};

const DIFFICULTY_PRESETS = {
  beginner: { sets: 3, reps: "10-12", rest: 90, compounds: 0.45 },
  intermediate: { sets: 4, reps: "8-12", rest: 75, compounds: 0.6 },
  advanced: { sets: 5, reps: "5-10", rest: 60, compounds: 0.72 }
};

const SESSION_TRACKING_KEY = "forgefit-session-history";

const durationEl = document.getElementById("duration");
const durationValueEl = document.getElementById("duration-value");
const splitEl = document.getElementById("split");
const focusEl = document.getElementById("session-focus");
const difficultyEl = document.getElementById("difficulty");
const muscleWrapEl = document.getElementById("muscle-groups");
const equipmentWrapEl = document.getElementById("equipment");
const generateBtn = document.getElementById("generate-btn");
const startExerciseBtn = document.getElementById("start-exercise-btn");
const resultCard = document.getElementById("result-card");
const workoutMetaEl = document.getElementById("workout-meta");
const workoutListEl = document.getElementById("workout-list");
const historyListEl = document.getElementById("history-list");
const runnerStatusEl = document.getElementById("runner-status");
const sessionSummaryEl = document.getElementById("session-summary");
const sessionSummaryTextEl = document.getElementById("session-summary-text");
const sessionSummaryExtraEl = document.getElementById("session-summary-extra");
const sessionSummaryGarminNoteEl = document.getElementById("session-summary-garmin-note");
const sessionSummaryGarminConnectEl = document.getElementById("session-summary-garmin-connect");
const sessionSummaryGarminVenuEl = document.getElementById("session-summary-garmin-venu");
const startWorkoutBtn = document.getElementById("start-workout-btn");
const dashboardCardEl = document.getElementById("dashboard-card");
const dashboardPanelEl = document.querySelector("#dashboard-card .dashboard-panel");
const dashboardProgressEl = document.getElementById("dashboard-progress");
const dashboardMoodPillEl = document.getElementById("dashboard-mood-pill");
const dashboardPhasePillEl = document.getElementById("dashboard-phase-pill");
const dashboardExerciseEl = document.getElementById("dashboard-exercise");
const dashboardPrescriptionEl = document.getElementById("dashboard-prescription");
const dashboardCuesEl = document.getElementById("dashboard-cues");
const dashboardDemoLinkEl = document.getElementById("dashboard-demo-link");
const dashboardStatusEl = document.getElementById("dashboard-status");
const dashboardWorkoutTimerEl = document.getElementById("dashboard-workout-timer");
const dashboardSetCounterEl = document.getElementById("dashboard-set-counter");
const dashboardExerciseTimerEl = document.getElementById("dashboard-exercise-timer");
const dashboardRestTimerEl = document.getElementById("dashboard-rest-timer");
const dashboardProgressFillEl = document.getElementById("dashboard-progress-fill");
const dashboardProgressNoteEl = document.getElementById("dashboard-progress-note");
const dashboardExerciseTrackEl = document.getElementById("dashboard-exercise-track");
const dashboardNextBtn = document.getElementById("dashboard-next-btn");
const dashboardStopBtn =
  document.getElementById("dashboard-stop-btn") || document.getElementById("dashboard-restart-btn");
const dashboardHideBtn = document.getElementById("dashboard-hide-btn");

let activeWorkout = [];
let sessionState = {
  started: false,
  completed: false,
  isResting: false,
  currentIndex: 0,
  currentSet: 1,
  completedSets: 0,
  restRemaining: 0,
  elapsedSeconds: 0,
  exerciseElapsedSeconds: 0
};
let restIntervalId = null;
let workoutIntervalId = null;
let lastRenderedTrackIndex = -1;
let lastTrackRenderKey = "";
let audioContext = null;

function init() {
  syncViewportHeight();
  registerServiceWorker();
  primeAudioOnInteraction();
  renderCheckboxes(muscleWrapEl, MUSCLE_GROUPS, "muscle");
  renderCheckboxes(equipmentWrapEl, EQUIPMENT_OPTIONS, "equipment", true);
  hydrateFocusOptions(splitEl.value);
  renderHistory();

  durationEl.addEventListener("input", () => {
    durationValueEl.textContent = `${durationEl.value} min`;
  });

  splitEl.addEventListener("change", () => {
    hydrateFocusOptions(splitEl.value);
  });

  generateBtn.addEventListener("click", () => buildWorkout(false));
  if (startExerciseBtn) {
    startExerciseBtn.addEventListener("click", () => buildWorkout(true));
  }
  startWorkoutBtn.addEventListener("click", startWorkout);
  wireDashboardControls();
  window.addEventListener("resize", syncViewportHeight);
  window.addEventListener("orientationchange", syncViewportHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewportHeight);
  }
}

function wireDashboardControls() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      "#dashboard-next-btn, #dashboard-stop-btn, #dashboard-restart-btn, #dashboard-hide-btn"
    );
    if (!target) {
      return;
    }

    if (target.matches("#dashboard-next-btn")) {
      handleNextAction();
      return;
    }
    if (target.matches("#dashboard-stop-btn, #dashboard-restart-btn")) {
      stopWorkout();
      return;
    }
    if (target.matches("#dashboard-hide-btn")) {
      hideDashboard();
    }
  });

  if (dashboardStopBtn) {
    dashboardStopBtn.textContent = "Stop";
  }
}

function renderCheckboxes(container, items, name, checked = false) {
  container.innerHTML = "";
  items.forEach((item) => {
    const label = document.createElement("label");
    label.className = "chip";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = item;
    input.name = name;
    input.checked = checked;

    const text = document.createElement("span");
    text.textContent = capitalize(item.replace("-", " "));

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
}

function hydrateFocusOptions(split) {
  focusEl.innerHTML = "";
  SPLIT_FOCUS_MAP[split].forEach((focus) => {
    const option = document.createElement("option");
    option.value = focus;
    option.textContent = capitalize(focus);
    focusEl.appendChild(option);
  });
}

function buildWorkout(autoStart = false) {
  clearRestTimer();
  clearWorkoutTimer();

  const selectedMuscles = getCheckedValues("muscle");
  const selectedEquipment = getCheckedValues("equipment");
  const duration = Number(durationEl.value);
  const focus = focusEl.value;
  const difficulty = difficultyEl.value;

  if (!selectedEquipment.length) {
    alert("Select at least one equipment option.");
    return;
  }

  const defaultGroups = FOCUS_GROUPS[focus];
  const targetMuscles = selectedMuscles.length
    ? selectedMuscles.filter((muscle) => defaultGroups.includes(muscle))
    : defaultGroups;
  const finalMuscles = targetMuscles.length ? targetMuscles : defaultGroups;

  const candidates = window.EXERCISES.filter(
    (exercise) =>
      exercise.muscles.some((muscle) => finalMuscles.includes(muscle)) &&
      selectedEquipment.includes(exercise.equipment)
  );

  if (!candidates.length) {
    alert("No exercises matched those filters. Add more equipment or muscle groups.");
    return;
  }

  const desiredCount = Math.max(5, Math.min(9, Math.round(duration / 10)));
  const session = pickBalancedExercises(candidates, finalMuscles, desiredCount, difficulty);
  const workout = session.map((exercise, index) => {
    const config = DIFFICULTY_PRESETS[difficulty];
    const isCompoundLead = index < Math.ceil(desiredCount * config.compounds);
    const sets = exercise.compound && isCompoundLead ? config.sets : Math.max(3, config.sets - 1);

    return {
      ...exercise,
      sets,
      reps: exercise.compound ? config.reps : "10-15",
      rest: exercise.compound ? config.rest : config.rest - 15
    };
  });

  renderWorkout(workout, {
    split: splitEl.options[splitEl.selectedIndex].text,
    focus,
    difficulty,
    duration,
    muscles: finalMuscles
  });

  persistWorkout({
    generatedAt: new Date().toISOString(),
    split: splitEl.value,
    focus,
    difficulty,
    duration,
    exercises: workout
  });

  renderHistory();

  if (autoStart) {
    startWorkout();
  }
}

function pickBalancedExercises(candidates, muscles, count, difficulty) {
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = [];
  const covered = new Set();

  for (const muscle of muscles) {
    const match = shuffled.find(
      (exercise) =>
        exercise.muscles.includes(muscle) &&
        !picked.some((item) => item.name === exercise.name)
    );
    if (match) {
      picked.push(match);
      match.muscles.forEach((m) => covered.add(m));
    }
    if (picked.length >= count) {
      break;
    }
  }

  const compoundWeight = DIFFICULTY_PRESETS[difficulty].compounds;
  const ranked = shuffled.sort((a, b) => {
    const aScore = (a.compound ? 1 : 0) * compoundWeight + scoreCoverage(a, covered);
    const bScore = (b.compound ? 1 : 0) * compoundWeight + scoreCoverage(b, covered);
    return bScore - aScore;
  });

  for (const exercise of ranked) {
    if (picked.length >= count) {
      break;
    }
    if (!picked.some((item) => item.name === exercise.name)) {
      picked.push(exercise);
      exercise.muscles.forEach((m) => covered.add(m));
    }
  }

  return picked.slice(0, count);
}

function scoreCoverage(exercise, covered) {
  return exercise.muscles.reduce((total, muscle) => total + (covered.has(muscle) ? 0.08 : 0.28), 0);
}

function renderWorkout(workout, meta) {
  workoutMetaEl.textContent = `${meta.duration} min | ${capitalize(meta.focus)} | ${capitalize(
    meta.difficulty
  )} | ${meta.muscles.map(capitalize).join(", ")}`;

  workoutListEl.innerHTML = "";
  workout.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "workout-item";
    li.dataset.index = String(index);

    const title = document.createElement("h4");
    title.textContent = `${item.name} (${capitalize(item.equipment.replace("-", " "))})`;

    const details = document.createElement("p");
    details.textContent = `${item.sets} sets x ${item.reps} reps | Rest ${item.rest}s | Targets ${item.muscles
      .map(capitalize)
      .join(", ")}`;

    const cueList = document.createElement("ul");
    cueList.className = "demo-cues";
    buildDemoCues(item).forEach((cue) => {
      const cueItem = document.createElement("li");
      cueItem.textContent = cue;
      cueList.appendChild(cueItem);
    });

    const demoLink = document.createElement("a");
    demoLink.className = "demo-link";
    demoLink.href = getDemoUrl(item);
    demoLink.target = "_blank";
    demoLink.rel = "noopener noreferrer";
    demoLink.textContent = "Watch video demo";

    li.appendChild(title);
    li.appendChild(details);
    li.appendChild(cueList);
    li.appendChild(demoLink);
    workoutListEl.appendChild(li);
  });

  resetSessionRunner(workout);
  resultCard.hidden = false;
}

function persistWorkout(workout) {
  const key = "forgefit-history";
  const history = JSON.parse(localStorage.getItem(key) || "[]");
  history.unshift(workout);
  localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
}

function renderHistory() {
  const history = getStoredHistory(SESSION_TRACKING_KEY);
  historyListEl.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = "<h4>No tracked sessions yet</h4><p>Finish or stop a workout to save detailed history.</p>";
    historyListEl.appendChild(li);
    return;
  }

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const details = document.createElement("details");
    details.className = "history-session";

    const summary = document.createElement("summary");
    summary.className = "history-session-summary";

    const dateText = entry.endedAt ? new Date(entry.endedAt).toLocaleString() : "Unknown date";
    const outcomeLabel = entry.outcome === "completed" ? "Completed" : "Stopped";

    const heading = document.createElement("span");
    heading.className = "history-session-heading";
    heading.textContent = `${outcomeLabel} | ${dateText}`;

    const totals = document.createElement("span");
    totals.className = "history-session-totals";
    totals.textContent = `${entry.completedSets || 0}/${entry.totalSets || 0} sets`;

    summary.appendChild(heading);
    summary.appendChild(totals);

    const body = document.createElement("div");
    body.className = "history-session-body";

    const sessionMeta = document.createElement("p");
    sessionMeta.className = "history-session-meta";
    const duration = formatElapsedTime(Number(entry.durationSeconds || 0));
    const totalExercises = Number(entry.totalExercises || (entry.exercises ? entry.exercises.length : 0));
    sessionMeta.textContent = `Duration ${duration} | Exercises ${entry.completedExercises || 0}/${totalExercises} | Sets ${entry.completedSets || 0}/${entry.totalSets || 0}`;
    body.appendChild(sessionMeta);

    const exerciseList = document.createElement("ul");
    exerciseList.className = "history-exercise-list";
    (entry.exercises || []).forEach((exercise) => {
      const exerciseItem = document.createElement("li");
      exerciseItem.className = "history-exercise-item";

      const exerciseTitle = document.createElement("h5");
      exerciseTitle.textContent = exercise.name || "Exercise";

      const exerciseMeta = document.createElement("p");
      const equipment = exercise.equipment
        ? capitalize(String(exercise.equipment).replace("-", " "))
        : "Unknown equipment";
      const muscles = Array.isArray(exercise.muscles) && exercise.muscles.length
        ? exercise.muscles.map(capitalize).join(", ")
        : "N/A";
      exerciseMeta.textContent = `${exercise.completedSets || 0}/${exercise.plannedSets || 0} sets | ${exercise.reps || "-"} reps | ${equipment} | ${muscles}`;

      exerciseItem.appendChild(exerciseTitle);
      exerciseItem.appendChild(exerciseMeta);
      exerciseList.appendChild(exerciseItem);
    });
    body.appendChild(exerciseList);

    details.appendChild(summary);
    details.appendChild(body);
    li.appendChild(details);
    historyListEl.appendChild(li);
  });
}

function getStoredHistory(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function persistSessionRecord(outcome) {
  if (!activeWorkout.length) {
    return;
  }
  if (sessionState.elapsedSeconds <= 0 && sessionState.completedSets <= 0) {
    return;
  }

  const totalSets = countTotalPlannedSets();
  const completedSets = Math.min(sessionState.completedSets, totalSets);
  const completedExercises = countCompletedExercises();
  let setsRemaining = completedSets;

  const exerciseBreakdown = activeWorkout.map((exercise) => {
    const completedForExercise = Math.min(exercise.sets, setsRemaining);
    setsRemaining = Math.max(0, setsRemaining - exercise.sets);
    return {
      name: exercise.name,
      equipment: exercise.equipment,
      muscles: exercise.muscles,
      reps: exercise.reps,
      plannedSets: exercise.sets,
      completedSets: completedForExercise
    };
  });

  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    endedAt: new Date().toISOString(),
    outcome,
    durationSeconds: Math.max(0, Math.floor(sessionState.elapsedSeconds)),
    completedExercises,
    totalExercises: activeWorkout.length,
    completedSets,
    totalSets,
    exercises: exerciseBreakdown
  };

  const history = getStoredHistory(SESSION_TRACKING_KEY);
  history.unshift(record);
  localStorage.setItem(SESSION_TRACKING_KEY, JSON.stringify(history.slice(0, 40)));
}

function resetSessionRunner(workout) {
  clearRestTimer();
  clearWorkoutTimer();
  activeWorkout = workout;
  lastRenderedTrackIndex = -1;
  lastTrackRenderKey = "";
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    currentSet: 1,
    completedSets: 0,
    restRemaining: 0,
    elapsedSeconds: 0,
    exerciseElapsedSeconds: 0
  };

  startWorkoutBtn.disabled = !workout.length;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  runnerStatusEl.textContent = workout.length
    ? `Ready: ${workout.length} exercises. Tap Start Workout Dashboard.`
    : "Generate a workout to begin.";
  if (dashboardNextBtn) {
    setDisabled(dashboardNextBtn, true);
    dashboardNextBtn.textContent = "Next";
  }
  if (dashboardStopBtn) {
    setDisabled(dashboardStopBtn, !workout.length);
  }
  setText(dashboardRestTimerEl, "Rest Timer: --:--");
  hideSessionSummary();
  setDashboardVisible(false);
  renderDashboard();
  updateWorkoutHighlights();
}

function startWorkout() {
  if (!activeWorkout.length) {
    return;
  }

  if (sessionState.completed) {
    restartSession(true);
  }

  if (!sessionState.started) {
    const currentExercise = getCurrentExercise();
    sessionState.started = true;
    sessionState.completed = false;
    sessionState.isResting = false;
    sessionState.currentIndex = Math.min(sessionState.currentIndex, activeWorkout.length - 1);
    sessionState.currentSet = 1;
    if (currentExercise) {
      sessionState.currentSet = Math.min(sessionState.currentSet, currentExercise.sets);
    }
    sessionState.restRemaining = 0;
    sessionState.exerciseElapsedSeconds = 0;
    startWorkoutTimer();
    runnerStatusEl.textContent = "Workout running. Dashboard can be reopened anytime.";
  }

  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Resume Workout Dashboard";
  if (dashboardNextBtn) {
    setDisabled(dashboardNextBtn, false);
    dashboardNextBtn.textContent = sessionState.isResting ? "Next (Skip Rest)" : "Next";
  }
  if (dashboardStopBtn) {
    setDisabled(dashboardStopBtn, false);
  }
  setDashboardVisible(true);
  renderDashboard();
  updateWorkoutHighlights();
}

function handleNextAction() {
  if (!sessionState.started || !activeWorkout.length || sessionState.completed) {
    return;
  }

  if (sessionState.isResting) {
    clearRestTimer();
    advanceAfterRest();
    return;
  }

  const currentExercise = getCurrentExercise();
  if (!currentExercise) {
    return;
  }

  const isFinalExercise = sessionState.currentIndex >= activeWorkout.length - 1;
  const isFinalSet = sessionState.currentSet >= currentExercise.sets;
  sessionState.completedSets += 1;
  if (isFinalExercise && isFinalSet) {
    completeSession();
    return;
  }

  const restSeconds = currentExercise.rest || 60;
  startRestCountdown(restSeconds);
}

function startRestCountdown(seconds) {
  clearRestTimer();
  const nextTarget = getNextPhaseTarget();
  sessionState.isResting = true;
  sessionState.restRemaining = Math.max(5, Number(seconds));
  if (dashboardNextBtn) {
    dashboardNextBtn.textContent = "Next (Skip Rest)";
  }
  if (nextTarget && nextTarget.type === "set") {
    runnerStatusEl.textContent = `Resting before set ${nextTarget.setNumber}.`;
  } else if (nextTarget && nextTarget.type === "exercise") {
    runnerStatusEl.textContent = `Resting before Exercise ${nextTarget.exerciseIndex + 1}.`;
  }
  renderDashboard();
  updateWorkoutHighlights();

  restIntervalId = setInterval(() => {
    sessionState.restRemaining -= 1;
    renderDashboard();

    if (sessionState.restRemaining <= 0) {
      clearRestTimer();
      notifyRestComplete();
      advanceAfterRest();
    }
  }, 1000);
}

function advanceAfterRest() {
  const nextTarget = getNextPhaseTarget();
  sessionState.isResting = false;
  sessionState.restRemaining = 0;
  sessionState.exerciseElapsedSeconds = 0;
  if (dashboardNextBtn) {
    dashboardNextBtn.textContent = "Next";
  }

  if (!nextTarget || nextTarget.type === "complete") {
    completeSession();
    return;
  }

  if (nextTarget.type === "set") {
    sessionState.currentSet = nextTarget.setNumber;
  }
  if (nextTarget.type === "exercise") {
    sessionState.currentIndex = nextTarget.exerciseIndex;
    sessionState.currentSet = 1;
  }

  runnerStatusEl.textContent = formatActiveSetText(sessionState.currentIndex, sessionState.currentSet);
  renderDashboard();
  updateWorkoutHighlights();
}

function completeSession() {
  clearRestTimer();
  clearWorkoutTimer();
  sessionState.completed = true;
  sessionState.started = false;
  sessionState.isResting = false;
  sessionState.currentSet = 1;
  sessionState.restRemaining = 0;
  if (dashboardNextBtn) {
    setDisabled(dashboardNextBtn, true);
    dashboardNextBtn.textContent = "Done";
  }
  if (dashboardStopBtn) {
    setDisabled(dashboardStopBtn, true);
  }
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  const summary = buildSessionSummary("completed");
  persistSessionRecord("completed");
  renderHistory();
  runnerStatusEl.textContent = "Workout complete. Great work.";
  showSessionSummary(summary);
  setDashboardVisible(false);
  updateWorkoutHighlights(true);
  renderDashboard();
  focusSummaryCard();
}

function restartSession(keepDashboard = false) {
  if (!activeWorkout.length) {
    return;
  }

  clearRestTimer();
  clearWorkoutTimer();
  lastRenderedTrackIndex = -1;
  lastTrackRenderKey = "";
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    currentSet: 1,
    completedSets: 0,
    restRemaining: 0,
    elapsedSeconds: 0,
    exerciseElapsedSeconds: 0
  };
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  if (dashboardNextBtn) {
    setDisabled(dashboardNextBtn, true);
    dashboardNextBtn.textContent = "Next";
  }
  if (dashboardStopBtn) {
    setDisabled(dashboardStopBtn, false);
  }
  runnerStatusEl.textContent = `Ready: ${activeWorkout.length} exercises. Tap Start Workout Dashboard.`;
  setText(dashboardRestTimerEl, "Rest Timer: --:--");
  hideSessionSummary();
  setDashboardVisible(keepDashboard);
  renderDashboard();
  updateWorkoutHighlights();
}

function stopWorkout() {
  if (!activeWorkout.length) {
    return;
  }

  clearRestTimer();
  clearWorkoutTimer();
  lastRenderedTrackIndex = -1;
  lastTrackRenderKey = "";
  const summary = buildSessionSummary("stopped");
  persistSessionRecord("stopped");
  renderHistory();
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    currentSet: 1,
    completedSets: 0,
    restRemaining: 0,
    elapsedSeconds: 0,
    exerciseElapsedSeconds: 0
  };
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  if (dashboardNextBtn) {
    setDisabled(dashboardNextBtn, true);
    dashboardNextBtn.textContent = "Next";
  }
  if (dashboardStopBtn) {
    setDisabled(dashboardStopBtn, false);
  }
  runnerStatusEl.textContent = "Workout stopped. Tap Start Workout Dashboard to begin again.";
  showSessionSummary(summary);
  setDashboardVisible(false);
  renderDashboard();
  updateWorkoutHighlights();
  focusSummaryCard();
}

function hideDashboard() {
  setDashboardVisible(false);
  if (sessionState.started && !sessionState.completed) {
    runnerStatusEl.textContent = "Workout running in background. Tap Resume Workout Dashboard anytime.";
  }
}

function clearRestTimer() {
  if (restIntervalId) {
    clearInterval(restIntervalId);
    restIntervalId = null;
  }
}

function startWorkoutTimer() {
  if (workoutIntervalId) {
    return;
  }
  workoutIntervalId = setInterval(() => {
    if (!sessionState.started || sessionState.completed) {
      return;
    }
    sessionState.elapsedSeconds += 1;
    if (!sessionState.isResting) {
      sessionState.exerciseElapsedSeconds += 1;
    }
    renderDashboard();
  }, 1000);
}

function clearWorkoutTimer() {
  if (workoutIntervalId) {
    clearInterval(workoutIntervalId);
    workoutIntervalId = null;
  }
}

function formatActiveSetText(index, setNumber) {
  const exercise = activeWorkout[index];
  return `Exercise ${index + 1}/${activeWorkout.length} • Set ${setNumber}/${exercise.sets}: ${exercise.name}`;
}

function getCurrentExercise() {
  if (!activeWorkout.length) {
    return null;
  }
  const safeIndex = Math.min(Math.max(0, sessionState.currentIndex), activeWorkout.length - 1);
  return activeWorkout[safeIndex];
}

function getNextPhaseTarget() {
  const currentExercise = getCurrentExercise();
  if (!currentExercise) {
    return { type: "complete" };
  }
  if (sessionState.currentSet < currentExercise.sets) {
    return {
      type: "set",
      exerciseIndex: sessionState.currentIndex,
      setNumber: sessionState.currentSet + 1
    };
  }
  if (sessionState.currentIndex < activeWorkout.length - 1) {
    return {
      type: "exercise",
      exerciseIndex: sessionState.currentIndex + 1,
      setNumber: 1
    };
  }
  return { type: "complete" };
}

function getDisplayTarget() {
  if (!activeWorkout.length) {
    return null;
  }
  if (!sessionState.isResting) {
    return {
      exerciseIndex: sessionState.currentIndex,
      setNumber: sessionState.currentSet
    };
  }
  const nextTarget = getNextPhaseTarget();
  if (!nextTarget || nextTarget.type === "complete") {
    return {
      exerciseIndex: Math.max(0, activeWorkout.length - 1),
      setNumber: getCurrentExercise() ? getCurrentExercise().sets : 1
    };
  }
  return {
    exerciseIndex: nextTarget.exerciseIndex,
    setNumber: nextTarget.setNumber
  };
}

function setDashboardVisible(visible) {
  if (dashboardCardEl) {
    if (visible) {
      dashboardCardEl.hidden = false;
      dashboardCardEl.removeAttribute("hidden");
      dashboardCardEl.classList.add("is-visible");
    } else {
      dashboardCardEl.classList.remove("is-visible");
      dashboardCardEl.setAttribute("hidden", "");
      dashboardCardEl.hidden = true;
    }
  }
  document.body.classList.toggle("dashboard-mode", visible);
}

function renderDashboard() {
  if (!dashboardCardEl) {
    return;
  }

  setDashboardVisualState();

  if (!activeWorkout.length) {
    setText(dashboardProgressEl, "");
    setText(dashboardMoodPillEl, "Ready to train");
    setText(dashboardPhasePillEl, "Idle");
    setText(dashboardSetCounterEl, "Set 1/1");
    setText(dashboardExerciseEl, "-");
    setText(dashboardPrescriptionEl, "");
    setText(dashboardStatusEl, "Generate a workout to start dashboard mode.");
    setText(dashboardWorkoutTimerEl, "Workout Timer: 00:00");
    setText(dashboardExerciseTimerEl, "Exercise Timer: 00:00");
    setText(dashboardRestTimerEl, "Rest Timer: --:--");
    setText(dashboardProgressNoteEl, "0% complete");
    setProgressFill(0);
    renderExerciseTrack(-1);
    if (dashboardCuesEl) {
      dashboardCuesEl.innerHTML = "";
    }
    if (dashboardDemoLinkEl) {
      dashboardDemoLinkEl.href = "#";
      dashboardDemoLinkEl.setAttribute("aria-disabled", "true");
    }
    return;
  }

  const displayTarget = getDisplayTarget();
  const displayIndex = Math.min(
    Math.max(0, displayTarget ? displayTarget.exerciseIndex : sessionState.currentIndex),
    activeWorkout.length - 1
  );
  const exercise = activeWorkout[displayIndex];
  const displaySet = Math.min(Math.max(1, displayTarget ? displayTarget.setNumber : 1), exercise.sets);
  const targets = exercise.muscles.map(capitalize).join(", ");
  const completionPercent = getCompletionPercent();
  const visibleCompletionPercent =
    sessionState.started && !sessionState.completed ? Math.max(4, completionPercent) : completionPercent;
  const tone = getDashboardTone(completionPercent);
  const completedSets = Math.min(sessionState.completedSets, countTotalPlannedSets());
  const totalSets = countTotalPlannedSets();

  setText(dashboardProgressEl, `Exercise ${displayIndex + 1} of ${activeWorkout.length}`);
  setText(dashboardMoodPillEl, tone.mood);
  setText(dashboardPhasePillEl, tone.phase);
  setText(dashboardSetCounterEl, `Set ${displaySet}/${exercise.sets}`);
  setText(dashboardWorkoutTimerEl, `Workout Timer: ${formatElapsedTime(sessionState.elapsedSeconds)}`);
  setText(dashboardExerciseTimerEl, `Exercise Timer: ${formatElapsedTime(sessionState.exerciseElapsedSeconds)}`);
  setText(dashboardProgressNoteEl, `${completionPercent}% complete • ${completedSets}/${totalSets} sets`);
  setProgressFill(visibleCompletionPercent);
  renderExerciseTrack(displayIndex);
  setText(dashboardExerciseEl, exercise.name);
  setText(
    dashboardPrescriptionEl,
    `${exercise.sets} sets x ${exercise.reps} reps | Rest ${exercise.rest}s | ${targets}`
  );

  if (dashboardCuesEl) {
    dashboardCuesEl.innerHTML = "";
    buildDemoCues(exercise).forEach((cue) => {
      const li = document.createElement("li");
      li.textContent = cue;
      dashboardCuesEl.appendChild(li);
    });
  }

  if (dashboardDemoLinkEl) {
    dashboardDemoLinkEl.href = getDemoUrl(exercise);
    dashboardDemoLinkEl.removeAttribute("aria-disabled");
  }

  if (sessionState.completed) {
    const summary = buildSessionSummary("completed");
    setText(dashboardStatusEl, `Completed. ${summary.text}`);
    setText(dashboardRestTimerEl, "Rest Timer: --:--");
    setText(dashboardMoodPillEl, "Session crushed");
    setText(dashboardPhasePillEl, "Complete");
    setProgressFill(100);
    setText(dashboardProgressNoteEl, "100% complete");
    renderExerciseTrack(activeWorkout.length - 1, true);
    return;
  }

  if (!sessionState.started) {
    setText(dashboardStatusEl, "Tap Start Workout Dashboard to begin.");
    setText(dashboardRestTimerEl, "Rest Timer: --:--");
    return;
  }

  if (sessionState.isResting) {
    const nextTarget = getNextPhaseTarget();
    if (nextTarget && nextTarget.type === "set") {
      setText(dashboardStatusEl, `Resting before set ${nextTarget.setNumber} of ${exercise.name}.`);
    } else if (nextTarget && nextTarget.type === "exercise") {
      setText(dashboardStatusEl, `Resting before ${exercise.name}.`);
    }
    setText(dashboardRestTimerEl, `Rest Timer: ${formatTime(sessionState.restRemaining)}`);
    return;
  }

  setText(dashboardStatusEl, formatActiveSetText(sessionState.currentIndex, sessionState.currentSet));
  setText(dashboardRestTimerEl, "Rest Timer: --:--");
}

function updateWorkoutHighlights(markAllComplete = false) {
  const items = [...workoutListEl.querySelectorAll(".workout-item")];
  items.forEach((item, index) => {
    item.classList.remove("current", "complete");

    if (markAllComplete) {
      item.classList.add("complete");
      return;
    }

    if (!sessionState.started && !sessionState.completed) {
      return;
    }

    const nextTarget = getNextPhaseTarget();
    const currentTarget =
      sessionState.isResting && nextTarget && nextTarget.type === "exercise"
        ? nextTarget.exerciseIndex
        : sessionState.currentIndex;

    if (index < currentTarget) {
      item.classList.add("complete");
    } else if (index === currentTarget) {
      item.classList.add("current");
    }
  });
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name=\"${name}\"]:checked`)].map((input) => input.value);
}

function buildDemoCues(exercise) {
  const cues = ["Use controlled tempo and full range of motion."];

  if (exercise.compound) {
    cues.push("Brace your core before every rep.");
  }

  if (exercise.muscles.includes("chest")) {
    cues.push("Keep your shoulder blades pulled down and back.");
  }
  if (exercise.muscles.includes("back")) {
    cues.push("Lead with elbows and avoid shrugging.");
  }
  if (exercise.muscles.includes("quads") || exercise.muscles.includes("glutes")) {
    cues.push("Keep knees tracking over toes and control the descent.");
  }
  if (exercise.muscles.includes("core")) {
    cues.push("Keep ribs down and avoid lower-back overextension.");
  }

  return cues.slice(0, 3);
}

function getDemoUrl(exercise) {
  const query = `${exercise.name} proper form tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) {
    return "00:00";
  }
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatElapsedTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}

function primeAudioOnInteraction() {
  const unlock = () => {
    try {
      const context = getAudioContext();
      if (context && context.state === "suspended") {
        context.resume();
      }
    } catch (_error) {
      // Audio priming is best effort only.
    }
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function getAudioContext() {
  if (audioContext) {
    return audioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  audioContext = new AudioContextClass();
  return audioContext;
}

function notifyRestComplete() {
  if (navigator.vibrate) {
    navigator.vibrate([120, 80, 120]);
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }
  if (context.state === "suspended") {
    context.resume().catch(() => {
      // Resume can fail if browser blocks audio; fallback is vibration/status text.
    });
  }

  const now = context.currentTime;
  playBeep(context, now, 880, 0.09, 0.16);
  playBeep(context, now + 0.16, 1180, 0.11, 0.18);
}

function playBeep(context, startAt, frequency, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setDisabled(element, disabled) {
  if (!element) {
    return;
  }
  element.disabled = disabled;
  if (disabled) {
    element.setAttribute("disabled", "");
  } else {
    element.removeAttribute("disabled");
  }
}

function setDashboardVisualState() {
  if (dashboardPanelEl) {
    dashboardPanelEl.classList.toggle("is-resting", sessionState.isResting && sessionState.started);
    dashboardPanelEl.classList.toggle("is-complete", sessionState.completed);
    dashboardPanelEl.classList.toggle(
      "is-active",
      sessionState.started && !sessionState.isResting && !sessionState.completed
    );
  }
  if (dashboardNextBtn) {
    dashboardNextBtn.classList.toggle(
      "is-live",
      sessionState.started && !sessionState.completed && !sessionState.isResting
    );
  }
}

function setProgressFill(percent) {
  if (!dashboardProgressFillEl) {
    return;
  }
  const safe = Math.max(0, Math.min(100, percent));
  dashboardProgressFillEl.style.width = `${safe}%`;
}

function renderExerciseTrack(activeIndex, forceComplete = false) {
  if (!dashboardExerciseTrackEl) {
    return;
  }
  if (!activeWorkout.length) {
    dashboardExerciseTrackEl.innerHTML = "";
    lastTrackRenderKey = "";
    return;
  }
  const renderKey = `${activeWorkout.length}|${activeIndex}|${forceComplete ? "1" : "0"}`;
  if (lastTrackRenderKey === renderKey && dashboardExerciseTrackEl.children.length === activeWorkout.length) {
    return;
  }
  dashboardExerciseTrackEl.innerHTML = "";

  let chipToFocus = null;
  activeWorkout.forEach((exercise, index) => {
    const chip = document.createElement("div");
    chip.className = "exercise-chip";
    chip.title = exercise.name;
    chip.setAttribute("role", "listitem");

    const chipIndex = document.createElement("span");
    chipIndex.className = "exercise-chip-index";
    chipIndex.textContent = String(index + 1);
    const chipName = document.createElement("span");
    chipName.className = "exercise-chip-name";
    chipName.textContent = shortenExerciseName(exercise.name);

    if (forceComplete) {
      chip.classList.add("is-complete");
    } else if (index < activeIndex) {
      chip.classList.add("is-complete");
    } else if (index === activeIndex) {
      chip.classList.add("is-current");
      chipToFocus = chip;
    } else {
      chip.classList.add("is-upcoming");
    }

    chip.appendChild(chipIndex);
    chip.appendChild(chipName);
    dashboardExerciseTrackEl.appendChild(chip);
  });

  const shouldScroll =
    (forceComplete && activeWorkout.length > 2) || (!forceComplete && activeIndex !== lastRenderedTrackIndex);
  if (shouldScroll && chipToFocus && sessionState.started) {
    chipToFocus.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  lastRenderedTrackIndex = activeIndex;
  lastTrackRenderKey = renderKey;
}

function getCompletionPercent() {
  const totalSets = countTotalPlannedSets();
  if (!totalSets) {
    return 0;
  }
  return Math.round((Math.min(sessionState.completedSets, totalSets) / totalSets) * 100);
}

function getDashboardTone(completionPercent) {
  if (sessionState.completed) {
    return { mood: "Session crushed", phase: "Complete" };
  }
  if (!sessionState.started) {
    return { mood: "Ready to train", phase: "Idle" };
  }
  if (sessionState.isResting) {
    return { mood: "Catch your breath", phase: "Rest" };
  }
  if (completionPercent >= 75) {
    return { mood: "Strong finish", phase: "Push" };
  }
  if (completionPercent >= 40) {
    return { mood: "Locked in", phase: "Flow" };
  }
  return { mood: "Great start", phase: "Warm" };
}

function countTotalPlannedSets() {
  return activeWorkout.reduce((total, exercise) => total + exercise.sets, 0);
}

function countCompletedExercises() {
  const fullExercises = activeWorkout.filter(
    (_, exerciseIndex) => sessionState.completedSets >= countSetsUpToExercise(exerciseIndex + 1)
  ).length;
  return Math.min(fullExercises, activeWorkout.length);
}

function countSetsUpToExercise(exclusiveEndIndex) {
  let total = 0;
  for (let index = 0; index < exclusiveEndIndex; index += 1) {
    total += activeWorkout[index].sets;
  }
  return total;
}

function buildSessionSummary(outcome) {
  const completedSets = Math.min(sessionState.completedSets, countTotalPlannedSets());
  const totalSets = countTotalPlannedSets();
  const completedExercises = countCompletedExercises();
  const totalExercises = activeWorkout.length;
  const duration = formatElapsedTime(sessionState.elapsedSeconds);
  const outcomeLabel = outcome === "completed" ? "Completed" : "Stopped";
  const completionPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  const nextSuggestion = activeWorkout
    .slice(0, Math.max(0, completedExercises))
    .map((exercise) => exercise.name)
    .slice(0, 4)
    .join(", ");

  return {
    text: `${outcomeLabel}: ${completedExercises}/${totalExercises} exercises, ${completedSets}/${totalSets} sets in ${duration}.`,
    extra:
      outcome === "completed"
        ? `Completion: ${completionPercent}%. Exercises finished: ${nextSuggestion || "All planned work completed."}`
        : `Progress saved at ${completionPercent}%. Resume anytime from the generated plan.`,
    garminNote:
      "Garmin Venu 3 link is manual. Direct automatic sync needs a backend plus Garmin Health API approval."
  };
}

function showSessionSummary(summary) {
  if (sessionSummaryEl) {
    sessionSummaryEl.hidden = false;
  }
  if (!summary) {
    return;
  }
  setText(sessionSummaryTextEl, summary.text || "");
  setText(sessionSummaryExtraEl, summary.extra || "");
  setText(sessionSummaryGarminNoteEl, summary.garminNote || "");
  if (sessionSummaryGarminConnectEl) {
    sessionSummaryGarminConnectEl.href = "https://connect.garmin.com/modern/";
  }
  if (sessionSummaryGarminVenuEl) {
    sessionSummaryGarminVenuEl.href = "https://www.garmin.com/en-US/p/873008#manuals";
  }
}

function hideSessionSummary() {
  if (sessionSummaryEl) {
    sessionSummaryEl.hidden = true;
  }
  setText(sessionSummaryTextEl, "No session summary yet.");
  setText(sessionSummaryExtraEl, "");
  setText(sessionSummaryGarminNoteEl, "");
}

function focusSummaryCard() {
  if (!sessionSummaryEl || sessionSummaryEl.hidden) {
    return;
  }
  sessionSummaryEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function capitalize(value) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function shortenExerciseName(name) {
  const words = name.split(" ");
  if (words.length <= 2) {
    return name;
  }
  return `${words.slice(0, 2).join(" ")}...`;
}

function syncViewportHeight() {
  const viewportUnit = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--app-vh", `${viewportUnit}px`);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => registration.update())
      .catch(() => {
        // Intentionally silent. App works without service worker if registration fails.
      });
  });
}

init();
