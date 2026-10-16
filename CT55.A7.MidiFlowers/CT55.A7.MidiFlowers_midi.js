/* CT55.A7.MidiFlowers -- MIDI, through the CT45.A1.USB standard layer (lib/ct45midi.js + lib/ct45.profiles.js).
 *
 *  * Default assignments: CT55.A7.MidiFlowers_midimap.js (X-TOUCH MINI, Launchpad Mini MK3 / original, nanoKEY2).
 *  * Right-click any on-screen button, then press (or turn) a MIDI control: it is assigned to that button.
 *    Learned assignments live in this browser (localStorage) and override the file. Any MIDI device works this way,
 *    including ones CT45 does not know (they appear as "generic").
 *  * Lights: X-TOUCH buttons light when their switch is on (Record blinks), its encoder rings show the settings;
 *    Launchpad pads show each action in its own pastel colour, bright when on.
 *  * Buttons/pads/keys: press = the action; release matters only for Emit (hold = emit while held).
 *    (CT55.A5: release is ignored - Emit is a plain on/off switch.)
 *    Encoders: one step per detent (two for a quick turn); faders/knobs: set the value directly.
 */
(function () {
  'use strict';
  const C = window.CT55, $ = (id) => document.getElementById(id);
  const LEARN_KEY = 'CT55.midimap.learned';
  const DEFAULTS = window.CT55_MIDIMAP || {};
  const VALUE_ACTIONS = new Set(['speed', 'rate', 'pulseInterval', 'pulseBurst', 'swirlStrength']);
  const BUTTON_TO_VALUE = { faster: 'speed', slower: 'speed', rateUp: 'rate', rateDown: 'rate', pulseFaster: 'pulseInterval', pulseSlower: 'pulseInterval', burstUp: 'pulseBurst', burstDown: 'pulseBurst' };
  const COLORS = { reset: '#ffffff', forward: '#5aa8ff', faster: '#7fc4ff', slower: '#7fc4ff', emit: '#ff6fa8', rateUp: '#ff9fc4', rateDown: '#ff9fc4',
    pulse: '#ffd23a', pulseFaster: '#ffe27a', pulseSlower: '#ffe27a', burstUp: '#ffbf6a', burstDown: '#ffbf6a',
    swirlEmitter: '#b48cff', swirlFlowers: '#4ff0a8', record: '#ff2a3a', hud: '#9a9a9a',
    tour: '#ffd27a', sceneNext: '#9ad0ff', scenePrev: '#9ad0ff', scene1: '#6f8cff', scene2: '#7fe0b0', scene3: '#ff7a5a', scene4: '#c8ffd8', scene5: '#ff8a1e', scene6: '#ff3a1a' };
  const NAMES = { reset: 'Reset', forward: 'Forward', faster: 'Faster', slower: 'Slower', emit: 'Emit', rateUp: 'Rate +', rateDown: 'Rate −',
    pulse: 'Pulse', pulseFaster: 'Pulse beat shorter', pulseSlower: 'Pulse beat longer', burstUp: 'Burst +', burstDown: 'Burst −',
    swirlEmitter: 'Swirl emitter', swirlFlowers: 'Swirl flowers', record: 'Record', hud: 'Show/hide text',
    tour: 'Tour (movie of every scene)', sceneNext: 'Next scene', scenePrev: 'Previous scene', scene1: 'Scene 1 (town)', scene2: 'Scene 2 (Halloween town)', scene3: 'Scene 3 (Kali shrine)', scene4: '(no scene 4)', scene5: '(no scene 5)', scene6: '(no scene 6)',
    speed: 'Speed (value)', rate: 'Rate (value)', pulseInterval: 'Pulse beat (value)', pulseBurst: 'Burst size (value)', swirlStrength: 'Swirl strength (value)' };

  let learned = {};
  try { learned = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}') || {}; } catch { learned = {}; }
  const saveLearned = () => { try { localStorage.setItem(LEARN_KEY, JSON.stringify(learned)); } catch { /* */ } };
  const mapFor = (pid) => Object.assign({}, DEFAULTS[pid] || {}, learned[pid] || {});
  const lookup = (pid, control) => { const a = mapFor(pid)[control]; return typeof a === 'string' && !control.startsWith('_') ? a : null; };

  // short names for the hints under the buttons
  const DEV_SHORT = { 'behringer-xtouch-mini': 'XT', 'novation-launchpad-mini-mk3': 'LP', 'novation-launchpad-mini': 'LP', 'korg-nanokey2': 'nK' };
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function ctlShort(pid, id) {
    let m;
    if ((m = /^btn([ab])(\d)$/.exec(id))) return (m[1] === 'a' ? 'top' : 'bot') + m[2];
    if ((m = /^pad\.(\d)\.(\d)$/.exec(id))) return `r${+m[1] + 1}c${+m[2] + 1}`;
    if ((m = /^side(\d)$/.exec(id))) return 'side' + m[1];
    if ((m = /^key(\d+)$/.exec(id))) return NOTE[+m[1] % 12] + (+m[1] >= 12 ? (+m[1] >= 24 ? "''" : "'") : '');
    if ((m = /^enc(\d)$/.exec(id))) return 'knob' + m[1];
    return id;
  }

  // ------------------------------------------------------------------ the hub
  const hub = new CT45.MidiHub();
  let status = hub.supported ? 'not connected' : 'Web MIDI is not available in this browser (use Chrome or Edge)';
  hub.on('connect', (d) => { d.autoRing = false; setTimeout(() => { lights(d, true); refresh(); C.toast(`MIDI: ${d.profile.name || d.profile.id} connected`); }, 60); });
  hub.on('disconnect', (d) => { refresh(); C.toast(`MIDI: ${d.profile.name || d.profile.id} disconnected`); });
  hub.on('status', () => refresh());

  let learning = null;
  hub.on('input', (e) => {
    const d = e.device, pid = d.profile.id, ctl = e.control;
    if (learning) {                                          // assign this control to the button being learned
      const isValue = e.type === 'encoder' || e.type === 'knob' || e.type === 'fader';
      if (!isValue && e.action !== 'press') return;
      if (e.type === 'bender') return;
      let action = learning.action;
      if (isValue) action = BUTTON_TO_VALUE[action] || (VALUE_ACTIONS.has(action) ? action : null);
      if (!action) { C.toast(`"${NAMES[learning.action]}" needs a button, pad or key (not a knob)`); return; }
      (learned[pid] = learned[pid] || {})[ctl] = action; saveLearned();
      C.toast(`${d.profile.name || pid} · ${ctlShort(pid, ctl)} → ${NAMES[action]}`);
      endLearn(); lights(d, true); refresh();
      return;
    }
    const action = lookup(pid, ctl);
    if (!action) return;
    if (VALUE_ACTIONS.has(action)) {
      if (e.type === 'encoder' && e.delta) C.setValue(action, { delta: e.delta });
      else if (e.type === 'knob' || e.type === 'fader') C.setValue(action, { value: e.value });
      else if (e.action === 'press') C.setValue(action, { delta: 1 });
      return;
    }
    if (e.action === 'press') C.act(action, 'press');
    else if (e.action === 'release') C.act(action, 'release');
  });

  async function connect() {
    if (!hub.supported) { refresh(); return; }
    status = 'asking the browser for MIDI…'; refresh();
    const r = await hub.start();
    status = r.ok ? `on${r.sysex ? ' (with sysex — full Launchpad colours)' : ' (no sysex — approximate Launchpad colours)'}` : 'refused: ' + r.error;
    refresh();
    for (const d of hub.list()) lights(d, true);
  }

  // ------------------------------------------------------------------ lights
  const dim = (hex, k) => { const n = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0')).join(''); };
  const VALUE_FRAC = { speed: () => C.S.speedIdx / (C.SPEEDS.length - 1), rate: () => C.S.rateIdx / (C.RATES.length - 1),
    pulseInterval: () => C.S.pulseIdx / (C.PULSES.length - 1), pulseBurst: () => C.S.burstIdx / (C.BURSTS.length - 1), swirlStrength: () => (C.S.swirlStrength - 0.3) / 2.2 };
  function lights(d, force) {
    if (!d || !d.connected && !d.simulated) return;
    const map = mapFor(d.profile.id);
    for (const [ctl, action] of Object.entries(map)) {
      if (ctl.startsWith('_')) continue;
      const c = d.control(ctl); if (!c || !c.led) continue;
      const kind = c.led.kind;
      try {
        if (kind === 'ring-mackie') { if (VALUE_FRAC[action]) d.setLight(ctl, Math.max(0.02, VALUE_FRAC[action]()), { style: 'fan' }); continue; }
        const on = C.isOn(action);
        if (kind === 'mono') d.setLight(ctl, action === 'record' && on ? 'blink' : !!on);
        else {
          const col = COLORS[action] || '#ffffff';
          d.setLight(ctl, on === undefined ? dim(col, 0.35) : on ? col : dim(col, 0.12));
        }
      } catch (err) { if (force) console.warn('CT55 light', ctl, err); }
    }
  }
  C.onChange(() => { for (const d of hub.list()) lights(d); hints(); });

  // ------------------------------------------------------------------ learning (right-click a button)
  function endLearn() { if (learning) learning.btn.classList.remove('learn'); learning = null; }
  C.setLearnHook((action, btn) => {
    endLearn();
    if (!hub.list().length) { C.toast('Connect a MIDI device first (MIDI button), then right-click a button and press a control'); return; }
    learning = { action, btn }; btn.classList.add('learn');
    C.toast(`Press (or turn) the MIDI control for "${NAMES[action]}" — Esc cancels`, 8000);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && learning) { endLearn(); C.toast('Cancelled'); } });

  // ------------------------------------------------------------------ panel, chip, hints
  function hints() {
    const devs = hub.list();
    for (const b of C.buttons) {
      const a = b.dataset.action, out = [];
      for (const d of devs) {
        const map = mapFor(d.profile.id), sh = DEV_SHORT[d.profile.id] || 'MIDI';
        for (const [ctl, act] of Object.entries(map)) if (act === a && !ctl.startsWith('_')) { out.push(sh + ' ' + ctlShort(d.profile.id, ctl)); break; }
      }
      const m = b.querySelector('.m'); if (m) m.textContent = out.slice(0, 2).join(' · ');
    }
  }
  function refresh() {
    const devs = hub.list();
    $('midiChip').textContent = hub.status === 'running' ? (devs.length ? devs.length + ' device' + (devs.length > 1 ? 's' : '') : 'no devices') : (hub.supported ? 'off' : 'n/a');
    $('midiStatus').textContent = 'MIDI: ' + status + (hub.status === 'running' ? ` · ${devs.length} device(s)` : '');
    C.setMidiLine('MIDI: ' + (hub.status === 'running' ? (devs.length ? devs.map(d => (d.profile.name || d.profile.id) + (d.simulated ? ' (sim)' : '')).join(', ') : 'no devices plugged in') : status));
    const box = $('midiDevices'); box.innerHTML = '';
    for (const d of devs) {
      const pid = d.profile.id, map = mapFor(pid), lr = learned[pid] || {};
      const h = document.createElement('h3'); h.textContent = `${d.profile.name || pid}  (${d.portNames.join(' | ')})`; box.appendChild(h);
      const t = document.createElement('table');
      t.innerHTML = '<tr><th>control</th><th>action</th></tr>' + Object.entries(map).filter(([k]) => !k.startsWith('_'))
        .map(([k, a]) => `<tr><td>${ctlShort(pid, k)} <span style="color:#8a8597">(${k})</span></td><td class="${lr[k] ? 'learned' : ''}">${NAMES[a] || a}</td></tr>`).join('');
      if (map._layout) { const p = document.createElement('p'); p.textContent = map._layout; box.appendChild(p); }
      box.appendChild(t);
    }
    hints();
  }
  $('b_midi').onclick = () => { $('midiPanel').classList.toggle('on'); refresh(); };
  $('midiConnect').onclick = () => connect();
  $('midiForget').onclick = () => { learned = {}; saveLearned(); refresh(); for (const d of hub.list()) lights(d, true); C.toast('Learned MIDI forgotten — back to the defaults'); };

  window.CT55.midi = { hub, connect, lookup, get learned() { return learned; }, refresh };
  refresh();
  if (new URLSearchParams(location.search).get('midi') !== '0') connect();   // ask at once; Chrome remembers the answer
})();
