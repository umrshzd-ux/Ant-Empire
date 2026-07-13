// ===== AUDIO MANAGER + SETTINGS =====
var AudioManager = {};
(function(AM) {
  var ctx = null, sfxOn = true, ambientOn = true, musicOn = true;
  var ambientNode = null, ambientGain = null;
  var musicNodes = [];

  AM.init = function() {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ctx = null; }
    if (ctx) {
      ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.06;
      ambientGain.connect(ctx.destination);
      if (ambientOn) AM.startAmbient();
      if (musicOn) AM.startMusic();
    }
  };
  AM.resume = function() { if (ctx && ctx.state === 'suspended') ctx.resume(); };

  AM.playTone = function(freq, dur, vol, type, rampDown) {
    if (!ctx || !sfxOn) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime((vol || 0.1), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.1) + (rampDown || 0.02));
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (dur || 0.1) + (rampDown || 0.03));
  };

  AM.playNoise = function(dur, vol, filterFreq) {
    if (!ctx || !sfxOn) return;
    var bufferSize = ctx.sampleRate * dur, noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate), output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource(); noise.buffer = noiseBuffer;
    var filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(filterFreq || 800, ctx.currentTime);
    var g = ctx.createGain(); g.gain.setValueAtTime((vol || 0.05), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    noise.connect(filter); filter.connect(g); g.connect(ctx.destination); noise.start();
  };

  AM.playArpeggio = function(notes, dur, vol) {
    if (!ctx || !sfxOn) return;
    notes.forEach(function(n, i) { setTimeout(function() { AM.playTone(n.freq, n.dur || 0.1, (vol || 0.1) * 0.7, n.type || 'sine'); }, i * (dur / notes.length) * 1000); });
  };

  AM.sfx = {
    click: function() { AM.playTone(800, 0.05, 0.08, 'square'); },
    foodCollect: function() { AM.playTone(400, 0.08, 0.06, 'sine'); setTimeout(function() { AM.playTone(600, 0.08, 0.06, 'sine'); }, 40); },
    hatch: function() { AM.playTone(1000, 0.06, 0.07, 'sine'); setTimeout(function() { AM.playTone(1200, 0.04, 0.05, 'sine'); }, 50); },
    levelUp: function() { AM.playArpeggio([{freq:523,dur:0.08},{freq:659,dur:0.08},{freq:784,dur:0.12}], 0.3, 0.08); },
    bossSpawn: function() { AM.playTone(60, 0.4, 0.15, 'sawtooth'); AM.playNoise(0.3, 0.06, 200); },
    bossDefeat: function() { AM.playTone(200, 0.3, 0.12, 'sawtooth'); setTimeout(function() { AM.playTone(80, 0.3, 0.1, 'sawtooth'); }, 150); setTimeout(function() { AM.playTone(40, 0.4, 0.08, 'sawtooth'); }, 300); },
    rally: function() { for (var i = 0; i < 4; i++) { setTimeout(function() { AM.playTone(150, 0.06, 0.08, 'square'); }, i * 80); } },
    spiderDeath: function() { AM.playNoise(0.08, 0.05, 600); },
    prestige: function() { AM.playArpeggio([{freq:392,dur:0.15},{freq:523,dur:0.15},{freq:659,dur:0.15},{freq:784,dur:0.15},{freq:1047,dur:0.3}], 0.9, 0.1); },
    achievement: function() { AM.playArpeggio([{freq:659,dur:0.1},{freq:784,dur:0.1},{freq:1047,dur:0.15}], 0.3, 0.08); },
    gemCollect: function() { AM.playTone(1500, 0.06, 0.06, 'sine'); setTimeout(function() { AM.playTone(1800, 0.04, 0.05, 'sine'); }, 30); setTimeout(function() { AM.playTone(2200, 0.06, 0.04, 'sine'); }, 60); },
    upgrade: function() { AM.playTone(300, 0.08, 0.07, 'triangle'); setTimeout(function() { AM.playTone(500, 0.06, 0.06, 'triangle'); }, 60); },
    surge: function() { AM.playNoise(0.3, 0.06, 400); AM.playTone(200, 0.2, 0.06, 'sawtooth'); },
    waveIncoming: function() { for (var i = 0; i < 3; i++) { setTimeout(function() { AM.playTone(440, 0.1, 0.08, 'square'); }, i * 150); } },
    dailyStreak: function() { AM.playArpeggio([{freq:523,dur:0.08},{freq:659,dur:0.08},{freq:784,dur:0.08},{freq:1047,dur:0.15}], 0.4, 0.07); },
    zoneSwitch: function() { AM.playNoise(0.2, 0.04, 1000); AM.playTone(300, 0.15, 0.04, 'sine'); },
    shake: function() { AM.playTone(40, 0.15, 0.06, 'sine'); },
    buttonClick: function() { AM.playTone(600, 0.04, 0.05, 'square'); },
    ascend: function() { AM.playArpeggio([{freq:523,dur:0.1},{freq:659,dur:0.1},{freq:784,dur:0.1},{freq:1047,dur:0.2},{freq:1318,dur:0.3}], 0.9, 0.12); }
  };

  AM.startAmbient = function() {
    if (!ctx || !ambientOn || !ambientGain) return;
    if (ambientNode) { try { ambientNode.stop(); } catch(e) {} }
    var bufferSize = ctx.sampleRate * 4, noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate), output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    ambientNode = ctx.createBufferSource(); ambientNode.buffer = noiseBuffer; ambientNode.loop = true;
    var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, ctx.currentTime);
    var gain = ctx.createGain(); gain.gain.value = 0.04;
    ambientNode.connect(filter); filter.connect(gain); gain.connect(ambientGain);
    var windOsc = ctx.createOscillator(); windOsc.type = 'sine'; windOsc.frequency.setValueAtTime(30, ctx.currentTime);
    var windGain = ctx.createGain(); windGain.gain.value = 0.02;
    windOsc.connect(windGain); windGain.connect(ambientGain);
    windOsc.start();
    ambientNode.start();
    ambientNode.windOsc = windOsc;
  };

  AM.stopAmbient = function() {
    if (ambientNode) {
      try { ambientNode.stop(); } catch(e) {}
      if (ambientNode.windOsc) { try { ambientNode.windOsc.stop(); } catch(e) {} }
      ambientNode = null;
    }
  };

  AM.startMusic = function() {
    if (!ctx || !musicOn) return;
    AM.stopMusic();
    var now = ctx.currentTime;
    var baseFreq = 130.81;
    var chord = [1, 5/4, 3/2, 2];
    var masterGain = ctx.createGain();
    masterGain.gain.value = 0.08;
    masterGain.connect(ctx.destination);
    chord.forEach(function(ratio, i) {
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      var vol = ctx.createGain(); vol.gain.setValueAtTime(0.02, now); vol.gain.exponentialRampToValueAtTime(0.015, now + 2);
      osc.connect(vol); vol.connect(masterGain); osc.start(now + i * 0.1);
      musicNodes.push({ osc: osc, gain: vol });
    });
    musicNodes.push({ masterGain: masterGain });
  };

  AM.stopMusic = function() {
    if (!ctx || musicNodes.length === 0) return;
    var masterGainEntry = null;
    for (var i = 0; i < musicNodes.length; i++) { if (musicNodes[i].masterGain) { masterGainEntry = musicNodes[i]; break; } }
    if (masterGainEntry && masterGainEntry.masterGain) {
      var masterGain = masterGainEntry.masterGain;
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      var stopTime = ctx.currentTime + 0.06;
      musicNodes.forEach(function(node) { if (node.osc) try { node.osc.stop(stopTime); } catch(e) {} });
      setTimeout(function() {
        musicNodes.forEach(function(node) {
          try { if (node.osc) node.osc.disconnect(); } catch(e) {}
          try { if (node.gain) node.gain.disconnect(); } catch(e) {}
          try { if (node.masterGain) node.masterGain.disconnect(); } catch(e) {}
        });
        musicNodes = [];
      }, 100);
    } else {
      musicNodes.forEach(function(node) {
        try { if (node.osc) node.osc.stop(); } catch(e) {}
        try { if (node.osc) node.osc.disconnect(); } catch(e) {}
        try { if (node.gain) node.gain.disconnect(); } catch(e) {}
      });
      musicNodes = [];
    }
  };

  AM.setMusic = function(on) {
    musicOn = on;
    localStorage.setItem('antEmpire_music', on ? '1' : '0');
    if (on) AM.startMusic(); else AM.stopMusic();
  };

  AM.setSfx = function(on) { sfxOn = on; localStorage.setItem('antEmpire_sfx', on ? '1' : '0'); };
  AM.setAmbient = function(on) {
    ambientOn = on; localStorage.setItem('antEmpire_ambient', on ? '1' : '0');
    if (on) AM.startAmbient(); else AM.stopAmbient();
  };

})(AudioManager);

document.addEventListener('click', function() { AudioManager.resume(); }, { once: true });
document.addEventListener('touchstart', function() { AudioManager.resume(); }, { once: true });

var GameSettings = {
  sfxOn: true, ambientOn: true, musicOn: true, shakeOn: true,
  init: function() {
    GameSettings.sfxOn = (localStorage.getItem('antEmpire_sfx') || '1') === '1';
    GameSettings.ambientOn = (localStorage.getItem('antEmpire_ambient') || '1') === '1';
    GameSettings.musicOn = (localStorage.getItem('antEmpire_music') || '1') === '1';
    GameSettings.shakeOn = (localStorage.getItem('antEmpire_shake') || '1') === '1';
    AudioManager.setSfx(GameSettings.sfxOn);
    AudioManager.setAmbient(GameSettings.ambientOn);
    AudioManager.setMusic(GameSettings.musicOn);

    var el;
    el = document.getElementById('toggle-sfx'); if (el) el.className = 'toggle-switch' + (GameSettings.sfxOn ? ' on' : '');
    el = document.getElementById('toggle-ambient'); if (el) el.className = 'toggle-switch' + (GameSettings.ambientOn ? ' on' : '');
    el = document.getElementById('toggle-music'); if (el) el.className = 'toggle-switch' + (GameSettings.musicOn ? ' on' : '');
    el = document.getElementById('toggle-shake'); if (el) el.className = 'toggle-switch' + (GameSettings.shakeOn ? ' on' : '');
  }
};
