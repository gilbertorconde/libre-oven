// =============================================================================
// Libre Oven Card  v3.0.1
// Dark, app-style control card for the Libre Oven (ESPHome) firmware.
//
// Place this file in:  /config/www/libre-oven/libre-oven-card.js
// Register as a Lovelace resource (type: module).
//
// variant: full (default)  - every control at once; two columns when the card
//                            is wide, one stacked column when narrow.
// variant: compact         - a glance card; "Full controls" opens the full card
//                            in a dialog on top of the page.
// =============================================================================

const CARD_TAG = 'libre-oven-card';
const CARD_VERSION = '3.0.1';

const STATE_LABELS = { 0: 'Idle', 1: 'Waiting', 2: 'Preheating', 3: 'Ready', 4: 'Cooking' };
const STATE_KEYS = { 0: 'idle', 1: 'wait', 2: 'pre', 3: 'ready', 4: 'cook' };
// Accent per timer state code (ring, progress, badge).
const STATE_ACCENT = { 0: '#a9afbb', 1: '#f5c542', 2: '#ff5c6c', 3: '#4ade80', 4: '#4ade80' };

const MIN_TEMP = 0;
const MAX_TEMP = 280;

// Element colours by visual state: off, selected (draft), armed, heating.
const EL_COLORS = { off: '#3a404c', selected: '#f2f3f5', 'armed-heat': '#ffb347', 'active-heat': '#ff5c6c', 'active-aux': '#ffb347' };

// Small inline icons (Material Design Icons paths) so the card has no icon dependency.
const ICONS = {
  stove: 'M6,14H8L11,17H9L6,14M4,4H5V3A1,1 0 0,1 6,2H10A1,1 0 0,1 11,3V4H13V3A1,1 0 0,1 14,2H18A1,1 0 0,1 19,3V4H20A2,2 0 0,1 22,6V19A2,2 0 0,1 20,21V22H17V21H7V22H4V21A2,2 0 0,1 2,19V6A2,2 0 0,1 4,4M18,7A1,1 0 0,1 19,8A1,1 0 0,1 18,9A1,1 0 0,1 17,8A1,1 0 0,1 18,7M14,7A1,1 0 0,1 15,8A1,1 0 0,1 14,9A1,1 0 0,1 13,8A1,1 0 0,1 14,7M20,6H4V10H20V6M4,19H20V12H4V19M6,7A1,1 0 0,1 7,8A1,1 0 0,1 6,9A1,1 0 0,1 5,8A1,1 0 0,1 6,7M13,14H15L18,17H16L13,14Z',
  lock: 'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z',
  unlock: 'M18,1C15.24,1 13,3.24 13,6V8H4C2.9,8 2,8.89 2,10V20C2,21.11 2.9,22 4,22H16C17.11,22 18,21.11 18,20V10C18,8.9 17.11,8 16,8H15V6C15,4.34 16.34,3 18,3C19.66,3 21,4.34 21,6V8H23V6C23,3.24 20.76,1 18,1M10,13C11.1,13 12,13.89 12,15C12,16.11 11.1,17 10,17C8.9,17 8,16.11 8,15C8,13.9 8.9,13 10,13Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
  minus: 'M19,13H5V11H19V13Z',
  plus: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  play: 'M8,5.14V19.14L19,12.14L8,5.14Z',
  stop: 'M18,18H6V6H18V18Z',
  pencil: 'M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z',
  probe: 'M15,13V5A3,3 0 0,0 12,2A3,3 0 0,0 9,5V13A5,5 0 0,0 7,17A5,5 0 0,0 12,22A5,5 0 0,0 17,17A5,5 0 0,0 15,13M12,4A1,1 0 0,1 13,5V8H11V5A1,1 0 0,1 12,4Z',
  timer: 'M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z',
  clock: 'M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z',
  offline: 'M2.28,3L1,4.27L2.47,5.74C2.04,6.1 1.62,6.5 1.23,6.89L3.06,8.73C3.42,8.37 3.81,8.04 4.21,7.71L5.69,9.19C5.23,9.53 4.79,9.9 4.38,10.31L6.21,12.14C6.65,11.71 7.13,11.32 7.63,11L9.81,13.17C9.08,13.47 8.4,13.9 7.82,14.44L9.66,16.28C10.31,15.66 11.13,15.25 12,15.09L19.73,22.81L21,21.54L2.28,3M12,17A2,2 0 0,0 10,19A2,2 0 0,0 12,21A2,2 0 0,0 14,19A2,2 0 0,0 12,17M12,3C9.04,3 6.31,4 4.15,5.67L5.62,7.14C7.39,5.84 9.6,5.07 12,5.07C16.13,5.07 19.79,7.33 21.75,10.67L23.54,9.63C21.21,5.69 16.92,3 12,3M12,9C11.11,9 10.26,9.12 9.45,9.36L11.17,11.07C11.44,11.03 11.72,11 12,11C14.68,11 17.08,12.34 18.5,14.38L20.12,13.13C18.31,10.6 15.35,9 12,9Z',
  alert: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  chart: 'M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z',
  chevron: 'M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z',
};
const svgIcon = (name, size = 18) => `<svg class="ic-svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATE_COLORS = STATE_ACCENT;
const FAULT_COLOR = '#ff5c6c';
const OFFLINE_COLOR = '#737b8c';

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
  start_cooking: 'button.{base}_start_cooking',
  top_element_state: 'sensor.{base}_top_element_state',
  bottom_element_state: 'sensor.{base}_bottom_element_state',
  grill_element_state: 'sensor.{base}_grill_element_state',
  fan_element_state: 'sensor.{base}_fan_element_state',
  frame_state: 'sensor.{base}_oven_frame_state',
  active_top_element: 'binary_sensor.{base}_active_top_element',
  active_bottom_element: 'binary_sensor.{base}_active_bottom_element',
  active_grill_element: 'binary_sensor.{base}_active_grill_element',
  active_fan_element: 'binary_sensor.{base}_active_fan_element',
  food_probe_temperature: 'sensor.{base}_food_probe_temperature',
  food_probe_connected: 'binary_sensor.{base}_food_probe_connected',
  food_target_temperature: 'number.{base}_food_target_temperature',
  cook_mode: 'number.{base}_cook_mode',
  kids_lock: 'switch.{base}_kids_lock',
  temperature_fault: 'binary_sensor.{base}_temperature_fault',
};

// ── Card class ───────────────────────────────────────────────────────────────
class LibreOvenCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._built = false;
    this._dragging = false;
    this._dragTemp = null;
    // Number values sent to HA but not yet reflected in its state:
    // entity_id -> { value, timer }. Keeps re-renders from snapping back.
    this._numPending = {};
    this._lastHtml = new Map();
    this._skeletonFor = null;  // variant the shadow skeleton was built for
    this._host = null;         // compact card that opened this one as a dialog
    this._durationTimer = null;
    this._delayTimer = null;
    this._foodTargetTimer = null;
    this._elemOptimistic = {};
    this._elemTimers = {};
    this._prevTimerStateCode = null; // null until the first state is seen, so mounting mid-program starts no grace period
    this._lastProgramStartAt = 0;
    this._showAt = false;      // "At…" time picker open
    this._dlg = null;          // compact variant: { wrap, card }
    this._onKey = (ev) => { if (ev.key === 'Escape') this._closeDialog(); };
  }

  static getStubConfig() {
    return { base_name: 'libre_oven' };
  }

  getCardSize() { return this._config?.variant === 'compact' ? 3 : 9; }

  setConfig(cfg) {
    if (!cfg.entities && !cfg.base_name) {
      throw new Error("libre-oven-card: 'entities' or 'base_name' is required");
    }
    if (cfg.recipes && !Array.isArray(cfg.recipes)) {
      throw new Error("libre-oven-card: 'recipes' must be a list");
    }
    const base = (cfg.base_name || '').replace(/-/g, '_');
    const entities = cfg.entities ? { ...cfg.entities } : {};
    if (base) {
      for (const [key, template] of Object.entries(ENTITY_TEMPLATES)) {
        if (!entities[key]) entities[key] = template.replace(/\{base\}/g, base);
      }
    }
    this._config = { ...cfg, entities };
    if (this._built) this._render();
  }

  set hass(hass) {
    if (!this._config) return;
    const prev = this._hass;
    this._hass = hass;
    if (this._dlg) this._dlg.card.hass = hass;

    // Reconcile optimistic element states with real HA state
    for (const [eid, expected] of Object.entries(this._elemOptimistic)) {
      if (hass.states[eid]?.state === expected) {
        clearTimeout(this._elemTimers[eid]);
        delete this._elemOptimistic[eid];
        delete this._elemTimers[eid];
      }
    }
    // Reconcile pending number values with real HA state
    for (const [eid, pend] of Object.entries(this._numPending)) {
      const real = Number.parseFloat(hass.states[eid]?.state);
      if (Number.isFinite(real) && Math.abs(real - pend.value) < 0.01) {
        clearTimeout(pend.timer);
        delete this._numPending[eid];
      }
    }

    const ids = Object.values(this._config.entities).filter(Boolean);
    // Only a slider drag pauses renders; a focused input only freezes its own region.
    if (this._dragging) return;
    if (prev && this._built && ids.every((id) => prev.states[id] === hass.states[id])) return;

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
    clearTimeout(this._foodTargetTimer);
    for (const t of Object.values(this._elemTimers)) clearTimeout(t);
    for (const pend of Object.values(this._numPending)) clearTimeout(pend.timer);
    this._closeDialog();
  }

  _initShadow() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('click', (e) => this._onClick(e));
    this.shadowRoot.addEventListener('input', (e) => this._onInput(e));
    this.shadowRoot.addEventListener('change', (e) => this._onChange(e));
    this.shadowRoot.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._built = true;
    LibreOvenCard._loadFont();
  }

  static _loadFont() {
    if (document.getElementById('libre-oven-inter')) return;
    const l = document.createElement('link');
    l.id = 'libre-oven-inter';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // The skeleton (styles and region containers) is built once per variant;
  // each render only replaces regions whose markup changed, so the fan
  // animation and badge pulse aren't restarted by every countdown tick, and a
  // region holding a focused input is left alone while the user types.
  _render() {
    if (!this._hass || !this._built) return;
    const compact = this._config.variant === 'compact';
    const variant = compact ? 'compact' : 'full';
    const root = this.shadowRoot;
    if (this._skeletonFor !== variant) {
      root.innerHTML = `<style>${this._css()}</style>${compact ? this._compactSkeleton() : this._fullSkeleton()}`;
      this._lastHtml = new Map();
      this._skeletonFor = variant;
    }
    const parts = compact ? this._compactParts() : this._fullParts();
    const card = root.getElementById('card');
    if (card.className !== parts.cls) card.className = parts.cls;
    const focused = root.activeElement;
    for (const [id, html] of Object.entries(parts.regions)) {
      const el = root.getElementById(id);
      if (!el) continue;
      if (focused && focused.tagName === 'INPUT' && el.contains(focused)) continue;
      this._setHtml(el, html);
    }
  }

  // Replace an element's HTML only when it changed. Returns true if replaced.
  _setHtml(el, html) {
    if (!el || this._lastHtml.get(el) === html) return false;
    el.innerHTML = html;
    this._lastHtml.set(el, html);
    return true;
  }

  _fullSkeleton() {
    return `<div id="card">
  <div class="dh" id="r-head"></div>
  <div id="r-banner"></div>
  <div class="body">
    <div class="hero-n" id="r-hero-n"></div>
    <div class="cav">
      <div class="ovenart" id="r-oven"></div>
      <div class="temps" id="r-temps"></div>
      <div id="r-probe"></div>
    </div>
    <div class="ctrls">
      <div class="hero-w" id="r-hero-w"></div>
      <div id="r-recipes"></div>
      <div id="r-temp"></div>
      <div id="r-el"></div>
      <div id="r-finish"></div>
      <div id="r-delay"></div>
      <div id="r-draft"></div>
      <div id="r-acts"></div>
    </div>
  </div>
</div>`;
  }

  _compactSkeleton() {
    return `<div id="card"><div id="g-main"></div><div id="g-side"></div><div class="g-wide" id="g-pr"></div><div class="g-wide" id="g-foot"></div></div>`;
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
    // Surface failures (e.g. the oven is offline) instead of failing silently.
    Promise.resolve(this._hass.callService(domain, service, data)).catch((err) => {
      this._toast(`Libre Oven: ${err?.message || 'action failed'}`);
    });
  }

  // Events for Home Assistant (notifications, more-info). A card shown in the
  // compact variant's dialog lives on document.body, outside HA's tree, so it
  // fires through the card that opened it.
  _fire(type, detail) {
    const from = this._host && this._host.isConnected ? this._host : this;
    from.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  _toast(message) {
    this._fire('hass-notification', { message });
  }

  // Set a number entity, remembering the value until HA reflects it (max 3 s)
  // so re-renders in between don't snap the control back to the old value.
  _setNumber(entityId, value) {
    if (!entityId) return;
    clearTimeout(this._numPending[entityId]?.timer);
    const timer = setTimeout(() => {
      delete this._numPending[entityId];
      this._render();
    }, 3000);
    this._numPending[entityId] = { value, timer };
    this._call('number', 'set_value', { entity_id: entityId, value });
  }

  _num(entityId, fallback = 0) {
    if (entityId && entityId in this._numPending) return this._numPending[entityId].value;
    return this._asNumber(this._getState(entityId, String(fallback)), fallback);
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
    const draftTemp = this._num(e.set_temperature, 0);
    const cookDuration = this._num(e.cook_duration, 0);
    const startDelay = this._num(e.start_delay, 0);
    // Offline: the device's entities are unavailable (power loss, Wi-Fi).
    // Without this, unavailable parses as state 0 and the card shows "Idle".
    const timerStateRaw = gs(e.timer_state_code, 'unavailable');
    const offline = timerStateRaw === 'unavailable';
    const timerStateCode = offline ? 0 : n(timerStateRaw, 0);
    const fault = !offline && gs(e.temperature_fault, 'off') === 'on';
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

    let mc = STATE_COLORS[timerStateCode] || '#757575';
    let stateLabel = STATE_LABELS[timerStateCode] || 'Idle';
    if (offline) { mc = OFFLINE_COLOR; stateLabel = 'Offline'; }
    else if (fault) { mc = FAULT_COLOR; stateLabel = 'Fault'; }

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
      offline, fault,
      foodTemp: n(gs(e.food_probe_temperature, 'nan'), NaN),
      foodProbeConnected: gs(e.food_probe_connected, 'off') === 'on',
      foodTarget: this._num(e.food_target_temperature, 0),
      // Read-only: the firmware picks the mode from probe presence and latches it for the run
      cookMode: n(gs(e.cook_mode, '0'), 0),
      kidsLock: gs(e.kids_lock, 'off') === 'on',
    };
  }


  // ── Small helpers for the new layout ───────────────────────────────────────
  // min/max/step of a number entity, from its attributes, with fallbacks.
  _range(entityId, min, max, step = 1) {
    const a = this._hass?.states?.[entityId]?.attributes || {};
    const f = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
    return { min: f(a.min, min), max: f(a.max, max), step: f(a.step, step) || 1 };
  }

  _exists(entityId) {
    return !!entityId && !!this._hass?.states?.[entityId];
  }

  // "HH:MM:SS" (or "MM:SS") -> seconds; NaN when unparsable.
  _parseHMS(text) {
    if (!text) return NaN;
    const parts = String(text).split(':').map(Number);
    if (parts.some((p) => !Number.isFinite(p))) return NaN;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  // Countdown for display: "17:42" under an hour, "1:05:12" above.
  _fmtCountdown(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0');
    return h ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
  }

  // Minutes for display: "45 min", "1 h", "1 h 20 min".
  _fmtMin(minutes) {
    const t = Math.max(0, Math.round(minutes));
    const h = Math.floor(t / 60);
    const m = t % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  _clock(msFromNow) {
    const d = new Date(Date.now() + msFromNow);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  _deg(v) {
    return Number.isFinite(v) ? `${Math.round(v)}°` : '--';
  }

  // Progress (0..1) and texts for the live program, shared by both variants.
  _progress(s) {
    const code = s.timerStateCode;
    // Keyed on the latched cook mode, not probe presence, so a probe that stops
    // reading mid-cook shows as such instead of falling back to the timer view.
    const probeMode = s.cookMode === 1;
    if (code === 1) {
      const rem = this._parseHMS(s.delayCountdown || s.activeCountdown);
      const tot = s.activeDelayTotal * 60;
      return {
        frac: tot > 0 && Number.isFinite(rem) ? 1 - rem / tot : 0,
        label: 'Starts in',
        big: Number.isFinite(rem) ? this._fmtCountdown(rem) : '--',
        sub: `at ${Number.isFinite(rem) ? this._clock(rem * 1000) : '--'} · then ${s.activeCookTotal > 0 ? this._fmtMin(s.activeCookTotal) : 'until stopped'}`,
        short: Number.isFinite(rem) ? `starts in ${this._fmtCountdown(rem)}` : 'waiting',
      };
    }
    if (code === 2) {
      const frac = s.activeTemp > 0 && Number.isFinite(s.ovenTemp) ? s.ovenTemp / s.activeTemp : 0;
      return {
        frac, label: 'Preheating',
        big: `${this._deg(s.ovenTemp)} <small>/ ${this._deg(s.activeTemp)}</small>`,
        sub: s.activeCookTotal > 0 ? `Then ${this._fmtMin(s.activeCookTotal)} of cooking` : 'Then cooks until stopped',
        short: `${this._deg(s.ovenTemp)} / ${this._deg(s.activeTemp)}`,
      };
    }
    if (code === 3) {
      return { frac: 1, label: 'Oven ready', big: this._deg(s.activeTemp), sub: 'Put the food in, then start cooking', short: 'ready, waiting for you' };
    }
    if (code === 4) {
      if (probeMode) {
        const frac = s.foodTarget > 0 && Number.isFinite(s.foodTemp) ? s.foodTemp / s.foodTarget : 0;
        return {
          frac, label: Number.isFinite(s.foodTemp) ? 'Food probe' : 'Food probe: no reading',
          big: `${this._deg(s.foodTemp)} <small>→ ${this._deg(s.foodTarget)}</small>`,
          sub: `Stops when the food reaches ${this._deg(s.foodTarget)}`,
          short: `food ${this._deg(s.foodTemp)} → ${this._deg(s.foodTarget)}`,
        };
      }
      const rem = this._parseHMS(s.cookCountdown || s.activeCountdown);
      const tot = s.activeCookTotal * 60;
      if (tot <= 0) return { frac: 1, label: 'Cooking', big: 'Until stopped', sub: 'No timer set', short: 'until stopped', noPct: true };
      return {
        frac: Number.isFinite(rem) ? 1 - rem / tot : 0,
        label: 'Cook time left',
        big: Number.isFinite(rem) ? this._fmtCountdown(rem) : '--',
        sub: `of ${this._fmtMin(s.activeCookTotal)} · done at ${Number.isFinite(rem) ? this._clock(rem * 1000) : '--'}`,
        short: Number.isFinite(rem) ? `${this._fmtCountdown(rem)} left` : 'cooking',
      };
    }
    return null;
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  _css() {
    return `
:host {
  --bg: #0b0d12; --bg2: #11141b; --surface: #161a22; --surface2: #1d222c; --line: rgba(255,255,255,.07);
  --text: #f2f3f5; --text2: #a9afbb; --text3: #737b8c;
  --amber: #ffb347; --heat: #ff7a45; --dry: #f5c542; --ok: #4ade80; --danger: #ff5c6c; --violet: #a78bfa;
  --r-lg: 26px;
  display: block; container-type: inline-size; color: var(--text);
  font-family: Inter, Figtree, Roboto, system-ui, sans-serif; -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
button:disabled { cursor: default; }
.ic-svg { fill: currentColor; flex-shrink: 0; display: block; }
ha-icon { --mdc-icon-size: 16px; display: inline-flex; }
.label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text3); font-weight: 600; }

.card { background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012)), var(--bg2); border: 1px solid var(--line); border-radius: 30px; overflow: hidden; user-select: none; -webkit-user-select: none; }
.dh { display: flex; align-items: center; gap: 12px; padding: 18px 20px 0; }
.dh .ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; background: rgba(255,255,255,.06); color: var(--text2); flex-shrink: 0; }
.card.hot .dh .ic { color: var(--heat); background: rgba(255,122,69,.14); }
.dh .tt { min-width: 0; }
.dh h3 { margin: 0; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dh p { margin: 1px 0 0; font-size: 12.5px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dh .sp { flex: 1; }
.iconbtn { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: var(--text2); background: rgba(255,255,255,.05); border: 1px solid var(--line); flex-shrink: 0; }
.iconbtn:hover { color: var(--text); }
.iconbtn.locked { color: var(--amber); background: rgba(255,179,71,.14); border-color: rgba(255,179,71,.3); }

.badge { font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 999px; display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; flex-shrink: 0; }
.badge .d { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.badge.st-idle { background: rgba(255,255,255,.07); color: var(--text2); }
.badge.st-wait { background: rgba(245,197,66,.14); color: var(--dry); }
.badge.st-pre { background: rgba(255,92,108,.16); color: var(--danger); }
.badge.st-ready, .badge.st-cook { background: rgba(74,222,128,.14); color: var(--ok); }
.badge.st-off { background: rgba(255,255,255,.07); color: var(--text3); }
.badge.st-fault { background: rgba(255,92,108,.18); color: var(--danger); }
.badge:not(.st-idle):not(.st-off) .d { box-shadow: 0 0 10px currentColor; animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .45; } }

/* Empty regions take no space (and no flex/grid gap). */
#card > div:empty, .body > div:empty, .cav > div:empty, .ctrls > div:empty { display: none !important; }

.banner { display: flex; gap: 12px; align-items: flex-start; margin: 14px 16px 0; padding: 12px 14px; border-radius: 18px; }
.banner div { flex: 1; min-width: 0; font-size: 13px; }
.banner small { display: block; font-size: 12px; color: var(--text2); margin-top: 2px; line-height: 1.4; }
.banner .ic-svg { margin-top: 1px; }
.banner.b-off { background: rgba(255,255,255,.05); border: 1px solid var(--line); color: var(--text2); }
.banner.b-off b { color: var(--text); }
.banner.b-fault { background: linear-gradient(90deg, rgba(255,92,108,.2), rgba(255,92,108,.07)); border: 1px solid rgba(255,92,108,.45); color: var(--danger); }
.banner.b-fault b { color: #ffd7dc; }
.card.offline .ctrls { opacity: .42; pointer-events: none; filter: saturate(.3); }
.card.offline .ovenart { opacity: .55; }
.card.fault .dh .ic { color: var(--danger); background: rgba(255,92,108,.14); }

.body { display: grid; grid-template-columns: 1fr; gap: 16px; padding: 16px 16px 18px; }
.body > *, .ctrls > *, .blk { min-width: 0; }
@container (min-width: 700px) {
  .body { grid-template-columns: 340px 1fr; gap: 22px; padding: 18px 22px 22px; }
  .dh { padding: 20px 22px 0; }
  .banner { margin: 16px 22px 0; }
}

.cav { border-radius: var(--r-lg); border: 1px solid var(--line); background: var(--surface); padding: 16px; display: flex; flex-direction: column; gap: 12px; align-self: start; }
.card.hot .cav { background: radial-gradient(240px 200px at 50% 40%, rgba(255,122,69,.24), transparent 70%), var(--surface); }
.ovenart { border-radius: 18px; background: #0d0f14; border: 1px solid rgba(255,255,255,.09); overflow: hidden; }
.ovenart svg { width: 100%; height: auto; display: block; }
.fan-spin { animation: spin 1.6s linear infinite; transform-box: fill-box; transform-origin: center; }
@keyframes spin { to { transform: rotate(360deg); } }
.temps { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tbig { border-radius: 16px; background: rgba(0,0,0,.28); padding: 12px; min-width: 0; }
.tbig b { display: block; font-size: 30px; font-weight: 300; letter-spacing: -.03em; margin-top: 2px; white-space: nowrap; }
.tbig b small { font-size: 14px; color: var(--text2); }
.tbig b s { color: var(--text3); font-size: 18px; margin-right: 4px; }
.tbig b em { font-style: normal; color: var(--amber); }
.tbig.link { text-align: left; width: 100%; cursor: pointer; transition: background .15s; }
.tbig.link:hover { background: rgba(255,255,255,.05); }
.tbig .label .ic-svg { display: inline-block; vertical-align: -2px; opacity: .7; }
.prog { height: 6px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; margin-top: 8px; }
.prog i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--amber), var(--heat)); }
.probe { display: flex; align-items: center; gap: 12px; border-radius: 16px; background: rgba(0,0,0,.28); padding: 10px 12px; color: var(--violet); }
.probe div { flex: 1; min-width: 0; color: var(--text); }
.probe b { font-size: 15px; font-weight: 600; }
.probe b span { color: var(--text3); font-weight: 500; }
.probe small { display: block; font-size: 11.5px; color: var(--text3); }

.ctrls { display: flex; flex-direction: column; gap: 16px; }
.blk .bh { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 0 2px 8px; }
.blk .bh small { font-size: 12px; color: var(--text2); text-align: right; }
.blk .bh small s { color: var(--text3); }
.blk .bh small em { font-style: normal; color: var(--amber); font-weight: 600; }

.timerhero { display: flex; align-items: center; gap: 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--line); padding: 16px 18px; }
.ring { position: relative; width: 82px; height: 82px; flex-shrink: 0; }
.ring svg { position: absolute; inset: 0; }
.ring b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 15px; font-weight: 600; }
.timerhero .tx { min-width: 0; flex: 1; }
.timerhero h4 { margin: 2px 0 0; font-size: 26px; font-weight: 300; letter-spacing: -.02em; white-space: nowrap; }
.timerhero h4 small { font-size: 16px; color: var(--text2); }
.timerhero p { margin: 2px 0 0; font-size: 12.5px; color: var(--text2); }
.hero-n { display: block; }
.hero-w { display: none; }
@container (min-width: 700px) { .hero-n { display: none; } .hero-w { display: block; } }
@container (max-width: 520px) { .timerhero { flex-wrap: wrap; } .timerhero .btn { flex-basis: 100%; } }

.row { display: flex; gap: 10px; align-items: center; }
.chipbtn { height: 44px; padding: 0 14px; border-radius: 14px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: rgba(255,255,255,.05); border: 1px solid var(--line); color: var(--text2); white-space: nowrap; flex-shrink: 0; }
.chipbtn:hover:not(:disabled) { color: var(--text); }
.chipbtn.on { background: rgba(255,179,71,.14); border-color: rgba(255,179,71,.42); color: var(--text); }
.chipbtn:disabled { opacity: .38; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.chips .chipbtn { height: 38px; padding: 0 13px; font-size: 12.5px; }
.chips input[type=time] { height: 38px; border-radius: 12px; border: 1px solid rgba(255,179,71,.42); background: rgba(0,0,0,.28); color: var(--text); font: inherit; font-size: 13px; padding: 0 10px; color-scheme: dark; }

.tslider { position: relative; flex: 1; height: 44px; border-radius: 16px; background: rgba(0,0,0,.28); overflow: hidden; touch-action: none; cursor: ew-resize; min-width: 0; }
.tslider .fill { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, rgba(255,179,71,.22), rgba(255,122,69,.55)); border-right: 3px solid #fff; }
.tslider .min { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--text3); font-weight: 600; }
.tslider .val { position: absolute; top: 50%; transform: translateY(-50%); font-size: 15px; font-weight: 600; white-space: nowrap; pointer-events: none; }
.tslider.dragging { cursor: grabbing; }

.el { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.elb { border-radius: 16px; padding: 12px 6px 10px; background: var(--surface); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text2); position: relative; min-width: 0; }
.elb svg { width: 34px; height: 26px; }
.elb.on { color: var(--text); border-color: rgba(255,179,71,.4); background: linear-gradient(180deg, rgba(255,179,71,.12), transparent), var(--surface); }
.elb.heat { border-color: rgba(255,92,108,.5); box-shadow: 0 0 26px -10px rgba(255,92,108,.9); }
.elb .flag { position: absolute; top: 5px; right: 6px; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
.flag.add { background: rgba(74,222,128,.18); color: var(--ok); }
.flag.rm { background: rgba(255,92,108,.18); color: var(--danger); }

.mode { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--text2); margin: 0 2px 8px; }
.mode b { color: var(--text); font-weight: 600; }
.mode .ic-svg { color: var(--violet); }

.stepper { display: flex; align-items: center; gap: 6px; border-radius: 16px; background: rgba(0,0,0,.28); padding: 6px; }
.stepper button { width: 42px; height: 38px; border-radius: 11px; background: rgba(255,255,255,.06); font-size: 13px; font-weight: 600; color: var(--text2); flex-shrink: 0; }
.stepper button:hover { color: var(--text); }
.stepper .v { flex: 1; min-width: 0; display: flex; align-items: baseline; justify-content: center; gap: 4px; white-space: nowrap; }
.stepper .v input { width: 3.6em; background: none; border: 0; border-bottom: 1px solid transparent; color: var(--text); font: inherit; font-size: 20px; font-weight: 500; text-align: right; padding: 0; -moz-appearance: textfield; }
.stepper .v input:focus { outline: none; border-bottom-color: var(--amber); }
.stepper .v input::-webkit-inner-spin-button, .stepper .v input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.stepper .v span { font-size: 13px; color: var(--text2); }
.hint { font-size: 12px; color: var(--text3); margin: 6px 2px 0; }
@container (max-width: 420px) { .stepper button { width: 36px; } }

.recipes { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.recipes::-webkit-scrollbar { display: none; }
.recipe { padding: 9px 12px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: flex-start; gap: 2px; font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; flex-shrink: 0; text-align: left; }
.recipe span { display: inline-flex; gap: 5px; align-items: center; }
.recipe small { font-size: 11px; color: var(--text3); font-weight: 500; }
.recipe.on { background: rgba(255,179,71,.14); border-color: rgba(255,179,71,.42); }
.recipe.on ha-icon { color: var(--amber); }

.draft { display: flex; align-items: center; gap: 12px; border-radius: 18px; padding: 12px 14px; background: linear-gradient(90deg, rgba(255,179,71,.16), rgba(255,179,71,.05)); border: 1px solid rgba(255,179,71,.35); color: var(--amber); }
.draft div { flex: 1; min-width: 0; font-size: 13px; color: var(--text); }
.draft small { display: block; color: var(--text2); font-size: 12px; margin-top: 1px; }
.btn { height: 44px; padding: 0 18px; border-radius: 14px; font-weight: 600; font-size: 13.5px; display: inline-flex; align-items: center; gap: 8px; justify-content: center; white-space: nowrap; }
.btn.pri { background: var(--amber); color: #1b1006; }
.btn.go { background: var(--ok); color: #06210f; }
.btn.go:disabled { background: rgba(255,255,255,.06); color: var(--text3); }
.btn.red { background: rgba(255,92,108,.12); color: var(--danger); border: 1px solid rgba(255,92,108,.3); }
.btn.ghost { background: rgba(255,255,255,.05); border: 1px solid var(--line); color: var(--text2); }
.acts { display: flex; gap: 10px; }
.acts .btn { flex: 1; }

/* compact glance */
.glance { border-radius: 22px; padding: 16px; border: 1px solid var(--line); background: var(--surface); display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px 12px; align-items: center; user-select: none; -webkit-user-select: none; }
.glance.hot { background: radial-gradient(300px 160px at 100% 0%, rgba(255,122,69,.22), transparent 70%), var(--surface); }
.glance .name { font-size: 13px; font-weight: 600; color: var(--text2); display: flex; gap: 8px; align-items: center; min-width: 0; }
.glance .name > span:first-of-type { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.glance.hot .name .ic-svg { color: var(--heat); }
.glance .name .badge { padding: 3px 8px; font-size: 11px; }
.glance .big { font-size: 38px; font-weight: 300; letter-spacing: -.03em; line-height: 1.1; white-space: nowrap; }
.glance .big small { font-size: 14px; color: var(--text2); margin-left: 4px; letter-spacing: 0; }
.glance .mini { width: 90px; height: 60px; display: block; }
.g-wide { grid-column: 1 / -1; }
.glance.fault { border-color: rgba(255,92,108,.45); }
.glance.offline .big, .glance.offline .mini { opacity: .5; }
.glance .pr { grid-column: 1 / -1; display: flex; gap: 14px; align-items: center; font-size: 12.5px; color: var(--text2); }
.glance .pr .prog { flex: 1; margin: 0; }
.glance .foot { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text2); }
.glance .foot > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.glance .link { color: var(--text); font-weight: 600; font-size: 12.5px; display: inline-flex; gap: 0; align-items: center; white-space: nowrap; flex-shrink: 0; }
.glance .btn { height: 38px; padding: 0 14px; }
`;
  }

  // ── Oven drawing ───────────────────────────────────────────────────────────
  // Cavity with top and bottom elements, grill zigzag under the top element and a
  // convection fan on the back wall sized like a real one.
  _ovenSvg(s) {
    const c = (st) => EL_COLORS[st] || EL_COLORS.off;
    const glow = (st) => (st === 'active-heat' ? 'drop-shadow(0 0 7px #ff5c6c)' : (st === 'armed-heat' || st === 'active-aux') ? 'drop-shadow(0 0 5px #ffb347)' : 'none');
    const frameHot = s.frameState === 'active-aux';
    const glowOpacity = frameHot ? 0.34 : s.frameState === 'selected' ? 0.1 : 0;
    let z = 'M62 54';
    for (let i = 0; i < 10; i++) z += ` l9.8 ${i % 2 ? -6 : 6} l9.8 ${i % 2 ? 6 : -6}`;
    const fc = c(s.fanState);
    const blades = [0, 72, 144, 216, 288].map((r) =>
      `<path d="M0 -6 C10 -10 22 -24 14 -40 C2 -36 -6 -22 0 -6Z" fill="${fc}" opacity=".92" transform="rotate(${r})"/>`).join('');
    const spokes = [0, 30, 60, 90, 120, 150].map((r) =>
      `<line x1="0" y1="-50" x2="0" y2="50" stroke="${fc}" stroke-width="1" opacity=".22" transform="rotate(${r})"/>`).join('');
    const ledges = [86, 132].map((y) =>
      `<path d="M38 ${y}h14M268 ${y}h14" stroke="rgba(255,255,255,.14)" stroke-width="3" stroke-linecap="round"/>`).join('');
    return `<svg viewBox="0 0 320 210" role="img" aria-label="Oven elements">
  <defs><radialGradient id="cavg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ff7a45" stop-opacity="${glowOpacity}"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></radialGradient></defs>
  <rect x="14" y="12" width="292" height="186" rx="16" fill="#14171e" stroke="${frameHot ? 'rgba(255,179,71,.45)' : 'rgba(255,255,255,.1)'}"/>
  <rect x="30" y="26" width="260" height="158" rx="11" fill="url(#cavg)" stroke="rgba(255,255,255,.06)"/>
  ${ledges}
  <g transform="translate(160 107)" style="filter:${glow(s.fanState)}">
    <circle r="50" fill="none" stroke="${fc}" stroke-width="2" opacity=".55"/>
    <circle r="40" fill="none" stroke="${fc}" stroke-width="1" opacity=".25"/>
    ${spokes}
    <g class="${s.fanState === 'active-aux' ? 'fan-spin' : ''}"><circle r="48" fill="none"/>${blades}<circle r="7" fill="#14171e" stroke="${fc}" stroke-width="2"/></g>
  </g>
  <path d="${z}" fill="none" stroke="${c(s.grillState)}" stroke-width="2.4" stroke-linejoin="round" style="filter:${glow(s.grillState)}"/>
  <line x1="48" y1="38" x2="272" y2="38" stroke="${c(s.topState)}" stroke-width="5" stroke-linecap="round" style="filter:${glow(s.topState)}"/>
  <line x1="48" y1="172" x2="272" y2="172" stroke="${c(s.bottomState)}" stroke-width="5" stroke-linecap="round" style="filter:${glow(s.bottomState)}"/>
</svg>`;
  }

  _miniOvenSvg(s) {
    const c = (st) => EL_COLORS[st] || EL_COLORS.off;
    return `<svg class="mini" viewBox="0 0 90 60" aria-hidden="true">
  <rect x="4" y="4" width="82" height="52" rx="9" fill="#0d0f14" stroke="rgba(255,255,255,.12)"/>
  <rect x="12" y="12" width="66" height="36" rx="5" fill="${s.frameState === 'active-aux' ? 'rgba(255,122,69,.14)' : 'rgba(255,255,255,.02)'}"/>
  <circle cx="45" cy="30" r="10" fill="none" stroke="${c(s.fanState)}" stroke-width="1.6" opacity=".8"/>
  <path d="M18 17h54" stroke="${c(s.topState)}" stroke-width="3" stroke-linecap="round"/>
  <path d="M18 43h54" stroke="${c(s.bottomState)}" stroke-width="3" stroke-linecap="round"/>
</svg>`;
  }

  // Element button icon: a small cavity with the element drawn in its state colour.
  _elIcon(kind, color) {
    const frame = '<rect x="3" y="4" width="28" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".5"/>';
    const body = {
      top: `<path d="M7 8h20" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`,
      bottom: `<path d="M7 18h20" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`,
      grill: `<path d="M8 8l3 2 3-2 3 2 3-2 3 2 3-2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`,
      fan: `<circle cx="17" cy="13" r="6" fill="none" stroke="${color}" stroke-width="1.6"/><path d="M17 13c2-1 3-3 1-5M17 13c-1 2-3 3-5 1M17 13c1 2 3 3 5 1" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>`,
    }[kind];
    return `<svg viewBox="0 0 34 26" aria-hidden="true">${frame}${body}</svg>`;
  }

  _recipeMatches(r, s) {
    const els = (r.elements || []).map((x) => String(x).toLowerCase());
    const want = { top: els.includes('top'), bottom: els.includes('bottom'), grill: els.includes('grill'), fan: els.includes('fan') };
    if (want.top !== s.topOn || want.bottom !== s.bottomOn || want.grill !== s.grillOn || want.fan !== s.fanOn) return false;
    if (r.temperature != null && Math.round(r.temperature) !== Math.round(s.draftTemp)) return false;
    if (r.duration != null && !r.probe_target && Math.round(r.duration) !== Math.round(s.cookDuration)) return false;
    return true;
  }

  _recipeSummary(r) {
    const els = (r.elements || []).map((x) => String(x)[0].toUpperCase() + String(x).slice(1).toLowerCase());
    const bits = [els.join('+') || 'No elements'];
    if (r.temperature != null) bits.push(`${Math.round(r.temperature)}°`);
    if (r.probe_target != null) bits.push(`probe ${Math.round(r.probe_target)}°`);
    else if (r.duration != null) bits.push(this._fmtMin(r.duration));
    return bits.join(' · ');
  }

  // ── Full card ──────────────────────────────────────────────────────────────
  // State badge: offline and fault take precedence over the program state.
  _badge(s) {
    if (s.offline) return { key: 'off', label: 'Offline' };
    if (s.fault) return { key: 'fault', label: 'Fault' };
    return { key: STATE_KEYS[s.timerStateCode] || 'idle', label: STATE_LABELS[s.timerStateCode] || 'Idle' };
  }

  _fullParts() {
    const s = this._readState();
    const e = this._config.entities;
    const cfg = this._config;
    const code = s.timerStateCode;
    const key = STATE_KEYS[code] || 'idle';
    const acc = STATE_ACCENT[code] || STATE_ACCENT[0];
    const hot = s.frameState === 'active-aux' || (Number.isFinite(s.ovenTemp) && s.ovenTemp > 60);
    const pr = this._progress(s);
    const probeMode = s.cookMode === 1;
    const badge = this._badge(s);
    const tRange = this._range(e.set_temperature, MIN_TEMP, MAX_TEMP, 1);
    const shownTemp = this._dragging && this._dragTemp != null ? this._dragTemp : Math.round(s.draftTemp);
    const tFrac = Math.max(0, Math.min(1, (shownTemp - tRange.min) / ((tRange.max - tRange.min) || 1)));

    const elSummary = s.programActive && s.hasElSensors ? s.elementsActiveSummary : s.elementsSummary;
    const subtitle = s.offline ? 'Not reachable' : s.programActive
      ? `${elSummary} · ${this._deg(s.activeTemp)}`
      : (elSummary === 'None' ? `Idle · ${this._deg(s.ovenTemp)} inside` : `Draft: ${elSummary} · ${this._deg(s.draftTemp)}`);

    // Header
    const lockBtn = this._exists(e.kids_lock)
      ? `<button class="iconbtn${s.kidsLock ? ' locked' : ''}" data-action="toggle-kids-lock" ${s.offline ? 'disabled' : ''} title="${s.kidsLock ? 'Child lock on: tap to unlock the knobs' : 'Child lock off: tap to lock the knobs'}" aria-label="Toggle child lock">${svgIcon(s.kidsLock ? 'lock' : 'unlock')}</button>`
      : '';
    const closeBtn = cfg._inDialog ? `<button class="iconbtn" data-action="close-dialog" title="Close" aria-label="Close">${svgIcon('close')}</button>` : '';

    // Left column
    const targetVal = s.programActive ? s.activeTemp : s.draftTemp;
    const targetHtml = s.tempChanged
      ? `<s>${Math.round(s.activeTemp)}</s><em>${Math.round(s.draftTemp)}</em><small>°C</small>`
      : `${targetVal > 0 ? Math.round(targetVal) : '--'}<small>°C</small>`;
    const heatFrac = targetVal > 0 && Number.isFinite(s.ovenTemp) ? Math.min(1, s.ovenTemp / targetVal) : 0;
    const probeRow = s.foodProbeConnected || (probeMode && s.programActive)
      ? `<div class="probe">${svgIcon('probe', 22)}<div><b>${this._deg(s.foodTemp)} <span>→ ${this._deg(s.foodTarget)}</span></b><small>${Number.isFinite(s.foodTemp) ? 'Food probe' : 'Food probe: no reading'}${probeMode ? ` · auto-stop at ${this._deg(s.foodTarget)}` : ' · timer mode'}</small></div></div>`
      : '';

    // Timer hero (live program only)
    let hero = '';
    if (pr) {
      const R = 34, C = 2 * Math.PI * R, f = Math.max(0, Math.min(1, pr.frac));
      hero = `<div class="timerhero">
  <div class="ring"><svg viewBox="0 0 82 82"><circle cx="41" cy="41" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/>
    <circle cx="41" cy="41" r="${R}" fill="none" stroke="${acc}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 41 41)" style="filter:drop-shadow(0 0 5px ${acc})"/></svg>
    <b>${pr.noPct ? '∞' : Math.round(f * 100) + '%'}</b></div>
  <div class="tx"><div class="label">${pr.label}</div><h4>${pr.big}</h4><p>${pr.sub}</p></div>
  ${code === 3 && e.start_cooking ? `<button class="btn go" data-action="start-cooking" ${s.offline || s.fault ? 'disabled' : ''}>${svgIcon('play')}Start cooking</button>` : ''}
</div>`;
    }

    // Recipes (idle only; a recipe only fills in the draft)
    const recipes = (cfg.recipes || []);
    const recipesBlk = !s.programActive && recipes.length ? `<div class="blk"><div class="bh"><span class="label">Recipes</span><small>fills in the settings</small></div>
  <div class="recipes">${recipes.map((r, i) => `<button class="recipe${this._recipeMatches(r, s) ? ' on' : ''}" data-action="recipe" data-idx="${i}"><span>${r.icon ? `<ha-icon icon="${esc(r.icon)}"></ha-icon>` : ''}${esc(r.name || `Recipe ${i + 1}`)}</span><small>${esc(this._recipeSummary(r))}</small></button>`).join('')}</div></div>` : '';

    // Temperature
    const tempNote = s.tempChanged ? `<s>${Math.round(s.activeTemp)}°</s> → <em>${Math.round(s.draftTemp)}°</em>` : 'drag or ±5°';
    const tempBlk = `<div class="blk"><div class="bh"><span class="label">Temperature</span><small>${tempNote}</small></div>
  <div class="row">
    <button class="chipbtn" data-action="temp-down" aria-label="5 degrees less">${svgIcon('minus')}</button>
    <div class="tslider" data-slider="temp" data-min="${tRange.min}" data-max="${tRange.max}">
      <div class="fill" style="width:${(tFrac * 100).toFixed(1)}%"></div>
      ${tFrac > 0.3 ? `<span class="min">${tRange.min}°</span>` : ''}
      ${shownTemp > 0 ? `<span class="val" style="left:max(48px, calc(${(tFrac * 100).toFixed(1)}% - 58px))">${shownTemp}°</span>` : `<span class="val" style="left:14px;color:var(--text3);font-weight:500">Drag to set a temperature</span>`}
    </div>
    <button class="chipbtn" data-action="temp-up" aria-label="5 degrees more">${svgIcon('plus')}</button>
  </div></div>`;

    // Elements
    const elBtn = (kind, label, on, state, inActive, changed) => {
      const heat = state === 'active-heat';
      const color = state === 'off' ? EL_COLORS.off : EL_COLORS[state] || EL_COLORS.selected;
      const flag = changed ? (on ? '<span class="flag add">+ add</span>' : '<span class="flag rm">− off</span>') : '';
      return `<button class="elb${on ? ' on' : ''}${heat ? ' heat' : ''}" data-action="toggle-${kind}" aria-pressed="${on}">${flag}${this._elIcon(kind, on || state !== 'off' ? color : '#737b8c')}${label}</button>`;
    };
    const elBlk = `<div class="blk"><div class="bh"><span class="label">Elements</span><small>any combination</small></div>
  <div class="el">
    ${elBtn('top', 'Top', s.topOn, s.topState, s.topActiveInProgram, s.topChanged && !this._inGrace(s))}
    ${elBtn('bottom', 'Bottom', s.bottomOn, s.bottomState, s.bottomActiveInProgram, s.bottomChanged && !this._inGrace(s))}
    ${elBtn('grill', 'Grill', s.grillOn, s.grillState, s.grillActiveInProgram, s.grillChanged && !this._inGrace(s))}
    ${elBtn('fan', 'Fan', s.fanOn, s.fanState === 'active-aux' ? 'armed-heat' : s.fanState, s.fanActiveInProgram, s.fanChanged && !this._inGrace(s))}
  </div></div>`;

    // Finish by: timer or probe
    const hasProbe = this._exists(e.food_probe_connected);
    // Cook mode is read-only: the oven picks it from probe presence (and latches
    // it for the run), so it's shown, not offered as a choice.
    const seg = hasProbe ? `<div class="mode">${probeMode
      ? `${svgIcon('probe', 16)}<span><b>Probe mode</b> · set by the oven while a probe is plugged in</span>`
      : `${svgIcon('timer', 16)}<span><b>Timer mode</b> · plug in the food probe to finish by food temperature</span>`}</div>` : '';
    const dRange = this._range(e.cook_duration, 0, 1439, 1);
    const fRange = this._range(e.food_target_temperature, 0, 300, 1);
    const durNote = s.durationChanged
      ? `<s>${this._fmtMin(s.activeCookTotal)}</s> → <em>${this._fmtMin(s.cookDuration)}</em>`
      : (code >= 2 && code <= 4 && s.activeDelayTotal > 0 ? 'start delay already passed' : '');
    const finishBlk = probeMode
      ? `<div class="blk"><div class="bh"><span class="label">Finish by</span><small>food now ${this._deg(s.foodTemp)}</small></div>${seg}
  <div class="stepper"><button data-action="food-target-down-10">−10</button><button data-action="food-target-down">−1</button>
    <label class="v"><input id="food-target-input" type="number" inputmode="numeric" min="${fRange.min}" max="${fRange.max}" value="${Math.round(s.foodTarget)}" aria-label="Food target temperature"><span>°C food</span></label>
    <button data-action="food-target-up">+1</button><button data-action="food-target-up-10">+10</button></div></div>`
      : `<div class="blk"><div class="bh"><span class="label">${hasProbe ? 'Finish by' : 'Cook time'}</span><small>${durNote}</small></div>${seg}
  <div class="stepper"><button data-action="duration-down-10">−10</button><button data-action="duration-down">−1</button>
    <label class="v"><input id="duration-input" type="number" inputmode="numeric" min="${dRange.min}" max="${dRange.max}" value="${Math.round(s.cookDuration)}" aria-label="Cook time in minutes"><span>min</span></label>
    <button data-action="duration-up">+1</button><button data-action="duration-up-10">+10</button></div>
  ${Math.round(s.cookDuration) === 0 ? '<div class="hint">0 min cooks until you stop it</div>' : ''}</div>`;

    // Start delay
    const lRange = this._range(e.start_delay, 0, 1439, 1);
    let delayBlk = '';
    if (!s.programActive) {
      const d = Math.round(s.startDelay);
      const chip = (min, label) => `<button class="chipbtn${d === min ? ' on' : ''}" data-action="delay-chip" data-min="${min}" ${min > lRange.max ? 'disabled' : ''}>${label}</button>`;
      const custom = ![0, 30, 60].includes(d);
      delayBlk = `<div class="blk"><div class="bh"><span class="label">Start</span><small>${d > 0 ? `begins at ${this._clock(d * 60000)}` : 'right away'}</small></div>
  <div class="chips">${chip(0, 'Now')}${chip(30, 'in 30 min')}${chip(60, 'in 1 h')}
    ${this._showAt
      ? `<input id="at-input" type="time" aria-label="Start at" value="${this._clock(Math.max(d, 60) * 60000)}">`
      : `<button class="chipbtn${custom ? ' on' : ''}" data-action="delay-at">${svgIcon('clock', 15)}${custom ? `at ${this._clock(d * 60000)}` : 'At…'}</button>`}
  </div></div>`;
    } else if (code === 1) {
      const lNote = s.delayChanged ? `<s>${this._fmtMin(s.activeDelayTotal)}</s> → <em>${this._fmtMin(s.startDelay)}</em>` : '';
      delayBlk = `<div class="blk"><div class="bh"><span class="label">Start delay</span><small>${lNote}</small></div>
  <div class="stepper"><button data-action="delay-down-10">−10</button><button data-action="delay-down">−1</button>
    <label class="v"><input id="delay-input" type="number" inputmode="numeric" min="${lRange.min}" max="${lRange.max}" value="${Math.round(s.startDelay)}" aria-label="Start delay in minutes"><span>min</span></label>
    <button data-action="delay-up">+1</button><button data-action="delay-up-10">+10</button></div></div>`;
    }

    // Draft bar
    let draftBar = '';
    if (s.anyDraftChange) {
      const bits = [];
      if (s.tempChanged) bits.push(`target ${Math.round(s.activeTemp)}° → ${Math.round(s.draftTemp)}°`);
      if (s.durationChanged) bits.push(`cook ${this._fmtMin(s.activeCookTotal)} → ${this._fmtMin(s.cookDuration)}`);
      if (s.delayChanged) bits.push(`delay ${this._fmtMin(s.activeDelayTotal)} → ${this._fmtMin(s.startDelay)}`);
      for (const [label, on, ch] of [['top', s.topOn, s.topChanged], ['bottom', s.bottomOn, s.bottomChanged], ['grill', s.grillOn, s.grillChanged], ['fan', s.fanOn, s.fanChanged]]) {
        if (ch) bits.push(`${label} ${on ? 'added' : 'removed'}`);
      }
      const txt = bits.join(', ');
      draftBar = `<div class="draft">${svgIcon('pencil', 20)}<div><b>${bits.length} change${bits.length === 1 ? '' : 's'} not applied yet</b><small>${txt.charAt(0).toUpperCase() + txt.slice(1)}</small></div><button class="btn pri" data-action="start-program">Update</button></div>`;
    }

    // Actions
    const anyEl = s.topOn || s.bottomOn || s.grillOn || s.fanOn;
    // Offline: nothing can be sent. Fault: the oven refuses to start, and the
    // fault already cancelled any program.
    let acts;
    if (s.programActive) {
      acts = `<div class="acts"><button class="btn red" data-action="cancel-program" ${s.offline ? 'disabled' : ''}>${svgIcon('stop')}Cancel program</button></div>`;
    } else {
      const label = s.offline ? 'Oven offline'
        : s.fault ? 'Heating blocked by a fault'
        : anyEl ? `Start${s.startDelay > 0 ? ` · begins at ${this._clock(Math.round(s.startDelay) * 60000)}` : ''}` : 'Pick an element to start';
      acts = `<div class="acts"><button class="btn go" data-action="start-program" ${anyEl && !s.offline && !s.fault ? '' : 'disabled'}>${svgIcon('play')}${label}</button></div>`;
    }
    const banner = s.offline
      ? `<div class="banner b-off">${svgIcon('offline', 20)}<div><b>Oven offline</b><small>It isn't reachable (power or Wi-Fi). Controls come back when it reconnects.</small></div></div>`
      : s.fault
        ? `<div class="banner b-fault">${svgIcon('alert', 20)}<div><b>Temperature fault: heating is blocked</b><small>Check the oven's temperature sensor, then press a knob on the oven to clear the fault.</small></div></div>`
        : '';

    return {
      cls: `card${hot && !s.offline ? ' hot' : ''}${s.offline ? ' offline' : ''}${s.fault ? ' fault' : ''}`,
      regions: {
        'r-head': `<div class="ic">${svgIcon('stove', 22)}</div>
    <div class="tt"><h3>${esc(cfg.title || 'Libre Oven')}</h3><p>${esc(subtitle)}</p></div>
    <div class="sp"></div>
    <span class="badge st-${badge.key}"><span class="d"></span>${badge.label}</span>
    ${lockBtn}${closeBtn}`,
        'r-banner': banner,
        'r-hero-n': hero,
        'r-oven': this._ovenSvg(s),
        'r-temps': `<button class="tbig link" data-action="temp-history" title="Temperature history (from the preheat during a program)"><span class="label">Oven ${svgIcon('chart', 13)}</span><b>${Number.isFinite(s.ovenTemp) ? Math.round(s.ovenTemp) : '--'}<small>°C</small></b><div class="prog"><i style="width:${(heatFrac * 100).toFixed(0)}%"></i></div></button>
        <div class="tbig"><span class="label">${s.programActive ? 'Target' : 'Set to'}</span><b>${targetHtml}</b></div>`,
        'r-probe': probeRow,
        'r-hero-w': hero,
        'r-recipes': recipesBlk,
        'r-temp': tempBlk,
        'r-el': elBlk,
        'r-finish': finishBlk,
        'r-delay': delayBlk,
        'r-draft': draftBar,
        'r-acts': acts,
      },
    };
  }

  // Elements flagged as changed are only shown after the 5 s grace period, like the draft bar.
  _inGrace(s) {
    return s.programActive && (Date.now() - this._lastProgramStartAt) < 5000;
  }

  // ── Compact glance ─────────────────────────────────────────────────────────
  _compactParts() {
    const s = this._readState();
    const code = s.timerStateCode;
    const badge = this._badge(s);
    const pr = this._progress(s);
    const hot = s.frameState === 'active-aux' || (Number.isFinite(s.ovenTemp) && s.ovenTemp > 60);
    const elSummary = s.programActive && s.hasElSensors ? s.elementsActiveSummary : s.elementsSummary;
    const big = s.programActive
      ? `${this._deg(s.ovenTemp)}<small>→ ${this._deg(s.activeTemp)}</small>`
      : `${this._deg(s.ovenTemp)}<small>inside</small>`;
    let foot;
    if (s.offline) {
      foot = 'Oven offline';
    } else if (s.fault) {
      foot = 'Temperature fault: heating blocked';
    } else if (s.programActive) {
      const then = code === 2 ? (s.activeCookTotal > 0 ? `Then ${this._fmtMin(s.activeCookTotal)} · ` : 'Then until stopped · ') : '';
      foot = `${then}${elSummary}`;
    } else {
      foot = elSummary === 'None' ? 'No program set' : `Draft: ${elSummary} · ${this._deg(s.draftTemp)}`;
    }
    const prRow = pr ? `<div class="pr"><div class="prog"><i style="width:${(Math.max(0, Math.min(1, pr.frac)) * 100).toFixed(0)}%"></i></div><span>${pr.short}</span></div>` : '';
    const right = s.programActive || s.offline || s.fault ? this._miniOvenSvg(s) : `<button class="btn ghost" data-action="open-dialog">${svgIcon('play', 16)}Set up</button>`;
    return {
      cls: `glance${hot && !s.offline ? ' hot' : ''}${s.offline ? ' offline' : ''}${s.fault ? ' fault' : ''}`,
      regions: {
        'g-main': `<div class="name">${svgIcon('stove', 16)}<span>${esc(this._config.title || 'Libre Oven')}</span><span class="badge st-${badge.key}"><span class="d"></span>${badge.label}</span></div>
    <div class="big">${big}</div>`,
        'g-side': right,
        'g-pr': s.offline ? '' : prRow,
        'g-foot': `<div class="foot"><span>${esc(foot)}</span><button class="link" data-action="open-dialog">Full controls ${svgIcon('chevron', 16)}</button></div>`,
      },
    };
  }

  // ── Compact → full dialog ──────────────────────────────────────────────────
  // The dialog lives on document.body so no transformed or clipped ancestor of
  // the card (a dashboard sheet, a grid) can trap the fixed positioning.
  _openDialog() {
    if (this._dlg) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,6,10,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow:auto';
    const card = document.createElement(CARD_TAG);
    const { variant, ...rest } = this._config;
    card.setConfig({ ...rest, variant: 'full', _inDialog: true });
    card._host = this;
    card.style.cssText = 'width:min(880px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:30px;box-shadow:0 40px 80px -30px rgba(0,0,0,.8);margin:auto';
    card.addEventListener('libre-oven-close', () => this._closeDialog());
    wrap.addEventListener('click', (ev) => { if (ev.target === wrap) this._closeDialog(); });
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    card.hass = this._hass;
    document.addEventListener('keydown', this._onKey);
    this._dlg = { wrap, card };
  }

  _closeDialog() {
    if (!this._dlg) return;
    this._dlg.wrap.remove();
    document.removeEventListener('keydown', this._onKey);
    this._dlg = null;
  }

  // ── Temperature slider drag ────────────────────────────────────────────────
  _onPointerDown(ev) {
    const el = ev.composedPath().find((n) => n instanceof Element && n.dataset?.slider === 'temp');
    if (!el || (ev.pointerType === 'mouse' && ev.button !== 0) || this._readState().offline) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    el.classList.add('dragging');
    this._dragging = true;
    const min = Number(el.dataset.min), max = Number(el.dataset.max);
    const apply = (e2) => {
      const r = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e2.clientX - r.left) / r.width));
      const t = Math.max(min, Math.min(max, Math.round((min + frac * (max - min)) / 5) * 5));
      this._dragTemp = t;
      const f = ((t - min) / ((max - min) || 1)) * 100;
      el.querySelector('.fill').style.width = `${f.toFixed(1)}%`;
      const v = el.querySelector('.val');
      v.style.left = `max(48px, calc(${f.toFixed(1)}% - 58px))`;
      v.textContent = `${t}°`;
    };
    apply(ev);
    const move = (e2) => apply(e2);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      this._dragging = false;
      el.classList.remove('dragging');
      const t = this._dragTemp;
      this._dragTemp = null;
      if (t != null) this._setNumber(this._config.entities.set_temperature, t);
      this._render();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  // ── Click handling ─────────────────────────────────────────────────────────
  _onClick(e) {
    const actionEl = e.composedPath().find((el) => el instanceof Element && el.dataset?.action);
    if (!actionEl || actionEl.disabled) return;
    const action = actionEl.dataset.action;
    const ent = this._config.entities;
    // Offline: nothing can reach the oven, so only the card's own navigation works.
    if (this._readState().offline && !['open-dialog', 'close-dialog', 'temp-history'].includes(action)) return;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    switch (action) {
      case 'open-dialog': this._openDialog(); return;
      case 'close-dialog': this.dispatchEvent(new CustomEvent('libre-oven-close')); return;

      // Oven temperature history (native HA graph). HA's dialogs and pages sit
      // under the compact card's dialog, so that closes first.
      case 'temp-history':
        if (this._host) this._host._closeDialog();
        this._openTempHistory();
        return;

      case 'toggle-kids-lock':
        if (ent.kids_lock) this._call('switch', 'toggle', { entity_id: ent.kids_lock });
        return;

      case 'temp-up':
      case 'temp-down': {
        const r = this._range(ent.set_temperature, MIN_TEMP, MAX_TEMP, 1);
        const cur = this._num(ent.set_temperature, 0);
        const next = action === 'temp-up'
          ? clamp(Math.ceil((cur + 1) / 5) * 5, r.min, r.max)
          : clamp(Math.floor((cur - 1) / 5) * 5, r.min, r.max);
        this._setNumber(ent.set_temperature, next);
        this._render();
        return;
      }

      case 'duration-up': case 'duration-up-10': case 'duration-down': case 'duration-down-10': {
        const delta = { 'duration-up': 1, 'duration-up-10': 10, 'duration-down': -1, 'duration-down-10': -10 }[action];
        const r = this._range(ent.cook_duration, 0, 1439, 1);
        this._adjustNumberInput('duration-input', ent.cook_duration, delta, r.min, r.max);
        return;
      }
      case 'delay-up': case 'delay-up-10': case 'delay-down': case 'delay-down-10': {
        const delta = { 'delay-up': 1, 'delay-up-10': 10, 'delay-down': -1, 'delay-down-10': -10 }[action];
        const r = this._range(ent.start_delay, 0, 1439, 1);
        this._adjustNumberInput('delay-input', ent.start_delay, delta, r.min, r.max);
        return;
      }
      case 'food-target-up': case 'food-target-up-10': case 'food-target-down': case 'food-target-down-10': {
        const delta = { 'food-target-up': 1, 'food-target-up-10': 10, 'food-target-down': -1, 'food-target-down-10': -10 }[action];
        const r = this._range(ent.food_target_temperature, 0, 300, 1);
        this._adjustNumberInput('food-target-input', ent.food_target_temperature, delta, r.min, r.max);
        return;
      }

      case 'delay-chip': {
        const r = this._range(ent.start_delay, 0, 1439, 1);
        const v = clamp(Math.round(Number(actionEl.dataset.min) / r.step) * r.step, r.min, r.max);
        this._showAt = false;
        this._setNumber(ent.start_delay, v);
        this._render();
        return;
      }
      case 'delay-at':
        this._showAt = true;
        this._render();
        this.shadowRoot.getElementById('at-input')?.focus();
        return;

      case 'toggle-top': this._toggleElement(ent.top_element_selected); return;
      case 'toggle-bottom': this._toggleElement(ent.bottom_element_selected); return;
      case 'toggle-grill': this._toggleElement(ent.grill_element_selected); return;
      case 'toggle-fan': this._toggleElement(ent.fan_selected); return;

      case 'recipe': this._applyRecipe((this._config.recipes || [])[Number(actionEl.dataset.idx)]); return;

      case 'start-program': {
        const s = this._readState();
        if (s.offline || s.fault) return;
        if (s.timerStateCode === 3 && ent.start_cooking) {
          this._call('button', 'press', { entity_id: ent.start_cooking });
          return;
        }
        if (!s.topOn && !s.bottomOn && !s.grillOn && !s.fanOn) return;
        if (ent.apply_program) this._call('button', 'press', { entity_id: ent.apply_program });
        return;
      }
      case 'start-cooking':
        if (this._readState().offline || this._readState().fault) return;
        if (ent.start_cooking) this._call('button', 'press', { entity_id: ent.start_cooking });
        return;
      case 'cancel-program': {
        if (this._readState().offline || !this._readState().programActive) return;
        if (ent.cancel_program) this._call('button', 'press', { entity_id: ent.cancel_program });
        return;
      }

    }
  }

  // Fills the draft from a recipe; the user still presses Start.
  _applyRecipe(r) {
    if (!r) return;
    const ent = this._config.entities;
    const els = (r.elements || []).map((x) => String(x).toLowerCase());
    for (const [kind, eid] of [['top', ent.top_element_selected], ['bottom', ent.bottom_element_selected], ['grill', ent.grill_element_selected], ['fan', ent.fan_selected]]) {
      if (!eid) continue;
      const want = els.includes(kind) ? 'on' : 'off';
      if (this._isOn(eid) === (want === 'on')) continue;
      this._elemOptimistic[eid] = want;
      clearTimeout(this._elemTimers[eid]);
      this._elemTimers[eid] = setTimeout(() => { delete this._elemOptimistic[eid]; delete this._elemTimers[eid]; this._render(); }, 3000);
      this._call('switch', want === 'on' ? 'turn_on' : 'turn_off', { entity_id: eid });
    }
    const setNum = (eid, value, fb) => {
      if (!eid || value == null) return;
      const rg = this._range(eid, fb[0], fb[1], 1);
      this._setNumber(eid, Math.max(rg.min, Math.min(rg.max, Number(value))));
    };
    // The oven picks timer or probe mode itself (probe plugged in or not), so a
    // recipe sets both values and the oven uses whichever applies.
    setNum(ent.set_temperature, r.temperature, [MIN_TEMP, MAX_TEMP]);
    setNum(ent.food_target_temperature, r.probe_target, [0, 300]);
    setNum(ent.cook_duration, r.duration, [0, 1439]);
    this._render();
  }

  // ── Temperature history ────────────────────────────────────────────────────

  // During a program, open HA's History panel starting at the preheat, so the
  // whole session is on one graph (the more-info dialog can't take a start
  // time). Otherwise, or if the start can't be found, open more-info.
  async _openTempHistory() {
    const ent = this._config.entities;
    if (!ent.oven_temperature) return;
    const start = this._readState().programActive ? await this._findSessionStart() : null;
    if (!start) {
      this._fire('hass-more-info', { entityId: ent.oven_temperature });
      return;
    }
    const from = new Date(start.getTime() - 60 * 1000);  // 1 min of baseline
    const url = `/history?entity_id=${encodeURIComponent(ent.oven_temperature)}`
      + `&start_date=${encodeURIComponent(from.toISOString())}`
      + `&end_date=${encodeURIComponent(new Date().toISOString())}`;
    window.history.pushState(null, '', url);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
  }

  // Start of the current program's preheat, from the recorder: walk back
  // through timer_state_code to the last idle (0) state. Within that run, the
  // first entry into preheating (2) wins; a program without preheat (fan-only)
  // uses the run's start. Unavailable gaps (power loss) don't end the run.
  async _findSessionStart() {
    const id = this._config.entities.timer_state_code;
    if (!id || !this._hass.callWS) return null;
    try {
      const res = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        entity_ids: [id],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      const rows = res?.[id] || [];
      let runStart = null;
      let preheatStart = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        const code = Number.parseFloat(rows[i].s);
        if (!Number.isFinite(code)) continue;  // unavailable/unknown
        if (code === 0) break;
        const t = new Date((rows[i].lc ?? rows[i].lu) * 1000);
        runStart = t;
        if (code === 2) preheatStart = t;
      }
      return preheatStart || runStart;
    } catch (err) {
      return null;
    }
  }

  _adjustNumberInput(inputId, entityId, delta, min, max) {
    const input = this.shadowRoot.getElementById(inputId);
    if (!input || !entityId) return;
    const cur = Number.parseFloat(input.value) || 0;
    const next = Math.max(min, Math.min(max, Math.round(cur + delta)));
    input.value = String(next);
    this._setNumber(entityId, next);
  }

  // ── Input handling (debounced number inputs, start time) ───────────────────
  _numberInputs() {
    const ent = this._config.entities;
    return {
      'duration-input': ['_durationTimer', ent.cook_duration, this._range(ent.cook_duration, 0, 1439, 1)],
      'delay-input': ['_delayTimer', ent.start_delay, this._range(ent.start_delay, 0, 1439, 1)],
      'food-target-input': ['_foodTargetTimer', ent.food_target_temperature, this._range(ent.food_target_temperature, 0, 300, 1)],
    };
  }

  _commitNumber(input) {
    const spec = this._numberInputs()[input.id];
    if (!spec) return;
    const [timer, eid, r] = spec;
    clearTimeout(this[timer]);
    const v = Math.max(r.min, Math.min(r.max, Math.round(Number.parseFloat(input.value) || 0)));
    input.value = String(v);
    this._setNumber(eid, v);
  }

  _onInput(e) {
    const input = e.target;
    if (!input || input.type !== 'number') return;
    const spec = this._numberInputs()[input.id];
    if (!spec) return;
    clearTimeout(this[spec[0]]);
    this[spec[0]] = setTimeout(() => this._commitNumber(input), 600);
  }

  _onChange(e) {
    const input = e.target;
    if (!input) return;
    if (input.id === 'at-input') {
      const [h, m] = String(input.value).split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return;
      const now = new Date();
      let mins = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
      if (mins <= 0) mins += 1440;
      const ent = this._config.entities;
      const r = this._range(ent.start_delay, 0, 1439, 1);
      const v = Math.max(r.min, Math.min(r.max, Math.ceil(mins / r.step) * r.step));
      this._showAt = false;
      input.blur();
      this._setNumber(ent.start_delay, v);
      this._render();
      return;
    }
    if (input.type === 'number') this._commitNumber(input);
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
customElements.define(CARD_TAG, LibreOvenCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: 'Libre Oven Card',
  description: 'Control card for the Libre Oven: live oven drawing, temperature, elements, timer or food probe, start delay and recipes. variant: compact gives a glance card.',
  preview: true,
});
console.info(`%c LIBRE-OVEN-CARD %c v${CARD_VERSION} `, 'background:#ff7a45;color:#140a03;font-weight:700', 'background:#161a22;color:#f2f3f5');
