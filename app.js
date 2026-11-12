'use strict';
/* =====================================================================
 *  Учёба — расписание, ДЗ и долги по предметам.
 *  Всё хранится в localStorage браузера (ключ STORAGE_KEY).
 * ===================================================================== */

const STORAGE_KEY = 'dz.v1';
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const LESSON_TYPES = ['Лекция', 'Практика', 'Лаба', 'Семинар', 'Другое'];
const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#65a30d', '#0d9488', '#ea580c'];

const STATUS = {
  waiting: { label: 'Висит', hint: 'ещё нельзя сделать — не задано' },
  active:  { label: 'Можно делать', hint: 'задано, но не сделано' },
  done:    { label: 'Сделано', hint: '' },
  overdue: { label: 'Просрочено', hint: 'срок прошёл, не сделано' },
};

/* ---------------------------- Даты ---------------------------------- */
// Все даты храним строкой 'YYYY-MM-DD' в ЛОКАЛЬНОМ времени
// (toISOString() не годится — он в UTC и может сдвинуть день).
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const todayISO = () => iso(new Date());
const weekdayOf = (s) => (parse(s).getDay() + 6) % 7 + 1;          // Пн=1 … Вс=7
const mondayOf = (s) => addDays(s, 1 - weekdayOf(s));
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const human = (s) => parse(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const humanFull = (s) => `${WEEKDAYS[weekdayOf(s) - 1]}, ${human(s)}`;

function defaultSemesterStart() {
  // 1 сентября текущего учебного года (если сейчас янв–авг — то прошлого)
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-09-01`;
}

/* --------------------------- Хранилище ------------------------------ */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function emptyState() {
  return {
    subjects: [],   // {id, name, color, teacher, debts:[{id,text,closed}]}
    lessons: [],    // {id, subjectId, weekday 1..7, start, end, room, type, weeks:'all'|'odd'|'even'}
    homework: [],   // {id, subjectId, text, assigned, due, done, doneAt}
    settings: { semesterStart: defaultSemesterStart(), theme: 'auto' },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const s = JSON.parse(raw);
    const base = emptyState();
    return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  } catch (e) {
    console.warn('Не удалось прочитать данные', e);
    return emptyState();
  }
}

let state = load();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { alert('Не удалось сохранить данные: ' + e.message); }
  render();
}

const subjectById = (id) => state.subjects.find((s) => s.id === id);

/* ------------------- Логика расписания и статусов ------------------- */

// Номер недели семестра (1, 2, 3…) — для числителя/знаменателя
function weekNumber(dateISO) {
  return Math.floor(daysBetween(mondayOf(state.settings.semesterStart), mondayOf(dateISO)) / 7) + 1;
}
const isOddWeek = (dateISO) => weekNumber(dateISO) % 2 !== 0;

// Есть ли эта пара в конкретную дату
function lessonOccursOn(lesson, dateISO) {
  if (lesson.weekday !== weekdayOf(dateISO)) return false;
  if (lesson.weeks === 'odd') return isOddWeek(dateISO);
  if (lesson.weeks === 'even') return !isOddWeek(dateISO);
  return true;
}

// Пары на конкретный день, отсортированные по времени
function lessonsOn(dateISO) {
  return state.lessons
    .filter((l) => lessonOccursOn(l, dateISO) && subjectById(l.subjectId))
    .sort((a, b) => a.start.localeCompare(b.start));
}

// Ближайшая дата пары по предмету СТРОГО после dateISO (ищем до 120 дней вперёд)
function nextLessonDate(subjectId, dateISO) {
  const own = state.lessons.filter((l) => l.subjectId === subjectId);
  if (!own.length) return null;
  for (let i = 1; i <= 120; i++) {
    const d = addDays(dateISO, i);
    if (own.some((l) => lessonOccursOn(l, d))) return d;
  }
  return null;
}

/*  Статус ДЗ на дату today:
 *    done    — отмечено сделанным                       → зелёный
 *    overdue — срок прошёл, не сделано                  → красный
 *    waiting — ещё не задано (today < assigned)         → серый, «висит»
 *    active  — задано, срок не прошёл, не сделано       → жёлтый
 *  Пример: пара в Пн (assigned), следующая в Пт (due).
 *  С Пн по Пт включительно — жёлтый; отметил — зелёный; Сб и далее без отметки — красный.
 */
function hwStatus(hw, today = todayISO()) {
  if (hw.done) return 'done';
  if (today > hw.due) return 'overdue';       // сравнение 'YYYY-MM-DD' строками корректно
  if (today < hw.assigned) return 'waiting';
  return 'active';
}

// Цвет пары = «худший» статус среди ДЗ, которые надо сдать на этой паре
const PRIORITY = ['overdue', 'active', 'waiting', 'done'];
function occurrenceStatus(subjectId, dateISO) {
  const list = state.homework.filter((h) => h.subjectId === subjectId && h.due === dateISO);
  if (!list.length) return null;
  const st = list.map((h) => hwStatus(h));
  return PRIORITY.find((p) => st.includes(p));
}

/* --------------------------- Утилиты UI ----------------------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const badge = (st) => `<span class="badge st-${st}">${STATUS[st].label}</span>`;

const modal = $('#modal');
function openModal(html, onMount) {
  $('#modal-body').innerHTML = html;
  if (!modal.open) modal.showModal();
  onMount && onMount($('#modal-body'));
}
function closeModal() { modal.close(); }
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }); // клик по фону

/* ----------------------------- Навигация ---------------------------- */
let ui = { tab: 'schedule', weekStart: mondayOf(todayISO()), filter: 'open' };
try { const t = localStorage.getItem('dz.tab'); if (t) ui.tab = t; } catch (_) {}

$$('.tabs button').forEach((b) => b.addEventListener('click', () => {
  ui.tab = b.dataset.tab;
  try { localStorage.setItem('dz.tab', ui.tab); } catch (_) {}
  render();
}));

function render() {
  document.documentElement.dataset.theme = state.settings.theme === 'auto' ? '' : state.settings.theme;
  if (state.settings.theme === 'auto') delete document.documentElement.dataset.theme;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  renderSummary();
  const view = $('#view');
  ({ schedule: renderSchedule, tasks: renderTasks, subjects: renderSubjects, settings: renderSettings })[ui.tab](view);
}

function renderSummary() {
  const counts = { active: 0, overdue: 0 };
  state.homework.forEach((h) => { const s = hwStatus(h); if (s in counts) counts[s]++; });
  const debts = state.subjects.reduce((n, s) => n + s.debts.filter((d) => !d.closed).length, 0);
  $('#summary').innerHTML =
    (counts.overdue ? `<span class="badge st-overdue">Просрочено: ${counts.overdue}</span>` : '') +
    `<span class="badge st-active">Можно делать: ${counts.active}</span>` +
    (debts ? `<span class="badge st-overdue">Долгов: ${debts}</span>` : `<span class="badge st-done">Долгов нет</span>`);
}

/* ========================== РАСПИСАНИЕ ============================== */
function renderSchedule(view) {
  if (!state.subjects.length) {
    view.innerHTML = `<div class="card empty">
      <p>Пока пусто. Добавь предметы и их пары во вкладке «Предметы».</p>
      <div class="row" style="justify-content:center">
        <button class="btn primary" data-go="subjects">Добавить предметы</button>
        <button class="btn primary" data-preset>Загрузить моё расписание</button>
        <button class="btn" data-demo>Загрузить пример</button>
      </div></div>`;
    $('[data-go]', view).onclick = () => { ui.tab = 'subjects'; render(); };
    $('[data-demo]', view).onclick = loadDemo;
    $('[data-preset]', view).onclick = () => loadPreset();
    return;
  }

  const ws = ui.weekStart, we = addDays(ws, 6), today = todayISO();
  const n = weekNumber(ws);
  let html = `
    <div class="week-nav">
      <button class="btn" data-w="-7">←</button>
      <button class="btn" data-w="0">Сегодня</button>
      <button class="btn" data-w="7">→</button>
      <span class="title">${human(ws)} — ${human(we)}</span>
      <span class="muted">· неделя ${n} (${n % 2 ? 'нечётная' : 'чётная'})</span>
    </div>
    <div class="legend">
      ${['waiting', 'active', 'done', 'overdue'].map((s) => `<span class="badge st-${s}" title="${STATUS[s].hint}">${STATUS[s].label}</span>`).join('')}
      <span class="muted" style="font-size:12px">· нажми на пару, чтобы задать или отметить ДЗ</span>
    </div>
    <div class="week">`;

  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    const ls = lessonsOn(d);
    html += `<div class="day ${d === today ? 'today' : ''} ${ls.length ? '' : 'empty-day'}">
      <div class="day-head"><span>${WEEKDAYS_FULL[i]}</span><span class="muted">${human(d)}</span></div>`;
    if (!ls.length) html += `<div class="muted" style="font-size:13px">Нет пар</div>`;
    for (const l of ls) {
      const s = subjectById(l.subjectId);
      const st = occurrenceStatus(s.id, d);
      const hws = state.homework.filter((h) => h.subjectId === s.id && h.due === d);
      html += `<button class="lesson ${st ? 'st-' + st : ''} ${d < today && !st ? 'past' : ''}"
                style="--subj:${s.color}" data-lesson="${l.id}" data-date="${d}">
        <div class="time">${esc(l.start)}–${esc(l.end)} · ${esc(l.type)}</div>
        <div class="name">${esc(s.name)}</div>
        ${l.room || l.teacher ? `<div class="meta">${[l.room && 'ауд. ' + esc(l.room), esc(l.teacher)].filter(Boolean).join(' · ')}</div>` : ''}
        ${hws.map((h) => `<div class="hw">${h.done ? '✓' : '•'} ${esc(h.text)}</div>`).join('')}
      </button>`;
    }
    html += `</div>`;
  }
  view.innerHTML = html + `</div>`;

  $$('[data-w]', view).forEach((b) => b.onclick = () => {
    const delta = Number(b.dataset.w);
    ui.weekStart = delta ? addDays(ui.weekStart, delta) : mondayOf(todayISO());
    render();
  });
  $$('[data-lesson]', view).forEach((b) => b.onclick = () => openLesson(b.dataset.lesson, b.dataset.date));
}

/* Окно пары: ДЗ, которое нужно сдать на ней, и ДЗ, заданное на ней */
function openLesson(lessonId, date) {
  const l = state.lessons.find((x) => x.id === lessonId);
  const s = subjectById(l.subjectId);
  const next = nextLessonDate(s.id, date);
  const dueHere = state.homework.filter((h) => h.subjectId === s.id && h.due === date);
  const givenHere = state.homework.filter((h) => h.subjectId === s.id && h.assigned === date && h.due !== date);

  openModal(`
    <div class="modal-head"><span class="dot" style="--subj:${s.color}"></span>
      <h2>${esc(s.name)}</h2><button class="btn small" data-close>✕</button></div>
    <div class="muted">${humanFull(date)} · ${esc(l.start)}–${esc(l.end)} · ${esc(l.type)}${l.room ? ' · ауд. ' + esc(l.room) : ''}</div>

    <h3>Сдать на этой паре</h3>
    ${dueHere.length ? dueHere.map(taskHTML).join('') : '<div class="muted">Ничего не задано</div>'}

    <h3>Задали на этой паре</h3>
    ${givenHere.length ? givenHere.map(taskHTML).join('') : '<div class="muted">Пока ничего</div>'}

    <h3>Добавить ДЗ</h3>
    <form id="hw-form">
      <label class="field">Что задали
        <textarea name="text" required placeholder="№ 12.3–12.7, прочитать §4…"></textarea></label>
      <div class="row">
        <label class="field">Задано (с какого дня можно делать)
          <input type="date" name="assigned" value="${date}" required></label>
        <label class="field">Срок сдачи
          <input type="date" name="due" value="${next || addDays(date, 7)}" required></label>
      </div>
      <div class="row" style="margin-bottom:10px">
        ${next ? `<button type="button" class="btn small" data-due="${next}">К следующей паре (${humanFull(next)})</button>` : ''}
        <button type="button" class="btn small" data-due="${date}">К этой паре</button>
      </div>
      <button class="btn primary">Добавить</button>
    </form>`, (root) => {
      $('[data-close]', root).onclick = closeModal;
      bindTaskEvents(root, () => openLesson(lessonId, date));
      $$('[data-due]', root).forEach((b) => b.onclick = () => {
        const f = $('#hw-form', root);
        f.due.value = b.dataset.due;
        // «к этой паре» значит задали раньше — делать можно уже с сегодняшнего дня
        if (b.dataset.due === date) f.assigned.value = todayISO() < date ? todayISO() : date;
        else f.assigned.value = date;
      });
      $('#hw-form', root).onsubmit = (e) => {
        e.preventDefault();
        const f = e.target;
        if (!addHomework(s.id, f.text.value, f.assigned.value, f.due.value)) return;
        save(); openLesson(lessonId, date);
      };
    });
}

function addHomework(subjectId, text, assigned, due) {
  text = text.trim();
  if (!text) return false;
  if (assigned > due) { alert('Дата «задано» не может быть позже срока сдачи'); return false; }
  state.homework.push({ id: uid(), subjectId, text, assigned, due, done: false, doneAt: null });
  return true;
}

/* ============================ ЗАДАНИЯ =============================== */
function taskHTML(h) {
  const s = subjectById(h.subjectId);
  const st = hwStatus(h);
  const left = daysBetween(todayISO(), h.due);
  const when = st === 'done' ? `сдано ${h.doneAt ? human(h.doneAt) : ''}`
    : st === 'overdue' ? `просрочено на ${-left} дн.`
    : st === 'waiting' ? `можно делать с ${human(h.assigned)}`
    : left === 0 ? 'сдать сегодня' : left === 1 ? 'сдать завтра' : `осталось ${left} дн.`;
  return `<div class="task st-${st}" style="--subj:${s ? s.color : 'gray'}">
    <input type="checkbox" data-toggle="${h.id}" ${h.done ? 'checked' : ''} ${st === 'waiting' ? 'disabled title="Ещё не задано"' : ''}>
    <div class="body">
      <div class="text">${esc(h.text)}</div>
      <div class="meta"><b>${esc(s ? s.name : '?')}</b> · до ${humanFull(h.due)} · ${when}</div>
    </div>
    <button class="btn small" data-edit-hw="${h.id}" title="Изменить">✎</button>
    <button class="btn small danger" data-del-hw="${h.id}" title="Удалить">✕</button>
  </div>`;
}

// Вешает обработчики на чекбоксы/кнопки заданий внутри root
function bindTaskEvents(root, rerender) {
  $$('[data-toggle]', root).forEach((c) => c.onchange = () => {
    const h = state.homework.find((x) => x.id === c.dataset.toggle);
    h.done = c.checked; h.doneAt = c.checked ? todayISO() : null;
    save(); rerender && rerender();
  });
  $$('[data-del-hw]', root).forEach((b) => b.onclick = () => {
    if (!confirm('Удалить задание?')) return;
    state.homework = state.homework.filter((x) => x.id !== b.dataset.delHw);
    save(); rerender && rerender();
  });
  $$('[data-edit-hw]', root).forEach((b) => b.onclick = () => openHomeworkForm(b.dataset.editHw));
}

function renderTasks(view) {
  const filters = { open: 'Активные', active: 'Можно делать', overdue: 'Просрочено', waiting: 'Висит', done: 'Сделано', all: 'Все' };
  let list = state.homework.slice();
  const f = ui.filter;
  if (f === 'open') list = list.filter((h) => hwStatus(h) !== 'done');
  else if (f !== 'all') list = list.filter((h) => hwStatus(h) === f);
  list.sort((a, b) => f === 'done' ? b.due.localeCompare(a.due) : a.due.localeCompare(b.due));

  view.innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <h2 style="margin:0">Задания</h2><span class="spacer"></span>
      <button class="btn primary" data-new ${state.subjects.length ? '' : 'disabled title="Сначала добавь предмет"'}>+ Новое ДЗ</button>
    </div>
    <div class="filters">${Object.entries(filters).map(([k, v]) =>
      `<button class="btn small ${k === f ? 'active' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
    ${list.length ? list.map(taskHTML).join('') : '<div class="card empty">Здесь пусто</div>'}`;

  $$('[data-f]', view).forEach((b) => b.onclick = () => { ui.filter = b.dataset.f; render(); });
  $('[data-new]', view).onclick = () => openHomeworkForm();
  bindTaskEvents(view);
}

/* Форма создания/редактирования ДЗ (из вкладки «Задания») */
function openHomeworkForm(hwId, presetSubject) {
  const h = hwId ? state.homework.find((x) => x.id === hwId) : null;
  const subjId = h ? h.subjectId : presetSubject || state.subjects[0].id;
  openModal(`
    <div class="modal-head"><h2>${h ? 'Изменить ДЗ' : 'Новое ДЗ'}</h2><button class="btn small" data-close>✕</button></div>
    <form id="f">
      <label class="field">Предмет
        <select name="subject">${state.subjects.map((s) =>
          `<option value="${s.id}" ${s.id === subjId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="field">Что задали<textarea name="text" required>${esc(h ? h.text : '')}</textarea></label>
      <div class="row">
        <label class="field">Задано<input type="date" name="assigned" value="${h ? h.assigned : todayISO()}" required></label>
        <label class="field">Срок сдачи<input type="date" name="due" value="${h ? h.due : ''}" required></label>
      </div>
      <div class="row" style="margin-bottom:10px"><button type="button" class="btn small" data-next>К следующей паре</button>
        <span class="muted" id="next-hint" style="font-size:12px"></span></div>
      <button class="btn primary">${h ? 'Сохранить' : 'Добавить'}</button>
    </form>`, (root) => {
      const f = $('#f', root);
      $('[data-close]', root).onclick = closeModal;
      const setNext = () => {
        const d = nextLessonDate(f.subject.value, f.assigned.value || todayISO());
        if (d) { f.due.value = d; $('#next-hint', root).textContent = humanFull(d); }
        else $('#next-hint', root).textContent = 'у предмета нет пар в расписании';
      };
      $('[data-next]', root).onclick = setNext;
      if (!h) { setNext(); f.subject.onchange = setNext; }
      f.onsubmit = (e) => {
        e.preventDefault();
        if (f.assigned.value > f.due.value) { alert('Дата «задано» не может быть позже срока'); return; }
        if (h) Object.assign(h, { subjectId: f.subject.value, text: f.text.value.trim(), assigned: f.assigned.value, due: f.due.value });
        else if (!addHomework(f.subject.value, f.text.value, f.assigned.value, f.due.value)) return;
        closeModal(); save();
      };
    });
}

/* ============================ ПРЕДМЕТЫ ============================== */
function renderSubjects(view) {
  let html = `<div class="row" style="margin-bottom:12px"><h2 style="margin:0">Предметы</h2>
    <span class="spacer"></span><button class="btn primary" data-new>+ Предмет</button></div>`;
  if (!state.subjects.length) html += `<div class="card empty">Добавь первый предмет — потом укажешь, в какие дни у него пары.</div>`;
  html += `<div class="grid">`;
  for (const s of state.subjects) {
    const debts = s.debts.filter((d) => !d.closed);
    const open = state.homework.filter((h) => h.subjectId === s.id && hwStatus(h) !== 'done')
      .sort((a, b) => a.due.localeCompare(b.due));
    const ls = state.lessons.filter((l) => l.subjectId === s.id)
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
    html += `<div class="card subj-card" style="--subj:${s.color}">
      <div class="row"><h2 class="spacer">${esc(s.name)}</h2>
        <button class="btn small" data-edit="${s.id}">✎ Изменить</button></div>
      ${s.teacher ? `<div class="muted">${esc(s.teacher)}</div>` : ''}
      <div style="margin:8px 0">${debts.length
        ? `<span class="badge st-overdue">Долгов: ${debts.length}</span>`
        : `<span class="badge st-done">Долгов нет</span>`}</div>

      <h3>Пары</h3>
      ${ls.length ? `<ul class="plain">${ls.map((l) => `<li>${WEEKDAYS[l.weekday - 1]} ${esc(l.start)}–${esc(l.end)} · ${esc(l.type)}${
        l.weeks !== 'all' ? ` · ${l.weeks === 'odd' ? 'нечёт.' : 'чёт.'} нед.` : ''}${l.room ? ' · ' + esc(l.room) : ''}${l.teacher ? ` <span class="muted">· ${esc(l.teacher)}</span>` : ''}</li>`).join('')}</ul>`
        : '<div class="muted">Пар нет — нажми «Изменить»</div>'}

      <h3>Долги</h3>
      ${s.debts.map((d) => `<div class="debt ${d.closed ? 'closed' : ''}">
        <input type="checkbox" data-debt="${s.id}:${d.id}" ${d.closed ? 'checked' : ''} title="Закрыт">
        <span>${esc(d.text)}</span>
        <button class="btn small danger" data-deldebt="${s.id}:${d.id}">✕</button></div>`).join('')}
      <form class="row" data-adddebt="${s.id}" style="margin-top:6px">
        <input type="text" name="t" placeholder="Лаба 3, контрольная…" style="flex:1;min-width:0">
        <button class="btn small">+ Долг</button></form>

      <h3>ДЗ (${open.length})</h3>
      ${open.length ? open.map(taskHTML).join('') : '<div class="muted">Всё сделано 👌</div>'}
      <button class="btn small" data-newhw="${s.id}">+ ДЗ</button>
    </div>`;
  }
  view.innerHTML = html + `</div>`;

  $('[data-new]', view).onclick = () => openSubjectForm();
  $$('[data-edit]', view).forEach((b) => b.onclick = () => openSubjectForm(b.dataset.edit));
  $$('[data-newhw]', view).forEach((b) => b.onclick = () => openHomeworkForm(null, b.dataset.newhw));
  $$('[data-debt]', view).forEach((c) => c.onchange = () => {
    const [sid, did] = c.dataset.debt.split(':');
    subjectById(sid).debts.find((d) => d.id === did).closed = c.checked; save();
  });
  $$('[data-deldebt]', view).forEach((b) => b.onclick = () => {
    const [sid, did] = b.dataset.deldebt.split(':');
    if (!confirm('Удалить долг?')) return;
    const s = subjectById(sid); s.debts = s.debts.filter((d) => d.id !== did); save();
  });
  $$('[data-adddebt]', view).forEach((f) => f.onsubmit = (e) => {
    e.preventDefault();
    const t = f.t.value.trim(); if (!t) return;
    subjectById(f.dataset.adddebt).debts.push({ id: uid(), text: t, closed: false }); save();
  });
  bindTaskEvents(view);
}

/* Форма предмета вместе с его парами в недельном расписании */
function openSubjectForm(id) {
  const s = id ? subjectById(id) : null;
  // работаем с копией пар, чтобы «Отмена» ничего не меняла
  let rows = s ? state.lessons.filter((l) => l.subjectId === s.id).map((l) => ({ ...l })) : [];
  const color = s ? s.color : COLORS[state.subjects.length % COLORS.length];

  const rowHTML = (l, i) => `<div class="lesson-row" data-i="${i}">
    <select name="weekday">${WEEKDAYS_FULL.map((w, k) => `<option value="${k + 1}" ${l.weekday === k + 1 ? 'selected' : ''}>${w}</option>`).join('')}</select>
    <select name="type">${LESSON_TYPES.map((t) => `<option ${l.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <input type="time" name="start" value="${l.start}" required>
    <input type="time" name="end" value="${l.end}" required>
    <select name="weeks">
      <option value="all" ${l.weeks === 'all' ? 'selected' : ''}>Каждую неделю</option>
      <option value="odd" ${l.weeks === 'odd' ? 'selected' : ''}>Нечётные недели</option>
      <option value="even" ${l.weeks === 'even' ? 'selected' : ''}>Чётные недели</option></select>
    <input type="text" name="room" value="${esc(l.room)}" placeholder="Аудитория">
    <input type="text" name="teacher" value="${esc(l.teacher)}" placeholder="Преподаватель" class="full">
    <button type="button" class="btn small danger full" data-rm="${i}">Удалить пару</button>
  </div>`;

  const draw = () => openModal(`
    <div class="modal-head"><h2>${s ? 'Изменить предмет' : 'Новый предмет'}</h2><button class="btn small" data-close>✕</button></div>
    <form id="f">
      <label class="field">Название<input type="text" name="name" value="${esc(s ? s.name : '')}" required placeholder="Матанализ"></label>
      <div class="row">
        <label class="field" style="flex:1">Преподаватель<input type="text" name="teacher" value="${esc(s ? s.teacher : '')}"></label>
        <label class="field">Цвет<input type="color" name="color" value="${color}"></label>
      </div>
      <h3>Пары в неделю</h3>
      <div id="rows">${rows.map(rowHTML).join('') || '<div class="muted">Пока нет пар</div>'}</div>
      <button type="button" class="btn small" data-add>+ Пара</button>
      <div class="row" style="margin-top:16px">
        <button class="btn primary">Сохранить</button>
        ${s ? '<span class="spacer"></span><button type="button" class="btn danger" data-delete>Удалить предмет</button>' : ''}
      </div>
    </form>`, (root) => {
      const f = $('#f', root);
      // перед перерисовкой забираем введённые значения из полей
      const collect = () => {
        $$('.lesson-row', root).forEach((r) => {
          const l = rows[Number(r.dataset.i)];
          l.weekday = Number($('[name=weekday]', r).value);
          l.type = $('[name=type]', r).value;
          l.start = $('[name=start]', r).value;
          l.end = $('[name=end]', r).value;
          l.weeks = $('[name=weeks]', r).value;
          l.room = $('[name=room]', r).value.trim();
          l.teacher = $('[name=teacher]', r).value.trim();
        });
        draft = { name: f.name.value, teacher: f.teacher.value, color: f.color.value };
      };
      if (draft) { f.name.value = draft.name; f.teacher.value = draft.teacher; f.color.value = draft.color; }
      $('[data-close]', root).onclick = closeModal;
      $('[data-add]', root).onclick = () => {
        collect();
        const last = rows[rows.length - 1];
        rows.push({ id: uid(), weekday: last ? last.weekday : 1, start: '09:00', end: '10:30', room: '', teacher: '', type: 'Лекция', weeks: 'all' });
        draw();
      };
      $$('[data-rm]', root).forEach((b) => b.onclick = () => { collect(); rows.splice(Number(b.dataset.rm), 1); draw(); });
      if (s) $('[data-delete]', root).onclick = () => {
        if (!confirm(`Удалить «${s.name}» вместе с парами, ДЗ и долгами?`)) return;
        state.subjects = state.subjects.filter((x) => x.id !== s.id);
        state.lessons = state.lessons.filter((l) => l.subjectId !== s.id);
        state.homework = state.homework.filter((h) => h.subjectId !== s.id);
        closeModal(); save();
      };
      f.onsubmit = (e) => {
        e.preventDefault(); collect();
        const bad = rows.find((l) => l.start >= l.end);
        if (bad) { alert('У пары время начала должно быть раньше конца'); return; }
        const subj = s || { id: uid(), debts: [] };
        Object.assign(subj, { name: draft.name.trim(), teacher: draft.teacher.trim(), color: draft.color });
        if (!s) state.subjects.push(subj);
        state.lessons = state.lessons.filter((l) => l.subjectId !== subj.id)
          .concat(rows.map((l) => ({ ...l, subjectId: subj.id })));
        closeModal(); save();
      };
    });
  let draft = null;
  draw();
}

/* ============================ НАСТРОЙКИ ============================= */
function renderSettings(view) {
  view.innerHTML = `
    <div class="card" style="max-width:560px">
      <h2>Настройки</h2>
      <label class="field">Начало семестра (от него считаются чётные/нечётные недели)
        <input type="date" id="sem" value="${state.settings.semesterStart}"></label>
      <div class="muted" style="font-size:13px;margin:-4px 0 12px">Сейчас идёт неделя ${weekNumber(todayISO())}
        (${isOddWeek(todayISO()) ? 'нечётная' : 'чётная'}). Если в вузе считают наоборот — сдвинь дату на неделю.</div>
      <label class="field">Тема
        <select id="theme">
          <option value="auto">Как в системе</option>
          <option value="light">Светлая</option>
          <option value="dark">Тёмная</option></select></label>

      <h3>Резервная копия</h3>
      <p class="muted" style="font-size:13px">Данные хранятся только в этом браузере. Чтобы перенести на телефон
        или не потерять — экспортируй файл и импортируй его на другом устройстве.</p>
      <div class="row">
        <button class="btn" id="exp">⬇ Экспорт</button>
        <label class="btn">⬆ Импорт<input type="file" id="imp" accept="application/json,.json" hidden></label>
        <button class="btn" id="preset">Загрузить моё расписание</button>
        <button class="btn" id="demo">Загрузить пример</button>
        <span class="spacer"></span>
        <button class="btn danger" id="wipe">Стереть всё</button>
      </div>
    </div>`;
  $('#theme').value = state.settings.theme;
  $('#sem').onchange = (e) => { if (e.target.value) { state.settings.semesterStart = e.target.value; save(); } };
  $('#theme').onchange = (e) => { state.settings.theme = e.target.value; save(); };
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ucheba-${todayISO()}.json` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#imp').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.subjects) || !Array.isArray(data.lessons) || !Array.isArray(data.homework)) throw new Error('неверный формат');
      if (!confirm('Заменить текущие данные данными из файла?')) return;
      state = { ...emptyState(), ...data, settings: { ...emptyState().settings, ...(data.settings || {}) } };
      save();
    } catch (err) { alert('Не удалось импортировать: ' + err.message); }
  };
  $('#demo').onclick = loadDemo;
  $('#preset').onclick = () => loadPreset();
  $('#wipe').onclick = () => { if (confirm('Точно стереть все предметы, пары, ДЗ и долги?')) { state = emptyState(); save(); } };
}

/* ======================== Демо-данные =============================== */
function loadDemo() {
  if (state.subjects.length && !confirm('Заменить текущие данные примером?')) return;
  const mon = mondayOf(todayISO());
  const S = (name, color, teacher) => ({ id: uid(), name, color, teacher, debts: [] });
  const ma = S('Матанализ', '#4f46e5', 'Иванов И. И.');
  const pr = S('Программирование', '#059669', 'Петрова А. С.');
  const ph = S('Физика', '#d97706', 'Сидоров П. П.');
  const en = S('Английский', '#db2777', '');
  ph.debts.push({ id: uid(), text: 'Лаба 2 — защита', closed: false });
  const L = (subj, weekday, start, end, type, room, weeks = 'all') => ({ id: uid(), subjectId: subj.id, weekday, start, end, type, room, weeks });
  state = {
    ...emptyState(),
    settings: state.settings,
    subjects: [ma, pr, ph, en],
    lessons: [
      L(ma, 1, '09:00', '10:30', 'Лекция', '305'), L(ma, 5, '10:40', '12:10', 'Семинар', '212'),
      L(pr, 2, '10:40', '12:10', 'Лекция', '101'), L(pr, 4, '13:00', '14:30', 'Лаба', 'к-3'),
      L(ph, 3, '09:00', '10:30', 'Лекция', '410'), L(ph, 3, '10:40', '12:10', 'Лаба', 'л-2', 'odd'),
      L(en, 1, '13:00', '14:30', 'Практика', '507'), L(en, 4, '09:00', '10:30', 'Практика', '507'),
    ],
    homework: [],
  };
  const H = (subj, text, assigned, due, done = false) =>
    state.homework.push({ id: uid(), subjectId: subj.id, text, assigned, due, done, doneAt: done ? assigned : null });
  H(ma, '№ 245–250 (пределы)', mon, addDays(mon, 4));
  H(en, 'Unit 5, ex. 3–6', mon, addDays(mon, 3), true);
  H(pr, 'Лаба 4: сортировки', addDays(mon, 1), addDays(mon, 3));
  H(ph, 'Задачи 3.1–3.5', addDays(mon, -5), addDays(mon, 2));
  H(ma, 'Подготовиться к коллоквиуму', addDays(mon, 4), addDays(mon, 7));
  ui.tab = 'schedule'; ui.weekStart = mon;
  save();
}

/* ================ Моё расписание из schedule.json ==================== */
// Формат файла: { subjects: [{ name, color, teacher?, lessons: [{ weekday, start, end, type, room?, teacher?, weeks? }] }] }
async function loadPreset(silent = false) {
  if (!silent && (state.subjects.length || state.homework.length) &&
      !confirm('Заменить предметы и пары расписанием из файла? Все ДЗ и долги будут удалены.')) return;
  try {
    const res = await fetch('schedule.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const subjects = [], lessons = [];
    for (const s of data.subjects) {
      const id = uid();
      subjects.push({ id, name: s.name, color: s.color, teacher: s.teacher || '', debts: [] });
      for (const l of s.lessons) lessons.push({ id: uid(), subjectId: id, room: '', teacher: '', weeks: 'all', ...l });
    }
    state = { ...emptyState(), settings: { ...state.settings, ...(data.settings || {}) }, subjects, lessons };
    ui.tab = 'schedule'; ui.weekStart = mondayOf(todayISO());
    save();
  } catch (e) {
    if (!silent) alert('Не удалось загрузить schedule.json: ' + e.message);
  }
}

/* ======================== Старт ===================================== */
render();
// Первый запуск на устройстве (данных ещё нет) — сразу подтягиваем моё расписание
let firstRun = false;
try { firstRun = localStorage.getItem(STORAGE_KEY) === null; } catch (_) {}
if (firstRun) loadPreset(true);
// Раз в минуту обновляем, чтобы статусы сменились после полуночи без перезагрузки
let lastDay = todayISO();
setInterval(() => { if (todayISO() !== lastDay) { lastDay = todayISO(); render(); } }, 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
