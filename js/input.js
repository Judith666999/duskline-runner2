export class InputSystem {
  constructor(canvas, onAction) {
    this.canvas = canvas; this.onAction = onAction; this.pointer = null;
    window.addEventListener('keydown', event => {
      const actions = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyS: 'slide', ArrowDown: 'slide', Escape: 'pause', KeyP: 'pause' };
      const action = actions[event.code]; if (!action) return;
      // Space on a focused menu button keeps the native keyboard activation.
      if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
      event.preventDefault(); if (!event.repeat) onAction(action);
    });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.pointer) return;
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      const dx = event.clientX - this.pointer.x, dy = event.clientY - this.pointer.y;
      const threshold = Math.max(24, Math.min(innerWidth, innerHeight) * .055);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      onAction(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'slide' : 'jump'));
      this.pointer = null;
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => this.clear());
  }
  clear() { this.pointer = null; }
}
