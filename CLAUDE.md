# 釜山潮汐行程表

2026/10/09–10/14 釜山自由行的互動行程表。純靜態單檔網頁,部署在 GitHub Pages。

- 線上網址:https://chiplus.github.io/busan/
- 使用者慣用繁體中文
- 開發環境有兩台,指令要配合當下的機器:
  - **Windows**(`D:\busan-itinerary`):PowerShell,用 `Copy-Item` 不是 `copy`,預覽用 `python -m http.server 8000`
  - **macOS**(`~/Documents/Projects/busan`):zsh,預覽用 `python3 -m http.server 8000`(不是 `python`)
- 因為有多台機器在改,**開工前先 `git pull`**,收工後才 push

## 這個專案的硬性限制

改動時務必遵守,違反會直接壞掉:

1. **`index.html` 必須維持單一自足檔案**——HTML、CSS、JS 全部在同一個檔案裡。不要拆出 `style.css` 或 `app.js`,不要引入建置工具、npm、框架。
2. **不要加外部相依**。目前唯一的外部資源是 Google Fonts 的一個 `<link>`。不要引入 CDN 上的 JS 函式庫。
3. **JS 保持 ES5 風格**(`var`、`function`、不用箭頭函式與 optional chaining)。全部包在一個 IIFE 裡。這是為了在舊手機瀏覽器上也能開。
4. **`index.html` 必須留在 repo 根目錄**,GitHub Pages 只認最上層的 `index.html`。
5. 沒有後端、沒有 API key。資料只存在瀏覽器 `localStorage`。

## 檔案

```
index.html            整個 App(HTML + CSS + JS,單檔,約 1200 行)
sw.js                 Service Worker,網路優先、斷線吃快取
manifest.webmanifest  PWA 設定
icon-192.png / icon-512.png   廣安大橋圖示
.nojekyll             叫 GitHub Pages 不要跑 Jekyll
README.md             給人看的說明
```

## 資料在哪裡

全部在 `index.html` 的 `<script>` 區塊上半部,是純資料:

| 變數 | 內容 |
|---|---|
| `DAYS` | 六天的 id、日期、星期、主題、住宿 |
| `CATS` | 分類(food/sight/play/beauty/shop/move/stay)與對應的 CSS 顏色變數 |
| `SEED_SPOTS` | 景點櫃預設景點:`{id, name, ko, cat, url, notes}` |
| `SEED_EVENTS` | 每天預排行程,用 `ev(dayId, spotId, start, dur, memo)` 建立 |
| `SEED_TODOS` | 待確認清單 |
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

然後開 `http://localhost:8000`。**一定要用 http 開,不要雙擊 `index.html` 用 `file://`**,Service Worker 在 `file://` 下不會啟動。

改完至少手動確認這幾件事:
- 六個日期分頁都能切,方塊位置正確
- 從景點櫃拖一張卡到時間軸能建立行程
- 拖方塊底邊能伸縮長度
- 點方塊能開細節面板,地圖按鈕顏色與文字對應網址類型
- 深色模式(瀏覽器 DevTools 可模擬 `prefers-color-scheme`)不會出現黑字黑底
- 手機寬度(390px)不會左右橫向捲動

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

## 已知限制:資料不同步

行程資料只存在瀏覽器 `localStorage`,綁在「該裝置 × 該瀏覽器」,三台裝置之間**不會自動同步**。iOS 上 Safari 和「加到主畫面」的 PWA 也是兩個獨立的儲存空間。

目前的搬移方式是頁面上的「分享網址」按鈕(把行程 gzip 後編進網址 hash)或「匯出/匯入」JSON。

要做真同步就得接後端(Supabase / Firebase 免費方案)。尚未實作;若要實作,注意 repo 是公開的,金鑰會出現在原始碼裡,需要另外設計一組行程密碼。
