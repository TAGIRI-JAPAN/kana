/* ==========================================================================
   Rules page + printable chart. Both are rendered from data:
   the prose from guide.json, the tables from kana.json — so the look-alike
   list on the page can never drift from the one the drill actually uses.
   ========================================================================== */
(function(){
"use strict";

function esc(s){return String(s).replace(/[&<>]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}

/* ------------------------------------------------------------ rules page */
function renderGuide(){
  var host=document.getElementById("guideBody");
  if(!host)return;
  var secs=TK.data.guide.sections,si=TK.si();

  host.innerHTML=
    '<nav class="toc" aria-label="contents">'+secs.map(function(s,i){
      return '<a href="#'+s.id+'"><b>'+(i+1)+'</b> '+esc(s.title[TK.lang]||s.title.en)+'</a>';
    }).join("")+'<a href="#lookalike"><b>'+(secs.length+1)+'</b> '+TK.t("lookTitle")+'</a></nav>'+
    secs.map(function(s,i){
      var body=(s.body[TK.lang]||s.body.en).map(function(p){
        return '<p class="'+si+'">'+esc(p)+'</p>';}).join("");
      var ex=(s.examples&&s.examples.length)?
        '<div class="exbox"><div class="exlabel '+si+'">'+TK.t("example")+'</div>'+
        s.examples.map(function(e){
          return '<div class="exrow"><span class="exk">'+esc(e.kana)+'</span>'+
            '<span class="exr">'+esc(e.romaji)+'</span>'+
            '<span class="exg">'+esc(e.gloss||"")+'</span></div>';}).join("")+'</div>':"";
      return '<section class="gsec" id="'+s.id+'"><h2><b>'+(i+1)+'</b>'+
        esc(s.title[TK.lang]||s.title.en)+'</h2>'+body+ex+'</section>';
    }).join("")+
    '<section class="gsec" id="lookalike"><h2><b>'+(secs.length+1)+'</b>'+
      TK.t("lookTitle")+'</h2><p class="'+si+'">'+TK.t("lookNote")+'</p>'+
      lookTable()+'</section>'+
    '<p class="gcta"><a class="ghost" href="drill.html">'+TK.t("backToDrill")+'</a></p>';
}

/* Built from the same groups the question generator uses, with the same tip
   the drill shows when a learner picks the wrong one of a pair. */
function tipText(chars){
  var T2=TK.data.tips;
  if(!T2)return "";
  for(var i=0;i<T2.kana.length;i++){
    var c=T2.kana[i].chars,hit=0;
    for(var j=0;j<chars.length;j++)if(c.indexOf(chars[j])>=0)hit++;
    if(hit>=2)return T2.kana[i].tip[TK.lang]||T2.kana[i].tip.en;
  }
  return "";
}
function lookTable(){
  var K=TK.data.kana;
  function block(groups,label){
    return '<div class="lookcol"><h3>'+label+'</h3>'+
      groups.map(function(g){
        var tip=tipText(g);
        return '<div class="lookrow">'+g.map(function(c){
          return '<span class="lk">'+c+'</span>';}).join('<i>/</i>')+'</div>'+
          (tip?'<p class="looktip">'+esc(tip)+'</p>':"");
      }).join("")+'</div>';
  }
  return '<div class="lookwrap">'+block(K.look_h,"ひらがな")+block(K.look_k,"カタカナ")+'</div>';
}

/* -------------------------------------------------------- printable chart */
function renderChart(){
  var host=document.getElementById("chartBody");
  if(!host)return;
  var K=TK.kana,by=K.by;

  function cell(ch){
    if(!ch)return '<div class="ccell hole"></div>';
    var x=by.h[ch];
    if(!x)return '<div class="ccell hole"></div>';
    return '<div class="ccell'+(x.rare?" rare":"")+'">'+
      '<div class="ckana">'+x.h+'<em>'+x.k+'</em></div>'+
      '<div class="crom">'+x.r+'</div>'+
      '<div class="csi si">'+x.s+'</div></div>';
  }
  function section(title,rows,cols){
    return '<section class="csec"><h2>'+title+'</h2>'+
      '<div class="cgrid c'+cols+'">'+rows.join("")+'</div></section>';
  }

  var sei=K.grid.map(function(r){return r.map(cell).join("");});
  sei.push(cell("ん")+'<div class="ccell hole"></div><div class="ccell hole"></div>'+
    '<div class="ccell hole"></div><div class="ccell hole"></div>');

  function plain(set){
    return [K.all.filter(function(x){return x.set===set;})
      .map(function(x){return cell(x.h);}).join("")];
  }

  host.innerHTML=
    section(TK.t("st_sei"),sei,5)+
    section(TK.t("st_daku"),plain("daku"),5)+
    section(TK.t("st_han"),plain("han"),5)+
    section(TK.t("st_you"),plain("you"),3);
}

function paint(){renderGuide();renderChart();}

TK.page({data:document.getElementById("guideBody")?["guide","tips"]:[],paint:paint,start:function(){
  var pb=document.getElementById("printBtn");
  if(pb)pb.onclick=function(){window.print();};
}});
})();
