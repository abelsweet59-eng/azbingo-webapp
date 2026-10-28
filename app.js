const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.setHeaderColor('#0f0a1e');
  tg.setBackgroundColor('#0f0a1e');
  tg.ready();
}

const state = {
  user: null,
  mainWallet: 0,
  playWallet: 0,
  selectedNumbers: [],
  selectedStake: 10,
  card: null,
  calledNumbers: [],
  markedNumbers: new Set(),
  gameId: null,
  pickTimer: null,
  pickSeconds: 60,
  playerCount: 0,
  pollInterval: null
};

const $ = (id) => document.getElementById(id);

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast ' + type, 2500);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

async function api(path, data = {}) {
  try {
    const res = await fetch(CONFIG.BOT_API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg?.initData || '', ...data })
    });
    return await res.json();
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'ኔትወርክ ችግር' };
  }
}

function updateWallets(main, play) {
  state.mainWallet = main;
  state.playWallet = play;
  $('mainWallet').textContent = main.toFixed(2);
  $('playWallet').textContent = play.toFixed(2);
  $('mainWalletDetail').textContent = main.toFixed(2) + ' ብር';
  $('playWalletDetail').textContent = play.toFixed(2) + ' ብር';
}

// ===== INIT =====
function init() {
  state.user = tg?.initDataUnsafe?.user || { first_name: 'Guest' };
  renderNumberGrid();

  // Navigation
  document.querySelectorAll('[data-back]').forEach(b => {
    b.onclick = () => showScreen('screen-home');
  });
  document.querySelectorAll('[data-action]').forEach(b => {
    b.onclick = () => {
      const a = b.dataset.action;
      if (a === 'play') showScreen('screen-stake');
      else if (a === 'wallet' || a === 'deposit') showScreen('screen-wallet');
      else showToast('በቅርቡ!');
    };
  });
  $('btnRegister').onclick = () => showScreen('screen-stake');
  $('btnWalletHome').onclick = () => showScreen('screen-wallet');
  $('btnDeposit').onclick = () => showScreen('screen-wallet');

  // Stake selection
  document.querySelectorAll('.stake-card').forEach(b => {
    b.onclick = () => {
      state.selectedStake = parseInt(b.dataset.stake);
      showScreen('screen-numbers');
      startPickTimer(60);
    };
  });

  // Confirm numbers
  $('btnConfirmNumbers').onclick = confirmNumbers;

  // Bingo button
  $('btnBingo').onclick = claimBingo;

  // Deposit amount options
  document.querySelectorAll('.amount-options button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.amount-options button').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      $('depositAmount').value = b.dataset.amt;
    };
  });
  $('btnConfirmDeposit').onclick = () => {
    showToast('የክፍያ ስርዓት በቅርቡ!', 'error');
  };
}

// ===== NUMBER PICKER =====
function renderNumberGrid() {
  const grid = $('numberGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 300; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.dataset.num = i;
    btn.onclick = () => toggleNumber(i, btn);
    grid.appendChild(btn);
  }
}

function toggleNumber(n, btn) {
  if (state.selectedNumbers.includes(n)) {
    state.selectedNumbers = state.selectedNumbers.filter(x => x !== n);
    btn.classList.remove('selected');
  } else {
    if (state.selectedNumbers.length >= 2) {
      showToast('2 ቁጥር ብቻ!', 'error');
      return;
    }
    state.selectedNumbers.push(n);
    btn.classList.add('selected');
  }
  $('pill1').textContent = state.selectedNumbers[0] || '-';
  $('pill1').classList.toggle('filled', !!state.selectedNumbers[0]);
  $('pill2').textContent = state.selectedNumbers[1] || '-';
  $('pill2').classList.toggle('filled', !!state.selectedNumbers[1]);
  $('btnConfirmNumbers').disabled = state.selectedNumbers.length !== 2;
}

function startPickTimer(seconds) {
  clearInterval(state.pickTimer);
  state.pickSeconds = seconds;
  $('pickTimer').textContent = seconds;
  state.pickTimer = setInterval(() => {
    state.pickSeconds--;
    $('pickTimer').textContent = Math.max(0, state.pickSeconds);
    if (state.pickSeconds <= 0) {
      clearInterval(state.pickTimer);
      showToast('ጊዜ አልቋል!', 'error');
      showScreen('screen-home');
    }
  }, 1000);
}

function confirmNumbers() {
  // Local demo — no server yet
  state.card = makeDemoCard();
  state.gameId = 'demo-' + Date.now();
  clearInterval(state.pickTimer);

  // Simulate called numbers (10 random for demo)
  state.calledNumbers = [];
  const pool = [];
  for (let i = 1; i <= 75; i++) pool.push(i);
  pool.sort(() => Math.random() - 0.5);
  state.calledNumbers = pool.slice(0, 15);

  state.playerCount = Math.floor(Math.random() * 50) + 10;
  $('playerCount').textContent = state.playerCount;

  showScreen('screen-game');
  renderBingoCard();
  renderCalledStrip();
}

function makeDemoCard() {
  const card = [];
  const used = new Set();
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) { row.push('FREE'); continue; }
      let n;
      do { n = Math.floor(Math.random() * 75) + 1; } while (used.has(n));
      used.add(n);
      row.push(n);
    }
    card.push(row);
  }
  return card;
}

// ===== BINGO CARD =====
function renderBingoCard() {
  const el = $('bingoCard');
  el.innerHTML = '';
  if (!state.card) return;
  state.card.forEach(row => {
    row.forEach(val => {
      const cell = document.createElement('div');
      cell.className = 'bingo-cell';
      cell.textContent = val;
      cell.dataset.num = val;
      if (val === 'FREE') {
        cell.classList.add('free', 'marked');
      } else {
        cell.onclick = () => toggleMark(val, cell);
        if (state.calledNumbers.includes(val)) cell.classList.add('called');
      }
      el.appendChild(cell);
    });
  });
  $('lastCalled').textContent = state.calledNumbers[state.calledNumbers.length - 1] || '-';
}

function renderCalledStrip() {
  const strip = $('calledStrip');
  strip.innerHTML = '';
  state.calledNumbers.forEach((n, i) => {
    const s = document.createElement('span');
    s.textContent = n;
    if (i === state.calledNumbers.length - 1) s.classList.add('latest');
    strip.appendChild(s);
  });
}

function toggleMark(n, cell) {
  if (!state.calledNumbers.includes(n)) {
    showToast('ይህ ቁጥር አልተጠራም', 'error');
    return;
  }
  if (state.markedNumbers.has(n)) {
    state.markedNumbers.delete(n);
    cell.classList.remove('marked');
  } else {
    state.markedNumbers.add(n);
    cell.classList.add('marked');
  }
}

function claimBingo() {
  showToast('🎉 BINGO! (ዴሞ)', 'success');
  $('winnerName').textContent = state.user?.first_name || 'አንተ';
  setTimeout(() => showScreen('screen-home'), 3000);
}

// ===== START =====
init();
