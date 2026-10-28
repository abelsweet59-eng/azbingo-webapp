const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.setHeaderColor('#0f0a1e');
  tg.setBackgroundColor('#0f0a1e');
  tg.ready();
}

// ===== CONFIG =====
const CARD_PRICE = 10;        // ለእያንዳንዱ ካርቴላ 10 ብር
const MAX_CARDS = 2;          // ከፍተኛ 2 ካርቴላ
const NUMBER_RANGE = 300;     // 1-300 ቁጥሮች

// ===== STATE =====
const state = {
  user: null,
  mainWallet: 0,
  playWallet: 0,
  selectedNumbers: [],        // የተመረጡ ቁጥሮች (ከ1-300)
  takenNumbers: new Set(),    // በሌሎች የተያዙ ቁጥሮች
  cards: [],                  // የተጫዋቹ ካርቴላዎች (ከ2 አይበልጥ)
  calledNumbers: [],
  markedNumbers: new Map(),   // cardIndex -> Set of marked
  gameId: null,
  pickTimer: null,
  pickSeconds: 60,
  playerCount: 0
};

const $ = (id) => document.getElementById(id);

// ===== TOAST =====
function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast ' + type, 2500);
}

// ===== SCREEN =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== WALLET =====
function updateWallets(main, play) {
  state.mainWallet = main;
  state.playWallet = play;
  $('mainWallet').textContent = main.toFixed(2);
  $('playWallet').textContent = play.toFixed(2);
  $('mainWalletDetail').textContent = main.toFixed(2) + ' ብር';
  $('playWalletDetail').textContent = play.toFixed(2) + ' ብር';
}

// ===== NUMBER GRID =====
function renderNumberGrid() {
  const grid = $('numberGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= NUMBER_RANGE; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.dataset.num = i;
    btn.onclick = () => toggleNumber(i, btn);
    if (state.takenNumbers.has(i)) {
      btn.classList.add('taken');
      btn.disabled = true;
    }
    grid.appendChild(btn);
  }
}

function refreshGrid() {
  document.querySelectorAll('#numberGrid button').forEach(btn => {
    const n = parseInt(btn.dataset.num);
    btn.classList.toggle('taken', state.takenNumbers.has(n));
    btn.disabled = state.takenNumbers.has(n);
    btn.classList.toggle('selected', state.selectedNumbers.includes(n));
  });
}

function toggleNumber(n, btn) {
  // የተያዘ ከሆነ አትፍቀድ
  if (state.takenNumbers.has(n)) {
    showToast('ይህ ቁጥር ተይዟል!', 'error');
    return;
  }

  // ቀድሞ ከተመረጠ → አጥፋ
  if (state.selectedNumbers.includes(n)) {
    state.selectedNumbers = state.selectedNumbers.filter(x => x !== n);
    btn.classList.remove('selected');
  } else {
    // ከ2 በላይ አይፍቀድ
    if (state.selectedNumbers.length >= MAX_CARDS) {
      showToast(`ከ ${MAX_CARDS} ካርቴላ በላይ አይፈቀድም!`, 'error');
      return;
    }
    state.selectedNumbers.push(n);
    btn.classList.add('selected');
    // Live: አሁን ይያዘ (ሌሎች እንዳያዩ)
    state.takenNumbers.add(n);
    updateLiveCount();
  }

  updatePills();
}

function updatePills() {
  $('pill1').textContent = state.selectedNumbers[0] || '-';
  $('pill1').classList.toggle('filled', !!state.selectedNumbers[0]);
  $('pill2').textContent = state.selectedNumbers[1] || '-';
  $('pill2').classList.toggle('filled', !!state.selectedNumbers[1]);

  const totalCost = state.selectedNumbers.length * CARD_PRICE;
  $('btnConfirmNumbers').textContent = 
    `✅ አረጋግጥ (${state.selectedNumbers.length} × ${CARD_PRICE} = ${totalCost} ብር)`;
  $('btnConfirmNumbers').disabled = state.selectedNumbers.length === 0;
}

function updateLiveCount() {
  const total = state.takenNumbers.size;
  const el = $('liveCount');
  if (el) el.textContent = total;
}

// ===== TIMER =====
function startPickTimer(seconds) {
  clearInterval(state.pickTimer);
  state.pickSeconds = seconds;
  $('pickTimer').textContent = seconds;
  state.pickTimer = setInterval(() => {
    state.pickSeconds--;
    $('pickTimer').textContent = Math.max(0, state.pickSeconds);
    if (state.pickSeconds <= 0) {
      clearInterval(state.pickTimer);
      // የተመረጡትን ነጻ አድርግ
      state.selectedNumbers.forEach(n => state.takenNumbers.delete(n));
      state.selectedNumbers = [];
      showToast('ጊዜ አልቋል!', 'error');
      showScreen('screen-home');
    }
  }, 1000);
}

// ===== CONFIRM =====
function confirmNumbers() {
  if (state.selectedNumbers.length === 0) return;

  const totalCost = state.selectedNumbers.length * CARD_PRICE;

  // ወለት ማረጋገጥ
  if (state.playWallet < totalCost) {
    showToast(`Play Wallet በቂ አይደለም! ያለህ: ${state.playWallet.toFixed(2)} ብር`, 'error');
    return;
  }

  // ወለት ቀንስ
  updateWallets(state.mainWallet, state.playWallet - totalCost);

  // ካርቴላዎችን ፍጠር
  state.cards = state.selectedNumbers.map(n => makeCardFromNumber(n));
  state.gameId = 'demo-' + Date.now();

  // የጨዋታ ሁኔታ አዘጋጅ
  state.calledNumbers = [];
  state.markedNumbers = new Map();
  state.cards.forEach((_, i) => state.markedNumbers.set(i, new Set()));

  // Demo: 15 ቁጥሮች ተጠርተዋል
  const pool = [];
  for (let i = 1; i <= 75; i++) pool.push(i);
  pool.sort(() => Math.random() - 0.5);
  state.calledNumbers = pool.slice(0, 15);

  state.playerCount = Math.floor(Math.random() * 50) + 10;
  $('playerCount').textContent = state.playerCount;

  clearInterval(state.pickTimer);
  showScreen('screen-game');
  renderBingoCards();
  renderCalledStrip();
}

// ===== CARD GENERATION =====
function makeCardFromNumber(seed) {
  // ከሴድ (የተመረጠ ቁጥር) ተነስቶ ተመሳሳይ ካርድ ይፈጥራል
  const rng = mulberry32(seed);
  const card = [];
  const used = new Set();
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) { row.push('FREE'); continue; }
      let n;
      do { n = Math.floor(rng() * 75) + 1; } while (used.has(n));
      used.add(n);
      row.push(n);
    }
    card.push(row);
  }
  return card;
}

// Seeded random (ለተመሳሳይ ካርድ)
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ===== BINGO CARDS RENDER =====
function renderBingoCards() {
  const container = $('bingoCardsContainer');
  container.innerHTML = '';
  
  state.cards.forEach((card, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'bingo-card-wrapper';
    
    const label = document.createElement('div');
    label.className = 'card-label';
    label.textContent = `ካርቴላ ${idx + 1}`;
    wrapper.appendChild(label);

    const cardEl = document.createElement('div');
    cardEl.className = 'bingo-card';
    cardEl.dataset.cardIdx = idx;

    card.forEach(row => {
      row.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.textContent = val;
        cell.dataset.num = val;
        cell.dataset.cardIdx = idx;

        if (val === 'FREE') {
          cell.classList.add('free', 'marked');
        } else {
          cell.onclick = () => toggleMark(idx, val, cell);
          if (state.calledNumbers.includes(val)) cell.classList.add('called');
        }
        cardEl.appendChild(cell);
      });
    });

    wrapper.appendChild(cardEl);
    container.appendChild(wrapper);
  });

  $('lastCalled').textContent = state.calledNumbers[state.calledNumbers.length - 1] || '-';
}

// ===== MARKING =====
function toggleMark(cardIdx, n, cell) {
  if (!state.calledNumbers.includes(n)) {
    showToast('ይህ ቁጥር አልተጠራም', 'error');
    return;
  }
  const markedSet = state.markedNumbers.get(cardIdx);
  if (markedSet.has(n)) {
    markedSet.delete(n);
    cell.classList.remove('marked');
  } else {
    markedSet.add(n);
    cell.classList.add('marked');
  }
}

// ===== CALLED STRIP =====
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

// ===== CLAIM BINGO =====
function claimBingo() {
  // ሁሉንም ካርቴላዎች አረጋግጥ
  let winner = false;
  for (let idx = 0; idx < state.cards.length; idx++) {
    if (checkBingo(state.cards[idx], state.markedNumbers.get(idx))) {
      winner = true;
      break;
    }
  }
  if (winner) {
    showToast('🎉 BINGO! አሸንፈሃል!', 'success');
    $('winnerName').textContent = state.user?.first_name || 'አንተ';
    setTimeout(() => showScreen('screen-home'), 3000);
  } else {
    showToast('❌ Bingo አልሆነም — 5 በመስመር ማጠናቀቅ አለብህ', 'error');
  }
}

function checkBingo(card, marked) {
  // ረድፍ
  for (let r = 0; r < 5; r++) {
    if ([0,1,2,3,4].every(c => card[r][c] === 'FREE' || marked.has(card[r][c]))) return true;
  }
  // አምድ
  for (let c = 0; c < 5; c++) {
    if ([0,1,2,3,4].every(r => card[r][c] === 'FREE' || marked.has(card[r][c]))) return true;
  }
  // አግዳሚ
  if ([0,1,2,3,4].every(i => card[i][i] === 'FREE' || marked.has(card[i][i]))) return true;
  if ([0,1,2,3,4].every(i => card[i][4-i] === 'FREE' || marked.has(card[i][4-i]))) return true;
  // አራቱ ማእዘናት
  const corners = [card[0][0], card[0][4], card[4][0], card[4][4]];
  if (corners.every(v => v === 'FREE' || marked.has(v))) return true;
  return false;
}

// ===== INIT =====
function init() {
  state.user = tg?.initDataUnsafe?.user || { first_name: 'Guest' };
  
  // ወለት (ዴሞ)
  updateWallets(0, 100);
  
  renderNumberGrid();
  updatePills();

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

  // Stake
  document.querySelectorAll('.stake-card').forEach(b => {
    b.onclick = () => {
      showScreen('screen-numbers');
      startPickTimer(60);
    };
  });

  $('btnConfirmNumbers').onclick = confirmNumbers;
  $('btnBingo').onclick = claimBingo;

  // Deposit
  document.querySelectorAll('.amount-options button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.amount-options button').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      $('depositAmount').value = b.dataset.amt;
    };
  });
  $('btnConfirmDeposit').onclick = () => showToast('የክፍያ ስርዓት በቅርቡ!', 'error');
}

init();
