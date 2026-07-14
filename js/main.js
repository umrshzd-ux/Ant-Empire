// ===== MAIN ENTRY POINT =====

var container, scene, camera, renderer, hLight, sLight, fLight, raycaster;
var gameLoopActive = false;
var gameSystemsReady = false;

function initThreeJS() {
  container = document.getElementById("canvas-container");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, 80);
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 150);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  hLight = new THREE.HemisphereLight(0xfff4d6, 0x3a2a14, 1);
  scene.add(hLight);
  sLight = new THREE.DirectionalLight(0xffe9b0, 1.3);
  sLight.position.set(12, 20, 10);
  sLight.castShadow = true;
  sLight.shadow.mapSize.set(1024, 1024);
  sLight.shadow.camera.near = 1;
  sLight.shadow.camera.far = 80;
  sLight.shadow.camera.left = -30;
  sLight.shadow.camera.right = 30;
  sLight.shadow.camera.top = 25;
  sLight.shadow.camera.bottom = -25;
  scene.add(sLight);
  fLight = new THREE.PointLight(0xffcf8a, 0.7, 40);
  fLight.position.set(-6, 4, -6);
  scene.add(fLight);
  raycaster = new THREE.Raycaster();
}

// ----- Main menu functions -----
function showMainMenu() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  gameLoopActive = false;
  state.lastSaveTime = Date.now();
  saveGame();

  document.getElementById('main-menu').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('bottom-bar').style.display = 'none';
  document.getElementById('canvas-container').style.display = 'none';

  // Force hide boss UI
  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
  var summonBtn = document.getElementById('summon-btn');
  if (summonBtn) summonBtn.style.display = 'none';

  var toastEl = document.getElementById('toast'); if (toastEl) { toastEl.style.opacity = '0'; toastEl.textContent = ''; }
  var floatersEl = document.getElementById('floaters'); if (floatersEl) floatersEl.innerHTML = '';
  var tutEl = document.getElementById('tutorial-toast'); if (tutEl) tutEl.style.opacity = '0';
  var achEl = document.getElementById('achievement-toast'); if (achEl) achEl.style.opacity = '0';
  closeAllModals();

  renderSlots();
}

function hideMainMenu() {
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('bottom-bar').style.display = 'flex';
  document.getElementById('canvas-container').style.display = 'block';

  // Boss UI will be hidden until a boss spawns
  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
}

// renderSlots – no inline onclick, uses delegation
function renderSlots() {
  var slots = SaveManager.getAllSlots(), html = '';
  for (var i = 0; i < slots.length; i++) {
    var sl = slots[i];
    html += '<div class="save-slot" data-slot="' + i + '">';
    if (sl.hasData) {
      var d = new Date(sl.lastSaved), timeAgo = 'just now', diff = Date.now() - sl.lastSaved;
      if (diff > 86400000) timeAgo = Math.floor(diff / 86400000) + 'd ago';
      else if (diff > 3600000) timeAgo = Math.floor(diff / 3600000) + 'h ago';
      else if (diff > 60000) timeAgo = Math.floor(diff / 60000) + 'm ago';
      html += '<div style="display:flex; align-items:center; justify-content:space-between; width:100%;">' +
              '<div>' +
                '<div class="slot-name">🐜 ' + sl.name + '</div>' +
                '<div class="slot-info">Lv ' + sl.level + ' | P' + sl.prestige + ' | A' + sl.ascension + ' | ' + timeAgo + '</div>' +
              '</div>' +
              '<button class="delete-colony-btn" data-slot="' + i + '" title="Delete colony">🗑️</button>' +
            '</div>';
    } else {
      html += '<div class="slot-empty">+ New Colony</div>';
    }
    html += '</div>';
  }
  document.getElementById('save-slots').innerHTML = html;
}

// Delegated click handling for save slots and delete button
document.addEventListener('DOMContentLoaded', function() {
  var slotsContainer = document.getElementById('save-slots');
  if (slotsContainer) {
    slotsContainer.addEventListener('click', function(e) {
      var deleteBtn = e.target.closest('.delete-colony-btn');
      if (deleteBtn) {
        e.stopPropagation();
        var slot = parseInt(deleteBtn.getAttribute('data-slot'));
        if (!isNaN(slot)) showDeleteModal(slot);
        return;
      }
      // Otherwise, check if click was inside a save-slot (not empty part)
      var slotDiv = e.target.closest('.save-slot');
      if (slotDiv) {
        var slot = parseInt(slotDiv.getAttribute('data-slot'));
        if (!isNaN(slot)) {
          loadSlot(slot);
        }
      }
    });
  }
});

function showDeleteModal(slot) {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('delete-confirm').onclick = function() {
    performDelete(slot);
    modal.style.display = 'none';
  };
  document.getElementById('delete-cancel').onclick = function() {
    modal.style.display = 'none';
  };
}

function performDelete(slot) {
  SaveManager.deleteSlot(slot);
  if (currentSlot === slot) {
    currentSlot = -1;
    showMainMenu();
  } else {
    renderSlots();
  }
}

window.loadSlot = function(slot) {
  var data = SaveManager.loadGame(slot);
  clearAllMeshes();
  if (data) {
    currentSlot = slot;
    loadGameData(data);
  } else {
    resetStateToDefault(slot);
    currentSlot = slot;
  }
  hideMainMenu();
  initGameSystems();
  startGameLoop();
  AudioManager.sfx.buttonClick();
  updateBossTimer();
  // Force hide boss UI until a boss actually spawns
  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
  var summonBtn = document.getElementById('summon-btn');
  if (summonBtn) summonBtn.style.display = 'none';

  setTimeout(function() {
    var offlineData = calculateOfflineProgress();
    if (offlineData && (offlineData.food > 0 || offlineData.eggs > 0 || offlineData.gems > 0)) {
      showOfflineModal(offlineData);
    } else { checkDailyLogin(); }
  }, 600);
};

// Screenshake
var shakeIntensity = 0, shakeDuration = 0;
function triggerShake(intensity, duration) { if (!GameSettings.shakeOn) return; shakeIntensity = intensity; shakeDuration = duration; if (typeof AudioManager !== 'undefined') AudioManager.sfx.shake(); }
function updateShake(dt) { var el = document.getElementById('canvas-container'); if (shakeDuration > 0) { shakeDuration -= dt; var sx = (Math.random() - 0.5) * shakeIntensity * 2; var sy = (Math.random() - 0.5) * shakeIntensity * 2; el.style.transition = 'none'; el.style.transform = 'translate(' + sx + 'px,' + sy + 'px)'; } else if (shakeIntensity > 0) { shakeIntensity = 0; el.style.transition = 'transform 0.05s ease-out'; el.style.transform = 'translate(0,0)'; } }

// Tutorials
var tutorialMessages = [
  { id: "firstLoad", condition: function() { return state.level === 1 && state.chambers.foodStorage.count === 0; }, text: "🌾 Build a Food Storage to expand!", duration: 6 },
  { id: "researchBuilt", condition: function() { return state.chambers.research.count === 1 && !state.tutorialsShown.researchBuilt; }, text: "🧬 Upgrades & Shop unlocked. Evolution at Lv" + BAL.evolutionUnlockLevel + ".", duration: 5 },
  { id: "scoutHint", condition: function() { return state.chambers.research.count === 1 && state.chambers.scout.count === 0 && !state.tutorialsShown.scoutHint; }, text: "🔍 Build Scouts to explore zones and bosses!", duration: 5 }
];
var tutorialTimer = 0, tutorialActive = null;
function checkTutorials() {
  if (tutorialActive) return;
  for (var i = 0; i < tutorialMessages.length; i++) {
    var tm = tutorialMessages[i];
    if (state.tutorialsShown[tm.id]) continue;
    if (tm.condition()) {
      state.tutorialsShown[tm.id] = true;
      showTutorial(tm.text, tm.duration);
      break;
    }
  }
}
function showTutorial(text, duration) {
  var el = document.getElementById('tutorial-toast');
  el.textContent = text;
  el.style.opacity = "1";
  tutorialActive = { text: text, duration: duration };
  tutorialTimer = duration;
}
function updateTutorial(dt) {
  if (!tutorialActive) return;
  tutorialTimer -= dt;
  if (tutorialTimer <= 0) {
    document.getElementById('tutorial-toast').style.opacity = "0";
    tutorialActive = null;
  } else if (tutorialTimer < 1) {
    document.getElementById('tutorial-toast').style.opacity = tutorialTimer;
  }
}

// Zone management
function checkZoneUnlocks() {
  var trips = state.expansionTrips;
  var zoneOrder = ["meadow", "forestEdge", "riverside", "deepWoods", "cave", "swamp", "mountain"];
  var newlyUnlocked = null;
  for (var i = 0; i < zoneOrder.length; i++) {
    var zid = zoneOrder[i];
    var cfg = ZONE_CONFIG[zid];
    if (cfg.prestigeReq && state.prestigeCount < cfg.prestigeReq) continue;
    if (trips >= cfg.tripReq && state.unlockedZonesList.indexOf(zid) === -1) {
      state.unlockedZonesList.push(zid);
      showToast("🗺️ " + cfg.label + " unlocked!");
      if (!newlyUnlocked) newlyUnlocked = zid;
    }
  }
  if (trips >= 15 && state.unlockedZones === 0) { state.unlockedZones = 1; }
  if (newlyUnlocked && state.unlockedZonesList.length === 2) { switchZone(newlyUnlocked); }
}
function switchZone(zoneId) {
  if (state.unlockedZonesList.indexOf(zoneId) === -1) { showToast("Zone locked!"); return; }
  if (state.currentZone === zoneId) return;
  if (state.weatherActive) { showToast("Cannot switch zones during weather!"); return; }
  var cfg = ZONE_CONFIG[zoneId];
  if (cfg.prestigeReq && state.prestigeCount < cfg.prestigeReq) { showToast("Need Prestige " + cfg.prestigeReq + " to enter!"); return; }
  state.currentZone = zoneId;
  scene.background = new THREE.Color(cfg.bg);
  scene.fog = new THREE.Fog(cfg.fog, 20, 80);
  document.getElementById('zone-display').textContent = cfg.label;
  AudioManager.sfx.zoneSwitch();
  updateDailyProgress('zone1', 1);
  showToast("Moved to " + cfg.name + "!");
}

// Evolution, Ascension upgrades
function buyEvolution(type) {
  var evo = EVOLUTION_TREE[type];
  var ct = state.evolution[type] || 0;
  if (ct >= evo.tiers.length) { showToast("Fully evolved!"); return; }
  var tier = evo.tiers[ct];
  if (tier.reqPrestige && state.prestigeCount < tier.reqPrestige) { showToast("Requires Prestige " + tier.reqPrestige + "!"); return; }
  if (state.food < tier.cost) { showToast("Need " + tier.cost + " food!"); return; }
  state.food -= tier.cost;
  state.evolution[type] = ct + 1;
  if (type === "worker" && tier.effect.hatchReduction) recalculateHatchTime();
  if (type === "soldier") {
    for (var i = 0; i < soldiers.length; i++) {
      soldiers[i].maxHealth = getEffectiveSoldierMaxHealth();
      soldiers[i].health = Math.min(soldiers[i].health + (tier.effect.healthBonus || 0), soldiers[i].maxHealth);
    }
  }
  AudioManager.sfx.upgrade();
  showToast(tier.icon + " " + tier.name + " evolved!");
  updateBuildButtonLabels();
  refreshEvolutionUI();
  refreshHUD();
}
function buyAscensionUpgrade(id) {
  var item = null;
  for (var i = 0; i < ASCENSION_SHOP.length; i++) { if (ASCENSION_SHOP[i].id === id) { item = ASCENSION_SHOP[i]; break; } }
  if (!item) return;
  var lv = state.ascensionUpgrades[id] || 0;
  if (lv >= item.maxLevel) { showToast("Already owned!"); return; }
  if (state.ascensionPoints < item.cost) { showToast("Need " + item.cost + " AP!"); return; }
  state.ascensionPoints -= item.cost;
  state.ascensionUpgrades[id] = lv + 1;
  if (id === "eternalHatch") recalculateHatchTime();
  if (id === "goldenQueen") applyAllWorkerSpeeds();
  AudioManager.sfx.upgrade();
  showToast(item.icon + " " + item.name + " acquired!");
  refreshAscensionShopUI();
  refreshHUD();
  saveGame();
}

// ----- Main loop (with rain throttle and safety) -----
var eLC = 0, sC = 0, cLP = 0, storageUpdateCounter = 0, achCheckAccumulator = 0, workerRebalanceAccumulator = 0, tutorialCheckAccumulator = 0, animFrameId = null;

function startGameLoop() {
  gameLoopActive = true;
  state.lastTime = performance.now();
  state.lastSaveTime = Date.now();

  function animate() {
    if (!gameLoopActive) { animFrameId = null; return; }
    animFrameId = requestAnimationFrame(animate);
    try {
      var now = performance.now();
      var dt = (now - state.lastTime) / 1000; dt = Math.min(dt, 0.1);
      state.lastTime = now;
      state.lifetimeStats.totalPlayTime = (state.lifetimeStats.totalPlayTime || 0) + dt;

      if (typeof updateInertia === 'function') updateInertia(dt);
      updateParticles(dt); updateShake(dt); updateTutorial(dt); updateQueenIdle(dt);

      if (state.speedBoostTimer > 0) { state.speedBoostTimer -= dt; if (state.speedBoostTimer <= 0) applyAllWorkerSpeeds(); }
      if (state.luckyHourTimer > 0) { state.luckyHourTimer -= dt; }
      if (state.defenseBannerTimer > 0) { state.defenseBannerTimer -= dt; }
      if (state.virtualWorkers > 0) addFood(state.virtualWorkers * BAL.virtualFoodPerSecond * dt);
      if (state.earlyGameBoost > 0) { state.earlyGameBoost -= dt; if (state.earlyGameBoost <= 0) { state.earlyGameBoost = 0; updateEggLayTime(); } }

      // Rain update with throttling for performance
      if (state.weatherActive && state.weatherType === "rain") {
        if (!window._lastRainUpdate) window._lastRainUpdate = 0;
        window._lastRainUpdate += dt;
        if (window._lastRainUpdate >= 0.03) {
          window._lastRainUpdate = 0;
          for (var ri = 0; ri < rainDrops.length; ri++) {
            var drop = rainDrops[ri]; if (!drop.visible) continue;
            drop.position.y -= drop.userData.speed * dt;
            if (drop.position.y < -1) { drop.position.y = 12 + Math.random() * 3; drop.position.x = -SW/2 + Math.random()*SW; drop.position.z = -SD/2 + Math.random()*SD; }
          }
        }
      }

      if (state.rallyActive) { state.rallyTimer -= dt; if (state.rallyTimer <= 0) deactivateRally(); }
      if (state.rallyCooldown > 0) { state.rallyCooldown -= dt; if (state.rallyCooldown <= 0) state.rallyCooldown = 0; }
      if (typeof rallyOverlay !== 'undefined') {
        if (state.rallyActive) { rallyOverlay.style.display = "flex"; rallyOverlay.textContent = Math.ceil(state.rallyTimer) + "s"; }
        else if (state.rallyCooldown > 0) { rallyOverlay.style.display = "flex"; rallyOverlay.textContent = Math.ceil(state.rallyCooldown) + "s"; }
        else { rallyOverlay.style.display = "none"; }
      }

      if (!state.waveActive) { state.waveTimer -= dt; if (state.waveTimer <= 0) startWave(); }
      else { if (state.waveSpidersRemaining <= 0 && enemies.length === 0) endWave(); }
      updateWaveTimer();

      if (!state.eventActive) { state.eventTimer -= dt; if (state.eventTimer <= 0) triggerRandomEvent(); }
      else { state.eventTimer -= dt; if (state.eventTimer <= -15) { state.eventActive = false; eventBtn.style.display = "none"; state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin); } }
      updateEventTimer();

      if (!state.bossActive) { state.bossTimer -= dt; if (state.bossTimer <= 0) spawnBoss(); updateSummonButton(); }
      else { summonBtn.style.display = "none"; updateBoss(dt); }
      updateBossTimer();

      if (!state.weatherActive) {
        state.weatherTimer -= dt;
        if (state.weatherTimer <= 0) {
          state.weatherType = Math.random() < 0.5 ? "rain" : "night";
          state.weatherActive = true; state.weatherTimeLeft = BAL.weatherDuration;
          state.preWeatherZone = state.currentZone;
          if (state.weatherType === "rain") { showToast("🌧️ Rain!"); }
          else { showToast("🌙 Night falls"); }
          applyWeatherEffects(state.weatherType, true);
        }
      } else {
        state.weatherTimeLeft -= dt;
        if (state.weatherType === "night") {
          var gi = Math.min(1, 1 - (state.weatherTimeLeft / BAL.weatherDuration));
          for (var mi = 0; mi < mushroomMeshes.length; mi++) mushroomMeshes[mi].userData.capMat.emissiveIntensity = gi * 0.8;
          for (var mi = 0; mi < mushroomLights.length; mi++) mushroomLights[mi].intensity = gi * 0.6;
        }
        if (state.weatherTimeLeft <= 0) {
          applyWeatherEffects(state.weatherType, false);
          state.weatherActive = false;
          state.weatherTimer = BAL.weatherIntervalMin + Math.random() * (BAL.weatherIntervalMax - BAL.weatherIntervalMin);
          checkAchievements();
        }
      }

      if (!state.surgeActive) {
        state.surgeTimer -= dt;
        if (state.surgeTimer <= 0) {
          state.surgeActive = true; surgeBtn.style.display = "block";
          qgLight.intensity = 6; qgSphere.material.emissiveIntensity = 3;
          state.surgeTimer = BAL.surgeIntervalMin + Math.random() * (BAL.surgeIntervalMax - BAL.surgeIntervalMin);
          setTimeout(function() { if (state.surgeActive) { state.surgeActive = false; surgeBtn.style.display = "none"; } }, BAL.surgeDuration * 1000);
        }
      }

      if (state.deadSoldiers > 0) { state.soldierRespawnTimer -= dt; if (state.soldierRespawnTimer <= 0) respawnSoldier(); }

      for (var i = enemies.length - 1; i >= 0; i--) {
        var sp = enemies[i];
        if (sp.stealing && sp.fleeTarget) {
          var p = sp.mesh.position, t = sp.fleeTarget;
          var dx = t.x - p.x, dz = t.z - p.z;
          var dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 0.5 || sp.mesh.position.distanceTo(ER) > BAL.spiderFleeDistance) {
            disposeMesh(sp.mesh); scene.remove(sp.mesh); enemies.splice(i, 1);
            if (state.waveActive && state.waveSpidersRemaining > 0) state.waveSpidersRemaining--;
            continue;
          }
          var step = Math.min(sp.speed * 1.5 * dt, dist);
          p.x += (dx / dist) * step; p.z += (dz / dist) * step;
          sp.mesh.rotation.y = Math.atan2(dx, dz);
        }
      }

      eLC += dt;
      if (eLC >= state.eggLayTime) { eLC = 0; layEgg(); }

      for (var i = eggMs.length - 1; i >= 0; i--) {
        var egg = eggMs[i];
        if (egg.settling) {
          egg.settleT += dt / 0.4;
          var t = Math.min(1, egg.settleT), e = 1 - Math.pow(1 - t, 3);
          egg.mesh.position.x = qMesh.position.x + (egg.restX - qMesh.position.x) * e;
          egg.mesh.position.z = qMesh.position.z + (egg.restZ - qMesh.position.z) * e;
          egg.mesh.position.y = CCFY + 0.15;
          egg.mesh.scale.setScalar(0.3 + 0.7 * e);
          if (t >= 1) egg.settling = false;
        }
        egg.hatchTimer -= dt;
        var u = 1 - Math.max(0, egg.hatchTimer / egg.totalHatchTime);
        if (!egg.settling) egg.mesh.scale.setScalar(1 + Math.sin(now / (150 - u * 100)) * (0.05 + u * 0.12));
        egg.mat.emissive.setHex(0xffcc66); egg.mat.emissiveIntensity = u * 0.6;
        if (egg.hatchTimer <= 0) hatchEgg(egg, i);
      }

      for (var i = hatchFx.length - 1; i >= 0; i--) {
        var fx = hatchFx[i]; fx.life += dt; var t = fx.life / fx.maxLife;
        for (var ci = 0; ci < fx.group.children.length; ci++) {
          var s = fx.group.children[ci];
          s.position.x += s.userData.dir.x * dt * 1.2; s.position.y += s.userData.dir.y * dt * 1.2; s.position.z += s.userData.dir.z * dt * 1.2;
          s.scale.setScalar(Math.max(0, 1 - t));
        }
        if (t >= 1) { disposeMesh(fx.group); scene.remove(fx.group); hatchFx.splice(i, 1); }
      }

      for (var wi = 0; wi < workers.length; wi++) updateWorker(workers[wi], dt);
      for (var si = 0; si < soldiers.length; si++) updateSoldier(soldiers[si], dt);
      for (var sci = 0; sci < scouts.length; sci++) updateScout(scouts[sci], dt);
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        if (!e.stealing) {
          var p = e.mesh.position;
          var dx = e.target.x - p.x, dy = e.target.y - p.y, dz = e.target.z - p.z;
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0.5) {
            var step = Math.min(e.speed * dt, dist);
            p.x += (dx / dist) * step; p.y += (dy / dist) * step; p.z += (dz / dist) * step;
            e.mesh.rotation.y = Math.atan2(dx, dz);
          }
        }
      }
      combatUpdate(dt);

      for (var si = 0; si < soldiers.length; si++) updateHealthBar(soldiers[si].healthBar, soldiers[si].health / soldiers[si].maxHealth);
      for (var ei = 0; ei < enemies.length; ei++) updateHealthBar(enemies[ei].healthBar, enemies[ei].health / enemies[ei].maxHealth);
      if (state.bossActive && state.currentBoss) updateHealthBar(state.currentBoss.healthBar, state.currentBoss.health / state.currentBoss.maxHealth);

      if (researchChamberGroup && researchChamberGroup.children) {
        var time = performance.now() / 1000;
        for (var oi = 0; oi < researchChamberGroup.children.length; oi++) {
          var orb = researchChamberGroup.children[oi];
          var a = (oi / 5) * Math.PI * 2 + time * 0.5;
          orb.position.x = Math.cos(a) * 0.6; orb.position.z = Math.sin(a) * 0.6; orb.position.y = Math.sin(time * 2 + oi) * 0.15;
        }
      }

      cLP = Math.max(0, cLP - dt * 2.5);
      qgLight.intensity = Math.max(2.5, qgLight.intensity - dt * 3);
      qgSphere.material.emissiveIntensity = Math.max(1, qgSphere.material.emissiveIntensity - dt * 3);
      cLight.intensity = 1.6 + cLP * 1.8;

      for (var fi = 0; fi < FS.length; fi++) {
        var st = FS[fi];
        if (st.pileMesh) st.pileMesh.rotation.y += dt * 0.3;
        if (st.markerMesh) { st.markerMesh.position.y = GTY + 1.3 + Math.sin(now / 400 + st.x) * 0.08; st.markerMesh.rotation.y += dt; }
      }

      storageUpdateCounter += dt;
      if (storagePilesDirty && storageUpdateCounter > 2) { storageUpdateCounter = 0; storagePilesDirty = false; updateStoragePiles(); }

      achCheckAccumulator += dt;
      if (achCheckAccumulator > 8) { achCheckAccumulator = 0; checkAchievements(); }
      workerRebalanceAccumulator += dt;
      if (workerRebalanceAccumulator > BAL.workerRebalanceInterval) { workerRebalanceAccumulator = 0; rebalanceWorkers(); }
      tutorialCheckAccumulator += dt;
      if (tutorialCheckAccumulator > 5) { tutorialCheckAccumulator = 0; checkTutorials(); }

      if (typeof updateCameraAnim === 'function') updateCameraAnim(dt);
      if (typeof updateCamera === 'function') updateCamera();
      refreshHUD();

      sC += dt;
      if (sC > 10) { sC = 0; state.lastSaveTime = Date.now(); saveGame(); }

      renderer.render(scene, camera);
    } catch(e) { console.error('Loop error:', e); if (sC > 5) { sC = 0; showToast("⚠️ Minor hiccup — colony survived!"); } }
  }
  animate();
}

function initGameSystems() {
  if (gameSystemsReady) { clearAllMeshes(); gameSystemsReady = false; }
  buildTerrain();
  buildQueenChamberWalls();
  initFoodStations();
  initMushrooms();
  initRainDrops();
  initParticles();

  workers.length = 0; soldiers.length = 0; scouts.length = 0; enemies.length = 0; eggMs.length = 0; hatchFx.length = 0;
  barracksSoldiers.length = 0;
  if (researchChamberGroup) { disposeMesh(researchChamberGroup); scene.remove(researchChamberGroup); researchChamberGroup = null; }

  for (var wi = 0; wi < Math.min(state.workerCount, BAL.maxRenderedAnts); wi++) { var w = createWorker(false); if (w) workers.push(w); }
  state.virtualWorkers = Math.max(0, state.workerCount - workers.length);
  for (var si = 0; si < state.soldierCount; si++) { var chX = BAL.soldierRowStart + TX + 5 + si * 3.5; spawnSoldier(chX); }
  for (var sci = 0; sci < state.scoutCount; sci++) spawnScout();
  rebuildAllChambers(); updateStoragePiles(); updateNurseryClusters();
  recalculateHatchTime(); updateEggLayTime(); recalculateFoodCap();
  if (state.nestEvolutionLevel > 0) { for (var tier = 1; tier <= state.nestEvolutionLevel; tier++) evolveNestVisuals(tier, true); }
  var savedZone = ZONE_CONFIG[state.currentZone];
  if (savedZone) { scene.background = new THREE.Color(savedZone.bg); scene.fog = new THREE.Fog(savedZone.fog, 20, 80); }
  document.getElementById('zone-display').textContent = ZONE_CONFIG[state.currentZone] ? ZONE_CONFIG[state.currentZone].label : '🌳Forest';
  checkDailyReset(); setupButtons(); updateWaveTimer(); updateEventTimer(); updateBossTimer(); updateStreakDisplay();
  refreshAchievementsUI(); refreshPrestigeShopUI(); refreshEvolutionUI(); refreshHUD(); refreshDailyUI(); refreshStatsUI(); refreshRoadmapUI();
  gameSystemsReady = true;

  // Ensure boss UI is hidden when starting a new game
  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
}

initThreeJS();
