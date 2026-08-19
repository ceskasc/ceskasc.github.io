(() => {
'use strict';

function buildPlayHub(){
  const actions=document.querySelector('.home-actions');
  if(!actions||document.getElementById('modeHub'))return;
  const classic=document.getElementById('classicButton');
  const daily=document.getElementById('dailyButton');
  const one=document.getElementById('oneShotButton');
  const live=document.getElementById('liveDuelButton');
  const level=document.getElementById('levelRunButton');
  const beat=document.getElementById('beatSelfButton');
  if(!classic||!daily||!one)return;

  const hub=document.createElement('section');
  hub.className='mode-hub';
  hub.id='modeHub';
  hub.innerHTML=`
    <div class="mode-hub-head"><span>PLAY</span><small>ONE STROKE · NO CORRECTIONS</small></div>
    <div class="mode-primary" id="modePrimary"></div>
    <div class="mode-grid mode-core-grid" id="modeCoreGrid"></div>
    <div class="mode-hub-head challenge"><span>CHALLENGE</span><small>TIME · RIVALS · REWARDS</small></div>
    <div class="mode-grid mode-challenge-grid" id="modeChallengeGrid"></div>
    <div class="mode-practice" id="modePractice"></div>`;
  actions.appendChild(hub);
  hub.querySelector('#modePrimary').appendChild(classic);
  hub.querySelector('#modeCoreGrid').append(daily,one);
  if(live)hub.querySelector('#modeChallengeGrid').appendChild(live);
  if(level)hub.querySelector('#modeChallengeGrid').appendChild(level);
  if(beat)hub.querySelector('#modePractice').appendChild(beat);

  if(live&&level){
    live.querySelector('small').textContent='1 MINUTE · WIN +1 CROWN';
    level.querySelector('small').textContent='60 SEC · CLEAR THE TARGET';
  }
  const sub=document.querySelector('.home-subcopy');
  if(sub)sub.textContent='One stroke. No corrections. Every mark counts.';
}

function repairDynamicHub(){
  const grid=document.getElementById('modeChallengeGrid');
  const practice=document.getElementById('modePractice');
  if(!grid||!practice)return;
  const live=document.getElementById('liveDuelButton');
  const level=document.getElementById('levelRunButton');
  const beat=document.getElementById('beatSelfButton');
  if(live&&live.parentElement!==grid)grid.appendChild(live);
  if(level&&level.parentElement!==grid)grid.appendChild(level);
  if(beat&&beat.parentElement!==practice)practice.appendChild(beat);
}

buildPlayHub();
setTimeout(()=>{if(!document.getElementById('modeHub'))buildPlayHub();repairDynamicHub()},80);
setTimeout(repairDynamicHub,500);
})();
