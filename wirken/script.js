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

// 2. Spotlight в карточках: координаты курсора относительно карточки
$$('.spotlight').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--x', e.clientX - r.left + 'px');
    card.style.setProperty('--y', e.clientY - r.top + 'px');
  });
});

// 3. Появление при прокрутке + запуск счётчиков
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('visible');
    $$('.count', en.target).forEach(countUp);
    io.unobserve(en.target); // анимируем один раз
  });
}, { threshold: 0.15 });
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 80 + 'ms'; // каскад внутри ряда
  io.observe(el);
});
// после появления убираем задержку, иначе hover-эффекты срабатывают с запозданием
document.addEventListener('transitionend', e => {
  if (e.target.classList?.contains('visible') && e.propertyName === 'opacity') e.target.style.transitionDelay = '';
});

// Счётчик from → to с замедлением в конце (easeOutCubic: 1 − (1 − p)³)
function countUp(el) {
  if (reduced) return; // финальное число уже стоит в разметке
  const to = +el.dataset.to, from = +(el.dataset.from || 0), dur = 1600, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 4. «Магнитная» кнопка — слегка тянется к курсору
$$('.magnetic').forEach(btn => {
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
  });
  btn.addEventListener('pointerleave', () => (btn.style.transform = ''));
});

// 5. Бегущая строка: дублируем содержимое для бесшовного цикла (translateX −50%)
const track = $('.marquee-track');
track.innerHTML += track.innerHTML;

// 6. Кнопка «наверх»: появляется после 600px, кольцо = доля прокрутки страницы
const toTop = $('#to-top');
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  toTop.style.setProperty('--p', max > 0 ? scrollY / max : 0);
  toTop.classList.toggle('show', scrollY > 600);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.onclick = () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });

// 7. Форма обратного звонка (заглушка: сервера нет)
$('#cta-form').addEventListener('submit', e => {
  e.preventDefault();
  e.target.querySelector('button').textContent = 'Перезвоним ✓';
});

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
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
  if (pal.hidden) return;
  if (e.key === 'Escape') return closePal();
  const vis = visibleItems();
  if (!vis.length) return;
  if (e.key === 'ArrowDown') { active = (active + 1) % vis.length; highlight(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { active = (active - 1 + vis.length) % vis.length; highlight(); e.preventDefault(); }
  if (e.key === 'Enter') go(vis[active]);
});
