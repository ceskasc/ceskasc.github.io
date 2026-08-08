(() => {
  const qs=(s,c=document)=>c.querySelector(s); const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header=qs('#site-header'), progress=qs('#scroll-progress'), menuBtn=qs('.menu-button'), mobile=qs('#mobile-nav');
  const dialog=qs('#letter-dialog'), dialogTitle=qs('#dialog-title'), dialogCopy=qs('#dialog-copy'), closeBtn=qs('.dialog-close');
  let lastTrigger=null;
  const letters={
    miss:{title:'Beni özlediğinde',body:['Bazen mesafe kilometre değildir; aynı evin içinde bile birini özleyebilirsin. Ama bizim hikâyemiz gerçek mesafeyi de gördü. Ankara’yı, Konya’yı, Denizli’yi ve aradaki yılları.','O yüzden şunu hatırla: Seni özlemek, senin olmadığın yerde sana yer açmak gibi. Benim günümde o yer hep var.']},
    heavy:{title:'Günün ağır geldiğinde',body:['Bugün güçlü görünmek zorunda değilsin. Her şeyi çözmek, herkese yetişmek ya da iyiymiş gibi davranmak zorunda da değilsin.','Eve geldiğinde yükünü kapının dışında bırakamasan bile, en azından tek başına taşımak zorunda değilsin.']},
    angry:{title:'Bana kızdığında',body:['Muhtemelen haklı olduğun bir yer vardır. Önce onu duymak isterim. Çünkü haklı çıkmaktan daha önemli bir şeyimiz var: aynı tarafta kalmak.','Biraz kız. Biraz sus. Sonra konuşalım. Yıllar sonra yeniden bulduğumuz şeyi küçük bir tartışmanın içinde kaybetmeyelim.']},
    future:{title:'Geleceğimizi düşündüğünde',body:['Geleceğin her ayrıntısını bilmek zorunda değiliz. Zaten bizim hikâyemiz planlandığı gibi gitmedi; yine de bizi Çeşme’de aynı eve getirdi.','Benim sevdiğim ihtimal şu: yıllar sonra bugünlere bakıp, “bunca yolu gerçekten birlikte yürümüşüz” diyebilmek.']}
  };
  function updateScroll(){
    const y=scrollY; header?.classList.toggle('scrolled',y>24);
    const max=document.documentElement.scrollHeight-innerHeight; if(progress) progress.style.transform=`scaleX(${max>0?Math.min(1,y/max):0})`;
  }
  addEventListener('scroll',updateScroll,{passive:true}); addEventListener('resize',updateScroll,{passive:true}); updateScroll();
  function closeMenu(){document.body.classList.remove('menu-open');mobile?.classList.remove('open');mobile?.setAttribute('aria-hidden','true');menuBtn?.setAttribute('aria-expanded','false');menuBtn?.setAttribute('aria-label','Menüyü aç')}
  function openMenu(){document.body.classList.add('menu-open');mobile?.classList.add('open');mobile?.setAttribute('aria-hidden','false');menuBtn?.setAttribute('aria-expanded','true');menuBtn?.setAttribute('aria-label','Menüyü kapat');qs('a',mobile)?.focus()}
  menuBtn?.addEventListener('click',()=>menuBtn.getAttribute('aria-expanded')==='true'?closeMenu():openMenu()); qsa('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));
  const observer=reduced?null:new IntersectionObserver((entries,o)=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -30px'});
  qsa('.reveal').forEach(el=>reduced?el.classList.add('visible'):observer.observe(el));
  function diffFromStart(){
    const start=new Date(2019,4,30); const now=new Date(); let y=now.getFullYear()-start.getFullYear(), m=now.getMonth()-start.getMonth(), d=now.getDate()-start.getDate();
    if(d<0){m--; d+=new Date(now.getFullYear(),now.getMonth(),0).getDate()} if(m<0){y--;m+=12}
    const Y=qs('#years'),M=qs('#months'),D=qs('#days'); if(Y)Y.textContent=y;if(M)M.textContent=m;if(D)D.textContent=d;
  } diffFromStart();
  function openLetter(key,trigger){const data=letters[key];if(!data||!dialog)return;lastTrigger=trigger;dialogTitle.textContent=data.title;dialogCopy.replaceChildren(...data.body.map(t=>{const p=document.createElement('p');p.textContent=t;return p}));document.body.classList.add('dialog-open');dialog.showModal();closeBtn?.focus()}
  qsa('.letter').forEach(b=>b.addEventListener('click',()=>openLetter(b.dataset.letter,b))); closeBtn?.addEventListener('click',()=>dialog.close()); dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()}); dialog?.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastTrigger?.focus()});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(dialog?.open)dialog.close();else closeMenu()});
  if(!reduced&&matchMedia('(pointer:fine)').matches){qsa('.chapter-photo img,.finale-photo img').forEach(img=>{const host=img.parentElement?.parentElement;host?.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5)*8;const y=((e.clientY-r.top)/r.height-.5)*8;img.style.transform=`scale(1.03) translate3d(${x}px,${y}px,0)`});host?.addEventListener('pointerleave',()=>img.style.transform='')})}
})();
