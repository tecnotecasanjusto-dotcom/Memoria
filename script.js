const startScreen = document.getElementById('startScreen');
const gameShell = document.getElementById('gameShell');
const boardElement = document.getElementById('board');
const scoreElement = document.getElementById('score');
const movesElement = document.getElementById('moves');
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playerNameInput = document.getElementById('playerName');
const rankingList = document.getElementById('rankingListStart');

const rankingStorageKey = 'memory-cine-ranking';
const movieFiles = [
  'Anabel.jpg',
  'Avatar.jpg',
  'ElCaballero.jpg',
  'Hobbit.jpg',
  'It.jpg',
  'Odisea.jpg',
  'padrino.jpg',
  'SeñorA.jpg',
  'STAR.jpg',
  'TIntin.jpg',
  'TopGun.jpg',
  'Venom.jpg'
];

let score = 0;
let moves = 0;
let flippedCards = [];
let lockBoard = false;
let gameStarted = false;
let timerId = null;
let elapsedSeconds = 0;
let currentPlayer = 'Jugador';

function shuffle(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  timerElement.textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function loadRanking() {
  const raw = localStorage.getItem(rankingStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveRankingEntry(name, time, points = 0) {
  const ranking = loadRanking();
  ranking.push({ name, time, points });
  ranking.sort((a, b) => a.time - b.time || b.points - a.points);
  const topRanking = ranking.slice(0, 6);
  localStorage.setItem(rankingStorageKey, JSON.stringify(topRanking));
  renderRanking();
}

function renderRanking() {
  if (!rankingList) return;

  const entries = loadRanking();
  const content = entries.length
    ? entries
        .map((entry, index) => `
          <li>
            <span>${index + 1}. ${entry.name}</span>
            <span>${entry.points ?? 0} pts</span>
            <span>${formatTime(entry.time)}</span>
          </li>
        `)
        .join('')
    : '<li><span>Sin resultados</span><span>0 pts</span><span>--:--</span></li>';

  rankingList.innerHTML = content;
}

function buildCards() {
  const selectedMovies = shuffle([...movieFiles]);
  const cardData = shuffle(
    selectedMovies.flatMap((movie) => [
      { movie, id: `${movie}-a` },
      { movie, id: `${movie}-b` }
    ])
  );

  return cardData.map((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.movie = item.movie;
    card.dataset.id = item.id;
    card.setAttribute('aria-label', 'Carta de memoria');

    const imagePath = `./Peliculas/${item.movie}`;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front"></div>
        <div class="card-face card-back" style="background-image: url('${imagePath}')"></div>
      </div>
    `;

    card.addEventListener('click', () => handleCardClick(card));
    return card;
  });
}

function updateStats() {
  scoreElement.textContent = String(score);
  movesElement.textContent = String(moves);
}

function showMessage(text, isSuccess = false) {
  messageElement.textContent = text;
  messageElement.style.color = isSuccess ? '#b8ef68' : '#d9e4ee';
}

function playSound(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const audioContext = new AudioCtx();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const settings = {
    flip: { frequency: 440, duration: 0.12, volume: 0.05, type: 'triangle' },
    match: { frequency: 660, duration: 0.18, volume: 0.07, type: 'sine' },
    miss: { frequency: 220, duration: 0.2, volume: 0.04, type: 'square' },
    win: { frequency: 780, duration: 0.5, volume: 0.08, type: 'triangle' }
  };

  const config = settings[type];
  oscillator.type = config.type;
  oscillator.frequency.value = config.frequency;
  gainNode.gain.value = config.volume;

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + config.duration);
  oscillator.stop(audioContext.currentTime + config.duration);

  setTimeout(() => audioContext.close(), config.duration * 1000 + 80);
}

function handleCardClick(card) {
  if (!gameStarted || lockBoard) return;
  if (card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;

  playSound('flip');
  card.classList.add('is-flipped');
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    lockBoard = true;
    moves += 1;
    updateStats();

    const [firstCard, secondCard] = flippedCards;
    const isMatch = firstCard.dataset.movie === secondCard.dataset.movie;

    if (isMatch) {
      setTimeout(() => {
        firstCard.classList.add('is-matched');
        secondCard.classList.add('is-matched');
        playSound('match');
        score += 1;
        updateStats();
        showMessage('¡Pareja encontrada!');
        flippedCards = [];
        lockBoard = false;

        if (score === movieFiles.length) {
          stopTimer();
          saveRankingEntry(currentPlayer, elapsedSeconds, score);
          playSound('win');
          showMessage(`${currentPlayer} ganó en ${formatTime(elapsedSeconds)}.`, true);

          setTimeout(() => {
            startScreen.classList.remove('hidden');
            gameShell.classList.add('hidden');
            renderRanking();
          }, 1000);
        }
      }, 350);
    } else {
      setTimeout(() => {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        playSound('miss');
        showMessage('No coincide, intenta otra vez.');
        flippedCards = [];
        lockBoard = false;
      }, 800);
    }
  }
}

function resetGame() {
  boardElement.innerHTML = '';
  boardElement.append(...buildCards());
  score = 0;
  moves = 0;
  flippedCards = [];
  lockBoard = false;
  gameStarted = true;
  elapsedSeconds = 0;
  currentPlayer = (playerNameInput.value || 'Jugador').trim() || 'Jugador';
  updateStats();
  updateTimer();
  startTimer();
  showMessage('Gira las cartas y encuentra los pares.');
}

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  gameShell.classList.remove('hidden');
  playSound('flip');
  resetGame();
});

restartBtn.addEventListener('click', () => {
  playSound('flip');
  resetGame();
});

renderRanking();
