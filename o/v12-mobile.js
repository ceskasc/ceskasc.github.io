(() => {
'use strict';
const MQ=window.matchMedia('(max-width: 979px)');
if(!MQ.matches)return;

try{history.scrollRestoration='manual'}catch{}

function setViewportHeight(){
  const h=Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight||0);
  if(h>0)document.documentElement.style.setProperty('--o-mobile-vh',`${h}px`);
}
function desiredClassicLabel(){return document.body.classList.contains('locale-tr')||document.documentElement.lang==='tr'?'ÇİZ':'DRAW'}
function repairClassic(){
  const el=document.querySelector('#classicButton > span');
  if(!el)return;
  const wanted=desiredClassicLabel();
  if(el.textContent.trim()!==wanted)el.textContent=wanted;
}
function resetHomePosition(){
  const home=document.getElementById('homeScreen');
  if(home){home.scrollTop=0;home.scrollLeft=0}
  try{window.scrollTo(0,0)}catch{}
}
function sync(){setViewportHeight();repairClassic();resetHomePosition()}

setViewportHeight();
requestAnimationFrame(sync);
setTimeout(sync,80);
setTimeout(sync,420);
setTimeout(sync,1100);

window.addEventListener('pageshow',sync,{passive:true});
window.addEventListener('resize',setViewportHeight,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
window.visualViewport?.addEventListener('resize',setViewportHeight,{passive:true});
window.visualViewport?.addEventListener('scroll',setViewportHeight,{passive:true});

const classic=document.getElementById('classicButton');
if(classic)new MutationObserver(repairClassic).observe(classic,{subtree:true,childList:true,characterData:true});
const home=document.getElementById('homeScreen');
if(home)new MutationObserver(()=>{if(home.classList.contains('active'))resetHomePosition()}).observe(home,{attributes:true,attributeFilter:['class']});
})();
