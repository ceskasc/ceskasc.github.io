export const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const ease=t=>1-Math.pow(1-clamp(t),4);

export class DrawingRenderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});this.points=[];this.analysis=null;this.pending=false;this.resize()}
  resize(){this.dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.8);this.canvas.width=Math.max(1,Math.floor(innerWidth*this.dpr));this.canvas.height=Math.max(1,Math.floor(innerHeight*this.dpr));this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.render()}
  reset(){this.points=[];this.analysis=null;this.clear()}
  clear(){this.ctx.clearRect(0,0,innerWidth,innerHeight)}
  start(p){this.points=[p];this.analysis=null;this.request()}
  add(p){const q=this.points.at(-1);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<.7)return;this.points.push(p);if(this.points.length>1500)this.points.splice(1,1);this.request()}
  finish(a){this.analysis=a;this.request()}
  request(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.render()})}
  render(){this.clear();if(this.points.length<2)return;this.analysis?this.drawResult():this.drawLive()}
  drawLive(){const c=this.ctx,p=this.points;c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle='#111214';c.lineWidth=2.1;c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length-1;i++){const a=p[i],b=p[i+1];c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2)}const z=p.at(-1);c.lineTo(z.x,z.y);c.stroke();c.strokeStyle='#2457ff';c.lineWidth=1;c.globalAlpha=.72;c.beginPath();c.arc(z.x,z.y,7,0,TAU);c.stroke();c.restore()}
  drawResult(){const a=this.analysis,c=this.ctx,p=a.points,f=a.fit,step=Math.max(1,Math.floor(p.length/240));c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle='rgba(17,18,20,.18)';c.lineWidth=1;c.setLineDash([4,7]);c.beginPath();c.arc(f.cx,f.cy,f.r,0,TAU);c.stroke();c.setLineDash([]);for(let i=1;i<p.length;i++){const q=p[i-1],z=p[i],d=clamp(Math.abs(a.deviations[i]||0)/(f.r*.085));c.strokeStyle=d>.55?'#2457ff':'#111214';c.globalAlpha=.6+.35*d;c.lineWidth=1.8;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(z.x,z.y);c.stroke()}c.globalAlpha=1;c.strokeStyle='rgba(36,87,255,.24)';c.lineWidth=.8;for(let i=0;i<p.length;i+=step){const q=p[i],ang=Math.atan2(q.y-f.cy,q.x-f.cx),ix=f.cx+Math.cos(ang)*f.r,iy=f.cy+Math.sin(ang)*f.r;c.beginPath();c.moveTo(ix,iy);c.lineTo(q.x,q.y);c.stroke()}c.fillStyle='#2457ff';c.beginPath();c.arc(f.cx,f.cy,2,0,TAU);c.fill();c.restore()}
}

export class SoundEngine{
  constructor(){this.ctx=null;this.enabled=true}
  ensure(){if(!this.enabled)return null;try{if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}catch{return null}}
  tone(freq,d=.12,g=.025){const c=this.ensure();if(!c)return;const o=c.createOscillator(),v=c.createGain();o.type='sine';o.frequency.value=freq;v.gain.setValueAtTime(.0001,c.currentTime);v.gain.exponentialRampToValueAtTime(g,c.currentTime+.015);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(v);v.connect(c.destination);o.start();o.stop(c.currentTime+d+.02)}
  begin(){this.tone(220,.13,.018)} pen(){this.tone(660,.05,.008)} result(s){this.tone(s>95?330:262,.18,.022);setTimeout(()=>this.tone(s>95?495:393,.2,.014),55)}
}
