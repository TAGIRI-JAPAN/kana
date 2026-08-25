/* ==========================================================================
   Kana drill — question logic for drill.html.
   Content lives in data/*.json; shared plumbing lives in site.js.
   This file contains no Japanese content.
   ========================================================================== */
(function(){
"use strict";

var KANA,BY,QUIZABLE,LOOK,SND,ALT,CONFLICT,GRID,HEADS,SMALL,W,WORDS,SPECIAL,TIPS;

var S={confused:[],mode:"k2r",script:"h",sets:{sei:true,daku:false,han:false,you:false},
  len:20,asked:0,right:0,streak:0,ms:0,q:null,locked:false,phase:"quiz",
  weakOnly:false,t0:0,placed:[]};

function $(s){return document.querySelector(s);}
function t(k){return TK.t(k);}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));
  var x=a[i];a[i]=a[j];a[j]=x;}return a;}
function stat(id){return TK.statOf(id);}
function esc(s){return String(s).replace(/[&<>]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
function persist(){TK.saveStat();}
function siC(){return TK.si();}

/* ==========================================================================
   ROMAJI -> KANA
   The same rules a Japanese IME uses, built from the kana table itself so it
   can never disagree with the rest of the site. It handles the three things
   learners actually have to be taught: a doubled consonant makes っ, n before
   a consonant makes ん, and a katakana long vowel is typed as a hyphen.
   ========================================================================== */
var IME=null,IME_REV=null;
var IME_EXTRA={
  "n":"ん","nn":"ん","n'":"ん","wo":"を",
  "di":"ぢ","du":"づ","dzu":"づ",
  "xa":"ぁ","la":"ぁ","xi":"ぃ","li":"ぃ","xu":"ぅ","lu":"ぅ",
  "xe":"ぇ","le":"ぇ","xo":"ぉ","lo":"ぉ",
  "xtu":"っ","ltu":"っ","xtsu":"っ","ltsu":"っ",
  "xya":"ゃ","lya":"ゃ","xyu":"ゅ","lyu":"ゅ","xyo":"ょ","lyo":"ょ",
  "she":"しぇ","che":"ちぇ","je":"じぇ",
  "fa":"ふぁ","fi":"ふぃ","fe":"ふぇ","fo":"ふぉ",
  "wi":"うぃ","we":"うぇ"
};
function buildIME(){
  if(IME)return;
  IME={};
  /* plain table first; rare kana are skipped so ぢ/づ can't steal ji/zu */
  KANA.forEach(function(x){if(!x.rare)IME[x.r]=x.h;});
  KANA.forEach(function(x){if(!x.rare)(ALT[x.r]||[]).forEach(function(a){
    if(!IME[a])IME[a]=x.h;});});
  Object.keys(IME_EXTRA).forEach(function(k){IME[k]=IME_EXTRA[k];});
  /* shortest spelling per kana, for showing what should have been typed */
  IME_REV={};
  Object.keys(IME).forEach(function(k){
    var v=IME[k];
    if(k==="n"||k==="n'")return;
    if(!IME_REV[v]||k.length<IME_REV[v].length)IME_REV[v]=k;});
  IME_REV["ん"]="nn";IME_REV["っ"]="xtu";IME_REV["ー"]="-";
}
function isKata(ch){return ch>="\u30A1"&&ch<="\u30F6";}
function toKata(s){
  return s.replace(/[\u3041-\u3096]/g,function(c){
    return String.fromCharCode(c.charCodeAt(0)+0x60);});
}
var VOWEL="aiueo";
function toKana(src,kata){
  buildIME();
  var s=String(src).toLowerCase().replace(/\s+/g,""),out="",i=0;
  while(i<s.length){
    var c=s[i];
    if(c==="-"){out+="ー";i++;continue;}
    if(c==="n"){
      var nx=s[i+1],nx2=s[i+2];
      if(nx==="'"){out+="ん";i+=2;continue;}
      if(nx==="n"){
        /* "nn" before a vowel is ん + a な-row kana ("konnichiwa" -> こんにちわ);
           anywhere else the pair is just ん ("honn" -> ほん). */
        if(nx2&&(VOWEL.indexOf(nx2)>=0||nx2==="y")){out+="ん";i++;continue;}
        out+="ん";i+=2;continue;
      }
      if(!nx||(VOWEL.indexOf(nx)<0&&nx!=="y")){out+="ん";i++;continue;}
    }
    if(s[i+1]===c&&VOWEL.indexOf(c)<0&&c!=="n"&&/[a-z]/.test(c)){out+="っ";i++;continue;}
    var hit=false;
    for(var len=3;len>=1;len--){
      var chunk=s.substr(i,len);
      if(chunk.length===len&&IME[chunk]){out+=IME[chunk];i+=len;hit=true;break;}
    }
    if(!hit){out+=c;i++;}   /* leave it visible so the learner sees the problem */
  }
  return kata?toKata(out):out;
}
/* what the learner would have to type to produce this word */
function toTyping(word){
  buildIME();
  var c=Array.from(word),out="",i=0;
  function base(ch){return isKata(ch)?String.fromCharCode(ch.charCodeAt(0)-0x60):ch;}
  while(i<c.length){
    var a=base(c[i]),b=c[i+1]?base(c[i+1]):"";
    if(c[i]==="ー"){out+="-";i++;continue;}
    if(a==="っ"){
      var nx=c[i+1]?base(c[i+1]):"";
      var nx2=c[i+2]?base(c[i+2]):"";
      var pair=("ゃゅょ".indexOf(nx2)>=0)?nx+nx2:nx;
      var r=IME_REV[pair]||IME_REV[nx]||"";
      out+=r?r.charAt(0):"";i++;continue;
    }
    if("ゃゅょ".indexOf(b)>=0&&IME_REV[a+b]){out+=IME_REV[a+b];i+=2;continue;}
    out+=IME_REV[a]||a;i++;
  }
  return out;
}

/* ------------------------------------------------------------- controls */
var MODES=[["learn","m_learn"],["gojuon","m_gojuon"],["k2r","m_k2r"],["r2k","m_r2k"],["h2k","m_h2k"],
  ["listen","m_listen"],["type","m_type"],["ime","m_ime"],["spell","m_spell"],["dictation","m_dictation"],
  ["special","m_special"],["word","m_word"]];
var SCRIPTS=[["h","sc_h"],["k","sc_k"],["mix","sc_mix"]];
var SETS=[["sei","st_sei"],["daku","st_daku"],["han","st_han"],["you","st_you"]];
var LENS=[[20,"len20"],[50,"len50"],[-60,"lenTime"],[0,"lenInf"]];
var RANGE_MODES=["learn","k2r","r2k","h2k","listen","type"];
var SCRIPT_MODES=["learn","gojuon","k2r","r2k","listen","type"];
var SPELL_MODES=["spell","dictation"];

function buildChips(){
  /* Only the mode lane stays on the page. Script / range / session live in the
     settings sheet, with the current choice summarised in one line above. */
  $("#sheetSlot").innerHTML=
    '<div class="sgroup"><span class="flabel si-swap" data-t="lblScript"></span>'+
    '<div class="swrap lane" id="scriptChips"></div></div>'+
    '<div class="sgroup"><span class="flabel si-swap" data-t="lblSet"></span>'+
    '<div class="swrap lane" id="setChips"></div></div>'+
    '<div class="sgroup"><span class="flabel si-swap" data-t="lblLen"></span>'+
    '<div class="swrap lane" id="lenChips"></div></div>';
  $("#modeChips").innerHTML=MODES.map(function(m){
    return '<button class="chip '+(m[0]==="learn"?"learn":"")+'" data-mode="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("");
  $("#scriptChips").innerHTML=SCRIPTS.map(function(m){
    return '<button class="chip" data-script="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("");
  $("#setChips").innerHTML=SETS.map(function(m){
    return '<button class="chip" data-set="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("");
  $("#lenChips").innerHTML=LENS.map(function(m){
    return '<button class="chip" data-len="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("");

  $("#modeChips").onclick=function(e){var b=e.target.closest("[data-mode]");if(!b)return;
    S.mode=b.dataset.mode;S.weakOnly=false;startSession();
    /* keep the tapped chip in view on a phone; older browsers may not have it */
    try{if(b.scrollIntoView)b.scrollIntoView({block:"nearest",inline:"nearest"});}catch(err){}};
  $("#scriptChips").onclick=function(e){var b=e.target.closest("[data-script]");if(!b||b.disabled)return;
    S.script=b.dataset.script;startSession();};
  $("#setChips").onclick=function(e){var b=e.target.closest("[data-set]");if(!b||b.disabled)return;
    S.sets[b.dataset.set]=!S.sets[b.dataset.set];
    if(!Object.keys(S.sets).some(function(k){return S.sets[k];}))S.sets.sei=true;
    startSession();};
  $("#lenChips").onclick=function(e){var b=e.target.closest("[data-len]");if(!b||b.disabled)return;
    S.len=parseInt(b.dataset.len,10);startSession();};
  $("#openSettings").onclick=function(){TK.openSheet(true);};
}

/* the summary line — so the learner can see the setup without opening anything */
function drawNowBar(){
  var mode=MODES.filter(function(m){return m[0]===S.mode;})[0];
  var bits=["<b>"+t(mode[1])+"</b>"];
  if(SCRIPT_MODES.indexOf(S.mode)>=0)
    bits.push(t(SCRIPTS.filter(function(x){return x[0]===S.script;})[0][1]));
  if(RANGE_MODES.indexOf(S.mode)>=0)
    bits.push(SETS.filter(function(g){return S.sets[g[0]];}).map(function(g){return t(g[1]);}).join("・"));
  if(S.mode!=="learn")
    bits.push(t(LENS.filter(function(x){return x[0]===S.len;})[0][1]));
  $("#nowVal").innerHTML=bits.join(" &middot; ");
}

function paint(){
  [].forEach.call(document.querySelectorAll(".chip"),function(b){
    b.textContent=t(b.dataset.k);b.classList.toggle("si",TK.lang==="si");});
  [].forEach.call(document.querySelectorAll("[data-mode]"),function(b){
    b.setAttribute("aria-pressed",b.dataset.mode===S.mode);});
  [].forEach.call(document.querySelectorAll("[data-script]"),function(b){
    b.setAttribute("aria-pressed",b.dataset.script===S.script);
    b.disabled=SCRIPT_MODES.indexOf(S.mode)<0;});
  [].forEach.call(document.querySelectorAll("[data-set]"),function(b){
    b.setAttribute("aria-pressed",!!S.sets[b.dataset.set]);
    b.disabled=RANGE_MODES.indexOf(S.mode)<0;});
  [].forEach.call(document.querySelectorAll("[data-len]"),function(b){
    b.setAttribute("aria-pressed",parseInt(b.dataset.len,10)===S.len);b.disabled=(S.mode==="learn");});
  $("#scoreBox").style.display=(S.mode==="learn")?"none":"";
  drawNowBar();drawMastery();
}
function drawMastery(){TK.drawMastery();}

/* -------------------------------------------------- pool + distractors */
function poolKana(){
  var p=KANA.filter(function(x){return S.sets[x.set]&&!x.rare;});
  if(!p.length)p=KANA.filter(function(x){return x.set==="sei"&&!x.rare;});
  if(S.weakOnly){var w=p.filter(function(x){return stat(x.id).w>0;});if(w.length>=4)return w;}
  return p;
}
function weight(k){var s=stat(k.id);return Math.max(0.5,1+s.w*2.5-Math.min(s.c,4)*0.18);}
function weighted(pool){
  var tot=pool.reduce(function(n,k){return n+weight(k);},0),r=Math.random()*tot;
  for(var i=0;i<pool.length;i++){r-=weight(pool[i]);if(r<=0)return pool[i];}
  return pool[pool.length-1];
}
function scriptFor(){return S.script==="mix"?(Math.random()<.5?"h":"k"):S.script;}
/* を reads "o" in modern Japanese, so を and お must never be options for each other. */
function clashes(ans,c){var g=CONFLICT[ans.id];return !!g&&g.indexOf(c.id)>=0;}

function glyphOptions(pool,ans,ansSc,n){
  var mix=S.script==="mix";
  var out=[],used={},seen={};
  used[ans.id]=1;seen[ans[ansSc]]=1;
  function push(c){
    if(!c||out.length>=n||used[c.id]||clashes(ans,c))return;
    var sc=mix?(Math.random()<.5?"h":"k"):ansSc;
    if(seen[c[sc]])return;
    used[c.id]=1;seen[c[sc]]=1;out.push({glyph:c[sc],kana:c});
  }
  shuffle((LOOK[ansSc][ans[ansSc]]||[]).map(function(ch){return BY[ansSc][ch];})
    .filter(function(x){return x&&pool.indexOf(x)>=0;})).forEach(push);
  shuffle((SND[ans.r]||[]).map(function(r){
    return pool.filter(function(x){return x.r===r;})[0];}).filter(Boolean)).forEach(push);
  shuffle(pool.slice()).forEach(push);
  return shuffle([{glyph:ans[ansSc],kana:ans}].concat(out));
}
function romajiOptions(pool,ans,ansSc,n){
  var out=[],seen={};seen[ans.r]=1;
  function push(c){if(!c||out.length>=n||seen[c.r]||clashes(ans,c))return;seen[c.r]=1;out.push(c);}
  shuffle((LOOK[ansSc][ans[ansSc]]||[]).map(function(ch){return BY[ansSc][ch];})
    .filter(function(x){return x&&pool.indexOf(x)>=0;})).forEach(push);
  shuffle((SND[ans.r]||[]).map(function(r){
    return pool.filter(function(x){return x.r===r;})[0];}).filter(Boolean)).forEach(push);
  shuffle(pool.slice()).forEach(push);
  return shuffle([ans].concat(out));
}

/* ------------------------------------------------------------- session */
var tick=null;
function stopTimer(){if(tick){clearInterval(tick);tick=null;}}
function startTimer(){
  stopTimer();
  S.until=Date.now()+(-S.len)*1000;
  tick=setInterval(function(){
    if(S.phase!=="quiz"){stopTimer();return;}
    var left=Math.max(0,Math.ceil((S.until-Date.now())/1000));
    var el=$("#timer");
    if(el){el.textContent=t("timeUp")+" "+left;el.classList.toggle("low",left<=10);}
    var bar=$("#timeBar");
    if(bar)bar.style.width=(left/(-S.len)*100)+"%";
    if(left<=0){stopTimer();endSession();}
  },250);
}
function startSession(){
  stopTimer();
  S.asked=0;S.right=0;S.streak=0;S.ms=0;S.confused=[];S.phase="quiz";
  paint();updateScore();drawMap();
  if(S.mode==="learn"){renderLearn();return;}
  newQ();
  if(S.len<0)startTimer();
}
function endSession(){
  stopTimer();S.phase="result";persist();
  var weak=Object.keys(TK.stat).filter(function(id){var v=TK.stat[id];return v.w>0&&v.w>=v.c&&BY.h[id];})
    .sort(function(a,b){return TK.stat[b].w-TK.stat[a].w;}).slice(0,12);
  var rate=S.asked?Math.round(S.right/S.asked*100):0;
  var avg=S.asked?(S.ms/S.asked/1000).toFixed(1):"-";
  var deg=Math.round(rate*3.6);
  $("#card").innerHTML=
    '<div class="result"><div class="corner">RESULT</div>'+
    '<h2 class="'+siC()+'">'+t("resTitle")+'</h2>'+
    '<div class="gauge" style="background:conic-gradient(var(--gold) 0deg '+deg+'deg,var(--rule) '+deg+'deg 360deg)">'+
    '<span>'+rate+'<i>%</i></span></div>'+
    '<p style="margin:12px 0 0;font-size:.85rem;color:var(--ink-soft)" class="'+siC()+'">'+
    S.right+' / '+S.asked+' &nbsp;&middot;&nbsp; '+t("resSpeed")+': '+avg+'s</p>'+
    '<p style="margin:18px 0 0;font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft)" class="'+siC()+'">'+
    (weak.length?t("resWeak"):t("resNone"))+'</p>'+
    '<div class="weaklist" id="weaklist">'+weak.map(function(id){var x=BY.h[id];
      return '<button class="tile act" data-say="'+x.h+'" title="'+x.r+'"><span>'+x.h+'</span></button>';}).join("")+'</div>'+
    recapHTML()+
    '<div class="rowbtns" style="margin-top:20px;justify-content:center">'+
    '<button class="ghost" id="again">'+t("btnAgain")+'</button>'+
    (weak.length>=4?'<button class="ghost alt" id="weak">'+t("btnWeak")+'</button>':"")+
    '<button class="ghost alt" id="reset">'+t("btnReset")+'</button></div></div>';
  $("#again").onclick=function(){S.weakOnly=false;startSession();};
  var wb=$("#weak");if(wb)wb.onclick=function(){S.weakOnly=true;startSession();};
  $("#reset").onclick=doReset;
  $("#weaklist").onclick=function(e){var b=e.target.closest("[data-say]");if(b)speak(b.dataset.say);};
  drawMap();drawMastery();
}
/* the pairs this session actually mixed up, with the same tip shown in the
   moment — a short, personal review list rather than a generic one */
function recapHTML(){
  if(!S.confused.length)return "";
  return '<div class="recap"><h3>'+t("recapTitle")+'</h3>'+
    S.confused.slice(0,6).map(function(c){
      return '<div class="item"><div class="pair">'+
        c.pairs.slice(0,4).map(function(x){return esc(x);}).join('<em>&middot;</em>')+
        '</div><p>'+esc(c.tip[TK.lang]||c.tip.en)+'</p></div>';}).join("")+'</div>';
}
function doReset(){TK.resetStat();S.weakOnly=false;startSession();}

/* ----------------------------------------------------------- questions */
function shell(inner,extraBtns){
  var timed=S.len<0;
  var pct=(S.len>0)?Math.min(100,S.asked/S.len*100):100;
  var corner=timed?'<span class="timer" id="timer"></span>'
    :(S.len?(S.asked+1)+" / "+S.len:"Q"+(S.asked+1));
  $("#card").innerHTML=
    '<div class="corner">'+corner+'</div>'+
    (timed?'<div class="bar"><i id="timeBar" style="width:100%"></i></div>'
      :(S.len?'<div class="bar"><i style="width:'+pct+'%"></i></div>':""))+
    '<p class="ask '+siC()+'" id="ask"></p>'+
    '<div class="stage" id="stage"></div>'+inner+
    '<div class="verdict" id="verdict" role="status" aria-live="polite"></div>'+
    '<div id="explSlot"></div>'+
    '<div class="rowbtns">'+(extraBtns||"")+
    '<button class="ghost" id="next" disabled>'+t("btnNext")+'</button>'+
    '<button class="ghost alt" id="skip">'+t("btnSkip")+'</button>'+
    (S.len?'<button class="ghost alt" id="stop">'+t("btnEnd")+'</button>':"")+'</div>';
  $("#next").onclick=function(){newQ();};
  $("#skip").onclick=doSkip;
  var st=$("#stop");if(st)st.onclick=endSession;
}

/* "I don't know" reveals the answer and counts it wrong, so the kana comes
   back sooner. Better than a coin-flip guess that gets scored as knowledge. */
function doSkip(){
  if(S.locked||!S.q)return;
  if(S.q.list){
    var keyFn=S.q.keyFn,a=S.q.answer;
    [].forEach.call($("#opts").querySelectorAll(".opt"),function(el,idx){
      el.disabled=true;
      if(keyFn(S.q.list[idx])===keyFn(a))el.dataset.state="ok";});
  }
  if(S.q.spell){
    var q=S.q;
    [].forEach.call(document.querySelectorAll("#slots .slot"),function(el,i){
      el.classList.remove("on");el.classList.add("ng");el.removeAttribute("data-p");
      el.textContent=q.target[i];});
    var sb=$("#submit");if(sb)sb.disabled=true;
  }
  if(S.q.ime){
    var ie=$("#typed");ie.value=toTyping(S.q.target);ie.disabled=true;
    paintIme(S.q.target);
    finish(false,S.q.answer);showExpl(S.q.answer);
    return;
  }
  var inp=$("#typed");if(inp){inp.value=S.q.answer.r;inp.dataset.state="ng";inp.disabled=true;}
  S.q.chosen=null;
  finish(false,S.q.answer);
  if(S.q.spell)showExpl(S.q.answer);
}

function newQ(){
  if(S.len>0&&S.asked>=S.len){endSession();return;}
  if(S.len<0&&S.until&&Date.now()>=S.until){endSession();return;}
  S.locked=false;S.placed=[];

  if(S.mode==="ime"){
    shell('<div id="typeBox"><input id="typed" autocomplete="off" autocapitalize="off" '+
      'spellcheck="false" inputmode="latin" aria-label="romaji"></div>'+
      '<div class="imeout" id="imeOut"></div>'+
      '<p class="hint '+siC()+'">'+t("imeHint")+'</p>');
  }else if(S.mode==="type"){
    shell('<div id="typeBox"><input id="typed" autocomplete="off" autocapitalize="off" '+
      'spellcheck="false" inputmode="latin" aria-label="romaji"><button class="ghost" id="check">'+t("btnCheck")+'</button></div>');
  }else if(SPELL_MODES.indexOf(S.mode)>=0){
    shell('<div class="slots" id="slots"></div><div class="bank" id="bank"></div>'+
      '<p class="hint '+siC()+'" id="spellHint"></p>',
      '<button class="ghost" id="submit" disabled>'+t("btnAnswer")+'</button>'+
      '<button class="ghost alt" id="clear">'+t("btnClear")+'</button>');
  }else{
    shell('<div class="opts" id="opts"></div>');
    $("#opts").onclick=function(e){var b=e.target.closest(".opt");
      if(b&&!S.locked)answer(parseInt(b.dataset.i,10));};
  }
  var askEl=$("#ask"),stage=$("#stage");

  if(SPELL_MODES.indexOf(S.mode)>=0){buildSpell(askEl,stage);S.t0=Date.now();return;}
  if(S.mode==="ime"){buildIme(askEl,stage);S.t0=Date.now();return;}
  if(S.mode==="gojuon"){buildGojuon(askEl,stage);S.t0=Date.now();return;}

  if(S.mode==="word"){
    var a=pick(WORDS);
    /* same beat-count first: otherwise the answer can be found by counting */
    var beats=Array.from(a.w).length;
    var same=shuffle(WORDS.filter(function(x){
      return x.r!==a.r&&Array.from(x.w).length===beats;}));
    var rest=shuffle(WORDS.filter(function(x){
      return x.r!==a.r&&Array.from(x.w).length!==beats;}));
    var o=same.concat(rest).slice(0,3);
    askEl.textContent=t("ask_word");
    stage.innerHTML='<div class="glyph small">'+a.w+'</div>';
    S.q={answer:a,kanaId:null,word:a};
    renderOpts(shuffle([a].concat(o)),function(x){return x.r;},"",function(){return "";});
  }
  else if(S.mode==="special"){
    var sp=pick(SPECIAL);
    askEl.textContent=t("ask_special");
    stage.innerHTML='<div class="romacue">'+sp.r+'</div><div class="sub">'+sp.en+
      ' &middot; <span class="si">'+sp.si+'</span></div>';
    var opts=shuffle([{w:sp.w,ok:1}].concat(sp.bad.map(function(b){return {w:b,ok:0};})));
    S.q={answer:opts.filter(function(x){return x.ok;})[0],kanaId:null,special:sp};
    renderOpts(opts,function(x){return x.w;},"word",function(){return "";});
  }
  else{
    var pool=poolKana(),k=weighted(pool),sc=scriptFor();
    if(S.mode==="k2r"){
      askEl.textContent=t("ask_k2r");
      stage.innerHTML='<div class="glyph">'+k[sc]+'</div>';
      S.q={answer:k,kanaId:k.id};
      renderOpts(romajiOptions(pool,k,sc,3),function(x){return x.r;},"",function(x){return x.s;});
    }else if(S.mode==="r2k"){
      askEl.textContent=t("ask_r2k");
      stage.innerHTML='<div class="reading">'+k.r+'</div><div class="sub si">'+k.s+'</div>';
      var list=glyphOptions(pool,k,sc,3);
      S.q={answer:list.filter(function(o){return o.kana.id===k.id;})[0],kanaId:k.id};
      renderOpts(list,function(x){return x.glyph;},"kana",function(){return "";});
    }else if(S.mode==="h2k"){
      var fromH=Math.random()<.5,key=fromH?"k":"h",srcK=fromH?"h":"k";
      askEl.textContent=t(fromH?"ask_h2k_hk":"ask_h2k_kh");
      stage.innerHTML='<div class="glyph">'+k[srcK]+'</div>';
      var out=[],seen={};seen[k[key]]=1;
      var push=function(c){if(!c||out.length>=3||seen[c[key]])return;seen[c[key]]=1;out.push(c);};
      shuffle((LOOK[key][k[key]]||[]).map(function(ch){return BY[key][ch];})
        .filter(function(x){return x&&pool.indexOf(x)>=0;})).forEach(push);
      shuffle(pool.slice()).forEach(push);
      S.q={answer:k,kanaId:k.id};
      renderOpts(shuffle([k].concat(out)),function(x){return x[key];},"kana",function(){return "";});
    }else if(S.mode==="listen"){
      if(!hasVoice()){
        $("#card").innerHTML='<div class="notice"><h3>'+t("noVoiceTitle")+'</h3>'+
          '<p>'+t("noVoiceBody")+'</p></div>';
        return;
      }
      askEl.textContent=t("ask_listen");
      stage.innerHTML='<button class="ghost" id="play">'+t("btnPlay")+'</button>';
      $("#play").onclick=function(){speak(k.h);};
      var l2=glyphOptions(pool,k,sc,3);
      S.q={answer:l2.filter(function(o){return o.kana.id===k.id;})[0],kanaId:k.id};
      /* no romaji under the options here — that would answer the question for them */
      renderOpts(l2,function(x){return x.glyph;},"kana",function(){return "";});
      speak(k.h);
    }else if(S.mode==="type"){
      askEl.textContent=t("ask_type");
      stage.innerHTML='<div class="glyph">'+k[sc]+'</div>';
      S.q={answer:k,kanaId:k.id,typing:true};
      var inp=$("#typed");inp.value="";inp.removeAttribute("data-state");inp.disabled=false;inp.focus();
      $("#check").onclick=checkTyped;
      inp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();
        if(S.locked)newQ();else checkTyped();}};
    }
  }
  S.t0=Date.now();
}

function renderOpts(list,keyFn,cls,subFn){
  $("#opts").innerHTML=list.map(function(o,i){
    return '<button class="opt" data-i="'+i+'"><span class="num">'+(i+1)+'</span>'+
      '<span class="main '+cls+'">'+esc(keyFn(o))+'</span>'+
      '<span class="si">'+esc(subFn(o)||"")+'</span></button>';}).join("");
  S.q.list=list;S.q.keyFn=keyFn;
}

/* ---- type romaji, watch it become kana ---- */
function buildIme(askEl,stage){
  var a=pick(W),kata=isKata(Array.from(a.w)[0]);
  askEl.textContent=t("ask_ime");
  stage.innerHTML='<div class="glyph small">'+a.w+'</div>'+
    '<div class="sub">'+a.en+' &middot; <span class="si">'+a.si+'</span></div>';
  S.q={answer:a,kanaId:null,ime:true,target:a.w,kata:kata};
  var inp=$("#typed"),outEl=$("#imeOut");
  inp.value="";inp.disabled=false;inp.focus();
  paintIme("");
  inp.oninput=function(){
    if(S.locked)return;
    var kana=toKana(inp.value,kata);
    paintIme(kana);
    /* finishing the word is the answer — no extra button to press */
    if(kana===a.w)finishIme(true,kana);
  };
  inp.onkeydown=function(e){
    if(e.key!=="Enter")return;
    e.preventDefault();
    if(S.locked){newQ();return;}
    finishIme(toKana(inp.value,kata)===a.w,toKana(inp.value,kata));
  };
}
function paintIme(kana){
  var t2=Array.from(S.q.target),got=Array.from(kana),html="";
  for(var i=0;i<Math.max(t2.length,got.length);i++){
    if(i>=got.length){html+='<span class="ic todo">_</span>';continue;}
    var cls=(got[i]===t2[i])?"ok":"ng";
    html+='<span class="ic '+cls+'">'+got[i]+'</span>';
  }
  $("#imeOut").innerHTML=html;
}
function finishIme(ok,kana){
  if(S.locked)return;
  var inp=$("#typed");inp.disabled=true;
  if(!ok)paintIme(kana);
  /* credit every kana in the word, the same way spelling does */
  finish(ok,S.q.answer);
  showExpl(S.q.answer);
}

/* ---- gojuon: fill the missing kana ---- */
/* the whole chart in reading order — あいうえお かきくけこ … わをん */
function flatOrder(){
  var out=[];
  GRID.forEach(function(r){r.forEach(function(c){if(c)out.push(c);});});
  out.push("ん");
  return out;
}
function buildGojuon(askEl,stage){
  var sc=scriptFor(),cells,ansChar,roll=Math.random();
  if(roll<0.45){
    /* a window that crosses row boundaries: あいうえ▢かきく
       This asks for the order of the whole chart, not just one row. */
    var flat=flatOrder(),n=8;
    var st=Math.floor(Math.random()*(flat.length-n+1));
    var win=flat.slice(st,st+n);
    var bi=1+Math.floor(Math.random()*(n-2));   /* never the first or last cell */
    ansChar=win[bi];
    cells=win.map(function(c,i){return {ch:c,blank:i===bi};});
    askEl.textContent=t("ask_seq");
  }else if(roll<0.8){
    var row=pick(GRID.filter(function(r){return r.filter(Boolean).length>=4;}));
    var idxs=row.map(function(c,i){return c?i:-1;}).filter(function(i){return i>=0;});
    var bj=pick(idxs);ansChar=row[bj];
    cells=row.map(function(c,i){return {ch:c,blank:i===bj};});
    askEl.textContent=t("ask_row");
  }else{
    var bk=Math.floor(Math.random()*HEADS.length);ansChar=HEADS[bk];
    cells=HEADS.map(function(c,i){return {ch:c,blank:i===bk};});
    askEl.textContent=t("ask_head");
  }
  var ans=BY.h[ansChar];
  stage.innerHTML='<div class="seq">'+cells.map(function(c){
    return c.blank?'<div class="cell blank">?</div>'
      :(c.ch?'<div class="cell">'+BY.h[c.ch][sc]+'</div>':'<div class="cell gap"></div>');}).join("")+'</div>';
  var pool=KANA.filter(function(x){return x.set==="sei"&&!x.rare;});
  /* anything already on screen is not a real option — the learner can see it */
  var shown={};cells.forEach(function(c){if(c.ch&&c.ch!==ansChar)shown[c.ch]=1;});
  var out=[],seen={};seen[ans[sc]]=1;
  var push=function(c){
    if(!c||out.length>=3||seen[c[sc]]||shown[c.h]||clashes(ans,c))return;
    seen[c[sc]]=1;out.push(c);};
  shuffle((LOOK[sc][ans[sc]]||[]).map(function(ch){return BY[sc][ch];})
    .filter(function(x){return x&&pool.indexOf(x)>=0;})).forEach(push);
  shuffle(pool.slice()).forEach(push);
  S.q={answer:ans,kanaId:ans.id,gojuon:sc};
  renderOpts(shuffle([ans].concat(out)),function(x){return x[sc];},"kana",function(){return "";});
}

/* ---- spell: build the word from a tile bank ---- */
function buildSpell(askEl,stage){
  var a=pick(W),target=Array.from(a.w);
  var heard=(S.mode==="dictation");
  askEl.textContent=t(heard?"ask_dictation":"ask_spell");
  /* dictation hides the spelling cue: the word has to come from the ear */
  stage.innerHTML=heard
    ? '<button class="ghost" id="play">'+t("btnPlay")+'</button>'
    : '<div class="romacue">'+a.r+'</div><div class="sub">'+a.en+
      ' &middot; <span class="si">'+a.si+'</span></div>';
  if(heard){$("#play").onclick=function(){speak(a.w);};speak(a.w);}
  var tset={};target.forEach(function(c){tset[c]=1;});
  var dummies=[],guard=0;
  while(dummies.length<4&&guard++<200){
    var base=pick(target),cand=null,bk=BY.h[base]||BY.k[base];
    if(bk){
      var sc=Math.random()<.5?"h":"k",g=LOOK[sc][bk[sc]];
      if(g&&g.length)cand=pick(g);
      if(!cand)cand=pick(QUIZABLE)[sc];
      if(Math.random()<.35)cand=bk[bk.h===base?"k":"h"];
    }else{cand=pick(Array.from(SMALL));}
    if(cand&&!tset[cand]&&dummies.indexOf(cand)<0)dummies.push(cand);
  }
  var bank=shuffle(target.concat(dummies).map(function(ch,i){return {ch:ch,i:i};}));
  S.q={answer:a,kanaId:null,spell:true,target:target,bank:bank};
  $("#spellHint").textContent="";
  drawSpell();
  $("#bank").onclick=function(e){var b=e.target.closest(".btile");if(!b||S.locked)return;
    S.placed.push(parseInt(b.dataset.i,10));drawSpell();};
  $("#slots").onclick=function(e){var b=e.target.closest("[data-p]");if(!b||S.locked)return;
    S.placed.splice(parseInt(b.dataset.p,10),1);drawSpell();};
  $("#clear").onclick=function(){if(S.locked)return;S.placed=[];drawSpell();};
  $("#submit").onclick=checkSpell;
}
function drawSpell(){
  var q=S.q,n=q.target.length,slots="";
  for(var i=0;i<n;i++){
    var bi=S.placed[i];
    slots+=(bi===undefined)?'<div class="slot"></div>'
      :'<div class="slot on" data-p="'+i+'">'+q.bank.filter(function(b){return b.i===bi;})[0].ch+'</div>';
  }
  $("#slots").innerHTML=slots;
  $("#bank").innerHTML=q.bank.map(function(b){
    return '<button class="btile" data-i="'+b.i+'" data-used="'+
      (S.placed.indexOf(b.i)>=0?1:0)+'">'+b.ch+'</button>';}).join("");
  $("#submit").disabled=S.placed.length!==n;
}
function checkSpell(){
  if(S.locked)return;
  var q=S.q;
  var built=S.placed.map(function(i){return q.bank.filter(function(b){return b.i===i;})[0].ch;});
  var ok=built.join("")===q.answer.w;
  [].forEach.call(document.querySelectorAll("#slots .slot"),function(el,i){
    el.classList.remove("on");
    el.classList.add(built[i]===q.target[i]?"ok":"ng");
    el.removeAttribute("data-p");
    if(!ok)el.textContent=q.target[i];});
  $("#submit").disabled=true;
  finish(ok,q.answer);
  showExpl(q.answer);
}
/* When the learner picks a look-alike, say how to tell the two apart. That is
   the thing they actually needed to know, and it is why the distractor exists. */
function tipFor(x,y){
  if(!TIPS||!x||!y)return null;
  var g=[x.h,x.k],h=[y.h,y.k];
  for(var i=0;i<TIPS.kana.length;i++){
    var c=TIPS.kana[i].chars,hasX=false,hasY=false;
    for(var j=0;j<c.length;j++){
      if(g.indexOf(c[j])>=0)hasX=true;
      if(h.indexOf(c[j])>=0)hasY=true;
    }
    if(hasX&&hasY)return TIPS.kana[i].tip;
  }
  return null;
}
function kanaExpl(ok){
  var host=$("#explSlot");if(!host)return;
  var ans=optKana(S.q.answer),chose=optKana(S.q.chosen);
  var sc=S.q.gojuon||"h";
  if(!ans){host.innerHTML="";return;}
  var tip=(!ok&&chose&&chose.id!==ans.id)?tipFor(ans,chose):null;
  if(tip){
    var key=tip.en,pair=ans[sc]+"\u2194"+chose[sc];
    var hit=null;
    for(var q=0;q<S.confused.length;q++)if(S.confused[q].key===key)hit=S.confused[q];
    if(!hit){hit={key:key,pairs:[],tip:tip};S.confused.push(hit);}
    if(hit.pairs.indexOf(pair)<0)hit.pairs.push(pair);
  }
  if(!tip&&ok){host.innerHTML="";return;}   /* nothing useful to add on a hit */
  var pair="";
  if(tip&&chose){
    pair='<div class="pairrow">'+
      '<span class="ans"><b>'+ans[sc]+'</b><i>'+ans.r+'</i></span>'+
      '<span class="you"><b>'+chose[sc]+'</b><i>'+chose.r+'</i></span></div>';
  }
  var body=tip?(tip[TK.lang]||tip.en)
    :(ans.h+" / "+ans.k+" — "+ans.r);
  host.innerHTML='<div class="expl'+(tip?" compare":"")+'">'+
    '<span class="lab">'+t(tip?"labCompare":"labRule")+'</span>'+pair+
    '<p class="nt">'+esc(body)+'</p></div>';
}

function showExpl(a){
  $("#explSlot").innerHTML='<div class="expl"><div class="hw">'+a.w+'</div>'+
    '<div class="rm">'+a.r+'</div>'+
    '<div class="mn">'+a.en+' &middot; <span class="si">'+a.si+'</span></div>'+
    '<p class="nt '+siC()+'">'+(a.note[TK.lang]||a.note.en)+'</p>'+
    '<div class="rowbtns"><button class="ghost alt" id="sayw">'+t("btnPlay")+'</button></div></div>';
  $("#sayw").onclick=function(){speak(a.w);};
}

/* ----------------------------------------------------------- answering */
function accepted(a){var r=a.r.toLowerCase();return [r].concat(ALT[r]||[]);}
function checkTyped(){
  if(S.locked)return;
  var inp=$("#typed"),val=inp.value.trim().toLowerCase().replace(/\s+/g,"");
  if(!val)return;
  var a=S.q.answer,ok=accepted(a).indexOf(val)>=0;
  inp.dataset.state=ok?"ok":"ng";inp.disabled=true;finish(ok,a);
}
/* the kana object behind an option, whatever shape the mode stores it in */
function optKana(o){
  if(!o)return null;
  if(o.kana)return o.kana;
  if(o.h&&o.k)return o;
  return null;
}
function answer(i){
  if(S.locked||!S.q||!S.q.list)return;
  var list=S.q.list,keyFn=S.q.keyFn,a=S.q.answer;
  if(!list[i])return;
  var ok=keyFn(list[i])===keyFn(a);
  S.q.chosen=list[i];
  [].forEach.call($("#opts").querySelectorAll(".opt"),function(el,idx){
    el.disabled=true;
    if(keyFn(list[idx])===keyFn(a))el.dataset.state="ok";
    else if(idx===i)el.dataset.state="ng";});
  finish(ok,a);
}
function finish(ok,a){
  S.locked=true;TK.bumpDays();
  S.ms+=Math.min(Date.now()-S.t0,60000);
  S.asked++;
  if(ok){S.right++;S.streak++;}else S.streak=0;
  if(S.q.kanaId){var s=stat(S.q.kanaId);if(ok)s.c++;else s.w++;}
  if(S.q.spell||S.q.ime){Array.from(S.q.target).forEach(function(ch){
    var kk=BY.h[ch]||BY.k[ch];
    if(kk&&!kk.rare){var st2=stat(kk.id);if(ok)st2.c++;else st2.w++;}});}
  persist();

  var v=$("#verdict"),detail="",hint="";
  v.className="verdict "+(ok?"ok":"ng");
  if(S.q.spell||S.q.ime){detail="<b>"+a.w+"</b>";}
  else if(S.q.word){detail="<b>"+a.w+"</b> &mdash; "+a.r+" &middot; "+a.en+
    ' &middot; <span class="si">'+a.si+"</span>";}
  else if(S.q.special){var sp=S.q.special;
    detail="<b>"+sp.w+"</b> &mdash; "+sp.r+" &middot; "+sp.en;}
  else{var kk2=a.kana||a;
    detail="<b>"+kk2.h+" / "+kk2.k+"</b> &mdash; "+kk2.r+' &middot; <span class="si">'+kk2.s+"</span>";}
  v.innerHTML='<span class="tag">'+(ok?t("ok"):t("ng"))+"</span>"+
    (ok?"":t("answerIs")+" ")+detail+hint;

  var nb=$("#next");if(nb)nb.disabled=false;
  if(S.q.special){
    var sp2=S.q.special;
    $("#explSlot").innerHTML='<div class="expl"><span class="lab">'+t("labRule")+'</span>'+
      '<p class="nt">'+esc(t(sp2.kind==="t"?"kindT":sp2.kind==="c"?"kindC":"kindN"))+'</p></div>';
  }else if(S.q.kanaId&&!S.q.spell&&!S.q.ime)kanaExpl(ok);
  updateScore();drawMap();drawMastery();
  if(ok&&!S.q.spell&&!S.q.ime&&S.phase==="quiz")setTimeout(function(){
    if(S.locked&&S.phase==="quiz")newQ();},S.mode==="special"?1100:750);
}
function updateScore(){
  $("#sAsked").textContent=S.asked;
  $("#sRate").textContent=S.asked?Math.round(S.right/S.asked*100)+"%":"-";
  var st=$("#sStreak");st.textContent=S.streak;st.classList.toggle("hot",S.streak>=5);
  $("#sSpeed").textContent=S.asked?(S.ms/S.asked/1000).toFixed(1):"-";
}

/* --------------------------------------------------------------- learn */
function renderLearn(){
  var sc=S.script==="k"?"k":"h";
  $("#card").innerHTML=
    '<div class="corner">LEARN</div><p class="ask '+siC()+'">'+t("learnTitle")+'</p>'+
    '<div class="stage" style="min-height:150px"><div class="glyph" id="lg">'+(sc==="k"?"ア":"あ")+'</div>'+
    '<div class="sub" id="ls">a &middot; <span class="si">'+BY.h["あ"].s+'</span></div></div>'+
    SETS.filter(function(g){return S.sets[g[0]];}).map(function(g){
      return '<div class="mapset"><h3 class="'+siC()+'">'+t(g[1])+'</h3>'+
        chartHTML(g[0],sc,true)+'</div>';}).join("")+
    '<p class="hint '+siC()+'" style="text-align:left">'+t("learnHint")+'</p>';
  $("#card").onclick=function(e){
    var b=e.target.closest("[data-id]");if(!b)return;
    var x=BY.h[b.dataset.id];
    $("#lg").textContent=x[sc];
    $("#ls").innerHTML=x.r+' &middot; <span class="si">'+x.s+'</span>';
    speak(x.h);};
}

/* --------------------------------------------------------------- audio */
var jaVoice=null;
function loadVoices(){try{var vs=speechSynthesis.getVoices();
  jaVoice=vs.filter(function(v){return v.lang&&v.lang.toLowerCase().indexOf("ja")===0;})[0]||null;}catch(e){}}
if("speechSynthesis" in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
function hasVoice(){
  if(!("speechSynthesis" in window))return false;
  loadVoices();
  /* some browsers report an empty list until the first call; treat unknown as
     available so we do not block a device that would have worked */
  try{return !!jaVoice||speechSynthesis.getVoices().length===0;}catch(e){return false;}
}
function speak(text){
  if(!("speechSynthesis" in window)){
    var v=$("#verdict");if(v){v.className="verdict";v.textContent=t("noAudio");}return;}
  loadVoices();
  try{var u=new SpeechSynthesisUtterance(text);
    u.lang="ja-JP";if(jaVoice)u.voice=jaVoice;u.rate=.8;
    speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}
}

/* ----------------------------------------------------------- kana map */
/* Laid out as the actual gojuon chart: one 行 per line, gaps preserved,
   so the shape on screen matches the chart on the classroom wall. */
function chartHTML(set,sc,interactive){
  var cls=interactive?"tile act":"tile";
  function cell(ch){
    if(!ch)return '<div class="tile hole"></div>';
    var x=BY.h[ch];if(!x)return '<div class="tile hole"></div>';
    var s=stat(x.id),fill=Math.min(s.c,4)/4,weak=(s.w>0&&s.w>=s.c)?1:0;
    return '<'+(interactive?"button":"div")+' class="'+cls+'" data-weak="'+weak+'" '+
      'data-rare="'+(x.rare?1:0)+'" data-id="'+x.h+'" title="'+x.h+" "+x.k+" "+x.r+'">'+
      (fill?'<i style="opacity:'+(fill*.9).toFixed(2)+'"></i>':"")+
      '<span>'+x[sc]+'</span></'+(interactive?"button":"div")+'>';
  }
  if(set==="sei"){
    var rows=GRID.map(function(r){return r.map(cell).join("");});
    rows.push(cell("ん")+'<div class="tile hole"></div><div class="tile hole"></div>'+
      '<div class="tile hole"></div><div class="tile hole"></div>');
    return '<div class="chart c5'+(interactive?" big":"")+'">'+rows.join("")+'</div>';
  }
  var list=KANA.filter(function(x){return x.set===set;});
  var cols=(set==="you")?3:5;
  return '<div class="chart c'+cols+(interactive?" big":"")+'">'+
    list.map(function(x){return cell(x.h);}).join("")+'</div>';
}
function drawMap(){
  $("#mapBody").innerHTML=SETS.filter(function(g){return S.sets[g[0]];}).map(function(g){
    return '<div class="mapset"><h3 class="'+siC()+'">'+t(g[1])+'</h3>'+
      chartHTML(g[0],"h",false)+'</div>';}).join("");
}

/* -------------------------------------------------------------- wiring */
function relang(){
  if(S.phase==="result")endSession();
  else if(S.mode==="learn")renderLearn();
  else newQ();
  drawMap();
}

TK.page({data:["words","tips"],relang:relang,start:function(){
  if(!document.getElementById("card"))return;
  var K=TK.kana;
  KANA=K.all;BY=K.by;QUIZABLE=K.quizable;LOOK=K.look;SND=K.snd;
  ALT=K.alt;CONFLICT=K.conflict;GRID=K.grid;HEADS=K.heads;SMALL=K.small;
  W=TK.data.words.spell;WORDS=TK.data.words.quick;SPECIAL=TK.data.words.special;
  TIPS=TK.data.tips;
  document.addEventListener("keydown",function(e){
    if(S.mode==="learn"||S.mode==="ime"||SPELL_MODES.indexOf(S.mode)>=0||S.phase==="result")return;
    if(document.activeElement&&document.activeElement.id==="typed")return;
    if(e.key>="1"&&e.key<="4")answer(parseInt(e.key,10)-1);
    else if(e.key==="Enter"){e.preventDefault();newQ();}});
  buildChips();paint();updateScore();drawMap();startSession();
}});
})();
