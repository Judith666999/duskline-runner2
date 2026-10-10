// Gameplay tuning lives here; distances are metres and times are seconds.
export const CONFIG = Object.freeze({
  lanes: [-3.15, 0, 3.15],
  roadWidth: 11,
  segmentLength: 30,
  segmentCount: 10,
  baseSpeed: 16,
  maxSpeed: 30,
  acceleration: 0.16,
  spawnAhead: 165,
  despawnZ: 15,
  openingDistance: 88,
  minimumReactionTime: 1.45,
  jumpVelocity: 11.7,
  gravity: 28,
  slideDuration: 0.85,
  laneSharpness: 15,
  inputBuffer: 0.2,
  coinValue: 30,
  coinProbability: 0.82,
  coinSpacing: 3.2,
  distanceScore: 5,
  obstaclePoolSize: 40,
  coinPoolSize: 160,
  particleCount: 128,
  fixedStep: 1 / 120,
  colors: {
    sky: 0x263d5b, fog: 0x7c8092, road: 0x25364a, edge: 0x30465b,
    cyan: 0x75c8c1, orange: 0xe89a68, cream: 0xf0d4ad,
    building: 0x25374e, dark: 0x111f33
  }
});
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const damp = (from, to, sharpness, dt) => from + (to - from) * (1 - Math.exp(-sharpness * dt));
export const pick = array => array[Math.floor(Math.random() * array.length)];
