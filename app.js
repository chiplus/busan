/* ============================================================
   app.js — 應用邏輯:狀態儲存、分享網址、時間軸拖曳、側欄與細節面板。
   版面參數與行程資料在 data.js。樣式在 styles.css。
   以 <script type="module"> 載入 → 需要透過 http(s) 開啟,
   直接雙擊 file:// 開啟會被瀏覽器的模組 CORS 規則擋掉。
   ============================================================ */
import {
  DAY_START, DAY_END, SNAP, PPM, GRID_H,
  CATS, CAT_ORDER, DAYS,
  SEED_SPOTS, SEED_EVENTS, SEED_TODOS, SEED_TASKS, SEED_PACKING, SEED_SHOPPING
} from "./data.js";
import * as Sync from "./sync.js";

/* ============ state ============ */
var CLIENT=Math.random().toString(36).slice(2,10);
var LS="busan-tide-plan-v1";
var state=null, activeDay="d1", filterCat=null, query="", sel=null, sheetCtx=null;

/* 重整後維持在原本的分頁／日期／篩選(跟行程資料分開存,分享網址不會帶到這些)。 */
var UI_KEY="busan-tide-ui-v1";
function loadUiState(){
  try{ var raw=localStorage.getItem(UI_KEY); if(raw) return JSON.parse(raw); }catch(e){}
  return null;
}
function saveUiState(){
  try{
    localStorage.setItem(UI_KEY,JSON.stringify({view:currentView,day:activeDay,taskFilter:taskFilter,packFilter:packFilter,shopFilter:shopFilter}));
  }catch(e){}
}
var uiState=loadUiState();

function seed(){
  return {spots:JSON.parse(JSON.stringify(SEED_SPOTS)),
          events:JSON.parse(JSON.stringify(SEED_EVENTS)),
          todos:JSON.parse(JSON.stringify(SEED_TODOS)),
          tasks:JSON.parse(JSON.stringify(SEED_TASKS)),
          packing:JSON.parse(JSON.stringify(SEED_PACKING)),
          outfits:{},
          shopping:JSON.parse(JSON.stringify(SEED_SHOPPING)),
          rev:Date.now(),client:CLIENT};
}
function loadLocal(){
  try{ var raw=localStorage.getItem(LS); if(raw){var p=JSON.parse(raw); if(p&&p.spots&&p.events) return p;} }catch(e){}
  return null;
}
state=loadLocal()||seed();
if(!state.todos) state.todos=JSON.parse(JSON.stringify(SEED_TODOS));
if(!state.tasks) state.tasks=JSON.parse(JSON.stringify(SEED_TASKS));
if(!state.packing) state.packing=JSON.parse(JSON.stringify(SEED_PACKING));
if(!state.outfits||typeof state.outfits!=="object") state.outfits={};
if(!Array.isArray(state.shopping)) state.shopping=JSON.parse(JSON.stringify(SEED_SHOPPING));
if(uiState&&uiState.day&&DAYS.some(function(d){return d.id===uiState.day;})) activeDay=uiState.day;

/* ============ storage ============ */
var dot=document.getElementById("syncDot"), stxt=document.getElementById("syncText");
var viewingShared=false, myBackup=null;
function setSync(cls,txt){ dot.className="dot "+cls; stxt.textContent=txt; }

function persist(){
  if(viewingShared){ setSync("busy","正在看分享的行程,尚未存起來"); return; }
  state.rev=Date.now(); state.client=CLIENT;
  try{
    localStorage.setItem(LS,JSON.stringify(state));
    setSync("ok","已存 · "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}));
  }catch(e){
    setSync("","存不進瀏覽器(可能是無痕模式),建議先匯出備份");
  }
  Sync.notifyChange();          /* 有開雲端同步的話,1.5 秒後自動上傳 */
}
setSync("ok","自動存在這個瀏覽器");

/* 把雲端拉下來的一份行程換進來(sync.js 會呼叫)。回傳 false 代表格式不對。 */
function adoptState(p){
  if(!p||!Array.isArray(p.spots)||!Array.isArray(p.events)) return false;
  if(!Array.isArray(p.todos)) p.todos=[];
  if(!Array.isArray(p.tasks)) p.tasks=[];
  if(!Array.isArray(p.packing)) p.packing=[];
  if(!p.outfits||typeof p.outfits!=="object") p.outfits=state.outfits||{};
  if(!Array.isArray(p.shopping)) p.shopping=state.shopping||[];
  state=p; viewingShared=false; myBackup=null; hideBanner();
  try{ localStorage.setItem(LS,JSON.stringify(state)); }catch(e){}
  renderAll();
  return true;
}

/* ---- theme ---- */
var THEME_KEY="busan-tide-theme", themeModes=["system","light","dark"];
var themeNames={system:"系統",light:"淺色",dark:"深色"};

function applyTheme(m){
  if(m==="system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",m);
  document.getElementById("themeIcon").className="themedot "+m;
  document.getElementById("themeLabel").textContent=themeNames[m];
  try{ localStorage.setItem(THEME_KEY,m); }catch(e){}
}
var themeMode="system";
try{ var tm=localStorage.getItem(THEME_KEY); if(tm&&themeNames[tm]) themeMode=tm; }catch(e){}
applyTheme(themeMode);
document.getElementById("btnTheme").addEventListener("click",function(){
  themeMode=themeModes[(themeModes.indexOf(themeMode)+1)%3]; applyTheme(themeMode);
});

/* ---- export / import ---- */
function stamp(){
  var d=new Date(), z=function(n){return (n<10?"0":"")+n;};
  return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+"-"+z(d.getHours())+z(d.getMinutes());
}
document.getElementById("btnExport").addEventListener("click",function(){
  /* 穿搭照片不在 state 裡(另外存),匯出時一起包進去,備份才完整 */
  var out=JSON.parse(JSON.stringify(state)), pics={};
  Object.keys(state.outfits||{}).forEach(function(k){ if(photos[k]&&photos[k].img) pics[k]=photos[k].img; });
  if(Object.keys(pics).length) out.outfitPhotos=pics;
  var blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="busan-plan-"+stamp()+".json";
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },0);
  toast("已下載備份檔");
});
var fileIn=document.getElementById("fileIn");
document.getElementById("btnImport").addEventListener("click",function(){ fileIn.click(); });
fileIn.addEventListener("change",function(){
  var f=fileIn.files&&fileIn.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var p=JSON.parse(String(r.result));
      if(!p||!Array.isArray(p.spots)||!Array.isArray(p.events)) throw new Error("格式不符");
      if(!Array.isArray(p.todos)) p.todos=[];
      if(!Array.isArray(p.tasks)) p.tasks=[];
      if(!Array.isArray(p.packing)) p.packing=[];
      if(!p.outfits||typeof p.outfits!=="object") p.outfits=state.outfits||{};
      if(!Array.isArray(p.shopping)) p.shopping=state.shopping||[];
      if(p.outfitPhotos) importPhotos(p);
      state=p; viewingShared=false; hideBanner(); persist(); renderAll();
      toast("已匯入 "+p.spots.length+" 個景點、"+p.events.length+" 段行程");
    }catch(err){ toast("這個檔案讀不出來:"+err.message); }
    fileIn.value="";
  };
  r.readAsText(f);
});

/* ---- share link ---- */
function b64url(bytes){
  var s="",CH=0x8000;
  for(var i=0;i<bytes.length;i+=CH) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function unb64url(str){
  var s=str.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4) s+="=";
  var bin=atob(s), out=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function encodeState(obj){
  var bytes=new TextEncoder().encode(JSON.stringify(obj));
  if(typeof CompressionStream==="function"){
    var cs=new CompressionStream("gzip"), w=cs.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(cs.readable).arrayBuffer().then(function(buf){
      return "g"+b64url(new Uint8Array(buf));
    });
  }
  return Promise.resolve("r"+b64url(bytes));
}
function decodeState(code){
  var kind=code.charAt(0), bytes=unb64url(code.slice(1));
  if(kind==="g"){
    if(typeof DecompressionStream!=="function") return Promise.reject(new Error("這個瀏覽器不支援解壓縮"));
    var ds=new DecompressionStream("gzip"), w=ds.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(ds.readable).arrayBuffer().then(function(buf){
      return JSON.parse(new TextDecoder().decode(new Uint8Array(buf)));
    });
  }
  return Promise.resolve(JSON.parse(new TextDecoder().decode(bytes)));
}
document.getElementById("btnShare").addEventListener("click",function(){
  var shared=JSON.parse(JSON.stringify(state)); delete shared.outfits;   /* 照片不跟著分享網址走 */
  encodeState(shared).then(function(code){
    var url=location.origin+location.pathname+"#p="+code;
    if(url.length>60000){ toast("行程太大,分享網址塞不下,請改用「匯出」給檔案"); return; }
    var done=function(){ toast("分享網址已複製,長度 "+url.length+" 字元"); };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done,function(){ promptCopy(url); });
    } else promptCopy(url);
  }).catch(function(e){ toast("產生失敗:"+e.message); });
});
function promptCopy(url){
  var ta=document.createElement("textarea");
  ta.value=url; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); toast("分享網址已複製"); }
  catch(e){ toast("請手動複製網址列的內容"); location.hash="p="+url.split("#p=")[1]; }
  ta.remove();
}

/* ---- banner for a shared plan ---- */
var banner=document.getElementById("banner");
function showBanner(txt){ document.getElementById("bannerText").textContent=txt; banner.hidden=false; }
function hideBanner(){ banner.hidden=true; }
document.getElementById("bannerSave").addEventListener("click",function(){
  viewingShared=false; myBackup=null; hideBanner();
  history.replaceState(null,"",location.pathname+location.search);
  persist(); toast("已存成你自己的行程");
});
document.getElementById("bannerDrop").addEventListener("click",function(){
  if(myBackup) state=myBackup;
  viewingShared=false; myBackup=null; hideBanner();
  history.replaceState(null,"",location.pathname+location.search);
  renderAll(); setSync("ok","自動存在這個瀏覽器");
});
(function loadShared(){
  var h=location.hash||"";
  if(h.indexOf("#p=")!==0) return;
  decodeState(h.slice(3)).then(function(p){
    if(!p||!Array.isArray(p.spots)||!Array.isArray(p.events)) throw new Error("內容不完整");
    if(!Array.isArray(p.todos)) p.todos=[];
    if(!Array.isArray(p.tasks)) p.tasks=[];
    if(!Array.isArray(p.packing)) p.packing=[];
    p.outfits=state.outfits||{};
    if(!Array.isArray(p.shopping)) p.shopping=[];
    myBackup=state; state=p; viewingShared=true;
    showBanner("你正在看別人分享的行程,改動不會自動存起來。");
    setSync("busy","分享檢視");
    renderAll();
  }).catch(function(e){ toast("這個分享網址讀不出來:"+e.message); });
})();

/* ---- offline ---- */
if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}
// Service Worker temporarily disabled for cache clearing

/* ============ helpers ============ */
function $(id){ return document.getElementById(id); }
function el(tag,cls,txt){ var n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; }
function fmt(m){ m=Math.round(m); var h=Math.floor(m/60), mm=m%60; return (h<10?"0":"")+h+":"+(mm<10?"0":"")+mm; }
function snapMin(m){ return Math.round(m/SNAP)*SNAP; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function spotOf(id){ for(var i=0;i<state.spots.length;i++) if(state.spots[i].id===id) return state.spots[i]; return null; }
function evOf(id){ for(var i=0;i<state.events.length;i++) if(state.events[i].id===id) return state.events[i]; return null; }
function catVar(c){ return "var("+(CATS[c]?CATS[c].v:"--c-sight")+")"; }
function eventsOf(day){ return state.events.filter(function(e){return e.day===day;}); }
function uid(p){ return p+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function mapKind(url){
  if(!url) return null;
  var u=String(url).toLowerCase();
  if(u.indexOf("naver.")>-1||u.indexOf("naver.me")>-1) return "naver";
  if(u.indexOf("google.")>-1||u.indexOf("maps.app")>-1||u.indexOf("goo.gl")>-1) return "google";
  return "link";
}
function mapLabel(k){ return k==="naver"?"在 Naver 地圖開啟":k==="google"?"在 Google 地圖開啟":"開啟連結"; }

var statusEl=$("status"), statusTimer=null;
function toast(msg){
  statusEl.textContent=msg; statusEl.classList.add("show");
  clearTimeout(statusTimer); statusTimer=setTimeout(function(){statusEl.classList.remove("show");},2200);
}

/* ============ countdown ============ */
(function(){
  var target=new Date(2026,9,9), now=new Date();
  var d=Math.ceil((target-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
  $("countdown").textContent = d>0?("· 還有 "+d+" 天"):(d===0?"· 就是今天":"");
})();

/* ============ day selector (「行程表」檢視的下拉選單) ============ */
function renderDaySelect(){
  var sel=$("daySel"); sel.innerHTML="";
  DAYS.forEach(function(d){
    var n=eventsOf(d.id).length;
    var o=document.createElement("option"); o.value=d.id;
    o.textContent=d.date+"(週"+d.dow+") "+d.label+" ("+n+")";
    if(d.id===activeDay) o.selected=true;
    sel.appendChild(o);
  });
}

/* ============ grid ============ */
function buildGutter(){
  var g=$("gutter"); g.innerHTML=""; g.style.height=GRID_H+"px";
  for(var m=DAY_START;m<=DAY_END;m+=SNAP){
    var isHour=(m%60===0);
    var t=el("div","tick"+(isHour?" hour":""),fmt(m));
    t.style.top=((m-DAY_START)*PPM)+"px";
    g.appendChild(t);
  }
}
function layoutCols(list){
  var sorted=list.slice().sort(function(a,b){ return a.start-b.start||a.dur-b.dur; });
  var out={}, cluster=[], end=-1;
  function flush(){
    if(!cluster.length) return;
    var cols=[];
    cluster.forEach(function(e){
      var placed=false;
      for(var i=0;i<cols.length;i++){ if(cols[i]<=e.start){ cols[i]=e.start+e.dur; out[e.id]={c:i}; placed=true; break; } }
      if(!placed){ cols.push(e.start+e.dur); out[e.id]={c:cols.length-1}; }
    });
    cluster.forEach(function(e){ out[e.id].t=cols.length; });
    cluster=[]; end=-1;
  }
  sorted.forEach(function(e){
    if(cluster.length && e.start>=end) flush();
    cluster.push(e); end=Math.max(end,e.start+e.dur);
  });
  flush();
  return out;
}
function renderGrid(){
  var day=DAYS.filter(function(d){return d.id===activeDay;})[0];
  $("chartTitle").textContent=day.date+"(週"+day.dow+") "+day.label;
  $("chartSub").textContent="住宿:"+day.stay;
  var b=$("gridBody"); b.innerHTML=""; b.style.height=GRID_H+"px";
  buildGutter();

  for(var m=DAY_START;m<=DAY_END;m+=SNAP){
    var r=el("div","rule"+(m%60===0?" hour":""));
    r.style.top=((m-DAY_START)*PPM)+"px"; b.appendChild(r);
  }
  [[450,720,"morning"],[720,1020,"afternoon"],[1020,1320,"evening"]].forEach(function(z){
    var d=el("div","zone"); d.style.top=((z[0]-DAY_START)*PPM)+"px";
    d.style.height=((z[1]-z[0])*PPM)+"px"; d.appendChild(el("span",null,z[2])); b.appendChild(d);
  });

  var list=eventsOf(activeDay);
  if(!list.length){
    var h=el("div","empty-hint","這天還是空的。從右邊的景點櫃拖一個過來,或按景點卡上的「＋」。");
    b.appendChild(h);
  }
  var cols=layoutCols(list);
  list.forEach(function(e){ b.appendChild(evNode(e,cols[e.id])); });
}
function evNode(e,pos){
  var s=spotOf(e.spot);
  var name=s?s.name:(e.title||"未命名");
  var cat=s?s.cat:"sight";
  var n=el("div","ev"); n.dataset.ev=e.id;
  n.style.setProperty("--cat",catVar(cat));
  n.style.top=((e.start-DAY_START)*PPM)+"px";
  n.style.height=(e.dur*PPM-3)+"px";
  var t=pos?pos.t:1, c=pos?pos.c:0;
  n.style.left="calc("+(c*100/t)+"% + 6px)";
  n.style.width="calc("+(100/t)+"% - 12px)";
  if(e.dur<=45) n.classList.add("short");
  if(sel===e.id) n.classList.add("selected");
  if(drag&&drag.moved&&drag.id===e.id) n.classList.add("dragging");
  n.appendChild(el("div","ev__t",fmt(e.start)+"–"+fmt(e.start+e.dur)));
  n.appendChild(el("div","ev__n",name));
  /* 當日備註:每種長度都要看得到。短方塊(≤45 分)接在名稱後面單行省略;
     長一點的依高度給可用行數。滑鼠停著看得到全文。 */
  if(e.memo){
    var memo=el("div","ev__memo",e.memo);
    if(e.dur>45) memo.style.setProperty("-webkit-line-clamp",String(Math.max(1,Math.floor((e.dur*PPM-69)/16.5))));
    n.appendChild(memo);
    n.title=name+"\n"+e.memo;
  }
  var warn=(e.memo&&e.memo.indexOf("⚠")>-1)||(s&&s.notes&&s.notes.indexOf("⚠")>-1);
  if(warn) n.appendChild(el("div","ev__flag"));
  var grip=el("div","ev__grip"); n.appendChild(grip);
  grip.addEventListener("pointerdown",function(pe){ pe.stopPropagation(); beginDrag(pe,{mode:"resize",id:e.id}); });
  n.addEventListener("pointerdown",function(pe){ beginDrag(pe,{mode:"move",id:e.id}); });
  return n;
}

/* ============ library ============ */
function renderFilters(){
  var f=$("filters"); f.innerHTML="";
  CAT_ORDER.forEach(function(c){
    var b=el("button","filt",CATS[c].label);
    b.style.setProperty("--cat",catVar(c));
    b.setAttribute("aria-pressed", filterCat===c?"true":"false");
    b.addEventListener("click",function(){ filterCat = filterCat===c?null:c; renderFilters(); renderSpots(); });
    f.appendChild(b);
  });
}
function renderSpots(){
  var wrap=$("spots"); wrap.innerHTML="";
  var q=query.trim().toLowerCase();
  var list=state.spots.filter(function(s){
    if(filterCat&&s.cat!==filterCat) return false;
    if(!q) return true;
    return (s.name+" "+(s.ko||"")+" "+(s.notes||"")).toLowerCase().indexOf(q)>-1;
  });
  $("spotCount").textContent=state.spots.length;
  if(!list.length){ wrap.appendChild(el("div","none","沒有符合的景點。")); return; }
  list.forEach(function(s){
    var card=el("div","spot"); card.dataset.spot=s.id;
    card.style.setProperty("--cat",catVar(s.cat));
    var row=el("div","spot__row");
    var col=el("div","spot__n"); col.appendChild(document.createTextNode(s.name));
    if(s.ko) col.appendChild(el("div","spot__ko",s.ko));
    row.appendChild(col);
    var add=el("button","spot__add","＋"); add.title="加到 "+DAYS.filter(function(d){return d.id===activeDay;})[0].date;
    add.addEventListener("pointerdown",function(e){e.stopPropagation();});
    add.addEventListener("click",function(e){ e.stopPropagation(); quickAdd(s.id); });
    row.appendChild(add);
    card.appendChild(row);
    var tags=el("div","spot__tags");
    var p=el("span","pill",CATS[s.cat].label); p.style.setProperty("--cat",catVar(s.cat)); tags.appendChild(p);
    var used=state.events.filter(function(e){return e.spot===s.id;});
    if(used.length){
      var days=used.map(function(e){ return (DAYS.filter(function(d){return d.id===e.day;})[0]||{}).date; })
                   .filter(function(v,i,a){return a.indexOf(v)===i;});
      tags.appendChild(el("span","mini on","已排 "+days.join("、")));
    } else { tags.appendChild(el("span","mini","未排入")); }
    if(s.notes&&s.notes.indexOf("⚠")>-1) tags.appendChild(el("span","mini warn","待確認"));
    card.appendChild(tags);
    card.addEventListener("pointerdown",function(pe){ beginDrag(pe,{mode:"new",spot:s.id}); });
    wrap.appendChild(card);
  });
}
function quickAdd(spotId){
  var list=eventsOf(activeDay);
  var start=DAY_START+120;
  if(list.length){
    var last=list.reduce(function(a,b){ return (a.start+a.dur)>(b.start+b.dur)?a:b; });
    start=Math.min(last.start+last.dur, DAY_END-60);
  }
  addEvent(activeDay,spotId,snapMin(start),60);
  toast("已加到 "+DAYS.filter(function(d){return d.id===activeDay;})[0].date);
}
function addEvent(day,spotId,start,dur){
  var e={id:uid("e"),day:day,spot:spotId,start:clamp(start,DAY_START,DAY_END-30),dur:dur,memo:""};
  if(e.start+e.dur>DAY_END) e.dur=DAY_END-e.start;
  state.events.push(e); persist(); renderGrid(); renderDaySelect(); renderSpots();
  return e;
}

/* ============ todos ============ */
function renderChecklist(key,mountId,countId){
  var w=$(mountId); w.innerHTML="";
  var list=state[key]||[];
  var open=list.filter(function(t){return !t.done;}).length;
  $(countId).textContent=list.length?(open?open:"✓"):"";
  list.forEach(function(t){
    var row=el("div","todo"+(t.done?" done":""));
    var cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!t.done;
    cb.addEventListener("change",function(){ t.done=cb.checked; persist(); renderChecklist(key,mountId,countId); });
    row.appendChild(cb);
    var txt=el("div","todo__t",t.text); txt.contentEditable="true"; txt.spellcheck=false;
    txt.addEventListener("blur",function(){ t.text=txt.textContent.trim()||t.text; persist(); });
    row.appendChild(txt);
    var del=el("button","mini","✕"); del.style.marginLeft="auto"; del.title="刪除";
    del.addEventListener("click",function(){
      state[key]=list.filter(function(x){return x!==t;}); persist(); renderChecklist(key,mountId,countId);
    });
    row.appendChild(del);
    w.appendChild(row);
  });
}
function renderTodos(){ renderChecklist("todos","todos","todoCount"); }

/* 代辦／要帶都能指定給誰,而且兩個人可以同時指定(誰都要做的事)。
   who 存成陣列,如 ["lee","kiwi"];whoArr() 順便相容舊資料(單一字串)。 */
var PEOPLE=[{id:"lee",label:"Lee"},{id:"kiwi",label:"Kiwi"}];
function whoArr(t){
  if(Array.isArray(t.who)) return t.who.filter(function(id){return id==="lee"||id==="kiwi";});
  if(typeof t.who==="string" && t.who) return [t.who];
  return [];
}
function buildWhoPills(t,onChange){
  var who=el("div","who"); var arr=whoArr(t);
  PEOPLE.forEach(function(person){
    var on=arr.indexOf(person.id)!==-1;
    var btn=el("button","whobtn who--"+person.id+(on?" on":""),person.label);
    btn.type="button"; btn.title="指定給 "+person.label+"(兩人都要做就都點亮)";
    btn.addEventListener("click",function(){
      var cur=whoArr(t), idx=cur.indexOf(person.id);
      if(idx===-1) cur.push(person.id); else cur.splice(idx,1);
      t.who=cur; persist(); onChange();
    });
    who.appendChild(btn);
  });
  return who;
}

/* 代辦／要帶共用的「全部／Lee／Kiwi」篩選鈕列。 */
var WHO_FILTERS=[{id:"all",label:"全部",color:"var(--brine)"},{id:"lee",label:"Lee",color:"var(--c-play)"},{id:"kiwi",label:"Kiwi",color:"var(--c-stay)"}];
function renderWhoFilterBar(mountId,getVal,setVal,rerenderList){
  var w=$(mountId); w.innerHTML="";
  WHO_FILTERS.forEach(function(f){
    var b=el("button","filt",f.label); b.type="button";
    b.setAttribute("aria-pressed",getVal()===f.id?"true":"false");
    b.style.setProperty("--cat",f.color);
    b.addEventListener("click",function(){
      setVal(f.id); renderWhoFilterBar(mountId,getVal,setVal,rerenderList); rerenderList(); saveUiState();
    });
    w.appendChild(b);
  });
}

/* ============ tasks(代辦):卡片版,可貼網址、設 deadline、備註,還能依人篩選 ============ */
var taskFilter=(uiState&&(uiState.taskFilter==="lee"||uiState.taskFilter==="kiwi"))?uiState.taskFilter:"all";
function renderTaskFilter(){
  renderWhoFilterBar("taskWhoFilter",function(){return taskFilter;},function(v){taskFilter=v;},renderTasks);
}
function deadlineInfo(dstr){
  if(!dstr) return {text:"",warn:false};
  var target=new Date(dstr+"T00:00:00");
  if(isNaN(target.getTime())) return {text:"",warn:false};
  var now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var d=Math.round((target-today)/86400000);
  if(d>0) return {text:"還有 "+d+" 天",warn:d<=3};
  if(d===0) return {text:"就是今天",warn:true};
  return {text:"已過期 "+(-d)+" 天",warn:true};
}
function renderTasks(){
  var w=$("tasks"); w.innerHTML="";
  var list=state.tasks||[];
  var open=list.filter(function(t){return !t.done;}).length;
  $("taskCount").textContent=list.length?(open?open:"✓"):"";
  var shown=taskFilter==="all"?list:list.filter(function(t){return whoArr(t).indexOf(taskFilter)!==-1;});
  if(!shown.length){ w.appendChild(el("div","none",list.length?"這個人目前沒有代辦":"目前沒有代辦")); return; }
  shown.forEach(function(t){
    var card=el("div","taskcard"+(t.done?" done":""));

    var top=el("div","taskcard__top");
    var cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!t.done;
    cb.addEventListener("change",function(){ t.done=cb.checked; persist(); renderTasks(); });
    top.appendChild(cb);
    var name=el("div","taskcard__name",t.text); name.contentEditable="true"; name.spellcheck=false;
    name.addEventListener("blur",function(){ t.text=name.textContent.trim()||t.text; persist(); });
    top.appendChild(name);
    var del=el("button","mini","✕"); del.title="刪除";
    del.addEventListener("click",function(){ state.tasks=state.tasks.filter(function(x){return x!==t;}); persist(); renderTasks(); });
    top.appendChild(del);
    card.appendChild(top);

    var urlRow=el("div","taskcard__row");
    urlRow.appendChild(el("label","taskcard__lbl","網址"));
    var urlWrap=el("div","taskcard__urlwrap");
    var urlInput=document.createElement("input"); urlInput.type="url"; urlInput.placeholder="貼上網址…";
    urlInput.value=t.url||"";
    urlInput.addEventListener("change",function(){ t.url=urlInput.value.trim(); persist(); renderTasks(); });
    urlWrap.appendChild(urlInput);
    if(t.url){
      var go=document.createElement("a"); go.className="taskcard__go"; go.href=t.url;
      go.target="_blank"; go.rel="noopener"; go.title="開啟連結"; go.textContent="↗";
      urlWrap.appendChild(go);
    }
    urlRow.appendChild(urlWrap);
    card.appendChild(urlRow);

    var splitRow=el("div","taskcard__row taskcard__row--split");
    var ddWrap=el("div","taskcard__deadline");
    ddWrap.appendChild(el("label","taskcard__lbl","期限"));
    var ddRow=el("div","taskcard__ddrow");
    var ddInput=document.createElement("input"); ddInput.type="date"; ddInput.value=t.deadline||"";
    ddInput.addEventListener("change",function(){ t.deadline=ddInput.value; persist(); renderTasks(); });
    ddRow.appendChild(ddInput);
    var info=deadlineInfo(t.deadline);
    if(info.text) ddRow.appendChild(el("span","taskcard__dd"+(info.warn?" warn":""),info.text));
    ddWrap.appendChild(ddRow);
    splitRow.appendChild(ddWrap);

    splitRow.appendChild(buildWhoPills(t,renderTasks));
    card.appendChild(splitRow);

    var noteRow=el("div","taskcard__row");
    noteRow.appendChild(el("label","taskcard__lbl","備註"));
    var note=el("div","taskcard__note"); note.contentEditable="true"; note.spellcheck=false;
    note.setAttribute("data-ph","加一點備註…"); note.textContent=t.note||"";
    note.addEventListener("blur",function(){ t.note=note.textContent.trim(); persist(); });
    noteRow.appendChild(note);
    card.appendChild(noteRow);

    w.appendChild(card);
  });
}

/* ============ packing(要帶):卡片版,依名稱自動猜一個對應的 icon ============ */
var PACK_ICON_RULES=[
  [/護照|簽證|證件照|入境|海關|台胞證|身分證|駕照/,"🛂"],
  [/現金|信用卡|提款卡|韓元|韓幣|零錢|旅支/,"💳"],
  [/錢包|皮夾|零錢包/,"👛"],
  [/T-?money|交通卡|一卡通|地鐵|捷運卡|悠遊卡/i,"🚇"],
  [/延長線|轉接頭|轉接|插座|插頭|萬國/,"🔌"],
  [/充電器|充電線|傳輸線|充電頭|usb|USB/,"🔌"],
  [/行動電源|行充|電池/,"🔋"],
  [/藥|ok繃|OK繃|暈車|腸胃|感冒|止痛|過敏|胃散|退燒|防蚊/i,"💊"],
  [/口罩/,"😷"],
  [/暖暖包/,"♨️"],
  [/防曬|保養|乳液|面膜|修護|化妝|粉底|口紅|護唇|護手/,"🧴"],
  [/隱形眼鏡|眼藥水|保養液/,"👁️"],
  [/帽子|帽/,"🧢"],
  [/圍巾|手套/,"🧣"],
  [/泳衣|泳褲|外套|衣服|上衣|褲|襪|內衣|內褲|睡衣|發熱衣|羽絨|保暖/,"👕"],
  [/鞋|拖鞋|涼鞋/,"👟"],
  [/雨具|雨傘|雨衣|折傘|摺傘/,"☂️"],
  [/化妝包|盥洗包/,"💄"],
  [/後背包|背包|斜背包|側背包|手提包|書包|包包|腰包|小包/,"🎒"],
  [/行李箱|行李|登機箱|托運|旅行箱/,"🧳"],
  [/購物袋|環保袋|袋子|提袋/,"🛍️"],
  [/相機|自拍棒|腳架|底片|gopro/i,"📷"],
  [/耳機|airpods|耳塞/i,"🎧"],
  [/墨鏡|太陽眼鏡|眼鏡/,"🕶️"],
  [/毛巾|盥洗|牙刷|牙膏|洗面乳|洗髮|沐浴|刮鬍|棉花棒|指甲刀/,"🧼"],
  [/濕紙巾|衛生紙|面紙|衛生棉/,"🧻"],
  [/水瓶|水壺|保溫瓶|保溫杯/,"💧"],
  [/零食|餅乾|泡麵|咖啡|茶包|巧克力/,"🍫"],
  [/筆電|平板|ipad|電腦|滑鼠/i,"💻"],
  [/耳溫槍|體溫計/,"🌡️"],
  [/頸枕|眼罩/,"🛌"],
  [/鑰匙|鎖/,"🔑"],
  [/筆|記事本|便條/,"🖊️"],
  [/書|雜誌/,"📖"],
  [/手錶/,"⌚"],
  [/文件|資料|列印|訂房|機票|保單|訂單|行程表/,"📄"],
  [/手機|行動網路|esim|eSIM|wifi|WiFi|SIM|漫遊|網路卡/,"📶"]
];
function guessPackIcon(text){
  text=text||"";
  for(var i=0;i<PACK_ICON_RULES.length;i++){ if(PACK_ICON_RULES[i][0].test(text)) return PACK_ICON_RULES[i][1]; }
  return "🧳";
}
var packFilter=(uiState&&(uiState.packFilter==="lee"||uiState.packFilter==="kiwi"))?uiState.packFilter:"all";
function renderPackFilter(){
  renderWhoFilterBar("packWhoFilter",function(){return packFilter;},function(v){packFilter=v;},renderPacking);
}
function renderPacking(){
  var w=$("packing"); w.innerHTML="";
  var list=state.packing||[];
  var open=list.filter(function(t){return !t.done;}).length;
  $("packCount").textContent=list.length?(open?open:"✓"):"";
  var shown=packFilter==="all"?list:list.filter(function(t){return whoArr(t).indexOf(packFilter)!==-1;});
  if(!shown.length){ w.appendChild(el("div","none",list.length?"這個人目前沒有要帶的東西":"目前沒有要帶的東西")); return; }
  shown.forEach(function(t){
    var card=el("div","packcard"+(t.done?" done":""));

    var top=el("div","packcard__top");
    var icon=el("span","packcard__icon",guessPackIcon(t.text));
    top.appendChild(icon);
    var cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!t.done;
    cb.addEventListener("change",function(){ t.done=cb.checked; persist(); renderPacking(); });
    top.appendChild(cb);
    var name=el("div","packcard__name",t.text); name.contentEditable="true"; name.spellcheck=false;
    name.addEventListener("input",function(){ icon.textContent=guessPackIcon(name.textContent); });
    name.addEventListener("blur",function(){ t.text=name.textContent.trim()||t.text; persist(); renderPacking(); });
    top.appendChild(name);
    var del=el("button","mini","✕"); del.title="刪除";
    del.addEventListener("click",function(){ state.packing=state.packing.filter(function(x){return x!==t;}); persist(); renderPacking(); });
    top.appendChild(del);
    card.appendChild(top);

    card.appendChild(buildWhoPills(t,renderPacking));
    w.appendChild(card);
  });
}

/* ============ shopping(逛街):依地區分類,每家店有店名／網址／備註 ============
   state.shopping=[{id,name,shops:[{id,name,url,note}]}]。
   打字時只改資料、不重畫(重畫會讓游標跑掉);新增／刪除／搬分類才整個重畫。 */
var shopFilter=(uiState&&typeof uiState.shopFilter==="string")?uiState.shopFilter:"all";
function areaOf(id){ for(var i=0;i<state.shopping.length;i++) if(state.shopping[i].id===id) return state.shopping[i]; return null; }
/* 只讓 http(s) 變成連結;沒寫開頭的(例如 naver.me/xxx)自動補 https:// */
function cleanUrl(v){
  v=(v||"").trim();
  if(v&&!/^[a-z][a-z0-9+.-]*:/i.test(v)) v="https://"+v;
  return v;
}
function isWebUrl(v){ return /^https?:\/\//i.test(v||""); }
/* 刪除鈕:按第一次變成確認字樣,3 秒內再按才真的刪 */
function armedButton(cls,label,armedLabel,onConfirm){
  var b=el("button",cls,label), armed=false; b.type="button";
  b.addEventListener("click",function(){
    if(!armed){ armed=true; b.textContent=armedLabel; b.classList.add("armed");
      setTimeout(function(){ armed=false; b.textContent=label; b.classList.remove("armed"); },3000); return; }
    onConfirm();
  });
  return b;
}

function renderShopFilter(){
  var w=$("shopAreaFilter"); w.innerHTML="";
  if(shopFilter!=="all"&&!areaOf(shopFilter)) shopFilter="all";
  [{id:"all",name:"全部"}].concat(state.shopping).forEach(function(a){
    var b=el("button","filt",a.name||"未命名"); b.type="button";
    b.setAttribute("aria-pressed",shopFilter===a.id?"true":"false");
    if(a.shops&&a.shops.length) b.appendChild(el("u",null,String(a.shops.length)));
    b.addEventListener("click",function(){ shopFilter=a.id; renderShopping(); saveUiState(); });
    w.appendChild(b);
  });
}
function renderShopping(){
  renderShopFilter();
  var total=0; state.shopping.forEach(function(a){ total+=a.shops.length; });
  $("shopCount").textContent=total?String(total):"";
  var w=$("shopAreas"); w.innerHTML="";
  if(!state.shopping.length){ w.appendChild(el("div","none","還沒有分類,按下面的「＋ 新增分類」開始")); return; }
  state.shopping.forEach(function(a){
    if(shopFilter==="all"||shopFilter===a.id) w.appendChild(shopAreaNode(a));
  });
}
function shopAreaNode(a){
  var sec=el("section","shoparea");
  var head=el("div","shoparea__head");
  var name=document.createElement("input"); name.className="shoparea__name";
  name.value=a.name||""; name.placeholder="分類名稱,例如:海雲台"; name.setAttribute("aria-label","分類名稱");
  name.addEventListener("input",function(){ a.name=name.value; persist(); });
  name.addEventListener("change",function(){ a.name=name.value.trim(); persist(); renderShopFilter(); });
  head.appendChild(name);
  head.appendChild(el("span","shoparea__n",a.shops.length+" 家"));
  head.appendChild(armedButton("mini shoparea__del","刪除分類",
    a.shops.length?("再按一次(連同 "+a.shops.length+" 家店)"):"再按一次確認",
    function(){
      state.shopping=state.shopping.filter(function(x){ return x!==a; });
      persist(); renderShopping(); toast("已刪除分類");
    }));
  sec.appendChild(head);

  var grid=el("div","shopgrid");
  if(!a.shops.length) grid.appendChild(el("div","shopgrid__none","這區還沒有店家"));
  a.shops.forEach(function(s){ grid.appendChild(shopCard(a,s)); });
  sec.appendChild(grid);

  var add=el("button","btn shoparea__add","＋ 新增店家"); add.type="button";
  add.addEventListener("click",function(){
    var s={id:uid("shop"),name:"",url:"",note:""};
    a.shops.push(s); editingShop=s.id; persist(); renderShopping();
    var n=document.querySelector('[data-shop="'+s.id+'"] .shopcard__name'); if(n) n.focus();
  });
  sec.appendChild(add);
  return sec;
}
/* 店家卡片平常是一個小方框:只有店名(點了開地圖)跟備註。
   按右上角 ✎ 才展開成編輯表單;一次只會有一張在編輯。 */
var editingShop=null;
function shopHref(s){
  if(isWebUrl(s.url)) return s.url;
  return s.name?("https://map.naver.com/p/search/"+encodeURIComponent(s.name)):null;   /* 沒貼網址 → 用店名搜 Naver 地圖 */
}
function shopCard(a,s){
  return editingShop===s.id ? shopEditor(a,s) : shopBox(a,s);
}
function shopBox(a,s){
  var card=el("div","shopcard shopcard--box"); card.dataset.shop=s.id;
  var head=el("div","shopcard__head");
  var href=shopHref(s);
  var name;
  if(href){
    name=document.createElement("a"); name.href=href; name.target="_blank"; name.rel="noopener noreferrer";
    name.title=isWebUrl(s.url)?"開啟連結":"在 Naver 地圖搜尋這家店";
  } else name=el("span");
  name.className="shopcard__link";
  name.appendChild(el("span",null,s.name||"未命名店家"));
  if(href) name.appendChild(el("i",null,"↗"));
  head.appendChild(name);
  var edit=el("button","shopcard__edit","✎"); edit.type="button"; edit.title="編輯"; edit.setAttribute("aria-label","編輯 "+(s.name||"店家"));
  edit.addEventListener("click",function(){
    editingShop=s.id; renderShopping();
    var n=document.querySelector('[data-shop="'+s.id+'"] .shopcard__name'); if(n) n.focus();
  });
  head.appendChild(edit);
  card.appendChild(head);
  if(s.note) card.appendChild(el("div","shopcard__text",s.note));
  return card;
}
function shopEditor(a,s){
  var card=el("div","shopcard shopcard--edit"); card.dataset.shop=s.id;

  var name=document.createElement("input"); name.className="shopcard__name";
  name.value=s.name||""; name.placeholder="店名"; name.setAttribute("aria-label","店名");
  name.addEventListener("input",function(){ s.name=name.value; persist(); });
  card.appendChild(name);

  var urlRow=el("div","shopcard__row");
  urlRow.appendChild(el("label","taskcard__lbl","網址(選填,沒填就用店名搜 Naver 地圖)"));
  var url=document.createElement("input"); url.type="url"; url.className="shopcard__url";
  url.value=s.url||""; url.placeholder="貼上 Naver 地圖網址";
  url.addEventListener("change",function(){ s.url=cleanUrl(url.value); url.value=s.url; persist(); });
  urlRow.appendChild(url);
  card.appendChild(urlRow);

  var noteRow=el("div","shopcard__row");
  noteRow.appendChild(el("label","taskcard__lbl","備註"));
  var note=document.createElement("textarea"); note.className="shopcard__note";
  note.value=s.note||""; note.placeholder="賣什麼、想買的東西、營業時間…";
  note.addEventListener("input",function(){ s.note=note.value; persist(); });
  noteRow.appendChild(note);
  card.appendChild(noteRow);

  function finish(){
    s.name=name.value.trim(); s.url=cleanUrl(url.value); s.note=note.value.trim();
    if(!s.name&&!s.url&&!s.note) a.shops=a.shops.filter(function(x){ return x!==s; });   /* 什麼都沒填就當沒新增 */
    editingShop=null; persist(); renderShopping();
  }
  [name,url].forEach(function(inp){
    inp.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.isComposing){ e.preventDefault(); finish(); } });
  });

  var foot=el("div","shopcard__foot");
  var move=document.createElement("select"); move.setAttribute("aria-label","移到其他分類");
  state.shopping.forEach(function(x){
    var o=document.createElement("option"); o.value=x.id; o.textContent=x.name||"未命名";
    if(x===a) o.selected=true; move.appendChild(o);
  });
  move.addEventListener("change",function(){
    var to=areaOf(move.value); if(!to||to===a) return;
    a.shops=a.shops.filter(function(x){ return x!==s; }); to.shops.push(s);
    persist(); renderShopping(); toast("已移到「"+(to.name||"未命名")+"」");
  });
  foot.appendChild(move);
  foot.appendChild(armedButton("mini shopcard__del","刪除","再按一次",function(){
    a.shops=a.shops.filter(function(x){ return x!==s; }); editingShop=null; persist(); renderShopping();
  }));
  var done=el("button","btn btn--go shopcard__done","完成"); done.type="button";
  done.addEventListener("click",finish);
  foot.appendChild(done);
  card.appendChild(foot);
  return card;
}
$("addArea").addEventListener("click",function(){
  var a={id:uid("area"),name:"",shops:[]};
  state.shopping.push(a); shopFilter="all"; persist(); renderShopping(); saveUiState();
  var n=document.querySelector("#shopAreas .shoparea:last-child .shoparea__name"); if(n) n.focus();
});

/* ============ outfit(穿搭):一天一頁,左邊女生、右邊男生 ============
   照片很大,不放進 state(不然每次同步、每 20 秒輪詢都要整包搬):
   · 照片本體存在 localStorage 的 PHOTO_LS,雲端則是每張各自一筆(Sync.saveBlob)
   · state.outfits 只記 {"d1~f": rev},別台看到 rev 跟自己的不同才去抓
   · 上傳前先縮到長邊 960px 的 JPEG,一張大約 100KB */
var PHOTO_LS="busan-tide-photos-v1";
var OUTFIT_SIDES=[{k:"f",label:"女生",slot:"outfitF"},{k:"m",label:"男生",slot:"outfitM"}];
var photos=loadPhotos();        /* {"d1~f":{rev, img, up}};up = 已上傳到哪組同步碼 */
var photoBusy={}, photoRetry={}, outfitTarget=null;

function loadPhotos(){
  try{ var raw=localStorage.getItem(PHOTO_LS); if(raw){ var p=JSON.parse(raw); if(p&&typeof p==="object") return p; } }catch(e){}
  return {};
}
function savePhotos(){
  try{ localStorage.setItem(PHOTO_LS,JSON.stringify(photos)); return true; }
  catch(e){ toast("這台瀏覽器的空間滿了,照片沒存進去"); return false; }
}
function photoKey(day,side){ return day+"~"+side; }
function blobName(k){ return "outfit~"+k; }
function isImgData(s){ return typeof s==="string"&&s.indexOf("data:image/")===0; }

function shrinkImage(file){
  return new Promise(function(resolve,reject){
    if(file.type&&file.type.indexOf("image/")!==0){ reject(new Error("請選一張圖片")); return; }
    var url=URL.createObjectURL(file), img=new Image();
    img.onload=function(){
      var MAX=960, w=img.naturalWidth, h=img.naturalHeight, k=Math.min(1,MAX/Math.max(w,h));
      var c=document.createElement("canvas");
      c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k));
      var g=c.getContext("2d");
      g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height);
      g.drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",0.76));
    };
    img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error("這張圖讀不出來,換一張試試")); };
    img.src=url;
  });
}

/* 本機有、但還沒傳到目前這組同步碼的照片 → 補傳(離線時失敗的也會在這裡補) */
function flushPhotos(){
  var key=Sync.blobKey(); if(!key||viewingShared) return;
  Object.keys(state.outfits).forEach(function(k){
    var ph=photos[k];
    if(!ph||!ph.img||ph.rev!==state.outfits[k]||ph.up===key||photoBusy[k]) return;
    photoBusy[k]=true;
    Sync.saveBlob(blobName(k),{rev:ph.rev,img:ph.img}).then(function(){
      if(photos[k]&&photos[k].rev===ph.rev){ photos[k].up=key; savePhotos(); }
    }).catch(function(){}).then(function(){ photoBusy[k]=false; });
  });
}
/* state.outfits 說有新照片、本機卻還沒有 → 去雲端抓 */
function fetchPhotos(){
  if(!Sync.blobKey()||viewingShared) return;
  var now=Date.now();
  Object.keys(state.outfits).forEach(function(k){
    var rev=state.outfits[k], ph=photos[k];
    if(ph&&ph.rev===rev) return;
    if(photoBusy[k]||(photoRetry[k]&&now-photoRetry[k]<15000)) return;
    photoBusy[k]=true;
    Sync.loadBlob(blobName(k)).then(function(d){
      if(d&&isImgData(d.img)&&d.rev===state.outfits[k]){
        photos[k]={rev:d.rev,img:d.img,up:Sync.blobKey()}; savePhotos(); renderOutfit();
      } else photoRetry[k]=Date.now();      /* 別台可能還在上傳,等一下再試 */
    }).catch(function(){ photoRetry[k]=Date.now(); }).then(function(){ photoBusy[k]=false; });
  });
}
/* 照片已經從行程裡移除(或在別台被刪掉)→ 本機那份也清掉,省空間 */
function prunePhotos(){
  if(viewingShared) return;
  var changed=false;
  Object.keys(photos).forEach(function(k){ if(!state.outfits[k]){ delete photos[k]; changed=true; } });
  if(changed) savePhotos();
}
function importPhotos(p){
  var pics=p.outfitPhotos; delete p.outfitPhotos;
  Object.keys(pics).forEach(function(k){
    if(!isImgData(pics[k])) return;
    var rev=p.outfits[k]||Date.now(); p.outfits[k]=rev;
    photos[k]={rev:rev,img:pics[k],up:null};
  });
  savePhotos();
}

function pickPhoto(dayId,side){
  if(viewingShared){ toast("正在看分享的行程,先存成你的行程再上傳照片"); return; }
  outfitTarget={day:dayId,side:side};
  $("outfitFile").click();
}
$("outfitFile").addEventListener("change",function(){
  var input=$("outfitFile"), f=input.files&&input.files[0], target=outfitTarget;
  input.value=""; outfitTarget=null;
  if(!f||!target) return;
  toast("照片處理中…");
  shrinkImage(f).then(function(img){
    var k=photoKey(target.day,target.side), rev=Date.now(), prev=photos[k];
    photos[k]={rev:rev,img:img,up:null};
    if(!savePhotos()){ if(prev) photos[k]=prev; else delete photos[k]; return; }
    state.outfits[k]=rev; persist(); renderOutfit(); flushPhotos();
    toast(Sync.blobKey()?"已存,會同步到其他裝置":"已存在這台裝置");
  }).catch(function(err){ toast(err.message); });
});
function removePhoto(k){
  delete state.outfits[k]; delete photos[k]; savePhotos(); persist(); renderOutfit();
  if(Sync.blobKey()) Sync.saveBlob(blobName(k),{rev:Date.now(),img:null}).catch(function(){});
  toast("已移除照片");
}

function openLightbox(src,alt){
  var box=el("div","lightbox"), img=document.createElement("img");
  img.src=src; img.alt=alt; box.appendChild(img);
  var x=el("button","x","✕"); x.setAttribute("aria-label","關閉"); box.appendChild(x);
  function close(){ box.remove(); document.removeEventListener("keydown",onKey); }
  function onKey(e){ if(e.key==="Escape") close(); }
  box.addEventListener("click",close);
  document.addEventListener("keydown",onKey);
  document.body.appendChild(box);
}

function paintSlot(box,day,side){
  box.innerHTML=""; box.className="outfit__slot outfit__slot--"+side.k;
  var k=photoKey(day.id,side.k), rev=state.outfits[k], ph=photos[k];
  box.appendChild(el("div","outfit__who",side.label));
  var frame=el("button","outfit__frame"); frame.type="button";
  if(rev&&ph&&ph.rev===rev&&isImgData(ph.img)){
    var img=document.createElement("img"); img.src=ph.img; img.alt=day.date+" "+side.label+"穿搭";
    frame.appendChild(img); frame.title="點一下放大";
    frame.addEventListener("click",function(){ openLightbox(ph.img,img.alt); });
  } else {
    frame.classList.add("is-empty");
    if(rev){
      frame.appendChild(el("span","outfit__ph",Sync.blobKey()?"照片同步中…":"照片在別台裝置,開「同步」才看得到"));
    } else {
      frame.appendChild(el("span","outfit__plus","＋"));
      frame.appendChild(el("span","outfit__ph","上傳"+side.label+"穿搭"));
    }
    frame.addEventListener("click",function(){ pickPhoto(day.id,side.k); });
  }
  box.appendChild(frame);
  if(rev){
    var acts=el("div","outfit__acts");
    var re=el("button","btn","換一張"); re.type="button";
    re.addEventListener("click",function(){ pickPhoto(day.id,side.k); });
    var del=el("button","btn btn--warn","移除"); del.type="button";
    var armed=false;
    del.addEventListener("click",function(){
      if(!armed){ armed=true; del.textContent="再按一次"; setTimeout(function(){armed=false;del.textContent="移除";},3000); return; }
      removePhoto(k);
    });
    acts.appendChild(re); acts.appendChild(del);
    box.appendChild(acts);
  }
}
function dayIndex(id){ for(var i=0;i<DAYS.length;i++) if(DAYS[i].id===id) return i; return 0; }
function hasOutfit(dayId){ return !!(state.outfits[photoKey(dayId,"f")]||state.outfits[photoKey(dayId,"m")]); }
function renderOutfit(){
  var i=dayIndex(activeDay), day=DAYS[i];
  $("outfitDate").textContent=day.date+"(週"+day.dow+")";
  $("outfitLabel").textContent=day.label;

  var ul=$("outfitPlaces"), seen={}; ul.innerHTML="";
  eventsOf(day.id).slice().sort(function(a,b){ return a.start-b.start; }).forEach(function(e){
    var s=spotOf(e.spot), name=s?s.name:(e.title||"");
    if(!name||seen[name]) return; seen[name]=true;
    var li=el("li","outfit__place",name); li.style.setProperty("--cat",catVar(s?s.cat:"sight"));
    ul.appendChild(li);
  });
  if(!ul.children.length) ul.appendChild(el("li","outfit__place outfit__place--none","這天還沒排行程"));

  OUTFIT_SIDES.forEach(function(side){ paintSlot($(side.slot),day,side); });
  $("outfitPrev").disabled=(i===0);
  $("outfitNext").disabled=(i===DAYS.length-1);

  var dots=$("outfitDots"); dots.innerHTML="";
  DAYS.forEach(function(d,j){
    var b=el("button","outfit__dot"+(j===i?" on":"")+(hasOutfit(d.id)?" has":""),d.date);
    b.type="button"; b.setAttribute("role","tab"); b.setAttribute("aria-selected",j===i?"true":"false");
    b.title=d.date+"(週"+d.dow+") "+d.label;
    b.addEventListener("click",function(){ gotoOutfitDay(d.id); });
    dots.appendChild(b);
  });

  $("outfitSub").textContent="左邊女生、右邊男生 · 點空格上傳照片 · "+
    (Sync.blobKey()?"照片會同步到其他裝置":"照片只存在這台,開「同步」才會共用");
  var n=DAYS.filter(function(d){ return hasOutfit(d.id); }).length;
  $("outfitCount").textContent=n?(n+"/"+DAYS.length):"";

  prunePhotos(); fetchPhotos(); flushPhotos();
}
function gotoOutfitDay(id){
  activeDay=id;
  renderOutfit(); renderDaySelect(); renderGrid(); renderSpots(); saveUiState();
}
$("outfitPrev").addEventListener("click",function(){ var i=dayIndex(activeDay); if(i>0) gotoOutfitDay(DAYS[i-1].id); });
$("outfitNext").addEventListener("click",function(){ var i=dayIndex(activeDay); if(i<DAYS.length-1) gotoOutfitDay(DAYS[i+1].id); });
document.addEventListener("keydown",function(e){
  if(currentView!=="outfit"||sheetCtx||document.querySelector(".lightbox")) return;
  var t=e.target; if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT"||t.isContentEditable)) return;
  if(e.key==="ArrowLeft") $("outfitPrev").click();
  else if(e.key==="ArrowRight") $("outfitNext").click();
});
/* 照片補傳／補抓:網路回來、切回視窗,以及每 20 秒順手檢查一次(沒事要做就不會發請求) */
function syncPhotos(){ if(!document.hidden){ flushPhotos(); fetchPhotos(); } }
window.addEventListener("online",syncPhotos);
window.addEventListener("focus",syncPhotos);
setInterval(syncPhotos,20000);

/* ============ drag ============ */
var drag=null, ghost=null, preview=null, rafId=null, lastDragEnd=0;
var gridBody=$("gridBody"), scroller=$("scroller");

function beginDrag(pe,spec){
  if(pe.pointerType==="mouse"&&pe.button!==0) return;
  if(pe.pointerType==="mouse") pe.preventDefault();
  try{ var g=window.getSelection(); if(g&&g.removeAllRanges) g.removeAllRanges(); }catch(err){}
  drag={mode:spec.mode,id:spec.id,spot:spec.spot,x0:pe.clientX,y0:pe.clientY,moved:false,dayTarget:null};
  if(spec.mode==="move"||spec.mode==="resize"){
    var e=evOf(spec.id); if(!e){drag=null;return;}
    drag.e=e; drag.origStart=e.start; drag.origDur=e.dur;
    drag.grab=minutesAt(pe.clientY)-e.start;
  }
  document.addEventListener("pointermove",onMove);
  document.addEventListener("pointerup",onUp);
  document.addEventListener("pointercancel",onUp);
}
function minutesAt(y){
  var r=gridBody.getBoundingClientRect();
  return DAY_START+(y-r.top)/PPM;
}
function inGrid(x,y){
  var r=gridBody.getBoundingClientRect();
  return x>=r.left-20&&x<=r.right+20&&y>=r.top-40&&y<=r.bottom+40;
}
function onMove(pe){
  if(!drag) return;
  if(!drag.moved){
    if(Math.abs(pe.clientX-drag.x0)<4&&Math.abs(pe.clientY-drag.y0)<4) return;
    drag.moved=true;
    if(drag.mode==="new"){
      var s=spotOf(drag.spot);
      ghost=el("div","ghost",s?s.name:"項目");
      ghost.style.setProperty("--cat",catVar(s?s.cat:"sight"));
      document.body.appendChild(ghost);
      var card=document.querySelector('[data-spot="'+drag.spot+'"]');
      if(card) card.classList.add("dragging");
    } else {
      var node=document.querySelector('[data-ev="'+drag.id+'"]');
      if(node) node.classList.add("dragging");
    }
  }
  pe.preventDefault();
  if(ghost){ ghost.style.left=pe.clientX+"px"; ghost.style.top=(pe.clientY-22)+"px"; }

  var chip=null;
  var under=document.elementFromPoint(pe.clientX,pe.clientY);
  if(under&&under.closest) chip=under.closest("[data-day]");
  document.querySelectorAll(".daychip.dropping").forEach(function(n){n.classList.remove("dropping");});
  drag.dayTarget=null;
  if(chip&&chip.dataset.day!==activeDay){ chip.classList.add("dropping"); drag.dayTarget=chip.dataset.day; }

  autoScroll(pe.clientY);

  if(drag.mode==="resize"){
    var d=snapMin(minutesAt(pe.clientY)-drag.e.start);
    drag.e.dur=clamp(d,SNAP,DAY_END-drag.e.start);
    renderGridLive();
  } else if(drag.mode==="move"){
    var st=snapMin(minutesAt(pe.clientY)-drag.grab);
    drag.e.start=clamp(st,DAY_START,DAY_END-drag.e.dur);
    renderGridLive();
  } else if(drag.mode==="new"){
    if(!drag.dayTarget&&inGrid(pe.clientX,pe.clientY)){
      var s2=snapMin(minutesAt(pe.clientY)-30);
      s2=clamp(s2,DAY_START,DAY_END-60);
      showPreview(s2,60);
    } else hidePreview();
  }
}
function renderGridLive(){
  if(rafId) return;
  rafId=requestAnimationFrame(function(){ rafId=null; renderGrid(); });
}
function showPreview(start,dur){
  if(!preview){ preview=el("div","preview"); gridBody.appendChild(preview); }
  if(!preview.parentNode) gridBody.appendChild(preview);
  preview.style.top=((start-DAY_START)*PPM)+"px";
  preview.style.height=(dur*PPM-3)+"px";
  preview.style.left="6px"; preview.style.right="6px";
  preview.innerHTML="";
  var s=spotOf(drag.spot);
  var b=el("b",null,s?s.name:""); var i=el("i",null,fmt(start)+"–"+fmt(start+dur));
  preview.appendChild(b); preview.appendChild(i);
  preview.dataset.start=start;
}
function hidePreview(){ if(preview&&preview.parentNode) preview.parentNode.removeChild(preview); }
function autoScroll(y){
  var r=scroller.getBoundingClientRect();
  if(y<r.top+56) scroller.scrollTop-=10;
  else if(y>r.bottom-56) scroller.scrollTop+=10;
}
function onUp(pe){
  document.removeEventListener("pointermove",onMove);
  document.removeEventListener("pointerup",onUp);
  document.removeEventListener("pointercancel",onUp);
  document.querySelectorAll(".daychip.dropping").forEach(function(n){n.classList.remove("dropping");});
  document.querySelectorAll(".dragging").forEach(function(n){n.classList.remove("dragging");});
  if(ghost&&ghost.parentNode){ ghost.parentNode.removeChild(ghost); } ghost=null;
  if(!drag){ return; }
  var d=drag;
  if(d.moved) lastDragEnd=Date.now();

  if(!d.moved){
    drag=null; hidePreview();
    if(d.mode==="new") openSpotSheet(d.spot);
    else { sel=d.id; openEventSheet(d.id); renderGrid(); }
    return;
  }

  if(d.mode==="new"){
    var start=preview?parseInt(preview.dataset.start,10):null;
    hidePreview();
    if(d.dayTarget){
      var tmp=activeDay; activeDay=d.dayTarget;
      quickAdd(d.spot); activeDay=tmp; renderDaySelect(); renderGrid(); renderSpots();
      toast("已加到 "+DAYS.filter(function(x){return x.id===d.dayTarget;})[0].date);
    } else if(start!=null&&!isNaN(start)){
      addEvent(activeDay,d.spot,start,60);
    }
  } else {
    hidePreview();
    if(d.dayTarget&&d.mode==="move"){
      d.e.day=d.dayTarget;
      toast("已移到 "+DAYS.filter(function(x){return x.id===d.dayTarget;})[0].date);
    }
    persist(); renderDaySelect(); renderGrid(); renderSpots();
  }
  drag=null;
}

/* click empty grid → new custom entry */
gridBody.addEventListener("click",function(e){
  if(e.target!==gridBody) return;
  if(Date.now()-lastDragEnd<350) return;
  var m=snapMin(minutesAt(e.clientY)-30);
  openNewSheet(clamp(m,DAY_START,DAY_END-60));
});

/* ============ sheet ============ */
var sheet=$("sheet"), scrim=$("scrim");
function closeSheet(){
  sheet.classList.remove("open"); scrim.classList.remove("open");
  sheet.setAttribute("aria-hidden","true"); sheetCtx=null;
  if(sel){ sel=null; renderGrid(); }
}
scrim.addEventListener("click",closeSheet);
document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeSheet(); });

function timeOptions(sel,from,to,step,fmtFn){
  var s=document.createElement("select");
  for(var v=from;v<=to;v+=step){
    var o=document.createElement("option"); o.value=v; o.textContent=fmtFn(v);
    if(v===sel) o.selected=true; s.appendChild(o);
  }
  return s;
}
function field(label,node){
  var f=el("div","fld"); var l=el("label",null,label); f.appendChild(l); f.appendChild(node); return f;
}
function mapButton(url){
  var k=mapKind(url); if(!k) return null;
  var a=document.createElement("a"); a.className="maplink "+k; a.href=url;
  a.target="_blank"; a.rel="noopener noreferrer";
  a.appendChild(el("span",null,mapLabel(k)));
  a.appendChild(el("small",null,k==="naver"?"NAVER":k==="google"?"GOOGLE":"WEB"));
  return a;
}
function openSheet(){
  sheet.classList.add("open"); scrim.classList.add("open"); sheet.setAttribute("aria-hidden","false");
}

function spotEditor(s,onChange){
  var frag=document.createDocumentFragment();
  var name=document.createElement("input"); name.value=s.name;
  name.addEventListener("input",function(){ s.name=name.value; onChange(); });
  frag.appendChild(field("名稱",name));

  var ko=document.createElement("input"); ko.value=s.ko||""; ko.placeholder="韓文名(選填,方便給司機看)";
  ko.addEventListener("input",function(){ s.ko=ko.value; onChange(); });
  frag.appendChild(field("韓文",ko));

  var cat=document.createElement("select");
  CAT_ORDER.forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=CATS[c].label;
    if(s.cat===c)o.selected=true; cat.appendChild(o); });
  cat.addEventListener("change",function(){ s.cat=cat.value; onChange(); refreshSheetAccent(s.cat); });
  frag.appendChild(field("分類",cat));

  var url=document.createElement("input"); url.value=s.url||"";
  url.placeholder="貼 Naver 地圖網址";
  var url2=document.createElement("input"); url2.value=s.url2||"";
  url2.placeholder="貼 Google 地圖網址(選填)";
  var linkSlot=el("div");
  function paintLink(){
    linkSlot.innerHTML="";
    var b1=mapButton(s.url); if(b1) linkSlot.appendChild(b1);
    var b2=mapButton(s.url2); if(b2) linkSlot.appendChild(b2);
    if(!b1&&!b2) linkSlot.appendChild(el("div","mini","尚未加入網址"));
  }
  url.addEventListener("input",function(){ s.url=url.value.trim(); onChange(); paintLink(); });
  url2.addEventListener("input",function(){ s.url2=url2.value.trim(); onChange(); paintLink(); });
  frag.appendChild(field("Naver 地圖網址",url));
  frag.appendChild(field("Google 地圖網址",url2));
  paintLink();
  frag.appendChild(linkSlot);

  var notes=document.createElement("textarea"); notes.value=s.notes||"";
  notes.placeholder="營業時間、訂位方式、必點、注意事項…";
  notes.addEventListener("input",function(){ s.notes=notes.value; onChange(); });
  frag.appendChild(field("備註",notes));
  return frag;
}
function refreshSheetAccent(cat){
  var h=sheet.querySelector(".sheet__head"); if(h) h.style.setProperty("--cat",catVar(cat));
}

function openEventSheet(id){
  var e=evOf(id); if(!e) return;
  var s=spotOf(e.spot);
  sheetCtx={kind:"event",id:id};
  sheet.innerHTML="";
  var head=el("div","sheet__head"); head.style.setProperty("--cat",catVar(s?s.cat:"sight"));
  var eyebrow=el("div","sheet__eyebrow");
  var day=DAYS.filter(function(d){return d.id===e.day;})[0];
  eyebrow.appendChild(el("span","mini",day.date+"(週"+day.dow+")"));
  var p=el("span","pill",s?CATS[s.cat].label:"行程"); p.style.setProperty("--cat",catVar(s?s.cat:"sight"));
  eyebrow.appendChild(p);
  eyebrow.appendChild(el("span","mini",fmt(e.start)+"–"+fmt(e.start+e.dur)));
  head.appendChild(eyebrow);
  head.appendChild(el("div","sheet__title",s?s.name:"行程"));
  if(s&&s.ko) head.appendChild(el("div","sheet__ko",s.ko));
  var x=el("button","x","✕"); x.addEventListener("click",closeSheet); head.appendChild(x);
  sheet.appendChild(head);

  var body=el("div","sheet__body");
  var times=el("div","times");
  var st=timeOptions(e.start,DAY_START,DAY_END-SNAP,SNAP,fmt);
  var du=timeOptions(e.dur,SNAP,480,SNAP,function(v){
    return v<60 ? (v+" 分") : (Math.floor(v/60)+" 小時"+(v%60?" 30 分":"")); });
  st.addEventListener("change",function(){ e.start=clamp(+st.value,DAY_START,DAY_END-e.dur); persist(); renderGrid(); openEventSheet(id); });
  du.addEventListener("change",function(){ e.dur=clamp(+du.value,SNAP,DAY_END-e.start); persist(); renderGrid(); openEventSheet(id); });
  times.appendChild(field("開始",st)); times.appendChild(field("長度",du));
  body.appendChild(times);

  var dsel=document.createElement("select");
  DAYS.forEach(function(d){ var o=document.createElement("option"); o.value=d.id;
    o.textContent=d.date+"(週"+d.dow+") "+d.label; if(d.id===e.day)o.selected=true; dsel.appendChild(o); });
  dsel.addEventListener("change",function(){ e.day=dsel.value; activeDay=e.day; persist(); renderAll(); openEventSheet(id); });
  body.appendChild(field("哪一天",dsel));

  var memo=document.createElement("textarea"); memo.value=e.memo||"";
  memo.placeholder="這一天的臨時備註,例如「先抽號」「訂窗邊位」";
  memo.style.minHeight="64px";
  memo.addEventListener("input",function(){ e.memo=memo.value; persist(); renderGridLive(); });
  body.appendChild(field("當日備註",memo));

  if(s){
    body.appendChild(el("div","divider","景點資料"));
    body.appendChild(spotEditor(s,function(){ persist(); renderGridLive(); renderSpots(); }));
  }
  sheet.appendChild(body);

  var foot=el("div","sheet__foot");
  var dup=el("button","btn","複製一份");
  dup.addEventListener("click",function(){
    var n=addEvent(e.day,e.spot,Math.min(e.start+e.dur,DAY_END-30),e.dur); n.memo=e.memo; persist(); renderGrid();
    toast("已複製");
  });
  var del=el("button","btn btn--warn","從行程移除");
  var armed=false;
  del.addEventListener("click",function(){
    if(!armed){ armed=true; del.textContent="再按一次確認刪除"; setTimeout(function(){armed=false;del.textContent="從行程移除";},3000); return; }
    state.events=state.events.filter(function(x){return x.id!==id;});
    persist(); closeSheet(); renderAll(); toast("已移除");
  });
  foot.appendChild(dup); foot.appendChild(del);
  sheet.appendChild(foot);
  openSheet();
}

function openSpotSheet(spotId){
  var s=spotOf(spotId); if(!s) return;
  sheetCtx={kind:"spot",id:spotId};
  sheet.innerHTML="";
  var head=el("div","sheet__head"); head.style.setProperty("--cat",catVar(s.cat));
  var eyebrow=el("div","sheet__eyebrow");
  var p=el("span","pill",CATS[s.cat].label); p.style.setProperty("--cat",catVar(s.cat));
  eyebrow.appendChild(p);
  var used=state.events.filter(function(e){return e.spot===s.id;});
  eyebrow.appendChild(el("span","mini",used.length?("已排入 "+used.length+" 個時段"):"尚未排入行程"));
  head.appendChild(eyebrow);
  head.appendChild(el("div","sheet__title",s.name));
  if(s.ko) head.appendChild(el("div","sheet__ko",s.ko));
  var x=el("button","x","✕"); x.addEventListener("click",closeSheet); head.appendChild(x);
  sheet.appendChild(head);

  var body=el("div","sheet__body");
  body.appendChild(spotEditor(s,function(){ persist(); renderSpots(); renderGridLive(); }));
  sheet.appendChild(body);

  var foot=el("div","sheet__foot");
  var addb=el("button","btn btn--go","加到 "+DAYS.filter(function(d){return d.id===activeDay;})[0].date);
  addb.addEventListener("click",function(){ quickAdd(s.id); closeSheet(); });
  var del=el("button","btn btn--warn","刪除景點");
  var armed=false;
  del.addEventListener("click",function(){
    if(!armed){ armed=true; del.textContent="再按一次確認"; setTimeout(function(){armed=false;del.textContent="刪除景點";},3000); return; }
    state.spots=state.spots.filter(function(x){return x.id!==s.id;});
    state.events=state.events.filter(function(e){return e.spot!==s.id;});
    persist(); closeSheet(); renderAll(); toast("已刪除景點與相關行程");
  });
  foot.appendChild(addb); foot.appendChild(del);
  sheet.appendChild(foot);
  openSheet();
}

function openNewSheet(start){
  var s={id:uid("s"),name:"",ko:"",cat:"sight",url:"",url2:"",notes:""};
  sheet.innerHTML="";
  var head=el("div","sheet__head"); head.style.setProperty("--cat",catVar("sight"));
  head.appendChild(el("div","sheet__eyebrow")).appendChild(el("span","mini","新增景點"));
  head.appendChild(el("div","sheet__title","新的景點"));
  var x=el("button","x","✕"); x.addEventListener("click",closeSheet); head.appendChild(x);
  sheet.appendChild(head);
  var body=el("div","sheet__body");
  body.appendChild(spotEditor(s,function(){ refreshSheetAccent(s.cat); }));
  sheet.appendChild(body);
  var foot=el("div","sheet__foot");
  var save=el("button","btn","只存進景點櫃");
  var saveAdd=el("button","btn btn--go", start!=null?("存並排在 "+fmt(start)):"存並加到今天");
  function commit(){
    if(!s.name.trim()){ toast("先給它一個名字"); return false; }
    state.spots.unshift(s); return true;
  }
  save.addEventListener("click",function(){ if(commit()){ persist(); closeSheet(); renderAll(); toast("已存進景點櫃"); } });
  saveAdd.addEventListener("click",function(){
    if(!commit()) return;
    addEvent(activeDay,s.id,start!=null?start:DAY_START+120,60);
    closeSheet(); renderAll(); toast("已排入行程");
  });
  foot.appendChild(save); foot.appendChild(saveAdd);
  sheet.appendChild(foot);
  openSheet();
}

/* ============ wiring ============ */
$("search").addEventListener("input",function(e){ query=e.target.value; renderSpots(); });
$("addSpot").addEventListener("click",function(){ openNewSheet(null); });
$("addTodo").addEventListener("click",function(){
  state.todos.push({id:uid("t"),text:"新的待辦事項",done:false}); persist(); renderTodos();
});
$("addTask").addEventListener("click",function(){
  state.tasks.push({id:uid("k"),text:"新的代辦事項",done:false,who:[],url:"",deadline:"",note:""});
  persist(); renderTasks();
});
$("addPack").addEventListener("click",function(){
  state.packing.push({id:uid("p"),text:"要帶的東西",done:false,who:[]}); persist(); renderPacking();
});
var resetArmed=false;
$("resetAll").addEventListener("click",function(){
  var b=$("resetAll");
  if(!resetArmed){ resetArmed=true; b.textContent="再按一次:會清掉你的所有調整";
    setTimeout(function(){resetArmed=false;b.textContent="回復預設行程";},4000); return; }
  /* 穿搭照片、逛街清單都是自己填的,不算「預設行程」,回復時保留 */
  var keepOutfits=state.outfits||{}, keepShopping=state.shopping;
  state=seed(); state.outfits=keepOutfits; if(Array.isArray(keepShopping)) state.shopping=keepShopping; viewingShared=false; hideBanner(); persist(); renderAll(); b.textContent="回復預設行程"; resetArmed=false; toast("已回復預設");
});
$("daySel").addEventListener("change",function(){
  activeDay=$("daySel").value;
  /* 在待確認/代辦/要帶時挑日期,直接跳回那天的行程表;在穿搭就留在穿搭換那天 */
  if(currentView!=="itin"&&currentView!=="outfit") switchView("itin");
  renderGrid(); renderSpots(); renderOutfit(); scrollToDay(); saveUiState();
});

/* 主檢視切換:行程表 / 待確認 / 代辦 / 要帶 / 穿搭 / 逛街。景點櫃固定在右側,不受切換影響。
   日期選單四個檢視都留著,分頁按鈕的位置才不會跳來跳去。 */
var currentView="itin";
var VIEWS=[
  {k:"itin",tab:"viewItin",panel:"panelItin"},
  {k:"todos",tab:"viewTodos",panel:"panelTodos"},
  {k:"tasks",tab:"viewTasks",panel:"panelTasks"},
  {k:"packing",tab:"viewPacking",panel:"panelPacking"},
  {k:"outfit",tab:"viewOutfit",panel:"panelOutfit"},
  {k:"shop",tab:"viewShop",panel:"panelShop"}
];
VIEWS.forEach(function(v){
  $(v.tab).addEventListener("click",function(){ switchView(v.k); });
});
function switchView(which){
  currentView=which;
  VIEWS.forEach(function(v){
    var on=v.k===which;
    $(v.tab).setAttribute("aria-selected",on?"true":"false");
    $(v.panel).hidden=!on;
  });
  $("daySel").classList.toggle("is-idle", which!=="itin"&&which!=="outfit");
  if(which==="outfit") renderOutfit();
  saveUiState();
}

function renderAll(){ renderDaySelect(); renderGrid(); renderFilters(); renderSpots(); renderTodos(); renderTaskFilter(); renderTasks(); renderPackFilter(); renderPacking(); renderOutfit(); renderShopping(); }
function scrollToDay(){
  var list=eventsOf(activeDay), anchor=540;
  if(list.length) anchor=list.reduce(function(a,b){ return a.start<b.start?a:b; }).start;
  scroller.scrollTop=Math.max(0,(anchor-DAY_START)*PPM-46);
}
/* 重整後回到原本那個分頁(行程表/待確認/代辦/要帶);沒存過或值不對就照舊預設行程表。 */
var initialView=(uiState&&VIEWS.some(function(v){return v.k===uiState.view;}))?uiState.view:"itin";
renderAll(); switchView(initialView); scrollToDay();

/* ============ 跨裝置同步 ============ */
document.getElementById("btnSync").addEventListener("click",function(){ Sync.openPanel(); });
Sync.init({
  getState:   function(){ return viewingShared ? null : state; },
  applyState: adoptState,
  setStatus:  setSync,
  toast:      toast,
  onConnect:  renderOutfit      /* 同步一接上就補傳／補抓穿搭照片 */
});
