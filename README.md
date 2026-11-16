# Sonic Canvas // Real-Time Web Audio Visualizer

A zero-dependency, 60fps real-time audio visualizer built with Vanilla JavaScript, the native **Web Audio API**, and **HTML5 Canvas**.

## Features
- **3 Audio Sources:** Live unfiltered microphone input, local MP3/WAV file playback, and a built-in Web Audio API procedural synthwave beat generator.
- **Dual Visual Modes:** Toggle in real time between **Radial Frequency Bars** (FFT spectrum) and a glowing **Oscilloscope Waveform** (time-domain signal).
- **Reactive Physics & Telemetry HUD:** Live BASS/MID/HIGH energy readouts, bass-reactive starfield particles, fullscreen mode, and switchable neon themes (`CYBER`, `MATRIX`, `SOLAR`).

## How to Run Locally
Because browsers restrict microphone access over `file://`, serve the folder over localhost:
```bash
python -m http.server 8000