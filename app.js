const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// UI Elements
const uiOverlay = document.getElementById('ui-overlay');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('start-btn');
const fileBtn = document.getElementById('file-btn');
const synthBtn = document.getElementById('synth-btn');
const stopBtn = document.getElementById('stop-btn');
const themeBtn = document.getElementById('theme-btn');
const modeBtn = document.getElementById('mode-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const audioFileInput = document.getElementById('audio-file');

// Telemetry Elements
const bassVal = document.getElementById('bass-val');
const midVal = document.getElementById('mid-val');
const highVal = document.getElementById('high-val');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Color Themes
const themes = [
  { name: 'CYBER', primary: '#00f3ff', secondary: '#ff0055', bg: 'rgba(7, 7, 13, 0.25)' },
  { name: 'MATRIX', primary: '#00ff66', secondary: '#008f39', bg: 'rgba(4, 12, 6, 0.25)' },
  { name: 'SOLAR', primary: '#ffcc00', secondary: '#ff4500', bg: 'rgba(13, 8, 4, 0.25)' }
];
let currentTheme = 0;

themeBtn.addEventListener('click', () => {
  currentTheme = (currentTheme + 1) % themes.length;
  themeBtn.textContent = `THEME: ${themes[currentTheme].name}`;
});

// Fullscreen Toggle
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Fullscreen error: ${err.message}`);
    });
    fullscreenBtn.textContent = 'EXIT FULL';
  } else {
    document.exitFullscreen();
    fullscreenBtn.textContent = 'FULLSCREEN';
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    fullscreenBtn.textContent = 'FULLSCREEN';
  }
});

// Visualizer Modes ('RADIAL' or 'WAVE')
let visualMode = 'RADIAL';

modeBtn.addEventListener('click', () => {
  visualMode = visualMode === 'RADIAL' ? 'WAVE' : 'RADIAL';
  modeBtn.textContent = `MODE: ${visualMode}`;
});

// Audio & Animation State
let audioCtx;
let analyser;
let freqDataArray;
let timeDataArray;
let bufferLength;
let animationId;
let synthInterval;
let currentAudioElement;
let currentStream;
let rotationAngle = 0;

// Particle System
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 1 + Math.random() * 2;
  }

  update(bassBoost) {
    const multiplier = 1 + (bassBoost / 45);
    this.x += this.vx * multiplier;
    this.y += this.vy * multiplier;

    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  draw(color) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

const particles = Array.from({ length: 70 }, () => new Particle());

function setupAudioEngine() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  bufferLength = analyser.frequencyBinCount;

  freqDataArray = new Uint8Array(bufferLength);
  timeDataArray = new Uint8Array(bufferLength);

  uiOverlay.style.display = 'none';
  hud.classList.remove('hidden');
}

function stopAudio() {
  cancelAnimationFrame(animationId);
  if (synthInterval) clearInterval(synthInterval);
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }

  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  hud.classList.add('hidden');
  uiOverlay.style.display = 'block';
}

stopBtn.addEventListener('click', stopAudio);

// OPTION A: Live Microphone (Raw Unfiltered Audio)
startBtn.addEventListener('click', async () => {
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    setupAudioEngine();

    const source = audioCtx.createMediaStreamSource(currentStream);
    source.connect(analyser);
    animate();
  } catch (err) {
    alert('Mic error: ' + err.message);
  }
});

// OPTION B: Load Local MP3 / WAV
fileBtn.addEventListener('click', () => audioFileInput.click());

audioFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setupAudioEngine();

  currentAudioElement = new Audio();
  currentAudioElement.src = URL.createObjectURL(file);
  currentAudioElement.crossOrigin = 'anonymous';

  const source = audioCtx.createMediaElementSource(currentAudioElement);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  currentAudioElement.play();
  animate();
});

// OPTION C: Built-In Synth Beat Generator
synthBtn.addEventListener('click', () => {
  setupAudioEngine();
  analyser.connect(audioCtx.destination);

  startSynthBeat();
  animate();
});

function startSynthBeat() {
  let step = 0;
  const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 82.41, 65.41];

  synthInterval = setInterval(() => {
    const now = audioCtx.currentTime;

    if (step % 4 === 0) {
      const kickOsc = audioCtx.createOscillator();
      const kickGain = audioCtx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

      kickGain.gain.setValueAtTime(0.9, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      kickOsc.connect(kickGain);
      kickGain.connect(analyser);
      kickOsc.start(now);
      kickOsc.stop(now + 0.25);
    }

    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassNotes[step % bassNotes.length], now);

    bassGain.gain.setValueAtTime(0.22, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    bassOsc.connect(bassGain);
    bassGain.connect(analyser);
    bassOsc.start(now);
    bassOsc.stop(now + 0.14);

    if (step % 2 === 1) {
      const leadOsc = audioCtx.createOscillator();
      const leadGain = audioCtx.createGain();
      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(bassNotes[step % bassNotes.length] * 4, now);

      leadGain.gain.setValueAtTime(0.12, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      leadOsc.connect(leadGain);
      leadGain.connect(analyser);
      leadOsc.start(now);
      leadOsc.stop(now + 0.1);
    }

    step++;
  }, 140);
}

function getBandAverage(startIndex, endIndex) {
  let sum = 0;
  for (let i = startIndex; i < endIndex; i++) {
    sum += freqDataArray[i];
  }
  return Math.round(sum / (endIndex - startIndex));
}

// MODE 1: Circular Radial Bars
function drawRadialVisualizer(theme, bassAvg, highAvg) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 85 + (bassAvg * 0.45);

  // Outer Pulsing Core Ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 22;
  ctx.shadowColor = theme.secondary;
  ctx.stroke();

  // Inner Treble Ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.65 + (highAvg * 0.2), 0, Math.PI * 2);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = theme.primary;
  ctx.stroke();

  rotationAngle += 0.005 + (bassAvg * 0.0001);

  const bars = 64;
  for (let i = 0; i < bars; i++) {
    const value = freqDataArray[i];
    const barHeight = value * 0.75;
    const angle = ((i / bars) * Math.PI * 2) + rotationAngle;

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = theme.primary;
    ctx.stroke();
  }
}

// MODE 2: Classic Glowing Oscilloscope Waveform
function drawOscilloscope(theme, bassAvg) {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.beginPath();
  const sliceWidth = canvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = timeDataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.lineWidth = 3 + (bassAvg * 0.015);
  ctx.strokeStyle = theme.primary;
  ctx.shadowBlur = 20;
  ctx.shadowColor = theme.secondary;
  ctx.stroke();
}

function animate() {
  animationId = requestAnimationFrame(animate);

  analyser.getByteFrequencyData(freqDataArray);
  analyser.getByteTimeDomainData(timeDataArray);

  const theme = themes[currentTheme];

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bassAvg = getBandAverage(0, 14);
  const midAvg = getBandAverage(14, 70);
  const highAvg = getBandAverage(70, 150);

  bassVal.textContent = String(bassAvg).padStart(3, '0');
  midVal.textContent = String(midAvg).padStart(3, '0');
  highVal.textContent = String(highAvg).padStart(3, '0');

  ctx.shadowBlur = 0;
  particles.forEach(p => {
    p.update(bassAvg);
    p.draw(theme.primary);
  });

  if (visualMode === 'RADIAL') {
    drawRadialVisualizer(theme, bassAvg, highAvg);
  } else {
    drawOscilloscope(theme, bassAvg);
  }
}