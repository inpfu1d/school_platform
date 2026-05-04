/**
 * منصة المهارات الرقمية التعليمية
 * Single Page Application — Vanilla JavaScript
 */

// =============================================
// STATE
// =============================================
let allGames = [];
let currentGrade = null;
let currentTerm  = null;

// =============================================
// DOM REFERENCES
// =============================================
const body         = document.body;
const themeToggle  = document.getElementById('theme-toggle');
const breadcrumbs  = document.getElementById('breadcrumbs');
const breadcrumbTrail = document.getElementById('breadcrumb-trail');
const searchInput  = document.getElementById('search-input');
const gameIframe   = document.getElementById('game-iframe');
const btnBack      = document.getElementById('btn-back');

const views = {
  home:  document.getElementById('view-home'),
  terms: document.getElementById('view-terms'),
  games: document.getElementById('view-games'),
  game:  document.getElementById('view-game'),
};

const grids = {
  grades: document.getElementById('grades-grid'),
  terms:  document.getElementById('terms-grid'),
  games:  document.getElementById('games-grid'),
};

const emptyState      = document.getElementById('empty-state');
const comingSoonState = document.getElementById('coming-soon-state');
const shareBar        = document.getElementById('share-bar');
const btnShare        = document.getElementById('btn-share');
const btnReset        = document.getElementById('btn-reset');
const btnReport       = document.getElementById('btn-report');
const certOverlay     = document.getElementById('cert-overlay');
const certBackdrop    = document.getElementById('cert-backdrop');
const certBtnPrint    = document.getElementById('cert-btn-print');
const certBtnClose    = document.getElementById('cert-btn-close');
const certBody        = document.getElementById('cert-body');
const certDate        = document.getElementById('cert-date');
const toastEl         = document.getElementById('toast');
const footerSecret    = document.getElementById('footer-secret');
const tvOverlay       = document.getElementById('tv-overlay');
const tvBackdrop      = document.getElementById('tv-backdrop');
const tvClose         = document.getElementById('tv-close');
const tvStats         = document.getElementById('tv-stats');
const tvBody          = document.getElementById('tv-body');
const tvEditorList    = document.getElementById('tv-editor-list');
const tvBtnAdd        = document.getElementById('tv-btn-add');
const tvBtnExport     = document.getElementById('tv-btn-export');
const progressBadge   = document.getElementById('progress-badge');
const progressCount   = document.getElementById('progress-count');
const progressTotal   = document.getElementById('progress-total');

// =============================================
// AUDIO — subtle click sound via Web Audio API
// =============================================
const audioCtx = (window.AudioContext || window.webkitAudioContext)
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playClick() {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.12);
}

// Play click on every button/card click
document.addEventListener('click', (e) => {
  const target = e.target.closest('button, .grade-card, .term-card, .game-card .btn-play, .btn-back, .breadcrumb-item');
  if (target) playClick();
});

// =============================================
// THEME
// =============================================
function applyTheme(light) {
  body.classList.toggle('light', light);
  localStorage.setItem('theme', light ? 'light' : 'dark');
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') { applyTheme(true);  return; }
  localStorage.setItem('theme', 'dark');
  applyTheme(false);
}

themeToggle.addEventListener('click', () => {
  applyTheme(!body.classList.contains('light'));
});

// =============================================
// PROGRESS (LocalStorage)
// =============================================
function getPlayed() {
  try { return JSON.parse(localStorage.getItem('played') || '[]'); }
  catch { return []; }
}

function markPlayed(id) {
  const played = getPlayed();
  if (!played.includes(id)) {
    played.push(id);
    localStorage.setItem('played', JSON.stringify(played));
    updateProgressBadge();
    updateGradeRings();
  }
}

function isPlayed(id) {
  return getPlayed().includes(String(id));
}

function updateProgressBadge() {
  const total   = allGames.length;
  const played  = getPlayed().filter(id => allGames.some(g => String(g.id) === id)).length;
  progressCount.textContent = played;
  progressTotal.textContent = total;
  progressBadge.setAttribute('data-total', total);
  progressBadge.classList.toggle('all-done', total > 0 && played === total);
}

// =============================================
// GRADE PROGRESS RINGS
// =============================================
const CIRC = 2 * Math.PI * 30; // r=30 → ~188.5

function updateGradeRings() {
  GRADES.forEach(grade => {
    const wrap = document.querySelector(`.grade-ring-wrap[data-grade="${grade.id}"]`);
    if (!wrap) return;
    const total  = allGames.filter(g => g.grade === grade.id).length;
    const played = getPlayed().filter(id =>
      allGames.some(g => String(g.id) === id && g.grade === grade.id)
    ).length;
    const pct    = total > 0 ? played / total : 0;
    const offset = CIRC * (1 - pct);
    const fill   = wrap.querySelector('.grade-ring__fill');
    if (fill) fill.style.strokeDashoffset = offset;
    wrap.dataset.complete = (total > 0 && played === total) ? 'true' : 'false';
  });
}

// =============================================
// TOAST
// =============================================
let toastTimer = null;
function showToast(msg, durationMs = 3000) {
  toastEl.textContent = msg;
  toastEl.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('toast--visible'), durationMs);
}

// =============================================
// VIEWS
// =============================================
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  if (views[name]) views[name].classList.add('active');
}

function updateBreadcrumbs(items) {
  if (!items || items.length === 0) {
    breadcrumbs.hidden = true;
    body.classList.remove('has-breadcrumbs');
    return;
  }
  breadcrumbs.hidden = false;
  body.classList.add('has-breadcrumbs');

  breadcrumbTrail.innerHTML = '';
  items.forEach((item, idx) => {
    const span = document.createElement('span');
    const isLast = idx === items.length - 1;
    span.className = 'breadcrumb-item' + (isLast ? ' current' : '');
    span.textContent = item.label;
    if (!isLast && item.action) {
      span.addEventListener('click', () => { playClick(); item.action(); });
    }
    breadcrumbTrail.appendChild(span);

    if (!isLast) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = ' › ';
      breadcrumbTrail.appendChild(sep);
    }
  });
}

// =============================================
// LEVEL 1 — GRADES
// =============================================
const GRADES = [
  { id: 1, label: 'الصف الأول متوسط',  icon: '💻', sub: 'السنة الأولى' },
  { id: 2, label: 'الصف الثاني متوسط', icon: '🤖', sub: 'السنة الثانية' },
  { id: 3, label: 'الصف الثالث متوسط', icon: '🎮', sub: 'السنة الثالثة' },
];

function renderGrades() {
  grids.grades.innerHTML = '';
  GRADES.forEach(grade => {
    const card = document.createElement('div');
    card.className = 'grade-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="grade-ring-wrap" data-grade="${grade.id}" data-complete="false">
        <svg class="grade-ring" viewBox="0 0 72 72" aria-hidden="true">
          <circle class="grade-ring__track" cx="36" cy="36" r="30"/>
          <circle class="grade-ring__fill"  cx="36" cy="36" r="30"
                  stroke-dasharray="${CIRC.toFixed(1)}"
                  stroke-dashoffset="${CIRC.toFixed(1)}"/>
        </svg>
        <span class="grade-card__icon">${grade.icon}</span>
      </div>
      <div class="grade-card__title">${grade.label}</div>
      <div class="grade-card__sub">${grade.sub}</div>
    `;
    card.addEventListener('click', () => navigateToTerms(grade));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') { playClick(); navigateToTerms(grade); } });
    grids.grades.appendChild(card);
  });
}

// =============================================
// LEVEL 2 — TERMS
// =============================================
const TERMS = [
  { id: 1, label: 'الترم الأول',  icon: '📘' },
  { id: 2, label: 'الترم الثاني', icon: '📗' },
];

function navigateToTerms(grade) {
  currentGrade = grade;
  currentTerm  = null;

  grids.terms.innerHTML = '';
  TERMS.forEach(term => {
    const card = document.createElement('div');
    card.className = 'term-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <span class="term-card__icon">${term.icon}</span>
      <div class="term-card__title">${term.label}</div>
    `;
    card.addEventListener('click', () => navigateToGames(term));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') { playClick(); navigateToGames(term); } });
    grids.terms.appendChild(card);
  });

  updateBreadcrumbs([
    { label: 'الرئيسية', action: navigateHome },
    { label: grade.label },
  ]);
  showView('terms');
}

// =============================================
// LEVEL 3 — GAMES LIBRARY
// =============================================
function navigateToGames(term) {
  currentTerm = term;
  searchInput.value = '';
  renderGames('');

  updateBreadcrumbs([
    { label: 'الرئيسية', action: navigateHome },
    { label: currentGrade.label, action: () => navigateToTerms(currentGrade) },
    { label: term.label },
  ]);
  showView('games');
}

function renderGames(query) {
  const gradeId = currentGrade.id;
  const termId  = currentTerm.id;
  const q = query.trim().toLowerCase();

  const allForSection = allGames.filter(g => g.grade === gradeId && g.term === termId);
  const filtered = allForSection.filter(g =>
    !q || g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
  );

  const hasNoContent      = allForSection.length === 0;
  const hasNoSearchResult = !hasNoContent && filtered.length === 0;

  grids.games.innerHTML       = '';
  emptyState.hidden           = !hasNoSearchResult;
  comingSoonState.hidden      = !hasNoContent;
  shareBar.hidden             = hasNoContent;

  filtered.forEach(game => {
    const played = isPlayed(game.id);
    const badgeClass = {
      'جديد':   'badge--new',
      'مراجعة': 'badge--review',
      'ممتع':   'badge--fun',
    }[game.badge] || 'badge--new';

    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      ${game.badge ? `<span class="game-badge ${badgeClass}">${game.badge}</span>` : ''}
      ${played ? `<span class="completed-badge">✅ مُنجز</span>` : ''}
      <div class="game-card__icon">${game.icon || '🎮'}</div>
      <div class="game-card__title">${game.title}</div>
      <div class="game-card__desc">${game.description || ''}</div>
      <button class="btn-play" data-id="${game.id}" data-url="${game.url}">ابدأ اللعب 🚀</button>
    `;

    card.querySelector('.btn-play').addEventListener('click', () => {
      openGame(game);
    });

    grids.games.appendChild(card);
  });
}

searchInput.addEventListener('input', () => {
  renderGames(searchInput.value);
});

// =============================================
// LEVEL 4 — GAME VIEW
// =============================================
function openGame(game) {
  markPlayed(game.id);
  gameIframe.src = game.url;

  updateBreadcrumbs([
    { label: 'الرئيسية',       action: navigateHome },
    { label: currentGrade.label, action: () => navigateToTerms(currentGrade) },
    { label: currentTerm.label,  action: () => navigateToGames(currentTerm) },
    { label: game.title },
  ]);
  showView('game');
}

btnBack.addEventListener('click', () => {
  gameIframe.src = '';
  renderGames(searchInput.value);
  updateBreadcrumbs([
    { label: 'الرئيسية',       action: navigateHome },
    { label: currentGrade.label, action: () => navigateToTerms(currentGrade) },
    { label: currentTerm.label },
  ]);
  showView('games');
});

// =============================================
// NAVIGATION — HOME
// =============================================
function navigateHome() {
  currentGrade = null;
  currentTerm  = null;
  gameIframe.src = '';
  updateBreadcrumbs([]);
  showView('home');
}

// =============================================
// LOAD DATA
// =============================================
async function loadGames() {
  try {
    const res  = await fetch('./games.json');
    if (!res.ok) throw new Error('Failed to load games.json');
    allGames = await res.json();
  } catch (err) {
    console.error('Could not load games:', err);
    allGames = [];
  }
}

// =============================================
// INIT
// =============================================
// TEACHER VIEW (secret — triple-click footer)
// =============================================
const TERMS_MAP  = { 1: 'الترم الأول', 2: 'الترم الثاني' };
const BADGE_CLASS = { 'جديد': 'pill--new', 'مراجعة': 'pill--review', 'ممتع': 'pill--fun' };
const BADGE_OPTIONS = ['جديد', 'مراجعة', 'ممتع'];

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
  document.querySelectorAll('.tv-tab').forEach(t => {
    const active = t.id === `tv-tab-btn-${tabId}`;
    t.classList.toggle('tv-tab--active', active);
    t.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.tv-panel').forEach(p => {
    p.classList.toggle('tv-panel--active', p.id === `tv-panel-${tabId}`);
  });
  if (tabId === 'view') buildTeacherView();
  if (tabId === 'edit') buildEditorView();
}

document.getElementById('tv-tab-btn-view').addEventListener('click', () => switchTab('view'));
document.getElementById('tv-tab-btn-edit').addEventListener('click', () => switchTab('edit'));

// --- VIEW TAB: curriculum summary ---
function buildTeacherView() {
  const total = allGames.length;
  let statsHtml = `<span class="tv-stat-chip">📦 إجمالي الألعاب: ${total}</span>`;
  GRADES.forEach(g => {
    const cnt = allGames.filter(x => x.grade === g.id).length;
    statsHtml += `<span class="tv-stat-chip tv-stat-chip--grade">${g.icon} ${g.label}: ${cnt}</span>`;
  });
  tvStats.innerHTML = statsHtml;

  let bodyHtml = '';
  GRADES.forEach(grade => {
    const gradeGames = allGames.filter(g => g.grade === grade.id);
    bodyHtml += `
      <div class="tv-grade">
        <div class="tv-grade-header">
          <span class="tv-grade-header__icon">${grade.icon}</span>
          <span class="tv-grade-header__label">${grade.label}</span>
          <span class="tv-grade-header__count">${gradeGames.length} لعبة</span>
        </div>`;
    [1, 2].forEach(termId => {
      const termGames = gradeGames.filter(g => g.term === termId);
      bodyHtml += `
        <div class="tv-term">
          <div class="tv-term-header">📖 ${TERMS_MAP[termId]} — ${termGames.length} لعبة</div>`;
      if (termGames.length === 0) {
        bodyHtml += `<p style="padding:0.75rem 1rem;color:var(--text-muted);font-size:0.84rem;">لا توجد ألعاب بعد</p>`;
      } else {
        bodyHtml += `
          <table class="tv-table"><thead><tr>
            <th class="tv-col-num">#</th>
            <th class="tv-col-icon">أيقونة</th>
            <th class="tv-col-title">اسم اللعبة</th>
            <th class="tv-col-badge">النوع</th>
            <th class="tv-col-desc">الوصف</th>
            <th class="tv-col-url">الرابط</th>
          </tr></thead><tbody>`;
        termGames.forEach((game, idx) => {
          const pillClass = BADGE_CLASS[game.badge] || 'pill--new';
          const badgeHtml = game.badge
            ? `<span class="badge-pill ${pillClass}">${game.badge}</span>` : '—';
          bodyHtml += `
            <tr>
              <td class="tv-col-num">${idx + 1}</td>
              <td class="tv-col-icon">${game.icon || '🎮'}</td>
              <td class="tv-col-title">${escapeHtml(game.title)}</td>
              <td class="tv-col-badge">${badgeHtml}</td>
              <td class="tv-col-desc">${escapeHtml(game.description || '')}</td>
              <td class="tv-col-url"><a href="${escapeHtml(game.url)}" target="_blank" rel="noopener">فتح الرابط ↗</a></td>
            </tr>`;
        });
        bodyHtml += `</tbody></table>`;
      }
      bodyHtml += `</div>`;
    });
    bodyHtml += `</div>`;
  });
  tvBody.innerHTML = bodyHtml;
}

// --- EDITOR TAB: game list + inline forms ---
function renderGameCard(game, idx) {
  const pillClass = BADGE_CLASS[game.badge] || 'pill--new';
  const badgeHtml = game.badge
    ? `<span class="badge-pill ${pillClass}">${escapeHtml(game.badge)}</span>` : '';
  const gradeInfo = GRADES.find(g => g.id === game.grade);
  return `
    <div class="tv-game-row" data-game-id="${escapeHtml(game.id)}">
      <span class="tv-game-num">${idx + 1}</span>
      <span class="tv-game-emoji">${game.icon || '🎮'}</span>
      <div class="tv-game-meta">
        <span class="tv-game-title">${escapeHtml(game.title)}</span>
        <div class="tv-game-tags">
          ${gradeInfo ? `<span class="tv-tag">${escapeHtml(gradeInfo.label)}</span>` : ''}
          <span class="tv-tag">${TERMS_MAP[game.term] || ''}</span>
          ${badgeHtml}
        </div>
      </div>
      <div class="tv-game-actions">
        <button class="tv-btn tv-btn--edit" data-action="edit" data-game-id="${escapeHtml(game.id)}" title="تعديل">✏️ تعديل</button>
        <button class="tv-btn tv-btn--delete" data-action="delete" data-game-id="${escapeHtml(game.id)}" title="حذف">🗑️</button>
      </div>
    </div>`;
}

function renderEditForm(game, isNew = false) {
  const gradeOptions = GRADES.map(g =>
    `<option value="${g.id}" ${game.grade === g.id ? 'selected' : ''}>${escapeHtml(g.label)}</option>`
  ).join('');
  const badgeOptions = BADGE_OPTIONS.map(b =>
    `<option value="${b}" ${game.badge === b ? 'selected' : ''}>${b}</option>`
  ).join('');
  return `
    <div class="tv-edit-form" data-game-id="${escapeHtml(game.id)}">
      <div class="tv-form-grid">
        <div class="tv-form-field tv-form-field--wide">
          <label class="tv-form-label">العنوان</label>
          <input class="tv-input" type="text" name="title" value="${escapeHtml(game.title)}" placeholder="اسم اللعبة" dir="rtl">
        </div>
        <div class="tv-form-field">
          <label class="tv-form-label">الأيقونة</label>
          <input class="tv-input tv-input--icon" type="text" name="icon" value="${escapeHtml(game.icon || '🎮')}" maxlength="4" placeholder="🎮">
        </div>
        <div class="tv-form-field">
          <label class="tv-form-label">الصف</label>
          <select class="tv-select" name="grade">${gradeOptions}</select>
        </div>
        <div class="tv-form-field">
          <label class="tv-form-label">الترم</label>
          <select class="tv-select" name="term">
            <option value="1" ${game.term === 1 ? 'selected' : ''}>الترم الأول</option>
            <option value="2" ${game.term === 2 ? 'selected' : ''}>الترم الثاني</option>
          </select>
        </div>
        <div class="tv-form-field">
          <label class="tv-form-label">النوع</label>
          <select class="tv-select" name="badge">
            <option value="">— بدون —</option>
            ${badgeOptions}
          </select>
        </div>
        <div class="tv-form-field tv-form-field--full">
          <label class="tv-form-label">الوصف</label>
          <textarea class="tv-input tv-input--textarea" name="description" rows="2" dir="rtl" placeholder="وصف مختصر للنشاط...">${escapeHtml(game.description || '')}</textarea>
        </div>
        <div class="tv-form-field tv-form-field--full">
          <label class="tv-form-label">الرابط</label>
          <input class="tv-input" type="url" name="url" value="${escapeHtml(game.url || '')}" placeholder="https://..." dir="ltr">
        </div>
      </div>
      <div class="tv-form-actions">
        <button class="tv-btn tv-btn--save" data-action="save" data-game-id="${escapeHtml(game.id)}">💾 حفظ</button>
        <button class="tv-btn tv-btn--cancel" data-action="cancel" data-game-id="${escapeHtml(game.id)}">إلغاء</button>
        ${isNew ? '' : `<span style="margin-right:auto;font-size:0.75rem;color:var(--text-muted)">معرّف: ${escapeHtml(game.id)}</span>`}
      </div>
    </div>`;
}

function buildEditorView() {
  if (allGames.length === 0) {
    tvEditorList.innerHTML = `<p class="tv-empty">لا توجد ألعاب بعد. اضغط على "إضافة لعبة جديدة" للبدء.</p>`;
    return;
  }
  tvEditorList.innerHTML = allGames.map((g, i) => renderGameCard(g, i)).join('');
}

// Event delegation — handles edit / delete / save / cancel inside the list
tvEditorList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const gameId = btn.dataset.gameId;

  if (action === 'edit') {
    const game = allGames.find(g => String(g.id) === gameId);
    if (!game) return;
    const row = tvEditorList.querySelector(`.tv-game-row[data-game-id="${gameId}"]`);
    if (row) row.outerHTML = renderEditForm(game, false);
    tvEditorList.querySelector(`.tv-edit-form[data-game-id="${gameId}"] [name="title"]`)?.focus();
  }

  if (action === 'delete') {
    const game = allGames.find(g => String(g.id) === gameId);
    if (!game) return;
    if (!confirm(`هل أنت متأكد من حذف اللعبة "${game.title}"؟`)) return;
    allGames = allGames.filter(g => String(g.id) !== gameId);
    buildEditorView();
    buildTeacherView();
    updateProgressBadge();
    updateGradeRings();
    showToast(`🗑 تم حذف "${game.title}"`);
  }

  if (action === 'save') {
    const form = btn.closest('.tv-edit-form');
    const isNew = gameId === '__new__';
    const title = form.querySelector('[name="title"]').value.trim();
    const url   = form.querySelector('[name="url"]').value.trim();
    if (!title) { showToast('⚠️ يرجى إدخال عنوان اللعبة'); return; }
    if (!url)   { showToast('⚠️ يرجى إدخال رابط اللعبة'); return; }

    const maxId = allGames.length > 0
      ? Math.max(...allGames.map(g => parseInt(g.id) || 0))
      : 0;

    const data = {
      id:          isNew ? String(maxId + 1) : gameId,
      title,
      icon:        form.querySelector('[name="icon"]').value.trim() || '🎮',
      grade:       parseInt(form.querySelector('[name="grade"]').value),
      term:        parseInt(form.querySelector('[name="term"]').value),
      badge:       form.querySelector('[name="badge"]').value,
      description: form.querySelector('[name="description"]').value.trim(),
      url,
    };

    if (isNew) {
      allGames.push(data);
    } else {
      const idx = allGames.findIndex(g => String(g.id) === gameId);
      if (idx !== -1) allGames[idx] = data;
    }

    buildEditorView();
    buildTeacherView();
    updateProgressBadge();
    updateGradeRings();
    showToast(isNew ? `✅ تمت إضافة "${data.title}" بنجاح!` : `✅ تم حفظ "${data.title}" بنجاح!`);
  }

  if (action === 'cancel') {
    const form = btn.closest('.tv-edit-form');
    if (gameId === '__new__') {
      form.remove();
    } else {
      const game = allGames.find(g => String(g.id) === gameId);
      const idx  = allGames.findIndex(g => String(g.id) === gameId);
      if (game) form.outerHTML = renderGameCard(game, idx);
    }
  }
});

// Add New Game button
tvBtnAdd.addEventListener('click', () => {
  const blank = { id: '__new__', title: '', icon: '🎮', grade: 1, term: 1, badge: 'جديد', description: '', url: '' };
  const frag  = document.createElement('div');
  frag.innerHTML = renderEditForm(blank, true);
  const formEl = frag.firstElementChild;
  tvEditorList.prepend(formEl);
  formEl.querySelector('[name="title"]')?.focus();
});

// Export games.json
tvBtnExport.addEventListener('click', () => {
  const json = JSON.stringify(allGames, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'games.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast(`✅ تم تصدير games.json (${allGames.length} لعبة) — ضع الملف في مجلد public/`);
});

// --- OPEN / CLOSE ---
function openTeacherView() {
  switchTab('view');
  tvOverlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  tvClose.focus();
}

function closeTeacherView() {
  tvOverlay.hidden = true;
  document.body.style.overflow = '';
}

tvClose.addEventListener('click', closeTeacherView);
tvBackdrop.addEventListener('click', closeTeacherView);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !tvOverlay.hidden) closeTeacherView();
});

// Secret triple-click trigger on footer text (3 clicks within 2 seconds)
let _footerClicks = 0;
let _footerTimer  = null;
footerSecret.addEventListener('click', () => {
  _footerClicks++;
  clearTimeout(_footerTimer);
  if (_footerClicks >= 3) {
    _footerClicks = 0;
    openTeacherView();
    return;
  }
  _footerTimer = setTimeout(() => { _footerClicks = 0; }, 2000);
});

// =============================================
// CERTIFICATE / PROGRESS REPORT
// =============================================
function buildCertificate() {
  const played = getPlayed();

  certDate.textContent = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let html = '';
  GRADES.forEach(grade => {
    const gradeGames   = allGames.filter(g => g.grade === grade.id);
    const playedGames  = gradeGames.filter(g => played.includes(String(g.id)));
    const total        = gradeGames.length;
    const count        = playedGames.length;
    const pct          = total > 0 ? Math.round((count / total) * 100) : 0;

    const gameItems = playedGames.length > 0
      ? `<ul class="cert-game-list">${playedGames.map(g =>
          `<li>${g.title}</li>`).join('')}</ul>`
      : `<p class="cert-no-games">لم يتم اللعب بعد</p>`;

    html += `
      <div class="cert-grade">
        <div class="cert-grade-header">
          <span class="cert-grade-icon">${grade.icon}</span>
          <span class="cert-grade-label">${grade.label}</span>
          <span class="cert-grade-count">${count} / ${total} لعبة</span>
        </div>
        <div class="cert-progress-bar">
          <div class="cert-progress-fill" style="width:${pct}%"></div>
        </div>
        ${gameItems}
      </div>`;
  });

  certBody.innerHTML = html;
}

function openCertificate() {
  buildCertificate();
  certOverlay.hidden = false;
  certOverlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  certBtnClose.focus();
}

function closeCertificate() {
  certOverlay.hidden = true;
  document.body.style.overflow = '';
  btnReport.focus();
}

btnReport.addEventListener('click', openCertificate);
certBtnClose.addEventListener('click', closeCertificate);
certBackdrop.addEventListener('click', closeCertificate);
certBtnPrint.addEventListener('click', () => window.print());

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !certOverlay.hidden) closeCertificate();
});

// Reset progress
btnReset.addEventListener('click', () => {
  const confirmed = window.confirm(
    'هل أنت متأكد من رغبتك في مسح جميع إنجازاتك والبدء من جديد؟'
  );
  if (!confirmed) return;
  localStorage.removeItem('played');
  updateProgressBadge();
  updateGradeRings();
  if (views.games.classList.contains('active')) {
    renderGames(searchInput.value);
  }
  showToast('🗑 تم مسح جميع الإنجازات بنجاح');
});

// Share achievement
btnShare.addEventListener('click', async () => {
  const msg = 'لقد أنهيت مجموعة من الألعاب الممتعة في منصة المهارات الرقمية! 🚀';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(msg);
      showToast('✅ تم نسخ إنجازك! شاركه مع أصدقائك');
    } else {
      const ta = document.createElement('textarea');
      ta.value = msg;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ تم نسخ إنجازك! شاركه مع أصدقائك');
    }
  } catch {
    showToast('⚠️ تعذّر النسخ — يُرجى المحاولة مرة أخرى');
  }
});

async function init() {
  initTheme();
  await loadGames();
  updateProgressBadge();
  renderGrades();
  updateGradeRings();
  showView('home');
}

init();
