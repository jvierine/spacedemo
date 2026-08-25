const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 285;
const VIEWPORT_RESERVE = 320;
const STORAGE_KEY = 'spacedemo.controlsWidth';

export function panelWidthBounds(viewportWidth) {
  return { min: MIN_WIDTH, max: Math.max(MIN_WIDTH, Math.min(720, viewportWidth - VIEWPORT_RESERVE)) };
}

export function clampPanelWidth(width, viewportWidth) {
  const { min, max } = panelWidthBounds(viewportWidth);
  return Math.min(max, Math.max(min, width));
}

function initializeResizablePanel() {
  const shell = document.querySelector('.demo-shell');
  const controls = shell?.querySelector('.controls');
  if (!shell || !controls) return;

  const handle = document.createElement('div');
  handle.className = 'panel-resizer';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-label', 'Resize equations and controls panel');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.title = 'Drag to resize · arrow keys adjust · double-click resets';
  shell.append(handle);

  const mobile = window.matchMedia('(max-width: 820px)');
  let width = Number.parseFloat(localStorage.getItem(STORAGE_KEY)) || DEFAULT_WIDTH;

  const applyWidth = (requested, persist = true) => {
    width = clampPanelWidth(requested, window.innerWidth);
    if (mobile.matches) {
      controls.style.removeProperty('width');
      handle.style.removeProperty('left');
      return;
    }
    controls.style.width = `${width}px`;
    handle.style.left = `${width - 5}px`;
    handle.setAttribute('aria-valuemin', String(panelWidthBounds(window.innerWidth).min));
    handle.setAttribute('aria-valuemax', String(panelWidthBounds(window.innerWidth).max));
    handle.setAttribute('aria-valuenow', String(Math.round(width)));
    if (persist) localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  };

  handle.addEventListener('pointerdown', event => {
    if (mobile.matches) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = controls.getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('is-dragging');
    const move = moveEvent => applyWidth(startWidth + moveEvent.clientX - startX);
    const finish = () => {
      handle.classList.remove('is-dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  });

  handle.addEventListener('keydown', event => {
    const increments = { ArrowLeft: -16, ArrowRight: 16 };
    if (event.key in increments) {
      event.preventDefault();
      applyWidth(width + increments[event.key]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      applyWidth(panelWidthBounds(window.innerWidth).min);
    } else if (event.key === 'End') {
      event.preventDefault();
      applyWidth(panelWidthBounds(window.innerWidth).max);
    }
  });
  handle.addEventListener('dblclick', () => applyWidth(DEFAULT_WIDTH));
  window.addEventListener('resize', () => applyWidth(width, false));
  mobile.addEventListener?.('change', () => applyWidth(width, false));
  applyWidth(width, false);
}

if (typeof document !== 'undefined') initializeResizablePanel();
