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

  function smoothPolyline(arr, passes=2) {
    let out=arr.map(p=>({...p}));
    for(let pass=0;pass<passes;pass++){
      const src=out, next=src.map(p=>({...p}));
      for(let i=2;i<src.length-2;i++){
        next[i]={
          x:(src[i-2].x+4*src[i-1].x+6*src[i].x+4*src[i+1].x+src[i+2].x)/16,
          y:(src[i-2].y+4*src[i-1].y+6*src[i].y+4*src[i+1].y+src[i+2].y)/16,
          t:src[i].t
        };
      }
      out=next;
    }
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
    const [D,E,F]=sol; let cx=-D/2,cy=-E/2,rr=cx*cx+cy*cy-F; if(!Number.isFinite(rr)||rr<=0) return null;
    let r=Math.sqrt(rr);

    // Refine the algebraic seed by minimizing true radial distance.
    // This removes the small algebraic-fit bias that affected V2.
    for(let iter=0;iter<6;iter++){
      const jtj=[[0,0,0],[0,0,0],[0,0,0]], jtr=[0,0,0];
      for(const p of arr){
        const dx=cx-p.x,dy=cy-p.y,dist=Math.max(1e-6,Math.hypot(dx,dy)),res=dist-r;
        const j=[dx/dist,dy/dist,-1];
        for(let a=0;a<3;a++){ jtr[a]+=j[a]*res; for(let b=0;b<3;b++)jtj[a][b]+=j[a]*j[b]; }
      }
      const delta=solve3(jtj,jtr.map(v=>-v)); if(!delta) break;
      cx+=delta[0]; cy+=delta[1]; r+=delta[2];
      if(!Number.isFinite(r)||r<=0) return null;
      if(Math.hypot(delta[0],delta[1],delta[2])<1e-5) break;
    }
    return {cx,cy,r};
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
    // Score V3 geometry, now re-run by the V4 server verifier before ranking.
    const sampled=resamplePolyline(raw,240);
    const arr=smoothPolyline(sampled,2);
    const fit=fitCircle(arr);
    if(!fit || fit.r<32) return {valid:false,message:'Draw a larger circle.'};

    const radii=arr.map(p=>Math.hypot(p.x-fit.cx,p.y-fit.cy));
    const errors=radii.map(r=>(r-fit.r)/fit.r);
    const absErrors=errors.map(Math.abs);
    const radialRms=rms(errors);
    const radialP90=percentile(absErrors,.90);

    const rawAngles=arr.map(p=>Math.atan2(p.y-fit.cy,p.x-fit.cx));
    const deltas=[];
    for(let i=1;i<rawAngles.length;i++){
      let d=rawAngles[i]-rawAngles[i-1];
      while(d>Math.PI)d-=Math.PI*2;
      while(d<-Math.PI)d+=Math.PI*2;
      deltas.push(d);
    }
    const net=deltas.reduce((s,d)=>s+d,0);
    const sign=Math.sign(net)||1;
    let totalAbs=0,reversal=0;
    for(const d of deltas){
      totalAbs+=Math.abs(d);
      if(Math.sign(d)&&Math.sign(d)!==sign) reversal+=Math.abs(d);
    }
    const netTurns=Math.abs(net)/(Math.PI*2);
    const absTurns=totalAbs/(Math.PI*2);
    const reversalRatio=totalAbs?reversal/totalAbs:1;
    const closureGap=distance(sampled[0],sampled[sampled.length-1])/(2*fit.r);
    const strokeRatio=pathLength(arr)/(Math.PI*2*fit.r);

    const radialSlope=[];
    for(let i=2;i<radii.length;i++){
      const arc=distance(arr[i-2],arr[i-1])+distance(arr[i-1],arr[i]);
      if(arc>1) radialSlope.push(Math.abs(radii[i]-radii[i-2])/arc);
    }
    const wobble=percentile(radialSlope,.85);

    const sectorValues=Array.from({length:8},()=>[]);
    for(let i=0;i<arr.length;i++){
      const a=(rawAngles[i]+Math.PI*2)%(Math.PI*2);
      sectorValues[Math.min(7,Math.floor(a/(Math.PI*2)*8))].push(radii[i]);
    }
    const sectorMeans=sectorValues.filter(s=>s.length).map(mean);
    const sectorDrift=sectorMeans.length>1?std(sectorMeans)/fit.r:1;
    const intersections=countSelfIntersections(arr);

    const shape=clamp(100-radialRms*190-radialP90*45,0,100);
    const radius=clamp(100-radialRms*260,0,100);
    const closure=clamp(100-closureGap*135,0,100);
    const coverage=clamp(100-Math.max(0,1-netTurns)*160-Math.max(0,netTurns-1.04)*90,0,100);
    const smoothness=clamp(100-Math.max(0,wobble-.035)*220,0,100);
    const stability=clamp(100-sectorDrift*900,0,100);
    const purity=clamp(100-reversalRatio*500-Math.max(0,absTurns-1.06)*180-intersections*18,0,100);

    let defect=
      radialRms*210 +
      radialP90*52 +
      closureGap*70 +
      Math.max(0,1-netTurns)*72 +
      reversalRatio*85 +
      Math.max(0,absTurns-1.06)*32 +
      intersections*7;

    defect+=Math.max(0,.88-strokeRatio)*45 + Math.max(0,strokeRatio-1.18)*45;
    defect+=Math.max(0,wobble-.08)*8;

    const score=clamp(100-defect,0,99.99);
    const valid=
      netTurns>=.90 &&
      absTurns<1.72 &&
      closureGap<.38 &&
      intersections<5 &&
      strokeRatio>.72 &&
      strokeRatio<1.55;

    let message='One clean circle only.';
    if(netTurns<.90 || closureGap>=.38) message='Complete the circle.';
    else if(absTurns>=1.72) message='Draw one circle only.';
    else if(intersections>=5) message='One clean circle only.';
    else if(strokeRatio<=.72 || strokeRatio>=1.55) message='Draw one continuous circle.';

    return {
      valid,message,fit,score,shape,radius,closure,coverage,smoothness,stability,purity,
      scoreVersion:'v4',
      radialRms,radialP90,closureGap,netTurns,absTurns,reversalRatio,strokeRatio,wobble,sectorDrift,intersections,
      duration:Math.max(100,Math.round(performance.now()-drawStart)),pointCount:raw.length
    };
  }

  function rank(score){
    if(score>=99.5)return['PERFECT?','That should not be possible.'];
    if(score>=98.5)return['INHUMAN','Almost no wasted motion.'];
    if(score>=97)return['ELITE','A remarkably controlled curve.'];
    if(score>=94.5)return['MASTER','The circle barely resisted.'];
    if(score>=90)return['EXCEPTIONAL','Your hand understands the curve.'];
    if(score>=84)return['PRECISE','Controlled. Not perfect.'];
    if(score>=72)return['SOLID','The geometry is there.'];
    if(score>=55)return['ROUGH','Recognizable. Unforgiving.'];
    return['CHAOTIC','Perfection was not consulted.'];
  }

  function resetRound(){
    isDrawing=false; pointerId=null; points=[]; fitted=null; lastResult=null; clearCanvas(); closeResult(); closeAnalysis();
    const retry=$('retryButton'); if(retry){ retry.disabled=false; retry.textContent=gameMode==='challenge'?'TRY AGAIN':'AGAIN'; }
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
    const daily=mode==='daily', oneShot=mode==='one_shot', challenge=mode==='challenge';
    els.gameModeEyebrow.textContent=daily?'TODAY':oneShot?'ONE ATTEMPT':challenge?'TARGET':'MODE';
    els.gameModeLabel.textContent=daily?'DAILY':oneShot?'ONE SHOT':challenge?'CHALLENGE':mode.toUpperCase();
    els.promptIndex.textContent=daily?'24H':oneShot?'1×':challenge?'VS':'01';
    els.promptText.textContent=daily?'One circle. Everyone.':oneShot?'One attempt. Make it count.':challenge&&activeChallenge?`Beat ${Number(activeChallenge.target_score).toFixed(2)}.`:'Draw one circle.';
    els.gameBest.textContent=challenge&&activeChallenge?Number(activeChallenge.target_score).toFixed(2):(bestForMode(mode)||'—');
    setTimeout(resizeCanvas,60);
  }

  function bestForMode(mode){ const value=Number(localStorage.getItem(`o.best.v4.${mode}`)||0); return value?value.toFixed(2):null; }
