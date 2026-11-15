// Немного JS: год в подвале, кнопка «наверх», пауза анимации вне экрана, закрытие мобильного меню.
const $ = s => document.querySelector(s);

$('#year').textContent = new Date().getFullYear();

// Кнопка «наверх»: появляется после 600px, кольцо = доля прокрутки (0…1)
const toTop = $('#to-top');
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  toTop.style.setProperty('--p', max > 0 ? scrollY / max : 0);
  toTop.classList.toggle('show', scrollY > 600);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => scrollTo({ top: 0 }));

// Анимация гиба в первом экране ставится на паузу, когда экран прокручен
const hero = $('.hero');
new IntersectionObserver(([e]) => hero.classList.toggle('paused', !e.isIntersecting)).observe(hero);

// Мобильное меню закрывается после выбора пункта
const burger = $('.burger');
burger.addEventListener('click', e => { if (e.target.closest('a')) burger.open = false; });
