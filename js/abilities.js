// ===== RALLY, SURGE, WAVES, EVENTS, WEATHER =====

function activateRally() {
  if (state.rallyCooldown > 0 || state.rallyActive) return;
  state.rallyActive = true;
  state.rallyTimer = BAL.rallyDuration;
  state.rallyUses++;
  state.lifetimeStats.totalRallies++;
  AudioManager.sfx.rally();
  showToast("⚡ Rally!");
  applyAllWorkerSpeeds();
  updateDailyProgress('rally2', 1);
  checkAchievements();
}

function deactivateRally() {
  state.rallyActive = false;
  state.rallyCooldown = BAL.rallyCooldown;
  applyAllWorkerSpeeds();
}

// Rally button listener is now in ui.js (after DOM refs are ready)
// No addEventListener here – see ui.js around the rally section.

// Surge button listener is now in ui.js
// Event button listener is now in ui.js
// Summon button listener is now in ui.js

function updateSummonButton() {
  if (!summonBtn) return;
  if (state.bossActive) {
    summonBtn.style.display = "none";
  } else {
    summonBtn.style.display = state.gems >= BAL.summonCost ? "block" : "none";
  }
}

function startWave() {
  state.waveActive = true;
  state.waveSpidersRemaining = BAL.waveSpidersMin + Math.floor(Math.random() * (BAL.waveSpidersMax - BAL.waveSpidersMin + 1));
  AudioManager.sfx.waveIncoming();
  showToast("⚠️ Wave! " + state.waveSpidersRemaining + " spiders!");
  for (var i = 0; i < state.waveSpidersRemaining; i++) {
    (function(idx) {
      setTimeout(function() {
        if (enemies.length < BAL.maxEnemies) createSpider();
      }, idx * 400);
    })(i);
  }
}

function endWave() {
  state.waveActive = false;
  state.waveTimer = BAL.waveIntervalMin + Math.random() * (BAL.waveIntervalMax - BAL.waveIntervalMin);
  showToast("✅ Wave cleared!");
}

function triggerRandomEvent() {
  state.eventActive = true;
  var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  if (eventBtn) {
    eventBtn.textContent = ev.emoji + " " + ev.name + "!";
    eventBtn.style.display = "block";
    eventBtn.dataset.idx = EVENTS.indexOf(ev);
  }
  showToast(ev.emoji + " " + ev.name + " appeared!");
}

function applyWeatherEffects(type, active) {
  if (type === "rain") {
    if (active) {
      scene.fog.color.set(0x778899);
      scene.background = new THREE.Color(0x667788);
      sLight.intensity = 0.7;
      for (var ri = 0; ri < rainDrops.length; ri++) rainDrops[ri].visible = true;
    } else {
      var restoreZone = state.preWeatherZone || state.currentZone;
      var cfg = ZONE_CONFIG[restoreZone] || ZONE_CONFIG.forest;
      scene.fog = new THREE.Fog(cfg.fog, 20, 80);
      scene.background = new THREE.Color(cfg.bg);
      sLight.intensity = 1.3;
      for (var ri = 0; ri < rainDrops.length; ri++) rainDrops[ri].visible = false;
    }
  } else if (type === "night") {
    if (active) {
      state.isNight = true;
      scene.fog.color.set(0x1a1a2e);
      scene.background = new THREE.Color(0x0a0a1a);
      sLight.intensity = 0.3;
      hLight.intensity = 0.3;
      for (var mi = 0; mi < mushroomMeshes.length; mi++) mushroomMeshes[mi].visible = true;
      for (var mi = 0; mi < mushroomLights.length; mi++) mushroomLights[mi].visible = true;
    } else {
      state.isNight = false;
      var restoreZone = state.preWeatherZone || state.currentZone;
      var cfg = ZONE_CONFIG[restoreZone] || ZONE_CONFIG.forest;
      scene.fog = new THREE.Fog(cfg.fog, 20, 80);
      scene.background = new THREE.Color(cfg.bg);
      sLight.intensity = 1.3;
      hLight.intensity = 1;
      for (var mi = 0; mi < mushroomMeshes.length; mi++) mushroomMeshes[mi].visible = false;
      for (var mi = 0; mi < mushroomLights.length; mi++) { mushroomLights[mi].visible = false; mushroomLights[mi].intensity = 0; }
      state.survivedNight++;
      state.lifetimeStats.totalNights++;
      updateDailyProgress('night1', 1);
    }
  }
}
