import * as THREE from './vendor/three.module.js';
import {CONFIG, damp} from './js/config.js';
import {AudioSystem} from './js/audio.js';
import {InputController} from './js/input.js';
import {ParticleSystem} from './js/particles.js';
import {Runner} from './js/character.js';
import {World} from './js/world.js';
import {CourseDirector} from './js/director.js';
import {UI} from './js/ui.js';

class DusklineGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ui = new UI();
    this.audio = new AudioSystem();
    this.input = new InputController(this.canvas);
    this.clock = new THREE.Clock();
    this.state = 'loading';
    this.best = this.readBest();
    this.stats = {score: 0, coins: 0, distance: 0};
    this.speed = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.crashTimer = 0;
    this.shake = 0;
    this.accumulator = 0;
    this.setupRenderer();
    this.setupScene();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.pause(false);
    });
    window.addEventListener('blur', () => {
      if (this.state === 'running') this.pause(false);
    });
    requestAnimationFrame(() => {
      this.state = 'menu';
      this.ui.ready(this.best);
    });
    window.__DUSKLINE__ = this.createDebugAPI();
    this.loop();
  }

  readBest() {
    try { return Number(localStorage.getItem('duskline-best')) || 0; }
    catch { return 0; }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true, powerPreference: 'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.colors.sky);
    this.scene.fog = new THREE.Fog(CONFIG.colors.fog, 48, 250);
    this.camera = new THREE.PerspectiveCamera(58, 1, .1, 330);
    this.camera.position.set(0, 4.3, 8.4);
    this.createSky();
    this.scene.add(new THREE.HemisphereLight(0xdbe4ef, 0x263a4e, 2.8));
    const sun = new THREE.DirectionalLight(0xffc6a2, 3.9);
    sun.position.set(-16, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -4;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -.0004;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(CONFIG.colors.cyan, 1.25);
    rim.position.set(12, 7, -10);
    this.scene.add(rim);
    this.world = new World(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.runner = new Runner(this.scene);
    this.director = new CourseDirector(this.scene, this.particles, this.audio);
    this.cameraAim = new THREE.Vector3();
  }

  createSky() {
    const geometry = new THREE.SphereGeometry(300, 32, 16);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: {value: new THREE.Color(0x233a5d)},
        dusk: {value: new THREE.Color(0xf0a079)},
        haze: {value: new THREE.Color(0x8190aa)}
      },
      vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: [
        'varying vec3 p;uniform vec3 zenith;uniform vec3 dusk;uniform vec3 haze;',
        'void main(){float h=normalize(p).y;vec3 c=h>0.?mix(dusk,zenith,smoothstep(0.,.55,h)):mix(dusk,haze,smoothstep(0.,.35,-h));gl_FragColor=vec4(c,1.);',
        '#include <tonemapping_fragment>',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
    this.scene.add(new THREE.Mesh(geometry, material));
    const sun = new THREE.Mesh(new THREE.CircleGeometry(8.5, 32),
      new THREE.MeshBasicMaterial({color: 0xffd0a0, fog: false}));
    sun.position.set(-58, 28, -220);
    this.scene.add(sun);
    const dustGeometry = new THREE.BufferGeometry(), positions = [];
    for (let i = 0; i < 130; i++) positions.push((Math.random() - .5) * 100, Math.random() * 23, -Math.random() * 180 - 10);
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0xffd2ad, size: .12, transparent: true, opacity: .32, depthWrite: false
    }));
    this.scene.add(this.dust);
  }

  bindUI() {
    const byId = id => document.getElementById(id);
    byId('start-button').onclick = () => this.start();
    byId('restart-button').onclick = () => this.start();
    byId('pause-restart-button').onclick = () => this.start();
    byId('back-button').onclick = () => this.menu();
    byId('pause-button').onclick = () => this.pause(true);
    byId('resume-button').onclick = () => this.resume();
    byId('sound-button').onclick = () => {
      this.audio.setEnabled(!this.audio.enabled);
      this.ui.setSound(this.audio.enabled);
      this.audio.play('button');
    };
    this.ui.setSound(this.audio.enabled);
  }

  start() {
    this.audio.unlock();
    this.audio.play('start');
    this.input.clear();
    this.runner.reset();
    this.world.reset();
    this.director.reset();
    this.particles.reset();
    this.stats = {score: 0, coins: 0, distance: 0};
    this.speed = CONFIG.baseSpeed;
    this.combo = this.comboTimer = this.crashTimer = this.shake = this.accumulator = 0;
    this.state = 'running';
    this.audio.reset();
    this.ui.resetTransient();
    this.ui.showGame();
    this.ui.updateStats(0, 0, 0);
    this.clock.getDelta();
  }

  pause(withSound = true) {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.input.clear();
    this.ui.showPause();
    if (withSound) this.audio.play('button');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.input.clear();
    this.ui.hidePause();
    this.clock.getDelta();
    this.audio.play('button');
  }

  menu() {
    this.state = 'menu';
    this.input.clear();
    this.director.reset();
    this.runner.reset();
    this.ui.showMenu(this.best);
    this.audio.play('button');
  }

  crash() {
    if (this.state !== 'running') return;
    this.state = 'crashed';
    this.crashTimer = .9;
    this.shake = .32;
    this.audio.play('hit');
    this.ui.flash();
  }

  finish() {
    const score = Math.floor(this.stats.score), isRecord = score > this.best;
    if (isRecord) {
      this.best = score;
      try { localStorage.setItem('duskline-best', String(this.best)); } catch {}
      this.audio.play('record');
    }
    this.state = 'gameover';
    this.ui.gameOver({...this.stats, score, best: this.best}, isRecord);
  }

  handleInput() {
    let action;
    while ((action = this.input.consume())) {
      if (action === 'confirm') {
        if (this.state === 'menu' || this.state === 'gameover') this.start();
      } else if (action === 'pause') {
        if (this.state === 'running') this.pause(true);
        else if (this.state === 'paused') this.resume();
      } else if (this.state === 'running') this.runner.request(action);
    }
  }

  collect(count) {
    for (let i = 0; i < count; i++) {
      this.stats.coins++;
      this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
      this.comboTimer = 1.5;
      this.stats.score += CONFIG.coinValue * Math.min(3, 1 + Math.floor(this.combo / 5) * .35);
      this.audio.play('coin');
    }
    if (this.combo >= 5 && (this.combo % 3 === 0 || count > 1)) this.ui.showCombo(this.combo);
  }

  simulate(dt) {
    this.handleInput();
    if (this.state === 'running') {
      this.speed = Math.min(CONFIG.maxSpeed, this.speed + CONFIG.acceleration * dt);
      this.stats.distance += this.speed * dt;
      this.stats.score += this.speed * dt * CONFIG.distanceScore;
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.combo = 0;
      this.runner.update(dt, this.speed, 'running');
      const feedback = this.runner.consumeFeedback();
      if (feedback === 'jump' || feedback === 'slide') this.audio.play(feedback);
      if (feedback === 'land') this.particles.burst(new THREE.Vector3(this.runner.group.position.x, .12, 0), 0xd8c2a2, 5);
      const course = this.director.update(dt, this.speed, this.stats.distance, this.runner, true);
      if (course.collected) this.collect(course.collected);
      if (course.collision) this.crash();
      const label = this.world.update(dt, this.speed, this.stats.distance);
      if (label) this.ui.showSegment(label);
      this.particles.update(dt);
      this.audio.update(dt, true);
      this.ui.updateStats(Math.floor(this.stats.score), this.stats.coins, this.stats.distance);
    } else if (this.state === 'crashed') {
      this.speed = damp(this.speed, 0, 6.5, dt);
      this.crashTimer -= dt;
      this.runner.update(dt, this.speed, 'crashed');
      this.director.update(dt, this.speed, this.stats.distance, this.runner, false);
      this.world.update(dt, this.speed, this.stats.distance);
      this.particles.update(dt);
      if (this.crashTimer <= 0) this.finish();
    } else if (this.state === 'menu') {
      this.runner.update(dt, 0, 'idle');
      this.world.update(dt, 1.6, 0);
      this.director.update(dt, 1.6, 0, this.runner, false);
      this.particles.update(dt);
    }
  }

  updateCamera(dt) {
    const menu = this.state === 'menu';
    const targetFov = this.baseFov + Math.max(0, this.speed - CONFIG.baseSpeed) * .45;
    this.camera.fov = damp(this.camera.fov, targetFov, 2.7, dt);
    this.camera.updateProjectionMatrix();
    const targetX = menu ? 1.1 : this.runner.group.position.x * .19;
    const targetY = menu ? 3.85 : 4.25 + this.runner.y * .1;
    this.camera.position.x = damp(this.camera.position.x, targetX, 5, dt);
    this.camera.position.y = damp(this.camera.position.y, targetY, 5, dt);
    this.camera.position.z = damp(this.camera.position.z, this.cameraDistance, 5, dt);
    if (this.shake > 0) {
      this.shake -= dt;
      const strength = this.shake * .22;
      this.camera.position.x += (Math.random() - .5) * strength;
      this.camera.position.y += (Math.random() - .5) * strength;
    }
    this.cameraAim.set(menu ? -.25 : this.runner.group.position.x * .08, 1.35 + this.runner.y * .07, -7.4);
    this.camera.lookAt(this.cameraAim);
    this.dust.rotation.y += dt * .004;
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.6));
    this.camera.aspect = innerWidth / innerHeight;
    // Pull back on narrow portrait screens so all three lanes and the runner stay visible.
    this.baseFov = this.camera.aspect < .72 ? 68 : 58;
    this.cameraDistance = this.camera.aspect < .72 ? 10.7 : 8.4;
    this.camera.updateProjectionMatrix();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    document.body.dataset.state = this.state;
    const frameDt = Math.min(.08, this.clock.getDelta());
    if (this.state !== 'paused' && this.state !== 'gameover') {
      this.accumulator = Math.min(.12, this.accumulator + frameDt);
      while (this.accumulator >= CONFIG.fixedStep) {
        this.simulate(CONFIG.fixedStep);
        this.accumulator -= CONFIG.fixedStep;
      }
    } else this.handleInput();
    this.updateCamera(frameDt);
    this.ui.tick(frameDt);
    this.renderer.render(this.scene, this.camera);
  }

  createDebugAPI() {
    return Object.freeze({
      version: '1.0.0',
      getState: () => ({
        state: this.state, score: Math.floor(this.stats.score), coins: this.stats.coins,
        distance: Math.floor(this.stats.distance), lane: this.runner.lane,
        y: Number(this.runner.y.toFixed(2)), sliding: this.runner.sliding,
        speed: Number(this.speed.toFixed(2)), pool: this.director.getPoolState(),
        renderer: this.renderer.info.render
      }),
      start: () => this.start(),
      action: action => this.input.push(action),
      forceCollision: () => this.crash(),
      clearCourse: () => this.director.reset()
    });
  }
}

new DusklineGame();
