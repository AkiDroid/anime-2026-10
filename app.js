(function(){
const D=window.ANIME_DATA, META=window.ANIME_META;
const WD=['周一','周二','周三','周四','周五','周六','周日'];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TBD='<span class="tbd">待定</span>';
const state={q:'',wd:'',kind:'',fmt:'',genre:'',sort:'date-asc',view:'grid'};
const wdOf=d=>new Date(d+'T00:00:00Z').getUTCDay();
const cn=['日','一','二','三','四','五','六'];
function fmtDate(iso){if(!iso)return null;const [y,m,d]=iso.split('-');return `${+m}月${+d}日（${cn[wdOf(iso)]}）`}
function title(o){return o.zh||o.ja}
function sub(o){return o.zh?o.ja:(o.romaji||'')}
function pending(o){return o.realDate<'2026-10-01'||o.realDate>'2026-10-31'}
D.forEach(o=>{o._hay=[o.zh,o.ja,o.romaji,o.en,...(o.studios||[]),...(o.cast||[]).map(c=>c.cv+c.role),o.tv].filter(Boolean).join('|').toLowerCase()});

// stats
const cnt=f=>D.filter(f).length;
$('#stats').innerHTML=[[D.length,'部作品'],[cnt(o=>o.fmtKey==='TV'||o.fmtKey==='TV_SHORT'),'TV 动画'],[cnt(o=>!o.isSequel),'新作'],[cnt(o=>o.isSequel),'续作'],[cnt(o=>o.fmtKey==='MOVIE'),'剧场版']]
 .map(([n,t])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join('');

// selects
const opt=(v,t)=>`<option value="${esc(v)}">${esc(t)}</option>`;
$('#fWeekday').innerHTML=opt('','全部')+WD.map((w,i)=>opt(i,w)).join('')+opt('na','待定');
const fmts=[...new Set(D.map(o=>o.format))];
$('#fFormat').innerHTML=opt('','全部')+fmts.map(f=>opt(f,f)).join('');
const gc={};D.forEach(o=>o.genres.forEach(g=>gc[g]=(gc[g]||0)+1));
$('#fGenre').innerHTML=opt('','全部')+Object.entries(gc).sort((a,b)=>b[1]-a[1]).map(([g,n])=>opt(g,`${g} (${n})`)).join('');

function passes(o){
  if(state.q){const q=state.q.toLowerCase();if(!q.split(/\s+/).every(t=>o._hay.includes(t)))return false}
  if(state.wd!==''){ if(state.wd==='na'){if(o.time)return false} else if(!(o.time&&o.weekday==+state.wd))return false }
  if(state.kind==='new'&&o.isSequel)return false;
  if(state.kind==='seq'&&!o.isSequel)return false;
  if(state.fmt&&o.format!==state.fmt)return false;
  if(state.genre&&!o.genres.includes(state.genre))return false;
  return true;
}
function sorted(list){
  const a=[...list];
  const k=state.sort;
  if(k==='date-asc')a.sort((x,y)=>(x.realDate+(x.realTime||'99')).localeCompare(y.realDate+(y.realTime||'99')));
  if(k==='date-desc')a.sort((x,y)=>(y.realDate+(y.realTime||'00')).localeCompare(x.realDate+(x.realTime||'00')));
  if(k==='pop')a.sort((x,y)=>(y.popularity||0)-(x.popularity||0));
  if(k==='title')a.sort((x,y)=>title(x).localeCompare(title(y),'ja'));
  return a;
}
function cover(o,cls){
  const c1=o.color||'#7c5cff';
  const ph=`<div class="ph" style="--c1:${esc(c1)}">${esc(title(o))}</div>`;
  const src=o.cover||o.coverRemote;
  if(!src)return ph;
  return `${ph}<img src="${esc(src)}" alt="${esc(title(o))} 封面" onerror="if(!this.dataset.r&&'${esc(o.coverRemote||'')}'){this.dataset.r=1;this.src='${esc(o.coverRemote||'')}'}else{this.remove()}">`;
}
function whenChips(o){
  const d=fmtDate(o.realDate);
  let t;
  if(o.realTime){ t=`<span class="chip hl">${o.realTime}</span>`; }
  else t=`<span class="chip tbd">时间待定</span>`;
  return `<span class="chip">${d||TBD}</span>${t}`;
}
function card(o){
  const seq=o.isSequel?'<span class="tag-seq">续作</span>':'<span class="tag-new">新作</span>';
  return `<button class="card" data-id="${o.id}" aria-label="${esc(title(o))}">
    <div class="cover">${cover(o)}<span class="tag-fmt">${esc(o.format)}</span>${seq}</div>
    <div class="info"><div class="t1">${esc(title(o))}</div><div class="t2">${esc(sub(o))}</div>
    <div class="when">${whenChips(o)}</div></div></button>`;
}
function renderGrid(list){
  $('#grid').innerHTML=list.map(card).join('');
  $('#empty').hidden=list.length>0;
}
function renderWeek(list){
  const days=WD.map(()=>[]);const extra=[];
  list.forEach(o=>{ if(o.time&&o.weekday!=null&&(o.fmtKey!=='MOVIE'))days[o.weekday].push(o); else extra.push(o)});
  days.forEach(a=>a.sort((x,y)=>x.time.localeCompare(y.time)||title(x).localeCompare(title(y))));
  $('#week').innerHTML=days.map((a,i)=>`<div class="day"><h3>${WD[i]}<small>${a.length} 部</small></h3>${
    a.length?a.map(o=>`<button class="slot" data-id="${o.id}"><span class="tm">${o.time}</span><span class="nm">${esc(title(o))}<i>${esc(o.tv||o.studios[0]||'')}</i></span></button>`).join(''):'<div class="none">—</div>'}</div>`).join('');
  $('#weekExtra').innerHTML=extra.length?`<div class="extra"><h3>播出时间待定 / 剧场版 / 其他（${extra.length}）</h3><div class="grid">${sorted(extra).map(card).join('')}</div></div>`:'';
}
function render(){
  const list=sorted(D.filter(passes));
  $('#count').textContent=`共 ${list.length} / ${D.length} 部`;
  $('#clearQ').hidden=!state.q;
  if(state.view==='grid'){renderGrid(list)}else{renderWeek(list)}
  $('#gridView').hidden=state.view!=='grid';$('#weekView').hidden=state.view!=='week';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===state.view));
}
// modal
function kv(k,v){return `<dt>${k}</dt><dd>${v||TBD}</dd>`}
function openModal(id){
  const o=D.find(x=>x.id==id);if(!o)return;
  const chips=[`<span class="chip">${esc(o.format)}</span>`,`<span class="chip hl">${o.isSequel?'续作':'新作'}</span>`,...o.genres.map(g=>`<span class="chip">${esc(g)}</span>`)].join('');
  const real=o.realDate?`${fmtDate(o.realDate)}${o.realTime?' '+o.realTime:''}`:null;
  const ttOnly=o.time&&(+o.time.slice(0,2)>=24);
  let tt=null;
  if(o.time){tt=`每${WD[o.weekday]} ${o.time}`+(ttOnly?`（深夜档，实际为次日 ${o.realTime}）`:'')}
  const tv=[o.tv,o.tvOther].filter(Boolean).join('；');
  const stream=(o.streaming||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site)}</a>`).join(' · ');
  const staff=Object.entries(o.staff||{}).map(([k,v])=>kv(esc(k),esc(v))).join('');
  const cast=(o.cast||[]).length?`<div class="m-sec"><h4>主要声优</h4><div class="cast">${o.cast.map(c=>`<div>${esc(c.cv)}<span>饰 ${esc(c.role)}</span></div>`).join('')}</div></div>`:'';
  let syn;
  if(o.synopsis){
    const note=o.synopsisLang==='zh'?`简介来源：${esc(o.synopsisSrc)}`:o.synopsisLang==='en'?`暂无中文简介，以下为英文简介（来源：${esc(o.synopsisSrc)}）`:`暂无中文简介，以下为日文简介（来源：${esc(o.synopsisSrc)}）`;
    syn=`<div class="syn">${esc(o.synopsis)}</div><div class="srcnote">${note}</div>`;
    if(o.synopsisJa)syn+=`<details class="orig"><summary>查看日文简介原文</summary><div class="syn" style="margin-top:8px">${esc(o.synopsisJa)}</div></details>`;
  }else syn=TBD;
  const links=[];
  if(o.official)links.push(`<a class="btn" href="${esc(o.official)}" target="_blank" rel="noopener">官方网站</a>`);
  if(o.twitter)links.push(`<a class="btn alt" href="${esc(o.twitter)}" target="_blank" rel="noopener">官方 X/Twitter</a>`);
  if(o.bgmId)links.push(`<a class="btn alt" href="https://bgm.tv/subject/${o.bgmId}" target="_blank" rel="noopener">Bangumi</a>`);
  links.push(`<a class="btn alt" href="${esc(o.anilistUrl)}" target="_blank" rel="noopener">AniList</a>`);
  if(o.malId)links.push(`<a class="btn alt" href="https://myanimelist.net/anime/${o.malId}" target="_blank" rel="noopener">MyAnimeList</a>`);
  const warn=[];
  if(o.dateConflict)warn.push(`Bangumi 记录的首播日为 ${o.bgmDate}，与 AniList 不一致，请以官方公布为准。`);
  if(!o.time&&o.fmtKey!=='MOVIE')warn.push('具体播出时间尚未在数据源中公布。');
  $('#mBody').innerHTML=`<div class="m-head">
    <div class="m-cover">${cover(o)}</div>
    <div class="m-main"><h2 id="mTitle">${esc(title(o))}</h2>
      ${o.zh?`<div class="ja">${esc(o.ja)}</div>`:''}<div class="ro">${esc(o.romaji||'')}${o.en&&o.en!==o.romaji?' · '+esc(o.en):''}</div>
      <div class="chips">${chips}</div>
      <dl class="kv">
        ${kv('首播日期（JST）',real&&esc(real))}
        ${kv('播出时间（周表）',tt&&esc(tt))}
        ${kv('播出电视台',tv&&esc(tv))}
        ${kv('网络配信',stream)}
        ${kv('制作公司',(o.studios||[]).length&&esc(o.studios.join(' / ')))}
        ${kv('话数',o.episodes&&`${o.episodes} 话${o.duration?'（每话约 '+o.duration+' 分钟）':''}`)}
        ${kv('原作类型',o.source&&esc(o.source))}
        ${o.prequel?kv('前作',esc(o.prequel)):''}
        ${staff}
      </dl>
      ${warn.map(w=>`<div class="warn">⚠ ${esc(w)}</div>`).join('')}
    </div></div>
    <div class="m-sec"><h4>剧情简介</h4>${syn}</div>${cast}
    <div class="m-sec"><h4>相关链接</h4><div class="links">${links.join('')}</div></div>`;
  $('#modal').hidden=false;document.body.style.overflow='hidden';
  $('.sheet').scrollTop=0;
  history.replaceState(null,'','#'+o.id);
}
function closeModal(){$('#modal').hidden=true;document.body.style.overflow='';history.replaceState(null,'',location.pathname+location.search)}
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-id]');if(c&&!e.target.closest('#modal'))return openModal(c.dataset.id);
  if(e.target.id==='modal'||e.target.id==='mClose')closeModal();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)closeModal()});
// events
$('#q').addEventListener('input',e=>{state.q=e.target.value.trim();render()});
$('#clearQ').onclick=()=>{$('#q').value='';state.q='';render()};
[['fWeekday','wd'],['fKind','kind'],['fFormat','fmt'],['fGenre','genre'],['sort','sort']].forEach(([id,k])=>$('#'+id).addEventListener('change',e=>{state[k]=e.target.value;render()}));
$('#reset').onclick=()=>{Object.assign(state,{q:'',wd:'',kind:'',fmt:'',genre:'',sort:'date-asc'});$('#q').value='';['fWeekday','fKind','fFormat','fGenre'].forEach(i=>$('#'+i).value='');$('#sort').value='date-asc';render()};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{state.view=t.dataset.view;render();window.scrollTo({top:0})});
$('#themeBtn').onclick=()=>{const cur=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');const n=cur==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};
const p=new URLSearchParams(location.search);if(p.get('view')==='week')state.view='week';
render();
if(/^#\d+$/.test(location.hash))openModal(location.hash.slice(1));
})();
