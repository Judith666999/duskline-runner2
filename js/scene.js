import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, COLORS, choose, random } from './config.js';

const MATS = {};
function material(key, color, emissive = 0, roughness = .78) {
  if (!MATS[key]) MATS[key] = new THREE.MeshStandardMaterial({ color, roughness, metalness: .14, emissive, emissiveIntensity: emissive ? .7 : 0, flatShading: true });
  return MATS[key];
}
function mesh(geometry, mat, shadows = true) { const result = new THREE.Mesh(geometry, mat); result.castShadow = shadows; result.receiveShadow = shadows; return result; }
function cube(width, height, depth, mat) { return mesh(new THREE.BoxGeometry(width, height, depth), mat); }

export class ParticlePool {
  constructor(scene) {
    this.items = [];
    const geometry = new THREE.IcosahedronGeometry(.07, 0);
    for (let i = 0; i < CONFIG.particlePool; i++) { const item = mesh(geometry, new THREE.MeshBasicMaterial({ color: COLORS.amber, transparent: true }), false); item.visible = false; scene.add(item); this.items.push(item); }
  }
  burst(position, color, count = 8, force = 1) {
    let used = 0;
    for (const item of this.items) { if (item.visible || used >= count) continue; item.visible = true; item.position.copy(position); item.position.y += .7; item.material.color.setHex(color); item.material.opacity = 1; item.userData.life = random(.36, .72); item.userData.maxLife = item.userData.life; item.userData.velocity = new THREE.Vector3(random(-2.4, 2.4) * force, random(1.2, 4) * force, random(-2.3, 2.3) * force); used++; }
  }
  update(dt) { for (const item of this.items) { if (!item.visible) continue; item.userData.life -= dt; item.position.addScaledVector(item.userData.velocity, dt); item.userData.velocity.y -= 7 * dt; item.rotation.x += dt * 8; item.material.opacity = Math.max(0, item.userData.life / item.userData.maxLife); item.scale.setScalar(.4 + item.material.opacity); if (item.userData.life <= 0) item.visible = false; } }
  reset() { for (const item of this.items) item.visible = false; }
}

export class RoadPool {
  constructor(scene) {
    this.items = [];
    const roadMat = material('road', COLORS.road), underMat = material('under', 0x101e2c), stripeMat = material('stripe', 0x8fa8a6, 0x283d3e), edgeMat = material('edge', COLORS.edge);
    for (let i = 0; i < CONFIG.segmentCount; i++) {
      const group = new THREE.Group();
      const deck = cube(CONFIG.roadWidth, .44, CONFIG.segmentLength + .06, roadMat); deck.position.y = 0; group.add(deck);
      const under = cube(CONFIG.roadWidth - .8, .75, CONFIG.segmentLength, underMat); under.position.y = -.55; group.add(under);
      for (const x of [-CONFIG.roadWidth / 2, CONFIG.roadWidth / 2]) { const edge = cube(.22, .2, CONFIG.segmentLength, edgeMat); edge.position.set(x, .28, 0); group.add(edge); }
      for (const x of [-1.6, 1.6]) { const dash = cube(.075, .024, CONFIG.segmentLength * .72, stripeMat); dash.position.set(x, .24, 0); group.add(dash); }
      group.position.z = -i * CONFIG.segmentLength; scene.add(group); this.items.push(group);
    }
  }
  reset() { this.items.forEach((item, index) => item.position.z = -index * CONFIG.segmentLength); }
  update(dt, speed) { for (const item of this.items) { item.position.z += speed * dt; if (item.position.z > CONFIG.segmentLength * 1.5) item.position.z -= CONFIG.segmentLength * CONFIG.segmentCount; } }
}

export class ObstaclePool {
  constructor(scene) {
    this.items = [];
    const lowMat = material('low', 0xd96c45), steelMat = material('steel', 0x52717e), blockMat = material('block', 0x8f3e3e), cyanMat = material('cyan', 0x397e82, COLORS.cyan), warning = material('warning', COLORS.amber, COLORS.orange);
    for (let i = 0; i < CONFIG.obstaclePool; i++) {
      const root = new THREE.Group(); root.visible = false; root.userData.active = false;
      const low = new THREE.Group(); const barrier = cube(1.75, .64, .75, lowMat); barrier.position.y = .42; low.add(barrier); for (const x of [-.62, 0, .62]) { const lamp = cube(.22, .08, .78, warning); lamp.position.set(x, .63, -.02); low.add(lamp); }
      const high = new THREE.Group(); for (const x of [-.86, .86]) { const pole = cube(.16, 2.12, .24, steelMat); pole.position.set(x, 1.18, 0); high.add(pole); } const gate = cube(2.05, .42, .72, warning); gate.position.y = 1.72; high.add(gate);
      const block = new THREE.Group(); const bulk = cube(2.1, 2.55, 1.02, blockMat); bulk.position.y = 1.48; block.add(bulk); const inset = cube(1.28, .18, 1.05, warning); inset.position.set(0, 1.42, -.02); block.add(inset);
      const moving = new THREE.Group(); const drone = cube(1.25, 1.12, .88, cyanMat); drone.position.y = .78; moving.add(drone); for (const x of [-.78, .78]) { const wing = cube(.48, .12, .38, steelMat); wing.position.set(x, .95, 0); moving.add(wing); }
      root.add(low, high, block, moving); scene.add(root); this.items.push(root);
    }
  }
  acquire(type, lane, z, difficulty = 0) {
    const item = this.items.find(entry => !entry.userData.active); if (!item) return null;
    Object.assign(item.userData, { active: true, type, lane, phase: random(0, Math.PI * 2), movingRange: type === 'moving' ? .55 + difficulty * .55 : 0 });
    item.visible = true; item.position.set(CONFIG.lanes[lane], CONFIG.roadTop, z); item.children.forEach((child, index) => child.visible = index === ['low', 'high', 'block', 'moving'].indexOf(type));
    return item;
  }
  release(item) { item.userData.active = false; item.visible = false; item.position.z = 500; }
  update(dt, speed, time) { for (const item of this.items) { if (!item.userData.active) continue; item.position.z += speed * dt; if (item.userData.type === 'moving') item.position.x = CONFIG.lanes[item.userData.lane] + Math.sin(time * 1.2 + item.userData.phase) * item.userData.movingRange; if (item.position.z > 28) this.release(item); } }
  reset() { this.items.forEach(item => this.release(item)); }
  bounds(item) {
    const type = item.userData.type;
    if (type === 'low') return { halfWidth: .89, halfDepth: .47, bottom: CONFIG.roadTop, top: CONFIG.roadTop + .77 };
    if (type === 'high') return { halfWidth: 1.05, halfDepth: .48, bottom: CONFIG.roadTop + 1.48, top: CONFIG.roadTop + 1.95 };
    if (type === 'moving') return { halfWidth: .84, halfDepth: .48, bottom: CONFIG.roadTop, top: CONFIG.roadTop + 1.42 };
    return { halfWidth: 1.07, halfDepth: .58, bottom: CONFIG.roadTop, top: CONFIG.roadTop + 2.78 };
  }
}

export class CoinPool {
  constructor(scene) {
    this.items = [];
    const mat = material('coin', COLORS.amber, COLORS.orange, .22), innerMat = material('coinInner', 0xffdda0, 0xffb060, .3);
    for (let i = 0; i < CONFIG.coinPool; i++) { const group = new THREE.Group(); const ring = mesh(new THREE.TorusGeometry(.26, .075, 6, 12), mat, false); ring.rotation.y = Math.PI / 2; const core = mesh(new THREE.OctahedronGeometry(.13, 0), innerMat, false); group.add(ring, core); group.userData.active = false; group.visible = false; scene.add(group); this.items.push(group); }
  }
  acquire(lane, z, y = 1.1) { const item = this.items.find(entry => !entry.userData.active); if (!item) return null; item.userData.active = true; item.userData.baseY = CONFIG.roadTop + y; item.userData.phase = random(0, Math.PI * 2); item.position.set(CONFIG.lanes[lane], item.userData.baseY, z); item.scale.setScalar(1); item.visible = true; return item; }
  release(item) { item.userData.active = false; item.visible = false; item.position.z = 500; }
  update(dt, speed, time) { for (const item of this.items) { if (!item.userData.active) continue; item.position.z += speed * dt; item.rotation.y += dt * 4.7; item.position.y = item.userData.baseY + Math.sin(time * 4 + item.userData.phase) * .08; if (item.position.z > 24) this.release(item); } }
  reset() { this.items.forEach(item => this.release(item)); }
}

export class CityPool {
  constructor(scene) {
    this.items = []; this.vehicles = [];
    const baseMats = [material('buildingA', 0x13263b), material('buildingB', 0x1a3145), material('buildingC', 0x24394a)];
    const warm = material('windows', 0xa95f45, 0xa95f45), cyan = material('windowsCyan', 0x397a80, 0x397a80);
    const shapeA = new THREE.BoxGeometry(1, 1, 1), shapeB = new THREE.CylinderGeometry(.68, .82, 1, 5);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group(), side = i % 2 ? 1 : -1, width = random(4, 10), height = random(8, 31), depth = random(5, 11);
      const tower = mesh(i % 5 === 0 ? shapeB : shapeA, baseMats[i % baseMats.length]); tower.scale.set(width, height, depth); tower.position.y = height / 2 - 1; group.add(tower);
      const crown = cube(width * .62, .12, depth * .64, i % 3 ? warm : cyan); crown.position.y = height - 1; group.add(crown);
      if (i % 3 !== 0) { for (let row = 0; row < Math.min(5, Math.floor(height / 4)); row++) { const strip = cube(.05, .12, depth * .54, row % 2 ? cyan : warm); strip.position.set(-side * width * .51, 2.5 + row * 3.4, 0); group.add(strip); } }
      group.userData.side = side; group.userData.speed = random(.15, .31); group.position.set(side * random(15, 30), 0, -i * 11 - random(15, 65)); scene.add(group); this.items.push(group);
    }
    const vehicleMat = material('vehicle', 0x344d62), vehicleGlow = material('vehicleGlow', COLORS.cyan, COLORS.cyan);
    for (let i = 0; i < 10; i++) { const vehicle = new THREE.Group(); const hull = cube(1.8, .4, .7, vehicleMat); hull.rotation.z = .04; const light = cube(.9, .05, .74, vehicleGlow); light.position.y = -.22; vehicle.add(hull, light); vehicle.userData.side = i % 2 ? 1 : -1; vehicle.userData.speed = random(.35, .65); vehicle.userData.phase = random(0, 6); vehicle.position.set(vehicle.userData.side * random(9, 22), random(4, 13), -random(30, 285)); scene.add(vehicle); this.vehicles.push(vehicle); }
  }
  update(dt, speed, time) {
    for (const item of this.items) { item.position.z += speed * item.userData.speed * dt; if (item.position.z > 48) { item.position.z = Math.min(...this.items.map(other => other.position.z)) - random(8, 24); item.position.x = item.userData.side * random(15, 30); } }
    for (const item of this.vehicles) { item.position.z += speed * item.userData.speed * dt; item.position.y += Math.sin(time * 1.3 + item.userData.phase) * dt * .14; if (item.position.z > 45) { item.position.z = Math.min(...this.vehicles.map(other => other.position.z)) - random(22, 55); item.position.x = item.userData.side * random(9, 22); item.position.y = random(4, 13); } }
  }
}

export class DecorPool {
  constructor(scene) {
    this.items = [];
    const steel = material('decorSteel', 0x2d4754), lamp = material('lamp', COLORS.amber, COLORS.orange), cyan = material('decorCyan', COLORS.cyan, COLORS.cyan), concrete = material('concrete', 0x4a5155);
    for (let i = 0; i < 44; i++) {
      const group = new THREE.Group(), side = i % 2 ? 1 : -1;
      const pole = mesh(new THREE.CylinderGeometry(.055, .085, 4.2, 5), steel); pole.position.y = 2.1; const head = cube(.55, .1, .18, lamp); head.position.set(-side * .22, 4.15, 0); group.add(pole, head);
      const rail = cube(.12, .65, 6, steel); rail.position.set(side * .65, .52, 0); group.add(rail); group.userData.side = side; group.userData.kind = 'lamp'; scene.add(group); this.items.push(group);
    }
    for (let i = 0; i < 12; i++) { const sign = new THREE.Group(), side = i % 2 ? 1 : -1; const frame = cube(.18, 2.8, .18, steel); frame.position.y = 1.5; const panel = cube(2.6, 1.3, .14, i % 3 ? cyan : lamp); panel.position.set(side * 1.2, 2.6, 0); sign.add(frame, panel); for (let j = 0; j < 3; j++) { const line = cube(1.7 - j * .25, .055, .16, concrete); line.position.set(side * 1.2, 2.88 - j * .25, -.09); sign.add(line); } sign.userData.side = side; sign.userData.kind = 'sign'; scene.add(sign); this.items.push(sign); }
    this.reset();
  }
  reset() { this.items.forEach((item, i) => { item.position.set(item.userData.side * (item.userData.kind === 'lamp' ? 6.6 : 8.4), CONFIG.roadTop, -10 - i * 10.5); }); }
  update(dt, speed) { for (const item of this.items) { item.position.z += speed * dt; if (item.position.z > 34) { item.position.z = Math.min(...this.items.map(other => other.position.z)) - random(8, 14); item.position.x = item.userData.side * (item.userData.kind === 'lamp' ? random(6.45, 7.1) : random(7.9, 9.8)); } } }
}

export class LandmarkPool {
  constructor(scene) {
    this.items = [];
    const steel = material('landmarkSteel', 0x28414d), warm = material('landmarkWarm', COLORS.orange, COLORS.orange), cyan = material('landmarkCyan', COLORS.cyan, COLORS.cyan), cone = material('cone', 0xd87542);
    for (let i = 0; i < 7; i++) {
      const group = new THREE.Group(), style = i % 4;
      if (style === 0) { for (const x of [-5.7, 5.7]) { const pillar = cube(.42, 6.1, .55, steel); pillar.position.set(x, 3.05, 0); group.add(pillar); } const beam = cube(11.8, .32, .55, steel); beam.position.y = 6; group.add(beam); for (const x of [-3.2, 0, 3.2]) { const light = cube(1.7, .07, .6, warm); light.position.set(x, 5.78, 0); group.add(light); } }
      if (style === 1) { for (let j = 0; j < 5; j++) { const arch = new THREE.Group(); for (const x of [-5.5, 5.5]) { const post = cube(.32, 5, .6, steel); post.position.set(x, 2.5, -j * 3); arch.add(post); } const roof = cube(11.4, .25, .6, steel); roof.position.set(0, 5, -j * 3); arch.add(roof); group.add(arch); } }
      if (style === 2) { const platform = cube(15, .16, 14, material('plaza', 0x304657)); platform.position.y = -.03; group.add(platform); for (const x of [-7, 7]) for (const z of [-5, 0, 5]) { const bollard = mesh(new THREE.CylinderGeometry(.2, .26, 1.2, 6), cyan); bollard.position.set(x, .65, z); group.add(bollard); } }
      if (style === 3) { for (const x of [-6.6, 6.6]) for (const z of [-5, 0, 5]) { const barrel = mesh(new THREE.CylinderGeometry(.35, .42, .8, 8), cone); barrel.position.set(x, .45, z); group.add(barrel); } const crane = cube(.28, 7, .28, steel); crane.position.set(-8, 3.5, 0); group.add(crane); const arm = cube(7, .2, .25, steel); arm.position.set(-4.6, 6.7, 0); group.add(arm); }
      group.userData.style = style; scene.add(group); this.items.push(group);
    }
    this.reset();
  }
  reset() { this.items.forEach((item, index) => item.position.set(0, CONFIG.roadTop, -85 - index * 92)); }
  update(dt, speed) { for (const item of this.items) { item.position.z += speed * dt; if (item.position.z > 42) item.position.z = Math.min(...this.items.map(other => other.position.z)) - random(78, 112); } }
}

export class PatternDirector {
  constructor(obstacles, coins) { this.obstacles = obstacles; this.coins = coins; this.cursor = -42; this.lastSafeLane = 1; this.patterns = []; this.buildPatterns(); }
  buildPatterns() {
    this.patterns = [
      { level: 0, span: 22, obstacles: [{ dz: 0, lanes: [0], type: 'low' }] },
      { level: 0, span: 23, obstacles: [{ dz: 0, lanes: [2], type: 'block' }] },
      { level: .04, span: 24, obstacles: [{ dz: 0, lanes: [1], type: 'high' }] },
      { level: .12, span: 25, obstacles: [{ dz: 0, lanes: [0, 2], type: 'block' }] },
      { level: .2, span: 28, obstacles: [{ dz: 0, lanes: [0], type: 'low' }, { dz: -8, lanes: [2], type: 'high' }] },
      { level: .3, span: 28, obstacles: [{ dz: 0, lanes: [0, 1], type: 'low' }, { dz: -10, lanes: [0, 1], type: 'block' }] },
      { level: .38, span: 28, obstacles: [{ dz: 0, lanes: [1], type: 'moving' }] },
      { level: .48, span: 32, obstacles: [{ dz: 0, lanes: [0, 2], type: 'high' }, { dz: -11, lanes: [1], type: 'low' }] },
      { level: .58, span: 35, obstacles: [{ dz: 0, lanes: [0, 1], type: 'block' }, { dz: -13, lanes: [0, 1], type: 'low' }] },
      { level: .7, span: 36, obstacles: [{ dz: 0, lanes: [0], type: 'moving' }, { dz: -14, lanes: [2], type: 'moving' }] },
    ];
  }
  reset() { this.cursor = -42; this.lastSafeLane = 1; }
  update(dt, speed, difficulty) { this.cursor += speed * dt; while (this.cursor > -CONFIG.spawnAhead) { this.spawn(this.cursor, difficulty); this.cursor -= CONFIG.obstacleGap + random(0, 9); } }
  spawn(z, difficulty) {
    const candidates = this.patterns.filter(pattern => pattern.level <= difficulty); const pattern = choose(candidates);
    for (const row of pattern.obstacles) for (const lane of row.lanes) this.obstacles.acquire(row.type, lane, z + row.dz, difficulty);
    const safeByRow = pattern.obstacles.map(row => [0, 1, 2].filter(lane => !row.lanes.includes(lane)));
    const startOptions = safeByRow[0] || [0, 1, 2]; const safe = startOptions.reduce((best, lane) => Math.abs(lane - this.lastSafeLane) < Math.abs(best - this.lastSafeLane) ? lane : best, startOptions[0]); this.lastSafeLane = safe;
    if (Math.random() < CONFIG.coinProbability) this.coinPattern(z - 2, safe, choose(['line', 'line', 'arc', 'weave', 'jump']), pattern.span);
  }
  coinPattern(z, lane, type, span) {
    if (type === 'line') for (let i = 0; i < 6; i++) this.coins.acquire(lane, z - i * 2.7, 1.12);
    if (type === 'arc') for (let i = 0; i < 7; i++) this.coins.acquire(lane, z - i * 2.5, 1.1 + Math.sin(i / 6 * Math.PI) * 1.95);
    if (type === 'jump') for (let i = 0; i < 6; i++) this.coins.acquire(lane, z - i * 2.7, 1.05 + Math.sin(i / 5 * Math.PI) * 1.5);
    if (type === 'weave') { const target = lane === 0 ? 2 : 0; for (let i = 0; i < 8; i++) { const t = i / 7, coinLane = Math.round(lane + (target - lane) * t); this.coins.acquire(coinLane, z - i * (span / 9), 1.12); } this.lastSafeLane = target; }
  }
}

export function createSky(scene) {
  const geometry = new THREE.SphereGeometry(290, 28, 14), uniforms = { top: { value: new THREE.Color(0x132743) }, horizon: { value: new THREE.Color(0xd0795e) }, bottom: { value: new THREE.Color(0x121b2b) } };
  const shader = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms, vertexShader: 'varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vWorld; void main(){ float h=normalize(vWorld).y; vec3 c=mix(horizon,top,smoothstep(0.05,0.58,h)); c=mix(bottom,c,smoothstep(-0.2,0.05,h)); gl_FragColor=vec4(c,1.0); }' });
  scene.add(new THREE.Mesh(geometry, shader));
  const sun = mesh(new THREE.CircleGeometry(12, 30), new THREE.MeshBasicMaterial({ color: 0xffb07d, transparent: true, opacity: .78, fog: false }), false); sun.position.set(-62, 25, -210); scene.add(sun);
}
