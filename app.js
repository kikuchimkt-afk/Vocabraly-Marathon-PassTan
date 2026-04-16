/**
 * パス単マラソン - 出る順パス単4択空所補充クイズ
 */
'use strict';

const state = {
  quizData: {},
  wordlistData: {},
  grade: null,
  idStart: null,
  idEnd: null,
  questions: [],
  current: 0,
  correct: 0,
  wrong: 0,
  mistakes: [],
  answered: false,
  hintStage: 0,
  todayAnswered: 0,
  autoNextTimer: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

// ====== Storage Keys ======
const CLEARED_KEY = 'passtan_cleared';
const STATS_KEY = 'passtan_stats';
const STREAK_KEY = 'passtan_streak';
const MISTAKES_KEY = 'passtan_mistakes';
const MIN_ANSWERS = 10;
const MILESTONES = [20, 40, 60, 80, 100, 150, 200, 365];

// ====== Grade Config ======
const GRADES = [
  { key: '5kyu',    label: '5級',  icon: '🟢', file: 'pass5_quiz.json',     audioDir: '5kyu_pass', wordlist: 'wordlist_5kyu_pass.json' },
  { key: '4kyu',    label: '4級',  icon: '🔵', file: 'pass4_quiz.json',     audioDir: '4kyu_pass', wordlist: 'wordlist_4kyu_pass.json' },
  { key: '3kyu',    label: '3級',  icon: '🟡', file: 'pass3_quiz.json',     audioDir: '3kyu_pass', wordlist: 'wordlist_3kyu_pass.json' },
  { key: 'pre2kyu', label: '準2級', icon: '🟠', file: 'pass_pre2_quiz.json', audioDir: 'pre2kyu_pass', wordlist: 'wordlist_pre2kyu_pass.json' },
];

// ====== Cleared / Stats ======
function getClearedSet(grade) {
  try { const r = localStorage.getItem(CLEARED_KEY + '_' + grade); if (r) return new Set(JSON.parse(r)); } catch(e) {}
  return new Set();
}
function saveClearedSet(grade, s) {
  try { localStorage.setItem(CLEARED_KEY + '_' + grade, JSON.stringify([...s])); } catch(e) {}
}
function markCleared(grade, qId) { const s = getClearedSet(grade); s.add(qId); saveClearedSet(grade, s); }

function getStats(grade) {
  try { const r = localStorage.getItem(STATS_KEY + '_' + grade); if (r) return JSON.parse(r); } catch(e) {}
  return { totalAttempts: 0, correctAttempts: 0 };
}
function saveStats(grade, s) { try { localStorage.setItem(STATS_KEY + '_' + grade, JSON.stringify(s)); } catch(e) {} }
function recordStats(grade, ok) { const s = getStats(grade); s.totalAttempts++; if (ok) s.correctAttempts++; saveStats(grade, s); }

// ====== Mistake History ======
function getMistakeHistory() {
  try { const r = localStorage.getItem(MISTAKES_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return [];
}
function saveMistakeHistory(arr) {
  try { localStorage.setItem(MISTAKES_KEY, JSON.stringify(arr.slice(-500))); } catch(e) {}
}
function addMistakeToHistory(q, grade) {
  const h = getMistakeHistory();
  if (h.some(x => x.id === q.id)) return;
  h.push({ id: q.id, grade, sentence: q.question, sentence_ja: q.questionJa || '', answer: q.answer, meanings: q.meanings, choices: q.choices, rank: q.rank, audioKey: q.audioKey, date: getTodayStr() });
  saveMistakeHistory(h);
}
function removeMistakeFromHistory(id) { saveMistakeHistory(getMistakeHistory().filter(x => x.id !== id)); }

// ====== Streak ======
function getStreakData() {
  try { const r = localStorage.getItem(STREAK_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return { streak: 0, lastDate: null, totalDays: 0, shownMilestones: [] };
}
function saveStreakData(d) { try { localStorage.setItem(STREAK_KEY, JSON.stringify(d)); } catch(e) {} }
function getTodayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

function checkStreak() {
  const d = getStreakData(); const today = getTodayStr();
  if (d.lastDate === today) return d;
  const y = new Date(); y.setDate(y.getDate()-1);
  const ys = y.getFullYear() + '-' + String(y.getMonth()+1).padStart(2,'0') + '-' + String(y.getDate()).padStart(2,'0');
  if (d.lastDate !== ys && d.lastDate && d.lastDate !== today) { d.streak = 0; saveStreakData(d); }
  return d;
}

function recordTraining() {
  const d = getStreakData(); const today = getTodayStr();
  if (d.lastDate === today) return d;
  if (state.todayAnswered < MIN_ANSWERS) return d;
  const y = new Date(); y.setDate(y.getDate()-1);
  const ys = y.getFullYear() + '-' + String(y.getMonth()+1).padStart(2,'0') + '-' + String(y.getDate()).padStart(2,'0');
  d.streak = (d.lastDate === ys) ? d.streak + 1 : 1;
  d.lastDate = today; d.totalDays = (d.totalDays || 0) + 1;
  if (!d.shownMilestones) d.shownMilestones = [];
  saveStreakData(d); return d;
}

function trackAnswer() {
  state.todayAnswered++;
  if (state.todayAnswered === MIN_ANSWERS) { const sd = recordTraining(); renderStreakBadge(); return sd; }
  return null;
}

function renderStreakBadge() {
  const badge = $('#streakBadge'); if (!badge) return;
  const d = checkStreak(); const today = getTodayStr(); const trained = d.lastDate === today;
  if (d.streak === 0 && !trained) {
    badge.innerHTML = '<div class="streak-content"><span class="streak-icon">🌱</span><span class="streak-text">今日からトレーニングを始めよう！</span></div>';
  } else {
    const flame = d.streak >= 30 ? '🔥🔥🔥' : d.streak >= 10 ? '🔥🔥' : d.streak >= 3 ? '🔥' : '✨';
    badge.innerHTML = '<div class="streak-content"><span class="streak-icon">' + flame + '</span><div class="streak-info"><span class="streak-days">連続 <strong>' + d.streak + '</strong> 日継続中！</span>' + (trained ? '<span class="streak-done">✅ 今日のトレーニング完了</span>' : '<span class="streak-todo">📌 今日まだトレーニングしていません</span>') + '</div></div><div class="streak-total">累計 ' + (d.totalDays || d.streak) + ' 日</div>';
  }
}

function checkMilestone(sd) {
  if (!sd) return;
  const shown = sd.shownMilestones || [];
  for (const m of MILESTONES) {
    if (sd.streak >= m && !shown.includes(m)) {
      sd.shownMilestones.push(m); saveStreakData(sd); showCelebration(m, sd.streak); return;
    }
  }
}

function showCelebration(milestone, streak) {
  const emoji = milestone >= 100 ? '👑' : milestone >= 60 ? '🏆' : milestone >= 40 ? '🎖️' : '🥇';
  const title = milestone >= 100 ? '伝説の努力家！' : milestone >= 60 ? '素晴らしい継続力！' : milestone >= 40 ? '驚異的な集中力！' : 'すごい！よく頑張った！';
  const modal = document.createElement('div');
  modal.className = 'celebration-overlay'; modal.id = 'celebrationModal';
  modal.innerHTML = '<div class="celebration-modal slide-up"><div class="celebration-confetti">🎊</div><div class="celebration-emoji">' + emoji + '</div><h2 class="celebration-title">🎉 ' + milestone + '日連続達成！ 🎉</h2><p class="celebration-subtitle">' + title + '</p><div class="celebration-streak"><div class="celebration-days">' + streak + '</div><div class="celebration-label">日連続トレーニング</div></div><button class="celebration-close" onclick="closeCelebration()">閉じる</button></div>';
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}
function closeCelebration() { const m = $('#celebrationModal'); if (m) { m.classList.remove('show'); setTimeout(() => m.remove(), 300); } }

// ====== Audio ======
let currentAudio = null;
function playAudio(grade, rank) {
  const gc = GRADES.find(g => g.key === grade);
  if (!gc) return;
  const url = 'audio/' + gc.audioDir + '/' + rank + '_example.mp3';
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  currentAudio = new Audio(url);
  currentAudio.play().catch(e => console.warn('Audio error:', e));
}

// ====== Data Loading ======
async function loadData() {
  for (const g of GRADES) {
    try {
      const res = await fetch(g.file);
      state.quizData[g.key] = await res.json();
    } catch(e) { console.warn('Failed to load ' + g.file, e); state.quizData[g.key] = []; }
    // ワードリスト読み込み（選択肢の日本語訳用）
    try {
      const wres = await fetch(g.wordlist);
      state.wordlistData[g.key] = await wres.json();
    } catch(e) { console.warn('Failed to load ' + g.wordlist, e); state.wordlistData[g.key] = []; }
  }
}

// ====== 選択肢の意味検索 ======
function lookupMeaning(grade, word) {
  const wl = state.wordlistData[grade] || [];
  const w = word.toLowerCase();
  const entry = wl.find(e => e.english && e.english.toLowerCase() === w);
  return entry ? entry.meanings : null;
}

// ====== Setup ======
function initSetup() {
  const gradeBtns = $('#gradeBtns');
  gradeBtns.innerHTML = GRADES.map(g => {
    const count = (state.quizData[g.key] || []).length;
    return '<button class="grade-btn" data-grade="' + g.key + '">' + g.icon + ' ' + g.label + '<span class="count">' + count + '問</span></button>';
  }).join('');

  gradeBtns.querySelectorAll('.grade-btn').forEach(btn => {
    on(btn, 'click', () => {
      gradeBtns.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.grade = btn.dataset.grade;
      state.idStart = null; state.idEnd = null;
      const s = $('#wordIdStart'); const e = $('#wordIdEnd');
      if (s) s.value = ''; if (e) e.value = '';
      renderMarathonProgress(); updateIdRangeInfo(); updateSummary();
    });
  });

  on($('#questionCount'), 'change', updateSummary);
  on($('#wordIdStart'), 'input', () => { state.idStart = parseInt($('#wordIdStart').value) || null; updateSummary(); });
  on($('#wordIdEnd'), 'input', () => { state.idEnd = parseInt($('#wordIdEnd').value) || null; updateSummary(); });
  on($('#startBtn'), 'click', startQuiz);
  on($('#nextBtn'), 'click', nextQuestion);
  on($('#helpBtn'), 'click', () => { const c = $('#helpContent'); c.classList.toggle('hidden'); });
  updateMistakeBtn();
}

function renderMarathonProgress() {
  const c = $('#marathonProgress'); if (!c || !state.grade) { if(c) c.innerHTML = ''; return; }
  const allQs = state.quizData[state.grade] || [];
  const cleared = getClearedSet(state.grade);
  const clearedCount = [...cleared].filter(id => allQs.some(q => q.id === id)).length;
  const clearPct = allQs.length > 0 ? Math.round(clearedCount / allQs.length * 100) : 0;
  const stats = getStats(state.grade);
  const accPct = stats.totalAttempts > 0 ? Math.round(stats.correctAttempts / stats.totalAttempts * 100) : 0;

  c.innerHTML = '<div class="marathon-bar-group"><div class="marathon-label"><span>🏃 マラソン達成率</span><span class="marathon-value">' + clearedCount + ' / ' + allQs.length + ' (' + clearPct + '%)</span></div><div class="marathon-track"><div class="marathon-fill marathon-fill-clear" style="width:' + clearPct + '%"></div></div></div><div class="marathon-bar-group"><div class="marathon-label"><span>🎯 累計正答率</span><span class="marathon-value">' + (stats.totalAttempts > 0 ? accPct + '%' : '--') + ' (' + stats.correctAttempts + '/' + stats.totalAttempts + ')</span></div><div class="marathon-track"><div class="marathon-fill marathon-fill-acc" style="width:' + accPct + '%"></div></div></div>';
}

function updateIdRangeInfo() {
  const info = $('#wordRangeInfo'); if (!info || !state.grade) { if(info) info.textContent = ''; return; }
  const allQs = state.quizData[state.grade] || [];
  const ranks = allQs.map(q => q.rank);
  if (ranks.length > 0) info.textContent = '(#' + Math.min(...ranks) + '〜#' + Math.max(...ranks) + ')';
}

function getFilteredQuestions() {
  if (!state.grade) return [];
  let qs = state.quizData[state.grade] || [];
  if (state.idStart !== null) qs = qs.filter(q => q.rank >= state.idStart);
  if (state.idEnd !== null) qs = qs.filter(q => q.rank <= state.idEnd);
  return qs;
}

function updateSummary() {
  const box = $('#summary'); if (!box) return;
  const btn = $('#startBtn');
  if (!state.grade) { box.innerHTML = '<p class="summary-hint">級を選択してください</p>'; btn.disabled = true; return; }
  const qs = getFilteredQuestions();
  const n = parseInt($('#questionCount').value) || 0;
  const actual = n === 0 ? qs.length : Math.min(n, qs.length);
  const gc = GRADES.find(g => g.key === state.grade);
  box.innerHTML = '<p class="summary-text">' + gc.icon + ' ' + gc.label + '｜<strong>' + actual + '問</strong>（対象 ' + qs.length + '問中）</p>';
  btn.disabled = actual === 0;
}

function updateMistakeBtn() {
  const btn = $('#mistakeBtn'); if (!btn) return;
  const h = getMistakeHistory();
  btn.style.display = h.length > 0 ? 'block' : 'none';
  btn.textContent = '📝 ミスした問題を復習 (' + h.length + '問)';
  btn.onclick = () => startMistakeReview();
}

// ====== Quiz Start ======
function startQuiz() {
  const qs = getFilteredQuestions();
  const n = parseInt($('#questionCount').value) || 0;
  let pool = [...qs];
  // シャッフル
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  state.questions = n === 0 ? pool : pool.slice(0, n);
  state.current = 0; state.correct = 0; state.wrong = 0; state.mistakes = []; state.answered = false; state.hintStage = 0;
  showScreen('quizScreen');
  renderQuestion();
}

function startMistakeReview() {
  const h = getMistakeHistory();
  if (h.length === 0) return;
  state.grade = h[0].grade;
  state.questions = h.map(m => ({ id: m.id, rank: m.rank, question: m.sentence, questionJa: m.sentence_ja, answer: m.answer, choices: m.choices, meanings: m.meanings, audioKey: m.audioKey }));
  for (let i = state.questions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [state.questions[i], state.questions[j]] = [state.questions[j], state.questions[i]]; }
  state.current = 0; state.correct = 0; state.wrong = 0; state.mistakes = []; state.answered = false; state.hintStage = 0;
  showScreen('quizScreen');
  renderQuestion();
}

// ====== Render Question ======
function renderQuestion() {
  // 前の問題のauto-nextタイマーをクリア
  if (state.autoNextTimer) { clearTimeout(state.autoNextTimer); state.autoNextTimer = null; }

  const q = state.questions[state.current];
  if (!q) return;
  state.answered = false; state.hintStage = 0;

  $('#quizCounter').textContent = (state.current + 1) + ' / ' + state.questions.length;
  $('#scoreCorrect').textContent = '⭕ ' + state.correct;
  $('#scoreWrong').textContent = '❌ ' + state.wrong;
  const pct = ((state.current) / state.questions.length * 100);
  $('#progressFill').style.width = pct + '%';

  $('#questionRank').textContent = '#' + q.rank;
  const meaningStr = Array.isArray(q.meanings) ? q.meanings.join(', ') : (q.meanings || '');
  $('#questionMeaning').textContent = meaningStr;

  // Highlight blank
  const qText = q.question.replace(/_+/g, '<span class="blank">_______</span>');
  $('#questionText').innerHTML = qText;
  $('#questionJa').textContent = q.questionJa || '';
  $('#questionJa').classList.add('hidden');

  // Choices - reshuffle each time
  const shuffled = [...q.choices];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  state.shuffledChoices = shuffled;

  const area = $('#choicesArea');
  area.innerHTML = shuffled.map((c, i) =>
    '<button class="choice-btn" data-choice="' + c + '"><span class="choice-num">' + (i+1) + '</span> ' + c + '</button>'
  ).join('');

  area.querySelectorAll('.choice-btn').forEach(btn => {
    on(btn, 'click', () => handleAnswer(btn.dataset.choice));
  });

  $('#feedbackArea').classList.add('hidden');
  $('#feedbackArea').innerHTML = '<div id="feedbackIcon" class="feedback-icon"></div><div id="feedbackDetails" class="feedback-details"></div>';
  $('#nextBtn').style.display = 'none';
  $('#audioBtn').style.display = 'none';
  $('#hintBtn').style.display = 'inline-flex';
  $('#hintBtn').onclick = showHint;
}

function showHint() {
  state.hintStage++;
  if (state.hintStage >= 1) {
    $('#questionJa').classList.remove('hidden');
    $('#questionJa').classList.add('fade-in');
  }
}

// ====== Handle Answer ======
function handleAnswer(choice) {
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.current];
  const isCorrect = choice.toLowerCase() === q.answer.toLowerCase();

  // Mark buttons
  $$('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.choice === q.answer) btn.classList.add('correct');
    if (btn.dataset.choice === choice && !isCorrect) btn.classList.add('wrong');
  });

  // Feedback
  const fb = $('#feedbackArea'); fb.classList.remove('hidden');
  if (isCorrect) {
    state.correct++;
    $('#feedbackIcon').textContent = '🎉';
    $('#feedbackDetails').innerHTML = '<span class="fb-correct">正解！</span>';
    markCleared(state.grade, q.id);
    removeMistakeFromHistory(q.id);
  } else {
    state.wrong++;
    $('#feedbackIcon').textContent = '😢';
    $('#feedbackDetails').innerHTML = '<span class="fb-wrong">正解: <strong>' + q.answer + '</strong></span>';
    state.mistakes.push({ question: q, yourAnswer: choice });
    addMistakeToHistory(q, state.grade);
  }

  // ===== 採点後の追加表示 =====

  // 1. 問題文の日本語訳を表示
  $('#questionJa').classList.remove('hidden');
  $('#questionJa').classList.add('fade-in');

  // 2. 全選択肢の日本語訳を表示（ボタンと同じシャッフル順序で）
  const choiceMeaningsHtml = (state.shuffledChoices || q.choices).map(c => {
    const meaning = lookupMeaning(state.grade, c);
    const isAnswer = c.toLowerCase() === q.answer.toLowerCase();
    const isYours = c.toLowerCase() === choice.toLowerCase();
    let cls = 'choice-meaning-item';
    if (isAnswer) cls += ' choice-meaning-correct';
    else if (isYours && !isCorrect) cls += ' choice-meaning-wrong';
    return '<div class="' + cls + '"><span class="choice-meaning-word">' + c + '</span>' +
      '<span class="choice-meaning-ja">' + (meaning || '—') + '</span>' +
      (isAnswer ? ' <span class="choice-meaning-badge">✅</span>' : '') +
      '</div>';
  }).join('');

  const meaningSection = document.createElement('div');
  meaningSection.className = 'choice-meanings-box fade-in';
  meaningSection.innerHTML = '<div class="choice-meanings-title">📖 選択肢の意味</div>' + choiceMeaningsHtml;
  fb.appendChild(meaningSection);

  // 3. 音声を自動再生（正解・不正解共通）
  playAudio(state.grade, q.rank);

  recordStats(state.grade, isCorrect);
  const sd = trackAnswer();
  if (sd) checkMilestone(sd);

  $('#scoreCorrect').textContent = '⭕ ' + state.correct;
  $('#scoreWrong').textContent = '❌ ' + state.wrong;
  $('#nextBtn').style.display = 'inline-flex';
  $('#audioBtn').style.display = 'inline-flex';
  $('#audioBtn').onclick = () => playAudio(state.grade, q.rank);
  $('#hintBtn').style.display = 'none';

  // 「次の問題」ボタンを押すまで進まない（自動送りなし）
}

// ====== Next Question ======
function nextQuestion() {
  state.current++;
  if (state.current >= state.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

// ====== Results ======
function showResults() {
  showScreen('resultScreen');
  const total = state.correct + state.wrong;
  const pct = total > 0 ? Math.round(state.correct / total * 100) : 0;
  $('#scorePct').textContent = pct;
  $('#resultCorrect').textContent = state.correct;
  $('#resultWrong').textContent = state.wrong;
  $('#resultTotal').textContent = total;

  const circle = $('#scoreCircle');
  if (pct >= 80) circle.className = 'score-circle excellent';
  else if (pct >= 60) circle.className = 'score-circle good';
  else circle.className = 'score-circle needs-work';

  // Mistakes list
  const mc = $('#resultMistakes');
  if (state.mistakes.length > 0) {
    mc.innerHTML = '<h3 class="mistakes-title">❌ 間違えた問題</h3>' + state.mistakes.map(m => {
      const q = m.question;
      return '<div class="mistake-item glass-card"><p class="mistake-q">' + q.question + '</p><p class="mistake-ans">正解: <strong>' + q.answer + '</strong> ／ あなた: <span class="wrong-ans">' + m.yourAnswer + '</span></p></div>';
    }).join('');
  } else {
    mc.innerHTML = '<div class="perfect-score glass-card"><p>🎉 全問正解！素晴らしい！</p></div>';
  }

  on($('#retryBtn'), 'click', () => startQuiz());
  on($('#homeBtn'), 'click', () => { showScreen('setupScreen'); renderStreakBadge(); renderMarathonProgress(); updateMistakeBtn(); });

  renderMarathonProgress();
}

// ====== Screen Management ======
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo(0, 0);
}

// ====== Init ======
async function init() {
  await loadData();
  initSetup();
  renderStreakBadge();
}

document.addEventListener('DOMContentLoaded', init);
