import { parseExcelFiles } from "./excel.js";

const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;

export async function loadBuiltInQuestions() {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error("找不到內建題庫 manifest.json");

  const manifest = await response.json();
  const files = await Promise.all(
    (manifest.files || []).map(async (name) => {
      const fileResponse = await fetch(`${import.meta.env.BASE_URL}data/${encodeURIComponent(name)}`);
      if (!fileResponse.ok) throw new Error(`無法讀取內建題庫：${name}`);
      return { name, blob: await fileResponse.blob() };
    })
  );

  return parseExcelFiles(files);
}
