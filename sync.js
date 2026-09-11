/* ============================================================
   sync.js — 三台裝置之間的行程同步(Supabase)
   ------------------------------------------------------------
   運作方式:
   · 行程整包(state)當成一筆 JSON 存在 Supabase 的 plans 資料表
   · 「同步碼」是一串隨機字串,等於這份行程的鑰匙。三台裝置用
     同一組同步碼,就看到同一份行程。
   · 本機改動 → 1.5 秒後自動上傳;每 20 秒向雲端拉一次,
     看看別台有沒有更新。
   · 衝突處理是「後寫的贏」——兩台同時改同一段行程,晚存的那台
     會蓋掉先存的。個人行程表夠用,但別兩台同時大改。
   · 沒填設定、或連不上網路時,一切照舊存在瀏覽器 localStorage,
     不會壞掉。

   資料表與函式的 SQL 在 README.md 的「跨裝置同步」那節。
   ============================================================ */

/* ▼▼▼ 設定區:把你 Supabase 專案的兩個值填進來 ▼▼▼
   Supabase 後台 → Settings → API Keys
   · SUPABASE_URL:Project URL,長得像 https://xxxxxxxx.supabase.co
   · SUPABASE_KEY:Publishable key,sb_publishable_ 開頭
     (這把鑰匙本來就設計成可以公開放在前端,真正的防線是資料庫的
      RLS 規則 + 你的同步碼。千萬不要貼 secret key。)          */

var SUPABASE_URL = "https://pdgnujuwvhyuifvqzsgx.supabase.co";
var SUPABASE_KEY = "sb_publishable_in2h-OZZAS6B8lr2ePasSg_YyoeAeFX";

/* ▲▲▲ 填完存檔 → git push → 一分鐘後網站就能同步 ▲▲▲ */


var SYNC_LS = "busan-tide-sync-v1";
var POLL_MS = 20000;
var PUSH_DEBOUNCE_MS = 1500;

var hooks = null;
var syncKey = null;
var pushTimer = null, pollTimer = null;
var pushing = false, lastRemoteRev = 0;

/* ---------- 基本工具 ---------- */

function configured(){
  return !!(SUPABASE_URL && SUPABASE_KEY);
}
function loadKey(){
  try{ return localStorage.getItem(SYNC_LS) || null; }catch(e){ return null; }
}
function storeKey(k){
  try{ if(k) localStorage.setItem(SYNC_LS,k); else localStorage.removeItem(SYNC_LS); }catch(e){}
}
function makeKey(){
  var bytes = new Uint8Array(16), out = "";
  if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
  else for(var j=0;j<16;j++) bytes[j]=Math.floor(Math.random()*256);
  var abc = "abcdefghijkmnopqrstuvwxyz23456789";   // 拿掉 l/1/0/o,抄的時候不會看錯
  for(var i=0;i<bytes.length;i++) out += abc.charAt(bytes[i] % abc.length);
  return out.slice(0,8) + "-" + out.slice(8,16);
}
function note(cls, txt){ if(hooks && hooks.setStatus) hooks.setStatus(cls, txt); }
function say(msg){ if(hooks && hooks.toast) hooks.toast(msg); }
function stamp(){
  return new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"});
}

function rpc(fn, body){
  if(!configured()) return Promise.reject(new Error("尚未填入 Supabase 設定"));
  return fetch(SUPABASE_URL.replace(/\/+$/,"") + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }).then(function(res){
    if(!res.ok){
      return res.text().then(function(t){
        throw new Error("HTTP " + res.status + " " + String(t).slice(0,140));
      });
    }
    return res.text().then(function(t){ return t ? JSON.parse(t) : null; });
  });
}

/* ---------- 拉 / 推 ---------- */

function pull(silent){
  if(!syncKey || !configured()) return Promise.resolve(null);
  return rpc("get_plan", {p_id: syncKey}).then(function(rows){
    var row = (rows && rows.length) ? rows[0] : null;
    if(!row || !row.data) return null;
    var remote = row.data;
    var localRev = hooks.getState() ? (hooks.getState().rev || 0) : 0;
    if(!remote.rev || remote.rev <= localRev) return remote;   // 本機一樣新或更新
    lastRemoteRev = remote.rev;
    if(hooks.applyState(remote)){
      note("ok","已從其他裝置更新 · " + stamp());
      if(!silent) say("已載入其他裝置的版本");
    }
    return remote;
  }).catch(function(err){
    note("","雲端讀取失敗:" + err.message);
    return null;
  });
}

function pushNow(){
  if(!syncKey || !configured() || pushing) return Promise.resolve();
  var st = hooks.getState();
  if(!st) return Promise.resolve();          // 正在看分享的行程,不要上傳
  pushing = true;
  note("busy","同步中…");
  return rpc("save_plan", {p_id: syncKey, p_data: st}).then(function(){
    lastRemoteRev = st.rev || 0;
    note("ok","已同步 · " + stamp());
  }).catch(function(err){
    note("","同步失敗,已存在本機(" + err.message + ")");
  }).then(function(){ pushing = false; });
}

/* ---------- 對外 API ---------- */

export function init(opts){
  hooks = opts;
  syncKey = loadKey();
  if(!configured()){
    note("","自動存在這個瀏覽器(尚未設定雲端同步)");
    return;
  }
  if(!syncKey){
    note("","自動存在這個瀏覽器 · 按「同步」可開啟跨裝置");
    return;
  }
  note("busy","連線中…");
  pull(true).then(function(){ start(); });
}

export function notifyChange(){
  if(!syncKey || !configured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, PUSH_DEBOUNCE_MS);
}

function start(){
  clearInterval(pollTimer);
  pollTimer = setInterval(function(){
    if(document.hidden) return;
    pull(true);
  }, POLL_MS);
  window.addEventListener("focus", function(){ if(syncKey) pull(true); });
}

function stop(){
  clearInterval(pollTimer); pollTimer = null;
  clearTimeout(pushTimer); pushTimer = null;
}

/* ---------- 設定面板 ---------- */

var box = null;

export function openPanel(){
  if(box) closePanel();
  box = document.createElement("div");
  box.className = "syncbox";
  var card = document.createElement("div");
  card.className = "syncbox__card";
  box.appendChild(card);
  box.addEventListener("click", function(e){ if(e.target === box) closePanel(); });
  document.body.appendChild(box);
  paint(card);
}
function closePanel(){
  if(box && box.parentNode) box.parentNode.removeChild(box);
  box = null;
}

function h(tag, cls, txt){
  var n = document.createElement(tag);
  if(cls) n.className = cls;
  if(txt != null) n.textContent = txt;
  return n;
}

function paint(card){
  card.innerHTML = "";
  card.appendChild(h("div","syncbox__title","跨裝置同步"));

  var x = h("button","syncbox__x","✕");
  x.addEventListener("click", closePanel);
  card.appendChild(x);

  if(!configured()){
    card.appendChild(h("p","syncbox__p",
      "還沒設定 Supabase。打開專案裡的 sync.js,把最上面設定區的 SUPABASE_URL 和 SUPABASE_KEY 兩行填好,存檔後 git push,再回來這裡。"));
    card.appendChild(h("p","syncbox__note",
      "詳細步驟寫在 README.md 的「跨裝置同步」那一節。"));
    return;
  }

  if(!syncKey){
    card.appendChild(h("p","syncbox__p",
      "目前行程只存在這台裝置的瀏覽器裡。開啟同步之後,三台裝置會共用同一份。"));

    var b1 = h("button","syncbox__btn syncbox__btn--go","在這台建立同步(用目前的行程)");
    b1.addEventListener("click", function(){
      syncKey = makeKey(); storeKey(syncKey);
      b1.disabled = true; b1.textContent = "建立中…";
      pushNow().then(function(){ start(); paint(card); say("同步已開啟"); });
    });
    card.appendChild(b1);

    card.appendChild(h("div","syncbox__or","或"));

    var inp = document.createElement("input");
    inp.className = "syncbox__input";
    inp.placeholder = "貼上另一台的同步碼";
    inp.spellcheck = false;
    card.appendChild(inp);

    var b2 = h("button","syncbox__btn","用同步碼連線(會換成雲端那份)");
    b2.addEventListener("click", function(){
      var k = inp.value.trim().toLowerCase();
      if(!k){ say("請先貼上同步碼"); return; }
      b2.disabled = true; b2.textContent = "連線中…";
      var prev = syncKey; syncKey = k;
      rpc("get_plan", {p_id: k}).then(function(rows){
        var row = (rows && rows.length) ? rows[0] : null;
        if(!row || !row.data) throw new Error("找不到這組同步碼的行程");
        if(!hooks.applyState(row.data)) throw new Error("雲端資料格式不對");
        storeKey(k); start(); paint(card);
        note("ok","已連線 · " + stamp());
        say("已載入雲端行程");
      }).catch(function(err){
        syncKey = prev;
        b2.disabled = false; b2.textContent = "用同步碼連線(會換成雲端那份)";
        say("連不上:" + err.message);
      });
    });
    card.appendChild(b2);

    card.appendChild(h("p","syncbox__note",
      "提醒:用同步碼連線會把這台目前的行程換成雲端那一份。捨不得的話,先按工具列的「匯出」留一份備份。"));
    return;
  }

  /* 已啟用 */
  card.appendChild(h("p","syncbox__p","同步已開啟。在別台裝置的同步面板貼上這組碼,就會看到同一份行程。"));

  var code = h("div","syncbox__code", syncKey);
  card.appendChild(code);

  var copy = h("button","syncbox__btn syncbox__btn--go","複製同步碼");
  copy.addEventListener("click", function(){
    var done = function(){ copy.textContent = "已複製"; setTimeout(function(){ copy.textContent = "複製同步碼"; }, 1600); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(syncKey).then(done, fallback);
    } else fallback();
    function fallback(){
      var ta = document.createElement("textarea");
      ta.value = syncKey; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ say("請手動選取上面那串"); }
      ta.remove();
    }
  });
  card.appendChild(copy);

  var now = h("button","syncbox__btn","立即同步一次");
  now.addEventListener("click", function(){
    now.disabled = true; now.textContent = "同步中…";
    pull(false).then(pushNow).then(function(){
      now.disabled = false; now.textContent = "立即同步一次";
    });
  });
  card.appendChild(now);

  var off = h("button","syncbox__btn syncbox__btn--warn","在這台停用同步");
  var armed = false;
  off.addEventListener("click", function(){
    if(!armed){ armed = true; off.textContent = "再按一次確認停用"; setTimeout(function(){ armed = false; off.textContent = "在這台停用同步"; }, 3000); return; }
    stop(); syncKey = null; storeKey(null); paint(card);
    note("ok","自動存在這個瀏覽器");
    say("已停用同步(雲端那份還在,之後可用同步碼接回來)");
  });
  card.appendChild(off);

  card.appendChild(h("p","syncbox__note",
    "停用只是讓這台不再上傳下載,雲端的行程不會被刪掉。衝突處理是後寫的贏,避免兩台同時大改。"));
}
