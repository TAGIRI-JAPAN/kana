/* ==========================================================================
   Numbers and time — rules page + practice, on one page.
   Readings are generated from the rules in data-numbers.json, not stored as a
   giant list, so the only thing to correct is an exception table.
   ========================================================================== */
(function(){
"use strict";

var D=null,TIPS=null;           /* data-numbers.json, data-tips.json */
var S={missed:[],mode:"read",len:20,asked:0,right:0,streak:0,ms:0,q:null,locked:false,
       phase:"quiz",t0:0,counter:"tsu"};

function $(s){return document.querySelector(s);}
function t(k){return TK.t(k);}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function rnd(n){return Math.floor(Math.random()*n);}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=rnd(i+1),x=a[i];a[i]=a[j];a[j]=x;}return a;}
function esc(s){return String(s).replace(/[&<>]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
function siC(){return TK.si();}

/* ---------------------------------------------------------------- reading */
/* 0-99 */
function under100(n){
  if(n<10)return D.ones[n];
  var tens=Math.floor(n/10),d=n%10;
  return D.tensPrefix[tens]+"じゅう"+(d?D.ones[d]:"");
}
/* 0-9999 */
function under10000(n){
  var out="";
  var th=Math.floor(n/1000),hu=Math.floor(n%1000/100),rest=n%100;
  if(th)out+=D.thousands[th];
  if(hu)out+=D.hundreds[hu];
  if(rest)out+=under100(rest);
  return out;
}
/* the whole range the site teaches */
function numberReading(n){
  if(n===0)return D.ones[0];
  if(n<10000)return under10000(n);
  var man=Math.floor(n/10000),rest=n%10000;
  var head=(man===1)?"いち"+D.man:under10000(man)+D.man;
  return head+(rest?under10000(rest):"");
}

/* counters: rule + exception table, the same shape the verb material uses */
function counterReading(n,key){
  var c=D.counters[key];
  if(c.whole&&c.whole[n])return c.whole[n];
  /* above 99 the last two digits carry the sound change, the rest is plain */
  if(n>=100){
    var lastTwo=n%100;
    return numberReading(n-lastTwo)+(lastTwo?counterReading(lastTwo,key):c.suffix);
  }
  if(n<10)return (c.last&&c.last[n])?c.last[n]:D.ones[n]+c.suffix;
  var d=n%10,tens=Math.floor(n/10);
  if(d===0)return D.tensPrefix[tens]+(c.ten||("じゅう"+c.suffix));
  return D.tensPrefix[tens]+"じゅう"+((c.last&&c.last[d])?c.last[d]:D.ones[d]+c.suffix);
}
function minuteReading(m){
  if(m===0)return "";
  if(m<10)return D.minutesLast[m];
  var d=m%10,tens=Math.floor(m/10);
  if(d===0)return D.tensPrefix[tens]+D.minutesTen;
  return D.tensPrefix[tens]+"じゅう"+D.minutesLast[d];
}
function timeReading(h,m,useHalf){
  var out=D.hours[h];
  if(m===0)return out;
  if(m===30&&useHalf)return out+" "+D.half;
  return out+" "+minuteReading(m);
}
function pad(n){return (n<10?"0":"")+n;}
/* Some values have a second reading that is also correct (4円 よえん / よんえん,
   7人 しちにん / ななにん, 30分 はん / さんじゅっぷん). None of them may appear
   as a wrong answer. */
function alsoOk(n,key){
  var m=D.alsoOk&&D.alsoOk[key];
  return (m&&m[n])?m[n]:[];
}
function banned(n,key){
  return [counterReading(n,key)].concat(alsoOk(n,key));
}

/* --------------------------------------------------------------- the page */
function renderGuide(){
  var host=$("#numGuide");if(!host||!D)return;
  host.innerHTML=D.guide.map(function(s,i){
    var body=(s.body[TK.lang]||s.body.en).map(function(p){
      return '<p>'+esc(p)+'</p>';}).join("");
    var ex=(s.examples||[]).map(function(e){
      return '<div class="exrow"><span class="exr" style="min-width:5em">'+esc(e.num)+'</span>'+
        '<span class="exk" style="min-width:9em">'+esc(e.kana)+'</span>'+
        '<span class="exg">'+esc(e.gloss||"")+'</span></div>';}).join("");
    return '<section class="gsec" id="'+s.id+'"><h2><b>'+(i+1)+'</b>'+
      esc(s.title[TK.lang]||s.title.en)+'</h2>'+body+
      (ex?'<div class="exbox">'+ex+'</div>':"")+'</section>';
  }).join("");
}

/* an SVG clock face — the one thing paper cannot do */
function clockSVG(h,m){
  var hAng=(h%12)*30+m*0.5, mAng=m*6;
  function hand(ang,len,w,col){
    var r=(ang-90)*Math.PI/180;
    return '<line x1="60" y1="60" x2="'+(60+len*Math.cos(r)).toFixed(1)+'" y2="'+
      (60+len*Math.sin(r)).toFixed(1)+'" stroke="'+col+'" stroke-width="'+w+
      '" stroke-linecap="round"/>';
  }
  var ticks="";
  for(var i=0;i<12;i++){
    var a=(i*30-90)*Math.PI/180, big=(i%3===0);
    ticks+='<line x1="'+(60+(big?46:48)*Math.cos(a)).toFixed(1)+'" y1="'+
      (60+(big?46:48)*Math.sin(a)).toFixed(1)+'" x2="'+(60+52*Math.cos(a)).toFixed(1)+
      '" y2="'+(60+52*Math.sin(a)).toFixed(1)+'" stroke="currentColor" stroke-width="'+
      (big?3:1.5)+'" opacity="'+(big?".85":".4")+'"/>';
  }
  return '<svg viewBox="0 0 120 120" class="clock" role="img" aria-label="clock">'+
    '<circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="2" opacity=".25"/>'+
    ticks+hand(hAng,30,5,"currentColor")+hand(mAng,44,3,"currentColor")+
    '<circle cx="60" cy="60" r="3.5" fill="currentColor"/></svg>';
}

/* ------------------------------------------------------------- questions */
var MODES=[["read","nm_read"],["pick","nm_pick"],["clock","nm_clock"],
           ["settime","nm_settime"],["count","nm_count"],["price","nm_price"]];
var LENS=[[20,"len20"],[50,"len50"],[0,"lenInf"]];

function buildChips(){
  $("#numModes").innerHTML=MODES.map(function(m){
    return '<button class="chip" data-nmode="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("");
  $("#numModes").onclick=function(e){
    var b=e.target.closest("[data-nmode]");if(!b)return;
    S.mode=b.dataset.nmode;start();
    try{if(b.scrollIntoView)b.scrollIntoView({block:"nearest",inline:"nearest"});}catch(err){}
  };
  $("#sheetSlot").innerHTML=
    '<div class="sgroup"><span class="flabel" data-t="lblLen"></span>'+
    '<div class="swrap lane" id="numLens">'+LENS.map(function(m){
      return '<button class="chip" data-nlen="'+m[0]+'" data-k="'+m[1]+'"></button>';}).join("")+
    '</div></div>';
  $("#numLens").onclick=function(e){
    var b=e.target.closest("[data-nlen]");if(!b)return;
    S.len=parseInt(b.dataset.nlen,10);start();};
  $("#numSettings").onclick=function(){TK.openSheet(true);};
  var pb=$("#printBtn");if(pb)pb.onclick=function(){window.print();};
}
function paint(){
  /* paint runs once before start(), and again on every language switch */
  D=D||(TK.data&&TK.data.numbers);
  if(!D||!document.getElementById("numGuide"))return;
  [].forEach.call(document.querySelectorAll("#numModes .chip,#numLens .chip"),function(b){
    b.textContent=t(b.dataset.k);});
  [].forEach.call(document.querySelectorAll("[data-nmode]"),function(b){
    b.setAttribute("aria-pressed",b.dataset.nmode===S.mode);});
  [].forEach.call(document.querySelectorAll("[data-nlen]"),function(b){
    b.setAttribute("aria-pressed",parseInt(b.dataset.nlen,10)===S.len);});
  var m=MODES.filter(function(x){return x[0]===S.mode;})[0];
  var bits=["<b>"+t(m[1])+"</b>",t(LENS.filter(function(x){return x[0]===S.len;})[0][1])];
  if($("#numNow"))$("#numNow").innerHTML=bits.join(" &middot; ");
  renderGuide();
}

function start(){
  S.asked=0;S.right=0;S.streak=0;S.ms=0;S.missed=[];S.phase="quiz";
  paint();updateScore();newQ();
}

function shell(inner){
  var pct=S.len?Math.min(100,S.asked/S.len*100):0;
  $("#numCard").innerHTML=
    '<div class="corner">'+(S.len?(S.asked+1)+" / "+S.len:"Q"+(S.asked+1))+'</div>'+
    (S.len?'<div class="bar"><i style="width:'+pct+'%"></i></div>':"")+
    '<p class="ask" id="nAsk"></p><div class="stage" id="nStage"></div>'+inner+
    '<div class="verdict" id="nVerdict" role="status" aria-live="polite"></div>'+
    '<div id="nExpl"></div>'+
    '<div class="rowbtns">'+
    '<button class="ghost" id="nNext" disabled>'+t("btnNext")+'</button>'+
    '<button class="ghost alt" id="nSkip">'+t("btnSkip")+'</button>'+
    (S.len?'<button class="ghost alt" id="nStop">'+t("btnEnd")+'</button>':"")+'</div>';
  $("#nNext").onclick=newQ;
  $("#nSkip").onclick=doSkip;
  var st=$("#nStop");if(st)st.onclick=result;
}

/* which rule a question turns on, so the explanation can name it */
function ruleForNumber(n){
  if(n>=10000)return "man";
  var hu=Math.floor(n%1000/100),th=Math.floor(n/1000);
  if(hu===3||hu===6||hu===8)return "hyaku";
  if(th===1||th===3||th===8)return "sen";
  if(hu)return "hyaku";
  if(th)return "sen";
  return null;
}
function ruleForTime(h,m){
  if(m===30)return "half";
  if(h===4||h===7||h===9)return "hour";
  if(m)return "minute";
  return "hour";
}

/* wrong answers are built from the mistake the rule predicts, not from noise */
function naiveNumber(n){
  var s=under10000(n);
  return s.replace("さんびゃく","さんひゃく").replace("ろっぴゃく","ろくひゃく")
          .replace("はっぴゃく","はちひゃく").replace("さんぜん","さんせん")
          .replace("はっせん","はちせん");
}
function options(correct,makers,n){
  var out=[correct],guard=0;
  while(out.length<4&&guard++<80){
    var c=pick(makers)();
    if(c&&out.indexOf(c)<0)out.push(c);
  }
  return shuffle(out);
}

function newQ(){
  if(S.len&&S.asked>=S.len){result();return;}
  S.locked=false;
  shell('<div class="opts" id="nOpts"></div>');
  $("#nOpts").onclick=function(e){
    var b=e.target.closest(".opt");if(b&&!S.locked)answer(parseInt(b.dataset.i,10));};
  var ask=$("#nAsk"),stage=$("#nStage");

  if(S.mode==="read"||S.mode==="pick"||S.mode==="price"){
    var big=(S.mode==="price")||Math.random()<.45;
    var n=big?(10+rnd(9990)):(1+rnd(99));
    if(S.mode==="price")n=pick([1,2,3,5,8])*pick([10,100,1000])+rnd(10)*pick([1,10]);
    if(n<1)n=1;
    var correct=(S.mode==="price")?counterReading(n,"en"):numberReading(n);
    var shown=(S.mode==="price")?("¥"+n.toLocaleString("en-US")):n.toLocaleString("en-US");
    var ban=(S.mode==="price")?banned(n%100,"en").concat([correct]):[correct];
    var makers=[
      function(){var v=(S.mode==="price")?naiveNumber(n)+"えん":naiveNumber(n);
                 if(v===correct)return null;
                 /* よんえん is a real way to say 4円, so it cannot be wrong */
                 for(var i=0;i<ban.length;i++)if(v.slice(-ban[i].length)===ban[i])return null;
                 return v;},
      function(){var m=n+pick([-3,-2,-1,1,2,3,10,-10,100,-100]);
                 if(m<1)return null;
                 return (S.mode==="price")?counterReading(m,"en"):numberReading(m);},
      function(){var m=n+pick([1,-1,2,-2,20,-20,1000,-1000]);
                 if(m<1)return null;
                 return (S.mode==="price")?counterReading(m,"en"):numberReading(m);}
    ];
    if(S.mode==="pick"){
      ask.textContent=t("nask_pick");
      stage.innerHTML='<div class="reading">'+correct+'</div>';
      var nums=[shown],g=0;
      while(nums.length<4&&g++<60){
        var m2=n+pick([-3,-2,-1,1,2,3,10,-10,100,-100,1000,-1000]);
        if(m2<1)continue;
        var v2=(S.mode==="price"?"¥":"")+m2.toLocaleString("en-US");
        if(nums.indexOf(v2)<0)nums.push(v2);
      }
      S.q={answer:shown,teach:numberReading(n)+" = "+shown,rule:ruleForNumber(n)};
      render(shuffle(nums),"num");
    }else{
      ask.textContent=t(S.mode==="price"?"nask_price":"nask_read");
      stage.innerHTML='<div class="numbig">'+shown+'</div>';
      S.q={answer:correct,teach:shown+" = "+correct,rule:ruleForNumber(n)};
      render(options(correct,makers,n),"kana");
    }
    S.t0=Date.now();return;
  }

  if(S.mode==="clock"||S.mode==="settime"){
    var FIVE=[0,5,10,15,20,25,30,35,40,45,50,55];
    var h=1+rnd(12);
    var mm=(S.mode==="clock")?pick(FIVE)
      :pick(FIVE.concat([1,3,4,6,7,8,9,12,17,23,38,47,58]));
    var reading=timeReading(h,mm,true);
    var digital=h+":"+pad(mm);
    if(S.mode==="clock"){
      ask.textContent=t("nask_clock");
      stage.innerHTML=clockSVG(h,mm);
      var alts=[reading],g2=0;
      while(alts.length<4&&g2++<80){
        var h2=h,m2b=mm;
        if(Math.random()<.5)h2=1+rnd(12);else m2b=pick(FIVE);
        /* the same clock time must never appear twice — 5:30 can be said as
           both ごじはん and ごじさんじゅっぷん, and both would be right */
        if(h2===h&&m2b===mm)continue;
        var v=timeReading(h2,m2b,Math.random()<.7);
        var other=timeReading(h,mm,!( mm===30));
        if(v===other)continue;
        if(alts.indexOf(v)<0)alts.push(v);
      }
      S.q={answer:reading,teach:digital+" = "+reading,rule:ruleForTime(h,mm)};
      render(shuffle(alts),"kana");
    }else{
      ask.textContent=t("nask_settime");
      stage.innerHTML='<div class="reading">'+reading+'</div>';
      var ds=[digital],g3=0;
      while(ds.length<4&&g3++<80){
        var hh=1+rnd(12),m3=pick(FIVE.concat([1,3,4,6,8]));
        if(hh===h&&m3===mm)continue;
        var v3=hh+":"+pad(m3);
        if(ds.indexOf(v3)<0)ds.push(v3);
      }
      S.q={answer:digital,teach:reading+" = "+digital,rule:ruleForTime(h,mm)};
      render(shuffle(ds),"num");
    }
    S.t0=Date.now();return;
  }

  /* counters */
  var keys=Object.keys(D.counters).filter(function(k){return k!=="en";});
  var key=pick(keys),c=D.counters[key];
  var max=Math.min(c.max,(key==="tsu")?10:((key==="nichi")?31:30));
  var cn=1+rnd(max);
  var cr=counterReading(cn,key);
  ask.textContent=t("nask_count");
  stage.innerHTML='<div class="numbig">'+cn+'<span class="cunit">'+c.jp.replace("〜","")+'</span></div>'+
    '<div class="sub">'+esc(c[TK.lang]||c.en)+'</div>';
  var ban=banned(cn,key);
  var copts=[cr],g4=0;
  while(copts.length<4&&g4++<120){
    var alt=null,r=Math.random();
    if(r<.45)alt=D.ones[cn%10||1]+c.suffix;                 /* the regular guess */
    else if(r<.8)alt=counterReading(1+rnd(max),key);
    else alt=counterReading(cn,pick(keys));
    if(alt&&copts.indexOf(alt)<0&&ban.indexOf(alt)<0)copts.push(alt);
  }
  S.q={answer:cr,teach:cn+c.jp.replace("〜","")+" = "+cr,
       rule:(c.whole&&c.whole[cn])?"counterIrregular":"counter"};
  render(shuffle(copts),"kana");
  S.t0=Date.now();
}

function render(list,cls){
  /* a long reading in a half-width card has to come down a size or it wraps
     in the middle of a word */
  var longest=list.reduce(function(n,o){return Math.max(n,o.length);},0);
  var base=(cls==="kana")?"kana":"numopt";
  var size=(longest>9)?" xlong":(longest>6?" long":"");
  $("#nOpts").innerHTML=list.map(function(o,i){
    return '<button class="opt" data-i="'+i+'"><span class="num">'+(i+1)+'</span>'+
      '<span class="main '+base+size+'">'+esc(o)+'</span></button>';}).join("");
  S.q.list=list;
}
function answer(i){
  if(S.locked||!S.q)return;
  S.q.chosen=S.q.list[i];
  var ok=S.q.list[i]===S.q.answer;
  [].forEach.call(document.querySelectorAll("#nOpts .opt"),function(el,idx){
    el.disabled=true;
    if(S.q.list[idx]===S.q.answer)el.dataset.state="ok";
    else if(idx===i)el.dataset.state="ng";});
  finish(ok);
}
function doSkip(){
  if(S.locked||!S.q)return;
  S.q.chosen=null;
  [].forEach.call(document.querySelectorAll("#nOpts .opt"),function(el,idx){
    el.disabled=true;
    if(S.q.list[idx]===S.q.answer)el.dataset.state="ok";});
  finish(false);
}
function finish(ok){
  S.locked=true;TK.bumpDays();
  S.ms+=Math.min(Date.now()-S.t0,60000);S.asked++;
  if(ok){S.right++;S.streak++;}else S.streak=0;
  var v=$("#nVerdict");
  v.className="verdict "+(ok?"ok":"ng");
  v.innerHTML='<span class="tag">'+(ok?t("ok"):t("ng"))+"</span><b>"+esc(S.q.teach)+"</b>";
  var nb=$("#nNext");if(nb)nb.disabled=false;
  numExpl(ok);
  updateScore();
  if(ok)setTimeout(function(){if(S.locked&&S.phase==="quiz")newQ();},800);
}
/* Name the rule the question turns on. On a miss it is the whole point of the
   question; on a hit it still reinforces why the answer looked odd. */
function numExpl(ok){
  var host=$("#nExpl");if(!host)return;
  var key=S.q.rule;
  if(ok||!key||!TIPS||!TIPS.rules[key]){host.innerHTML="";return;}
  var r=TIPS.rules[key];
  if(S.missed.indexOf(key)<0)S.missed.push(key);
  host.innerHTML='<div class="expl"><span class="lab">'+t("labRule")+'</span>'+
    '<p class="nt">'+esc(r[TK.lang]||r.en)+'</p></div>';
}

function updateScore(){
  $("#nAsked").textContent=S.asked;
  $("#nRate").textContent=S.asked?Math.round(S.right/S.asked*100)+"%":"-";
  var st=$("#nStreak");st.textContent=S.streak;st.classList.toggle("hot",S.streak>=5);
  $("#nSpeed").textContent=S.asked?(S.ms/S.asked/1000).toFixed(1):"-";
}
/* the rules this session actually broke */
function numRecap(){
  if(!S.missed.length||!TIPS)return "";
  return '<div class="recap"><h3>'+t("recapTitle")+'</h3>'+
    S.missed.slice(0,5).map(function(k){
      var r=TIPS.rules[k];
      return '<div class="item"><p style="margin:0">'+esc(r[TK.lang]||r.en)+'</p></div>';
    }).join("")+'</div>';
}
function result(){
  S.phase="result";
  var rate=S.asked?Math.round(S.right/S.asked*100):0,deg=Math.round(rate*3.6);
  var avg=S.asked?(S.ms/S.asked/1000).toFixed(1):"-";
  $("#numCard").innerHTML=
    '<div class="result"><div class="corner">RESULT</div><h2>'+t("resTitle")+'</h2>'+
    '<div class="gauge" style="background:conic-gradient(var(--gold) 0deg '+deg+
    'deg,var(--rule) '+deg+'deg 360deg)"><span>'+rate+'<i>%</i></span></div>'+
    '<p style="margin:12px 0 0;font-size:.85rem;color:var(--ink-soft)">'+S.right+' / '+S.asked+
    ' &nbsp;&middot;&nbsp; '+t("resSpeed")+': '+avg+'s</p>'+
    numRecap()+
    '<div class="rowbtns" style="margin-top:20px;justify-content:center">'+
    '<button class="ghost" id="nAgain">'+t("btnAgain")+'</button></div></div>';
  $("#nAgain").onclick=start;
}

TK.page({data:["numbers","tips"],paint:paint,relang:function(){
  if(!document.getElementById("numCard"))return;
  if(S.phase==="result")result();else newQ();
},start:function(){
  if(!document.getElementById("numCard"))return;
  D=TK.data.numbers;TIPS=TK.data.tips;
  buildChips();paint();updateScore();start();
}});
})();
