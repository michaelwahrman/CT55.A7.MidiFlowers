/* CT55.A7.MidiFlowers -- default MIDI map.
 *
 * Which control on which device does what.  Keys are CT45 profile ids and CT45 control ids
 * (see CT45.A1.USB.md).  Values are CT55 actions:
 *
 *   buttons / pads / keys :  reset  forward  faster  slower  emit  swirlEmitter  swirlFlowers
 *                            rateUp  rateDown  pulse  record  pulseFaster  pulseSlower  burstUp  burstDown  hud
 *                            sceneNext  scenePrev  scene1 .. scene5   (CT55.A5: the environments)
 *   encoders / knobs / faders (value controls) :  speed  rate  pulseInterval  pulseBurst  swirlStrength
 *
 * You can also re-assign any control from the page: RIGHT-CLICK an on-screen button, then press
 * the MIDI control you want for it.  Those choices are kept in the browser (and override this file);
 * "Forget learned MIDI" in the MIDI panel removes them.
 * This file is plain JSON inside window.CT55_MIDIMAP = ... so the page works opened straight from disk.
 */
window.CT55_MIDIMAP = {
  "behringer-xtouch-mini": {
    "_layout": "Top row of buttons = the 8 main actions, bottom row = rate / pulse / speed, encoders = settings, LAYER A / B = previous / next scene",
    "btna1": "reset",
    "btna2": "forward",
    "btna3": "slower",
    "btna4": "faster",
    "btna5": "emit",
    "btna6": "swirlEmitter",
    "btna7": "swirlFlowers",
    "btna8": "record",
    "btnb1": "rateDown",
    "btnb2": "rateUp",
    "btnb3": "pulse",
    "btnb4": "pulseSlower",
    "btnb5": "pulseFaster",
    "btnb6": "burstDown",
    "btnb7": "burstUp",
    "btnb8": "hud",
    "enc1": "speed",
    "enc2": "rate",
    "enc3": "pulseInterval",
    "enc4": "pulseBurst",
    "enc5": "swirlStrength",
    "enc8.push": "tour",
    "layerA": "scenePrev",
    "layerB": "sceneNext",
    "fader": "rate"
  },
  "novation-launchpad-mini-mk3": {
    "_layout": "Top row of pads = the 8 main actions, second row = rate / pulse / settings, right-hand column = scenes 1-3 (and 7/8 = previous/next)",
    "pad.0.0": "reset",
    "pad.0.1": "forward",
    "pad.0.2": "slower",
    "pad.0.3": "faster",
    "pad.0.4": "emit",
    "pad.0.5": "swirlEmitter",
    "pad.0.6": "swirlFlowers",
    "pad.0.7": "record",
    "pad.1.0": "rateDown",
    "pad.1.1": "rateUp",
    "pad.1.2": "pulse",
    "pad.1.3": "pulseSlower",
    "pad.1.4": "pulseFaster",
    "pad.1.5": "burstDown",
    "pad.1.6": "burstUp",
    "pad.1.7": "hud",
    "top8": "tour",
    "side1": "scene1",
    "side2": "scene2",
    "side3": "scene3",
    "side4": "scene4",
    "side5": "scene5",
    "side6": "scene6",
    "side7": "scenePrev",
    "side8": "sceneNext"
  },
  "novation-launchpad-mini": {
    "pad.0.0": "reset",
    "pad.0.1": "forward",
    "pad.0.2": "slower",
    "pad.0.3": "faster",
    "pad.0.4": "emit",
    "pad.0.5": "swirlEmitter",
    "pad.0.6": "swirlFlowers",
    "pad.0.7": "record",
    "pad.1.0": "rateDown",
    "pad.1.1": "rateUp",
    "pad.1.2": "pulse",
    "pad.1.3": "pulseSlower",
    "pad.1.4": "pulseFaster",
    "pad.1.5": "burstDown",
    "pad.1.6": "burstUp",
    "pad.1.7": "hud",
    "top8": "tour",
    "side1": "scene1",
    "side2": "scene2",
    "side3": "scene3",
    "side4": "scene4",
    "side5": "scene5",
    "side6": "scene6",
    "side7": "scenePrev",
    "side8": "sceneNext"
  },
  "korg-nanokey2": {
    "_layout": "White keys from the lowest C (default octave): C reset, D forward, E slower, F faster, G emit, A swirl emitter, B swirl flowers, C rate-, D rate+, E pulse, F pulse slower, G pulse faster, A burst-, B burst+, top C record; black keys C# / D# = previous / next scene",
    "key0": "reset",
    "key2": "forward",
    "key4": "slower",
    "key5": "faster",
    "key7": "emit",
    "key9": "swirlEmitter",
    "key11": "swirlFlowers",
    "key12": "rateDown",
    "key14": "rateUp",
    "key16": "pulse",
    "key17": "pulseSlower",
    "key19": "pulseFaster",
    "key21": "burstDown",
    "key23": "burstUp",
    "key24": "record",
    "key22": "tour",
    "key1": "scenePrev",
    "key3": "sceneNext",
    "mod": "emit"
  }
};
