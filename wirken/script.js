// Все анимации без библиотек: IntersectionObserver + CSS-переменные.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

$('#year').textContent = new Date().getFullYear();

// 1. Световое пятно на фоне идёт за курсором
addEventListener('pointermove', e => {
  document.documentElement.style.setProperty('--mx', e.clientX + 'px');
  document.documentElement.style.setProperty('--my', e.clientY + 'px');
});

// 2. Spotlight внутри карточек: передаём координаты курсора относительно карточки
$$('.spotlight').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--x', e.clientX - r.left + 'px');
    card.style.setProperty('--y', e.clientY - r.top + 'px');
  });
});

// 3. Появление элементов при прокрутке (+ запуск счётчиков)
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('visible');
    $$('.count', en.target).forEach(countUp);
    io.unobserve(en.target); // анимируем один раз
  });
}, { threshold: 0.15 });
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 60 + 'ms'; // лёгкий «каскад»
  io.observe(el);
});

// Счётчик 0 → N с замедлением в конце (easeOutCubic)
function countUp(el) {
  const to = +el.dataset.to, dur = 1400, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(to * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 4. 3D-наклон карточек работ
$$('.tilt').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
  });
  card.addEventListener('pointerleave', () => (card.style.transform = ''));
});

// 5. «Магнитная» кнопка — слегка тянется к курсору
$$('.magnetic').forEach(btn => {
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
  });
  btn.addEventListener('pointerleave', () => (btn.style.transform = ''));
});

// 6. Печатающийся код в окне hero
const lines = [
  ['c', '// заявка на гибку — пример\n'],
  ['k', 'материал'], ['', ':   '], ['s', 'сталь, лист 2 мм'], ['', '\n'],
  ['k', 'операции'], ['', ':   '], ['s', 'резка → гибка → покраска'], ['', '\n'],
  ['k', 'угол гиба'], ['', ':  '], ['s', '90°'], ['', '\n'],
  ['k', 'тираж'], ['', ':      '], ['s', '50 шт'], ['', '\n\n'],
  ['k', '✓ '], ['', 'чертёж принят, считаем стоимость…'],
];
(function typeCode() {
  const box = $('#typed');
  if (reduced) { box.innerHTML = lines.map(([c, t]) => `<span class="${c}">${t}</span>`).join(''); return; }
  let li = 0, ci = 0, span = null;
  const tick = () => {
    if (li >= lines.length) return;
    const [cls, text] = lines[li];
    if (ci === 0) { span = document.createElement('span'); span.className = cls; box.append(span); }
    span.textContent += text[ci++];
    if (ci >= text.length) { li++; ci = 0; }
    setTimeout(tick, 18 + Math.random() * 40);
  };
  setTimeout(tick, 900);
})();

// 7. Бегущая строка: дублируем содержимое, чтобы цикл был бесшовным (translateX -50%)
const track = $('.marquee-track');
track.innerHTML += track.innerHTML;

// 8. Командная палитра ⌘K / Ctrl+K
const pal = $('#palette'), input = $('#palette-input'), items = $$('#palette li');
let active = 0;
const openPal = () => { pal.hidden = false; input.value = ''; filter(); input.focus(); };
const closePal = () => (pal.hidden = true);
const visibleItems = () => items.filter(li => !li.hidden);
function filter() {
  const q = input.value.toLowerCase();
  items.forEach(li => (li.hidden = !li.textContent.toLowerCase().includes(q)));
  active = 0; highlight();
}
function highlight() { visibleItems().forEach((li, i) => li.classList.toggle('active', i === active)); }
function go(li) { if (!li) return; closePal(); location.hash = li.dataset.href; }

$('#cmdk-open').onclick = openPal;
input.oninput = filter;
pal.onclick = e => { if (e.target === pal) closePal(); };
items.forEach(li => (li.onclick = () => go(li)));
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
  if (pal.hidden) return;
  const vis = visibleItems();
  if (e.key === 'Escape') closePal();
  if (e.key === 'ArrowDown') { active = (active + 1) % vis.length; highlight(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { active = (active - 1 + vis.length) % vis.length; highlight(); e.preventDefault(); }
  if (e.key === 'Enter') go(vis[active]);
});
