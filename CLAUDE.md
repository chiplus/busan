# 釜山潮汐行程表

2026/10/09–10/14 釜山自由行的互動行程表。純靜態網頁,部署在 GitHub Pages。

- 線上網址:https://chiplus.github.io/busan/
- 使用者慣用繁體中文
- 開發環境有兩台,指令要配合當下的機器:
  - **Windows**(`D:\busan-itinerary`):PowerShell,用 `Copy-Item` 不是 `copy`,預覽用 `python -m http.server 8000`
  - **macOS**(`~/Documents/Projects/busan`):zsh,預覽用 `python3 -m http.server 8000`(不是 `python`)
- 因為有多台機器在改,**開工前先 `git pull`**,收工後才 push

## 這個專案的硬性限制

改動時務必遵守,違反會直接壞掉:

1. **維持現在這四個檔案的分工**:`index.html`(骨架)、`data.js`(行程資料)、`app.js`(邏輯)、`sync.js`(雲端同步)、`styles.css`(樣式)。不要再往下拆,也不要引入建置工具、npm、框架。
2. **不要加外部 JS 相依**。唯一的外部資源是 Google Fonts 的一個 `<link>`,以及 `sync.js` 對 Supabase REST 端點的 `fetch`。不要引入 CDN 上的函式庫,也不要裝 `@supabase/supabase-js`——現在是手寫 fetch,刻意保持零套件。
3. **JS 主體保持 ES5 風格**(`var`、`function`、不用箭頭函式與 optional chaining),只有 `import` / `export` 用 ES module 語法。
4. **`index.html` 必須留在 repo 根目錄**,GitHub Pages 只認最上層的 `index.html`。
5. **`app.js` 是 `<script type="module">`**,所以一定要透過 http(s) 開,雙擊 `file://` 會被模組 CORS 擋掉。
6. **不要把 Supabase 的 secret key 寫進任何檔案。** `sync.js` 裡只能放 Project URL 和 publishable key(`sb_publishable_` 開頭),那把是設計成可公開的;真正的防線是資料庫 RLS 與同步碼。

## 檔案

```
index.html            骨架與所有 DOM 節點
data.js               行程資料與版面參數(平常最常改的檔案)
app.js                應用邏輯:儲存、拖曳、面板、四個檢視
sync.js               跨裝置同步(Supabase),設定區在檔案最上面
styles.css            全部樣式
manifest.webmanifest  PWA 設定
icon-192.png / icon-512.png   圖示
masthead-gwangan.webp / 廣安里-線條稿線.png   頁首線稿
sw.js                 Service Worker(目前 index.html 裡有一段會主動反註冊,
                      等同停用;要恢復離線功能得先把那段拿掉)
.nojekyll             叫 GitHub Pages 不要跑 Jekyll
README.md             給人看的說明
```

## 資料在哪裡

全部在 `data.js`,是純資料:

| 變數 | 內容 |
|---|---|
| `DAYS` | 六天的 id、日期、星期、主題、住宿 |
| `CATS` | 分類(food/sight/play/beauty/shop/move/stay)與對應的 CSS 顏色變數 |
| `SEED_SPOTS` | 景點櫃預設景點:`{id, name, ko, cat, url, notes}` |
| `SEED_EVENTS` | 每天預排行程,用 `ev(dayId, spotId, start, dur, memo)` 建立 |
| `SEED_TODOS` | 「待確認」清單 |
| `SEED_TASKS` | 「代辦」清單(含人員指定) |
| `SEED_PACKING` | 「要帶」清單(含人員指定) |
| `DAY_START` / `DAY_END` | 時間軸起訖,450(07:30)到 1320(22:00) |
| `SNAP` | 吸附刻度,30 分鐘 |
| `PPM` | 每分鐘幾像素,1.5 |

**時間一律用「從 00:00 起算的分鐘數」**:570 = 09:30,1080 = 18:00。新增 `SEED_EVENTS` 時 `start` 和 `dur` 都必須是 30 的倍數,否則細節面板的時間下拉選單會選不到值。

地圖網址:韓國地點優先用 `nv("韓文店名")` 產生 Naver 連結,其他用 `gg("英文名")` 產生 Google Maps 連結。頁面會依網址自動判斷要顯示哪種地圖按鈕。

## 兩個一定會踩到的坑

**改了 `SEED_*` 但畫面沒變**——不是 bug。瀏覽器 `localStorage` 存了使用者手動調整過的版本,會蓋過程式碼裡的預設值。要驗證新預設,先在頁面上按「匯出」備份,再到「待確認」分頁最下方按兩次「回復預設行程」。或開無痕視窗測。

**改了程式碼但網頁還是舊的**——Service Worker 快取。`Ctrl+Shift+R` 強制重新整理。改動較大時,順手把 `sw.js` 裡的 `const CACHE = 'busan-tide-v1'` 版號往上加,舊快取才會被清掉。

## 本機測試

Windows(PowerShell):

```powershell
python -m http.server 8000
```

macOS(zsh):

```bash
python3 -m http.server 8000
```

然後開 `http://localhost:8000`。**一定要用 http 開,不要雙擊 `index.html` 用 `file://`**——`app.js` 是 ES module,`file://` 下會被 CORS 擋掉,整頁空白。

改完至少手動確認這幾件事:
- 六個日期分頁都能切,方塊位置正確
- 從景點櫃拖一張卡到時間軸能建立行程
- 拖方塊底邊能伸縮長度
- 點方塊能開細節面板,地圖按鈕顏色與文字對應網址類型
- 深色模式(瀏覽器 DevTools 可模擬 `prefers-color-scheme`)不會出現黑字黑底
- 手機寬度(390px)不會左右橫向捲動
- 有開雲端同步的話,改東西後側欄狀態會從「同步中…」變成「已同步 · 時間」

## 部署

push 到 `main` 就會自動重新部署,約一分鐘生效。兩台機器指令相同:

```bash
git pull                  # 開工前
git add .
git commit -m "訊息"
git push
```

忘記先 pull 就 push 會被拒絕,解法是 `git pull --rebase` 再 `git push`。

## CSS 主題規則

顏色全部走 CSS 變數,定義在三個地方,**三個都要改**,不然某一種主題狀態會壞:

1. `:root` — 淺色(預設)
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` — 跟隨系統的深色
3. `:root[data-theme="dark"]` — 手動切到深色

不要把顏色只寫在 media query 或 `[data-theme]` 區塊裡,那樣在「跟隨系統」的狀態下會套不到。

## 跨裝置同步(sync.js)

行程整包當成一筆 JSON 存在 Supabase 的 `plans` 資料表。「同步碼」是隨機字串,等於這份行程的鑰匙;三台裝置填同一組就共用同一份。

- 本機改動 → `persist()` 存完 localStorage 後呼叫 `Sync.notifyChange()` → 1.5 秒 debounce → 上傳
- 每 20 秒、以及視窗重新取得焦點時,向雲端拉一次;`rev`(毫秒時間戳)較新才覆蓋本機
- 衝突是**後寫的贏**,整包覆蓋,沒有欄位級合併
- 沒填設定或連不上時全部降級成純 localStorage,不會壞

資料表與兩個 RPC 函式的 SQL 在 `README.md` 的「跨裝置同步」那節。**RLS 全關(沒有任何 policy),所有存取只能走 `get_plan` / `save_plan` 兩個 SECURITY DEFINER 函式**,所以光有 publishable key 無法列舉別人的行程。改動這塊時不要為了方便去開資料表的 policy。

另一條路(不需要後端)是頁面上的「分享網址」按鈕:把行程 gzip 後編進網址 hash,對方打開後按「存成我的行程」。
