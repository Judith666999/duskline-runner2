import * as THREE from '../vendor/three.module.js';
import {CONFIG, damp, clamp} from './config.js';
import {box, cylinder, material} from './geometry.js';

export class Runner {
  constructor(scene) {
    this.group = new THREE.Group();
    this.rig = new THREE.Group();
    this.group.add(this.rig);
    scene.add(this.group);
    this.build();
    this.reset();
  }

  build() {
    const jacket = material(0xd28656), dark = material(0x243448), cream = material(0xdad0b7);
    const gloves = material(0x132437), visor = material(0x78b9b7, 0x244b4c);
    this.hips = box(this.rig, dark, [.58, .34, .37], [0, 1.03, 0], true);
    this.torso = new THREE.Group();
    this.torso.position.y = 1.5;
    this.rig.add(this.torso);
    box(this.torso, jacket, [.7, .76, .4], [0, 0, 0], true);
    box(this.torso, cream, [.7, .07, .43], [0, -.28, 0]);
    box(this.torso, dark, [.5, .52, .19], [0, -.03, .29], true);
    box(this.torso, cream, [.12, .15, .02], [0, .06, .393]);
    box(this.torso, visor, [.26, .035, .024], [0, -.08, .4]);
    cylinder(this.rig, dark, .12, .16, [0, 1.98, 0]);
    this.head = new THREE.Group();
    this.head.position.y = 2.22;
    this.rig.add(this.head);
    const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(.33, 0), cream);
    shell.scale.set(1, 1.08, .94);
    shell.castShadow = true;
    this.head.add(shell);
    box(this.head, gloves, [.46, .16, .12], [0, .03, -.28], true);
    box(this.head, visor, [.42, .07, .025], [0, .04, -.346]);
    box(this.head, jacket, [.16, .43, .06], [0, .03, .297]);
    this.scarf = box(this.rig, cream, [.2, .045, .7], [.3, 1.94, .32]);
    this.scarf.rotation.x = .1;
    this.leftArm = this.createLimb(-.44, 1.82, .4, .35, jacket, dark, gloves, true);
    this.rightArm = this.createLimb(.44, 1.82, .4, .35, jacket, dark, gloves, true);
    this.leftLeg = this.createLimb(-.18, 1.07, .48, .48, dark, dark, cream, false);
    this.rightLeg = this.createLimb(.18, 1.07, .48, .48, dark, dark, cream, false);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x07131f, transparent: true, opacity: .27, depthWrite: false
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.54, 20), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = .024;
    this.group.add(this.shadow);
  }

  createLimb(x, y, upperLength, lowerLength, upperMat, lowerMat, tipMat, arm) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    this.rig.add(pivot);
    cylinder(pivot, upperMat, arm ? .105 : .12, upperLength, [0, -upperLength / 2, 0]);
    const joint = new THREE.Group();
    joint.position.y = -upperLength;
    pivot.add(joint);
    cylinder(joint, lowerMat, arm ? .085 : .095, lowerLength, [0, -lowerLength / 2, 0]);
    box(joint, tipMat, arm ? [.17, .2, .16] : [.24, .15, .4],
      [0, -lowerLength + .01, arm ? 0 : -.08], true);
    return {pivot, joint};
  }

  reset() {
    this.lane = 1;
    this.targetX = 0;
    this.y = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.slideTime = 0;
    this.sliding = false;
    this.phase = 0;
    this.lean = 0;
    this.stumble = 0;
    this.jumpBuffer = this.slideBuffer = this.laneCooldown = 0;
    this.pendingLane = null;
    this.feedback = null;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.rig.scale.set(1, 1, 1);
    this.pose(0, 0, false);
  }

  request(action) {
    if (action === 'left' || action === 'right') {
      if (this.laneCooldown > 0) this.pendingLane = {action, remaining: CONFIG.inputBuffer};
      else this.changeLane(action);
    } else if (action === 'jump') {
      this.jumpBuffer = CONFIG.inputBuffer;
    } else if (action === 'slide') {
      this.slideBuffer = this.grounded ? CONFIG.inputBuffer : .55;
      if (!this.grounded) this.velocityY = Math.min(this.velocityY, -5.5);
    }
  }

  changeLane(action) {
    this.lane = clamp(this.lane + (action === 'left' ? -1 : 1), 0, 2);
    this.targetX = CONFIG.lanes[this.lane];
    this.laneCooldown = .095;
  }

  update(dt, speed, mode = 'running') {
    this.laneCooldown = Math.max(0, this.laneCooldown - dt);
    if (this.pendingLane) {
      this.pendingLane.remaining -= dt;
      if (this.laneCooldown === 0 && this.pendingLane.remaining > 0) {
        this.changeLane(this.pendingLane.action);
        this.pendingLane = null;
      } else if (this.pendingLane.remaining <= 0) this.pendingLane = null;
    }
    if (mode === 'running') {
      if (this.jumpBuffer > 0 && this.grounded && this.slideTime < .12) {
        this.sliding = false;
        this.slideTime = 0;
        this.velocityY = CONFIG.jumpVelocity;
        this.grounded = false;
        this.jumpBuffer = 0;
        this.feedback = 'jump';
      } else if (this.slideBuffer > 0 && this.grounded && this.slideTime <= 0) {
        this.sliding = true;
        this.slideTime = CONFIG.slideDuration;
        this.slideBuffer = 0;
        this.feedback = 'slide';
      }
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      this.slideBuffer = Math.max(0, this.slideBuffer - dt);
      if (!this.grounded) {
        this.velocityY -= CONFIG.gravity * dt;
        this.y += this.velocityY * dt;
        if (this.y <= 0) {
          this.y = this.velocityY = 0;
          this.grounded = true;
          this.feedback = 'land';
        }
      }
      if (this.slideTime > 0) {
        this.slideTime -= dt;
        this.sliding = this.slideTime > 0;
      }
    }
    const difference = this.targetX - this.group.position.x;
    this.group.position.x = damp(this.group.position.x, this.targetX, CONFIG.laneSharpness, dt);
    this.group.position.y = this.y;
    this.lean = damp(this.lean, clamp(-difference * .19, -.3, .3), 11, dt);
    this.phase += dt * (mode === 'running' ? speed * .7 : 1.5);
    this.pose(dt, speed, mode === 'running');
    if (mode === 'crashed') {
      this.stumble += dt;
      this.rig.rotation.x = damp(this.rig.rotation.x, -.96, 5, dt);
      this.rig.rotation.z = damp(this.rig.rotation.z, .52, 5, dt);
      this.rig.position.y = damp(this.rig.position.y, -.5, 5, dt);
    }
    this.shadow.position.y = -this.y + .024;
    this.shadow.scale.setScalar(clamp(1 - this.y * .13, .55, 1));
    this.shadow.material.opacity = clamp(.27 - this.y * .07, .06, .27);
  }

  pose(dt, speed, running) {
    const stride = Math.sin(this.phase);
    const activity = running ? 1 : .08;
    this.rig.rotation.z = this.lean;
    this.rig.rotation.x = damp(this.rig.rotation.x, this.sliding ? .2 : -.025, 17, dt || 1);
    this.rig.scale.y = damp(this.rig.scale.y, this.sliding ? .45 : 1, 28, dt || 1);
    this.rig.position.y = this.sliding ? .015 : (running && this.grounded ? Math.abs(stride) * .065 : Math.sin(this.phase) * .015);
    this.torso.rotation.y = running ? Math.sin(this.phase) * .055 : -.08;
    this.torso.rotation.x = this.grounded ? -.06 : clamp(-this.velocityY * .008, -.1, .12);
    this.head.rotation.z = -this.lean * .35;
    this.scarf.rotation.x = -.12 + Math.sin(this.phase * 1.7) * .12;
    if (this.sliding) {
      this.leftLeg.pivot.rotation.x = -1.15;
      this.rightLeg.pivot.rotation.x = -.6;
      this.leftLeg.joint.rotation.x = .2;
      this.rightLeg.joint.rotation.x = 1.1;
      this.leftArm.pivot.rotation.x = .6;
      this.rightArm.pivot.rotation.x = .8;
    } else if (!this.grounded) {
      this.leftLeg.pivot.rotation.x = -.45;
      this.rightLeg.pivot.rotation.x = .25;
      this.leftLeg.joint.rotation.x = .65;
      this.rightLeg.joint.rotation.x = .6;
      this.leftArm.pivot.rotation.x = -.8;
      this.rightArm.pivot.rotation.x = -.6;
    } else {
      this.leftLeg.pivot.rotation.x = stride * .82 * activity;
      this.rightLeg.pivot.rotation.x = -stride * .82 * activity;
      this.leftLeg.joint.rotation.x = Math.max(0, -stride) * .95 * activity;
      this.rightLeg.joint.rotation.x = Math.max(0, stride) * .95 * activity;
      this.leftArm.pivot.rotation.x = -stride * .65 * activity;
      this.rightArm.pivot.rotation.x = stride * .65 * activity;
    }
    this.leftArm.joint.rotation.x = -.45;
    this.rightArm.joint.rotation.x = -.45;
  }

  consumeFeedback() {
    const feedback = this.feedback;
    this.feedback = null;
    return feedback;
  }

  getBounds() {
    return {
      minX: this.group.position.x - .31, maxX: this.group.position.x + .31,
      minY: this.y + .1, maxY: this.y + (this.sliding ? 1.15 : 2.5),
      minZ: -.27, maxZ: .27
    };
  }
}
