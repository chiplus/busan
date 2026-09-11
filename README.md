# 釜山潮汐行程表

釜山自由行(2026/10/09–10/14)的互動行程表。純靜態網頁,沒有後端,沒有打包步驟,瀏覽器直接開三個檔案:`index.html`(結構)、`styles.css`(樣式)、`app.js`(邏輯,ES module,會 `import` `data.js` 的資料)。

- 上方有四個檢視:**行程表**(用下拉選單切換 10/09–10/14 各天的時間軸,每天 07:30–22:00、30 分鐘一格)、**待確認**、**代辦**(出發前要辦的事)、**要帶**(打包清單)。切到後三個檢視時,日期下拉選單還在原位(只是淡一點),選別天會直接跳回行程表。
- 目前停在哪個檢視、哪一天、代辦/要帶的人員篩選,會存在瀏覽器裡(跟行程資料分開存,key 是 `busan-tide-ui-v1`),重新整理網頁會回到原本那頁,不會跳回行程表第一天。
- 右邊固定是**景點櫃**,切換檢視不會影響它。
- **代辦**跟**要帶**都是方格卡片。代辦一張卡有:打勾完成、事項名稱、網址(貼上後右邊會出現「↗」直接開連結)、deadline(可留空,會顯示「還有 X 天／已過期 X 天」)、備註,還有 **Lee／Kiwi** 兩顆按鈕——兩人都要做就兩個都點亮,不是只能選一個;上面還有「全部／Lee／Kiwi」篩選鈕,篩單一個人時也會列出兩人都要做的項目。要帶的卡片比較單純:名稱前面的 icon 是打字當下自動依關鍵字猜的(護照→🛂、藥→💊…以此類推,猜不到就用 🧳),一樣可以同時指定給兩人,上面也有同一套「全部／Lee／Kiwi」篩選鈕。兩邊完成後都會整張卡變灰底、名稱加刪除線。
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
masthead-gwangan.webp 頁首主視覺:廣安里線稿(與圖示同一幅畫,只留亮度當遮罩)
廣安里-線條稿線.png    上面那張圖的原稿,要重新產圖時用
.nojekyll             叫 GitHub Pages 不要跑 Jekyll,直接出檔
```

> 改了 `styles.css` / `data.js` / `app.js` 之後,記得把 `sw.js` 裡的 `CACHE` 版本號 +1(目前 `busan-tide-v11`,下次改成 `v12`),否則舊訪客的離線快取不會刷新。

> 頁首那張圖是用 CSS `mask` 疊上去的:`masthead-gwangan.webp` 只存線稿的亮度(白線+透明背景),線的顏色由 `styles.css` 的 `.masthead__art>i{background:…}` 決定,所以要換色不用重做圖。

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

## 跨裝置同步(Supabase)

行程預設只存在瀏覽器裡,三台裝置各看各的。要讓手機、桌機、筆電共用同一份,照下面做一次,之後就自動了。

### 1. 建立 Supabase 專案

1. 到 <https://supabase.com> 用 GitHub 帳號登入(免費方案就夠)
2. **New project** → 名稱填 `busan` → 設一組資料庫密碼(用不到,但要填)→ Region 選 **Northeast Asia (Tokyo)** → Create
3. 等一兩分鐘讓它建好

### 2. 建資料表與兩個函式

左側選單 **SQL Editor** → **New query** → 把下面整段貼進去 → 按 **Run**:

```sql
-- 行程表:一筆 = 一份行程,id 就是同步碼
create table if not exists public.plans (
  id          text primary key,
  data        jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- 全開 RLS 且不建任何 policy = 誰都不能直接讀寫這張表
alter table public.plans enable row level security;

-- 只有這兩個函式進得去,而且都必須提供同步碼
create or replace function public.get_plan(p_id text)
returns setof public.plans
language sql security definer set search_path = public as $$
  select * from public.plans where id = p_id;
$$;

create or replace function public.save_plan(p_id text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare ts timestamptz;
begin
  insert into public.plans (id, data, updated_at)
  values (p_id, p_data, now())
  on conflict (id) do update
    set data = excluded.data, updated_at = now()
  returning updated_at into ts;
  return ts;
end $$;

revoke all on function public.get_plan(text)          from public;
revoke all on function public.save_plan(text, jsonb)  from public;
grant execute on function public.get_plan(text)         to anon;
grant execute on function public.save_plan(text, jsonb) to anon;
```

看到 `Success. No rows returned` 就對了。

**為什麼這樣寫**:資料表的 RLS 開著又沒有任何 policy,等於直接查表一定查不到東西。唯一的入口是那兩個 `security definer` 函式,而它們都要求你給出同步碼。所以就算有人從公開的原始碼撈到金鑰,也沒辦法把所有行程列出來——他得先猜中那串 16 個字元的隨機碼。

### 3. 把金鑰填進 sync.js

左側 **Settings → API Keys**,複製兩個值:

| 欄位 | 長相 | 填到 `sync.js` 的 |
|---|---|---|
| Project URL | `https://xxxxxxxx.supabase.co` | `SUPABASE_URL` |
| Publishable key | `sb_publishable_...` | `SUPABASE_KEY` |

打開 `sync.js`,最上面設定區那兩行改成:

```js
var SUPABASE_URL = "https://你的專案.supabase.co";
var SUPABASE_KEY = "sb_publishable_你的金鑰";
```

**只能用 publishable key,絕對不要貼 secret key**(`sb_secret_` 開頭)。publishable key 本來就設計成可以放在前端公開,擋人的是上面的 RLS 設計和你的同步碼;secret key 會繞過所有防線。

存檔,推上去:

```bash
git add sync.js
git commit -m "接上 Supabase 同步"
git push
```

### 4. 三台裝置連起來

等一分鐘部署完成,然後:

**第一台**(資料最完整的那台)

1. 開網站,按工具列的「**同步**」
2. 按「**在這台建立同步(用目前的行程)**」
3. 出現一組像 `cridi5bk-6ocoag2u` 的同步碼,按「複製同步碼」

**另外兩台**

1. 開網站 → 「同步」
2. 把同步碼貼進輸入框 → 按「**用同步碼連線**」
3. 這台原本的行程會被雲端那份取代。捨不得的話先按「匯出」備份

連好之後,任何一台改動 1.5 秒後自動上傳,其他裝置每 20 秒、或切回視窗時自動抓下來。側欄會顯示「已同步 · 時間」。

### 注意事項

- **衝突是後寫的贏**,整包覆蓋。兩台同時大改同一天的行程,晚存的那台會蓋掉先存的。一次在一台改比較保險。
- **同步碼就是密碼**,拿到的人就看得到也改得動這份行程。不要貼到公開的地方。
- **忘記同步碼**:在還連著的那台按「同步」就看得到。三台都斷了的話,到 Supabase 後台 **Table Editor → plans** 看 `id` 欄位。
- **想退回**:按「在這台停用同步」,這台就變回只存本機,雲端那份不會被刪,之後還能用同步碼接回來。
- 免費方案的資料庫閒置一段時間會被暫停,再開網站時第一次同步可能要多等幾秒。
