# 資安課程期末考題庫系統

這是一個使用 React + Vite 製作的靜態網頁題庫系統，適合資訊安全課程期末考複習。系統可在瀏覽器匯入 Excel 題庫，只顯示 `啟用 = TRUE` 的題目，並使用 `localStorage` 儲存題庫與學習紀錄，不需要後端伺服器或資料庫。

## 功能

- 匯入一個或多個 Excel 題庫檔案
- 支援單選題與多選題
- 保留 Excel 原始題號
- 依科目、章節、題型、標籤篩選
- 關鍵字搜尋題目、章節、題號、標籤
- 指定章節練習、全部章節隨機出題、錯題複習、尚未練習題目
- 首頁顯示題庫總題數、各章節題數、已啟用題數、已刷題數、今日練習題數與累積正確率
- 交卷後顯示總分、答對題數、答錯題數、正確率、每題答案與解析
- 學習紀錄包含已作答、答對、答錯、每章節完成率與累積刷題數
- 手機版響應式設計，選項與操作按鈕適合觸控

## 專案結構

```text
cybersecurity-exam-bank/
├─ index.html
├─ package.json
├─ README.md
├─ vite.config.js
└─ src/
   ├─ App.jsx
   ├─ excel.js
   ├─ main.jsx
   ├─ quiz.js
   ├─ storage.js
   └─ styles.css
```

## 安裝方式

請先安裝 Node.js，建議使用 Node.js 20 以上版本。

```bash
cd cybersecurity-exam-bank
npm install
```

## 啟動方式

```bash
npm run dev
```

啟動後打開終端機顯示的本機網址，例如：

```text
http://localhost:5173/
```

## 如何匯入 Excel 題庫

1. 開啟網頁首頁。
2. 點選「選擇 Excel」。
3. 一次選取 1 個或多個 `.xlsx` / `.xls` 題庫檔案。
4. 系統會檢查欄位名稱是否完整對應，並只匯入 `啟用 = TRUE` 的題目。

Excel 第一列欄位名稱必須完全符合：

```text
科目、章節、題號、題型、分數、題目、選項A、選項B、選項C、選項D、正確答案、答案解釋、原作答結果、標籤、啟用
```

資料規則：

- `題號` 會保留 Excel 原本的值。
- `正確答案` 可填 `A`、`B`、`C`、`D`，多選可填 `A,C`。
- `標籤`、`原作答結果` 可空白。
- `分數` 會依 Excel 欄位計算。
- 匯入資料與學習紀錄都儲存在目前瀏覽器的 `localStorage`。

## 建置靜態網站

```bash
npm run build
```

建置後的檔案會輸出在 `dist/`。

## 部署到 GitHub Pages

本專案已安裝 `gh-pages`，且 `vite.config.js` 會在 GitHub Actions 或 GitHub Pages 部署環境中自動使用 repository 名稱作為 Vite `base`。

第一次部署前，先確認 `package.json` 的 `homepage` 可依你的 GitHub 帳號與 repo 名稱補上，例如：

```json
{
  "homepage": "https://你的帳號.github.io/cybersecurity-exam-bank/"
}
```

部署指令：

```bash
npm run deploy
```

這會先執行 `npm run build`，再把 `dist/` 發布到 `gh-pages` 分支。

## GitHub 上傳指令

如果這是一個新的 GitHub repository，可使用：

```bash
git init
git add .
git commit -m "Create cybersecurity exam bank system"
git branch -M main
git remote add origin https://github.com/你的帳號/cybersecurity-exam-bank.git
git push -u origin main
```

之後部署到 GitHub Pages：

```bash
npm run deploy
```

## 注意事項

- 題庫與練習進度儲存在瀏覽器本機，換瀏覽器或清除網站資料後需要重新匯入。
- 此版本不需要後端伺服器，適合直接部署成靜態網站。
- 若題庫欄位名稱不同，系統會提示缺少欄位，請先修正 Excel 欄位列。
