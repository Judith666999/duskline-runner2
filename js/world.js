import * as THREE from '../vendor/three.module.js';
import {CONFIG} from './config.js';
import {box, cylinder, material, batchStaticGroup} from './geometry.js';

const THEMES = ['东区高架', '暮色廊道', '空中广场', '施工路段'];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.segments = [];
    this.themeIndex = -1;
    this.transform = new THREE.Object3D();
    this.materials = {
      asphalt: material(CONFIG.colors.road),
      concrete: material(0x394a60),
      steel: material(0x25374e),
      painted: material(0xa3aeb1),
      edge: material(0x547e89),
      orange: material(0xbd774d),
      lamp: material(0xffd19a, 0xffad6d),
      cyan: material(0x84c9c1, 0x477e79),
      white: material(0xcabda4),
      sign: material(0x243e52)
    };
    this.createRoad();
    this.createCity();
    this.createTraffic();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1000),
      new THREE.MeshBasicMaterial({color: 0x53617b}));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -18.2, -180);
    scene.add(ground);
    this.reset();
  }

  createRoad() {
    const m = this.materials;
    const prototype = new THREE.Group();
    box(prototype, m.concrete, [11.9, .7, 30.07], [0, -.45, 0]);
    box(prototype, m.asphalt, [10.9, .18, 30.08], [0, -.09, 0]);
    for (const side of [-1, 1]) {
      box(prototype, m.concrete, [.53, .31, 30.08], [side * 5.52, .09, 0]);
      box(prototype, m.edge, [.035, .04, 30], [side * 5.2, .06, 0]);
      box(prototype, m.steel, [.13, .14, 30.03], [side * 5.72, .96, 0], true);
      box(prototype, m.steel, [.1, .1, 30.03], [side * 5.72, .43, 0]);
      for (let z = -13; z <= 13; z += 3.5) {
        box(prototype, m.steel, [.11, .96, .12], [side * 5.72, .47, z], true);
        box(prototype, m.lamp, [.11, .035, .11], [side * 5.17, .075, z]);
      }
      cylinder(prototype, m.steel, .068, 5.5, [side * 6.1, 1.7, -7]);
      const arm = box(prototype, m.steel, [1.75, .11, .1], [side * 5.29, 4.44, -7]);
      arm.rotation.z = side * -.1;
      box(prototype, m.lamp, [.65, .04, .24], [side * 4.56, 4.3, -7]);
      box(prototype, m.steel, [.68, 12, 1.3], [side * 4.2, -6.35, 0]);
    }
    for (const x of [-1.575, 1.575]) {
      for (let z = -13; z < 15; z += 5) {
        box(prototype, m.painted, [.055, .009, 2.3], [x, .009, z]);
      }
    }
    // Small transverse expansion joints, matched at the module boundaries.
    box(prototype, m.steel, [10.6, .008, .028], [0, .006, -15]);
    const roadBatch = batchStaticGroup(prototype);
    const decorations = [0, 1, 2, 3].map(theme => this.createTheme(theme));
    for (let i = 0; i < CONFIG.segmentCount; i++) {
      const group = new THREE.Group();
      group.add(roadBatch.clone());
      const themes = decorations.map(decoration => {
        const cloned = decoration.clone();
        group.add(cloned);
        return cloned;
      });
      this.scene.add(group);
      this.segments.push({group, themes, ordinal: i});
    }
    // A few nearby lights provide accents without dozens of dynamic lights.
    for (const side of [-1, 1]) {
      const light = new THREE.PointLight(0xffc392, 9, 15, 2);
      light.position.set(side * 4.6, 3.9, -9);
      this.scene.add(light);
    }
  }

  createTheme(theme) {
    const group = new THREE.Group(), m = this.materials;
    if (theme === 0) {
      for (const side of [-1, 1]) {
        const billboard = box(group, m.sign, [3, 1.8, .2], [side * 7.8, 4.1, -9]);
        billboard.rotation.y = side * -.25;
        for (let i = 0; i < 3; i++) {
          const line = box(group, i ? m.cyan : m.orange,
            [1.8 - i * .35, .085, .08], [side * 7.8, 4.55 - i * .4, -8.84]);
          line.rotation.y = side * -.25;
        }
        box(group, m.steel, [.17, 5.3, .17], [side * 7.8, 1.45, -9]);
      }
    } else if (theme === 1) {
      for (const z of [-10, 3]) {
        for (const side of [-1, 1]) {
          box(group, m.steel, [.43, 5.9, .55], [side * 5.85, 2.8, z], true);
          const brace = box(group, m.concrete, [1.7, .4, .6], [side * 5.2, 5.48, z], true);
          brace.rotation.z = side * .55;
          box(group, m.cyan, [.08, 3.2, .09], [side * 5.58, 3.45, z + .3]);
        }
        box(group, m.concrete, [10.1, .6, .6], [0, 5.95, z], true);
        box(group, m.lamp, [5, .04, .23], [0, 5.63, z]);
      }
      box(group, m.steel, [12.2, .15, 11], [0, 6.23, -3.5], true);
      for (const side of [-1, 1]) {
        box(group, m.concrete, [.22, 2, 11], [side * 6.05, 4.96, -3.5]);
      }
    } else if (theme === 2) {
      for (const side of [-1, 1]) {
        box(group, m.concrete, [4.8, .25, 22], [side * 8.3, -.35, 0]);
        for (const z of [-8, 6]) {
          cylinder(group, m.steel, .15, 7.4, [side * 9.2, 3.15, z]);
          box(group, m.orange, [2.1, 3.7, .06], [side * 9.2, 3.9, z]);
          box(group, m.white, [1.5, .14, .08], [side * 9.2, 4.5, z + .05]);
          box(group, m.cyan, [1.1, .11, .08], [side * 9.2, 4, z + .05]);
          box(group, m.steel, [2.5, .4, 1.2], [side * 7.7, .24, z - 2]);
        }
      }
    } else {
      for (const side of [-1, 1]) {
        for (const z of [-10, -2, 7]) {
          box(group, m.orange, [1.7, .65, .8], [side * 6.8, .18, z]);
          box(group, m.white, [1.3, .13, .85], [side * 6.8, .22, z]);
          cylinder(group, m.steel, .06, 1.6, [side * 6.8, 1.28, z]);
          box(group, m.lamp, [.23, .23, .2], [side * 6.8, 2.1, z]);
        }
        box(group, m.steel, [1.8, 3.6, 2.8], [side * 8.8, 1.2, -4]);
        const boom = box(group, m.orange, [.18, 9.8, .19], [side * 10, 4.3, 5]);
        boom.rotation.z = side * -.35;
      }
    }
    return batchStaticGroup(group);
  }

  configureSegment(segment, ordinal) {
    segment.ordinal = ordinal;
    const theme = Math.floor(Math.max(0, ordinal - 5) / 4) % 4;
    segment.themes.forEach((mesh, index) => mesh.visible = index === theme);
  }

  createCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.city = new THREE.InstancedMesh(geometry, material(0x34475e), 66);
    this.roofs = new THREE.InstancedMesh(geometry, material(0x293b52), 66);
    this.windows = new THREE.InstancedMesh(geometry,
      new THREE.MeshBasicMaterial({color: 0xc8a682}), 66 * 16);
    this.city.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.roofs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.city.frustumCulled = this.roofs.frustumCulled = this.windows.frustumCulled = false;
    this.buildings = Array.from({length: 66}, (_, i) => ({
      side: i % 2 ? 1 : -1,
      x: (i % 2 ? 1 : -1) * (13 + Math.random() * 44),
      z: 12 - Math.floor(i / 2) * 8.4,
      width: 4 + Math.random() * 6,
      depth: 4 + Math.random() * 7,
      height: 17 + Math.random() * 40,
      tint: .55 + Math.random() * .5,
      seed: Math.random() * 6.28
    }));
    const color = new THREE.Color();
    this.buildings.forEach((building, i) => {
      color.setHex([0x3e5065, 0x35475e, 0x2d415c, 0x554e5c][i % 4]);
      color.multiplyScalar(building.tint);
      this.city.setColorAt(i, color);
      this.roofs.setColorAt(i, color.multiplyScalar(.72));
    });
    this.scene.add(this.city, this.roofs, this.windows);
    // A fixed distant skyline sits behind the moving foreground architecture.
    const horizon = new THREE.InstancedMesh(geometry, material(0x67768e), 50);
    for (let i = 0; i < 50; i++) {
      const height = 20 + Math.random() * 44;
      this.setInstance(horizon, i, [(i - 25) * 7.5, height / 2 - 18, -244 - Math.random() * 25],
        [4 + Math.random() * 7, height, 8]);
    }
    this.scene.add(horizon);
    this.updateBuildings(0);
  }

  setInstance(mesh, index, position, scale) {
    this.transform.position.set(...position);
    this.transform.scale.set(...scale);
    this.transform.rotation.set(0, 0, 0);
    this.transform.updateMatrix();
    mesh.setMatrixAt(index, this.transform.matrix);
  }

  updateBuildings(movement) {
    this.buildings.forEach((b, i) => {
      b.z += movement * .72;
      if (b.z > 30) b.z -= 277.2;
      this.setInstance(this.city, i, [b.x, b.height / 2 - 18, b.z], [b.width, b.height, b.depth]);
      this.setInstance(this.roofs, i, [b.x, b.height - 18 + .7, b.z], [b.width * .75, 1.4, b.depth * .8]);
      for (let j = 0; j < 16; j++) {
        const column = j % 4, row = Math.floor(j / 4);
        this.setInstance(this.windows, i * 16 + j,
          [b.x + (column - 1.5) * b.width * .2, b.height - 21 - row * 3.3, b.z + b.depth / 2 + .014],
          [b.width * .1, .16, .026]);
      }
    });
    this.city.instanceMatrix.needsUpdate = true;
    this.roofs.instanceMatrix.needsUpdate = true;
    this.windows.instanceMatrix.needsUpdate = true;
  }

  createTraffic() {
    const group = new THREE.Group(), m = this.materials;
    box(group, m.painted, [1.35, .4, 2.8], [0, .15, 0]);
    box(group, m.sign, [1.12, .35, 1.2], [0, .5, -.16]);
    for (const side of [-1, 1]) {
      box(group, m.steel, [.2, .3, 2.1], [side * .8, 0, 0]);
      box(group, m.cyan, [.2, .035, 1.2], [side * .8, -.16, 0]);
      box(group, m.lamp, [.28, .09, .03], [side * .4, .2, 1.42]);
    }
    const prototype = batchStaticGroup(group);
    this.traffic = [];
    for (let i = 0; i < 6; i++) {
      const mesh = prototype.clone();
      const y = -2 + i % 3 * 3.2;
      mesh.position.set((i % 2 ? 1 : -1) * (10 + i * 2.4), y, -20 - i * 33);
      this.scene.add(mesh);
      this.traffic.push({mesh, y, speed: 5 + i * 1.4});
    }
  }

  update(dt, speed, distance) {
    const movement = speed * dt;
    this.time += dt;
    for (const segment of this.segments) {
      segment.group.position.z += movement;
      if (segment.group.position.z > 30) {
        segment.group.position.z -= CONFIG.segmentLength * CONFIG.segmentCount;
        this.configureSegment(segment, segment.ordinal + CONFIG.segmentCount);
      }
    }
    this.updateBuildings(movement);
    for (const vehicle of this.traffic) {
      vehicle.mesh.position.z += (speed * .6 + vehicle.speed) * dt;
      if (vehicle.mesh.position.z > 30) vehicle.mesh.position.z -= 250;
      vehicle.mesh.position.y = vehicle.y + Math.sin(this.time * 1.3 + vehicle.speed) * .2;
    }
    const theme = Math.floor(Math.max(0, distance - 150) / 120) % 4;
    if (theme !== this.themeIndex) {
      this.themeIndex = theme;
      return THEMES[theme];
    }
    return null;
  }

  reset() {
    this.time = 0;
    this.themeIndex = -1;
    this.segments.forEach((segment, i) => {
      segment.group.position.z = 15 - i * CONFIG.segmentLength;
      this.configureSegment(segment, i);
    });
    this.buildings.forEach((b, i) => b.z = 12 - Math.floor(i / 2) * 8.4);
    this.updateBuildings(0);
  }
}
