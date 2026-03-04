// =============================================================================
// Libre Oven Card  v2.2.0
// Inspired by the Midea AC Card architecture.
//
// Place this file in:  /config/www/libre-oven/libre-oven-card.js
// Register as a Lovelace resource (type: module).
// =============================================================================

const CARD_TAG = 'libre-oven-card';

// ── State accent colours ─────────────────────────────────────────────────────
const STATE_COLORS = {
  0: '#757575', // idle
  1: '#e5c000', // waiting
  2: '#e01e00', // preheating
  3: '#4caf50', // ready
  4: '#4caf50', // cooking
};

const STATE_LABELS = {
  0: 'Idle',
  1: 'Waiting',
  2: 'Preheating',
  3: 'Ready',
  4: 'Cooking',
};

const MIN_TEMP = 0;
const MAX_TEMP = 280;

const START_COLOR = '#4caf50';
const STOP_COLOR = '#f44336';
const DISABLED_COLOR = '#555';

// Entity ID templates for base_name auto-discovery. {base} is replaced with the base_name.
const ENTITY_TEMPLATES = {
  oven_temperature: 'sensor.{base}_oven_temperature',
  active_temperature: 'sensor.{base}_active_temperature',
  timer_state: 'sensor.{base}_timer_state',
  timer_state_code: 'sensor.{base}_timer_state_code',
  active_countdown: 'sensor.{base}_active_countdown',
  delay_remaining: 'sensor.{base}_delay_remaining',
  cook_remaining: 'sensor.{base}_cook_remaining',
  active_cook_total: 'sensor.{base}_active_cook_total',
  active_delay_total: 'sensor.{base}_active_delay_total',
  set_temperature: 'number.{base}_set_temperature',
  cook_duration: 'number.{base}_cook_duration',
  start_delay: 'number.{base}_start_delay',
  top_element_selected: 'switch.{base}_top_element_selected',
  bottom_element_selected: 'switch.{base}_bottom_element_selected',
  grill_element_selected: 'switch.{base}_grill_element_selected',
  fan_selected: 'switch.{base}_fan_selected',
  apply_program: 'button.{base}_apply_program',
  cancel_program: 'button.{base}_cancel_program',
  top_element_state: 'sensor.{base}_top_element_state',
  bottom_element_state: 'sensor.{base}_bottom_element_state',
  grill_element_state: 'sensor.{base}_grill_element_state',
  fan_element_state: 'sensor.{base}_fan_element_state',
  frame_state: 'sensor.{base}_oven_frame_state',
  active_top_element: 'binary_sensor.{base}_active_top_element',
  active_bottom_element: 'binary_sensor.{base}_active_bottom_element',
  active_grill_element: 'binary_sensor.{base}_active_grill_element',
  active_fan_element: 'binary_sensor.{base}_active_fan_element',
};

// ── SVG arc helpers (from AC card) ───────────────────────────────────────────

function pt(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180;
  return [
    +(cx + r * Math.sin(rad)).toFixed(2),
    +(cy - r * Math.cos(rad)).toFixed(2),
  ];
}

function arcD(cx, cy, r, startDeg, sweepDeg) {
  if (sweepDeg < 0.5) return '';
  const s = Math.min(sweepDeg, 359.9);
  const [x1, y1] = pt(cx, cy, r, startDeg);
  const [x2, y2] = pt(cx, cy, r, startDeg + s);
  const lg = s > 180 ? 1 : 0;
  return `M${x1},${y1} A${r},${r},0,${lg},1,${x2},${y2}`;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── Card class ───────────────────────────────────────────────────────────────
class LibreOvenCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._built = false;
    this._sheet = null;
    this._dragging = false;
    this._dragTemp = null;
    this._durationTimer = null;
    this._delayTimer = null;
    this._elemOptimistic = {};
    this._elemTimers = {};
    this._prevTimerStateCode = 0;
    this._lastProgramStartAt = 0;
  }

  static getStubConfig() {
    return {
      base_name: 'libre_oven',
    };
  }

  getCardSize() { return 6; }

  setConfig(cfg) {
    if (!cfg.entities && !cfg.base_name) {
      throw new Error("libre-oven-card: 'entities' or 'base_name' is required");
    }
    const base = (cfg.base_name || '').replace(/-/g, '_');
    let entities;
    if (cfg.entities) {
      entities = { ...cfg.entities };
    } else {
      entities = {};
    }
    if (base) {
      for (const [key, template] of Object.entries(ENTITY_TEMPLATES)) {
        if (!entities[key]) {
          entities[key] = template.replace(/\{base\}/g, base);
        }
      }
    }
    this._config = { ...cfg, entities };
  }

  set hass(hass) {
    if (!this._config) return;
    const prev = this._hass;
    this._hass = hass;

    // Reconcile optimistic element states with real HA state
    for (const [eid, expected] of Object.entries(this._elemOptimistic)) {
      const real = hass.states[eid]?.state;
      if (real === expected) {
        clearTimeout(this._elemTimers[eid]);
        delete this._elemOptimistic[eid];
        delete this._elemTimers[eid];
      }
    }

    const e = this._config.entities;
    const ids = Object.values(e).filter(Boolean);

    if (this._dragging || this._sheet) return;
    if (prev && this._built && ids.every(id => prev.states[id] === hass.states[id])) return;

    if (!this._built) this._initShadow();
    this._render();
  }

  connectedCallback() {
    if (this._hass && !this._built) {
      this._initShadow();
      this._render();
    }
  }

  disconnectedCallback() {
    clearTimeout(this._durationTimer);
    clearTimeout(this._delayTimer);
    for (const t of Object.values(this._elemTimers)) clearTimeout(t);
  }

  _initShadow() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('click', e => this._onClick(e));
    this.shadowRoot.addEventListener('input', e => this._onInput(e));
    this.shadowRoot.addEventListener('change', e => this._onChange(e));
    this._built = true;
  }

  // ── Full re-render ─────────────────────────────────────────────────────────
  _render() {
    if (!this._hass || !this._built) return;
    const activeSheet = this._sheet;
    this.shadowRoot.innerHTML = `<style>${this._css()}</style>${this._html()}`;
    if (activeSheet) {
      this._openSheet(activeSheet);
      if (activeSheet === 'temperature') {
        const dialSvg = this.shadowRoot.querySelector('.dial-svg');
        if (dialSvg) this._bindDialEvents(dialSvg);
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _getState(entityId, fallback = 'unknown') {
    if (!entityId) return fallback;
    return this._hass.states[entityId]?.state ?? fallback;
  }

  _asNumber(value, fallback = 0) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _fmtHM(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  _fmtHMS(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  _fmtHMSFromMinutes(minutes) {
    return this._fmtHMS(Math.round(minutes * 60));
  }

  _call(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  // ── Optimistic element check ──────────────────────────────────────────────
  _isOn(entityId) {
    if (entityId in this._elemOptimistic) {
      return this._elemOptimistic[entityId] === 'on';
    }
    return this._getState(entityId, 'off') === 'on';
  }

  _toggleElement(entityId) {
    if (!entityId) return;
    const cur = this._isOn(entityId);
    const next = cur ? 'off' : 'on';
    this._elemOptimistic[entityId] = next;
    clearTimeout(this._elemTimers[entityId]);
    this._elemTimers[entityId] = setTimeout(() => {
      delete this._elemOptimistic[entityId];
      delete this._elemTimers[entityId];
      this._render();
    }, 3000);
    this._call('switch', 'toggle', { entity_id: entityId });
    this._render();
  }

  // ── Read all entity state ──────────────────────────────────────────────────
  _readState() {
    const e = this._config.entities;
    const gs = (id, fb) => this._getState(id, fb);
    const n = (v, fb) => this._asNumber(v, fb);

    const ovenTemp = n(gs(e.oven_temperature, 'nan'), NaN);
    const activeTemp = n(gs(e.active_temperature, '0'), 0);
    const draftTemp = n(gs(e.set_temperature, '0'), 0);
    const cookDuration = n(gs(e.cook_duration, '0'), 0);
    const startDelay = n(gs(e.start_delay, '0'), 0);
    const timerStateCode = n(gs(e.timer_state_code, '0'), 0);
    const activeCountdownRaw = gs(e.active_countdown, '');
    const activeCountdown = activeCountdownRaw && activeCountdownRaw !== 'unknown' && activeCountdownRaw !== 'unavailable'
      ? String(activeCountdownRaw) : '';
    const delayCountdownRaw = gs(e.delay_remaining, '');
    const delayCountdown = delayCountdownRaw && delayCountdownRaw !== 'unknown' && delayCountdownRaw !== 'unavailable'
      ? String(delayCountdownRaw) : '';
    const cookCountdownRaw = gs(e.cook_remaining, '');
    const cookCountdown = cookCountdownRaw && cookCountdownRaw !== 'unknown' && cookCountdownRaw !== 'unavailable'
      ? String(cookCountdownRaw) : '';

    const activeCookTotal = n(gs(e.active_cook_total, '0'), 0);
    const activeDelayTotal = n(gs(e.active_delay_total, '0'), 0);

    const topOn = this._isOn(e.top_element_selected);
    const bottomOn = this._isOn(e.bottom_element_selected);
    const grillOn = this._isOn(e.grill_element_selected);
    const fanOn = this._isOn(e.fan_selected);
    const anyHeating = topOn || bottomOn || grillOn;
    const programActive = timerStateCode !== 0;

    const mc = STATE_COLORS[timerStateCode] || '#757575';
    const stateLabel = STATE_LABELS[timerStateCode] || 'Idle';

    const STATE_CLASSES = ['off', 'selected', 'armed-heat', 'active-heat'];
    const AUX_CLASSES = ['off', 'selected', 'active-aux'];
    const hasSensor = (id) => {
      if (!id) return false;
      const s = this._hass.states[id]?.state;
      return s !== undefined && s !== 'unknown' && s !== 'unavailable';
    };
    const allowHeat = activeTemp > 0 && anyHeating && (timerStateCode === 2 || timerStateCode === 3 || timerStateCode === 4);

    const elClass = (id, on) => {
      if (hasSensor(id)) {
        const code = n(gs(id, '0'), 0);
        return STATE_CLASSES[Math.min(Math.max(0, Math.round(code)), 3)];
      }
      if (!on) return 'off';
      if (allowHeat) return 'armed-heat';
      return 'selected';
    };
    const auxClass = (id, on) => {
      if (hasSensor(id)) {
        const code = n(gs(id, '0'), 0);
        return AUX_CLASSES[Math.min(Math.max(0, Math.round(code)), 2)];
      }
      if (!on) return 'off';
      if (allowHeat) return 'active-aux';
      return 'selected';
    };

    const topState = elClass(e.top_element_state, topOn);
    const bottomState = elClass(e.bottom_element_state, bottomOn);
    const grillState = elClass(e.grill_element_state, grillOn);
    const fanState = auxClass(e.fan_element_state, fanOn);
    const frameState = auxClass(e.frame_state, anyHeating || fanOn);

    let mainTimer = '';
    let subTimer = '';
    let delayTimer = '';
    let timerSetLabel = '';
    let delaySetLabel = '';
    if (programActive) {
      if (timerStateCode === 4) mainTimer = cookCountdown || activeCountdown || '00:00:00';
      else if (timerStateCode === 2) mainTimer = 'Preheating';
      else if (timerStateCode === 3) mainTimer = 'Oven ready';
      else if (timerStateCode === 1) mainTimer = activeCookTotal > 0 ? this._fmtHMSFromMinutes(activeCookTotal) : 'Until stopped';
      else mainTimer = activeCountdown || '00:00:00';

      if (timerStateCode === 3) subTimer = 'Press to start';
      else if (cookDuration <= 0) subTimer = 'Until stopped';

      if (timerStateCode === 1) delayTimer = delayCountdown || activeCountdown || '00:00:00';
      else delayTimer = 'Done';

      timerSetLabel = activeCookTotal > 0 ? this._fmtHM(activeCookTotal) : 'No timer';
      delaySetLabel = activeDelayTotal > 0 ? this._fmtHM(activeDelayTotal) : 'None';
    } else {
      mainTimer = cookDuration > 0 ? this._fmtHMSFromMinutes(cookDuration) : 'Until stopped';
      subTimer = '';
      delayTimer = startDelay > 0 ? this._fmtHM(startDelay) : '';
      timerSetLabel = '';
      delaySetLabel = '';
    }

    // Draft-change detection (only meaningful when a program is running)
    // Only flag as changed when we have valid active sensor data to compare against.
    // If active sensors are missing or stale, we avoid false positives.
    const hasValidState = (entityId) => {
      if (!entityId || !this._hass?.states?.[entityId]) return false;
      const st = this._hass.states[entityId].state;
      return st !== 'unknown' && st !== 'unavailable';
    };

    const tempChanged = programActive && hasValidState(e.active_temperature) &&
      Math.round(draftTemp) !== Math.round(activeTemp);

    const hasValidActiveCook = hasValidState(e.active_cook_total);
    const durationChanged = programActive && hasValidActiveCook &&
      Math.round(cookDuration) !== Math.round(activeCookTotal);

    const hasValidActiveDelay = hasValidState(e.active_delay_total);
    const delayChanged = programActive && hasValidActiveDelay &&
      Math.round(startDelay) !== Math.round(activeDelayTotal);

    const elStateCode = (id) => {
      if (!id || !hasSensor(id)) return -1;
      return Math.round(n(gs(id, '0'), 0));
    };
    // Use active_* binary sensors for "in program" check (not element state sensors,
    // which conflate draft and active during WAITING).
    const activeElOn = (entityId) => entityId && this._getState(entityId, 'off') === 'on';
    const topActiveInProgram = activeElOn(e.active_top_element);
    const bottomActiveInProgram = activeElOn(e.active_bottom_element);
    const grillActiveInProgram = activeElOn(e.active_grill_element);
    const fanActiveInProgram = activeElOn(e.active_fan_element);

    const hasElSensors = hasValidState(e.active_top_element);
    const topChanged = programActive && hasElSensors && topOn !== topActiveInProgram;
    const bottomChanged = programActive && hasElSensors && bottomOn !== bottomActiveInProgram;
    const grillChanged = programActive && hasElSensors && grillOn !== grillActiveInProgram;
    const fanChanged = programActive && hasElSensors && fanOn !== fanActiveInProgram;

    // Grace period: don't show draft changes for 5s after program becomes active.
    // Active sensors (cook_total, delay_total) and binary sensors update on different cycles.
    if (this._prevTimerStateCode === 0 && timerStateCode !== 0) {
      this._lastProgramStartAt = Date.now();
    }
    this._prevTimerStateCode = timerStateCode;
    const inGracePeriod = programActive && (Date.now() - this._lastProgramStartAt) < 5000;

    const anyDraftChange = !inGracePeriod && (tempChanged || durationChanged || delayChanged || topChanged || bottomChanged || grillChanged || fanChanged);

    const elParts = [];
    if (topOn) elParts.push('Top');
    if (bottomOn) elParts.push('Bottom');
    if (grillOn) elParts.push('Grill');
    if (fanOn) elParts.push('Fan');
    const elementsSummary = elParts.length > 0 ? elParts.join(' + ') : 'None';

    const activeElParts = [];
    if (topActiveInProgram) activeElParts.push('Top');
    if (bottomActiveInProgram) activeElParts.push('Bottom');
    if (grillActiveInProgram) activeElParts.push('Grill');
    if (fanActiveInProgram) activeElParts.push('Fan');
    const elementsActiveSummary = activeElParts.length > 0 ? activeElParts.join(' + ') : 'None';

    return {
      ovenTemp, activeTemp, draftTemp, cookDuration, startDelay,
      activeCookTotal, activeDelayTotal,
      timerStateCode, activeCountdown, delayCountdown, cookCountdown, programActive,
      topOn, bottomOn, grillOn, fanOn, anyHeating,
      topState, bottomState, grillState, fanState, frameState,
      mc, stateLabel, mainTimer, subTimer, delayTimer,
      timerSetLabel, delaySetLabel, elementsSummary, elementsActiveSummary,
      hasElSensors,
      tempChanged, durationChanged, delayChanged,
      topChanged, bottomChanged, grillChanged, fanChanged,
      topActiveInProgram, bottomActiveInProgram, grillActiveInProgram, fanActiveInProgram,
      anyDraftChange,
    };
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  _css() {
    return `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
:host { display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }

.card {
  background-color: var(--card-background-color, var(--ha-card-background-color, #1c1c1e));
  border-radius: var(--ha-card-border-radius, 12px);
  box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,.12));
  overflow: hidden;
  position: relative;
  color: var(--primary-text-color);
  font-family: var(--primary-font-family, Roboto, sans-serif);
  user-select: none;
  -webkit-user-select: none;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 4px;
}
.name {
  font-size: 15px;
  font-weight: 600;
  color: var(--secondary-text-color);
}
.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 14px;
  background: var(--chip-bg);
  color: var(--mode-color);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.chip-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--mode-color);
}

/* ── Oven SVG section ── */
.oven-section {
  display: flex;
  justify-content: center;
  padding: 12px 16px 12px;
}
.oven-svg { width: auto; height: 145px; }

.oven-frame { fill: none; stroke-width: 4; stroke-linecap: square; }
.oven-frame.off { stroke: #808080; }
.oven-frame.selected { stroke: #ffffff; }
.oven-frame.active-aux { stroke: #e5c000; }
.el { fill: none; stroke-width: 6; stroke-linecap: round; }
.el.off { stroke: #808080; }
.el.selected { stroke: #ffffff; }
.el.armed-heat { stroke: #e5c000; }
.el.active-heat { stroke: #e01e00; }
path.grill-indicator { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
path.grill-indicator.off { stroke: #808080; }
path.grill-indicator.selected { stroke: #ffffff; }
path.grill-indicator.armed-heat { stroke: #e5c000; }
path.grill-indicator.active-heat { stroke: #e01e00; }
.fan-group.active-aux {
  animation: fan-spin 1s linear infinite;
  transform-origin: center;
  transform-box: fill-box;
}
.fan-shape { stroke-width: 33.3333; stroke: none; fill-opacity: 1; }
.fan-shape.off { fill: #808080; }
.fan-shape.selected { fill: #ffffff; }
.fan-shape.active-aux { fill: #e5c000; }
.bulb-icon circle, .bulb-icon rect { stroke: none; }
.bulb-icon line { stroke-width: 2; stroke-linecap: round; }
.bulb-icon.off circle, .bulb-icon.off rect { fill: #808080; }
.bulb-icon.off line { stroke: #808080; }
.bulb-icon.selected circle, .bulb-icon.selected rect { fill: #ffffff; }
.bulb-icon.selected line { stroke: #ffffff; }
.bulb-icon.active-aux circle, .bulb-icon.active-aux rect { fill: #e5c000; }
.bulb-icon.active-aux line { stroke: #e5c000; }
.status-icon.idle { fill: #ffffff; }
.status-icon.active { fill: #e5c000; }
.status-icon rect { stroke: none; }
@keyframes fan-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Divider ── */
.sep { height: 1px; background: var(--divider-color, rgba(255,255,255,.08)); margin: 0 18px; }

/* ── Tiles 2x2 ── */
.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 16px;
}
.tile {
  background: var(--secondary-background-color, rgba(255,255,255,.04));
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: filter .15s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 60px;
}
.tile:hover { filter: brightness(1.1); }
.tile:active { filter: brightness(1.2); }
.tile.active { border-left-color: var(--mode-color); }
.tile-lbl { font-size: 11px; color: var(--secondary-text-color); font-weight: 500; text-transform: uppercase; letter-spacing: .4px; }
.tile-val {
  font-size: 15px;
  font-weight: 600;
  font-family: 'Share Tech Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tile-val-text {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Temperature tile dual display ── */
.temp-tile-inner {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex: 1;
}
.temp-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.temp-col + .temp-col {
  border-left: 1px solid var(--divider-color, rgba(255,255,255,.1));
}
.temp-col-lbl {
  font-size: 10px;
  color: var(--secondary-text-color);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .3px;
}
.temp-col-val {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Share Tech Mono', monospace;
  line-height: 1;
}
.temp-current { color: #ff8566; }
.temp-set { color: var(--primary-text-color); }

/* ── Action buttons (bottom row) ── */
.actions {
  display: flex;
  gap: 10px;
  padding: 4px 16px 16px;
}
.action-btn {
  flex: 1;
  padding: 12px 8px;
  border-radius: 14px;
  border: 2px solid var(--divider-color, #444);
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-text-color);
  transition: all .15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.action-btn:hover { filter: brightness(1.15); }
.action-btn:active { transform: scale(.97); }
.action-btn.start-active {
  border-color: ${START_COLOR};
  color: ${START_COLOR};
  background: ${hexA(START_COLOR, 0.15)};
}
.action-btn.start-running {
  border-color: ${START_COLOR};
  color: ${START_COLOR};
  background: none;
}
.action-btn.start-disabled {
  border-color: ${DISABLED_COLOR};
  color: ${DISABLED_COLOR};
  opacity: .35;
  cursor: default;
}
.action-btn.stop-active {
  border-color: ${STOP_COLOR};
  color: ${STOP_COLOR};
  background: ${hexA(STOP_COLOR, 0.1)};
}
.action-btn.stop-idle {
  border-color: ${DISABLED_COLOR};
  color: ${DISABLED_COLOR};
  opacity: .5;
  cursor: default;
}

/* ── Overlay ── */
.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s;
  z-index: 10;
  border-radius: inherit;
}
.overlay.open { opacity: 1; pointer-events: all; }

/* ── Bottom sheet ── */
.sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--card-background-color, #1c1c1e);
  border-radius: 18px 18px 0 0;
  transform: translateY(100%);
  transition: transform .3s ease;
  z-index: 11;
  padding: 8px 20px 16px;
  box-shadow: 0 -4px 24px rgba(0,0,0,.2);
  max-height: 80%;
  overflow-y: auto;
}
.sheet.open { transform: translateY(0); }
.sheet-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: var(--divider-color, #555);
  margin: 6px auto 12px;
}
.sheet-title {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
}
.sheet-sec {
  font-size: 11px; font-weight: 600;
  color: var(--secondary-text-color);
  text-transform: uppercase;
  letter-spacing: .6px;
  margin: 0 0 10px;
}

/* ── Element pills in sheet ── */
.pill-row {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 16px;
}
.pill {
  flex: 1; min-width: 70px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 2px solid var(--divider-color, #444);
  background: none;
  cursor: pointer;
  font-size: 14px; font-weight: 600;
  text-align: center;
  transition: all .15s;
  color: var(--primary-text-color);
}
.pill.active {
  border-color: var(--mode-color);
  background: var(--chip-bg);
  color: var(--mode-color);
}

/* ── Number control in sheet ── */
.num-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.num-control label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}
.num-field {
  display: flex;
  align-items: center;
  gap: 6px;
}
.num-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 2px solid var(--divider-color, #444);
  background: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: 500;
  color: var(--primary-text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  flex-shrink: 0;
}
.num-btn:hover { border-color: var(--mode-color); }
.num-btn:active { transform: scale(.9); }
.num-btn-wide {
  width: auto;
  min-width: 44px;
  padding: 0 10px;
  border-radius: 18px;
  font-size: 13px;
}
.num-input {
  width: 72px;
  text-align: center;
  border-radius: 10px;
  border: 1px solid var(--divider-color, #444);
  background: rgba(255,255,255,.04);
  color: var(--primary-text-color);
  padding: 8px 4px;
  font-size: 16px;
  font-weight: 600;
  font-family: 'Share Tech Mono', monospace;
}
.num-input:focus {
  outline: none;
  border-color: var(--mode-color);
}
.num-unit {
  font-size: 12px;
  color: var(--secondary-text-color);
  margin-left: 2px;
}

/* ── Thermostat dial (inside sheet) ── */
.thermo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
}
.dial-wrap {
  position: relative;
  width: 100%;
  max-width: 280px;
  padding-bottom: 58%;
}
.dial-svg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  overflow: visible;
  touch-action: none;
  cursor: grab;
}
.dial-svg.dragging { cursor: grabbing; }
.dial-center {
  position: absolute;
  left: 0; right: 0;
  top: 60%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
}
.dial-btn {
  pointer-events: all;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 2px solid var(--divider-color, #444);
  background: var(--card-background-color, #1c1c1e);
  cursor: pointer;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
  color: var(--primary-text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .15s;
  flex-shrink: 0;
}
.dial-btn:hover { border-color: var(--mode-color); }
.dial-temp { text-align: center; pointer-events: none; flex-shrink: 0; }
.dial-val {
  font-size: 48px;
  font-weight: 300;
  line-height: 1;
  color: var(--primary-text-color);
}
.dial-unit {
  font-size: 18px;
  vertical-align: super;
  opacity: .6;
}

/* ── Draft-change indicators ── */
.draft-old {
  text-decoration: line-through;
  opacity: .5;
  font-size: 12px;
  font-family: 'Share Tech Mono', monospace;
}
.draft-new {
  color: var(--mode-color);
  font-size: 12px;
  font-family: 'Share Tech Mono', monospace;
  font-weight: 600;
}
.draft-change-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.draft-arrow {
  font-size: 10px;
  opacity: .5;
}
.elem-added { color: #4caf50; }
.elem-removed { color: #f44336; text-decoration: line-through; }
.elem-unchanged { color: var(--primary-text-color); }
.update-hint {
  font-size: 10px;
  color: var(--mode-color);
  text-align: center;
  padding: 0 16px 4px;
  font-weight: 600;
  letter-spacing: .3px;
  animation: hint-pulse 1.5s ease-in-out infinite;
}
@keyframes hint-pulse {
  0%, 100% { opacity: .6; }
  50% { opacity: 1; }
}
`;
  }

  // ── HTML ───────────────────────────────────────────────────────────────────
  _html() {
    const s = this._readState();
    const e = this._config.entities;
    const mc = s.mc;
    const chipBg = hexA(mc, 0.15);

    // Current temp display
    const curTemp = Number.isFinite(s.ovenTemp) ? Math.round(s.ovenTemp) + '°C' : '--';
    const setTemp = Math.round(Math.max(0, s.draftTemp)) + '°C';

    // Timer tile
    let timerTileVal = s.mainTimer;
    const timerTileActive = s.programActive;
    const timerSetInfo = s.timerSetLabel;

    // Delay tile
    const delayTileActive = s.programActive && (s.timerStateCode === 1 || s.timerStateCode === 2);
    let delayTileVal;
    if (s.programActive) {
      delayTileVal = (s.timerStateCode === 1) ? (s.delayTimer || '00:00:00') : 'Done';
    } else {
      delayTileVal = s.startDelay > 0 ? this._fmtHM(s.startDelay) : 'Now';
    }
    const delaySetInfo = s.delaySetLabel;

    // Draft change display helpers
    const draftChangeHtml = (changed, oldVal, newVal) => {
      if (!changed) return '';
      return `<div class="draft-change-row"><span class="draft-old">${oldVal}</span><span class="draft-arrow">→</span><span class="draft-new">${newVal}</span></div>`;
    };

    const timerDraftHtml = s.durationChanged
      ? draftChangeHtml(true, this._fmtHM(s.activeCookTotal), this._fmtHM(s.cookDuration))
      : '';
    const delayDraftHtml = s.delayChanged
      ? draftChangeHtml(true, this._fmtHM(s.activeDelayTotal), this._fmtHM(s.startDelay))
      : '';

    // Temperature draft change
    const tempDraftHtml = s.tempChanged
      ? `<div class="draft-change-row"><span class="draft-old">${Math.round(s.activeTemp)}°C</span><span class="draft-arrow">→</span><span class="draft-new">${Math.round(s.draftTemp)}°C</span></div>`
      : '';

    // Elements display:
    // Line 1 (white): when program running, show active elements (what's in the running program).
    // Line 2 (when changes): diff — green=add, red+strikethrough=remove, white=unchanged.
    // Only show elements that are in draft OR in active; omit elements in neither.
    const hasElementChanges = s.topChanged || s.bottomChanged || s.grillChanged || s.fanChanged;
    const elemClass = (inDraft, inActive, changed) => {
      if (!changed) return 'elem-unchanged';
      return inDraft ? 'elem-added' : 'elem-removed';  // in draft but not active = add; in active but not draft = remove
    };
    const elemPart = (label, inDraft, inActive, changed) =>
      (inDraft || inActive) ? `<span class="${elemClass(inDraft, inActive, changed)}">${label}</span>` : '';
    const elemParts = [
      elemPart('Top', s.topOn, s.topActiveInProgram, s.topChanged),
      elemPart('Bottom', s.bottomOn, s.bottomActiveInProgram, s.bottomChanged),
      elemPart('Grill', s.grillOn, s.grillActiveInProgram, s.grillChanged),
      elemPart('Fan', s.fanOn, s.fanActiveInProgram, s.fanChanged),
    ].filter(Boolean);
    // When program running: use active elements from binary sensors if available; else fall back to draft
    const elemLine1 = s.programActive && s.hasElSensors
      ? s.elementsActiveSummary
      : s.elementsSummary;
    const elemLine2Html = hasElementChanges
      ? `<div class="draft-change-row elem-list">${elemParts.join(' ')}</div>`
      : '';

    // Arc thermostat values (for sheet)
    const target = this._dragging && this._dragTemp != null ? this._dragTemp : Math.round(s.draftTemp);
    const frac = Math.max(0, Math.min(1, (target - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));
    const CX = 100, CY = 90, R = 76;
    const ARC_START = 240, ARC_SWEEP = 240;
    const trackPath = arcD(CX, CY, R, ARC_START, ARC_SWEEP);
    const fillSweep = frac * ARC_SWEEP;
    const fillPath = arcD(CX, CY, R, ARC_START, fillSweep);
    const [hx, hy] = pt(CX, CY, R, ARC_START + (fillSweep < 0.5 ? 0 : fillSweep));

    // Button states
    const canStart = !s.programActive && (s.topOn || s.bottomOn || s.grillOn || s.fanOn);
    const startClass = s.programActive ? 'start-running' : (canStart ? 'start-active' : 'start-disabled');
    const startLabel = s.programActive ? '↻ Update' : '▶ Start';
    const stopClass = s.programActive ? 'stop-active' : 'stop-idle';

    return `
<div class="card" style="--mode-color:${mc};--chip-bg:${chipBg}">

  <!-- Header -->
  <div class="header">
    <span class="name">${this._config.title || 'Libre Oven'}</span>
    <span class="chip"><span class="chip-dot"></span>${s.stateLabel}</span>
  </div>

  <!-- Oven SVG -->
  <div class="oven-section">
    <svg class="oven-svg" width="172" height="197" aria-label="Oven status" viewBox="-2 -2 173 200" xmlns="http://www.w3.org/2000/svg">
      <g class="status-icon ${s.programActive ? 'active' : 'idle'}">
        ${s.programActive
          ? '<path d="m132.61 13.479-21.345 12.324v-24.647z"/>'
          : '<rect x="112.92" y="1.5" width="6" height="24" rx="1" ry="1"/><rect x="123.92" y="1.5" width="6" height="24" rx="1" ry="1"/>'}
      </g>
      <rect class="oven-frame ${s.frameState}" x="0" y="42.431" width="170.1" height="154.14" rx="30.828" ry="30.828"/>
      <path class="el ${s.topState}" d="m147.83 57.553h-125.55"/>
      <path class="el ${s.bottomState}" d="m147.83 182.11h-125.55"/>
      <path class="grill-indicator ${s.grillState}" d="m21.076 68.267 8.0048 13.865 7.9678-13.809 8.0322 13.809 7.9678-13.809 8.0322 13.809 7.9678-13.809 8.0322 13.809 7.9678-13.809 8.0322 13.809 7.9698-13.809 8.0342 13.809 7.9678-13.809 8.0322 13.809 7.9678-13.809 8.0322 13.809 7.9405-13.753"/>
      <g class="fan-group ${s.fanState}">
        <path class="fan-shape ${s.fanState}" d="m85.048 127.44a3.7055 3.7055 0 1 0 3.7055 3.7055 3.7055 3.7055 0 0 0-3.7055-3.7055m1.8527-33.349c16.675 0 17.045 13.229 8.2633 17.601a12.45 12.45 0 0 0-6.0029 9.1526 11.746 11.746 0 0 1 4.5578 3.372c13.562-7.411 28.384-4.4836 28.384 8.782 0 16.675-13.266 17.045-17.601 8.2632a12.747 12.747 0 0 0-9.2637-6.0029 12.006 12.006 0 0 1-3.372 4.5578c7.411 13.673 4.4466 28.384-8.8191 28.384-16.527 0-16.934-13.266-8.1521-17.638a12.821 12.821 0 0 0 6.0029-9.0785 11.116 11.116 0 0 1-4.6319-3.4091c-13.673 7.3369-28.273 4.4466-28.273-8.782 0-16.675 13.117-17.082 17.49-8.3003a12.562 12.562 0 0 0 9.1896 5.9658 10.783 10.783 0 0 1 3.409-4.5207c-7.3739-13.525-4.4466-28.347 8.745-28.347z"/>
      </g>
      <g class="bulb-icon ${s.frameState}">
        <circle cx="157.92" cy="9.5" r="9.5"/>
        <rect x="152.92" y="20.5" width="10" height="5" rx="1" ry="1"/>
        <line x1="153.92" x2="161.92" y1="27" y2="27" stroke-linecap="round" stroke-width="2.5"/>
      </g>
    </svg>
  </div>

  <div class="sep"></div>

  <!-- Tiles -->
  <div class="tiles">
    <div class="tile${timerTileActive ? ' active' : ''}" data-action="open-timer">
      <span class="tile-lbl">Timer</span>
      <span class="tile-val">${timerTileVal}</span>
      ${s.subTimer ? `<span class="tile-lbl" style="margin-top:2px">${s.subTimer}</span>` : ''}
      ${timerSetInfo ? `<span class="tile-lbl" style="margin-top:2px">Set: ${timerSetInfo}</span>` : ''}
      ${timerDraftHtml}
    </div>
    <div class="tile${delayTileActive ? ' active' : ''}" data-action="open-delay">
      <span class="tile-lbl">Start Delay</span>
      <span class="tile-val">${delayTileVal}</span>
      ${delaySetInfo ? `<span class="tile-lbl" style="margin-top:2px">Set: ${delaySetInfo}</span>` : ''}
      ${delayDraftHtml}
    </div>
    <div class="tile${(s.topOn || s.bottomOn || s.grillOn || s.fanOn) ? ' active' : ''}" data-action="open-elements">
      <span class="tile-lbl">Elements</span>
      <span class="tile-val-text">${elemLine1}</span>
      ${elemLine2Html}
    </div>
    <div class="tile" data-action="open-temperature">
      <div class="temp-tile-inner">
        <div class="temp-col">
          <span class="temp-col-lbl">Current</span>
          <span class="temp-col-val temp-current">${curTemp}</span>
        </div>
        <div class="temp-col">
          <span class="temp-col-lbl">Set</span>
          <span class="temp-col-val temp-set">${setTemp}</span>
          ${tempDraftHtml}
        </div>
      </div>
    </div>
  </div>

  ${s.anyDraftChange ? '<div class="update-hint">DRAFT CHANGES — Press Update to apply</div>' : ''}

  <!-- Actions -->
  <div class="actions">
    <button class="action-btn ${startClass}" data-action="start-program">
      ${startLabel}
    </button>
    <button class="action-btn ${stopClass}" data-action="cancel-program">
      ■ Stop
    </button>
  </div>

  <!-- Overlay -->
  <div class="overlay" id="overlay"></div>

  <!-- Timer Sheet (Cook Duration only) -->
  <div class="sheet" data-sheet="timer">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Cook Duration</div>
    <div class="num-control">
      <div class="num-field" style="width:100%;justify-content:center">
        <button class="num-btn num-btn-wide" data-action="duration-down-10">−10</button>
        <button class="num-btn" data-action="duration-down">−</button>
        <input class="num-input" id="duration-input" type="number" min="0" max="1439"
               value="${Math.round(s.cookDuration)}" data-entity="${e.cook_duration || ''}">
        <span class="num-unit">min</span>
        <button class="num-btn" data-action="duration-up">+</button>
        <button class="num-btn num-btn-wide" data-action="duration-up-10">+10</button>
      </div>
    </div>
  </div>

  <!-- Delay Sheet (Start Delay only) -->
  <div class="sheet" data-sheet="delay">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Start Delay</div>
    <div class="num-control">
      <div class="num-field" style="width:100%;justify-content:center">
        <button class="num-btn num-btn-wide" data-action="delay-down-10">−10</button>
        <button class="num-btn" data-action="delay-down">−</button>
        <input class="num-input" id="delay-input" type="number" min="0" max="1439"
               value="${Math.round(s.startDelay)}" data-entity="${e.start_delay || ''}">
        <span class="num-unit">min</span>
        <button class="num-btn" data-action="delay-up">+</button>
        <button class="num-btn num-btn-wide" data-action="delay-up-10">+10</button>
      </div>
    </div>
  </div>

  <!-- Elements Sheet -->
  <div class="sheet" data-sheet="elements">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Active Elements</div>

    <div class="sheet-sec">Select Elements</div>
    <div class="pill-row">
      <button class="pill${s.topOn ? ' active' : ''}" data-action="toggle-top">Top</button>
      <button class="pill${s.bottomOn ? ' active' : ''}" data-action="toggle-bottom">Bottom</button>
    </div>
    <div class="pill-row">
      <button class="pill${s.grillOn ? ' active' : ''}" data-action="toggle-grill">Grill</button>
      <button class="pill${s.fanOn ? ' active' : ''}" data-action="toggle-fan">Fan</button>
    </div>
  </div>

  <!-- Temperature Sheet (Arc Thermostat) -->
  <div class="sheet" data-sheet="temperature">
    <div class="sheet-handle"></div>
    <div class="sheet-title" style="margin-bottom:8px">Set Temperature</div>

    <div class="thermo">
      <div class="dial-wrap">
        <svg class="dial-svg" viewBox="0 0 200 155" xmlns="http://www.w3.org/2000/svg">
          <path d="${trackPath}" fill="none"
                stroke="${hexA('#888888', 0.22)}" stroke-width="10" stroke-linecap="round"/>
          <path id="arc-fill" d="${fillPath || ''}" fill="none"
                stroke="${mc}" stroke-width="10" stroke-linecap="round"
                ${fillPath ? '' : 'style="display:none"'}/>
          <circle id="arc-handle" cx="${hx}" cy="${hy}" r="8"
                  fill="white" stroke="${mc}" stroke-width="2.5"/>
        </svg>
        <div class="dial-center">
          <button class="dial-btn" data-action="temp-down">\u2212</button>
          <div class="dial-temp">
            <span class="dial-val" id="arc-temp-val">${target}</span><span class="dial-unit">\u00B0C</span>
          </div>
          <button class="dial-btn" data-action="temp-up">+</button>
        </div>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── Dial drag ──────────────────────────────────────────────────────────────

  _bindDialEvents(svg) {
    svg.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
      this._dragging = true;
      this._applyDialPoint(e, svg);
    });

    svg.addEventListener('pointermove', e => {
      if (!this._dragging) return;
      this._applyDialPoint(e, svg);
    });

    const endDrag = () => {
      if (!this._dragging) return;
      this._dragging = false;
      svg.classList.remove('dragging');
      if (this._dragTemp != null) {
        const eid = this._config.entities.set_temperature;
        if (eid) {
          this._call('number', 'set_value', { entity_id: eid, value: this._dragTemp });
        }
        this._dragTemp = null;
      }
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
  }

  _applyDialPoint(e, svg) {
    const rect = svg.getBoundingClientRect();
    const CX = 100, CY = 90;
    const px = (e.clientX - rect.left) * (200 / rect.width);
    const py = (e.clientY - rect.top) * (155 / rect.height);

    let deg = Math.atan2(px - CX, -(py - CY)) * 180 / Math.PI;
    if (deg < 0) deg += 360;

    if (deg >= 120 && deg < 240) return;
    const norm = deg < 120 ? deg + 360 : deg;
    const frac = Math.max(0, Math.min(1, (norm - 240) / 240));
    const temp = Math.round(MIN_TEMP + frac * (MAX_TEMP - MIN_TEMP));

    if (temp === this._dragTemp) return;
    this._dragTemp = temp;
    this._updateDialArc(temp);
  }

  _updateDialArc(temp) {
    const s = this.shadowRoot;
    const fillEl = s.getElementById('arc-fill');
    const handleEl = s.getElementById('arc-handle');
    const valEl = s.getElementById('arc-temp-val');
    if (!fillEl || !handleEl) return;

    const frac = Math.max(0, Math.min(1, (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));
    const CX = 100, CY = 90, R = 76;
    const ARC_START = 240, ARC_SWEEP = 240;
    const fillSweep = frac * ARC_SWEEP;
    const fp = fillSweep > 0.5 ? arcD(CX, CY, R, ARC_START, fillSweep) : '';

    if (fp) {
      fillEl.setAttribute('d', fp);
      fillEl.style.display = '';
    } else {
      fillEl.style.display = 'none';
    }

    const mc = this._readState().mc;
    fillEl.setAttribute('stroke', mc);
    handleEl.setAttribute('stroke', mc);

    const [hx, hy] = pt(CX, CY, R, ARC_START + (fillSweep < 0.5 ? 0 : fillSweep));
    handleEl.setAttribute('cx', String(hx));
    handleEl.setAttribute('cy', String(hy));

    if (valEl) valEl.textContent = String(temp);
  }

  // ── Sheet management ───────────────────────────────────────────────────────

  _openSheet(name) {
    this._sheet = name;
    const s = this.shadowRoot;
    const sheetEl = s.querySelector(`.sheet[data-sheet="${name}"]`);
    sheetEl?.classList.add('open');
    s.getElementById('overlay')?.classList.add('open');
    if (name === 'temperature') {
      const dialSvg = s.querySelector('.dial-svg');
      if (dialSvg) this._bindDialEvents(dialSvg);
    }
    if (sheetEl) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const card = s.querySelector('.card');
          if (!card) return;
          const cardRect = card.getBoundingClientRect();
          const viewH = window.innerHeight;
          if (cardRect.bottom > viewH) {
            this.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 50);
      });
    }
  }

  _closeSheet() {
    this._sheet = null;
    const s = this.shadowRoot;
    s.querySelectorAll('.sheet.open').forEach(el => el.classList.remove('open'));
    s.getElementById('overlay')?.classList.remove('open');
    setTimeout(() => this._render(), 320);
  }

  // ── Click handling ─────────────────────────────────────────────────────────

  _onClick(e) {
    const actionEl = e.composedPath().find(
      el => el instanceof Element && el.dataset?.action
    );
    if (!actionEl) {
      if (e.composedPath().includes(this.shadowRoot.getElementById('overlay'))) {
        this._closeSheet();
      }
      return;
    }

    const action = actionEl.dataset.action;
    const ent = this._config.entities;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    switch (action) {
      // Navigation
      case 'open-timer':       this._openSheet('timer');       return;
      case 'open-delay':       this._openSheet('delay');       return;
      case 'open-elements':    this._openSheet('elements');    return;
      case 'open-temperature': this._openSheet('temperature'); return;

      // Temperature arc +/- buttons
      case 'temp-up':
      case 'temp-down': {
        const displayed = this.shadowRoot.getElementById('arc-temp-val');
        const cur = displayed ? Number(displayed.textContent) || 0 : this._asNumber(this._getState(ent.set_temperature, '0'), 0);
        const step = action === 'temp-up' ? 5 : -5;
        const next = clamp(Math.round(cur) + step, MIN_TEMP, MAX_TEMP);
        this._updateDialArc(next);
        this._call('number', 'set_value', { entity_id: ent.set_temperature, value: next });
        break;
      }

      // Duration +/-
      case 'duration-up':
      case 'duration-up-10':
      case 'duration-down':
      case 'duration-down-10': {
        const delta = action === 'duration-up' ? 1 : action === 'duration-up-10' ? 10 : action === 'duration-down' ? -1 : -10;
        this._adjustNumberInput('duration-input', ent.cook_duration, delta, 0, 1439);
        break;
      }

      // Delay +/-
      case 'delay-up':
      case 'delay-up-10':
      case 'delay-down':
      case 'delay-down-10': {
        const delta = action === 'delay-up' ? 1 : action === 'delay-up-10' ? 10 : action === 'delay-down' ? -1 : -10;
        this._adjustNumberInput('delay-input', ent.start_delay, delta, 0, 1439);
        break;
      }

      // Element toggles (optimistic)
      case 'toggle-top':
        this._toggleElement(ent.top_element_selected);
        return;
      case 'toggle-bottom':
        this._toggleElement(ent.bottom_element_selected);
        return;
      case 'toggle-grill':
        this._toggleElement(ent.grill_element_selected);
        return;
      case 'toggle-fan':
        this._toggleElement(ent.fan_selected);
        return;

      // Program actions
      case 'start-program': {
        const s = this._readState();
        if (!s.topOn && !s.bottomOn && !s.grillOn && !s.fanOn) return;
        if (ent.apply_program) this._call('button', 'press', { entity_id: ent.apply_program });
        break;
      }
      case 'cancel-program': {
        const s = this._readState();
        if (!s.programActive) return;
        if (ent.cancel_program) this._call('button', 'press', { entity_id: ent.cancel_program });
        break;
      }
    }
  }

  _adjustNumberInput(inputId, entityId, delta, min, max) {
    const input = this.shadowRoot.getElementById(inputId);
    if (!input || !entityId) return;
    const cur = Number.parseFloat(input.value) || 0;
    const next = Math.max(min, Math.min(max, Math.round(cur + delta)));
    input.value = String(next);
    this._call('number', 'set_value', { entity_id: entityId, value: next });
  }

  // ── Input handling (debounced number inputs) ───────────────────────────────

  _onInput(e) {
    const input = e.target;
    if (!input || input.type !== 'number') return;

    const id = input.id;
    const ent = this._config.entities;

    if (id === 'duration-input') {
      clearTimeout(this._durationTimer);
      this._durationTimer = setTimeout(() => {
        const v = Math.max(0, Math.min(1439, Math.round(Number.parseFloat(input.value) || 0)));
        input.value = String(v);
        if (ent.cook_duration) this._call('number', 'set_value', { entity_id: ent.cook_duration, value: v });
      }, 400);
    } else if (id === 'delay-input') {
      clearTimeout(this._delayTimer);
      this._delayTimer = setTimeout(() => {
        const v = Math.max(0, Math.min(1439, Math.round(Number.parseFloat(input.value) || 0)));
        input.value = String(v);
        if (ent.start_delay) this._call('number', 'set_value', { entity_id: ent.start_delay, value: v });
      }, 400);
    }
  }

  _onChange(e) {
    const input = e.target;
    if (!input || input.type !== 'number') return;

    const id = input.id;
    const ent = this._config.entities;

    if (id === 'duration-input') {
      clearTimeout(this._durationTimer);
      const v = Math.max(0, Math.min(1439, Math.round(Number.parseFloat(input.value) || 0)));
      input.value = String(v);
      if (ent.cook_duration) this._call('number', 'set_value', { entity_id: ent.cook_duration, value: v });
    } else if (id === 'delay-input') {
      clearTimeout(this._delayTimer);
      const v = Math.max(0, Math.min(1439, Math.round(Number.parseFloat(input.value) || 0)));
      input.value = String(v);
      if (ent.start_delay) this._call('number', 'set_value', { entity_id: ent.start_delay, value: v });
    }
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
customElements.define(CARD_TAG, LibreOvenCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: 'Libre Oven Card',
  description: 'Full-featured oven control card with arc thermostat, element toggles, timer controls, and live oven SVG graphic.',
  preview: true,
});
