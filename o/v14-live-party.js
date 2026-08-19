(() => {
'use strict';

const PARTY_API=`${config.supabaseUrl||''}/functions/v1/o-live`;
let partyState=null;
let partyPoll=null;
let partyBusy=false;
let createBusy=false;

const tr=()=>document.body.classList.contains('locale-tr')||document.documentElement.lang==='tr';
const text=(en,trText)=>tr()?trText:en;
const slugFromUrl=()=>{try{return new URLSearchParams(location.search).get('live')}catch{return null}};

async function partyEdge(action,payload={}){
  const r=await fetch(PARTY_API,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,installationId,installationSecret,...payload})});
  const raw=await r.text();let d=null;if(raw){try{d=JSON.parse(raw)}catch{}}
  if(!r.ok){const e=new Error(d?.error||`Live room failed (${r.status})`);e.status=r.status;throw e}
  return d;
}

function ensurePicker(){
  if(document.getElementById('liveModePicker'))return;
  document.body.insertAdjacentHTML('beforeend',`
    <section class="live-mode-picker" id="liveModePicker" aria-hidden="true">
      <button class="live-picker-backdrop" id="livePickerBackdrop" type="button" aria-label="Close"></button>
      <div class="live-picker-panel">
        <header><span>O. LIVE</span><button id="livePickerClose" type="button">×</button></header>
        <div class="live-picker-copy"><small>${text('PRIVATE · 60 SECONDS','ÖZEL ODA · 60 SANİYE')}</small><h2>${text('Choose the arena.','Arena seç.')}</h2><p>${text('Best verified score wins the CROWN.','En iyi doğrulanmış skor TAÇ kazanır.')}</p></div>
        <div class="live-picker-options">
          <button type="button" data-live-size="2"><em>02</em><span><b>${text('DUEL','DÜELLO')}</b><small>${text('YOU + 1 RIVAL','SEN + 1 RAKİP')}</small></span><i>→</i></button>
          <button type="button" data-live-size="3"><em>03</em><span><b>${text('TRIO','3 KİŞİ')}</b><small>${text('YOU + 2 RIVALS','SEN + 2 RAKİP')}</small></span><i>→</i></button>
        </div>
        <footer><span>60 SEC</span><i></i><span>BEST SCORE</span><i></i><span>+1 CROWN</span></footer>
      </div>
    </section>`);
  document.getElementById('livePickerBackdrop')?.addEventListener('click',()=>togglePicker(false));
  document.getElementById('livePickerClose')?.addEventListener('click',()=>togglePicker(false));
  document.querySelectorAll('[data-live-size]').forEach(btn=>btn.addEventListener('click',()=>createPartyRoom(Number(btn.dataset.liveSize)||2)));
}
function togglePicker(open){
  ensurePicker();
  const el=document.getElementById('liveModePicker');
  if(!el)return;
  el.classList.toggle('visible',!!open);el.setAttribute('aria-hidden',open?'false':'true');
}

async function createPartyRoom(maxPlayers){
  if(createBusy)return;
  createBusy=true;
  try{
    await loadProfile();
    if(!profile?.username){togglePicker(false);showToast?.(text('SIGN IN FIRST','ÖNCE GİRİŞ YAP'));return}
    const d=await partyEdge('create',{maxPlayers:maxPlayers===3?3:2});
    const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('live',d.slug);
    location.href=u.toString();
  }catch(e){showToast?.(e?.message||text('LIVE ROOM UNAVAILABLE','CANLI ODA KULLANILAMIYOR'))}
  finally{createBusy=false}
}

// Capture before V8's legacy click listener so LIVE opens the 2P / 3P selector.
document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('#liveDuelButton');
  if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();togglePicker(true);
},true);

function ensureAvatar(root,kind,slot){
  if(!root)return null;
  let av=root.querySelector(`.${kind}[data-${kind==='live-avatar'?'duel':'hud'}-avatar="${slot}"]`);
  if(!av){
    av=document.createElement('div');av.className=kind;
    av.dataset[kind==='live-avatar'?'duelAvatar':'hudAvatar']=slot;
    av.innerHTML='<img alt="" /><span>?</span>';
    root.prepend(av);
  }
  return av;
}
function paintAvatar(root,url,name){
  if(!root)return;
  const img=root.querySelector('img'),fallback=root.querySelector('span');
  if(fallback)fallback.textContent=String(name||'?').trim().slice(0,1).toUpperCase()||'?';
  if(img){
    if(url){if(img.getAttribute('src')!==url)img.src=url;img.classList.add('loaded')}
    else{img.removeAttribute('src');img.classList.remove('loaded')}
  }
}
function directChild(node,selector){try{return node?.querySelector(`:scope > ${selector}`)||null}catch{return node?.querySelector(selector)||null}}

function ensureLobbySlots(){
  const versus=document.querySelector('#liveLobby .live-versus');if(!versus)return null;
  const articles=[...versus.querySelectorAll(':scope > article')];
  const host=articles[0],guest=articles[1];
  if(host){host.dataset.liveSlot='host';ensureAvatar(host,'live-avatar','host')}
  if(guest){guest.dataset.liveSlot='guest';ensureAvatar(guest,'live-avatar','guest')}
  let third=document.getElementById('liveThirdCard');
  if(!third){
    third=document.createElement('article');third.id='liveThirdCard';third.dataset.liveSlot='third';
    third.innerHTML='<div class="live-avatar" data-duel-avatar="third"><img alt="" /><span>?</span></div><span class="live-party-role">PLAYER 3</span><b id="liveThirdName">WAITING…</b><strong id="liveThirdBest">—</strong><small id="liveThirdAttempts">0 ATTEMPTS</small>';
    versus.appendChild(third);
  }
  for(const card of [host,guest,third].filter(Boolean)){
    const role=directChild(card,'span:not(.live-avatar span)');if(role)role.classList.add('live-party-role');
  }
  return{versus,host,guest,third};
}

function ensureHudSlots(){
  const hud=document.getElementById('liveHud');if(!hud)return null;
  const players=[...hud.children].filter(el=>el.tagName==='DIV');
  const host=players[0],guest=players[1];
  if(host){host.dataset.liveSlot='host';ensureAvatar(host,'live-hud-avatar','host')}
  if(guest){guest.dataset.liveSlot='guest';ensureAvatar(guest,'live-hud-avatar','guest')}
  let third=document.getElementById('liveHudThirdBox');
  if(!third){
    third=document.createElement('div');third.id='liveHudThirdBox';third.dataset.liveSlot='third';
    third.innerHTML='<div class="live-hud-avatar" data-hud-avatar="third"><img alt="" /><span>?</span></div><span id="liveHudThirdName">PLAYER 3</span><b id="liveHudThird">—</b>';
    hud.appendChild(third);
  }
  return{hud,host,guest,third};
}

const roomVal=(r,slot,key)=>r?.[`${slot}_${key}`];
function scoreText(v){return v==null?'—':Number(v).toFixed(2)}
function attemptsText(v){const n=Number(v||0);return tr()?`${n} DENEME`:`${n} ATTEMPT${n===1?'':'S'}`}
function roleText(slot,isMine){if(isMine)return tr()?'SEN':'YOU';const n=slot==='host'?1:slot==='guest'?2:3;return tr()?`OYUNCU ${n}`:`PLAYER ${n}`}

function renderLobby(data){
  const room=data?.room;if(!room)return;
  const nodes=ensureLobbySlots();if(!nodes)return;
  const max=Number(data.maxPlayers||room.max_players||2)===3?3:2,role=data.role||'';
  nodes.versus.classList.toggle('party-three',max===3);nodes.third.hidden=max!==3;
  const map={host:nodes.host,guest:nodes.guest,third:nodes.third};
  for(const slot of ['host','guest','third']){
    if(slot==='third'&&max!==3)continue;
    const card=map[slot];if(!card)continue;
    const name=roomVal(room,slot,'name')||text('WAITING…','BEKLENİYOR…');
    const actual=!!roomVal(room,slot,'name');
    card.classList.toggle('you',role===slot);card.classList.toggle('waiting',!actual);
    const label=directChild(card,'span:not(.live-avatar span)');if(label){label.classList.add('live-party-role');label.textContent=roleText(slot,role===slot)}
    const nameEl=card.querySelector('b');if(nameEl)nameEl.textContent=name;
    const best=card.querySelector('strong');if(best)best.textContent=scoreText(roomVal(room,slot,'best'));
    const att=card.querySelector('small');if(att)att.textContent=attemptsText(roomVal(room,slot,'attempts'));
    paintAvatar(card.querySelector('.live-avatar'),roomVal(room,slot,'avatar_url'),name);
  }

  const joined=['host','guest','third'].slice(0,max).filter(s=>!!roomVal(room,s,'name')).length;
  const active=room.status==='active'&&room.expires_at&&new Date(room.expires_at).getTime()>Date.now();
  const finished=room.status==='finished'||(room.expires_at&&new Date(room.expires_at).getTime()<=Date.now());
  const label=document.getElementById('liveClockLabel');
  const copy=document.getElementById('liveLobbyCopy');
  const header=document.querySelector('#liveLobby header div b');
  if(header)header.textContent=max===3?(tr()?'CANLI · 3 KİŞİ':'LIVE · TRIO'):(tr()?'CANLI DÜELLO':'LIVE DUEL');
  if(!finished&&!active){
    if(label)label.textContent=tr()?`${joined}/${max} OYUNCU HAZIR`:`${joined}/${max} PLAYERS READY`;
    if(copy)copy.textContent=max===3
      ? text('The 60-second clock starts when all 3 players are in.','60 saniyelik sayaç 3 oyuncu da odaya girince başlar.')
      : text('The 60-second clock starts when your rival joins.','Rakibin katılınca 60 saniyelik sayaç başlar.');
  }else if(active&&copy){
    copy.textContent=max===3?text('Three players. Unlimited verified attempts. Highest score wins +1 CROWN.','Üç oyuncu. Sınırsız doğrulanmış deneme. En yüksek skor +1 TAÇ kazanır.'):text('Unlimited verified attempts. Best score wins +1 CROWN.','Sınırsız doğrulanmış deneme. En iyi skor +1 TAÇ kazanır.');
  }
}

function renderHud(data){
  const room=data?.room;if(!room)return;
  const nodes=ensureHudSlots();if(!nodes)return;
  const max=Number(data.maxPlayers||room.max_players||2)===3?3:2,role=data.role||'';
  nodes.hud.classList.toggle('party-three',max===3);nodes.third.hidden=max!==3;
  const map={host:nodes.host,guest:nodes.guest,third:nodes.third};
  const nameIds={host:'liveHudYouName',guest:'liveHudRivalName',third:'liveHudThirdName'};
  const scoreIds={host:'liveHudYou',guest:'liveHudRival',third:'liveHudThird'};
  for(const slot of ['host','guest','third']){
    if(slot==='third'&&max!==3)continue;
    const box=map[slot];if(!box)continue;
    const name=roomVal(room,slot,'name')||text('WAITING','BEKLENİYOR');
    box.classList.toggle('you',role===slot);box.dataset.roleLabel=roleText(slot,role===slot);
    const nameEl=document.getElementById(nameIds[slot]);if(nameEl)nameEl.textContent=name;
    const score=document.getElementById(scoreIds[slot]);if(score)score.textContent=scoreText(roomVal(room,slot,'best'));
    paintAvatar(box.querySelector('.live-hud-avatar'),roomVal(room,slot,'avatar_url'),name);
  }
}

function renderParty(data=partyState){
  if(!data?.room)return;
  partyState=data;
  const max=Number(data.maxPlayers||data.room.max_players||2)===3?3:2;
  window.O_LIVE_PARTY3=max===3;
  renderLobby(data);renderHud(data);
  const btn=document.getElementById('liveDuelButton');const sub=btn?.querySelector('small');
  if(sub)sub.textContent=text('2–3 PLAYERS · 60 SEC · +1 CROWN','2–3 OYUNCU · 60 SN · +1 TAÇ');
}
window.O_LIVE_PARTY_RENDER=()=>renderParty(partyState);

async function pollParty(){
  const slug=slugFromUrl();if(!slug||partyBusy||document.hidden)return;
  partyBusy=true;
  try{
    const d=await partyEdge('state',{slug});
    partyState={...d,room:d.room||null};renderParty(partyState);
  }catch(e){
    // V8 may still be joining this installation to the invite. Retry quietly.
    if(![401,403,404].includes(Number(e?.status||0)))console.debug?.('[O.] live party sync',e?.message||e);
  }finally{partyBusy=false}
}

const verifiedBase=applyVerifiedResult;
applyVerifiedResult=function(data){
  const out=verifiedBase(data);
  if(gameMode==='live'&&data?.liveRoom&&partyState){
    const room=Array.isArray(data.liveRoom)?data.liveRoom[0]:data.liveRoom;
    if(room){partyState={...partyState,room};renderParty(partyState)}
    const role=partyState.role||'host';
    const mine=Number(roomVal(room,role,'best')||0);
    const max=Number(partyState.maxPlayers||room?.max_players||2)===3?3:2;
    const rivals=['host','guest','third'].slice(0,max).filter(s=>s!==role).map(s=>Number(roomVal(room,s,'best')||0));
    const leader=Math.max(0,...rivals);
    if(els?.resultRank)els.resultRank.textContent=mine>=leader?text('LIVE LEAD','LİDER'):text('CHASING','TAKİPTE');
    if(els?.resultVerdict)els.resultVerdict.textContent=max===3
      ? (tr()?`Sen ${mine?mine.toFixed(2):'—'} · Rakip lider ${leader?leader.toFixed(2):'—'}`:`You ${mine?mine.toFixed(2):'—'} · Rival lead ${leader?leader.toFixed(2):'—'}`)
      : (tr()?`Sen ${mine?mine.toFixed(2):'—'} · Rakip ${leader?leader.toFixed(2):'—'}`:`You ${mine?mine.toFixed(2):'—'} · Rival ${leader?leader.toFixed(2):'—'}`);
  }
  return out;
};

function boot(){
  ensurePicker();
  const btn=document.getElementById('liveDuelButton');const sub=btn?.querySelector('small');if(sub)sub.textContent=text('2–3 PLAYERS · 60 SEC · +1 CROWN','2–3 OYUNCU · 60 SN · +1 TAÇ');
  ensureLobbySlots();ensureHudSlots();pollParty();
  clearInterval(partyPoll);partyPoll=setInterval(pollParty,900);
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollParty()},{passive:true});
window.addEventListener('pageshow',pollParty,{passive:true});
boot();setTimeout(boot,180);setTimeout(pollParty,700);
})();