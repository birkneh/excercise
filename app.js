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

const durationEl = document.getElementById("duration");
const durationValueEl = document.getElementById("duration-value");
const splitEl = document.getElementById("split");
const focusEl = document.getElementById("session-focus");
const difficultyEl = document.getElementById("difficulty");
const muscleWrapEl = document.getElementById("muscle-groups");
const equipmentWrapEl = document.getElementById("equipment");
const generateBtn = document.getElementById("generate-btn");
const resultCard = document.getElementById("result-card");
const workoutMetaEl = document.getElementById("workout-meta");
const workoutListEl = document.getElementById("workout-list");
const historyListEl = document.getElementById("history-list");
const runnerStatusEl = document.getElementById("runner-status");
const startWorkoutBtn = document.getElementById("start-workout-btn");
const dashboardCardEl = document.getElementById("dashboard-card");
const dashboardProgressEl = document.getElementById("dashboard-progress");
const dashboardExerciseEl = document.getElementById("dashboard-exercise");
const dashboardPrescriptionEl = document.getElementById("dashboard-prescription");
const dashboardCuesEl = document.getElementById("dashboard-cues");
const dashboardDemoLinkEl = document.getElementById("dashboard-demo-link");
const dashboardStatusEl = document.getElementById("dashboard-status");
const dashboardWorkoutTimerEl = document.getElementById("dashboard-workout-timer");
const dashboardRestTimerEl = document.getElementById("dashboard-rest-timer");
const dashboardNextBtn = document.getElementById("dashboard-next-btn");
const dashboardStopBtn = document.getElementById("dashboard-stop-btn");
const dashboardHideBtn = document.getElementById("dashboard-hide-btn");

let activeWorkout = [];
let sessionState = {
  started: false,
  completed: false,
  isResting: false,
  currentIndex: 0,
  restRemaining: 0,
  elapsedSeconds: 0
};
let restIntervalId = null;
let workoutIntervalId = null;

function init() {
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

  generateBtn.addEventListener("click", buildWorkout);
  startWorkoutBtn.addEventListener("click", startWorkout);
  dashboardNextBtn.addEventListener("click", handleNextAction);
  dashboardStopBtn.addEventListener("click", stopWorkout);
  dashboardHideBtn.addEventListener("click", hideDashboard);
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

function buildWorkout() {
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
  const history = JSON.parse(localStorage.getItem("forgefit-history") || "[]");
  historyListEl.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = "<h4>No workouts yet</h4><p>Generate a workout to start tracking sessions.</p>";
    historyListEl.appendChild(li);
    return;
  }

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const date = new Date(entry.generatedAt).toLocaleString();
    const title = document.createElement("h4");
    title.textContent = `${capitalize(entry.focus)} | ${entry.duration} min | ${capitalize(entry.difficulty)}`;

    const details = document.createElement("p");
    details.textContent = `${date} | ${entry.exercises.length} exercises`;

    li.appendChild(title);
    li.appendChild(details);
    historyListEl.appendChild(li);
  });
}

function resetSessionRunner(workout) {
  clearRestTimer();
  clearWorkoutTimer();
  activeWorkout = workout;
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    restRemaining: 0,
    elapsedSeconds: 0
  };

  startWorkoutBtn.disabled = !workout.length;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  runnerStatusEl.textContent = workout.length
    ? `Ready: ${workout.length} exercises. Tap Start Workout Dashboard.`
    : "Generate a workout to begin.";
  dashboardNextBtn.disabled = true;
  dashboardStopBtn.disabled = !workout.length;
  dashboardNextBtn.textContent = "Next";
  dashboardRestTimerEl.textContent = "Rest Timer: --:--";
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
    sessionState.started = true;
    sessionState.completed = false;
    sessionState.isResting = false;
    sessionState.currentIndex = Math.min(sessionState.currentIndex, activeWorkout.length - 1);
    sessionState.restRemaining = 0;
    startWorkoutTimer();
    runnerStatusEl.textContent = "Workout running. Dashboard can be reopened anytime.";
  }

  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Resume Workout Dashboard";
  dashboardNextBtn.disabled = false;
  dashboardStopBtn.disabled = false;
  dashboardNextBtn.textContent = sessionState.isResting ? "Next (Skip Rest)" : "Next (Start Rest)";
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
    moveToNextExercise();
    return;
  }

  if (sessionState.currentIndex >= activeWorkout.length - 1) {
    completeSession();
    return;
  }

  const restSeconds = activeWorkout[sessionState.currentIndex].rest || 60;
  startRestCountdown(restSeconds);
}

function startRestCountdown(seconds) {
  clearRestTimer();
  sessionState.isResting = true;
  sessionState.restRemaining = Math.max(5, Number(seconds));
  dashboardNextBtn.textContent = "Next (Skip Rest)";
  runnerStatusEl.textContent = `Resting before Exercise ${sessionState.currentIndex + 2}.`;
  renderDashboard();
  updateWorkoutHighlights();

  restIntervalId = setInterval(() => {
    sessionState.restRemaining -= 1;
    renderDashboard();

    if (sessionState.restRemaining <= 0) {
      clearRestTimer();
      moveToNextExercise();
    }
  }, 1000);
}

function moveToNextExercise() {
  sessionState.isResting = false;
  sessionState.restRemaining = 0;
  sessionState.currentIndex += 1;
  dashboardNextBtn.textContent = "Next (Start Rest)";

  if (sessionState.currentIndex >= activeWorkout.length) {
    completeSession();
    return;
  }

  runnerStatusEl.textContent = formatActiveExerciseText(sessionState.currentIndex);
  renderDashboard();
  updateWorkoutHighlights();
}

function completeSession() {
  clearRestTimer();
  clearWorkoutTimer();
  sessionState.completed = true;
  sessionState.started = false;
  sessionState.isResting = false;
  sessionState.restRemaining = 0;
  dashboardNextBtn.disabled = true;
  dashboardNextBtn.textContent = "Done";
  dashboardStopBtn.disabled = true;
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  runnerStatusEl.textContent = "Workout complete. Great work.";
  renderDashboard();
  updateWorkoutHighlights(true);
}

function restartSession(keepDashboard = false) {
  if (!activeWorkout.length) {
    return;
  }

  clearRestTimer();
  clearWorkoutTimer();
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    restRemaining: 0,
    elapsedSeconds: 0
  };
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  dashboardNextBtn.disabled = true;
  dashboardNextBtn.textContent = "Next";
  dashboardStopBtn.disabled = false;
  runnerStatusEl.textContent = `Ready: ${activeWorkout.length} exercises. Tap Start Workout Dashboard.`;
  dashboardRestTimerEl.textContent = "Rest Timer: --:--";
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
  sessionState = {
    started: false,
    completed: false,
    isResting: false,
    currentIndex: 0,
    restRemaining: 0,
    elapsedSeconds: 0
  };
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.textContent = "Start Workout Dashboard";
  dashboardNextBtn.disabled = true;
  dashboardNextBtn.textContent = "Next";
  dashboardStopBtn.disabled = false;
  runnerStatusEl.textContent = "Workout stopped. Tap Start Workout Dashboard to begin again.";
  setDashboardVisible(false);
  renderDashboard();
  updateWorkoutHighlights();
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
    renderDashboard();
  }, 1000);
}

function clearWorkoutTimer() {
  if (workoutIntervalId) {
    clearInterval(workoutIntervalId);
    workoutIntervalId = null;
  }
}

function formatActiveExerciseText(index) {
  const exercise = activeWorkout[index];
  return `Exercise ${index + 1}/${activeWorkout.length}: ${exercise.name}`;
}

function setDashboardVisible(visible) {
  dashboardCardEl.hidden = !visible;
  document.body.classList.toggle("dashboard-mode", visible);
}

function renderDashboard() {
  if (!activeWorkout.length) {
    dashboardProgressEl.textContent = "";
    dashboardExerciseEl.textContent = "-";
    dashboardPrescriptionEl.textContent = "";
    dashboardStatusEl.textContent = "Generate a workout to start dashboard mode.";
    dashboardWorkoutTimerEl.textContent = "Workout Timer: 00:00";
    dashboardRestTimerEl.textContent = "Rest Timer: --:--";
    dashboardCuesEl.innerHTML = "";
    dashboardDemoLinkEl.href = "#";
    dashboardDemoLinkEl.setAttribute("aria-disabled", "true");
    return;
  }

  const baseIndex = Math.min(sessionState.currentIndex, activeWorkout.length - 1);
  const displayIndex =
    sessionState.isResting && baseIndex < activeWorkout.length - 1 ? baseIndex + 1 : baseIndex;
  const exercise = activeWorkout[displayIndex];
  const targets = exercise.muscles.map(capitalize).join(", ");

  dashboardProgressEl.textContent = `Exercise ${displayIndex + 1} of ${activeWorkout.length}`;
  dashboardWorkoutTimerEl.textContent = `Workout Timer: ${formatElapsedTime(sessionState.elapsedSeconds)}`;
  dashboardExerciseEl.textContent = exercise.name;
  dashboardPrescriptionEl.textContent = `${exercise.sets} sets x ${exercise.reps} reps | Rest ${exercise.rest}s | ${targets}`;

  dashboardCuesEl.innerHTML = "";
  buildDemoCues(exercise).forEach((cue) => {
    const li = document.createElement("li");
    li.textContent = cue;
    dashboardCuesEl.appendChild(li);
  });

  dashboardDemoLinkEl.href = getDemoUrl(exercise);
  dashboardDemoLinkEl.removeAttribute("aria-disabled");

  if (sessionState.completed) {
    dashboardStatusEl.textContent = "Workout complete. Tap Start to run another session.";
    dashboardRestTimerEl.textContent = "Rest Timer: --:--";
    return;
  }

  if (!sessionState.started) {
    dashboardStatusEl.textContent = "Tap Start Workout Dashboard to begin.";
    dashboardRestTimerEl.textContent = "Rest Timer: --:--";
    return;
  }

  if (sessionState.isResting) {
    dashboardStatusEl.textContent = `Resting before ${exercise.name}.`;
    dashboardRestTimerEl.textContent = `Rest Timer: ${formatTime(sessionState.restRemaining)}`;
    return;
  }

  dashboardStatusEl.textContent = formatActiveExerciseText(displayIndex);
  dashboardRestTimerEl.textContent = "Rest Timer: --:--";
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

    const currentTarget = sessionState.isResting
      ? Math.min(sessionState.currentIndex + 1, activeWorkout.length - 1)
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

function capitalize(value) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

init();
