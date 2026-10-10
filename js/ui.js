export class UI{
  constructor(){this.ids=['loading-screen','menu-screen','hud','pause-screen','gameover-screen','score-value','coin-value','distance-value','menu-best','result-score','result-distance','result-coins','result-best','result-kicker','result-title','combo','segment-label','record-banner','sound-button','game-shell'];for(const id of this.ids)this[id]=document.getElementById(id);this.comboTimer=0;this.segmentTimer=0}
  hideAll(){for(const id of['menu-screen','hud','pause-screen','gameover-screen'])this[id].hidden=true}
  ready(best){this['loading-screen'].style.opacity='0';setTimeout(()=>{this['loading-screen'].hidden=true;this.showMenu(best)},550)}
  showMenu(best){this.hideAll();this['menu-screen'].hidden=false;this['menu-best'].textContent=best.toLocaleString('zh-CN')}
  showGame(){this.hideAll();this.hud.hidden=false}
  resetTransient(){this.comboTimer=this.segmentTimer=0;this.combo.classList.remove('show');this['segment-label'].classList.remove('show');this['record-banner'].classList.remove('show')}
  showPause(){this['pause-screen'].hidden=false}
  hidePause(){this['pause-screen'].hidden=true}
  updateStats(score,coins,distance){this['score-value'].textContent=String(score).padStart(6,'0');this['coin-value'].textContent=coins;this['distance-value'].textContent=Math.floor(distance)}
  showCombo(value){this.combo.querySelector('strong').textContent='x'+value;this.combo.classList.remove('show');requestAnimationFrame(()=>this.combo.classList.add('show'));this.comboTimer=1.1}
  showSegment(label){this['segment-label'].textContent=label;this['segment-label'].classList.add('show');this.segmentTimer=2.2}
  tick(dt){if((this.comboTimer-=dt)<=0)this.combo.classList.remove('show');if((this.segmentTimer-=dt)<=0)this['segment-label'].classList.remove('show')}
  gameOver(stats,isRecord){this.hud.hidden=true;this['gameover-screen'].hidden=false;this['result-score'].textContent=stats.score.toLocaleString('zh-CN');this['result-distance'].textContent=Math.floor(stats.distance);this['result-coins'].textContent=stats.coins;this['result-best'].textContent=stats.best.toLocaleString('zh-CN');this['result-kicker'].textContent=isRecord?'新的最高记录':'本次记录';this['result-title'].textContent=isRecord?'越过旧的自己':'路线中断';if(isRecord){this['record-banner'].classList.add('show');setTimeout(()=>this['record-banner'].classList.remove('show'),1900)}}
  flash(){this['game-shell'].classList.remove('game-flash');requestAnimationFrame(()=>this['game-shell'].classList.add('game-flash'));setTimeout(()=>this['game-shell'].classList.remove('game-flash'),400)}
  setSound(enabled){const b=this['sound-button'];b.className='icon-button '+(enabled?'sound-on':'sound-off');b.setAttribute('aria-label',enabled?'关闭声音':'开启声音')}
}
