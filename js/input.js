const KEY_ACTIONS = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump',
  KeyS: 'slide', ArrowDown: 'slide', Escape: 'pause', KeyP: 'pause', Enter: 'confirm'
};

export class InputController {
  constructor(canvas) {
    this.queue = [];
    this.gesture = null;
    this.canvas = canvas;
    window.addEventListener('keydown', event => {
      if (event.target instanceof Element && event.target.matches('button') && ['Space', 'Enter'].includes(event.code)) return;
      const action = KEY_ACTIONS[event.code];
      if (!action || event.repeat) return;
      event.preventDefault();
      this.push(action);
    });
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary) return;
      this.gesture = {x: event.clientX, y: event.clientY, id: event.pointerId, claimed: false};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => this.swipe(event));
    canvas.addEventListener('pointerup', event => {
      this.swipe(event);
      this.gesture = null;
    });
    canvas.addEventListener('pointercancel', () => this.gesture = null);
    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        this.push(button.dataset.action);
      });
      button.addEventListener('keydown', event => {
        if (event.code === 'Space' || event.code === 'Enter') this.push(button.dataset.action);
      });
    });
  }

  swipe(event) {
    const gesture = this.gesture;
    if (!gesture || gesture.claimed || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    gesture.claimed = true;
    this.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'slide' : 'jump'));
  }

  push(action) {
    this.queue.push({action, time: performance.now()});
    if (this.queue.length > 8) this.queue.shift();
  }

  consume() {
    const now = performance.now();
    while (this.queue.length) {
      const event = this.queue.shift();
      if (now - event.time < 240) return event.action;
    }
    return null;
  }

  clear() {
    this.queue.length = 0;
    this.gesture = null;
  }
}
