# 風力發電教具總站

給執行長的入口目錄。葉片、齒輪、底座各自留在原來的倉庫維護，這個網站只放卡片、接口對照、組裝關係和 KidWind 檢核，不複製它們的程式。

網站在 `docs/`。路徑都是相對的，之後若要開 GitHub Pages，用 main 分支的 `/docs`。本版不要開 Pages，也不要合併尚未看過的內容。

## 本機預覽

需要 Node.js 18 以上。不必安裝套件。

```bash
npm test
python3 -m http.server 8765 --directory docs
```

然後打開 <http://127.0.0.1:8765/>。不要用檔案總管直接點 `index.html`，頁面要讀 `data/components.json`，需要網站伺服器。

## 如何新增一個設計器

頁面上的卡片、接口對照表、組裝關係圖都只讀 `docs/data/components.json`。新增一筆設計器，三處會一起更新，不用改 `index.html`。

1. 到那個設計器的倉庫讀 README 和原始碼。版號、預設尺寸只抄程式裡的數字。程式沒有寫的，值就寫「待確認」，不要自己估。
2. 用無頭瀏覽器打開它的網頁，截預設畫面，存成 `docs/assets/` 底下的 PNG。檔名用英文，例如 `assets/thumb-my-designer.png`。
3. 打開 `docs/data/components.json`，在 `designers` 陣列加一筆。欄位如下。
4. 存檔後重新整理頁面。
5. 再跑一次 `npm test`。它會檢查 JSON 格式、縮圖在不在，並實際連線每一個 https 連結。

一筆長這樣：

```json
{
  "id": "my-designer",
  "order": 40,
  "name": "新設計器的名稱",
  "purpose": "一句話說明它做什麼。",
  "version": "1.0.0",
  "versionSource": "版號出現在哪個檔案。找不到就寫待確認。",
  "commit": "讀取時的 40 碼 commit SHA",
  "outputs": [{ "type": "STL", "detail": "輸出什麼" }],
  "defaults": [
    { "label": "主要尺寸", "value": "從原始碼抄來的數字", "source": "檔案路徑與常數名" }
  ],
  "links": {
    "open": "https://設計器網址/",
    "github": "https://github.com/擁有者/倉庫"
  },
  "thumbnail": "assets/thumb-my-designer.png",
  "thumbnailAlt": "新設計器的預設畫面",
  "assemblyNodes": [
    { "id": "my-part", "label": "零件名", "order": 35, "detail": "短註", "status": "match" }
  ],
  "interfaces": [],
  "checks": []
}
```

`assemblyNodes` 的 `order` 決定整機箭頭的先後，數字不必連號。`status` 用 `match`、`mismatch` 或 `unconfirmed`。後兩者在圖上是虛線黃框。

要讓接口表多一列，把物件放進這一筆的 `interfaces`：

| 欄位 | 寫什麼 |
| --- | --- |
| `pair` | 哪兩個零件相接，例如「葉片葉根 ↔ 輪轂」 |
| `dimension` | 要兩邊一致的那個尺寸 |
| `mustMatch` | 為什麼這兩個數要相同 |
| `status` | `match` 一致、`mismatch` 不一致、`unconfirmed` 待確認。後兩者標黃 |
| `left` / `right` | 各含 `part`、`value`、`source`。若這一側屬於另一個已收錄的設計器，加上 `designerId` |
| `note` | 不一致或待確認時必填，說明差在哪 |

比賽或使用上的檢核放進 `checks`。`status` 用 `pass`、`warn` 或 `unconfirmed`。沒有就留空陣列 `[]`。三個陣列都要在，不能省掉。

不要把設計器的 JavaScript、STL 或網頁複製進這個倉庫。總站只留網址、縮圖和從原始碼抄來的尺寸。

## 現在收了哪三個

數字以各倉庫 main 的原始碼為準。README 若和程式不同，以程式為準。

| 設計器 | 版本 | 版本出處 | 讀取時的 commit |
| --- | --- | --- | --- |
| 葉片壓模設計器 | 1.3.0 | `index.html` 標題 | `38774f46cfe4631ad52fe2bbef3688f8dc7fc3a7` |
| 風力齒輪設計室 | 1.3.4 | `package.json` 與 `src/app.jsx` | `e65b1c5322a8fa37072fd3197b5bc33458034a99` |
| 底座支架設計器 | 1.0.0 | `package.json` 與 `src/calc.mjs` 的 `VERSION` | `c16d3dad3cc2828ef3cf6942c58696b0edc66546` |

齒輪設計室的 README 標題仍寫 v1.3.1，頁面和 `package.json` 是 1.3.4。

## 檔案

| 路徑 | 內容 |
| --- | --- |
| `docs/index.html` | 頁面骨架，不含設計器名單 |
| `docs/css/site.css` | 版面 |
| `docs/js/site.js` | 讀資料檔並畫出卡片、接口表、組裝圖、檢核 |
| `docs/data/components.json` | 唯一的元件資料 |
| `docs/assets/` | 各設計器預設畫面的縮圖 |
| `scripts/validate.mjs` | `npm test` 執行的檢查 |
