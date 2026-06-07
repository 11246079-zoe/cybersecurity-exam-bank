import JSZip from "jszip";

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
      const rows = await readWorkbookRows(file.blob || file);
      validateColumns(rows);

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

async function readWorkbookRows(fileLike) {
  const buffer = await fileLike.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const sharedStrings = await readSharedStrings(zip);
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("text");
  if (!sheetXml) throw new Error("Excel 沒有可讀取的工作表");

  const sheet = parseXml(sheetXml);
  const parsedRows = elements(sheet, "row").map((row) => parseRow(row, sharedStrings));
  const headers = (parsedRows[0] || []).map((cell) => text(cell));

  return parsedRows.slice(1).reduce((rows, row) => {
    const item = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    if (Object.values(item).some((value) => text(value))) rows.push(item);
    return rows;
  }, []);
}

function validateColumns(rows) {
  if (!rows.length) throw new Error("Excel 沒有可讀取的資料列");
  const columns = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length) throw new Error(`缺少欄位：${missing.join("、")}`);
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
  const normalized = text(value).toLowerCase().replace(/\s+/g, "");
  return ["true", "1", "yes", "y", "啟用", "是", "對", "v"].includes(normalized);
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

async function readSharedStrings(zip) {
  const xml = await zip.file("xl/sharedStrings.xml")?.async("text");
  if (!xml) return [];

  const doc = parseXml(xml);
  return elements(doc, "si").map((item) =>
    elements(item, "t").map((node) => node.textContent || "").join("")
  );
}

function parseRow(row, sharedStrings) {
  const values = [];
  elements(row, "c").forEach((cell) => {
    const reference = cell.getAttribute("r") || "";
    values[columnIndex(reference)] = parseCell(cell, sharedStrings);
  });
  return values;
}

function parseCell(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  const rawValue = elements(cell, "v")[0]?.textContent ?? "";

  if (type === "s") return sharedStrings[Number(rawValue)] || "";
  if (type === "b") return rawValue === "1";
  if (type === "inlineStr") {
    return elements(cell, "t").map((node) => node.textContent || "").join("");
  }
  return rawValue;
}

function columnIndex(reference) {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
}

function parseXml(xml) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function elements(root, localName) {
  const namespaced = [...root.getElementsByTagNameNS("*", localName)];
  if (namespaced.length) return namespaced;
  return [...root.getElementsByTagName(localName)].filter((node) => node.localName === localName);
}
