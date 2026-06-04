const BANK_KEY = "cyberExamBank.questions.v1";
const PROGRESS_KEY = "cyberExamBank.progress.v1";

export const emptyProgress = {
  answered: {},
  totalAttempts: 0,
  totalCorrect: 0,
  totalScore: 0,
  today: "",
  todayAttempts: 0,
};

export function loadQuestions() {
  return readJson(BANK_KEY, []);
}

export function saveQuestions(questions) {
  localStorage.setItem(BANK_KEY, JSON.stringify(questions));
}

export function loadProgress() {
  const today = getTodayKey();
  const progress = { ...emptyProgress, ...readJson(PROGRESS_KEY, emptyProgress) };
  if (progress.today !== today) {
    progress.today = today;
    progress.todayAttempts = 0;
    saveProgress(progress);
  }
  return progress;
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function resetAllStorage() {
  localStorage.removeItem(BANK_KEY);
  localStorage.removeItem(PROGRESS_KEY);
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
