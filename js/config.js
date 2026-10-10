export const CONFIG = Object.freeze({
  lanes: [-3.2, 0, 3.2], roadWidth: 11.4, roadTop: 0.22,
  playerZ: 5, playerWidth: 0.65, playerDepth: 0.65, playerHeight: 2.3,
  slideHeight: 0.82, slideDuration: 0.82, laneResponse: 17,
  startSpeed: 17, maxSpeed: 32, accelerationTime: 130,
  gravity: 25, jumpVelocity: 10.3, inputBuffer: 0.19,
  segmentLength: 24, segmentCount: 15, spawnAhead: 205,
  obstacleGap: 42, coinProbability: 0.92, coinValue: 35,
  obstaclePool: 36, coinPool: 180, particlePool: 96,
  step: 1 / 120, maxPixelRatio: 1.6,
});
export const COLORS = Object.freeze({
  road: 0x233344, edge: 0x354b59, dark: 0x102235,
  orange: 0xe88c4f, amber: 0xffc17a, cyan: 0x76c9c6,
});
export const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
export const random = (min, max) => min + Math.random() * (max - min);
export const choose = (values) => values[Math.floor(Math.random() * values.length)];
export function loadSetting(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function saveSetting(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Private browsing may deny storage. */ }
}
