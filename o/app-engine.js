function pointerPos(e) {
  const r = els.canvas.getBoundingClientRect();
  return { x:e.clientX-r.left, y:e.clientY-r.top, t:performance.now() };
}

function addPoint(p) { if (!points.length || distance(points[points.length-1],p) >= 1.3) points.push(p); }
function pathLength(arr) { let s=0; for(let i=1;i<arr.length;i++) s+=distance(arr[i-1],arr[i]); return s; }

function resamplePolyline(arr, target=180) {
  if (arr.length < 2) return arr.slice();
  const total=pathLength(arr); if (!total) return arr.slice();
  const step=total/(target-1); const out=[{...arr[0]}];
  let accumulated=0, prev={...arr[0]}, i=1;
  while(i<arr.length && out.length<target-1){
    const cur=arr[i]; const seg=distance(prev,cur);
    if(accumulated+seg>=step){
      const need=step-accumulated; const t=seg?need/seg:0;
      const np={x:prev.x+(cur.x-prev.x)*t,y:prev.y+(cur.y-prev.y)*t,t:prev.t+(cur.t-prev.t)*t};
      out.push(np); prev=np; accumulated=0;
    } else { accumulated+=seg; prev={...cur}; i++; }
  }
  out.push({...arr[arr.length-1]});
  return out;
}

function solve3(A,b){
  const m=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<3;c++){
    let pivot=c; for(let r=c+1;r<3;r++) if(Math.abs(m[r][c])>Math.abs(m[pivot][c])) pivot=r;
    if(Math.abs(m[pivot][c])<1e-9) return null;
    [m[c],m[pivot]]=[m[pivot],m[c]]; const div=m[c][c]; for(let j=c;j<4;j++) m[c][j]/=div;
    for(let r=0;r<3;r++){ if(r===c) continue; const f=m[r][c]; for(let j=c;j<4;j++) m[r][j]-=f*m[c][j]; }
  }
  return [m[0][3],m[1][3],m[2][3]];
}

function fitCircle(arr){
  let sx=0,sy=0,sxx=0,syy=0,sxy=0,sxz=0,syz=0,sz=0; const n=arr.length;
  for(const p of arr){ const z=p.x*p.x+p.y*p.y; sx+=p.x; sy+=p.y; sxx+=p.x*p.x; syy+=p.y*p.y; sxy+=p.x*p.y; sxz+=p.x*z; syz+=p.y*z; sz+=z; }
  const sol=solve3([[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]],[-sxz,-syz,-sz]); if(!sol) return null;
  const [D,E,F]=sol,cx=-D/2,cy=-E/2,rr=cx*cx+cy*cy-F; if(!Number.isFinite(rr)||rr<=0) return null;
  return {cx,cy,r:Math.sqrt(rr)};
}

function orientation(a,b,c){ return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x); }
function segmentsIntersect(a,b,c,d){
  const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
  return (o1===0||o2===0||o3===0||o4===0) ? false : ((o1>0)!==(o2>0) && (o3>0)!==(o4>0));
}
function countSelfIntersections(arr){
  let count=0; const step=Math.max(1,Math.floor(arr.length/90)); const s=arr.filter((_,i)=>i%step===0 || i===arr.length-1);
  for(let i=0;i<s.length-1;i++) for(let j=i+3;j<s.length-1;j++){
    if(i===0 && j>=s.length-3) continue;
    if(segmentsIntersect(s[i],s[i+1],s[j],s[j+1])) { count++; if(count>8) return count; }
  }
  return count;
}

function analyze(raw){
  const arr=resamplePolyline(raw,180); const fit=fitCircle(arr);
  if(!fit || fit.r<32) return {valid:false,message:'Draw a larger circle.'};

  const radii=arr.map(p=>Math.hypot(p.x-fit.cx,p.y-fit.cy));
  const errors=radii.map(r=>(r-fit.r)/fit.r); const radialRms=rms(errors); const radialP95=percentile(errors.map(Math.abs),.95);
  const radiusCv=std(radii)/fit.r;

  const rawAngles=arr.map(p=>Math.atan2(p.y-fit.cy,p.x-fit.cx)); const deltas=[];
  for(let i=1;i<rawAngles.length;i++){ let d=rawAngles[i]-rawAngles[i-1]; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; deltas.push(d); }
  const net=deltas.reduce((s,d)=>s+d,0); const sign=Math.sign(net)||1;
  let totalAbs=0,reversal=0; for(const d of deltas){ totalAbs+=Math.abs(d); if(Math.sign(d)&&Math.sign(d)!==sign) reversal+=Math.abs(d); }
  const netTurns=Math.abs(net)/(Math.PI*2),absTurns=totalAbs/(Math.PI*2),reversalRatio=totalAbs?reversal/totalAbs:1;
  const closureGap=distance(arr[0],arr[arr.length-1])/(2*fit.r);
  const strokeRatio=pathLength(arr)/(Math.PI*2*fit.r);

  const radialSlope=[]; for(let i=2;i<radii.length;i++){ const arc=distance(arr[i-2],arr[i-1])+distance(arr[i-1],arr[i]); if(arc>1) radialSlope.push(Math.abs(radii[i]-radii[i-2])/arc); }
  const wobble=percentile(radialSlope,.82);

  const firstFit=fitCircle(arr.slice(0,90)), secondFit=fitCircle(arr.slice(90));
  const centerDrift=(firstFit&&secondFit)?Math.hypot(firstFit.cx-secondFit.cx,firstFit.cy-secondFit.cy)/fit.r:1;
  const intersections=countSelfIntersections(arr);

  const shape=100*(clamp(1-radialRms/.125)*.74 + clamp(1-radialP95/.24)*.26);
  const radius=100*clamp(1-radiusCv/.115);
  const closure=100*clamp(1-closureGap/.22);
  const coverage=100*clamp((netTurns-.70)/.30);
  const smoothness=100*clamp(1-wobble/.33);
  const stability=100*clamp(1-centerDrift/.34);
  const purity=100*clamp(1-reversalRatio/.12)*clamp(1-Math.max(0,absTurns-1.06)/.52)*clamp(1-intersections/5);

  let rawScore=shape*.30+radius*.20+closure*.15+coverage*.15+smoothness*.10+stability*.05+purity*.05;
  let score=100*Math.pow(clamp(rawScore/100),1.17);
  if(netTurns<.88) score=Math.min(score,70*clamp(netTurns/.88));
  if(absTurns>1.48) score*=clamp(1-(absTurns-1.48)*.65);
  if(strokeRatio<.70||strokeRatio>1.43) score*=.74;
  if(closureGap>.43) score=Math.min(score,54);
  if(intersections>3) score*=.72;
  score=clamp(score,0,99.99);

  return {
    valid:netTurns>.80 && absTurns<2.35 && intersections<9,
    message:netTurns<=.80?'Complete the circle.':intersections>=9?'One clean circle only.':'One circle only.',
    fit,score,shape,radius,closure,coverage,smoothness,stability,purity,
    radialRms,netTurns,absTurns,reversalRatio,strokeRatio,intersections,
    duration:Math.max(100,Math.round(performance.now()-drawStart)),pointCount:raw.length
  };
}

function rank(score){
  if(score>=99.5)return['PERFECT?','That should not be possible.'];
  if(score>=98.5)return['INHUMAN','Almost no wasted motion.'];
  if(score>=97)return['ELITE','A remarkably controlled curve.'];
  if(score>=93)return['MASTER','The circle barely resisted.'];
  if(score>=85)return['EXCEPTIONAL','Your hand understands the curve.'];
  if(score>=75)return['PRECISE','Controlled. Not perfect.'];
  if(score>=60)return['SOLID','The geometry is there.'];
  if(score>=40)return['ROUGH','Recognizable. Unforgiving.'];
  return['CHAOTIC','Perfection was not consulted.'];
}

function resetRound(){
  isDrawing=false; pointerId=null; points=[]; fitted=null; lastResult=null; clearCanvas(); closeResult(); closeAnalysis();
  els.gamePrompt.classList.remove('hidden-prompt'); els.gestureHint.classList.remove('hidden-hint'); els.centerCue.classList.remove('visible'); els.liveStatus.classList.remove('visible');
}

function begin(e){
  if(currentScreen!=='game'||els.result.classList.contains('visible'))return;
  if(e.pointerType==='mouse'&&e.button!==0)return; e.preventDefault();
  isDrawing=true; pointerId=e.pointerId; els.canvas.setPointerCapture?.(e.pointerId); points=[]; fitted=null; drawStart=performance.now(); addPoint(pointerPos(e));
  els.gamePrompt.classList.add('hidden-prompt'); els.gestureHint.classList.add('hidden-hint'); els.centerCue.classList.add('visible'); els.liveStatus.classList.add('visible'); vibrate(7); redraw();
}
function move(e){ if(!isDrawing||e.pointerId!==pointerId)return; e.preventDefault(); addPoint(pointerPos(e)); redraw(); }
function end(e){
  if(!isDrawing||e.pointerId!==pointerId)return; e.preventDefault(); addPoint(pointerPos(e)); isDrawing=false; pointerId=null; els.centerCue.classList.remove('visible'); els.liveStatus.classList.remove('visible');
  if(points.length<18||pathLength(points)<130){ showToast('TOO SHORT · DRAW ONE FULL CIRCLE'); vibrate([18,28,18]); setTimeout(resetRound,480); return; }
  const result=analyze(points); if(!result.valid){ showToast(result.message.toUpperCase()); vibrate([18,28,18]); setTimeout(resetRound,520); return; }
  fitted=result.fit; lastResult=result; redraw(true); vibrate(result.score>=95?[16,30,28]:16); setTimeout(()=>showResult(result),300);
}

function redraw(showGuide=false){
  clearCanvas(); if(points.length<2)return;
  if(gameMode!=='blind'||!isDrawing){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=theme.ink; ctx.lineWidth=2.15; ctx.shadowColor='rgba(240,237,229,.10)'; ctx.shadowBlur=7;
    ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y); ctx.stroke(); ctx.restore();
  }
  if(showGuide&&fitted){
    ctx.save(); ctx.setLineDash([4,7]); ctx.lineWidth=1; ctx.strokeStyle=theme.accent; ctx.globalAlpha=.76; ctx.beginPath(); ctx.arc(fitted.cx,fitted.cy,fitted.r,0,Math.PI*2); ctx.stroke(); ctx.restore();
    const stride=Math.max(1,Math.floor(points.length/36)); ctx.save(); ctx.strokeStyle='rgba(212,244,93,.13)'; ctx.lineWidth=.7;
    for(let i=0;i<points.length;i+=stride){ const p=points[i],a=Math.atan2(p.y-fitted.cy,p.x-fitted.cx),qx=fitted.cx+Math.cos(a)*fitted.r,qy=fitted.cy+Math.sin(a)*fitted.r; ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(qx,qy);ctx.stroke(); }
    ctx.restore();
  }
}

function startGame(mode){
  gameMode=mode; showScreen('game'); resetRound();
  const daily=mode==='daily'; els.gameModeEyebrow.textContent=daily?'TODAY':'MODE'; els.gameModeLabel.textContent=daily?'DAILY':mode.toUpperCase();
  els.promptIndex.textContent=daily?'24H':'01'; els.promptText.textContent=daily?'One circle. Everyone.':'Draw one circle.';
  els.gameBest.textContent=bestForMode(mode)||'—'; setTimeout(resizeCanvas,60);
}

function bestForMode(mode){ const value=Number(localStorage.getItem(`o.best.${mode}`)||0); return value?value.toFixed(2):null; }
