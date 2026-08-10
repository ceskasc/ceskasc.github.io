const API='https://jwfuhaoazdgtzpsepvdn.supabase.co/functions/v1/eidos-archive';
const KEY='sb_publishable_CvJWnUH501TEutiZzyfJIg_gP74bsDd';
const INSTALL='eidos.installation.v1',NAME='eidos.nickname.v1';
const $=id=>document.getElementById(id);
const lang=document.documentElement.lang==='tr'?'tr':'en';
const tr=lang==='tr';
const tx={
 bad:tr?'2–20 karakter kullan: harf, rakam, boşluk, nokta, tire veya alt çizgi.':'Use 2–20 letters, numbers, spaces, dots, hyphens or underscores.',
 taken:tr?'Bu kimlik kullanılıyor. Başka bir isim seç.':'That identity already exists. Choose another.',
 offline:tr?'Global arşive şu an ulaşılamıyor. Yerel olarak oynamaya devam edebilirsin.':'The global archive is unavailable. You can keep playing locally.',
 verifying:tr?'İZ DOĞRULANIYOR…':'VERIFYING TRACE…',verified:tr?'DOĞRULANDI':'VERIFIED',local:tr?'YALNIZCA YEREL':'LOCAL ONLY',
 loading:tr?'ARŞİV OKUNUYOR…':'READING THE ARCHIVE…',empty:tr?'Henüz doğrulanmış iz yok. İlk iz seninki olabilir.':'No verified traces yet. Yours could be the first.'
};
const staticCopy=tr?{
 verificationLabel:'GLOBAL ARŞİV',rankLabel:'DÜNYA SIRASI',identityLabel:'KİMLİK',openArchive:'ARŞİVİ AÇ',
 identityEyebrow:'İZDEN ÖNCE, BİR İSİM.',identityTitle:'ARŞİV SENİ<br><em>NASIL HATIRLASIN?</em>',identityCopy:'Herkese açık bir takma ad seç. E-posta, telefon numarası veya hesap gerekmez.',nicknameLabel:'HERKESE AÇIK İSİM',claimIdentity:'BU KİMLİĞİ AL',privacyNote:'Bu ismi aynı cihazda sana bağlamak için rastgele bir cihaz kimliği yalnızca bu cihazda saklanır.',
 archiveTitle:'İZLER ARŞİVİ',archiveSubtitle:'Her el geride bir iz bırakır.',archivePlayers:'ELLER',archiveAttempts:'İZLER',archiveBest:'EN YAKIN',archiveScore:'YAKINLIK',archiveLoading:'ARŞİV OKUNUYOR…',archiveFoot:'Burada her kimliğin yalnızca en iyi doğrulanmış izi görünür.'
}:{
 verificationLabel:'GLOBAL ARCHIVE',rankLabel:'WORLD RANK',identityLabel:'IDENTITY',openArchive:'OPEN THE ARCHIVE',
 identityEyebrow:'BEFORE THE TRACE, A NAME.',identityTitle:'HOW SHOULD THE<br><em>ARCHIVE REMEMBER YOU?</em>',identityCopy:'Choose a public pseudonym. No email, phone number or account is required.',nicknameLabel:'PUBLIC NAME',claimIdentity:'CLAIM THIS IDENTITY',privacyNote:'A random device ID stays on this device so this name remains associated with you here.',
 archiveTitle:'THE ARCHIVE',archiveSubtitle:'Every hand leaves a trace.',archivePlayers:'HANDS',archiveAttempts:'TRACES',archiveBest:'CLOSEST',archiveScore:'PROXIMITY',archiveLoading:'READING THE ARCHIVE…',archiveFoot:'Only each identity’s best verified trace appears here.'
};
for(const [key,value] of Object.entries(staticCopy)){
  document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el=>el.textContent=value);
  document.querySelectorAll(`[data-i18n-html="${key}"]`).forEach(el=>el.innerHTML=value);
}
let install=localStorage.getItem(INSTALL);if(!install||!/^[0-9a-f-]{36}$/i.test(install)){install=crypto.randomUUID();localStorage.setItem(INSTALL,install)}
let name=localStorage.getItem(NAME)||'',challenge=null,challengePromise=null,points=[],drawing=false,lastArchive=null,pendingStart=false;
const gate=$('identityGate'),nick=$('nicknameInput'),err=$('identityError'),confirm=$('identityConfirm'),close=$('identityClose'),playerBadge=$('playerBadge'),archive=$('archiveOverlay'),list=$('archiveList'),verify=$('verifyState'),rank=$('worldRank'),identity=$('resultIdentity');
function overlay(el,on){el?.classList.toggle('is-open',on);el?.setAttribute('aria-hidden',on?'false':'true')}
function clean(v){v=v.normalize('NFKC').trim().replace(/\s+/g,' ');return v.length>=2&&v.length<=20&&/^[\p{L}\p{N}._ -]+$/u.test(v)?v:null}
function identityUI(){if(playerBadge){playerBadge.hidden=!name;if(name)playerBadge.textContent=name.toUpperCase().slice(0,12)}if(identity)identity.textContent=name||'—'}
async function call(action,data={},timeout=8000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action,...data}),signal:c.signal});let j={};try{j=await r.json()}catch{}if(!r.ok){const e=new Error(j.error||'request_failed');e.code=j.error;throw e}return j}finally{clearTimeout(t)}}
function openIdentity(start=false){pendingStart=start;err.textContent='';nick.value=name;overlay(gate,true);setTimeout(()=>nick.focus(),80)}
function closeIdentity(){overlay(gate,false);nick.blur();pendingStart=false}
async function register(){const n=clean(nick.value);if(!n){err.textContent=tx.bad;return}const shouldStart=pendingStart;confirm.disabled=true;err.textContent='';try{const d=await call('register',{installationId:install,nickname:n});name=d.player?.nickname||n;localStorage.setItem(NAME,name);identityUI();closeIdentity();if(shouldStart)setTimeout(()=>$('startButton')?.click(),40)}catch(e){err.textContent=e.code==='nickname_taken'?tx.taken:tx.offline}finally{confirm.disabled=false}}
confirm?.addEventListener('click',register);nick?.addEventListener('keydown',e=>{if(e.key==='Enter')register()});close?.addEventListener('click',closeIdentity);
function getChallenge(){if(challengePromise)return challengePromise;challengePromise=call('challenge').then(d=>challenge=d.challenge).catch(()=>null).finally(()=>challengePromise=null);return challengePromise}
$('startButton')?.addEventListener('click',e=>{if(!name){e.preventDefault();e.stopImmediatePropagation();openIdentity(true);return}getChallenge()},{capture:true});
$('againButton')?.addEventListener('click',()=>getChallenge(),{capture:true});
window.addEventListener('pointerdown',e=>{if(document.body.dataset.mode!=='ready'||e.target.closest?.('button'))return;drawing=true;points=[];points.push({x:e.clientX,y:e.clientY,t:performance.now(),p:e.pressure||.5});if(!challenge)getChallenge()},{capture:true,passive:true});
window.addEventListener('pointermove',e=>{if(!drawing)return;for(const q of(e.getCoalescedEvents?.()||[e]))points.push({x:q.clientX,y:q.clientY,t:performance.now(),p:q.pressure||.5})},{capture:true,passive:true});
window.addEventListener('pointerup',e=>{if(!drawing)return;drawing=false;points.push({x:e.clientX,y:e.clientY,t:performance.now(),p:e.pressure||.5});const trace=points.slice(0,1800);setTimeout(()=>submit(trace),140)},{capture:true,passive:true});
window.addEventListener('pointercancel',()=>{drawing=false;points=[]},{capture:true});
async function submit(trace){if(document.body.dataset.mode!=='result'||trace.length<45||!name)return;if(verify){verify.textContent=tx.verifying;verify.className=''}try{const ch=challenge||await getChallenge();challenge=null;if(!ch)throw new Error('offline');const d=await call('submit',{installationId:install,nickname:name,challenge:ch,locale:lang,points:trace},12000),r=d.result;if(!r)throw new Error('bad');$('scoreValue').textContent=Number(r.score).toFixed(3);$('traceId').textContent='TRACE / '+r.traceId;$('mRadial').textContent=Number(r.radialPct).toFixed(2)+'%';$('mClosure').textContent=Number(r.closurePct).toFixed(1)+'%';$('mCoverage').textContent=Number(r.coveragePct).toFixed(1)+'%';$('mPath').textContent=Number(r.pathPct).toFixed(2)+'%';if(rank)rank.textContent=r.rank?'#'+r.rank:'—';if(identity)identity.textContent=r.nickname||name;if(verify){verify.textContent=tx.verified;verify.className='verified'}lastArchive=d.archive||null;if(lastArchive)render(lastArchive)}catch(e){if(verify){verify.textContent=tx.local;verify.className='failed'}if(rank)rank.textContent='—'}finally{getChallenge()}}
function drawMini(canvas,trace){if(!Array.isArray(trace)||!trace.length)return;const dpr=Math.min(devicePixelRatio||1,1.5),w=canvas.clientWidth||42,h=canvas.clientHeight||42;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.strokeStyle='rgba(241,233,218,.8)';c.lineWidth=1.2;c.beginPath();trace.forEach((q,i)=>{const x=w/2+Number(q[0])*w*.32,y=h/2+Number(q[1])*h*.32;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}
function render(data){lastArchive=data;const rows=data?.rows||[],s=data?.stats||{};$('archivePlayers').textContent=Number(s.players||0).toLocaleString();$('archiveAttempts').textContent=Number(s.attempts||0).toLocaleString();$('archiveBest').textContent=Number(s.bestScore||0).toFixed(3)+'%';list.innerHTML='';if(!rows.length){const d=document.createElement('div');d.className='archive-empty';d.textContent=tx.empty;list.append(d);return}for(const r of rows){const row=document.createElement('div');row.className='archive-row'+(name&&r.nickname===name?' is-me':'');const no=document.createElement('span');no.className='archive-rank';no.textContent=String(r.rank).padStart(2,'0');const cv=document.createElement('canvas');cv.className='archive-trace';const nm=document.createElement('div');nm.className='archive-name';const b=document.createElement('b');b.textContent=r.nickname;const sm=document.createElement('span');sm.textContent='TRACE / '+r.traceId;nm.append(b,sm);const sc=document.createElement('div');sc.className='archive-score';sc.textContent=Number(r.score).toFixed(3);const pct=document.createElement('small');pct.textContent='%';sc.append(pct);row.append(no,cv,nm,sc);list.append(row);requestAnimationFrame(()=>drawMini(cv,r.trace))}}
async function loadArchive(){list.innerHTML='<div class="archive-empty">'+tx.loading+'</div>';try{render(await call('leaderboard',{limit:30}))}catch{list.innerHTML='<div class="archive-empty">'+tx.offline+'</div>'}}
function openArchive(){overlay(archive,true);loadArchive()}
$('archiveButton')?.addEventListener('click',openArchive);$('resultArchiveButton')?.addEventListener('click',openArchive);$('archiveClose')?.addEventListener('click',()=>overlay(archive,false));
async function restore(){identityUI();try{const d=await call('identity',{installationId:install});if(d.player?.nickname){name=d.player.nickname;localStorage.setItem(NAME,name);identityUI();if(rank&&d.player.rank)rank.textContent='#'+d.player.rank}}catch{}try{lastArchive=await call('leaderboard',{limit:12});render(lastArchive)}catch{}getChallenge()}
restore();
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=10',{updateViaCache:'none'}).catch(()=>{}));
