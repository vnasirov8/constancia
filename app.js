/* ===== КОНСТАНТЫ ===== */
const THEMES = [
  { id:'default',  name:'Тёмно-синяя', color:'#4f9dde' },
  { id:'violet',   name:'Фиолетовая',  color:'#a06bf0' },
  { id:'emerald',  name:'Изумрудная',  color:'#3ecf9a' },
  { id:'graphite', name:'Графит',      color:'#b0b0b0' },
  { id:'sepia',    name:'Сепия',       color:'#d99b52' },
  { id:'light',    name:'Светлая',     color:'#ffffff' },
  { id:'sunset',   name:'Закат',       color:'linear-gradient(135deg,#ff6b9d,#ffb84d)' },
];

const FONTS = [
  { id:'system', name:'Система',  preview:'Constancia. Дисциплина каждый день',  cls:'' },
  { id:'mono',   name:'Моно',     preview:'Constancia. Дисциплина каждый день',  cls:'font-mono' },
  { id:'serif',  name:'Serif',    preview:'Constancia. Дисциплина каждый день',  cls:'font-serif' },
  { id:'round',  name:'Круглый',  preview:'Constancia. Дисциплина каждый день',  cls:'font-round' },
];

const TAGS = [
  { id:'work',  name:'💼 Работа' },
  { id:'sport', name:'💪 Спорт' },
  { id:'study', name:'📚 Учёба' },
  { id:'home',  name:'🏠 Дом' },
];

const DEFAULT_TEMPLATES = [
  { id:'t1', name:'🌅 Утро', tasks:['Зарядка','Душ','Завтрак','Планерка дня'] },
  { id:'t2', name:'💪 Спорт', tasks:['Разминка 5 мин','Основная тренировка 30 мин','Растяжка 10 мин','Стакан воды'] },
  { id:'t3', name:'💼 Работа', tasks:['Проверить почту','4 помодоро фокуса','Обед без телефона','Итоги дня'] },
  { id:'t4', name:'📚 Учёба', tasks:['Повторить вчерашнее','Новая тема 45 мин','Практика','Конспект'] },
];

const store = {
  load(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } },
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

function localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const today = () => localDate(new Date());

/* ===== СОСТОЯНИЕ ===== */
let tasks = store.load('disc_tasks', []);
let routines = store.load('disc_routines', [
  { id:1, text:'Зарядка 15 минут', done:false, time:null },
  { id:2, text:'Выпить 2 литра воды', done:false, time:null },
  { id:3, text:'Чтение 30 минут', done:false, time:null },
  { id:4, text:'Планирование завтра', done:false, time:null },
]);
let history = store.load('disc_history', {});
let streak = store.load('disc_streak', 0);
let lastActive = store.load('disc_lastActive', null);
let theme = store.load('disc_theme', 'default');
let notes = store.load('disc_notes', {});
let noteDate = today();
let goals = store.load('disc_goals', [
  { id:1, title:'Прочитать 3 книги', current:0, target:3 },
  { id:2, title:'Сходить в зал 12 раз', current:0, target:12 },
]);
let pomoCount = store.load('disc_pomo_' + today(), 0);
let pomoTotal = store.load('disc_pomo_total', 0);
let firstLaunch = store.load('disc_firstLaunch', today());
let achievements = store.load('disc_achievements', {});
let soundChoice = store.load('disc_sound', 'bell');
let fontChoice = store.load('disc_font', 'system');
let chartPeriod = 'week';
let calendarDate = new Date();
let openDayDate = null;
let templates = store.load('disc_templates', DEFAULT_TEMPLATES);
let editingTemplateId = null;

/* ===== СБРОС РУТИНЫ ===== */
if (lastActive !== today()) {
  if (lastActive) {
    const total = routines.length;
    const done = routines.filter(r => r.done).length;
    const pct = total ? Math.round(done/total*100) : 0;
    history[lastActive] = pct;
    if (pct >= 60) streak += 1;
    else streak = 0;
    store.save('disc_history', history);
    store.save('disc_streak', streak);
  }
  routines.forEach(r => r.done = false);
  tasks.forEach(t => t.done = false);
  store.save('disc_routines', routines);
  store.save('disc_tasks', tasks);
  store.save('disc_lastActive', today());
}

/* ===== СОХРАНЕНИЕ ===== */
function saveAll() {
  store.save('disc_tasks', tasks);
  store.save('disc_routines', routines);
}

/* ===== ГЛАВНЫЙ РЕНДЕР ===== */
function render() {
  document.getElementById('dateLabel').textContent =
    new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' });

  const rl = document.getElementById('routineList');
  rl.innerHTML = routines.length ? '' : '<div class="empty">Добавь первую привычку 👇</div>';
  routines.forEach(r => rl.appendChild(makeTaskEl(r, 'routine')));

  const tl = document.getElementById('taskList');
  const todayTasks = tasks.filter(t => !t.date || t.date === today());
  tl.innerHTML = todayTasks.length ? '' : '<div class="empty">Пока пусто. Что сделаешь сегодня?</div>';
  todayTasks.forEach(t => tl.appendChild(makeTaskEl(t, 'task')));

  const all = [...routines, ...todayTasks];
  const done = all.filter(x => x.done).length;
  const pct = all.length ? Math.round(done/all.length*100) : 0;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('streakNum').textContent = streak;
  document.getElementById('routineBadge').textContent =
    `${routines.filter(r=>r.done).length}/${routines.length}`;
  document.getElementById('taskBadge').textContent =
    `${todayTasks.filter(t=>t.done).length}/${todayTasks.length}`;
  document.getElementById('pomoCount').textContent = pomoCount;

  renderChart();
  renderGoals();
  renderCalendar();
  renderMonthReport();
  renderCompare();
  renderTree();
  checkAchievements();
}

/* ===== СОЗДАНИЕ ЭЛЕМЕНТА ЗАДАЧИ ===== */
function makeTaskEl(item, type) {
  const el = document.createElement('div');
  el.className = 'task' + (item.done ? ' done' : '');
  const timeStr = item.time || '🕐';
  const tagHtml = item.tag ? `<span class="task-tag ${item.tag}">${TAGS.find(t=>t.id===item.tag)?.name || item.tag}</span>` : '';
  const dateStr = item.date && item.date !== today()
    ? `<span style="font-size:.65rem;color:var(--text-dim);">📅 ${item.date.slice(5)}</span>`
    : '';
  el.innerHTML = `
    <div class="check">${item.done ? '✓' : ''}</div>
    <div class="task-text" data-id="${item.id}">${escapeHtml(item.text)}</div>
    ${tagHtml}
    ${dateStr}
    <button class="task-time ${item.time ? 'set' : ''}" title="Напоминание">${timeStr}</button>
    <button class="dup" title="Дублировать на завтра">📋</button>
    <button class="del">✕</button>
  `;

  el.querySelector('.check').onclick = () => {
    const wasDone = item.done;
    item.done = !item.done;
    saveAll();
    render();
    if (!wasDone && item.done) {
      fireConfetti();
      playDing();
    }
  };
  el.querySelector('.task-time').onclick = (e) => { e.stopPropagation(); openTimeModal(item); };
  el.querySelector('.dup').onclick = (e) => { e.stopPropagation(); duplicateTask(item, type); };
  el.querySelector('.del').onclick = () => {
    if (type === 'routine') routines = routines.filter(r => r.id !== item.id);
    else tasks = tasks.filter(t => t.id !== item.id);
    saveAll(); render();
  };

  const txt = el.querySelector('.task-text');
  txt.ondblclick = () => {
    txt.contentEditable = 'true';
    txt.focus();
    document.execCommand('selectAll', false, null);
  };
  txt.onblur = () => {
    txt.contentEditable = 'false';
    const newText = txt.textContent.trim();
    if (newText && newText !== item.text) {
      item.text = newText;
      saveAll();
    } else {
      txt.textContent = item.text;
    }
  };
  txt.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); txt.blur(); }
  };

  if (item.subtasks && item.subtasks.length) {
    const subBox = document.createElement('div');
    subBox.className = 'subtasks';
    item.subtasks.forEach(st => {
      const stEl = document.createElement('div');
      stEl.className = 'subtask' + (st.done ? ' done' : '');
      stEl.innerHTML = `
        <div class="subtask-check">${st.done ? '✓' : ''}</div>
        <div class="subtask-text">${escapeHtml(st.text)}</div>
        <button class="subtask-del">✕</button>
      `;
      stEl.querySelector('.subtask-check').onclick = () => { st.done = !st.done; saveAll(); render(); };
      stEl.querySelector('.subtask-del').onclick = () => {
        item.subtasks = item.subtasks.filter(x => x.id !== st.id);
        saveAll(); render();
      };
      subBox.appendChild(stEl);
    });
    const addBtn = document.createElement('div');
    addBtn.className = 'subtask-add';
    addBtn.textContent = '+ подзадача';
    addBtn.onclick = () => {
      const t = prompt('Подзадача:');
      if (t && t.trim()) {
        if (!item.subtasks) item.subtasks = [];
        item.subtasks.push({ id: Date.now(), text: t.trim(), done: false });
        saveAll(); render();
      }
    };
    subBox.appendChild(addBtn);
    el.appendChild(subBox);
  } else {
    const addBtn = document.createElement('div');
    addBtn.className = 'subtasks';
    const addInner = document.createElement('div');
    addInner.className = 'subtask-add';
    addInner.textContent = '+ подзадача';
    addInner.onclick = () => {
      const t = prompt('Подзадача:');
      if (t && t.trim()) {
        if (!item.subtasks) item.subtasks = [];
        item.subtasks.push({ id: Date.now(), text: t.trim(), done: false });
        saveAll(); render();
      }
    };
    addBtn.appendChild(addInner);
    el.appendChild(addBtn);
  }

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===== ДОБАВЛЕНИЕ ===== */
function addTask() {
  const inp = document.getElementById('taskInput');
  const text = inp.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false, time: null, tag: null });
  inp.value = ''; saveAll(); render();
}
function addRoutine() {
  const inp = document.getElementById('routineInput');
  const text = inp.value.trim();
  if (!text) return;
  routines.push({ id: Date.now(), text, done: false, time: null });
  inp.value = ''; saveAll(); render();
}

function duplicateTask(item, type) {
  if (type === 'routine') {
    routines.push({ id: Date.now(), text: item.text, done: false, time: null });
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tasks.push({ id: Date.now(), text: item.text, done: false, time: null, tag: item.tag, date: localDate(tomorrow) });
  }
  saveAll(); render();
}

/* ===== ПАНЕЛЬ ДНЯ ===== */
function openDayPanel(dateKey) {
  openDayDate = dateKey;
  const modal = document.getElementById('dayModal');
  const title = document.getElementById('dayModalTitle');
  const noteArea = document.getElementById('dayNote');
  const tasksBox = document.getElementById('dayTasks');
  const progressBox = document.getElementById('dayProgress');
  const addBox = document.getElementById('dayAddBox');

  const d = new Date(dateKey + 'T00:00:00');
  const isToday = dateKey === today();
  const isFuture = dateKey > today();
  const isPast = dateKey < today();

  let suffix = '';
  if (isToday) suffix = ' · сегодня';
  else if (isFuture) suffix = ' · план';
  else suffix = ' · прошлое';

  title.textContent = d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' }) + suffix;

  noteArea.value = notes[dateKey] || '';
  noteArea.placeholder = isFuture ? 'Планы, идеи на этот день...' : 'Что было круто? Что улучшить?';

  const dayTasks = tasks.filter(t => t.date === dateKey);
  if (dayTasks.length === 0) {
    tasksBox.innerHTML = '<div class="empty" style="padding:12px;font-size:.8rem;">Задач нет</div>';
  } else {
    tasksBox.innerHTML = '';
    dayTasks.forEach(t => {
      const el = document.createElement('div');
      el.className = 'day-task' + (t.done ? ' done' : '');
      el.innerHTML = `
        <div class="day-task-check">${t.done ? '✓' : ''}</div>
        <div class="day-task-text">${escapeHtml(t.text)}</div>
        <button class="day-task-del">✕</button>
      `;
      el.querySelector('.day-task-check').onclick = () => {
        t.done = !t.done;
        saveAll(); openDayPanel(dateKey); render();
      };
      el.querySelector('.day-task-del').onclick = () => {
        tasks = tasks.filter(x => x.id !== t.id);
        saveAll(); openDayPanel(dateKey); render();
      };
      tasksBox.appendChild(el);
    });
  }

  if (isPast || isToday) {
    const pct = isToday ? getPctForDate(d) : (history[dateKey] || 0);
    progressBox.innerHTML = `
      <div class="day-progress-bar"><div class="day-progress-fill" style="width:${pct}%"></div></div>
      <div class="day-progress-label">Выполнено: <strong>${pct}%</strong></div>
    `;
  } else {
    progressBox.innerHTML = '<div class="day-progress-label" style="color:var(--text-dim);">Прогноз появится после этого дня</div>';
  }

  addBox.style.display = isPast ? 'none' : 'flex';
  modal.classList.add('show');
}

function closeDayPanel() {
  document.getElementById('dayModal').classList.remove('show');
  openDayDate = null;
}

function saveDayNote() {
  if (!openDayDate) return;
  const txt = document.getElementById('dayNote').value.trim();
  if (txt) notes[openDayDate] = txt;
  else delete notes[openDayDate];
  store.save('disc_notes', notes);
  renderCalendar();
  if (openDayDate === noteDate) renderNote();
  if (txt) unlockAch('note');
}

function addDayTask() {
  if (!openDayDate) return;
  const inp = document.getElementById('dayTaskInput');
  const text = inp.value.trim();
  if (!text) return;
  if (openDayDate === today()) {
    tasks.push({ id: Date.now(), text, done: false, time: null, tag: null });
  } else {
    tasks.push({ id: Date.now(), text, done: false, time: null, tag: null, date: openDayDate });
  }
  inp.value = '';
  saveAll(); openDayPanel(openDayDate); render();
}

/* ===== ШАБЛОНЫ ДНЯ ===== */
function openTemplates() {
  renderTemplatesList();
  document.getElementById('templatesModal').classList.add('show');
}

function closeTemplates() {
  document.getElementById('templatesModal').classList.remove('show');
}

function renderTemplatesList() {
  const box = document.getElementById('templatesList');
  if (!box) return;
  box.innerHTML = '';
  if (!templates.length) {
    box.innerHTML = '<div class="empty" style="padding:16px;font-size:.85rem;">Шаблонов нет. Создай первый 👇</div>';
    return;
  }
  templates.forEach(tpl => {
    const el = document.createElement('div');
    el.className = 'template-item';
    const chipsHtml = tpl.tasks.slice(0, 4).map(t =>
      `<span class="template-task-chip">${escapeHtml(t)}</span>`
    ).join('') + (tpl.tasks.length > 4 ? `<span class="template-task-chip">+${tpl.tasks.length - 4}</span>` : '');

    el.innerHTML = `
      <div class="template-head">
        <div class="template-name" title="Применить шаблон">${escapeHtml(tpl.name)}</div>
        <span class="template-count">${tpl.tasks.length} задач</span>
        <button class="template-btn edit" title="Редактировать">✏️</button>
        <button class="template-btn del" title="Удалить">🗑</button>
      </div>
      <div class="template-preview">${chipsHtml}</div>
    `;

    el.querySelector('.template-name').onclick = () => applyTemplate(tpl.id);
    el.querySelector('.edit').onclick = () => openTemplateEditor(tpl.id);
    el.querySelector('.del').onclick = () => deleteTemplate(tpl.id);
    box.appendChild(el);
  });
}

function applyTemplate(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  tpl.tasks.forEach(txt => {
    tasks.push({ id: Date.now() + Math.random(), text: txt, done: false, time: null, tag: null });
  });
  saveAll();
  render();
  closeTemplates();
  playDing();
  showToast('📋', `Добавлено: ${tpl.name} (${tpl.tasks.length})`);
}

function deleteTemplate(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  if (!confirm(`Удалить шаблон "${tpl.name}"?`)) return;
  templates = templates.filter(t => t.id !== id);
  store.save('disc_templates', templates);
  renderTemplatesList();
}

function openTemplateEditor(id) {
  editingTemplateId = id || null;
  const title = document.getElementById('templateEditorTitle');
  const nameInput = document.getElementById('tplNameInput');
  const tasksBox = document.getElementById('tplTasksList');
  tasksBox.innerHTML = '';

  if (id) {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    title.textContent = 'Редактировать шаблон';
    nameInput.value = tpl.name;
    tpl.tasks.forEach(t => addTplTaskField(t));
  } else {
    title.textContent = 'Новый шаблон';
    nameInput.value = '';
    addTplTaskField('');
  }

  document.getElementById('templateEditorModal').classList.add('show');
  setTimeout(() => nameInput.focus(), 100);
}

function closeTemplateEditor() {
  document.getElementById('templateEditorModal').classList.remove('show');
  editingTemplateId = null;
}

function addTplTaskField(value) {
  if (value === undefined) value = '';
  const box = document.getElementById('tplTasksList');
  const row = document.createElement('div');
  row.className = 'tpl-task-row';
  row.innerHTML = `
    <input type="text" placeholder="Задача..." value="${escapeHtml(value)}" maxlength="80">
    <button class="tpl-task-remove" title="Удалить">✕</button>
  `;
  row.querySelector('.tpl-task-remove').onclick = () => {
    row.remove();
    if (!box.querySelector('.tpl-task-row')) addTplTaskField('');
  };
  box.appendChild(row);
}

function saveTemplate() {
  const name = document.getElementById('tplNameInput').value.trim();
  if (!name) {
    alert('Введи название шаблона');
    return;
  }
  const taskInputs = document.querySelectorAll('#tplTasksList .tpl-task-row input');
  const newTasks = [];
  taskInputs.forEach(inp => {
    const t = inp.value.trim();
    if (t) newTasks.push(t);
  });
  if (!newTasks.length) {
    alert('Добавь хотя бы одну задачу');
    return;
  }
  if (editingTemplateId) {
    const tpl = templates.find(t => t.id === editingTemplateId);
    if (tpl) {
      tpl.name = name;
      tpl.tasks = newTasks;
    }
  } else {
    templates.push({
      id: 't' + Date.now(),
      name,
      tasks: newTasks
    });
  }
  store.save('disc_templates', templates);
  renderTemplatesList();
  closeTemplateEditor();
}

/* ===== ГРАФИК ===== */
function getPctForDate(d) {
  const key = localDate(d);
  if (key === today()) {
    const todayTasks = tasks.filter(t => !t.date || t.date === today());
    const all = [...routines, ...todayTasks];
    return all.length ? Math.round(all.filter(x=>x.done).length/all.length*100) : 0;
  }
  return history[key] || 0;
}

function switchChart(period) {
  chartPeriod = period;
  document.querySelectorAll('.tab[data-period]').forEach(t => {
    t.classList.toggle('active', t.dataset.period === period);
  });
  const label = { week: 'неделя', month: 'месяц', year: 'год' }[period];
  const badge = document.getElementById('chartPeriod');
  if (badge) badge.textContent = label;
  renderChart();
}

function renderChart() {
  const box = document.getElementById('bigChart');
  if (!box) return;
  box.innerHTML = '';
  const todayDate = new Date();
  let items = [];

  if (chartPeriod === 'week') {
    const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const dow = (todayDate.getDay() + 6) % 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - (dow - i));
      const isFuture = d > todayDate;
      items.push({ label: days[i], pct: isFuture ? 0 : getPctForDate(d), isToday: localDate(d) === today(), isFuture });
    }
  } else if (chartPeriod === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const isFuture = d > todayDate;
      const dayNum = d.getDate();
      const showLabel = i === 0 || dayNum === 1 || dayNum % 5 === 0;
      items.push({ label: showLabel ? dayNum : '', pct: isFuture ? 0 : getPctForDate(d), isToday: localDate(d) === today(), isFuture });
    }
  } else {
    const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      let sum = 0, cnt = 0;
      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const dd = new Date(d.getFullYear(), d.getMonth(), day);
        if (dd > todayDate) continue;
        const pct = (localDate(dd) === today()) ? getPctForDate(dd) : (history[localDate(dd)] || 0);
        sum += pct; cnt++;
      }
      items.push({ label: monthNames[d.getMonth()], pct: cnt ? Math.round(sum / cnt) : 0, isToday: d.getMonth() === todayDate.getMonth() && d.getFullYear() === todayDate.getFullYear(), isFuture: false });
    }
  }

  const maxPct = Math.max(...items.map(i => i.pct), 10);
  const validItems = items.filter(i => !i.isFuture);
  const avg = validItems.length ? Math.round(validItems.reduce((a,b) => a + b.pct, 0) / validItems.length) : 0;

  const avgLine = document.createElement('div');
  avgLine.className = 'avg-line';
  avgLine.style.bottom = `calc(32px + ${(avg / maxPct) * 172}px)`;
  avgLine.innerHTML = `<span class="avg-label">средн. ${avg}%</span>`;
  box.appendChild(avgLine);

  items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'big-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'big-bar';
    if (item.pct === 0) bar.classList.add('empty');
    if (item.isToday) bar.classList.add('today-bar');
    bar.style.height = `${(item.pct / maxPct) * 100}%`;
    bar.innerHTML = `<span class="big-bar-val">${item.pct > 0 ? item.pct + '%' : ''}</span>`;
    bar.title = `${item.label || ''} · ${item.pct}%`;
    wrap.appendChild(bar);
    const lbl = document.createElement('div');
    lbl.className = 'big-bar-label';
    lbl.textContent = item.label;
    wrap.appendChild(lbl);
    box.appendChild(wrap);
  });

  document.getElementById('avgPct').textContent = avg + '%';
  let bestPct = -1, bestLabel = '—';
  validItems.forEach(i => {
    if (i.pct > bestPct) { bestPct = i.pct; bestLabel = i.label || '—'; }
  });
  document.getElementById('bestDay').textContent = bestLabel;
  document.getElementById('totalDone').textContent = Object.values(history).length;
}

/* ===== СРАВНЕНИЕ НЕДЕЛЬ ===== */
function renderCompare() {
  const box = document.getElementById('compareBox');
  if (!box) return;
  const todayDate = new Date();
  const dow = (todayDate.getDay() + 6) % 7;
  let thisWeekSum = 0, thisWeekCnt = 0;
  let lastWeekSum = 0, lastWeekCnt = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - (dow - i));
    if (d <= todayDate) {
      thisWeekSum += getPctForDate(d);
      thisWeekCnt++;
    }
    const d2 = new Date(todayDate);
    d2.setDate(d2.getDate() - (dow - i) - 7);
    lastWeekSum += history[localDate(d2)] || 0;
    lastWeekCnt++;
  }
  const thisAvg = thisWeekCnt ? Math.round(thisWeekSum / thisWeekCnt) : 0;
  const lastAvg = lastWeekCnt ? Math.round(lastWeekSum / lastWeekCnt) : 0;
  const diff = thisAvg - lastAvg;
  const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
  const cls = diff > 0 ? 'cmp-up' : diff < 0 ? 'cmp-down' : '';
  const text = diff > 0
    ? `Эта неделя <strong>на ${diff}% лучше</strong> прошлой`
    : diff < 0
    ? `Эта неделя <strong>на ${Math.abs(diff)}% хуже</strong> прошлой`
    : 'Эта неделя <strong>на том же уровне</strong>, что и прошлая';

  box.innerHTML = `
    <div class="cmp-arrow ${cls}">${arrow}</div>
    <div class="cmp-text">
      ${text}<br>
      <span style="font-size:.75rem;color:var(--text-dim);">
        Эта: ${thisAvg}% · Прошлая: ${lastAvg}%
      </span>
    </div>
  `;
}

/* ===== КАЛЕНДАРЬ ===== */
function renderCalendar() {
  const box = document.getElementById('calendarBox');
  const label = document.getElementById('calMonthLabel');
  if (!box) return;
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  label.textContent = `${monthNames[m]} ${y}`;
  box.innerHTML = '';
  ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-head';
    h.textContent = d;
    box.appendChild(h);
  });
  const first = new Date(y, m, 1);
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevMonth = new Date(y, m, 0).getDate();
  const todayDate = new Date();

  for (let i = firstDow - 1; i >= 0; i--) {
    const c = document.createElement('div');
    c.className = 'cal-cell other-month';
    c.innerHTML = `<div class="cal-day">${prevMonth - i}</div>`;
    box.appendChild(c);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day);
    const key = localDate(d);
    const pct = key === today() ? getPctForDate(d) : (history[key] || 0);
    const tasksForDay = tasks.filter(t => t.date === key);
    const notesForDay = notes[key];
    const c = document.createElement('div');
    c.className = 'cal-cell';
    if (pct > 0) c.classList.add('pct-' + Math.min(4, Math.ceil(pct/25)));
    if (key === today()) c.classList.add('today');
    if (key < today()) c.classList.add('past');
    if (key > today()) c.classList.add('future');

    let dotsHtml = '';
    if (tasksForDay.length) dotsHtml += `<span class="cal-dot task-dot" title="${tasksForDay.length} задач">●</span>`;
    if (notesForDay) dotsHtml += `<span class="cal-dot note-dot" title="Есть заметка">●</span>`;

    c.innerHTML = `
      <div class="cal-day">${day}</div>
      ${pct > 0 ? `<div class="cal-pct">${pct}%</div>` : ''}
      ${dotsHtml ? `<div class="cal-dots">${dotsHtml}</div>` : ''}
    `;
    c.title = `${d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })} · ${pct}%`;
    c.onclick = () => openDayPanel(key);
    box.appendChild(c);
  }
  const last = new Date(y, m, daysInMonth);
  const lastDow = (last.getDay() + 6) % 7;
  for (let i = lastDow + 1; i <= 6; i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell other-month';
    c.innerHTML = `<div class="cal-day">${i - lastDow}</div>`;
    box.appendChild(c);
  }
}
function calPrev() { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); }
function calNext() { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); }

/* ===== ОТЧЁТ МЕСЯЦА ===== */
function renderMonthReport() {
  const box = document.getElementById('monthReport');
  if (!box) return;
  const now = new Date();
  let sum = 0, cnt = 0, best = 0, worst = 100, activeDays = 0, perfectDays = 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = new Date(now.getFullYear(), now.getMonth(), d);
    if (dd > now) break;
    const key = localDate(dd);
    const pct = key === today() ? getPctForDate(dd) : (history[key] || 0);
    sum += pct; cnt++;
    if (pct > best) best = pct;
    if (pct < worst) worst = pct;
    if (pct > 0) activeDays++;
    if (pct === 100) perfectDays++;
  }
  const avg = cnt ? Math.round(sum / cnt) : 0;
  box.innerHTML = `
    <div class="mr-item"><div class="mr-val">${avg}%</div><div class="mr-cap">средний</div></div>
    <div class="mr-item"><div class="mr-val">${best}%</div><div class="mr-cap">лучший день</div></div>
    <div class="mr-item"><div class="mr-val">${worst}%</div><div class="mr-cap">слабый день</div></div>
    <div class="mr-item"><div class="mr-val">${activeDays}</div><div class="mr-cap">активных дней</div></div>
    <div class="mr-item"><div class="mr-val">${perfectDays}</div><div class="mr-cap">идеальных</div></div>
    <div class="mr-item"><div class="mr-val">${cnt}</div><div class="mr-cap">дней в месяце</div></div>
  `;
}

/* ===== ДЕРЕВО ПРИВЫЧЕК ===== */
function renderTree() {
  const box = document.getElementById('treeBox');
  if (!box) return;
  box.innerHTML = '';
  const todayDate = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const pct = getPctForDate(d);
    const day = document.createElement('div');
    day.className = 'tree-day';
    if (pct === 0) day.classList.add('wilted');
    if (localDate(d) === today()) day.classList.add('today');
    const height = pct > 0 ? 20 + (pct / 100) * 100 : 4;
    day.style.height = height + 'px';
    day.title = `${d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' })} · ${pct}%`;
    box.appendChild(day);
  }
}

/* ===== ТЕМЫ ===== */
function renderThemes() {
  const box = document.getElementById('themes');
  if (!box) return;
  box.innerHTML = '';
  THEMES.forEach(t => {
    const d = document.createElement('div');
    d.className = 'theme-dot' + (t.id === theme ? ' active' : '');
    d.style.background = t.color;
    d.title = t.name;
    d.onclick = () => {
      theme = t.id;
      document.body.dataset.theme = t.id;
      store.save('disc_theme', t.id);
      renderThemes();
      unlockAch('theme');
    };
    box.appendChild(d);
  });
}

/* ===== ШРИФТЫ ===== */
function applyFont() {
  document.body.classList.remove('font-mono', 'font-serif', 'font-round');
  const f = FONTS.find(x => x.id === fontChoice);
  if (f && f.cls) document.body.classList.add(f.cls);
}
function openFontPicker() {
  const list = document.getElementById('fontList');
  list.innerHTML = '';
  FONTS.forEach(f => {
    const el = document.createElement('div');
    el.className = 'font-item' + (fontChoice === f.id ? ' active' : '');
    el.innerHTML = `
      <div>
        <div class="f-name ${f.cls}">${f.name}</div>
        <div class="f-preview ${f.cls}">${f.preview}</div>
      </div>
      ${fontChoice === f.id ? '<div class="f-check">✓</div>' : ''}
    `;
    el.onclick = () => {
      fontChoice = f.id;
      store.save('disc_font', f.id);
      applyFont();
      openFontPicker();
    };
    list.appendChild(el);
  });
  document.getElementById('fontModal').classList.add('show');
}
function closeFontPicker() {
  document.getElementById('fontModal').classList.remove('show');
}

/* ===== ЗАМЕТКИ ===== */
function renderNote() {
  const inp = document.getElementById('noteInput');
  const dateLabel = document.getElementById('noteDate');
  if (!inp) return;
  const d = new Date(noteDate + 'T00:00:00');
  const isToday = noteDate === today();
  dateLabel.textContent = isToday ? 'сегодня' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  inp.value = notes[noteDate] || '';
}
function saveNote() {
  const inp = document.getElementById('noteInput');
  if (!inp) return;
  const txt = inp.value.trim();
  if (txt) notes[noteDate] = txt;
  else delete notes[noteDate];
  store.save('disc_notes', notes);
  renderCalendar();
  if (txt) unlockAch('note');
}
function prevNote() {
  const d = new Date(noteDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  noteDate = localDate(d);
  renderNote();
}
function nextNote() {
  const d = new Date(noteDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const nextStr = localDate(d);
  if (nextStr > today()) return;
  noteDate = nextStr;
  renderNote();
}
function todayNote() { noteDate = today(); renderNote(); }

/* ===== ЦЕЛИ ===== */
function renderGoals() {
  const box = document.getElementById('goalsList');
  if (!box) return;
  box.innerHTML = '';
  if (!goals.length) box.innerHTML = '<div class="empty">Добавь первую цель 👇</div>';
  let completed = 0;
  goals.forEach(g => {
    if (g.current >= g.target) completed++;
    const pct = g.target ? Math.min(100, Math.round(g.current / g.target * 100)) : 0;
    const el = document.createElement('div');
    el.className = 'goal';
    el.innerHTML = `
      <div class="goal-head">
        <div class="goal-title ${g.current >= g.target ? 'done' : ''}">${escapeHtml(g.title)}</div>
        <div class="goal-counter">${g.current}/${g.target}</div>
      </div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-controls">
        <button class="goal-btn" data-act="minus" title="Убавить">➖</button>
        <button class="goal-btn" data-act="plus" title="Прибавить">➕</button>
        <button class="goal-btn trash" data-act="del" title="Удалить">🗑</button>
      </div>
    `;
    el.querySelector('[data-act="plus"]').onclick = () => {
      g.current = Math.min(g.target, g.current + 1);
      store.save('disc_goals', goals); renderGoals();
      if (g.current >= g.target) unlockAch('goal');
    };
    el.querySelector('[data-act="minus"]').onclick = () => {
      g.current = Math.max(0, g.current - 1);
      store.save('disc_goals', goals); renderGoals();
    };
    el.querySelector('[data-act="del"]').onclick = () => {
      goals = goals.filter(x => x.id !== g.id);
      store.save('disc_goals', goals); renderGoals();
    };
    box.appendChild(el);
  });
  document.getElementById('goalsBadge').textContent = `${completed}/${goals.length}`;
}
function addGoal() {
  const inp = document.getElementById('goalInput');
  const tgt = document.getElementById('goalTarget');
  const title = inp.value.trim();
  const target = Math.max(1, parseInt(tgt.value) || 1);
  if (!title) return;
  goals.push({ id: Date.now(), title, current: 0, target });
  inp.value = ''; tgt.value = '1';
  store.save('disc_goals', goals); renderGoals();
}

/* ===== ТЕГИ ===== */
let editingTagItem = null;
function openTagModal(item) {
  editingTagItem = item;
  const list = document.getElementById('tagList');
  list.innerHTML = '';
  const noneEl = document.createElement('div');
  noneEl.className = 'sound-item' + (!item.tag ? ' active' : '');
  noneEl.innerHTML = `<div class="s-name">Без тега</div>${!item.tag ? '<div class="s-check">✓</div>' : ''}`;
  noneEl.onclick = () => { item.tag = null; saveAll(); render(); closeTagModal(); };
  list.appendChild(noneEl);
  TAGS.forEach(t => {
    const el = document.createElement('div');
    el.className = 'sound-item' + (item.tag === t.id ? ' active' : '');
    el.innerHTML = `<div class="s-name">${t.name}</div>${item.tag === t.id ? '<div class="s-check">✓</div>' : ''}`;
    el.onclick = () => { item.tag = t.id; saveAll(); render(); closeTagModal(); };
    list.appendChild(el);
  });
  document.getElementById('tagModal').classList.add('show');
}
function closeTagModal() { document.getElementById('tagModal').classList.remove('show'); }

/* ===== ПОМОДОРО ===== */
const POMO_FOCUS = 25 * 60;
const POMO_BREAK = 5 * 60;
let pomoRemaining = POMO_FOCUS;
let pomoInterval = null;
let pomoIsFocus = true;

function pomoRender() {
  const m = Math.floor(pomoRemaining / 60);
  const s = pomoRemaining % 60;
  document.getElementById('pomoTime').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('pomoMode').textContent = pomoIsFocus ? 'Фокус · 25 мин' : 'Отдых · 5 мин';
  document.getElementById('pomoStart').textContent = pomoInterval ? 'Пауза' : 'Старт';
}
function pomoToggle() {
  if (pomoInterval) { clearInterval(pomoInterval); pomoInterval = null; pomoRender(); return; }
  pomoInterval = setInterval(() => {
    pomoRemaining--;
    if (pomoRemaining <= 0) { clearInterval(pomoInterval); pomoInterval = null; pomoFinish(); }
    pomoRender();
  }, 1000);
  pomoRender();
}
function pomoFinish() {
  playBeep();
  fireConfetti();
  if (pomoIsFocus) {
    pomoCount++; pomoTotal++;
    store.save('disc_pomo_' + today(), pomoCount);
    store.save('disc_pomo_total', pomoTotal);
    document.getElementById('pomoCount').textContent = pomoCount;
    notify('🍅 Помодоро завершён!', 'Пора отдохнуть 5 минут');
    unlockAch('pomo1');
    if (pomoCount >= 30) unlockAch('pomoMonth');
    if (pomoTotal >= 100) unlockAch('pomoTotal');
    pomoIsFocus = false; pomoRemaining = POMO_BREAK;
  } else {
    notify('☕ Отдых закончен', 'Возвращаемся к работе');
    pomoIsFocus = true; pomoRemaining = POMO_FOCUS;
  }
  pomoRender();
}
function pomoReset() {
  if (pomoInterval) { clearInterval(pomoInterval); pomoInterval = null; }
  pomoIsFocus = true; pomoRemaining = POMO_FOCUS;
  pomoRender();
}

/* ===== ЗВУКИ ===== */
const SOUNDS = {
  bell:  { name: '🔔 Колокол',      freq: [880, 1320] },
  ding:  { name: '🎐 Двойной динь', freq: [1046, 1046] },
  bird:  { name: '🐦 Птичка',       freq: [2000, 2500] },
  space: { name: '🚀 Космос',       freq: [220, 330] },
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sound = SOUNDS[soundChoice] || SOUNDS.bell;
    sound.freq.forEach((f, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f;
        osc.type = soundChoice === 'space' ? 'sawtooth' : 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.start(); osc.stop(ctx.currentTime + 0.7);
      }, i * 250);
    });
  } catch(e) {}
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function openSoundPicker() {
  const list = document.getElementById('soundList');
  list.innerHTML = '';
  Object.entries(SOUNDS).forEach(([key, s]) => {
    const el = document.createElement('div');
    el.className = 'sound-item' + (soundChoice === key ? ' active' : '');
    el.innerHTML = `<div class="s-name">${s.name}</div>${soundChoice === key ? '<div class="s-check">✓</div>' : ''}`;
    el.onclick = () => { soundChoice = key; store.save('disc_sound', key); playBeep(); openSoundPicker(); };
    list.appendChild(el);
  });
  document.getElementById('soundModal').classList.add('show');
}
function closeSoundPicker() { document.getElementById('soundModal').classList.remove('show'); }

/* ===== КОНФЕТТИ ===== */
function fireConfetti() {
  const colors = ['#4f9dde', '#4fd18b', '#ff6b9d', '#ffb84d', '#a06bf0', '#3ecf9a'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-10px';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }, i * 30);
  }
}

/* ===== ДОСТИЖЕНИЯ ===== */
const ACHIEVEMENTS = [
  { id:'pomo1',     icon:'🍅', name:'Первый помодоро',  desc:'Заверши 1 помодоро' },
  { id:'streak7',   icon:'🔥', name:'7 дней подряд',    desc:'Серия 7 дней' },
  { id:'tasks100',  icon:'💪', name:'100 задач',        desc:'Выполни 100 задач' },
  { id:'note',      icon:'📝', name:'Первая заметка',   desc:'Напиши заметку' },
  { id:'goal',      icon:'🎯', name:'Первая цель',      desc:'Заверши цель' },
  { id:'pomoMonth', icon:'🌟', name:'30 помодоро',      desc:'30 за один день' },
  { id:'pomoTotal', icon:'⚡', name:'100 помодоро',     desc:'100 помодоро всего' },
  { id:'days30',    icon:'📅', name:'30 дней',          desc:'30 дней в приложении' },
  { id:'perfect',   icon:'✨', name:'Идеальный день',   desc:'Все дела на 100%' },
  { id:'tasks1000', icon:'🚀', name:'1000 задач',       desc:'Выполни 1000 задач' },
  { id:'theme',     icon:'🎨', name:'Смена темы',       desc:'Поменяй тему' },
  { id:'streak365', icon:'💎', name:'365 дней подряд',  desc:'Год без пропусков' },
];

function unlockAch(id) {
  if (achievements[id]) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  achievements[id] = Date.now();
  store.save('disc_achievements', achievements);
  showToast(ach.icon, ach.name);
  renderAchGrid();
}
function showToast(icon, name) {
  const toast = document.getElementById('achToast');
  document.getElementById('achToastIcon').textContent = icon;
  document.getElementById('achToastName').textContent = name;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
function renderAchGrid() {
  const grid = document.getElementById('achGrid');
  if (!grid) return;
  grid.innerHTML = '';
  let unlocked = 0;
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = !!achievements[a.id];
    if (isUnlocked) unlocked++;
    const el = document.createElement('div');
    el.className = 'ach-item ' + (isUnlocked ? 'unlocked' : 'locked');
    el.innerHTML = `<span class="ach-icon">${a.icon}</span><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
    grid.appendChild(el);
  });
  document.getElementById('achCount').textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
}
function openAch() { renderAchGrid(); document.getElementById('achModal').classList.add('show'); }
function closeAch() { document.getElementById('achModal').classList.remove('show'); }

function checkAchievements() {
  if (streak >= 7) unlockAch('streak7');
  if (streak >= 365) unlockAch('streak365');
  const daysSince = Math.floor((new Date(today()) - new Date(firstLaunch)) / (1000*60*60*24));
  if (daysSince >= 30) unlockAch('days30');
  const totalTasksDone = Object.values(history).length;
  if (totalTasksDone >= 100) unlockAch('tasks100');
  if (totalTasksDone >= 1000) unlockAch('tasks1000');
  const todayTasks = tasks.filter(t => !t.date || t.date === today());
  const all = [...routines, ...todayTasks];
  if (all.length > 0 && all.every(x => x.done)) unlockAch('perfect');
}

/* ===== УВЕДОМЛЕНИЯ ===== */
let notifEnabled = store.load('disc_notif_enabled', false);
function updateBellBtn() {
  const btn = document.getElementById('bellBtn');
  if (!btn) return;
  if (notifEnabled && Notification.permission === 'granted') {
    btn.classList.add('on'); btn.textContent = '🔔';
  } else {
    btn.classList.remove('on'); btn.textContent = '🔕';
  }
}
function toggleNotifications() {
  if (notifEnabled) { notifEnabled = false; store.save('disc_notif_enabled', false); updateBellBtn(); return; }
  if (Notification.permission === 'granted') {
    notifEnabled = true; store.save('disc_notif_enabled', true); updateBellBtn(); return;
  }
  Notification.requestPermission().then(p => {
    if (p === 'granted') {
      notifEnabled = true; store.save('disc_notif_enabled', true);
      notify('🔔 Напоминания включены', 'Уведомления будут приходить в указанное время');
    } else alert('Разрешение не выдано.');
    updateBellBtn();
  });
}
function notify(title, body) {
  if (!notifEnabled) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/icon.svg' }); } catch(e) {}
}

/* ===== ВРЕМЯ ===== */
let editingItem = null;
function openTimeModal(item) {
  editingItem = item;
  const inp = document.getElementById('timeInput');
  inp.value = item.time || '08:00';
  document.getElementById('timeModalTitle').textContent = 'Напоминание: ' + item.text;
  document.getElementById('timeModal').classList.add('show');
}
function closeTimeModal() { document.getElementById('timeModal').classList.remove('show'); editingItem = null; }
function saveTime() {
  if (!editingItem) return;
  const t = document.getElementById('timeInput').value;
  if (t) { editingItem.time = t; editingItem.notified = false; saveAll(); render(); }
  closeTimeModal();
}
function clearTime() {
  if (editingItem) { editingItem.time = null; editingItem.notified = false; saveAll(); render(); }
  closeTimeModal();
}

setInterval(() => {
  if (!notifEnabled) return;
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  [...routines, ...tasks].forEach(item => {
    if (item.time === hhmm && !item.notified && !item.done) {
      item.notified = true;
      notify('⏰ ' + item.text, 'Пора делать!');
      playBeep();
      saveAll();
    }
    if (item.time !== hhmm) item.notified = false;
  });
}, 30000);

/* ===== ГОЛОС ===== */
let recognition = null;
let isRecording = false;
function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Голосовой ввод не поддерживается в этом браузере');
    return;
  }
  if (isRecording) { recognition.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    isRecording = true;
    btn.classList.add('recording');
    btn.textContent = '⏺';
  };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript.trim();
    if (text) {
      document.getElementById('taskInput').value = text;
      addTask();
    }
  };
  recognition.onerror = (e) => { console.log('voice error', e); };
  recognition.onend = () => {
    isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
  };
  recognition.start();
}

/* ===== AI ===== */
async function askAI() {
  const input = document.getElementById('aiInput');
  const box = document.getElementById('aiResponse');
  const q = input.value.trim();
  if (!q) return;
  const apiKey = store.load('disc_ai_key', '');
  if (!apiKey) {
    box.innerHTML = '<span style="color:var(--danger);">⚠️ Нужен API-ключ Anthropic. Введи его ниже.</span>';
    return;
  }
  box.innerHTML = '<span style="color:var(--text-dim);">🤔 Думаю...</span>';
  const context = `Ты — помощник в трекере дисциплины "Constancia".
Серия дней подряд: ${streak}
Помодоро сегодня: ${pomoCount}
Всего задач в истории: ${Object.values(history).length}
Целей активно: ${goals.length}
Целей выполнено: ${goals.filter(g=>g.current>=g.target).length}
Задача пользователя: ${q}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: context }]
      })
    });
    const data = await r.json();
    if (data.content && data.content[0]) {
      box.innerHTML = '<div style="white-space:pre-wrap;">' + escapeHtml(data.content[0].text) + '</div>';
    } else {
      box.innerHTML = '<span style="color:var(--danger);">Ошибка: ' + JSON.stringify(data).slice(0,200) + '</span>';
    }
  } catch(e) {
    box.innerHTML = '<span style="color:var(--danger);">Ошибка: ' + e.message + '</span>';
  }
}
function saveAiKey() {
  const k = document.getElementById('aiKeyInput').value.trim();
  store.save('disc_ai_key', k);
  alert(k ? '✅ Ключ сохранён' : 'Ключ удалён');
}
function openAi() {
  document.getElementById('aiKeyInput').value = store.load('disc_ai_key', '');
  document.getElementById('aiModal').classList.add('show');
}
function closeAi() { document.getElementById('aiModal').classList.remove('show'); }

/* ===== ИНИЦИАЛИЗАЦИЯ ===== */
document.body.dataset.theme = theme;
applyFont();
renderThemes();
render();
renderNote();
renderCompare();
renderCalendar();
renderMonthReport();
renderTree();
pomoRender();
updateBellBtn();
const noteInput = document.getElementById('noteInput');
if (noteInput) noteInput.addEventListener('input', saveNote);

document.getElementById('goalInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });
document.getElementById('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
document.getElementById('routineInput').addEventListener('keydown', e => { if (e.key === 'Enter') addRoutine(); });

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
});

const dayNoteEl = document.getElementById('dayNote');
if (dayNoteEl) dayNoteEl.addEventListener('input', saveDayNote);
const dayTaskInputEl = document.getElementById('dayTaskInput');
if (dayTaskInputEl) dayTaskInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') addDayTask();
});
const tplNameInputEl = document.getElementById('tplNameInput');
if (tplNameInputEl) tplNameInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') e.preventDefault();
});