export const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const ease=t=>1-Math.pow(1-clamp(t),4);

export class DrawingRenderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});this.points=[];this.analysis=null;this.liveIndex=1;this.pending=false;this.resultBox=null;this.resize()}
  resize(){this.dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.75);this.canvas.width=Math.max(1,Math.floor(innerWidth*this.dpr));this.canvas.height=Math.max(1,Math.floor(innerHeight*this.dpr));this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.liveIndex=1;if(this.analysis)this.drawResult();else if(this.points.length>1)this.redrawLive()}
  setResultBox(rect){if(!rect)return;this.resultBox={x:rect.left,y:rect.top,w:rect.width,h:rect.height};if(this.analysis)this.drawResult()}
  clear(){this.ctx.clearRect(0,0,innerWidth,innerHeight)}
  reset(){this.points=[];this.analysis=null;this.liveIndex=1;this.pending=false;this.resultBox=null;this.clear()}
  start(p){this.points=[p];this.analysis=null;this.liveIndex=1;this.clear()}
  add(p){const q=this.points.at(-1);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<.58)return;this.points.push(p);if(this.points.length>1900)this.points.splice(1,1);this.request()}
  request(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.drawNewSegments()})}
  drawSegment(a,b){const c=this.ctx,dt=Math.max(2,b.t-a.t),speed=Math.hypot(b.x-a.x,b.y-a.y)/dt,s=clamp(speed/1.55),pressure=b.p||.5,w=(5.6-2.55*s)*(.88+pressure*.32),hot=Math.round(116+105*s);c.save();c.lineCap='round';c.lineJoin='round';c.globalCompositeOperation='source-over';c.shadowColor='rgba(255,76,38,.34)';c.shadowBlur=16;c.strokeStyle='rgba(255,76,38,.18)';c.lineWidth=w+9;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.shadowBlur=7;c.shadowColor='rgba(255,127,72,.5)';c.strokeStyle=`rgba(255,${hot},74,.96)`;c.lineWidth=w;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.shadowBlur=0;c.strokeStyle='rgba(255,244,226,.86)';c.lineWidth=Math.max(.9,w*.25);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore()}
  drawNewSegments(){if(this.analysis||this.points.length<2)return;for(let i=Math.max(1,this.liveIndex);i<this.points.length;i++)this.drawSegment(this.points[i-1],this.points[i]);this.liveIndex=this.points.length;const z=this.points.at(-1),c=this.ctx;c.save();c.fillStyle='#fff1dc';c.shadowColor='#ff5a36';c.shadowBlur=18;c.beginPath();c.arc(z.x,z.y,3.2,0,TAU);c.fill();c.strokeStyle='rgba(255,90,54,.45)';c.shadowBlur=0;c.lineWidth=.8;c.beginPath();c.arc(z.x,z.y,8,0,TAU);c.stroke();c.restore()}
  redrawLive(){this.clear();this.liveIndex=1;this.drawNewSegments()}
  finish(a){this.analysis=a;this.drawResult()}
  drawResult(){if(!this.analysis)return;const a=this.analysis,c=this.ctx,p=a.points,f=a.fit;this.clear();const box=this.resultBox||{x:0,y:innerHeight*.08,w:innerWidth,h:innerHeight*.46},cx=box.x+box.w/2,cy=box.y+box.h/2,maxR=Math.min(box.w*.34,box.h*.40),scale=Math.min(maxR/f.r,1.12);const tx=cx-f.cx*scale,ty=cy-f.cy*scale;c.save();c.lineCap='round';c.lineJoin='round';c.translate(tx,ty);c.scale(scale,scale);const idealR=f.r;c.strokeStyle='rgba(240,236,227,.15)';c.lineWidth=1/scale;c.setLineDash([4/scale,8/scale]);c.beginPath();c.arc(f.cx,f.cy,idealR,0,TAU);c.stroke();c.setLineDash([]);const step=Math.max(1,Math.floor(p.length/190));c.strokeStyle='rgba(255,90,54,.18)';c.lineWidth=.65/scale;for(let i=0;i<p.length;i+=step){const q=p[i],ang=Math.atan2(q.y-f.cy,q.x-f.cx),ix=f.cx+Math.cos(ang)*f.r,iy=f.cy+Math.sin(ang)*f.r;c.beginPath();c.moveTo(ix,iy);c.lineTo(q.x,q.y);c.stroke()}for(let i=1;i<p.length;i++){const q=p[i-1],z=p[i],d=clamp(Math.abs(a.deviations[i]||0)/(f.r*.085));const r=Math.round(255),g=Math.round(198-115*d),b=Math.round(150-96*d);c.shadowColor=`rgba(255,80,42,${.13+.18*d})`;c.shadowBlur=5/scale;c.strokeStyle=`rgba(${r},${g},${b},${.72+.25*d})`;c.lineWidth=2.2/scale;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(z.x,z.y);c.stroke()}c.shadowBlur=0;c.fillStyle='#f0ece3';c.beginPath();c.arc(f.cx,f.cy,1.8/scale,0,TAU);c.fill();c.strokeStyle='rgba(255,90,54,.45)';c.lineWidth=.8/scale;c.beginPath();c.arc(f.cx,f.cy,6/scale,0,TAU);c.stroke();c.restore()}
}

export class SoundEngine{
  constructor(){this.ctx=null;this.enabled=true}
  ensure(){if(!this.enabled)return null;try{if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}catch{return null}}
  tone(freq,d=.14,g=.018,type='sine',delay=0){const c=this.ensure();if(!c)return;const o=c.createOscillator(),v=c.createGain(),f=c.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=1500;v.gain.setValueAtTime(.0001,c.currentTime+delay);v.gain.exponentialRampToValueAtTime(g,c.currentTime+delay+.016);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+d);o.connect(f);f.connect(v);v.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+d+.03)}
  begin(){this.tone(110,.3,.018);this.tone(164.8,.36,.011,'sine',.055)}
  pen(){this.tone(610,.05,.005,'triangle')}
  result(s){const r=s>97?196:174.6;this.tone(r,.36,.018);this.tone(r*1.5,.42,.012,'sine',.07);this.tone(r*2,.48,.008,'sine',.14)}
}
