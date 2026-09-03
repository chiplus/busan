/* ============================================================
   data.js — 行程資料與版面參數(你平常會改的「model」)
   ------------------------------------------------------------
   · DAY_START / DAY_END … 時間軸每天的起訖(分鐘)、格線間距、每分鐘像素
   · CATS / CAT_ORDER … 分類與顏色
   · DAYS … 每一天(日期、星期、標題、住宿)
   · SEED_SPOTS … 景點櫃預設清單
   · SEED_EVENTS … 預設排入時間軸的行程(用 ev() 產生)
   · SEED_TODOS … 「待確認」清單    · SEED_TASKS … 「代辦」清單
   · SEED_PACKING … 「要帶」清單
   改完存檔、重新整理即可。使用者若已在瀏覽器存過自己的版本,
   要按側欄「回復預設行程」才會吃到新的預設值。
   ============================================================ */

/* ============ constants ============ */
var DAY_START=450, DAY_END=1320, SNAP=30, PPM=1.5;
var GRID_H=(DAY_END-DAY_START)*PPM;

var CATS={
  food:{label:"美食",v:"--c-food"}, sight:{label:"景點",v:"--c-sight"},
  play:{label:"體驗",v:"--c-play"}, beauty:{label:"美容",v:"--c-beauty"},
  shop:{label:"購物",v:"--c-shop"}, move:{label:"交通",v:"--c-move"},
  stay:{label:"住宿",v:"--c-stay"}
};
var CAT_ORDER=["food","sight","play","beauty","shop","move","stay"];

var DAYS=[
 {id:"d1",date:"10/09",dow:"五",label:"抵達日",stay:"Ramada Encore 海雲台"},
 {id:"d2",date:"10/10",dow:"六",label:"廣安里全制霸",stay:"Ramada Encore 海雲台"},
 {id:"d3",date:"10/11",dow:"日",label:"東海岸 · 換宿",stay:"Gemstay 西面"},
 {id:"d4",date:"10/12",dow:"一",label:"西南線",stay:"Gemstay 西面"},
 {id:"d5",date:"10/13",dow:"二",label:"彈性日",stay:"Gemstay 西面"},
 {id:"d6",date:"10/14",dow:"三",label:"醫美 · 返程",stay:"—"}
];

function nv(q){ return "https://map.naver.com/p/search/"+encodeURIComponent(q); }
function gg(q){ return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q); }

var SEED_SPOTS=[
 {id:"ramada",name:"Ramada Encore 海雲台",ko:"라마다 앙코르 해운대",cat:"stay",url:nv("라마다 앙코르 해운대"),
  notes:"10/9–10/11 兩晚。10/11 上午退房,行李可寄放櫃檯。"},
 {id:"gemstay",name:"Gemstay 西面",ko:"젬스테이 서면",cat:"stay",url:nv("젬스테이 서면"),
  notes:"10/11–10/14 三晚。10/11 下午 check-in。"},
 {id:"pus",name:"金海國際機場",ko:"김해국제공항",cat:"move",url:gg("Gimhae International Airport"),
  notes:"去程 10/9 19:55 抵達。回程 10/14 20:00 起飛,西面出發約 30–40 分。"},
 {id:"haeundae_mkt",name:"海雲台市場",ko:"해운대시장",cat:"food",url:nv("해운대시장"),
  notes:"宵夜首選。豬肉湯飯與市場小吃,抵達當晚可直接殺過去。"},
 {id:"allsunday",name:"All Sunday 貝果 廣安里店",ko:"올선데이 광안",cat:"food",url:nv("올선데이 광안리"),
  notes:"28 Gwangan-ro 61beon-gil, Suyeong-gu。約 11:00–21:30(來源略有出入,出發前再確認)。\n不開放訂位,開店前就有人排,建議提早 15–20 分卡位。\n招牌是鬆軟貝果配自製抹醬,推薦加購 cream cheese、藍莓。對面就是廣安里海灘,窗邊可以邊看海邊吃。"},
 {id:"lafeuille",name:"La feuille 海景咖啡廳",ko:"라 푀유",cat:"food",url:nv("라푀유 광안리"),
  notes:"All Sunday 走路約 11 分鐘的備案。"},
 {id:"noir_seomyeon",name:"Noir 髮廊 西面本店",ko:"누아르헤어 서면",cat:"beauty",url:nv("누아르헤어 서면"),
  notes:"對外國觀光客知名的美髮沙龍,本店在西面。燙髮抓 4 小時。"},
 {id:"noir_gwangalli",name:"Noir 髮廊 廣安里店",ko:"누아르헤어 광안리",cat:"beauty",url:nv("누아르헤어 광안리"),
  notes:"⚠ 待確認:是否真有分店、是否有燙髮設計師駐店、是否為海景座位。需私訊 IG 或查 Naver。"},
 {id:"gwangalli",name:"廣安里海水浴場",ko:"광안리해수욕장",cat:"sight",url:nv("광안리해수욕장"),
  notes:"無人機秀觀賞地。沙灘任何位置皆可看,以廣安大橋為背景。"},
 {id:"drone",name:"M 無人機燈光秀",ko:"광안리 M 드론라이트쇼",cat:"play",
  url:"https://www.instagram.com/gwangallidroneshow.official/",
  notes:"每週六演出。10 月屬冬季時刻表 → 19:00 與 21:00 兩場,每場超過 12 分鐘,免費觀賞。\n偶有天候取消,出發前看官網或 IG @gwangallidroneshow.official 公告。"},
 {id:"capsule",name:"膠囊列車 尾浦站",ko:"해운대 블루라인파크 미포정거장",cat:"play",url:nv("해운대 블루라인파크 미포정거장"),
  notes:"尾浦→青沙浦方向才是靠海外側。4 人包廂制,需提前預約,官網韓文介面,也可透過 KKday／Klook 代訂。\n⚠ 目標 10/11 09:00–09:30 場次,約 2–3 週後開搶。備案 10/10 早場。\n回程可搭下層海岸列車(自由座、免預約)。"},
 {id:"cheongsapo",name:"青沙浦踏石觀景台",ko:"청사포 다릿돌전망대",cat:"sight",url:nv("청사포 다릿돌전망대"),
  notes:"玻璃棧道觀景台,旁邊就是紅白雙燈塔。看完搭海岸列車回尾浦。"},
 {id:"kalguksu",name:"31cm 海鮮刀削麵",ko:"31cm 해물칼국수",cat:"food",url:nv("31cm 해운대"),
  notes:"海雲台人氣名店,避開正午尖峰。"},
 {id:"haeundae",name:"海雲台海水浴場",ko:"해운대해수욕장",cat:"sight",url:nv("해운대해수욕장"),notes:""},
 {id:"dongbaek",name:"冬柏島",ko:"동백섬",cat:"sight",url:nv("동백섬"),
  notes:"海雲台西側海濱散步道,繞一圈約 1 小時,可看廣安大橋。"},
 {id:"luge",name:"Skyline Luge 斜坡滑車",ko:"스카이라인 루지 부산",cat:"play",url:gg("Skyline Luge Busan"),
  notes:"機張 Osiria 觀光園區,海雲台搭東海線約 20 分。玩 3–5 趟約需 2 小時。\n鄰近樂天世界釜山與樂天 Outlet,可以一起排。"},
 {id:"lotte_outlet",name:"樂天 Outlet 東釜山店",ko:"롯데아울렛 동부산점",cat:"shop",url:nv("롯데아울렛 동부산점"),
  notes:"緊鄰 Skyline Luge,Osiria 那天可順道。"},
 {id:"gamcheon",name:"甘川洞文化村",ko:"감천문화마을",cat:"sight",url:gg("Gamcheon Culture Village"),
  notes:"沙下區山坡彩色房屋群,看「房子」為主,逛 2.5–3 小時。\n必去:天空之脊觀景台、小王子與沙漠狐狸雕像(建議先排隊)、韓服租借。\n西面出發搭 1 號線到土城站約 35–45 分;海雲台出發約 1 小時 10–20 分。"},
 {id:"flipbook",name:"翻書動畫工作室",ko:"플립북 애니메이션",cat:"play",url:nv("감천문화마을 플립북"),
  notes:"甘川洞文化村內。⚠ 是否需預約尚待查證。"},
 {id:"huinnyeoul",name:"白淺灘文化村(影島)",ko:"흰여울문화마을",cat:"sight",url:nv("흰여울문화마을"),
  notes:"看「海」為主,海崖邊小巷,規模小,1–1.5 小時走完。必去海岸隧道、海崖散步道、海景咖啡廳。\n目前列為低優先。"},
 {id:"aircruise",name:"松島海上纜車",ko:"부산에어크루즈",cat:"play",url:nv("부산에어크루즈"),
  notes:"西南邊,可選水晶透明車廂。鄰近甘川洞、南浦洞。"},
 {id:"jagalchi",name:"札嘎其市場",ko:"자갈치시장",cat:"food",url:nv("자갈치시장"),notes:""},
 {id:"gwangbok",name:"南浦洞光復路",ko:"광복로",cat:"shop",url:nv("광복로"),notes:"逛街與晚餐一次解決。"},
 {id:"busantower",name:"釜山塔",ko:"부산타워",cat:"sight",url:nv("부산타워"),
  notes:"龍頭山公園內。南浦洞夜景備案,與荒嶺山二選一。"},
 {id:"hwangnyeong",name:"荒嶺山瞭望台",ko:"황령산 전망쉼터",cat:"sight",url:nv("황령산 전망쉼터"),
  notes:"南區大淵洞,西面與廣安里之間的山上。360 度俯瞰全釜山夜景:廣安大橋、海雲台高樓、市區燈海。\n無地鐵直達,建議搭計程車上山,西面出發約 15–20 分鐘。"},
 {id:"haechi",name:"83獬豸 西面店",ko:"83해치 서면점",cat:"food",url:nv("83해치 서면점"),
  notes:"烤肉。不能提前訂位,只能用 CATCH TABLE 現場抽號候位,出門前先抽。\n西面店約 15:30 開始營業。另有廣安里、東萊、沙上店。"},
 {id:"jeonpo",name:"田浦咖啡街",ko:"전포카페거리",cat:"shop",url:nv("전포카페거리"),
  notes:"西面旁,咖啡廳與小店密集,彈性日採買好去處。"},
 {id:"medical",name:"西面醫療街",ko:"서면 메디컬스트리트",cat:"beauty",url:nv("서면 메디컬스트리트"),
  notes:"西面站周邊診所密集。⚠ 需提前預約(LINE／IG／官網)。\n挑當天可飛的輕療程:雷射淨膚、水光針、音波拉提;避開填充／埋線等腫脹恢復期長的項目。"},
 {id:"seaview_dinner",name:"廣安里海景晚餐(待選)",ko:"광안리 오션뷰 레스토랑",cat:"food",url:nv("광안리 오션뷰 레스토랑"),
  notes:"⚠ 尚未選定。10/10 是無人機秀日,窗邊位很搶手,建議提前訂位。"}
];

function ev(day,spot,start,dur,memo){
  return {id:"e_"+day+"_"+start+"_"+spot,day:day,spot:spot,start:start,dur:dur,memo:memo||""};
}
var SEED_EVENTS=[
 ev("d1","pus",1200,30,"19:55 落地,通關、領行李"),
 ev("d1","ramada",1230,60,"約 21:30 check-in"),
 ev("d1","haeundae_mkt",1290,30,"宵夜,豬肉湯飯"),

 ev("d2","allsunday",630,90,"10:40 排隊卡位,11:00 開吃"),
 ev("d2","noir_gwangalli",750,240,"燙髮抓 4 小時。若確認無海景/不可行 → 改西面本店"),
 ev("d2","gwangalli",1020,60,"新髮型沙灘拍照"),
 ev("d2","seaview_dinner",1080,120,"⚠ 待訂位,無人機秀日窗邊位搶手"),
 ev("d2","gwangalli",1200,60,"20:00 沙灘卡位"),
 ev("d2","drone",1260,30,"21:00 場 + 廣安大橋夜景"),

 ev("d3","ramada",510,30,"退房,行李寄放櫃檯"),
 ev("d3","capsule",540,30,"⚠ 尾浦→青沙浦,靠海側,需搶票"),
 ev("d3","cheongsapo",570,90,"紅白燈塔、踏石觀景台,搭海岸列車回尾浦"),
 ev("d3","kalguksu",720,60,""),
 ev("d3","haeundae",810,90,"海灘 + 冬柏島散步"),
 ev("d3","gemstay",900,60,"取行李 → 移動西面 → check-in"),
 ev("d3","haechi",1080,120,"出門前先用 CATCH TABLE 抽號"),

 ev("d4","gamcheon",570,180,"含翻書動畫工作室"),
 ev("d4","jagalchi",780,60,"南浦洞／札嘎其午餐"),
 ev("d4","aircruise",870,90,""),
 ev("d4","gwangbok",990,120,"逛街"),
 ev("d4","busantower",1200,60,"可選,夜景與荒嶺山二選一"),

 ev("d5","jeonpo",960,120,"西面、田浦逛街採買"),
 ev("d5","haechi",1080,90,"西面晚餐(可換別家)"),
 ev("d5","hwangnyeong",1170,90,"19:30 計程車上山"),
 ev("d5","gemstay",1260,30,"下山回住處"),

 ev("d6","gemstay",570,30,"退房,行李寄放"),
 ev("d6","medical",630,150,"⚠ 需提前預約"),
 ev("d6","jeonpo",810,60,"午餐、取行李"),
 ev("d6","pus",1020,120,"17:00 出發 → 報到、免稅"),
 ev("d6","pus",1200,60,"20:00 起飛")
];

var SEED_TODOS=[
 {id:"t1",text:"Noir 廣安里店:是否真有分店、是否有燙髮設計師駐店、是否為海景座位(私訊 IG／查 Naver)",done:false},
 {id:"t2",text:"膠囊列車:搶 10/11 09:00–09:30 尾浦→青沙浦(約 2–3 週後開賣),備案 10/10 早場",done:false},
 {id:"t3",text:"廣安里海景晚餐餐廳:選定並訂窗邊位(10/10 無人機秀日)",done:false},
 {id:"t4",text:"醫美診所:選定項目與診所,預約 10/14 上午時段",done:false},
 {id:"t5",text:"83獬豸:當天用 CATCH TABLE 抽號,無法提前訂位",done:false},
 {id:"t6",text:"翻書動畫工作室(甘川洞):是否需預約",done:false}
];

/* 代辦除了 text/done,還有 who(指定給誰的陣列,如 ["lee"]、["lee","kiwi"]、兩人都不填就 []、
   兩人都要做就兩個都放進去)、url(要貼的網址,方便大家不用重複找)、
   deadline(YYYY-MM-DD,可留空)、note(備註)。 */
var SEED_TASKS=[
 {id:"k1",text:"換韓元,或確認海外提款卡/信用卡預借額度",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k2",text:"手機上網:訂 eSIM 或租 WiFi 機",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k3",text:"下載 App:Naver Map、KakaoMap、Papago、Kakao T(叫車)",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k4",text:"確認 K-ETA / 入境檢疫申報(Q-code)最新規定",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k5",text:"到機場後買交通卡(Cashbee／T-money)並儲值現金",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k6",text:"訂機場↔海雲台交通(利木津巴士或計程車)",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k7",text:"投保旅平險,並把保單、訂房確認拍照存手機",done:false,who:[],url:"",deadline:"",note:""},
 {id:"k8",text:"用右上「分享網址」把行程傳一份給家人",done:false,who:[],url:"",deadline:"",note:""}
];

/* 要帶的 icon 是依 text 內容自動猜的(見 app.js guessPackIcon),這裡不用存。
   who 跟代辦一樣是陣列,兩人都要帶可以同時指定 ["lee","kiwi"]。 */
var SEED_PACKING=[
 {id:"p1",text:"護照 + 影本、證件照 2 張",done:false,who:[]},
 {id:"p2",text:"信用卡(海外回饋)+ 少量現金",done:false,who:[]},
 {id:"p3",text:"韓國插座轉接頭(220V,C/F 型)",done:false,who:[]},
 {id:"p4",text:"行動電源(手提行李,不能託運)",done:false,who:[]},
 {id:"p5",text:"常備藥、腸胃藥、暈車藥、OK 繃",done:false,who:[]},
 {id:"p6",text:"保養／防曬,醫美後修護用品分裝",done:false,who:[]},
 {id:"p7",text:"泳衣、薄外套(海邊風大、日夜溫差)",done:false,who:[]},
 {id:"p8",text:"好走的鞋(甘川洞、冬柏島、荒嶺山都有坡)",done:false,who:[]},
 {id:"p9",text:"環保購物袋、輕便雨具",done:false,who:[]}
];

export {
  DAY_START, DAY_END, SNAP, PPM, GRID_H, CATS, CAT_ORDER, DAYS, SEED_SPOTS, SEED_EVENTS, SEED_TODOS, SEED_TASKS, SEED_PACKING
};
