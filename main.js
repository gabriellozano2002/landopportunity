/* ===== PROJECTS LOADER =====
   Los proyectos se leen de projects.json (lista editable: nombre, sector,
   descripción, etc.). Las fotos NO van en el JSON: se descubren solas leyendo
   los archivos de la carpeta img/<id>/ (1.jpg, 2.jpg, 3.jpg ...).
   - Agregar/quitar fotos  -> sube o borra archivos en img/<id>/ (numerados sin saltos).
   - Video (opcional)       -> sube img/<id>/video.mp4 ; aparece un botón "▶ Video".
   - Agregar un proyecto    -> crea su carpeta img/<id>/ y añade su bloque en projects.json.
   Ver README.md para más detalle.                                            */

/* Extensiones que se prueban al descubrir fotos (en minúsculas). */
var _PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
var _PHOTO_MAX  = 40; /* tope de fotos por proyecto */

function _imgExists(src) {
  return new Promise(function (resolve) {
    var im = new Image();
    im.onload  = function () { resolve(true); };
    im.onerror = function () { resolve(false); };
    im.src = src;
  });
}

/* Descubre img/<id>/1.<ext>, 2.<ext> ... hasta que un número no exista. */
async function _discoverPhotos(id) {
  var fotos = [];
  for (var i = 1; i <= _PHOTO_MAX; i++) {
    var found = null;
    for (var e = 0; e < _PHOTO_EXTS.length; e++) {
      var src = 'img/' + id + '/' + i + '.' + _PHOTO_EXTS[e];
      if (await _imgExists(src)) { found = src; break; }
    }
    if (!found) break;
    fotos.push(found);
  }
  return fotos;
}

/* Comprueba si existe img/<id>/video.mp4 (devuelve la ruta o null). */
function _discoverVideo(id) {
  return new Promise(function (resolve) {
    var src = 'img/' + id + '/video.mp4';
    var v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = function () { resolve(src); };
    v.onerror = function () { resolve(null); };
    v.src = src;
  });
}

function _buildCard(p, fotos, video) {
  fotos = fotos || p.fotos || [];
  const card = document.createElement('div');
  card.className = 'pcard sect-' + p.sector;
  card.dataset.sector = p.sector;

  let galleryHtml = '';
  if (fotos && fotos.length > 0) {
    const slides = fotos.map(f => `<div class="gallery-slide" style="background-image:url('${f}')"></div>`).join('');
    const dots   = fotos.map((_,i) => `<div class="gdot${i===0?' active':''}" onclick="setSlide(this.closest('.pcard'),${i})"></div>`).join('');
    const videoBtn = video ? `<button class="gallery-videobtn" onclick="event.stopPropagation();openVideo('${video}')">&#9654; Video</button>` : '';
    galleryHtml = `
  <div class="pcard-gallery">
    <div class="gallery-slides" data-cur="0">${slides}</div>
    <button class="gallery-prev" onclick="slideGallery(this.closest('.pcard'),-1)">&#8249;</button>
    <button class="gallery-next" onclick="slideGallery(this.closest('.pcard'),1)">&#8250;</button>
    <div class="gallery-dots">${dots}</div>
    <span class="gallery-counter"><span class="gcur">1</span>/${fotos.length}</span>
    ${videoBtn}
  </div>`;
  }

  card.innerHTML = galleryHtml + `
  <div class="pcard-body">
    <div class="pcard-sector">${p.sectorLabel || p.sector}</div>
    <div class="pcard-name">${p.nombre}</div>
    <div class="pcard-loc">&#x1F4CD; ${p.ubicacion}</div>
    <div class="pcard-desc">${p.descripcion}</div>
    <div class="pcard-foot">
      <span class="pcard-status ${p.estatusClase}">${p.estatusLabel}</span>
      <button class="pcard-link" onclick="showPage('main');setTimeout(()=>goTo('#contact'),520)">M&#xE1;s informaci&#xF3;n</button>
    </div>
  </div>`;
  return card;
}

async function _loadProjects() {
  var projects = [];
  try {
    var res = await fetch('projects.json', { cache: 'no-cache' });
    var data = await res.json();
    projects = data.projects || [];
  } catch (err) {
    console.error('No se pudo cargar projects.json:', err);
  }

  /* Descubre fotos y video de cada proyecto (o usa p.fotos / p.video del JSON). */
  await Promise.all(projects.map(async function (p) {
    p._fotos = (Array.isArray(p.fotos) && p.fotos.length) ? p.fotos : await _discoverPhotos(p.id);
    p._video = p.video || await _discoverVideo(p.id);
  }));

  ['campestre','industrial','residencial','habitacional'].forEach(function(sector){
    var grid = document.getElementById('grid-' + sector);
    if(!grid) return;
    var empty = grid.querySelector('.pempty');
    if(empty) empty.remove();
    var sectorProjects = projects.filter(function(p){ return p.sector === sector; });
    sectorProjects.forEach(function(p){
      var card = _buildCard(p, p._fotos, p._video);
      grid.appendChild(card);
      addTilt(card);
      hoverEl(card);
    });
    if(sectorProjects.length === 0 && !grid.querySelector('.pcard')){
      var msg = document.createElement('div');
      msg.className = 'pempty';
      msg.textContent = 'Próximamente nuevos proyectos en este sector.';
      grid.appendChild(msg);
    }
  });
  if(typeof _initGalleries === 'function') _initGalleries();
  updateCount();
}

/* ===== VIDEO MODAL ===== */
function openVideo(src) {
  var ov = document.getElementById('vid-overlay');
  var pl = document.getElementById('vid-player');
  if (!ov || !pl) return;
  pl.src = src;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
  var pr = pl.play();
  if (pr && pr.catch) pr.catch(function(){}); /* ignora si el navegador bloquea el autoplay */
}
function closeVideo() {
  var ov = document.getElementById('vid-overlay');
  var pl = document.getElementById('vid-player');
  if (!ov || !pl) return;
  pl.pause();
  pl.removeAttribute('src');
  pl.load();
  ov.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function (e) {
  var ov = document.getElementById('vid-overlay');
  if (ov && ov.classList.contains('open') && e.key === 'Escape') closeVideo();
});

/* CURSOR */
const cur=document.getElementById('cur'),ring=document.getElementById('cur-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
(function anim(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(anim)})();
function hoverEl(el){el.addEventListener('mouseenter',()=>{ring.style.width='50px';ring.style.height='50px';ring.style.borderColor='rgba(114,181,132,.7)';cur.style.transform='translate(-50%,-50%) scale(1.6)'});el.addEventListener('mouseleave',()=>{ring.style.width='32px';ring.style.height='32px';ring.style.borderColor='rgba(114,181,132,.4)';cur.style.transform='translate(-50%,-50%) scale(1)'})}
document.querySelectorAll('a,button,.ind-card,.pillar,.pcard').forEach(hoverEl);

/* SCROLL */
const sprog=document.getElementById('sprog');
window.addEventListener('scroll',()=>{sprog.style.width=(window.scrollY/(document.body.scrollHeight-window.innerHeight)*100)+'%'});
const hdr=document.getElementById('hdr');
window.addEventListener('scroll',()=>{
  if(document.body.classList.contains('on-projects')){
    hdr.classList.add('scrolled');
  } else {
    hdr.classList.toggle('scrolled',window.scrollY>60);
  }
});
hdr.classList.add('scrolled');

/* MOBILE MENU */
function toggleMenu(){document.getElementById('main-nav').classList.toggle('open')}

/* PAGE ROUTER */
function showPage(id){
  /* header state ANTES del scrollTo para que el scroll event lo vea */
  if(id==='projects'){
    document.body.classList.add('on-projects');
    hdr.classList.add('scrolled');
  } else {
    document.body.classList.remove('on-projects');
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active-link'));
  if(id==='projects'){
    document.getElementById('nav-projects').classList.add('active-link');
    updateCount();
  } else {
    hdr.classList.toggle('scrolled',window.scrollY>60);
  }
  document.getElementById('main-nav').classList.remove('open');
}
function goTo(sel){const el=document.querySelector(sel);if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth'}),50)}

/* HERO CANVAS */
const canvas=document.getElementById('hero-canvas'),ctx=canvas.getContext('2d');
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}resize();
window.addEventListener('resize',resize);
const pts=Array.from({length:85},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,size:Math.random()*1.4+.3,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,op:Math.random()*.35+.1,c:Math.random()>.55?'212,168,67':Math.random()>.5?'232,201,122':'242,239,232'}));
window.pts=pts;
(function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pts.forEach((p,i)=>{
    pts.slice(i+1).forEach(q=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<110){ctx.strokeStyle=`rgba(212,168,67,${.06*(1-d/110)})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}});
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;
    if(p.y<0)p.y=canvas.height;if(p.y>canvas.height)p.y=0;
    ctx.fillStyle=`rgba(${p.c},${p.op})`;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
  requestAnimationFrame(draw);
})();

/* REVEAL */
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on')}),{threshold:.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.rev,.rev-l,.rev-r').forEach(el=>obs.observe(el));

/* COUNTERS */
const cobs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!e.target.dataset.done){e.target.dataset.done=1;const t=+e.target.dataset.target,dur=t>100?2200:1400,s=performance.now();(function tick(now){const p=Math.min((now-s)/dur,1),ease=1-Math.pow(1-p,3);e.target.textContent=Math.round(ease*t).toLocaleString('es-MX');if(p<1)requestAnimationFrame(tick)})(performance.now())}}),{threshold:.5});
document.querySelectorAll('.counter').forEach(el=>cobs.observe(el));

/* INDUSTRY PANELS */
function togglePanel(id){
  const panel=document.getElementById('panel-'+id),btn=document.getElementById('btn-'+id),open=panel.classList.contains('open');
  document.querySelectorAll('.ind-panel').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.ind-btn').forEach(b=>b.classList.remove('open'));
  if(!open){panel.classList.add('open');btn.classList.add('open')}
}

/* 3D TILT */
function addTilt(card){
  card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateY(${x*5}deg) rotateX(${-y*3}deg) translateZ(4px) translateY(-4px)`;card.style.transition='transform .08s'});
  card.addEventListener('mouseleave',()=>{card.style.transform='';card.style.transition='transform .6s ease,border-color .4s,box-shadow .4s'});
}
document.querySelectorAll('.ind-card,.pcard').forEach(addTilt);

/* FORM */
function submitForm(e){
  e.preventDefault();
  const nombre   = (document.getElementById('fNombre').value   + ' ' + document.getElementById('fApellido').value).trim();
  const correo   = document.getElementById('fCorreo').value;
  const telefono = document.getElementById('fTelefono').value;
  const sector   = document.getElementById('fSector').value;
  const mensaje  = document.getElementById('fMensaje').value;
  const texto =
    '*Consulta desde la página web*\n\n' +
    '*Nombre:* ' + nombre + '\n' +
    (correo   ? '*Correo:* '   + correo   + '\n' : '') +
    (telefono ? '*Teléfono:* ' + telefono + '\n' : '') +
    (sector   ? '*Sector:* '   + sector   + '\n' : '') +
    (mensaje  ? '\n*Mensaje:*\n' + mensaje : '');
  window.open('https://wa.me/528136056513?text=' + encodeURIComponent(texto), '_blank');
  document.getElementById('cForm').style.display='none';
  document.getElementById('formOk').style.display='block';
}

/* PROJECT FILTER */
function filterProjs(sector,btn){
  if(btn){document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
  ['campestre','industrial','residencial','habitacional'].forEach(s=>{
    const h=document.querySelector(`.psec-title[data-sector="${s}"]`),g=document.getElementById('grid-'+s);
    const show=sector==='all'||sector===s;
    h.style.display=show?'':'none';g.style.display=show?'':'none';
  });
  /* aplicar tema de sector a proj-page */
  const pp=document.querySelector('.proj-page');
  pp.classList.remove('sect-campestre','sect-industrial','sect-residencial','sect-habitacional');
  if(sector!=='all') pp.classList.add('sect-'+sector);
  updateCount();
}
function updateCount(){
  const total=document.querySelectorAll('.pcard').length;
  const el=document.getElementById('proj-count');
  if(el)el.textContent=total+(total===1?' proyecto':' proyectos');
}
updateCount();


/* GALERÍA */
function _galTotal(card) {
  return card.querySelectorAll('.gallery-slide').length || 1;
}
function _galCur(card) {
  return parseInt(card.querySelector('.gallery-slides').dataset.cur || '0');
}
function _galApply(card, idx) {
  const slides  = card.querySelector('.gallery-slides');
  const dots    = card.querySelectorAll('.gdot');
  const counter = card.querySelector('.gcur');
  const total   = _galTotal(card);
  idx = ((idx % total) + total) % total;
  slides.dataset.cur = idx;
  slides.style.transform = `translateX(-${idx * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  if (counter) counter.textContent = idx + 1;
}
function slideGallery(card, dir) {
  _galApply(card, _galCur(card) + dir);
}
function setSlide(card, idx) {
  _galApply(card, idx);
}

/* AUTOPLAY */
const _galTimers = new Map();
function _startAutoplay(card) {
  _stopAutoplay(card);
  _galTimers.set(card, setInterval(() => _galApply(card, _galCur(card) + 1), 3000));
}
function _stopAutoplay(card) {
  if (_galTimers.has(card)) { clearInterval(_galTimers.get(card)); _galTimers.delete(card); }
}

/* LIGHTBOX */
let _lbSlides = [], _lbIdx = 0;
function openLightbox(gallery, idx) {
  _lbSlides = Array.from(gallery.querySelectorAll('.gallery-slide')).map(s => s.style.backgroundImage);
  _lbIdx = idx;
  _renderLightbox();
  document.getElementById('glb-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('glb-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function lightboxNav(dir) {
  _lbIdx = ((_lbIdx + dir) % _lbSlides.length + _lbSlides.length) % _lbSlides.length;
  _renderLightbox();
}
function _renderLightbox() {
  document.getElementById('glb-img').style.backgroundImage = _lbSlides[_lbIdx];
  document.getElementById('glb-counter').textContent = (_lbIdx + 1) + ' / ' + _lbSlides.length;
}

/* GALLERY INIT */
function _initGalleries() {
  document.querySelectorAll('.pcard').forEach(card => {
    const gallery = card.querySelector('.pcard-gallery');
    if (!gallery) return;
    _startAutoplay(card);
    gallery.addEventListener('mouseenter', () => _stopAutoplay(card));
    gallery.addEventListener('mouseleave', () => _startAutoplay(card));
    gallery.querySelectorAll('.gallery-prev, .gallery-next, .gdot').forEach(btn => {
      btn.addEventListener('click', () => _startAutoplay(card));
    });
    gallery.querySelectorAll('.gallery-slide').forEach((slide, idx) => {
      slide.addEventListener('click', () => openLightbox(gallery, idx));
    });
  });
  document.addEventListener('keydown', e => {
    const ov = document.getElementById('glb-overlay');
    if (!ov.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
  });
}

/* ===== V4 PREMIUM ANIMATION ENGINE ===== */

/* ---- TICKER STRIP ---- */
(function initTicker(){
  const items = [
    {text:'Fraccionamientos Campestres', cls:''},
    {text:'30+ Años de Trayectoria', cls:'gold'},
    {text:'Certeza Jurídica Total', cls:'teal'},
    {text:'Parques Industriales', cls:''},
    {text:'San Pedro Garza García · N.L.', cls:'gold'},
    {text:'Desarrolladora Inmobiliaria', cls:'teal'},
    {text:'Residencial Campestre · Habitacional', cls:''},
    {text:'Proyectos de Alto Valor', cls:'gold'},
    {text:'Infraestructura de Primer Nivel', cls:'teal'},
    {text:'Inversión Segura y Rentable', cls:''},
  ];
  const track = document.getElementById('ticker-track');
  if(!track) return;
  const buildSet = () => items.map(it=>`<span class="ticker-item ${it.cls}"><span class="ticker-dot"></span>${it.text}</span>`).join('');
  track.innerHTML = buildSet() + buildSet(); // duplicate for seamless loop
})();

/* ---- HERO SPOTLIGHT ---- */
(function heroSpotlight(){
  const sp = document.getElementById('hero-spotlight');
  const hero = document.querySelector('.hero');
  if(!sp || !hero) return;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
    const y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
    sp.style.setProperty('--sx', x + '%');
    sp.style.setProperty('--sy', y + '%');
  });
  hero.addEventListener('mouseleave', () => {
    sp.style.setProperty('--sx', '50%');
    sp.style.setProperty('--sy', '50%');
  });
})();

/* ---- TYPEWRITER ON HERO SUB ---- */
(function typewriter(){
  const el = document.getElementById('hero-typewriter');
  if(!el) return;
  const text = 'Desarrolladora inmobiliaria con más de 30 años transformando terrenos en proyectos sólidos de alto valor. Fraccionamientos campestres, industriales, residenciales y habitacionales.';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.style.cssText='display:inline-block;width:2px;height:1em;background:var(--green-light);vertical-align:middle;margin-left:2px;animation:blinkCaret .7s step-end infinite';
  const style = document.createElement('style');
  style.textContent='@keyframes blinkCaret{0%,100%{opacity:1}50%{opacity:0}}';
  document.head.appendChild(style);
  el.appendChild(cursor);
  function type(){
    if(i < text.length){
      el.insertBefore(document.createTextNode(text[i]), cursor);
      i++;
      setTimeout(type, i < 5 ? 30 : Math.random() * 28 + 14);
    } else {
      setTimeout(()=>cursor.remove(), 1800);
    }
  }
  setTimeout(type, 1600);
})();

/* V3 engine blocks removed — all replaced by V4 engine below */

/* ---- V4: CANVAS COLOR OVERRIDE (emerald + teal + gold) ---- */
(function patchCanvasColors(){
  if(!window.pts) return;
  window.pts.forEach(p=>{
    const r = Math.random();
    p.c = r > .55 ? '0,196,140' : r > .28 ? '10,189,227' : '226,185,106';
  });
})();

/* ---- V4: SVG STAT RINGS (redesigned — content inside circle) ---- */
(function statRings(){
  const ns = 'http://www.w3.org/2000/svg';
  const R = 75, CX = 80, CY = 80, CIRC = 2 * Math.PI * R; // ~471

  const iconPaths = [
    /* hourglass - años */ '<path d="M6 2h12v5l-5 5 5 5v5H6v-5l5-5-5-5V2zm0 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="7" x2="18" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="1.5"/>',
    /* grid - sectores */ '<rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    /* shield check - certeza */ '<path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polyline points="8,12 11,15 16,10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    /* diamond - fundación */ '<polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width=".8" opacity=".4"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width=".8" opacity=".4"/>',
  ];

  document.querySelectorAll('.stat-cell').forEach((cell, idx)=>{
    const numEl  = cell.querySelector('.stat-num');
    const labEl  = cell.querySelector('.stat-label');
    if(!numEl) return;

    /* --- build circle wrap --- */
    const wrap = document.createElement('div');
    wrap.className = 'stat-circle-wrap';

    /* SVG ring */
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 160 160');
    svg.setAttribute('width','160'); svg.setAttribute('height','160');
    svg.className = 'stat-circle-svg';

    const gid = 'srg'+idx;
    const defs = document.createElementNS(ns,'defs');

    const lg = document.createElementNS(ns,'linearGradient');
    lg.id=gid; lg.setAttribute('x1','0%'); lg.setAttribute('y1','0%'); lg.setAttribute('x2','100%'); lg.setAttribute('y2','100%');
    [['0%','#D4A843'],['50%','#D4A843'],['100%','#e2b96a']].forEach(([o,c])=>{
      const s=document.createElementNS(ns,'stop'); s.setAttribute('offset',o); s.setAttribute('stop-color',c); lg.appendChild(s);
    });
    defs.appendChild(lg);

    /* glow filter */
    const filt = document.createElementNS(ns,'filter');
    filt.id='glow'+idx; filt.setAttribute('x','-20%'); filt.setAttribute('y','-20%'); filt.setAttribute('width','140%'); filt.setAttribute('height','140%');
    const blur=document.createElementNS(ns,'feGaussianBlur'); blur.setAttribute('in','SourceGraphic'); blur.setAttribute('stdDeviation','3'); blur.setAttribute('result','b');
    const merge=document.createElementNS(ns,'feMerge');
    const mn1=document.createElementNS(ns,'feMergeNode'); mn1.setAttribute('in','b');
    const mn2=document.createElementNS(ns,'feMergeNode'); mn2.setAttribute('in','SourceGraphic');
    merge.appendChild(mn1); merge.appendChild(mn2); filt.appendChild(blur); filt.appendChild(merge);
    defs.appendChild(filt);
    svg.appendChild(defs);

    /* track ring */
    const track=document.createElementNS(ns,'circle');
    track.setAttribute('cx',CX); track.setAttribute('cy',CY); track.setAttribute('r',R);
    track.setAttribute('fill','rgba(212,168,67,0.06)'); track.setAttribute('stroke','rgba(212,168,67,0.18)'); track.setAttribute('stroke-width','2');
    svg.appendChild(track);

    /* progress ring */
    const prog=document.createElementNS(ns,'circle');
    prog.setAttribute('cx',CX); prog.setAttribute('cy',CY); prog.setAttribute('r',R);
    prog.setAttribute('fill','none'); prog.setAttribute('stroke',`url(#${gid})`); prog.setAttribute('stroke-width','2.5');
    prog.setAttribute('stroke-linecap','round'); prog.setAttribute('stroke-dasharray',CIRC); prog.setAttribute('stroke-dashoffset',CIRC);
    prog.setAttribute('transform',`rotate(-90 ${CX} ${CY})`);
    prog.setAttribute('filter',`url(#glow${idx})`);
    prog.style.transition='stroke-dashoffset 2s cubic-bezier(.22,1,.36,1)';
    svg.appendChild(prog);

    /* dots at ends */
    const dot=document.createElementNS(ns,'circle');
    dot.setAttribute('cx',CX); dot.setAttribute('cy',CY-R); dot.setAttribute('r','3');
    dot.setAttribute('fill','#D4A843'); dot.setAttribute('opacity','.8');
    svg.appendChild(dot);

    wrap.appendChild(svg);

    /* inner content div */
    const inner = document.createElement('div');
    inner.className = 'stat-circle-inner';

    /* icon */
    const iconSvg = document.createElementNS(ns,'svg');
    iconSvg.setAttribute('viewBox','0 0 24 24'); iconSvg.setAttribute('width','28'); iconSvg.setAttribute('height','28');
    iconSvg.className = 'stat-icon-svg';
    iconSvg.setAttribute('color','#D4A843');
    iconSvg.innerHTML = iconPaths[idx] || iconPaths[0];
    inner.appendChild(iconSvg);

    /* move num inside */
    inner.appendChild(numEl);
    wrap.appendChild(inner);

    /* insert wrap before label */
    if(labEl) cell.insertBefore(wrap, labEl);
    else cell.appendChild(wrap);

    /* trigger ring animation on scroll */
    new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){ prog.setAttribute('stroke-dashoffset','0'); }
    }),{threshold:.4}).observe(cell);
  });
})();

/* ---- V4: CURSOR COLOR UPDATE ---- */
(function updateCursorColors(){
  const curEl = document.getElementById('cur');
  const ringEl = document.getElementById('cur-ring');
  if(!curEl || !ringEl) return;
  // already styled via CSS, but add teal glow on link hover
  document.querySelectorAll('a,button,.ind-card,.pillar,.pcard').forEach(el=>{
    el.addEventListener('mouseenter',()=>{
      curEl.style.background='#E8C97A';
      curEl.style.boxShadow='0 0 16px rgba(212,168,67,.7)';
      ringEl.style.borderColor='rgba(212,168,67,.5)';
    });
    el.addEventListener('mouseleave',()=>{
      curEl.style.background='';
      curEl.style.boxShadow='';
      ringEl.style.borderColor='';
    });
  });
})();

/* ---- V4: HERO OVERLAY V4 COLORS ---- */
(function patchHeroOverlay(){
  const ov = document.querySelector('.hero-overlay');
  if(ov) ov.style.background='radial-gradient(ellipse 70% 60% at 60% 45%,rgba(212,168,67,.07),transparent 65%),radial-gradient(ellipse 40% 50% at 15% 75%,rgba(232,201,122,.05),transparent 55%),linear-gradient(to bottom,rgba(12,12,12,.2) 0%,rgba(12,12,12,.04) 45%,rgba(12,12,12,.75) 100%)';
})();

/* ---- V4: SECTION TAG GLOW ---- */
(function sectionTagGlow(){
  document.querySelectorAll('.section-tag').forEach(tag=>{
    const obs = new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){
        tag.style.transition='text-shadow .8s ease';
        tag.style.textShadow='0 0 20px rgba(212,168,67,.4)';
        setTimeout(()=>tag.style.textShadow='0 0 8px rgba(212,168,67,.15)',1200);
        obs.disconnect();
      }
    }),{threshold:.8});
    obs.observe(tag);
  });
})();

/* ---- V4: CARD INNER LIGHT TRAIL ---- */
(function cardLightTrail(){
  document.querySelectorAll('.pcard,.ind-card').forEach(card=>{
    const trail = document.createElement('div');
    trail.style.cssText='position:absolute;width:120px;height:120px;border-radius:50%;pointer-events:none;z-index:1;opacity:0;transition:opacity .2s;background:radial-gradient(circle,rgba(212,168,67,.18) 0%,transparent 70%);transform:translate(-50%,-50%);top:0;left:0';
    card.style.position='relative'; card.style.overflow='hidden';
    card.appendChild(trail);
    card.addEventListener('mousemove',e=>{
      const r = card.getBoundingClientRect();
      trail.style.left = (e.clientX - r.left)+'px';
      trail.style.top = (e.clientY - r.top)+'px';
      trail.style.opacity='1';
    });
    card.addEventListener('mouseleave',()=>trail.style.opacity='0');
  });
})();

/* ---- V4: MISSION BAND TYPEWRITER QUOTE ---- */
(function missionTypewriter(){
  const q = document.querySelector('.mission-q');
  if(!q) return;
  q.style.opacity='0';
  const obs = new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){
      q.style.transition='opacity .6s';
      q.style.opacity='1';
      obs.disconnect();
    }
  }),{threshold:.4});
  obs.observe(q);
})();

/* ---- V4: PARTICLE BURST (upgraded colors) ---- */
(function particleBurstV4(){
  const colors=['#E8C97A','#D4A843','#e2b96a','#f0d090','#D4A843','#c97b4b','#b2f0da'];
  function burst(x,y){
    for(let i=0;i<22;i++){
      const p=document.createElement('div');
      p.className='particle';
      const angle=(i/22)*Math.PI*2+(Math.random()-.5)*.4;
      const dist=50+Math.random()*90;
      p.style.cssText=`left:${x}px;top:${y}px;width:${3+Math.random()*7}px;height:${3+Math.random()*7}px;background:${colors[Math.floor(Math.random()*colors.length)]};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--dur:${.55+Math.random()*.6}s`;
      document.body.appendChild(p);
      p.addEventListener('animationend',()=>p.remove());
    }
  }
  document.querySelectorAll('.btn-primary,.btn-gold,.btn-outline,.form-submit,.nav-cta').forEach(btn=>{
    btn.addEventListener('click',e=>burst(e.clientX,e.clientY));
  });
})();

/* ---- V4: SMOOTH PAGE TRANSITIONS ---- */
const _origShowPage = showPage;
window.showPage = function(id){
  const current = document.querySelector('.page.active');
  if(current && current.id !== 'page-'+id){
    current.classList.add('page-exit');
    setTimeout(()=>{
      current.classList.remove('active','page-exit');
      const next = document.getElementById('page-'+id);
      next.classList.add('page-enter','active');
      requestAnimationFrame(()=>requestAnimationFrame(()=>next.classList.remove('page-enter')));
      window.scrollTo({top:0,behavior:'instant'});
      document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active-link'));
      if(id==='projects'){document.getElementById('nav-projects').classList.add('active-link');updateCount();}
      document.getElementById('main-nav').classList.remove('open');
    }, 360);
  } else if(!current || current.id !== 'page-'+id){
    _origShowPage(id);
  }
};

/* ---- V4: MAGNETIC BUTTONS ---- */
(function magneticButtons(){
  document.querySelectorAll('.btn-primary,.btn-gold,.btn-outline,.nav-cta').forEach(btn=>{
    const wrap=document.createElement('span');
    wrap.className='mag-btn';
    btn.parentNode.insertBefore(wrap,btn);
    wrap.appendChild(btn);
    wrap.addEventListener('mousemove',e=>{
      const r=wrap.getBoundingClientRect();
      const dx=(e.clientX-r.left-r.width/2)*.28;
      const dy=(e.clientY-r.top-r.height/2)*.28;
      wrap.style.transform=`translate(${dx}px,${dy}px)`;
    });
    wrap.addEventListener('mouseleave',()=>wrap.style.transform='');
  });
})();

/* ---- V4: PARALLAX HERO ---- */
(function heroParallax(){
  const content=document.querySelector('.hero-content');
  const overlay=document.querySelector('.hero-overlay');
  if(!content||!overlay)return;
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    if(y<window.innerHeight){
      content.style.transform=`translateY(${y*.3}px)`;
      overlay.style.transform=`translateY(${y*.12}px)`;
    }
  },{passive:true});
})();

/* ---- V4: SECTION GLINT ---- */
(function initGlint(){
  const gobs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting&&!e.target.dataset.glinted){
      e.target.dataset.glinted=1;
      e.target.classList.add('glint-run');
    }
  }),{threshold:.4});
  document.querySelectorAll('.section-heading').forEach(el=>gobs.observe(el));
})();

/* ---- V4: ANIMATED DIVIDERS ---- */
(function dividerReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting)e.target.classList.add('on');
  }),{threshold:.5});
  document.querySelectorAll('.divider').forEach(el=>obs.observe(el));
})();

/* ---- V4: STAGGER ---- */
(function staggerSections(){
  const sobs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting&&!e.target.dataset.staggered){
      e.target.dataset.staggered=1;
      e.target.classList.add('staggered');
    }
  }),{threshold:.15});
  document.querySelectorAll('.pillars,.leadership-pillars,.stats-grid,.hero-actions').forEach(el=>{
    el.classList.add('stagger-children');
    sobs.observe(el);
  });
})();

/* ---- V4: CANVAS MOUSE REPULSION (enhanced) ---- */
(function canvasRepulsion(){
  let mx=window.innerWidth/2,my=window.innerHeight/2;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY},{passive:true});
  function repulse(){
    if(window.pts){
      window.pts.forEach(p=>{
        const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);
        if(d<100&&d>0){
          const f=(100-d)/100*.1;
          p.vx+=dx/d*f; p.vy+=dy/d*f;
          p.vx*=.95; p.vy*=.95;
        }
      });
    }
    requestAnimationFrame(repulse);
  }
  setTimeout(repulse,250);
})();

/* ---- NAV TO MAIN PAGE SECTION (from any page) ---- */
function navToMain(anchor){
  const onMain = document.getElementById('page-main').classList.contains('active');
  if(onMain){
    goTo(anchor);
  } else {
    showPage('main');
    setTimeout(()=>goTo(anchor), 420);
  }
}

/* ---- NAVIGATE TO A SPECIFIC PROJECT CARD ---- */
function goToProjectCard(sector, projectName){
  showPage('projects');
  setTimeout(()=>{
    // apply sector filter
    const sectorMap = {campestre:'[onclick*="campestre"]',industrial:'[onclick*="industrial"]',residencial:'[onclick*="residencial"]',habitacional:'[onclick*="habitacional"]'};
    const tab = document.querySelector('.filter-bar ' + (sectorMap[sector]||''));
    if(tab) filterProjs(sector, tab);

    // find the matching card by name and scroll + highlight it
    setTimeout(()=>{
      const cards = document.querySelectorAll('.pcard');
      let target = null;
      cards.forEach(card=>{
        const nameEl = card.querySelector('.pcard-name');
        if(nameEl && nameEl.textContent.trim() === projectName) target = card;
      });
      if(target){
        target.scrollIntoView({behavior:'smooth', block:'center'});
        // brief highlight flash
        target.style.transition='box-shadow .3s,border-color .3s';
        target.style.boxShadow='0 0 0 2px rgba(212,168,67,.8), 0 0 40px rgba(212,168,67,.3)';
        target.style.borderColor='rgba(212,168,67,.8)';
        setTimeout(()=>{
          target.style.boxShadow='';
          target.style.borderColor='';
        }, 1800);
      }
    }, 80);
  }, 420);
}

/* ---- NAVIGATE TO PROJECTS PAGE WITH SECTOR FILTER ---- */
function goToProjectsSector(sector){
  // Map sector names to filter tab selectors
  const sectorMap = {
    campestre:    '[onclick*="campestre"]',
    industrial:   '[onclick*="industrial"]',
    residencial:  '[onclick*="residencial"]',
    habitacional: '[onclick*="habitacional"]',
  };
  showPage('projects');
  setTimeout(()=>{
    const tabSel = sectorMap[sector];
    if(tabSel){
      const tab = document.querySelector('.filter-bar ' + tabSel);
      if(tab) filterProjs(sector, tab);
    }
    // scroll to the sector section in the projects page
    const sectionTitle = document.querySelector('.psec-title[data-sector="'+sector+'"]');
    if(sectionTitle) sectionTitle.scrollIntoView({behavior:'smooth', block:'start'});
  }, 420);
}

/* ADD PROJECT — usa esta función cuando mandes tus proyectos:
addProject({
  sector: 'campestre',        // campestre | industrial | residencial | habitacional
  name: 'Nombre del Proyecto',
  location: 'Municipio, N.L.',
  status: 'active',           // active | pre | coming
  description: 'Descripción.',
  icon: '🌿'
});
*/
function addProject({sector,name,location,status,description,icon}){
  const grid=document.getElementById('grid-'+sector);
  const empty=grid.querySelector('.pempty');if(empty)empty.remove();
  const statusMap={active:['s-active','Activo'],pre:['s-pre','Preventa'],coming:['s-coming','Próximamente']};
  const[cls,label]=statusMap[status]||statusMap.coming;
  const sectorLabels={campestre:'Fraccionamiento Campestre',industrial:'Parque Industrial',residencial:'Fraccionamientos Residencial Campestre',habitacional:'Departamentos Habitacionales'};
  const card=document.createElement('div');card.className='pcard';card.dataset.sector=sector;
  card.className='pcard stagger-item sect-'+sector; card.innerHTML=`<div class="pcard-thumb">${icon||'🏗️'}</div><div class="pcard-body"><div class="pcard-sector">${sectorLabels[sector]||sector}</div><div class="pcard-name">${name}</div><div class="pcard-loc">📍 ${location}</div><div class="pcard-desc">${description}</div><div class="pcard-foot"><span class="pcard-status ${cls}">${label}</span><button class="pcard-link" onclick="showPage('main');setTimeout(()=>goTo('#contact'),520)">Más información</button></div></div>`;
  grid.appendChild(card);addTilt(card);hoverEl(card);updateCount();
}

/* DEMO — descomenta para probar con proyectos de ejemplo:
addProject({sector:'campestre',name:'Lomas del Roble',location:'Santiago, N.L.',status:'active',description:'Lotes de 500–1,200m² con vista a la sierra. Infraestructura completa y escrituras incluidas.',icon:'🌿'});
addProject({sector:'industrial',name:'Parque Logístico Norte',location:'Escobedo, N.L.',status:'pre',description:'150,000m² para manufactura y logística con acceso directo a carretera federal.',icon:'🏭'});
addProject({sector:'residencial',name:'Hacienda Real',location:'San Pedro Garza García, N.L.',status:'active',description:'Fraccionamiento privado con vigilancia 24/7, club de golf y amenidades exclusivas.',icon:'🏡'});
*/

/* ===== INIT ===== */
/* Con defer el DOM ya está listo al ejecutar este script */
_initGalleries();
_loadProjects();
