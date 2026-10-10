import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, COLORS, damp } from './config.js';

export class Character {
  constructor(scene, audio, particles) {
    this.audio = audio; this.particles = particles; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    const blue = new THREE.MeshStandardMaterial({ color: 0x324f65, roughness: .85, flatShading: true });
    const orange = new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: .72, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x172c3e, roughness: .7 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xe9d5b3, roughness: .8 });
    const light = new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: .65 });
    this.part = (size, position, material, parent = this.body) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh); return mesh; };
    this.part([.7, .78, .45], [0, 1.35, 0], blue);
    this.part([.73, .18, .48], [0, 1.53, 0], orange);
    this.part([.68, .09, .49], [0, 1.14, 0], dark);
    const helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 1), orange); helmet.position.y = 2; helmet.scale.set(1, 1.07, .95); helmet.castShadow = true; this.body.add(helmet);
    this.part([.49, .16, .08], [0, 2.04, -.29], dark);
    this.part([.28, .055, .08], [0, 2.15, .3], cream);
    this.part([.44, .52, .21], [0, 1.37, .32], dark);
    this.part([.31, .04, .025], [0, 1.48, .44], light);
    this.arms = []; this.legs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .47, 1.65, 0); this.body.add(arm);
      this.part([.22, .4, .24], [0, -.19, 0], orange, arm);
      this.part([.18, .34, .2], [0, -.52, 0], blue, arm);
      this.part([.2, .15, .22], [0, -.73, 0], dark, arm); this.arms.push(arm);
      const leg = new THREE.Group(); leg.position.set(side * .21, 1.04, 0); this.body.add(leg);
      this.part([.25, .43, .26], [0, -.2, 0], dark, leg);
      this.part([.24, .36, .24], [0, -.57, 0], blue, leg);
      this.part([.29, .15, .46], [0, -.88, -.08], cream, leg);
      this.part([.3, .055, .46], [0, -.98, -.08], orange, leg); this.legs.push(leg);
    }
    this.scarf = this.part([.24, .05, .62], [.2, 1.79, .55], cream);
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x071018, transparent: true, opacity: .32, depthWrite: false });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.66, 20), shadowMaterial); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.set(0, CONFIG.roadTop + .012, CONFIG.playerZ); scene.add(this.shadow);
    this.reset();
  }
  reset() {
    this.lane = 1; this.laneQueue = []; this.laneDelay = 0; this.y = 0; this.velocity = 0; this.slideTime = 0; this.jumpBuffer = 0; this.slideBuffer = 0; this.phase = 0; this.crashTime = 0; this.lean = 0;
    this.root.position.set(0, CONFIG.roadTop, CONFIG.playerZ); this.root.rotation.set(0, 0, 0); this.body.scale.set(1, 1, 1); this.body.rotation.set(0, 0, 0); this.shadow.position.x = 0; this.pose(0, 'menu', CONFIG.startSpeed);
  }
  command(action) {
    if (action === 'left' || action === 'right') { if (this.laneQueue.length < 2) this.laneQueue.push(action === 'right' ? 1 : -1); }
    else if (action === 'jump') { this.slideBuffer = 0; this.jumpBuffer = CONFIG.inputBuffer; }
    else if (action === 'slide') { this.jumpBuffer = 0; this.slideBuffer = CONFIG.inputBuffer; }
  }
  clearInput() { this.laneQueue.length = 0; this.jumpBuffer = 0; this.slideBuffer = 0; }
  update(dt, speed) {
    this.phase += dt * speed * .48; this.laneDelay = Math.max(0, this.laneDelay - dt);
    if (this.laneQueue.length && this.laneDelay === 0) { this.lane = THREE.MathUtils.clamp(this.lane + this.laneQueue.shift(), 0, 2); this.laneDelay = .085; }
    const previousX = this.root.position.x;
    this.root.position.x = damp(previousX, CONFIG.lanes[this.lane], CONFIG.laneResponse, dt);
    this.lean = damp(this.lean, -(this.root.position.x - previousX) / dt * .022, 12, dt);
    if (this.jumpBuffer > 0 && this.y < .015 && this.slideTime === 0) { this.velocity = CONFIG.jumpVelocity; this.jumpBuffer = 0; this.audio.effect('jump'); }
    if (this.slideBuffer > 0 && this.y < .015) { this.slideTime = CONFIG.slideDuration; this.slideBuffer = 0; this.audio.effect('slide'); }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt); this.slideBuffer = Math.max(0, this.slideBuffer - dt);
    if (this.velocity !== 0 || this.y > 0) {
      this.y += this.velocity * dt - .5 * CONFIG.gravity * dt * dt; this.velocity -= CONFIG.gravity * dt;
      if (this.y <= 0) { this.y = 0; this.velocity = 0; this.audio.effect('land'); this.particles.burst(this.root.position, COLORS.cyan, 5, .4); }
    }
    this.slideTime = Math.max(0, this.slideTime - dt); this.root.position.y = CONFIG.roadTop + this.y;
    this.pose(dt, 'running', speed);
  }
  pose(dt, state) {
    if (state === 'paused' || state === 'over') return;
    if (state === 'menu') this.phase += dt * 2.2;
    const sliding = this.slideTime > 0, airborne = this.y > .03;
    this.body.scale.y = damp(this.body.scale.y, sliding ? .34 : 1, 30, dt || 1);
    this.body.rotation.z = damp(this.body.rotation.z, this.lean, 12, dt || 1);
    this.body.rotation.x = damp(this.body.rotation.x, sliding ? -.26 : airborne ? (this.velocity > 0 ? -.1 : .1) : .035, 12, dt || 1);
    this.body.position.y = sliding || airborne ? 0 : Math.sin(this.phase * 2) * (state === 'running' ? .045 : .012);
    const stride = Math.sin(this.phase) * (state === 'running' ? .63 : .07);
    this.arms.forEach((arm, i) => { arm.rotation.x = sliding ? -1.0 : airborne ? -.5 : stride * (i ? -1 : 1); arm.rotation.z = (i ? -1 : 1) * .1; });
    this.legs.forEach((leg, i) => { leg.rotation.x = sliding ? -.35 : airborne ? (i ? -.45 : .65) : stride * (i ? 1 : -1); });
    this.scarf.rotation.x = Math.sin(this.phase * 1.4) * .12;
    this.shadow.position.x = this.root.position.x; this.shadow.scale.setScalar(1 - this.y * .1); this.shadow.material.opacity = .32 - this.y * .05;
  }
  crash(dt) { this.crashTime += dt; this.root.rotation.z = damp(this.root.rotation.z, .7, 5, dt); this.body.rotation.x = damp(this.body.rotation.x, -.65, 5, dt); this.body.position.y = damp(this.body.position.y, -.2, 4, dt); }
  bounds() {
    const height = this.slideTime > 0 ? CONFIG.slideHeight : CONFIG.playerHeight;
    return { x: this.root.position.x, z: CONFIG.playerZ, bottom: this.y + CONFIG.roadTop, top: this.y + CONFIG.roadTop + height, halfWidth: CONFIG.playerWidth * .5, halfDepth: CONFIG.playerDepth * .5 };
  }
}
