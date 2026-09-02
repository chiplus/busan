# 釜山潮汐行程表

釜山自由行(2026/10/09–10/14)的互動行程表。純靜態網頁,沒有後端,一個 `index.html` 就是全部的程式。

- 左邊是時間軸:六個日期分頁,每天 07:30–22:00,30 分鐘一格。
- 右邊是景點櫃與待確認清單。
- 景點卡可以拖到時間軸上、拖到日期分頁上;行程方塊可以上下移動、拉底邊伸縮長度。
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
index.html            整個 App(HTML + CSS + JS,單檔)
sw.js                 Service Worker,離線快取(網路優先,斷線才吃快取)
manifest.webmanifest  PWA 設定,決定加到主畫面的名稱與圖示
icon-192.png          圖示
icon-512.png          圖示
.nojekyll             叫 GitHub Pages 不要跑 Jekyll,直接出檔
```

## 要改東西的話

預設的景點與行程都寫在 `index.html` 的 JS 區塊裡,是純資料,很好找:

- `SEED_SPOTS` — 景點櫃的預設景點(名稱、韓文名、分類、地圖網址、備註)
- `SEED_EVENTS` — 每天預排的行程,`ev(日期id, 景點id, 開始分鐘數, 長度分鐘數, 當日備註)`,分鐘數是從 00:00 起算,例如 `570` 就是 09:30
- `SEED_TODOS` — 待確認清單
- `DAYS` — 六天的日期、主題、住宿
- `CATS` — 分類與顏色
- `DAY_START` / `DAY_END` — 時間軸的起訖(目前 450 = 07:30、1320 = 22:00)

改完之後,已經在用的瀏覽器不會自動吃到新的預設值(因為本機存了舊資料)。要看到新預設,按「待確認」分頁最下面的「回復預設行程」,或先匯出備份再清掉瀏覽器資料。

用 VS Code 的話,可以裝 Claude Code 擴充功能,在編輯器裡直接叫 Claude 改這個檔案:<https://code.claude.com/docs/en/vs-code>

## 本機預覽

Service Worker 需要 http 才會啟動,直接用 `file://` 開會少掉離線功能(其他都正常):

```bash
python3 -m http.server 8000
# 然後開 http://localhost:8000
```
