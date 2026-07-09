// ===== RALLY, SURGE, WAVES, EVENTS, WEATHER =====

// Rally
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
if (rallyBtn) rallyBtn.addEventListener("click", activateRally);

// Surge
if (surgeBtn) {
  surgeBtn.addEventListener("click", function() {
    if (!state.surgeActive) return;
    state.surgeActive = false;
    surgeBtn.style.display = "none";
    state.surgesCollected++;
    state.lifetimeStats.totalSurges++;
    AudioManager.sfx.surge();
    for (var i = 0; i < BAL.surgeEggs; i++) {
      state.eggs++;
      var em = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 }));
      em.position.copy(qMesh.position);
      em.position.x += (Math.random() - 0.5) * 1.6;
      em.position.z += (Math.random() - 0.5) * 1.4;
      em.scale.setScalar(0.3);
      scene.add(em);
      eggMs.push({ mesh: em, mat: em.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: em.position.x, restZ: em.position.z, settling: false, settleT: 0 });
    }
    showToast("👑 Surge! +" + BAL.surgeEggs + " eggs");
    checkAchievements();
  });
}

// Summon boss button
function updateSummonButton() {
  if (state.bossActive) { summonBtn.style.display = "none"; }
  else { summonBtn.style.display = state.gems >= BAL.summonCost ? "block" : "none"; }
}
if (summonBtn) summonBtn.addEventListener("click", summonBoss);

// Waves
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

// Random events
function triggerRandomEvent() {
  state.eventActive = true;
  var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  eventBtn.textContent = ev.emoji + " " + ev.name + "!";
  eventBtn.style.display = "block";
  eventBtn.dataset.idx = EVENTS.indexOf(ev);
  showToast(ev.emoji + " " + ev.name + " appeared!");
}
if (eventBtn) {
  eventBtn.addEventListener("click", function() {
    if (!state.eventActive) return;
    var idx = parseInt(eventBtn.dataset.idx);
    if (idx >= 0 && idx < EVENTS.length) EVENTS[idx].action();
    state.eventActive = false;
    eventBtn.style.display = "none";
    state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
    showToast("✅ Event collected!");
  });
}

// Weather handling
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
