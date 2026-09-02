# 釜山潮汐行程表

釜山自由行(2026/10/09–10/14)的互動行程表。純靜態網頁,沒有後端,沒有打包步驟,瀏覽器直接開三個檔案:`index.html`(結構)、`styles.css`(樣式)、`app.js`(邏輯,ES module,會 `import` `data.js` 的資料)。

- 上方有四個檢視:**行程表**(用下拉選單切換 10/09–10/14 各天的時間軸,每天 07:30–22:00、30 分鐘一格)、**待確認**、**代辦**(出發前要辦的事)、**要帶**(打包清單)。
- 右邊固定是**景點櫃**,切換檢視不會影響它。
- 景點卡可以拖到時間軸上;行程方塊可以上下移動、拉底邊伸縮長度。要換天用細節面板的「哪一天」,或先用上方下拉選單切到那天再拖。
- 點方塊開細節面板:改時間、寫當日備註、編輯景點資料與地圖網址。
- 地圖按鈕會依網址判斷是 Naver 還是 Google 地圖。

## 部署到 GitHub Pages

```bash
# 在這個資料夾裡
git init
git add .
git commit -m "釜山行程表"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<repo 名稱>.git
git push -u origin main
```

推上去之後,到 repo 的 **Settings → Pages**,把 Source 設成 `Deploy from a branch`,分支選 `main`、資料夾選 `/ (root)`,按 Save。等一兩分鐘,網址就是:

```
https://<你的帳號>.github.io/<repo 名稱>/
```

之後每次 `git push` 都會自動重新部署。

## 手機上像 App 一樣用

在手機瀏覽器開上面那個網址 →

- iPhone Safari:分享 → 加入主畫面
- Android Chrome:選單 → 安裝應用程式／加到主畫面

裝好之後會全螢幕開啟,而且 `sw.js` 會把頁面快取起來,**在韓國沒網路也打得開**(第一次一定要在有網路時開過一次)。

## 資料存在哪裡

行程存在你當下那台裝置的瀏覽器 `localStorage` 裡,不會上傳到任何地方。因此:

| 情境 | 做法 |
|---|---|
| 換裝置 / 備份 | 按「匯出」下載 `busan-plan-*.json`,在另一台按「匯入」 |
| 傳給旅伴看 | 按「分享網址」,整份行程會壓縮進網址,對方打開就看得到 |
| 清了瀏覽器資料 | 沒有備份就會回到預設行程,出發前記得匯出一份 |

打開別人給的分享網址時,上方會出現藍色橫幅,可以選「存成我的行程」或「回到我的行程」——在按下前不會覆蓋你自己的資料。

> 想要真正的跨裝置即時同步,就需要接一個後端(Firebase 或 Supabase 的免費方案都夠用)。目前刻意不接,是為了讓這個 repo 保持零設定、零金鑰。

## 檔案

```
index.html            頁面結構(約 130 行,幾乎不用動)
styles.css            所有樣式
data.js               行程資料與版面參數 ← 你平常要改的就是這個
app.js                應用邏輯:儲存、分享網址、拖曳、側欄、細節面板
sw.js                 Service Worker,離線快取(網路優先,斷線才吃快取)
manifest.webmanifest  PWA 設定,決定加到主畫面的名稱與圖示
icon-192.png          圖示
icon-512.png          圖示
.nojekyll             叫 GitHub Pages 不要跑 Jekyll,直接出檔
```

> 改了 `styles.css` / `data.js` / `app.js` 之後,記得把 `sw.js` 裡的 `CACHE` 版本號 +1(目前 `busan-tide-v5`,下次改成 `v6`),否則舊訪客的離線快取不會刷新。

## 要改東西的話

預設的景點、行程、清單、版面參數全部集中在 **`data.js`**,是純資料,很好找:

- `SEED_SPOTS` — 景點櫃的預設景點(名稱、韓文名、分類、地圖網址、備註)
- `SEED_EVENTS` — 每天預排的行程,`ev(日期id, 景點id, 開始分鐘數, 長度分鐘數, 當日備註)`,分鐘數是從 00:00 起算,例如 `570` 就是 09:30
- `SEED_TODOS` — 待確認清單    `SEED_TASKS` — 代辦清單    `SEED_PACKING` — 要帶清單
- `DAYS` — 六天的日期、主題、住宿
- `CATS` / `CAT_ORDER` — 分類與顏色
- `DAY_START` / `DAY_END` — 時間軸的起訖(目前 450 = 07:30、1320 = 22:00)、`SNAP` 格線間距、`PPM` 每分鐘像素

新增欄位或改畫面行為則在 `app.js`。改完之後,已經在用的瀏覽器不會自動吃到新的預設值(因為本機存了舊資料)。要看到新預設,按「待確認」分頁最下面的「回復預設行程」,或先匯出備份再清掉瀏覽器資料。

用 VS Code 的話,可以裝 Claude Code 擴充功能,在編輯器裡直接叫 Claude 改這個檔案:<https://code.claude.com/docs/en/vs-code>

## 本機預覽

`app.js` 是 ES module,瀏覽器的模組 CORS 規則會擋掉 `file://`,所以**一定要用 http 開**(Service Worker 也是要 http 才會啟動):

```bash
python3 -m http.server 8000
# 然後開 http://localhost:8000
```

改 CSS / 資料存檔後,回瀏覽器按 Ctrl+Shift+R 強制重整(避開 Service Worker 舊快取),或開無痕視窗。
