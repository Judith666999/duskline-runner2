import * as THREE from '../vendor/three.module.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
export const material = (color, emissive = 0) => new THREE.MeshStandardMaterial({
  color, roughness: 0.78, metalness: 0.1, emissive,
  emissiveIntensity: emissive ? 0.55 : 0
});

export function box(parent, mat, size, position, castsShadow = false) {
  const mesh = new THREE.Mesh(boxGeometry, mat);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = castsShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, mat, radius, height, position) {
  const mesh = new THREE.Mesh(cylinderGeometry, mat);
  mesh.scale.set(radius, height, radius);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Merge static primitives by material. Dynamic pooled groups are kept separate.
export function batchStaticGroup(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(node => {
    if (!node.isMesh || Array.isArray(node.material)) return;
    if (!buckets.has(node.material)) buckets.set(node.material, []);
    buckets.get(node.material).push(node);
  });
  const result = new THREE.Group();
  const inverse = group.matrixWorld.clone().invert();
  for (const [mat, meshes] of buckets) {
    const positions = [], normals = [], uvs = [], indices = [];
    let offset = 0, castsShadow = false;
    for (const mesh of meshes) {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      positions.push(...geometry.attributes.position.array);
      normals.push(...geometry.attributes.normal.array);
      if (geometry.attributes.uv) uvs.push(...geometry.attributes.uv.array);
      for (const index of geometry.index.array) indices.push(index + offset);
      offset += geometry.attributes.position.count;
      castsShadow ||= mesh.castShadow;
      geometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    if (uvs.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;
    result.add(mesh);
  }
  return result;
}
