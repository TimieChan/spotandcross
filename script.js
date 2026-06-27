const TOTAL_NUMBERS = 99;
const GRID_SIZE = 144;

const game = {
  started: false,
  phase: "idle",
  round: 0,
  chooser: 1,
  finder: 2,
  selectedNumber: null,
  startTime: 0,
  timerInterval: null,
  muted: false,
  audioCtx: null,
  findTimes: [],
  crossed: {
    1: new Set(),
    2: new Set()
  }
};

const els = {
  roundInfo: document.getElementById("roundInfo"),
  instruction: document.getElementById("instruction"),
  countdown: document.getElementById("countdown"),
  timer: document.getElementById("timer"),
  numberSheet: document.getElementById("numberSheet"),
  activeGrid: document.getElementById("activeGrid"),
  gridSide: document.getElementById("gridSide"),
  gridTitle: document.getElementById("gridTitle"),
  gridSubtitle: document.getElementById("gridSubtitle"),
  p1Score: document.getElementById("p1Score"),
  p2Score: document.getElementById("p2Score"),
  startBtn: document.getElementById("startBtn"),
  newBtn: document.getElementById("newBtn"),
  muteBtn: document.getElementById("muteBtn"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalText: document.getElementById("modalText"),
  modalBtn: document.getElementById("modalBtn"),
  victoryScreen: document.getElementById("victoryScreen"),
  winnerText: document.getElementById("winnerText"),
  totalRounds: document.getElementById("totalRounds"),
  fastestTime: document.getElementById("fastestTime"),
  averageTime: document.getElementById("averageTime"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  confettiLayer: document.getElementById("confettiLayer")
};

window.addEventListener("load", init);

function init() {
  buildActiveGrid();
  requestAnimationFrame(() => {
    reshuffleNumberSheet();
    updateUI();
  });

  els.startBtn.addEventListener("click", startGame);
  els.newBtn.addEventListener("click", resetGame);
  els.playAgainBtn.addEventListener("click", resetGame);
  els.muteBtn.addEventListener("click", toggleMute);

  document.addEventListener("touchmove", event => {
    event.preventDefault();
  }, { passive: false });
}

function buildActiveGrid() {
  els.activeGrid.innerHTML = "";

  for (let i = 0; i < GRID_SIZE; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("aria-label", `Grid box ${i + 1}`);

    cell.addEventListener("pointerdown", event => {
      event.preventDefault();
      crossActiveCell(i);
    });

    els.activeGrid.appendChild(cell);
  }

  refreshActiveGrid();
}

function refreshActiveGrid() {
  const player = game.chooser;

  Array.from(els.activeGrid.children).forEach((cell, index) => {
    cell.classList.toggle("crossed", game.crossed[player].has(index));
  });
}

function flashGridPanel() {
  els.gridSide.classList.remove("flashIn");
  void els.gridSide.offsetWidth;
  els.gridSide.classList.add("flashIn");
}

function crossActiveCell(index) {
  if (game.phase !== "hunt") return;

  const player = game.chooser;

  if (game.crossed[player].has(index)) return;

  game.crossed[player].add(index);
  playBeep(520, 0.035);
  refreshActiveGrid();
  updateUI();

  if (game.crossed[player].size >= GRID_SIZE) {
    endGame(player);
  }
}

function reshuffleNumberSheet() {
  els.numberSheet.innerHTML = "";

  const rect = els.numberSheet.getBoundingClientRect();
  const sheetWidth = Math.max(250, Math.floor(rect.width));
  const sheetHeight = Math.max(250, Math.floor(rect.height));
  const area = sheetWidth * sheetHeight;

  let numberSize = 40;
  if (area < 260000) numberSize = 30;
  else if (area < 430000) numberSize = 34;
  else numberSize = 38;

  const numberFont = numberSize <= 30 ? "0.72rem" : numberSize <= 34 ? "0.82rem" : "0.95rem";
  const padding = 7;
  const placed = [];

  els.numberSheet.style.setProperty("--numSize", `${numberSize}px`);
  els.numberSheet.style.setProperty("--numFont", numberFont);

  for (let number = 1; number <= TOTAL_NUMBERS; number++) {
    const pos = getNonOverlappingPosition(placed, sheetWidth, sheetHeight, numberSize, padding);
    placed.push(pos);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "numberBtn";
    btn.textContent = number;
    btn.dataset.number = number;
    btn.style.left = `${pos.x}px`;
    btn.style.top = `${pos.y}px`;

    const rotation = rand(-18, 18);
    btn.style.setProperty("--rot", `${rotation}deg`);
    btn.style.background = randomStickerColour();

    btn.addEventListener("click", () => handleNumberTap(btn, number));

    els.numberSheet.appendChild(btn);
  }
}

function getNonOverlappingPosition(placed, width, height, size, padding) {
  let minGap = size * 1.02;

  for (let tries = 0; tries < 2600; tries++) {
    const x = rand(padding, Math.max(padding, width - size - padding));
    const y = rand(padding, Math.max(padding, height - size - padding));

    const overlaps = placed.some(p => Math.hypot(p.x - x, p.y - y) < minGap);
    if (!overlaps) return { x, y };

    if (tries === 1000) minGap = size * 0.94;
    if (tries === 1800) minGap = size * 0.86;
  }

  return {
    x: rand(padding, Math.max(padding, width - size - padding)),
    y: rand(padding, Math.max(padding, height - size - padding))
  };
}

function handleNumberTap(btn, number) {
  if (game.phase === "choose") {
    game.selectedNumber = number;
    showChooserConfirmation();
    return;
  }

  if (game.phase !== "hunt") return;

  if (number === game.selectedNumber) {
    btn.classList.add("correct");
    playBeep(900, 0.14);
    setTimeout(endRound, 220);
  } else {
    btn.classList.remove("wrong");
    void btn.offsetWidth;
    btn.classList.add("wrong");
    playBeep(170, 0.08);
    setTimeout(() => btn.classList.remove("wrong"), 430);
  }
}

function startGame() {
  if (game.started) return;

  unlockAudio();

  game.started = true;
  game.round = 0;
  game.chooser = 1;
  game.finder = 2;
  game.findTimes = [];
  game.crossed[1].clear();
  game.crossed[2].clear();

  buildActiveGrid();
  updateUI();
  startRound();
}

function startRound() {
  game.round++;
  game.phase = "choose";
  game.selectedNumber = null;

  clearTimer();
  els.timer.textContent = "0.0s";
  els.countdown.textContent = "";
  els.instruction.textContent = `Player ${game.chooser}, secretly choose a number.`;
  clearNumberFeedback();

  refreshActiveGrid();
  flashGridPanel();
  updateUI();
}

function showChooserConfirmation() {
  game.phase = "confirm";
  updateUI();

  els.modalTitle.textContent = `Nice choice, Player ${game.chooser}!`;
  els.modalText.textContent = `You selected number ${game.selectedNumber}. Keep it secret, then pass the device to Player ${game.finder}.`;
  els.modalBtn.textContent = `Player ${game.finder} is ready!`;
  els.modal.classList.remove("hidden");

  els.modalBtn.onclick = () => {
    els.modal.classList.add("hidden");
    startCountdown();
  };
}

function startCountdown() {
  game.phase = "countdown";
  updateUI();

  const sequence = ["3", "2", "1", "GO!"];
  let index = 0;

  els.instruction.textContent = `Ready! Player ${game.finder} finds. Player ${game.chooser} crosses.`;

  function next() {
    els.countdown.textContent = sequence[index];
    els.countdown.style.animation = "none";
    void els.countdown.offsetWidth;
    els.countdown.style.animation = "pop 0.42s ease";

    playBeep(index === sequence.length - 1 ? 780 : 420, 0.08);
    index++;

    if (index < sequence.length) {
      setTimeout(next, 700);
    } else {
      setTimeout(beginHunt, 480);
    }
  }

  next();
}

function beginHunt() {
  game.phase = "hunt";
  game.startTime = performance.now();

  els.countdown.textContent = "GO!";
  els.instruction.textContent = `Player ${game.finder}, find it! Player ${game.chooser}, cross the grid!`;

  refreshActiveGrid();
  flashGridPanel();

  game.timerInterval = setInterval(() => {
    const elapsed = (performance.now() - game.startTime) / 1000;
    els.timer.textContent = `${elapsed.toFixed(1)}s`;
  }, 100);

  updateUI();
}

function endRound() {
  if (game.phase !== "hunt") return;

  const elapsed = (performance.now() - game.startTime) / 1000;
  game.findTimes.push(elapsed);

  clearTimer();
  game.phase = "between";

  els.timer.textContent = `${elapsed.toFixed(1)}s`;
  els.instruction.textContent = `Great find! Player ${game.finder} found it in ${elapsed.toFixed(1)}s. Switching!`;
  updateUI();

  setTimeout(() => {
    [game.chooser, game.finder] = [game.finder, game.chooser];
    startRound();
  }, 1400);
}

function endGame(winner) {
  if (game.phase === "victory") return;

  clearTimer();
  game.phase = "victory";

  const fastest = game.findTimes.length ? Math.min(...game.findTimes) : 0;
  const average = game.findTimes.length
    ? game.findTimes.reduce((sum, time) => sum + time, 0) / game.findTimes.length
    : 0;

  els.winnerText.textContent = `🎉 Player ${winner} Wins!`;
  els.totalRounds.textContent = `Total rounds played: ${game.round}`;
  els.fastestTime.textContent = `Fastest find time: ${fastest.toFixed(1)}s`;
  els.averageTime.textContent = `Average find time: ${average.toFixed(1)}s`;
  els.victoryScreen.classList.remove("hidden");

  launchConfetti();
  playBeep(920, 0.18);
  updateUI();
}

function resetGame() {
  clearTimer();

  game.started = false;
  game.phase = "idle";
  game.round = 0;
  game.chooser = 1;
  game.finder = 2;
  game.selectedNumber = null;
  game.findTimes = [];
  game.crossed[1].clear();
  game.crossed[2].clear();

  els.modal.classList.add("hidden");
  els.victoryScreen.classList.add("hidden");
  els.countdown.textContent = "";
  els.timer.textContent = "0.0s";
  els.instruction.textContent = "Tap Start Game to begin!";

  buildActiveGrid();
  reshuffleNumberSheet();
  updateUI();
}

function updateUI() {
  els.roundInfo.textContent = `Round ${game.round}`;
  els.p1Score.textContent = `💙 Player 1: ${game.crossed[1].size} / 144`;
  els.p2Score.textContent = `🧡 Player 2: ${game.crossed[2].size} / 144`;

  els.startBtn.disabled = game.started;

  els.gridSide.classList.toggle("p1Active", game.chooser === 1);
  els.gridSide.classList.toggle("p2Active", game.chooser === 2);

  if (game.phase === "hunt") {
    els.gridTitle.textContent = `Player ${game.chooser}'s Grid`;
    els.gridSubtitle.textContent = `Crossed: ${game.crossed[game.chooser].size} / 144`;
  } else if (game.phase === "choose" || game.phase === "confirm" || game.phase === "countdown") {
    els.gridTitle.textContent = `Player ${game.chooser}'s Grid`;
    els.gridSubtitle.textContent = `Saved: ${game.crossed[game.chooser].size} / 144`;
  } else {
    els.gridTitle.textContent = "Crossing Grid";
    els.gridSubtitle.textContent = "Active player appears here.";
  }
}

function clearTimer() {
  if (game.timerInterval) clearInterval(game.timerInterval);
  game.timerInterval = null;
}

function clearNumberFeedback() {
  document.querySelectorAll(".numberBtn").forEach(btn => {
    btn.classList.remove("correct", "wrong");
  });
}

function toggleMute() {
  game.muted = !game.muted;
  els.muteBtn.textContent = game.muted ? "🔇 Muted" : "🔊 Sound";
}

function unlockAudio() {
  if (game.audioCtx) return;

  try {
    game.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    game.audioCtx = null;
  }
}

function playBeep(freq, duration) {
  if (game.muted || !game.audioCtx) return;

  try {
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();

    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.045;

    osc.connect(gain);
    gain.connect(game.audioCtx.destination);

    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  } catch {
    // Sound is optional.
  }
}

function launchConfetti() {
  els.confettiLayer.innerHTML = "";
  const colours = ["#ff006e", "#8338ec", "#3a86ff", "#ffbe0b", "#06d6a0", "#fb5607"];

  for (let i = 0; i < 110; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[Math.floor(Math.random() * colours.length)];
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.transform = `rotate(${rand(0, 360)}deg)`;
    els.confettiLayer.appendChild(piece);
  }

  setTimeout(() => {
    els.confettiLayer.innerHTML = "";
  }, 3600);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomStickerColour() {
  const colours = ["#ffffff", "#fff176", "#b9fbc0", "#ffc6ff", "#a0c4ff", "#ffd6a5"];
  return colours[Math.floor(Math.random() * colours.length)];
}

let resizeTimer = null;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    reshuffleNumberSheet();
    refreshActiveGrid();
  }, 180);
});
