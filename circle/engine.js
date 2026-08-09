export const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const ease=t=>1-Math.pow(1-clamp(t),3);

export class FieldRenderer{
  constructor(canvas){this.canvas=canvas;this.gl=null;this.program=null;this.fallback=null;this.pointer={x:innerWidth/2,y:innerHeight/2};this.target={...this.pointer};this.energy=.22;this.targetEnergy=.22;this.started=performance.now();this.init()}
  init(){
    const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl){this.fallback=this.canvas.getContext('2d');this.resize();return}
    this.gl=gl;
    const vs=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fs=`precision highp float;uniform float t,e;uniform vec2 r,m;
    float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float f(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+17.1;a*=.48;}return v;}void main(){vec2 u=(gl_FragCoord.xy-.5*r)/min(r.x,r.y),q=u,mp=(m-.5*r)/min(r.x,r.y);float tt=t*.075;q+=.055*vec2(f(u*2.1+tt)-.5,f(u*2.-tt)-.5);float z=f(q*2.2+vec2(tt,-tt*.7)),d=length(q-mp),halo=exp(-3.5*d*d)*e,ring=exp(-36.*abs(d-(.22+.025*sin(t*.55))))*e*.18;vec3 c=vec3(.025,.025,.035)+vec3(.17,.13,.28)*(.25*z+halo*.68)+vec3(.14,.28,.25)*(halo*.23+ring*.28);c*=mix(.5,1.,smoothstep(1.05,.18,length(u*.82)));c+=(h(gl_FragCoord.xy+t)-.5)*.012;gl_FragColor=vec4(c,1.);}`;
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);this.program=pr;
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.u={t:gl.getUniformLocation(pr,'t'),r:gl.getUniformLocation(pr,'r'),m:gl.getUniformLocation(pr,'m'),e:gl.getUniformLocation(pr,'e')};this.resize()
  }
  resize(){const d=Math.min(devicePixelRatio||1,2),w=Math.floor(innerWidth*d),h=Math.floor(innerHeight*d);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';this.gl?.viewport(0,0,w,h)}}
  setPointer(x,y){this.target.x=x;this.target.y=y} setEnergy(v){this.targetEnergy=v}
  render(now){this.pointer.x=lerp(this.pointer.x,this.target.x,.07);this.pointer.y=lerp(this.pointer.y,this.target.y,.07);this.energy=lerp(this.energy,this.targetEnergy,.045);const d=Math.min(devicePixelRatio||1,2);
    if(this.gl){const g=this.gl;g.useProgram(this.program);g.uniform1f(this.u.t,(now-this.started)/1000);g.uniform2f(this.u.r,this.canvas.width,this.canvas.height);g.uniform2f(this.u.m,this.pointer.x*d,(innerHeight-this.pointer.y)*d);g.uniform1f(this.u.e,this.energy);g.drawArrays(g.TRIANGLES,0,3)}
    else if(this.fallback){const c=this.fallback,g=c.createRadialGradient(this.pointer.x*d,this.pointer.y*d,0,this.pointer.x*d,this.pointer.y*d,Math.max(innerWidth,innerHeight)*d*.7);g.addColorStop(0,'#1c192a');g.addColorStop(.5,'#0d0d13');g.addColorStop(1,'#070709');c.fillStyle=g;c.fillRect(0,0,this.canvas.width,this.canvas.height)}
  }
}

export class DrawingRenderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.points=[];this.particles=[];this.analysis=null;this.resultStart=0;this.resize()}
  resize(){this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.floor(innerWidth*this.dpr);this.canvas.height=Math.floor(innerHeight*this.dpr);this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}
  reset(){this.points=[];this.particles=[];this.analysis=null;this.clear()} clear(){this.ctx.clearRect(0,0,innerWidth,innerHeight)} start(p){this.points=[p];this.analysis=null}
  add(p){const q=this.points.at(-1);if(q&&Math.hypot(p.x-q.x,p.y-q.y)<1.1)return;this.points.push(p);if(q&&Math.random()<.72){const dx=p.x-q.x,dy=p.y-q.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;this.particles.push({x:p.x,y:p.y,vx:nx*(Math.random()-.5)*.55-dx*.018,vy:ny*(Math.random()-.5)*.55-dy*.018,life:1,size:.8+Math.random()*1.6});if(this.particles.length>130)this.particles.splice(0,this.particles.length-130)}}
  finish(a){this.analysis=a;this.resultStart=performance.now()}
  render(now){this.clear();if(this.points.length>1)(this.analysis?this.result(now):this.stroke(now));this.spark()}
  stroke(now){const c=this.ctx,p=this.points;c.save();c.lineCap=c.lineJoin='round';c.shadowBlur=26;c.shadowColor='rgba(184,255,234,.32)';for(let pass=0;pass<2;pass++){c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length-1;i++){const a=p[i],b=p[i+1];c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2)}const z=p.at(-1);c.lineTo(z.x,z.y);c.lineWidth=pass?1.35:5.8;c.strokeStyle=pass?'rgba(244,240,232,.94)':'rgba(184,255,234,.09)';c.stroke()}const z=p.at(-1);c.beginPath();c.arc(z.x,z.y,7+Math.sin(now*.012)*2.5,0,TAU);c.strokeStyle='rgba(184,255,234,.3)';c.lineWidth=1;c.stroke();c.restore()}
  result(now){const a=this.analysis,c=this.ctx,p=a.points,f=a.fit,t=ease((now-this.resultStart)/1250),step=Math.max(1,Math.floor(p.length/320));c.save();c.lineCap=c.lineJoin='round';for(let i=0;i<p.length-step;i+=step){const q=p[i],z=p[Math.min(i+step,p.length-1)],d=clamp(Math.abs(a.deviations[i]||0)/(f.r*.075));c.strokeStyle=`rgba(${Math.round(lerp(184,255,d))},${Math.round(lerp(255,130,d))},${Math.round(lerp(234,160,d))},${.24+.62*t})`;c.lineWidth=1.8;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(z.x,z.y);c.stroke()}c.setLineDash([3,8]);c.lineDashOffset=-(now-this.resultStart)*.018;c.strokeStyle=`rgba(244,240,232,${.12+.32*t})`;c.lineWidth=1;c.beginPath();c.arc(f.cx,f.cy,f.r,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle=`rgba(184,255,234,${.65*t})`;c.beginPath();c.arc(f.cx,f.cy,2.2,0,TAU);c.fill();c.strokeStyle=`rgba(184,167,255,${.035*t})`;c.lineWidth=10;c.beginPath();c.arc(f.cx,f.cy,f.r+16+Math.sin(now*.0025)*5,0,TAU);c.stroke();c.restore()}
  spark(){const c=this.ctx;c.save();for(const p of this.particles){p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.985;p.life*=.958;c.fillStyle=`rgba(184,255,234,${.42*p.life})`;c.beginPath();c.arc(p.x,p.y,p.size*p.life,0,TAU);c.fill()}this.particles=this.particles.filter(p=>p.life>.04);c.restore()}
}

export class SoundEngine{
  constructor(){this.ctx=null;this.enabled=true} ensure(){if(!this.enabled)return null;if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}
  tone(freq,d=.12,gain=.045,type='sine',delay=0){const c=this.ensure();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=0;o.connect(g);g.connect(c.destination);const t=c.currentTime+delay;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.03)}
  begin(){this.tone(196,.18,.03);this.tone(294,.22,.018,'sine',.04)} pen(){this.tone(520,.08,.016,'triangle')} result(s){const r=s>95?261.63:220;this.tone(r,.35,.032);this.tone(r*1.5,.45,.023,'sine',.07);this.tone(r*2,.55,.014,'sine',.14)}
}
