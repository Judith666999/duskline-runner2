import * as THREE from './vendor/three.module.min.js';
import { CONFIG, COLORS, damp, loadSetting, saveSetting } from './js/config.js';
import { AudioSystem } from './js/audio.js';
import { InputSystem } from './js/input.js';
import { Character } from './js/character.js';
import { ParticlePool, RoadPool, ObstaclePool, CoinPool, CityPool, DecorPool, LandmarkPool, PatternDirector, createSky } from './js/scene.js';

const byId = id => document.getElementById(id);
const dom = {
  shell: byId('game-shell'), canvas: byId('game-canvas'), loading: byId('loading-screen'), menu: byId('menu-screen'), hud: byId('hud'),
  pause: byId('pause-screen'), over: byId('gameover-screen'), start: byId('start-button'), resume: byId('resume-button'),
  pauseRestart: byId('pause-restart-button'), restart: byId('restart-button'), menuButton: byId('menu-button'),
  pauseButton: byId('pause-button'), soundButton: byId('sound-button'), score: byId('score-value'), coins: byId('coin-value'),
  distance: byId('distance-value'), menuBest: byId('menu-best'), finalScore: byId('final-score'), finalCoins: byId('final-coins'),
  finalDistance: byId('final-distance'), finalBest: byId('final-best'), resultKicker: byId('result-kicker'),
  combo: byId('combo-display'), comboValue: byId('combo-value'), flash: byId('flash'),
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x17263c, 58, 255);
createSky(scene);
const camera = new THREE.PerspectiveCamera(54, 1, .1, 410);
camera.position.set(0, 5.9, 12.7);
const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0x9fb4ca, 0x111722, 1.85));
const keyLight = new THREE.DirectionalLight(0xffb184, 3.25);
keyLight.position.set(-34, 48, 24); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024);
Object.assign(keyLight.shadow.camera, { left: -24, right: 24, top: 25, bottom: -14, near: .5, far: 100 });
scene.add(keyLight);
const cityGlow = new THREE.PointLight(COLORS.orange, 7, 38, 2); cityGlow.position.set(-10, 6, -2); scene.add(cityGlow);

const audio = new AudioSystem();
const particles = new ParticlePool(scene);
const roads = new RoadPool(scene);
const obstacles = new ObstaclePool(scene);
const coins = new CoinPool(scene);
const city = new CityPool(scene);
const decor = new DecorPool(scene);
const landmarks = new LandmarkPool(scene);
const director = new PatternDirector(obstacles, coins);
const character = new Character(scene, audio, particles);

let state = 'loading';
let elapsed = 0, speed = CONFIG.startSpeed, distance = 0, score = 0, coinCount = 0;
let combo = 0, comboWindow = 0, crashTimer = 0, cameraShake = 0;
let lastFrame = performance.now(), accumulator = 0, hudTimer = 0;

const input = new InputSystem(dom.canvas, action => {
  if (action === 'pause') { if (state === 'running') pauseGame(); else if (state === 'paused') resumeGame(); return; }
  if (state === 'running') character.command(action);
});

function setState(next) { state = next; dom.shell.dataset.state = next; }
function bestScore() { return Number(loadSetting('duskline-best-v2', '0')) || 0; }
function formatScore(value) { return Math.max(0, Math.round(value)).toString().padStart(6, '0'); }
function updateSoundButton() { dom.soundButton.setAttribute('aria-pressed', String(audio.enabled)); dom.soundButton.setAttribute('aria-label', audio.enabled ? '关闭声音' : '打开声音'); }
function showOnly(overlay) { for (const node of [dom.loading, dom.menu, dom.pause, dom.over]) node.classList.toggle('visible', node === overlay); }
function updateHud(force = false) {
  if (!force && hudTimer < .04) return; hudTimer = 0;
  dom.score.textContent = formatScore(score); dom.coins.textContent = String(coinCount); dom.distance.textContent = String(Math.floor(distance));
}

function resetRun() {
  elapsed = 0; speed = CONFIG.startSpeed; distance = 0; score = 0; coinCount = 0; combo = 0; comboWindow = 0; crashTimer = 0; cameraShake = 0; accumulator = 0; hudTimer = 1;
  input.clear(); character.reset(); roads.reset(); obstacles.reset(); coins.reset(); particles.reset(); decor.reset(); landmarks.reset(); director.reset();
  dom.combo.classList.remove('visible'); dom.flash.classList.remove('hit'); updateHud(true);
  for (let i = 0; i < 7; i++) coins.acquire(1, -10 - i * 3, 1.12);
  director.update(0, 0, 0);
}

function startGame() {
  audio.unlock(); audio.effect('start'); resetRun(); setState('running'); showOnly(null); dom.hud.classList.add('visible'); audio.music(true); lastFrame = performance.now();
}
function pauseGame() {
  if (state !== 'running') return; setState('paused'); input.clear(); audio.effect('click'); audio.stop(); showOnly(dom.pause);
}
function resumeGame() {
  if (state !== 'paused') return; audio.unlock(); audio.effect('click'); setState('running'); showOnly(null); lastFrame = performance.now(); accumulator = 0; audio.music(true);
}
function returnToMenu() {
  audio.stop(); audio.effect('click'); resetRun(); setState('menu'); showOnly(dom.menu); dom.hud.classList.remove('visible'); dom.menuBest.textContent = String(bestScore());
}
function beginCrash() {
  if (state !== 'running') return; setState('crashing'); input.clear(); audio.stop(); audio.effect('hit'); crashTimer = .68; cameraShake = .48;
  particles.burst(character.root.position, COLORS.orange, 24, 1.8); dom.flash.classList.remove('hit'); void dom.flash.offsetWidth; dom.flash.classList.add('hit');
}
function finishRun() {
  setState('over'); dom.hud.classList.remove('visible');
  const rounded = Math.round(score), previous = bestScore(), record = rounded > previous, best = Math.max(previous, rounded);
  saveSetting('duskline-best-v2', best); dom.finalScore.textContent = formatScore(rounded); dom.finalCoins.textContent = String(coinCount);
  dom.finalDistance.textContent = String(Math.floor(distance)); dom.finalBest.textContent = String(best); dom.resultKicker.textContent = record ? '新的线路纪录' : '本次行程结束';
  if (record) audio.effect('record'); showOnly(dom.over);
}

function updateDifficulty() {
  const t = THREE.MathUtils.clamp(elapsed / CONFIG.accelerationTime, 0, 1);
  const eased = t * t * (3 - 2 * t); speed = THREE.MathUtils.lerp(CONFIG.startSpeed, CONFIG.maxSpeed, eased);
  return THREE.MathUtils.clamp((elapsed - 5) / 110, 0, 1);
}
function collectCoin(item) {
  const at = item.position.clone(); coins.release(item); coinCount++; combo = comboWindow > 0 ? combo + 1 : 1; comboWindow = 2.05;
  score += CONFIG.coinValue * Math.min(combo, 10); audio.effect('coin', combo); particles.burst(at, COLORS.amber, 9, 1);
  dom.comboValue.textContent = 'x' + combo; dom.combo.classList.add('visible');
}
function checkCollisions() {
  const player = character.bounds();
  for (const item of obstacles.items) {
    if (!item.userData.active) continue; const bounds = obstacles.bounds(item);
    const overlapX = Math.abs(item.position.x - player.x) < bounds.halfWidth + player.halfWidth;
    const overlapZ = Math.abs(item.position.z - player.z) < bounds.halfDepth + player.halfDepth;
    const overlapY = player.top > bounds.bottom && player.bottom < bounds.top;
    if (overlapX && overlapZ && overlapY) { beginCrash(); return; }
  }
  for (const item of coins.items) {
    if (!item.userData.active) continue;
    if (Math.abs(item.position.z - player.z) < .72 && Math.abs(item.position.x - player.x) < .62 && item.position.y > player.bottom - .32 && item.position.y < player.top + .32) collectCoin(item);
  }
}
function updateWorld(dt, movingSpeed) {
  roads.update(dt, movingSpeed); obstacles.update(dt, movingSpeed, elapsed); coins.update(dt, movingSpeed, elapsed); city.update(dt, movingSpeed, elapsed); decor.update(dt, movingSpeed); landmarks.update(dt, movingSpeed); particles.update(dt);
}
function simulate(dt) {
  if (state === 'running') {
    elapsed += dt; hudTimer += dt; const difficulty = updateDifficulty(); distance += speed * dt; score += speed * dt * 3.15 + (comboWindow > 0 ? combo * dt * 1.4 : 0);
    comboWindow = Math.max(0, comboWindow - dt); if (comboWindow === 0 && combo !== 0) { combo = 0; dom.combo.classList.remove('visible'); }
    character.update(dt, speed); updateWorld(dt, speed); director.update(dt, speed, difficulty); checkCollisions(); updateHud();
  } else if (state === 'crashing') {
    crashTimer -= dt; speed = Math.max(0, speed - 48 * dt); character.crash(dt); updateWorld(dt, speed);
    if (crashTimer <= 0) finishRun();
  }
}
function render(dt) {
  if (state === 'menu' || state === 'loading') character.pose(dt, 'menu');
  const followX = character.root.position.x * .2, followY = 5.9 + character.y * .11;
  camera.position.x = damp(camera.position.x, followX, 6, dt); camera.position.y = damp(camera.position.y, followY, 5, dt); camera.position.z = damp(camera.position.z, 12.7, 5, dt);
  if (cameraShake > 0) { cameraShake = Math.max(0, cameraShake - dt); const amount = cameraShake * .22; camera.position.x += (Math.random() - .5) * amount; camera.position.y += (Math.random() - .5) * amount; }
  camera.lookAt(character.root.position.x * .1, 1.35 + character.y * .24, -9.5);
  camera.fov = damp(camera.fov, 54 + (speed - CONFIG.startSpeed) * .42, 3.2, dt); camera.updateProjectionMatrix(); renderer.render(scene, camera);
}
function frame(now) {
  const frameDt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
  if (state === 'running' || state === 'crashing') { accumulator = Math.min(accumulator + frameDt, .12); while (accumulator >= CONFIG.step) { simulate(CONFIG.step); accumulator -= CONFIG.step; } }
  render(frameDt);
}
function resize() {
  const width = innerWidth, height = innerHeight; renderer.setSize(width, height, false); renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.maxPixelRatio)); camera.aspect = width / height; camera.updateProjectionMatrix();
}
function bindButton(button, handler) { button.addEventListener('click', handler); }
bindButton(dom.start, startGame); bindButton(dom.restart, startGame); bindButton(dom.pauseRestart, startGame); bindButton(dom.resume, resumeGame); bindButton(dom.menuButton, returnToMenu); bindButton(dom.pauseButton, pauseGame);
bindButton(dom.soundButton, () => { audio.toggle(state === 'running'); updateSoundButton(); });
addEventListener('resize', resize); addEventListener('blur', () => { if (state === 'running') pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') pauseGame(); });

updateSoundButton(); dom.menuBest.textContent = String(bestScore()); resetRun(); resize(); renderer.setAnimationLoop(frame);
requestAnimationFrame(() => requestAnimationFrame(() => { dom.loading.classList.remove('visible'); dom.menu.classList.add('visible'); setState('menu'); dom.start.focus({ preventScroll: true }); }));
window.__DUSKLINE__ = { snapshot: () => ({ state, elapsed, speed, distance, score, coins: coinCount, activeObstacles: obstacles.items.filter(item => item.userData.active).length, activeCoins: coins.items.filter(item => item.userData.active).length }) };
