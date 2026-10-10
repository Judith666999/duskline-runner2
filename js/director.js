import * as THREE from '../vendor/three.module.js';
import {CONFIG, pick, clamp} from './config.js';
import {box, material, batchStaticGroup} from './geometry.js';

const TYPES = {
  low: {minY: 0, maxY: .72, halfX: .93, halfZ: .48},
  overhead: {minY: 1.25, maxY: 2.3, halfX: .96, halfZ: .55},
  block: {minY: 0, maxY: 2.7, halfX: 1.02, halfZ: .62},
  mover: {minY: .22, maxY: 1.5, halfX: .7, halfZ: .7}
};

export class CourseDirector {
  constructor(scene, particles, audio) {
    Object.assign(this, {scene, particles, audio});
    this.obstacles = [];
    this.coins = [];
    this.events = [];
    this.nextEventDistance = CONFIG.openingDistance;
    this.lastSafeLane = 1;
    this.previousKind = '';
    this.assets = this.createAssets();
    this.createPools();
  }

  createAssets() {
    const mats = {
      orange: material(0xc77a4e), dark: material(0x26394d), pale: material(0xd9c9a9),
      cyan: material(CONFIG.colors.cyan, 0x345f60), yellow: material(0xf0ae59, 0x8d531c),
      red: material(0xc6634d, 0x5f251c), coin: material(0xf5bd55, 0xd57924)
    };
    const coin = new THREE.CylinderGeometry(.24, .24, .07, 12);
    coin.rotateZ(Math.PI / 2);
    return {mats, coin};
  }

  obstaclePrototype(type) {
    const group = new THREE.Group(), m = this.assets.mats;
    if (type === 'low') {
      box(group, m.orange, [1.86, .7, .9], [0, .35, 0], true);
      for (const x of [-.6, 0, .6]) {
        const stripe = box(group, m.pale, [.19, .73, .025], [x, .37, -.462]);
        stripe.rotation.z = -.38;
      }
      box(group, m.yellow, [1.9, .08, .08], [0, .73, 0]);
    } else if (type === 'overhead') {
      for (const x of [-.9, .9]) box(group, m.dark, [.16, 2.35, .34], [x, 1.17, 0], true);
      box(group, m.orange, [2.0, .82, 1.05], [0, 1.82, 0], true);
      box(group, m.cyan, [1.35, .11, 1.08], [0, 1.58, 0]);
      box(group, m.pale, [.5, .09, 1.08], [0, 2.05, 0]);
    } else if (type === 'block') {
      box(group, m.dark, [2.04, 2.75, 1.18], [0, 1.375, 0], true);
      for (const y of [.55, 1.35, 2.15]) box(group, y === 1.35 ? m.cyan : m.orange,
        [1.55, .12, 1.21], [0, y, 0]);
      box(group, m.pale, [.16, 2.4, 1.22], [-.72, 1.37, 0]);
    } else {
      box(group, m.red, [1.35, 1.05, 1.35], [0, .75, 0], true);
      box(group, m.dark, [1.12, .45, 1.65], [0, 1.37, 0], true);
      for (const side of [-1, 1]) {
        box(group, m.yellow, [.18, .18, .08], [side * .42, .86, -.7]);
        box(group, m.cyan, [.17, .05, 1.65], [side * .7, .42, 0]);
      }
    }
    return batchStaticGroup(group);
  }

  createPools() {
    this.prototypes = {};
    for (const type of Object.keys(TYPES)) this.prototypes[type] = this.obstaclePrototype(type);
    for (let i = 0; i < CONFIG.obstaclePoolSize; i++) {
      const root = new THREE.Group();
      const models = {};
      for (const [type, prototype] of Object.entries(this.prototypes)) {
        models[type] = prototype.clone();
        models[type].visible = false;
        root.add(models[type]);
      }
      root.visible = false;
      this.scene.add(root);
      this.obstacles.push({root, models, active: false, type: 'low', lane: 0, phase: 0, moveRange: 0, passed: false});
    }
    for (let i = 0; i < CONFIG.coinPoolSize; i++) {
      const mesh = new THREE.Mesh(this.assets.coin, this.assets.mats.coin);
      mesh.visible = false;
      this.scene.add(mesh);
      this.coins.push({mesh, active: false, baseY: 1, phase: Math.random() * 6.28});
    }
  }

  spawnObstacle(type, lane, z, options = {}) {
    const obstacle = this.obstacles.find(item => !item.active);
    if (!obstacle) return null;
    for (const model of Object.values(obstacle.models)) model.visible = false;
    obstacle.models[type].visible = true;
    obstacle.active = true;
    obstacle.root.visible = true;
    obstacle.type = type;
    obstacle.lane = lane;
    obstacle.phase = options.phase || 0;
    obstacle.moveRange = options.moveRange || 0;
    obstacle.passed = false;
    obstacle.root.position.set(CONFIG.lanes[lane], 0, z);
    obstacle.root.rotation.y = type === 'mover' ? Math.PI : 0;
    return obstacle;
  }

  spawnCoin(lane, z, y = 1) {
    const coin = this.coins.find(item => !item.active);
    if (!coin) return null;
    coin.active = true;
    coin.mesh.visible = true;
    coin.baseY = y;
    coin.mesh.position.set(CONFIG.lanes[lane], y, z);
    coin.mesh.scale.setScalar(1);
    return coin;
  }

  coinLine(lane, z, count = 7, y = 1, arc = false, spacing = CONFIG.coinSpacing) {
    for (let i = 0; i < count; i++) {
      const height = arc ? y + Math.sin(i / Math.max(1, count - 1) * Math.PI) * 1.75 : y;
      this.spawnCoin(lane, z - i * spacing, height);
    }
  }

  coinCurve(fromLane, toLane, z, count = 8) {
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const lanePosition = Math.round(fromLane + (toLane - fromLane) * progress);
      this.spawnCoin(clamp(lanePosition, 0, 2), z - i * 3, .95 + Math.sin(progress * Math.PI) * .3);
    }
  }

  generate(distance, speed) {
    const difficulty = clamp((distance - CONFIG.openingDistance) / 1650, 0, 1);
    const z = -CONFIG.spawnAhead;
    const roll = Math.random();
    let kind = '';
    if (roll < .19) kind = 'jump';
    else if (roll < .36) kind = 'slide';
    else if (roll < .61) kind = 'gate';
    else if (roll < .78 && difficulty > .12) kind = 'weave';
    else if (roll < .9 && difficulty > .28) kind = 'mover';
    else kind = 'guide';
    if (kind === this.previousKind && Math.random() < .55) kind = 'guide';
    const lane = Math.floor(Math.random() * 3);
    if (kind === 'jump') {
      this.spawnObstacle('low', lane, z);
      this.coinLine(lane, z - 4, 8, .85, true, 2.7);
      this.lastSafeLane = lane;
    } else if (kind === 'slide') {
      this.spawnObstacle('overhead', lane, z);
      this.coinLine(lane, z - 3, 7, .65, false, 2.7);
      this.lastSafeLane = lane;
    } else if (kind === 'gate') {
      const safe = Math.floor(Math.random() * 3);
      for (let current = 0; current < 3; current++) {
        if (current !== safe) this.spawnObstacle('block', current, z);
      }
      this.coinCurve(this.lastSafeLane, safe, z + 12, 8);
      this.coinLine(safe, z - 5, 4, 1);
      this.lastSafeLane = safe;
    } else if (kind === 'weave') {
      const firstSafe = Math.floor(Math.random() * 3);
      for (let current = 0; current < 3; current++) if (current !== firstSafe) this.spawnObstacle('block', current, z);
      let secondSafe = (firstSafe + (Math.random() > .5 ? 1 : 2)) % 3;
      for (let current = 0; current < 3; current++) if (current !== secondSafe) this.spawnObstacle('block', current, z - 28);
      this.coinCurve(firstSafe, secondSafe, z - 7, 8);
      this.lastSafeLane = secondSafe;
    } else if (kind === 'mover') {
      this.spawnObstacle('mover', lane, z, {moveRange: .68, phase: Math.random() * 6.28});
      const safe = lane === 1 ? (Math.random() > .5 ? 0 : 2) : 1;
      this.coinLine(safe, z + 6, 8, 1);
      this.lastSafeLane = safe;
    } else {
      const target = Math.floor(Math.random() * 3);
      this.coinCurve(this.lastSafeLane, target, z + 14, 9);
      this.lastSafeLane = target;
    }
    this.previousKind = kind;
    const reactionGap = speed * (CONFIG.minimumReactionTime + (1 - difficulty) * .6);
    // Reserve recovery distance after the last row, including the two-row weave.
    this.nextEventDistance += (kind === 'weave' ? 28 : 0) + Math.max(25, reactionGap) + Math.random() * 8;
  }

  update(dt, speed, distance, runner, collide = true) {
    while (distance >= this.nextEventDistance) this.generate(distance, speed);
    const bounds = runner.getBounds();
    let collision = false, collected = 0;
    for (const obstacle of this.obstacles) {
      if (!obstacle.active) continue;
      obstacle.root.position.z += speed * dt;
      if (obstacle.type === 'mover') {
        obstacle.phase += dt * 1.35;
        obstacle.root.position.x = CONFIG.lanes[obstacle.lane] + Math.sin(obstacle.phase) * obstacle.moveRange;
      }
      if (obstacle.root.position.z > CONFIG.despawnZ) {
        obstacle.active = false;
        obstacle.root.visible = false;
        continue;
      }
      const hitbox = TYPES[obstacle.type];
      if (collide && Math.abs(obstacle.root.position.z) < hitbox.halfZ + bounds.maxZ &&
          Math.abs(obstacle.root.position.x - runner.group.position.x) < hitbox.halfX + .29 &&
          bounds.maxY > hitbox.minY && bounds.minY < hitbox.maxY) collision = true;
    }
    for (const coin of this.coins) {
      if (!coin.active) continue;
      coin.mesh.position.z += speed * dt;
      coin.phase += dt * 5;
      coin.mesh.rotation.y += dt * 5;
      coin.mesh.position.y = coin.baseY + Math.sin(coin.phase) * .05;
      if (coin.mesh.position.z > CONFIG.despawnZ) {
        coin.active = false;
        coin.mesh.visible = false;
        continue;
      }
      if (collide && Math.abs(coin.mesh.position.z) < .48 &&
          Math.abs(coin.mesh.position.x - runner.group.position.x) < .55 &&
          Math.abs(coin.mesh.position.y - (runner.y + 1.05)) < 1.05) {
        const worldPosition = coin.mesh.position.clone();
        coin.active = false;
        coin.mesh.visible = false;
        this.particles.burst(worldPosition, 0xf5bd55, 8);
        collected++;
      }
    }
    return {collision, collected};
  }

  reset() {
    this.nextEventDistance = CONFIG.openingDistance;
    this.lastSafeLane = 1;
    this.previousKind = '';
    for (const obstacle of this.obstacles) {
      obstacle.active = false;
      obstacle.root.visible = false;
    }
    for (const coin of this.coins) {
      coin.active = false;
      coin.mesh.visible = false;
    }
    this.coinLine(1, -24, 10, 1, false, 3.2);
  }

  getPoolState() {
    return {
      obstacles: {active: this.obstacles.filter(item => item.active).length, capacity: this.obstacles.length},
      coins: {active: this.coins.filter(item => item.active).length, capacity: this.coins.length}
    };
  }
}
