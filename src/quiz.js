export function answerIsCorrect(question, selected) {
  const expected = [...question.correctAnswers].sort().join(",");
  const actual = [...selected].sort().join(",");
  return expected === actual;
}

export function buildSession(questions, mode, filters, progress) {
  let pool = [...questions];

  if (filters.subject) pool = pool.filter((item) => item.subject === filters.subject);
  if (filters.chapter) pool = pool.filter((item) => item.chapter === filters.chapter);
  if (filters.type) pool = pool.filter((item) => item.type === filters.type);
  if (filters.tag) pool = pool.filter((item) => item.tags.includes(filters.tag));

  if (mode === "wrong") {
    pool = pool.filter((item) => progress.answered[item.id]?.wrongCount > 0);
  }

  if (mode === "new") {
    pool = pool.filter((item) => !progress.answered[item.id]);
  }

  if (mode === "random") {
    pool = shuffle(pool);
  }

  return pool;
}

export function recordSession(progress, questions, answers) {
  const next = {
    ...progress,
    answered: { ...progress.answered },
    totalAttempts: progress.totalAttempts,
    totalCorrect: progress.totalCorrect,
    totalScore: progress.totalScore,
    todayAttempts: progress.todayAttempts,
  };

  const details = questions.map((question) => {
    const selected = answers[question.id] || [];
    const isCorrect = answerIsCorrect(question, selected);
    const prior = next.answered[question.id] || { attempts: 0, correctCount: 0, wrongCount: 0 };
    const earnedScore = isCorrect ? question.score : 0;

    next.answered[question.id] = {
      attempts: prior.attempts + 1,
      correctCount: prior.correctCount + (isCorrect ? 1 : 0),
      wrongCount: prior.wrongCount + (isCorrect ? 0 : 1),
      lastSelected: selected,
      lastCorrect: isCorrect,
      lastAnsweredAt: new Date().toISOString(),
    };

    next.totalAttempts += 1;
    next.todayAttempts += 1;
    next.totalCorrect += isCorrect ? 1 : 0;
    next.totalScore += earnedScore;

    return { question, selected, isCorrect, earnedScore };
  });

  return { progress: next, details };
}

export function summarizeQuestions(questions, progress) {
  const total = questions.length;
  const answeredIds = Object.keys(progress.answered);
  const practiced = answeredIds.filter((id) => questions.some((question) => question.id === id)).length;
  const accuracy = progress.totalAttempts ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100) : 0;

  const byChapter = groupCount(questions, "chapter");
  const chapterCompletion = Object.fromEntries(
    Object.entries(byChapter).map(([chapter, count]) => {
      const done = questions.filter((item) => item.chapter === chapter && progress.answered[item.id]).length;
      return [chapter, Math.round((done / count) * 100)];
    })
  );

  return {
    total,
    enabled: total,
    practiced,
    today: progress.todayAttempts,
    accuracy,
    byChapter,
    chapterCompletion,
  };
}

export function getFilterOptions(questions) {
  return {
    subjects: unique(questions.map((item) => item.subject)),
    chapters: unique(questions.map((item) => item.chapter)),
    types: unique(questions.map((item) => item.type)),
    tags: unique(questions.flatMap((item) => item.tags)),
  };
}

export function filterByKeyword(questions, keyword) {
  const term = keyword.trim().toLowerCase();
  if (!term) return questions;
  return questions.filter((item) =>
    [item.subject, item.chapter, item.type, item.question, item.questionNo, item.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

function groupCount(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "未分類";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
