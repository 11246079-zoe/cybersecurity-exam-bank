import readXlsxFile from "read-excel-file/browser";

export const REQUIRED_COLUMNS = [
  "科目",
  "章節",
  "題號",
  "題型",
  "分數",
  "題目",
  "選項A",
  "選項B",
  "選項C",
  "選項D",
  "正確答案",
  "答案解釋",
  "原作答結果",
  "標籤",
  "啟用",
];

export async function parseExcelFiles(files) {
  const allQuestions = [];
  const errors = [];

  for (const file of files) {
    try {
      const sheetRows = await readXlsxFile(file);
      const rows = rowsToObjects(sheetRows);
      validateColumns(rows, file.name);

      rows.forEach((row, index) => {
        const question = normalizeQuestion(row, file.name, index);
        if (question.enabled) allQuestions.push(question);
      });
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }

  return { questions: dedupeQuestions(allQuestions), errors };
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((cell) => text(cell));
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
}

function validateColumns(rows, fileName) {
  if (!rows.length) throw new Error("Excel 沒有可讀取的資料列");
  const columns = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length) {
    throw new Error(`缺少欄位：${missing.join("、")}`);
  }
}

function normalizeQuestion(row, fileName, rowIndex) {
  const questionNo = text(row["題號"]);
  const subject = text(row["科目"]);
  const chapter = text(row["章節"]);
  const correctAnswers = splitAnswers(row["正確答案"]);

  return {
    id: `${subject}::${chapter}::${questionNo}::${fileName}::${rowIndex}`,
    sourceFile: fileName,
    subject,
    chapter,
    questionNo,
    type: normalizeType(row["題型"], correctAnswers),
    score: Number(row["分數"]) || 0,
    question: text(row["題目"]),
    options: {
      A: text(row["選項A"]),
      B: text(row["選項B"]),
      C: text(row["選項C"]),
      D: text(row["選項D"]),
    },
    correctAnswers,
    explanation: text(row["答案解釋"]),
    originalResult: text(row["原作答結果"]),
    tags: splitTags(row["標籤"]),
    enabled: toBoolean(row["啟用"]),
    raw: { ...row },
  };
}

function normalizeType(value, answers) {
  const label = text(value);
  if (label.includes("多") || answers.length > 1) return "多選題";
  return "單選題";
}

export function splitAnswers(value) {
  return text(value)
    .toUpperCase()
    .split(/[,\s，、/]+/)
    .map((item) => item.trim())
    .filter((item) => ["A", "B", "C", "D"].includes(item))
    .sort();
}

function splitTags(value) {
  return text(value)
    .split(/[,\s，、/]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLowerCase();
  return ["true", "1", "yes", "y", "啟用", "是"].includes(normalized);
}

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    const key = `${question.subject}::${question.chapter}::${question.questionNo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}
