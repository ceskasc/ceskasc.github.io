export const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const ease=t=>1-Math.pow(1-clamp(t),4);

export class DrawingRenderer{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    this.points=[];this.analysis=null;this.pending=false;this.liveIndex=1;this.resize();
  }
  resize(){
    this.dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.45:1.9);
    this.canvas.width=Math.max(1,Math.floor(innerWidth*this.dpr));
    this.canvas.height=Math.max(1,Math.floor(innerHeight*this.dpr));
    this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.liveIndex=1;
    if(this.analysis)this.drawResult(); else if(this.points.length>1)this.redrawLive();
  }
  clear(){this.ctx.clearRect(0,0,innerWidth,innerHeight)}
  reset(){this.points=[];this.analysis=null;this.liveIndex=1;this.pending=false;this.clear()}
  start(p){this.points=[p];this.analysis=null;this.liveIndex=1;this.clear()}
  add(p){
    const q=this.points.at(-1);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<.6)return;
    this.points.push(p);if(this.points.length>1800)this.points.splice(1,1);this.request();
  }
  request(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.drawNewSegments()})}
  drawSegment(a,b){
    const c=this.ctx;const dt=Math.max(2,b.t-a.t);const speed=Math.hypot(b.x-a.x,b.y-a.y)/dt;const s=clamp(speed/1.45);const pressure=b.p||.5;const w=(4.8-2.3*s)*(0.88+pressure*.34);
    c.save();c.lineCap='round';c.lineJoin='round';
    c.strokeStyle='rgba(74,227,255,.16)';c.lineWidth=w+10;c.shadowColor='rgba(71,222,255,.22)';c.shadowBlur=18;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    c.shadowBlur=9;c.shadowColor='rgba(132,117,255,.46)';c.strokeStyle=`rgba(${Math.round(205+35*s)},${Math.round(245-28*s)},255,.96)`;c.lineWidth=w;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    c.shadowBlur=0;c.strokeStyle='rgba(255,255,255,.76)';c.lineWidth=Math.max(1,w*.28);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();
  }
  drawNewSegments(){
    if(this.analysis||this.points.length<2)return;
    for(let i=Math.max(1,this.liveIndex);i<this.points.length;i++)this.drawSegment(this.points[i-1],this.points[i]);
    this.liveIndex=this.points.length;
    const z=this.points.at(-1),c=this.ctx;c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,255,255,.98)';c.shadowColor='#64f7ff';c.shadowBlur=20;c.beginPath();c.arc(z.x,z.y,3.1,0,TAU);c.fill();c.restore();
  }
  redrawLive(){this.clear();const old=this.liveIndex;this.liveIndex=1;this.drawNewSegments();this.liveIndex=Math.max(old,this.points.length)}
  finish(a){this.analysis=a;this.drawResult()}
  drawResult(){
    if(!this.analysis)return;const a=this.analysis,c=this.ctx,p=a.points,f=a.fit;this.clear();c.save();c.lineCap='round';c.lineJoin='round';
    c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=1;c.setLineDash([4,8]);c.beginPath();c.arc(f.cx,f.cy,f.r,0,TAU);c.stroke();c.setLineDash([]);
    const step=Math.max(1,Math.floor(p.length/220));
    c.strokeStyle='rgba(100,247,255,.18)';c.lineWidth=.75;for(let i=0;i<p.length;i+=step){const q=p[i],ang=Math.atan2(q.y-f.cy,q.x-f.cx),ix=f.cx+Math.cos(ang)*f.r,iy=f.cy+Math.sin(ang)*f.r;c.beginPath();c.moveTo(ix,iy);c.lineTo(q.x,q.y);c.stroke()}
    for(let i=1;i<p.length;i++){
      const q=p[i-1],z=p[i],d=clamp(Math.abs(a.deviations[i]||0)/(f.r*.085));const hue=188+d*105;
      c.shadowColor=`hsla(${hue},100%,68%,.28)`;c.shadowBlur=8;c.strokeStyle=`hsla(${hue},95%,76%,${.64+.3*d})`;c.lineWidth=2.25;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(z.x,z.y);c.stroke();
    }
    c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(f.cx,f.cy,1.8,0,TAU);c.fill();c.strokeStyle='rgba(100,247,255,.28)';c.lineWidth=1;c.beginPath();c.arc(f.cx,f.cy,6,0,TAU);c.stroke();c.restore();
  }
}

export class SoundEngine{
  constructor(){this.ctx=null;this.enabled=true}
  ensure(){if(!this.enabled)return null;try{if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}catch{return null}}
  tone(freq,d=.14,g=.022,type='sine',delay=0){const c=this.ensure();if(!c)return;const o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(.0001,c.currentTime+delay);v.gain.exponentialRampToValueAtTime(g,c.currentTime+delay+.015);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+d);o.connect(v);v.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+d+.03)}
  begin(){this.tone(174.6,.2,.018);this.tone(261.6,.24,.012,'sine',.045)}
  pen(){this.tone(740,.045,.006,'triangle')}
  result(s){const r=s>95?220:196;this.tone(r,.28,.018);this.tone(r*1.5,.32,.014,'sine',.06);this.tone(r*2,.38,.009,'sine',.12)}
}
