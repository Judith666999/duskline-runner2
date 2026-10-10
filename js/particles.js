import * as THREE from '../vendor/three.module.js';
import {CONFIG} from './config.js';
export class ParticleSystem{
  constructor(scene){this.cursor=0;this.items=[];const geo=new THREE.IcosahedronGeometry(.07,0);for(let i=0;i<CONFIG.particleCount;i++){const mat=new THREE.MeshBasicMaterial({color:CONFIG.colors.orange,transparent:true,opacity:0});const m=new THREE.Mesh(geo,mat);m.visible=false;scene.add(m);this.items.push({mesh:m,life:0,vel:new THREE.Vector3()})}}
  burst(pos,color=CONFIG.colors.orange,count=10){for(let i=0;i<count;i++){const p=this.items[this.cursor++%this.items.length];p.mesh.visible=true;p.mesh.position.copy(pos);p.mesh.material.color.setHex(color);p.mesh.material.opacity=1;p.mesh.scale.setScalar(.7+Math.random()*1.7);p.life=.38+Math.random()*.28;p.vel.set((Math.random()-.5)*4,1+Math.random()*4,(Math.random()-.5)*3)}}
  update(dt){for(const p of this.items){if(p.life<=0)continue;p.life-=dt;p.vel.y-=8*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=dt*6;p.mesh.material.opacity=Math.max(0,p.life*2.2);if(p.life<=0)p.mesh.visible=false}}
  reset(){for(const p of this.items){p.life=0;p.mesh.visible=false}}
}
