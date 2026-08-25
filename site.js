/* ==========================================================================
   Shared site layer — used by every page.
   Owns: data loading, language state, nav, storage, the mastery strip.
   Page scripts (app.js, guide.js) call TK.init() and get told when to repaint.
   ========================================================================== */
(function(){
"use strict";

var LEGACY="takane-kana-v3";          /* the drill's old single-purpose key */
var P_KEY="takane:profile";           /* shared across every course */
var K_KEY="takane:kana:stat";         /* this course's per-kana record */

function jget(k){try{var v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* One-time move off the old key so nobody loses their gold. */
function migrate(){
  var old=jget(LEGACY);
  if(!old)return;
  if(!jget(K_KEY))jset(K_KEY,old.stat||{});
  if(!jget(P_KEY))jset(P_KEY,{lang:old.lang||"en",days:old.days||0,lastDay:old.lastDay||""});
  try{localStorage.removeItem(LEGACY);}catch(e){}
}

var TK={
  lang:"en",
  T:null,
  data:{},
  profile:{lang:"en",days:0,lastDay:"",theme:"enji",scheme:"auto",size:"m",today:0},
  stat:{},
  _paint:null,

  t:function(k){return (TK.T[TK.lang]&&TK.T[TK.lang][k])||TK.T.en[k]||"";},
  si:function(){return TK.lang==="si"?"si":"";},

  saveProfile:function(){TK.profile.lang=TK.lang;jset(P_KEY,TK.profile);},

  /* Colour family, brightness and text size are three attributes on <html>;
     every rule in the stylesheet reads from them, so nothing else changes. */
  applyLook:function(){
    var h=document.documentElement;
    h.setAttribute("data-theme",TK.profile.theme||"enji");
    h.setAttribute("data-scheme",TK.profile.scheme||"auto");
    h.setAttribute("data-size",TK.profile.size||"m");
  },
  saveStat:function(){jset(K_KEY,TK.stat);},
  resetStat:function(){TK.stat={};TK.saveStat();},

  /* A day streak costs one string and one compare, and it brings people back. */
  GOAL:20,
  bumpDays:function(){
    var d=new Date(),today=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
    if(TK.profile.lastDay!==today){
      var y=new Date(Date.now()-864e5);
      var yk=y.getFullYear()+"-"+(y.getMonth()+1)+"-"+y.getDate();
      TK.profile.days=(TK.profile.lastDay===yk)?TK.profile.days+1:1;
      TK.profile.lastDay=today;TK.profile.today=0;
    }
    TK.profile.today=(TK.profile.today||0)+1;
    TK.saveProfile();TK.drawMastery();
  },

  /* [hiragana, katakana, romaji, sinhala, row, rare?] -> objects + lookups */
  buildKana:function(K){
    function mk(rows,set){return rows.map(function(r){
      return {h:r[0],k:r[1],r:r[2],s:r[3],row:r[4],set:set,rare:!!r[5],id:r[0]};});}
    var all=mk(K.sei,"sei").concat(mk(K.daku,"daku"),mk(K.han,"han"),mk(K.you,"you"));
    var by={h:{},k:{}};all.forEach(function(x){by.h[x.h]=x;by.k[x.k]=x;});
    var look={h:{},k:{}};
    K.look_h.forEach(function(g){g.forEach(function(c){
      if(by.h[c])look.h[c]=(look.h[c]||[]).concat(g.filter(function(x){return x!==c&&by.h[x];}));});});
    K.look_k.forEach(function(g){g.forEach(function(c){
      if(by.k[c])look.k[c]=(look.k[c]||[]).concat(g.filter(function(x){return x!==c&&by.k[x];}));});});
    var snd={};
    K.sound.forEach(function(g){g.forEach(function(r){
      snd[r]=(snd[r]||[]).concat(g.filter(function(x){return x!==r;}));});});
    return {all:all,by:by,look:look,snd:snd,quizable:all.filter(function(x){return !x.rare;}),
      alt:K.alt,conflict:K.conflict,grid:K.grid,heads:K.heads,small:K.small,
      look_h:K.look_h,look_k:K.look_k};
  },

  statOf:function(id){return TK.stat[id]||(TK.stat[id]={c:0,w:0});},

  drawMastery:function(){
    var el=document.getElementById("mCount");if(!el||!TK.kana)return;
    var q=TK.kana.quizable;
    var done=q.filter(function(x){var s=TK.statOf(x.id);return s.c>=3&&s.c>s.w;}).length;
    el.textContent=done+" / "+q.length;
    document.getElementById("mFill").style.width=(done/q.length*100).toFixed(1)+"%";
    var d=document.getElementById("mDays");
    if(d)d.textContent=TK.profile.days>0?(TK.profile.days+" "+TK.t("today")):"";
    /* a small daily target does more for coming back than a total ever does */
    var g=document.getElementById("goal");
    if(g){
      var n=Math.min(TK.profile.today||0,TK.GOAL),pctG=n/TK.GOAL*100;
      var done=n>=TK.GOAL;
      g.querySelector(".ring").className="ring"+(done?" done":"");
      g.querySelector(".ring").style.background=
        "conic-gradient(var(--gold) 0% "+pctG+"%,rgba(255,255,255,.22) "+pctG+"% 100%)";
      g.querySelector(".txt").textContent=done
        ? TK.t("goalDone")
        : TK.t("goalToday")+" "+(TK.profile.today||0)+" / "+TK.GOAL;
    }
  },

  /* every element carrying data-t gets its text, in the current language */
  paintText:function(root){
    var sc=(root||document).querySelectorAll("[data-t]");
    [].forEach.call(sc,function(el){el.textContent=TK.t(el.dataset.t);});
    [].forEach.call(document.querySelectorAll("#langs button"),function(b){
      b.setAttribute("aria-pressed",b.dataset.lang===TK.lang);});
    document.documentElement.lang=TK.lang==="ja"?"ja":(TK.lang==="si"?"si":"en");
    TK.drawMastery();
  },

  /* The settings sheet is shared. Pages drop their own groups into #sheetSlot. */
  buildSheet:function(){
    if(document.getElementById("sheet"))return;
    var bar=document.querySelector(".hbar"),langs=document.getElementById("langs");
    if(bar&&langs){
      /* language buttons and the gear travel together, so the gear can never
         wrap onto a line by itself on a narrow phone */
      var tools=document.createElement("div");
      tools.className="tools";
      langs.parentNode.insertBefore(tools,langs);
      tools.appendChild(langs);
      var b=document.createElement("button");
      b.type="button";b.className="iconbtn";b.id="openSheet";
      b.setAttribute("aria-haspopup","dialog");
      b.setAttribute("aria-label","Settings");
      b.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" '+
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '+
        'stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/>'+
        '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06'+
        'A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09'+
        'A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83'+
        'l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09'+
        'A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83'+
        'l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09'+
        'a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83'+
        'l-.06.06A1.7 1.7 0 0 0 19.4 9v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09'+
        'a1.7 1.7 0 0 0-1.55 1z"/></svg>';
      tools.appendChild(b);
      b.onclick=function(){TK.openSheet(true);};
    }
    var THEMES=[["enji","#7A1B2E"],["ai","#1F3B63"],["matcha","#2F5D46"],["sumi","#2A2A2C"]];
    var d=document.createElement("div");
    d.className="sheet";d.id="sheet";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");
    d.innerHTML='<div class="veil" data-close></div><div class="panel">'+
      '<h2><span data-t="settings" class="si-swap"></span>'+
      '<button class="ghost" data-close data-t="close"></button></h2>'+
      '<div id="sheetSlot"></div>'+
      '<div class="sgroup"><span class="flabel si-swap" data-t="theme"></span>'+
      '<div class="swrap" id="themeChips">'+THEMES.map(function(x){
        return '<button class="swatch" type="button" data-theme-pick="'+x[0]+'" '+
          'aria-label="'+x[0]+'"><i style="background:'+x[1]+'"></i></button>';}).join("")+'</div></div>'+
      '<div class="sgroup"><span class="flabel si-swap" data-t="brightness"></span>'+
      '<div class="swrap" id="schemeChips">'+["auto","light","dark"].map(function(v){
        return '<button class="chip" type="button" data-scheme-pick="'+v+'" data-k="br_'+v+'"></button>';
      }).join("")+'</div></div>'+
      '<div class="sgroup"><span class="flabel si-swap" data-t="textSize"></span>'+
      '<div class="swrap" id="sizeChips">'+["m","l","xl"].map(function(v){
        return '<button class="chip" type="button" data-size-pick="'+v+'" data-k="ts_'+v+'"></button>';
      }).join("")+'</div></div></div>';
    document.body.appendChild(d);
    d.addEventListener("click",function(e){
      if(e.target.closest("[data-close]")){TK.openSheet(false);return;}
      var t1=e.target.closest("[data-theme-pick]");
      if(t1){TK.profile.theme=t1.dataset.themePick;TK.saveProfile();TK.applyLook();TK.paintLook();return;}
      var t2=e.target.closest("[data-scheme-pick]");
      if(t2){TK.profile.scheme=t2.dataset.schemePick;TK.saveProfile();TK.applyLook();TK.paintLook();return;}
      var t3=e.target.closest("[data-size-pick]");
      if(t3){TK.profile.size=t3.dataset.sizePick;TK.saveProfile();TK.applyLook();TK.paintLook();return;}
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape")TK.openSheet(false);});
  },
  openSheet:function(on){
    var d=document.getElementById("sheet");if(!d)return;
    if(on)d.setAttribute("open","");else d.removeAttribute("open");
    document.body.style.overflow=on?"hidden":"";
  },
  paintLook:function(){
    [].forEach.call(document.querySelectorAll("[data-theme-pick]"),function(b){
      b.setAttribute("aria-pressed",b.dataset.themePick===(TK.profile.theme||"enji"));});
    [].forEach.call(document.querySelectorAll("[data-scheme-pick]"),function(b){
      b.setAttribute("aria-pressed",b.dataset.schemePick===(TK.profile.scheme||"auto"));});
    [].forEach.call(document.querySelectorAll("[data-size-pick]"),function(b){
      b.setAttribute("aria-pressed",b.dataset.sizePick===(TK.profile.size||"m"));});
    [].forEach.call(document.querySelectorAll("#sheet .chip[data-k]"),function(b){
      b.textContent=TK.t(b.dataset.k);b.classList.toggle("si",TK.lang==="si");});
  },

  load:function(names){
    return Promise.all(names.map(function(n){
      if(window.KANA_DATA&&window.KANA_DATA[n])return Promise.resolve(window.KANA_DATA[n]);
      return fetch("data-"+n+".json").then(function(r){
        if(!r.ok)throw new Error(n+" "+r.status);return r.json();});
    })).then(function(list){
      names.forEach(function(n,i){TK.data[n]=list[i];});
      return TK.data;
    });
  },

  /* Page scripts register with TK.page(); site.js then runs one init for the
     document. That keeps script order from mattering, and lets several page
     scripts share one document (which is how the offline build works). */
  _pages:[],
  page:function(opts){
    TK._pages.push(opts||{});
    if(TK._queued)return;
    TK._queued=true;
    var go=function(){
      var data=[],paints=[],starts=[],relangs=[];
      TK._pages.forEach(function(o){
        (o.data||[]).forEach(function(n){if(data.indexOf(n)<0)data.push(n);});
        if(o.paint)paints.push(o.paint);
        if(o.start)starts.push(o.start);
        if(o.relang)relangs.push(o.relang);
      });
      TK.init({
        data:data,
        paint:function(){paints.forEach(function(f){f();});},
        relang:function(){relangs.forEach(function(f){f();});}
      }).then(function(){
        starts.forEach(function(f){f();});
      }).catch(function(err){
        var lang=(navigator.language||"en").slice(0,2);
        var msg=(window.__i18nFallback&&window.__i18nFallback[lang])||window.__i18nFallback.en;
        ["card","guideBody","chartBody"].forEach(function(id){
          var el=document.getElementById(id);
          if(el)el.innerHTML='<p style="padding:20px 4px">'+msg+"</p>";});
        if(window.console)console.error(err);
      });
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);
    else setTimeout(go,0);
  },

  /* opts: {data:[names], paint:fn, relang:fn} */
  init:function(opts){
    migrate();
    var prof=jget(P_KEY);
    if(prof){TK.profile=prof;TK.lang=prof.lang||"en";}
    TK.stat=jget(K_KEY)||{};
    TK.applyLook();
    var need=["i18n","kana"].concat(opts.data||[]);
    return TK.load(need).then(function(){
      TK.T=TK.data.i18n;
      TK.kana=TK.buildKana(TK.data.kana);
      TK._paint=opts.paint||function(){};
      var langs=document.getElementById("langs");
      if(langs)langs.onclick=function(e){
        var b=e.target.closest("[data-lang]");if(!b)return;
        TK.lang=b.dataset.lang;TK.saveProfile();
        TK.paintText();TK.paintLook();TK._paint();
        if(opts.relang)opts.relang();
      };
      var here=(location.pathname.split("/").pop()||"index.html").replace(/^$/,"index.html");
      [].forEach.call(document.querySelectorAll("[data-nav][href]"),function(a){
        a.setAttribute("aria-current",a.getAttribute("href")===here?"page":"false");});
      TK.buildSheet();
      TK.paintText();TK.paintLook();TK._paint();
      return TK;
    });
  }
};

window.TK=TK;
})();
