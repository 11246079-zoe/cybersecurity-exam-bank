import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Shuffle,
  Target,
  Upload,
} from "lucide-react";
import { parseExcelFiles } from "./excel.js";
import { loadProgress, loadQuestions, resetAllStorage, saveProgress, saveQuestions } from "./storage.js";
import {
  answerIsCorrect,
  buildSession,
  filterByKeyword,
  getFilterOptions,
  recordSession,
  summarizeQuestions,
} from "./quiz.js";

const emptyFilters = { subject: "", chapter: "", type: "", tag: "" };

export default function App() {
  const [questions, setQuestions] = useState(() => loadQuestions());
  const [progress, setProgress] = useState(() => loadProgress());
  const [filters, setFilters] = useState(emptyFilters);
  const [mode, setMode] = useState("chapter");
  const [keyword, setKeyword] = useState("");
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [importMessage, setImportMessage] = useState("");

  const filteredQuestions = useMemo(() => filterByKeyword(questions, keyword), [questions, keyword]);
  const stats = useMemo(() => summarizeQuestions(questions, progress), [questions, progress]);
  const options = useMemo(() => getFilterOptions(questions), [questions]);

  async function handleImport(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    setImportMessage("讀取 Excel 中...");
    const parsed = await parseExcelFiles(files);

    if (parsed.questions.length) {
      const next = mergeQuestions(questions, parsed.questions);
      saveQuestions(next);
      setQuestions(next);
      setImportMessage(`已匯入 ${parsed.questions.length} 題啟用題目。${parsed.errors.length ? parsed.errors.join("；") : ""}`);
    } else {
      setImportMessage(parsed.errors.length ? parsed.errors.join("；") : "沒有讀到啟用題目。");
    }
    event.target.value = "";
  }

  function startPractice(selectedMode = mode) {
    const list = buildSession(questions, selectedMode, filters, progress);
    setMode(selectedMode);
    setResult(null);
    setSession(list);
    setAnswers({});
    setCurrentIndex(0);
  }

  function toggleAnswer(question, option) {
    setAnswers((current) => {
      const selected = current[question.id] || [];
      const exists = selected.includes(option);
      const nextSelected =
        question.type === "多選題"
          ? exists
            ? selected.filter((item) => item !== option)
            : [...selected, option]
          : [option];
      return { ...current, [question.id]: nextSelected.sort() };
    });
  }

  function submitSession() {
    if (!session?.length) return;
    const recorded = recordSession(progress, session, answers);
    saveProgress(recorded.progress);
    setProgress(recorded.progress);
    setResult(buildResult(recorded.details));
    setSession(null);
    setCurrentIndex(0);
  }

  function resetSystem() {
    if (!confirm("確定要清除題庫與所有學習紀錄嗎？")) return;
    resetAllStorage();
    setQuestions([]);
    setProgress(loadProgress());
    setSession(null);
    setResult(null);
    setAnswers({});
    setImportMessage("已清除本機資料。");
  }

  if (session) {
    return (
      <PracticeView
        questions={session}
        progress={progress}
        answers={answers}
        currentIndex={currentIndex}
        onSelect={toggleAnswer}
        onPrev={() => setCurrentIndex((index) => Math.max(0, index - 1))}
        onNext={() => setCurrentIndex((index) => Math.min(session.length - 1, index + 1))}
        onSubmit={submitSession}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">資訊安全期末複習</p>
          <h1>資安課程期末考題庫系統</h1>
        </div>
        <button className="icon-button danger" type="button" onClick={resetSystem} title="清除資料">
          <RotateCcw size={18} />
          <span>清除</span>
        </button>
      </header>

      <section className="import-panel">
        <div>
          <h2><FileSpreadsheet size={20} /> 匯入 Excel 題庫</h2>
          <p>支援一次選取多個 `.xlsx` 檔，系統只會顯示「啟用 = TRUE」的題目。</p>
        </div>
        <label className="upload-button">
          <Upload size={18} />
          選擇 Excel
          <input type="file" accept=".xlsx,.xls" multiple onChange={handleImport} />
        </label>
      </section>
      {importMessage && <p className="notice">{importMessage}</p>}

      <Dashboard stats={stats} />

      <section className="workbench">
        <div className="section-heading">
          <div>
            <h2><Target size={20} /> 練習設定</h2>
            <p>選好分類後開始練習，也可以直接進入錯題或尚未練習題目。</p>
          </div>
        </div>

        <div className="filters">
          <Select label="科目" value={filters.subject} options={options.subjects} onChange={(subject) => setFilters({ ...filters, subject })} />
          <Select label="章節" value={filters.chapter} options={options.chapters} onChange={(chapter) => setFilters({ ...filters, chapter })} />
          <Select label="題型" value={filters.type} options={options.types} onChange={(type) => setFilters({ ...filters, type })} />
          <Select label="標籤" value={filters.tag} options={options.tags} onChange={(tag) => setFilters({ ...filters, tag })} />
        </div>

        <div className="mode-grid">
          <ModeButton icon={<BookOpen />} label="指定章節練習" active={mode === "chapter"} onClick={() => startPractice("chapter")} disabled={!questions.length} />
          <ModeButton icon={<Shuffle />} label="全部章節隨機" active={mode === "random"} onClick={() => startPractice("random")} disabled={!questions.length} />
          <ModeButton icon={<ClipboardList />} label="錯題複習" active={mode === "wrong"} onClick={() => startPractice("wrong")} disabled={!questions.length} />
          <ModeButton icon={<CheckCircle2 />} label="尚未練習" active={mode === "new"} onClick={() => startPractice("new")} disabled={!questions.length} />
        </div>
      </section>

      {result && <ResultView result={result} onPracticeWrong={() => startPractice("wrong")} />}

      <section className="question-browser">
        <div className="section-heading">
          <div>
            <h2><Search size={20} /> 題庫搜尋</h2>
            <p>可搜尋題目、章節、題號與標籤。</p>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="輸入關鍵字" />
          </div>
        </div>

        <div className="question-list">
          {filteredQuestions.slice(0, 80).map((question) => (
            <article className="question-row" key={question.id}>
              <div>
                <strong>{question.chapter}｜{question.questionNo}</strong>
                <p>{question.question}</p>
              </div>
              <span>{question.type}</span>
            </article>
          ))}
          {!filteredQuestions.length && <div className="empty-state">尚未匯入題庫，或沒有符合搜尋的題目。</div>}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ stats }) {
  const cards = [
    ["題庫總題數", stats.total],
    ["已啟用題數", stats.enabled],
    ["目前已刷過", stats.practiced],
    ["今日已練習", stats.today],
    ["累積正確率", `${stats.accuracy}%`],
  ];

  return (
    <section className="dashboard">
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="chapter-panel">
        <h2>各章節題數與完成率</h2>
        <div className="chapter-list">
          {Object.entries(stats.byChapter).map(([chapter, count]) => (
            <div className="chapter-item" key={chapter}>
              <div>
                <strong>{chapter}</strong>
                <span>{count} 題</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${stats.chapterCompletion[chapter] || 0}%` }} />
              </div>
              <em>{stats.chapterCompletion[chapter] || 0}%</em>
            </div>
          ))}
          {!Object.keys(stats.byChapter).length && <p className="empty-state">匯入題庫後會顯示章節統計。</p>}
        </div>
      </div>
    </section>
  );
}

function PracticeView({ questions, progress, answers, currentIndex, onSelect, onPrev, onNext, onSubmit, onExit }) {
  const question = questions[currentIndex];
  const selected = answers[question.id] || [];
  const answeredCount = Object.keys(answers).filter((id) => answers[id]?.length).length;

  return (
    <main className="practice-shell">
      <header className="practice-status">
        <button type="button" onClick={onExit}>返回</button>
        <div>
          <strong>第 {currentIndex + 1} / {questions.length} 題</strong>
          <span>已練習 {progress.totalAttempts} 題</span>
        </div>
        <button className="primary" type="button" onClick={onSubmit}>交卷</button>
      </header>

      <section className="question-card">
        <div className="question-meta">
          <span>{question.chapter}</span>
          <span>{question.type}</span>
          <span>{question.score} 分</span>
        </div>
        <h1>題號 {question.questionNo}</h1>
        <p className="question-text">{question.question}</p>

        <div className="option-list">
          {Object.entries(question.options).map(([key, value]) => (
            <button
              className={`option-button ${selected.includes(key) ? "selected" : ""}`}
              key={key}
              type="button"
              onClick={() => onSelect(question, key)}
            >
              <span>{key}</span>
              <p>{value}</p>
            </button>
          ))}
        </div>

        <div className="answer-hint">
          {question.type === "多選題" ? "多選題可選擇多個答案。" : "單選題請選擇一個答案。"}
          <strong>本回合已作答 {answeredCount} 題</strong>
        </div>
      </section>

      <footer className="practice-actions">
        <button type="button" onClick={onPrev} disabled={currentIndex === 0}>上一題</button>
        <button type="button" onClick={onNext} disabled={currentIndex === questions.length - 1}>下一題</button>
        <button className="primary" type="button" onClick={onSubmit}>交卷</button>
      </footer>
    </main>
  );
}

function ResultView({ result, onPracticeWrong }) {
  return (
    <section className="result-panel">
      <div className="result-summary">
        <div><span>總分</span><strong>{result.score}</strong></div>
        <div><span>答對</span><strong>{result.correct}</strong></div>
        <div><span>答錯</span><strong>{result.wrong}</strong></div>
        <div><span>正確率</span><strong>{result.accuracy}%</strong></div>
      </div>
      <div className="section-heading">
        <div>
          <h2>作答清單與解析</h2>
          <p>每題會顯示你的答案、正確答案與答案解釋，錯題會以紅色框線標示。</p>
        </div>
        <button type="button" onClick={onPracticeWrong}>練習錯題</button>
      </div>
      <div className="wrong-list">
        {result.details.map(({ question, selected, isCorrect }) => (
          <article className={isCorrect ? "review-row correct" : "review-row wrong"} key={question.id}>
            <strong>{question.chapter}｜題號 {question.questionNo}</strong>
            <p>{question.question}</p>
            <div className="review-answer">
              <span>你的答案：{selected.length ? selected.join(",") : "未作答"}</span>
              <span>正確答案：{question.correctAnswers.join(",")}</span>
              <span>{answerIsCorrect(question, selected) ? "正確" : "錯誤"}</span>
            </div>
            <p className="explanation">{question.explanation || "此題沒有答案解釋。"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">全部</option>
        {options.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ModeButton({ icon, label, active, disabled, onClick }) {
  return (
    <button className={`mode-button ${active ? "active" : ""}`} type="button" onClick={onClick} disabled={disabled}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function buildResult(details) {
  const totalScore = details.reduce((sum, item) => sum + item.question.score, 0);
  const score = details.reduce((sum, item) => sum + item.earnedScore, 0);
  const correct = details.filter((item) => item.isCorrect).length;
  const wrong = details.length - correct;
  const accuracy = details.length ? Math.round((correct / details.length) * 100) : 0;

  return {
    score: `${score} / ${totalScore}`,
    correct,
    wrong,
    accuracy,
    details,
  };
}

function mergeQuestions(existing, incoming) {
  const getKey = (question) => `${question.subject}::${question.chapter}::${question.questionNo}`;
  const map = new Map(existing.map((question) => [getKey(question), question]));
  incoming.forEach((question) => map.set(getKey(question), question));
  return [...map.values()];
}
