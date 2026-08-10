import { DrawingRenderer, SoundEngine, ease, TAU } from './engine.js';
import { analyze } from './scoring.js';

const $ = id => document.getElementById(id);
const body = document.body;
const intro = $('intro');
const ready = $('ready');
const result = $('result');
const start = $('startButton');
const again = $('againButton');
const share = $('shareButton');
const home = $('homeButton');
const best = $('bestBadge');
const hud = $('traceHud');
const count = $('pointCount');
const toast = $('toast');
const scoreEl = $('scoreValue');
const verdict = $('verdict');
const note = $('resultNote');
const thesis = $('thesisText');
const mRadial = $('mRadial');
const mClosure = $('mClosure');
const mCoverage = $('mCoverage');
const mPath = $('mPath');
const newBest = $('newBest');
const runLabel = $('runLabel');
const traceId = $('traceId');
const localeBadge = $('localeBadge');
const resultVisual = $('resultVisual');

const copy = {
  en: {
    introMicro: 'A PHILOSOPHICAL GAME ABOUT FORM, ERROR & MEMORY',
    introTitle: 'EVERY PERFECT<br>CIRCLE LIVES FIRST<br><em>IN THOUGHT.</em>',
    introLede: 'Can the hand imitate what the mind calls perfect? Draw one circle from memory. We will measure the distance between the ideal and the trace you leave behind.',
    axiom: 'Perfection belongs to ideas. Error belongs to living things.',
    enter: 'BEGIN THE TRIAL',
    readyMicro: 'DO NOT CORRECT THE HAND',
    readyTitle: 'DRAW THE IDEA<br><em>FROM MEMORY.</em>',
    readyLede: 'One continuous gesture. Draw one large closed circle. Release at the exact moment it feels complete.',
    awaiting: 'THE CANVAS IS WAITING',
    oneStroke: 'ONE GESTURE ONLY',
    resultHead: 'IDEA / MATTER',
    ideal: 'IDEAL',
    trace: 'TRACE',
    scoreKicker: 'PROXIMITY TO THE IDEA',
    thesisLabel: 'THESIS',
    radial: 'RADIAL ERROR',
    closure: 'CLOSURE',
    coverage: 'COVERAGE',
    path: 'PATH EXCESS',
    again: 'TRY AGAIN',
    share: 'SHARE THE TRACE',
    newBest: 'NEW PERSONAL BEST / STORED ON THIS DEVICE',
    liveTrace: 'LIVE TRACE',
    dontThink: 'LET THE HAND DECIDE.',
    whisper: 'THE MIND NAMES THE FORM. THE HAND TESTS IT.',
    invalid: 'DRAW ONE LARGE CLOSED CIRCLE',
    copied: 'LINK COPIED',
    shareFail: 'SHARING UNAVAILABLE',
    bands: {
      anomaly: ['AN IMPROBABLE LIKENESS.', 'For a moment, the trace almost vanished behind the ideal.', 'The closer matter approaches an idea, the more mysterious its remaining flaw becomes.'],
      rare: ['NEARLY ABSTRACT.', 'Your circle remained unusually close to the mathematical form.', 'Perfection never arrived — but the small residue of error is precisely what makes the trace human.'],
      precise: ['DISCIPLINED FORM.', 'The geometry is calm and controlled, yet the hand still shows through.', 'A perfect circle would say nothing about you. Deviation is what turns form into expression.'],
      close: ['THE IDEA HOLDS.', 'The circle is clear; the human gesture is clearer.', 'We recognize forms not because matter becomes perfect, but because it leans toward the ideal.'],
      human: ['A HUMAN FIGURE.', 'The form is coherent, alive and recognizably made by a body.', 'Error is not the enemy of form. It is evidence that form passed through a living hand.'],
      organic: ['MATTER RESISTS.', 'Gesture chose expression over obedience.', 'When the copy fails, it often reveals more about the maker than the perfect original ever could.']
    }
  },
  tr: {
    introMicro: 'FORM, HATA VE HAFIZA ÜZERİNE FELSEFİ BİR OYUN',
    introTitle: 'HER KUSURSUZ<br>DAİRE ÖNCE<br><em>DÜŞÜNCEDE</em> YAŞAR.',
    introLede: 'El, zihnin kusursuz dediği şeyi taklit edebilir mi? Hafızandan tek bir daire çiz. İdeal ile geride bıraktığın iz arasındaki mesafeyi ölçeceğiz.',
    axiom: 'Kusursuzluk fikirlere aittir. Hata yaşayan şeylere.',
    enter: 'DENEYİ BAŞLAT',
    readyMicro: 'ELİ DÜZELTME',
    readyTitle: 'FİKRİ<br><em>HAFIZANDAN ÇİZ.</em>',
    readyLede: 'Tek ve kesintisiz bir hareket. Büyük, kapalı bir daire çiz. Tamamlandığını hissettiğin anda bırak.',
    awaiting: 'TUVAL SENİ BEKLİYOR',
    oneStroke: 'TEK HAREKET',
    resultHead: 'İDEA / MADDE',
    ideal: 'İDEAL',
    trace: 'İZ',
    scoreKicker: 'İDEAYA YAKINLIK',
    thesisLabel: 'TEZ',
    radial: 'RADYAL HATA',
    closure: 'KAPANIŞ',
    coverage: 'TUR TAMLIĞI',
    path: 'YOL FAZLASI',
    again: 'TEKRAR DENE',
    share: 'İZİ PAYLAŞ',
    newBest: 'YENİ KİŞİSEL EN İYİ / BU CİHAZDA SAKLANDI',
    liveTrace: 'CANLI İZ',
    dontThink: 'BIRAK EL KARAR VERSİN.',
    whisper: 'FORMU ZİHİN ADLANDIRIR. EL ONU SINAR.',
    invalid: 'BÜYÜK VE KAPALI TEK BİR DAİRE ÇİZ',
    copied: 'BAĞLANTI KOPYALANDI',
    shareFail: 'PAYLAŞIM KULLANILAMIYOR',
    bands: {
      anomaly: ['OLASILIK DIŞI BİR BENZERLİK.', 'Bir anlığına iz, idealin arkasında neredeyse kayboldu.', 'Madde bir fikre yaklaştıkça, geriye kalan kusur daha gizemli bir hâl alır.'],
      rare: ['NEREDEYSE SOYUT.', 'Dairen matematiksel forma alışılmadık kadar yakın kaldı.', 'Kusursuzluk yine gelmedi — ama geride kalan küçük hata izi tam da onu insana ait kılıyor.'],
      precise: ['DİSİPLİNLİ FORM.', 'Geometri sakin ve kontrollü; ama el hâlâ görünür.', 'Kusursuz bir daire senin hakkında hiçbir şey söylemezdi. İfade, sapmayla başlar.'],
      close: ['FİKİR AYAKTA.', 'Daire açık; insan hareketi daha da açık.', 'Formları, madde kusursuz olduğu için değil, ideale yöneldiği için tanırız.'],
      human: ['İNSANİ BİR ŞEKİL.', 'Form tutarlı, canlı ve bedensel bir hareketten doğduğu belli.', 'Hata formun düşmanı değildir. Formun yaşayan bir elden geçtiğinin kanıtıdır.'],
      organic: ['MADDE DİRENİYOR.', 'Hareket itaat yerine ifadeyi seçti.', 'Kopya başarısız olduğunda bile, çoğu zaman yapan kişiyi kusursuz aslından daha çok açığa çıkarır.']
    }
  }
};

function detectLocale() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const langs = navigator.languages || [navigator.language || ''];
  return tz === 'Europe/Istanbul' || langs.some(x => /^tr(?:-|$)/i.test(x)) ? 'tr' : 'en';
}

let lang = detectLocale();
let T = copy[lang];
document.documentElement.lang = lang;
localeBadge.textContent = lang.toUpperCase();
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.dataset.i18n;
  if (T[key]) el.textContent = T[key];
});
document.querySelectorAll('[data-i18n-html]').forEach(el => {
  const key = el.dataset.i18nHtml;
  if (T[key]) el.innerHTML = T[key];
});

const draw = new DrawingRenderer($('draw'));
const sound = new SoundEngine();
let mode = 'intro';
let pointer = null;
let current = null;
let runs = 0;
let timer = 0;

const vibrate = pattern => { try { navigator.vibrate?.(pattern); } catch {} };

function setMode(next) {
  mode = next;
  body.dataset.mode = next;
  body.classList.toggle('is-drawing', next === 'drawing');
  intro.classList.toggle('is-active', next === 'intro');
  ready.classList.toggle('is-active', next === 'ready');
  result.classList.toggle('is-active', next === 'result');
  hud.classList.toggle('is-visible', next === 'drawing');
}

function msg(text) {
  toast.textContent = text;
  toast.classList.add('is-visible');
  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.remove('is-visible'), 1500);
}

const BEST_KEY = 'eidos.best.v8';
function loadBest() {
  const value = +localStorage.getItem(BEST_KEY);
  if (value) {
    best.hidden = false;
    best.querySelector('b').textContent = value.toFixed(3) + '%';
  }
}
function saveBest(value) {
  const old = +localStorage.getItem(BEST_KEY);
  newBest.hidden = !(value > old);
  if (value > old) localStorage.setItem(BEST_KEY, value.toFixed(3));
  loadBest();
}

function reset() {
  current = null;
  draw.reset();
  count.textContent = '000';
  setMode('ready');
}

start.onclick = () => { sound.begin(); vibrate(8); reset(); };
again.onclick = () => { sound.begin(); vibrate(7); reset(); };
home.onclick = () => {
  pointer = null;
  current = null;
  draw.reset();
  setMode('intro');
};

const point = e => ({ x: e.clientX, y: e.clientY, t: performance.now(), p: e.pressure || 0.5 });

addEventListener('pointerdown', e => {
  if (mode !== 'ready' || e.target.closest?.('button')) return;
  e.preventDefault();
  pointer = e.pointerId;
  draw.reset();
  draw.start(point(e));
  setMode('drawing');
  sound.pen();
  vibrate(5);
}, { passive: false });

addEventListener('pointermove', e => {
  if (mode !== 'drawing' || pointer !== e.pointerId) return;
  e.preventDefault();
  for (const q of (e.getCoalescedEvents?.() || [e])) draw.add(point(q));
  count.textContent = String(draw.points.length).padStart(3, '0').slice(-3);
}, { passive: false });

function finish(e) {
  if (mode !== 'drawing' || pointer !== e.pointerId) return;
  e.preventDefault();
  pointer = null;
  draw.add(point(e));
  const analysis = analyze(draw.points);
  if (!analysis) {
    vibrate([8, 24, 8]);
    msg(T.invalid);
    setTimeout(reset, 280);
    return;
  }
  current = analysis;
  runs++;
  analysis.id = Math.random().toString(36).slice(2, 6).toUpperCase();
  setMode('result');
  requestAnimationFrame(() => draw.finish(analysis, resultVisual.getBoundingClientRect()));
  saveBest(analysis.score);
  sound.result(analysis.score);
  vibrate(analysis.score > 97 ? [9, 20, 15] : 10);
  show(analysis);
}

addEventListener('pointerup', finish, { passive: false });
addEventListener('pointercancel', e => {
  if (e.pointerId === pointer) {
    pointer = null;
    reset();
  }
});

function animate(el, to, duration = 760, digits = 1, suffix = '') {
  const startAt = performance.now();
  function tick(now) {
    const t = ease((now - startAt) / duration);
    el.textContent = (to * t).toFixed(digits) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function show(analysis) {
  const band = T.bands[analysis.band];
  traceId.textContent = 'TRACE / ' + analysis.id;
  runLabel.textContent = 'RUN / ' + String(runs).padStart(3, '0');
  scoreEl.textContent = '0.000';
  verdict.textContent = band[0];
  note.textContent = band[1];
  thesis.textContent = band[2];
  mRadial.textContent = mClosure.textContent = mCoverage.textContent = mPath.textContent = '—';
  setTimeout(() => animate(scoreEl, analysis.score, 920, 3), 80);
  setTimeout(() => {
    mRadial.textContent = analysis.radialPct.toFixed(2) + '%';
    mClosure.textContent = analysis.closurePct.toFixed(1) + '%';
    mCoverage.textContent = analysis.coveragePct.toFixed(1) + '%';
    mPath.textContent = analysis.pathPct.toFixed(2) + '%';
  }, 280);
}

function card(analysis) {
  return new Promise((resolve, reject) => {
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1350;
    const x = c.getContext('2d');

    x.fillStyle = '#0b0908';
    x.fillRect(0, 0, c.width, c.height);
    const glow = x.createRadialGradient(760, 320, 0, 760, 320, 720);
    glow.addColorStop(0, 'rgba(197,154,96,.18)');
    glow.addColorStop(.42, 'rgba(100,120,255,.05)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = glow;
    x.fillRect(0, 0, c.width, c.height);

    x.strokeStyle = 'rgba(239,231,216,.12)';
    x.lineWidth = 1;
    x.beginPath();
    x.arc(730, 430, 282, 0, TAU);
    x.stroke();

    const scale = Math.min(265 / analysis.fit.r, 0.96);
    x.save();
    x.translate(730 - analysis.fit.cx * scale, 430 - analysis.fit.cy * scale);
    x.scale(scale, scale);
    x.lineCap = x.lineJoin = 'round';
    for (let i = 1; i < analysis.sampled.length; i++) {
      const a = analysis.sampled[i - 1];
      const b = analysis.sampled[i];
      const d = Math.min(1, Math.abs(analysis.deviations[i] || 0) / (analysis.fit.r * 0.08));
      x.strokeStyle = d > 0.55 ? '#c85f36' : '#efe7d8';
      x.globalAlpha = 0.82 + 0.18 * d;
      x.lineWidth = 2.2 / scale;
      x.beginPath();
      x.moveTo(a.x, a.y);
      x.lineTo(b.x, b.y);
      x.stroke();
    }
    x.restore();

    x.fillStyle = '#efe7d8';
    x.font = '700 26px Manrope';
    x.fillText('EIDOS / A STUDY OF FORM', 70, 82);
    x.fillStyle = '#c59a60';
    x.font = '700 16px monospace';
    x.fillText('TRACE / ' + analysis.id, 70, 118);
    x.fillStyle = 'rgba(239,231,216,.50)';
    x.font = '700 15px monospace';
    x.fillText(lang === 'tr' ? 'İDEAYA YAKINLIK' : 'PROXIMITY TO THE IDEA', 70, 848);
    x.fillStyle = '#efe7d8';
    x.font = '500 150px Arial';
    x.fillText(analysis.score.toFixed(3), 62, 1018);
    x.fillStyle = '#c59a60';
    x.font = 'italic 52px Georgia';
    x.fillText('%', 770, 924);
    x.fillStyle = '#efe7d8';
    x.font = 'italic 46px Georgia';
    x.fillText(T.bands[analysis.band][0], 70, 1098);
    x.fillStyle = 'rgba(239,231,216,.54)';
    x.font = '700 16px monospace';
    x.fillText(`${lang === 'tr' ? 'RADYAL' : 'RADIAL'} ${analysis.radialPct.toFixed(2)}%   ${lang === 'tr' ? 'KAPANIŞ' : 'CLOSURE'} ${analysis.closurePct.toFixed(1)}%   ${lang === 'tr' ? 'TUR' : 'COVERAGE'} ${analysis.coveragePct.toFixed(1)}%`, 70, 1186);
    x.fillStyle = '#c59a60';
    x.font = 'italic 31px Georgia';
    x.fillText(lang === 'tr' ? 'Kusursuzluk fikirlere aittir.' : 'Perfection belongs to ideas.', 70, 1278);

    c.toBlob(blob => blob ? resolve(blob) : reject(), 'image/png', 0.93);
  });
}

share.onclick = async () => {
  if (!current) return;
  try {
    const blob = await card(current);
    const file = new File([blob], `eidos-${current.score.toFixed(3)}-${current.id}.png`, { type: 'image/png' });
    const text = lang === 'tr'
      ? `İdeaya yakınlık: ${current.score.toFixed(3)}%. Senin izin ne kadar yaklaşabilir?`
      : `${current.score.toFixed(3)}% proximity to the idea. How close can your trace get?`;

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'EIDOS', text, files: [file] });
    } else if (navigator.share) {
      await navigator.share({ title: 'EIDOS', text, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      msg(T.copied);
    }
  } catch (error) {
    if (error?.name !== 'AbortError') msg(T.shareFail);
  }
};

addEventListener('resize', () => {
  draw.resize();
  if (current && mode === 'result') requestAnimationFrame(() => draw.finish(current, resultVisual.getBoundingClientRect()));
}, { passive: true });

loadBest();
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=8', { updateViaCache: 'none' }).catch(() => {}));
}
