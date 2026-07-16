// ===== MAIN ENTRY POINT =====

var container, scene, camera, renderer, hLight, sLight, fLight, raycaster;
var gameLoopActive = false;
var gameSystemsReady = false;
var gamePaused = false;
var _lastRainUpdate = 0;

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
  gamePaused = true;
  if (gameLoopActive) {
    state.lastSaveTime = Date.now();
    saveGame();
  }

  document.getElementById('main-menu').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('bottom-bar').style.display = 'none';
  document.getElementById('canvas-container').style.display = 'none';

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

  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
  gamePaused = false;
}

// ----- Save slot rendering (three separate buttons) -----
function renderSlots() {
  var slots = SaveManager.getAllSlots(), html = '';
  for (var i = 0; i < slots.length; i++) {
    var sl = slots[i];
    html += '<div class="save-slot">';
    if (sl.hasData) {
      var d = new Date(sl.lastSaved), timeAgo = 'just now', diff = Date.now() - sl.lastSaved;
      if (diff > 86400000) timeAgo = Math.floor(diff / 86400000) + 'd ago';
      else if (diff > 3600000) timeAgo = Math.floor(diff / 3600000) + 'h ago';
      else if (diff > 60000) timeAgo = Math.floor(diff / 60000) + 'm ago';
      html += '<div class="slot-name">🐜 ' + sl.name + '</div>' +
              '<div class="slot-info">Lv ' + sl.level + ' | P' + sl.prestige + ' | A' + sl.ascension + ' | ' + timeAgo + '</div>' +
              '<div style="display:flex; gap:6px; margin-top:10px; justify-content:center;">' +
                '<button class="slot-action-btn play-colony-btn" onclick="playColony(' + i + '); event.stopPropagation();">▶️ Play</button>' +
                '<button class="slot-action-btn rename-colony-btn" onclick="renameColony(' + i + '); event.stopPropagation();">✏️ Rename</button>' +
                '<button class="slot-action-btn delete-colony-btn" onclick="deleteColony(' + i + '); event.stopPropagation();">🗑️ Delete</button>' +
              '</div>';
    } else {
      html += '<div class="slot-empty" onclick="newColony(' + i + ')">+ New Colony</div>';
    }
    html += '</div>';
  }
  document.getElementById('save-slots').innerHTML = html;
}

// Global functions for buttons
window.playColony = function(slot) {
  if (slot === currentSlot && gameSystemsReady && gamePaused) {
    hideMainMenu();
  } else {
    loadSlot(slot);
  }
};

window.newColony = function(slot) {
  loadSlot(slot);
};

window.renameColony = function(slot) {
  var modal = document.getElementById('rename-modal');
  if (!modal) return;
  var input = document.getElementById('rename-input');
  if (!input) return;
  var data = SaveManager.loadGame(slot);
  if (!data) return;
  input.value = data.colonyName || ('Colony ' + (slot + 1));
  modal.style.display = 'flex';
  setTimeout(function() { input.focus(); }, 100);
  document.getElementById('rename-confirm').onclick = function() {
    var newName = input.value.trim();
    if (newName) {
      data.colonyName = newName;
      SaveManager.saveGame(slot, data);
      if (currentSlot === slot) {
        state.colonyName = newName;
      }
      renderSlots();
    }
    modal.style.display = 'none';
  };
  document.getElementById('rename-cancel').onclick = function() {
    modal.style.display = 'none';
  };
};

window.deleteColony = function(slot) {
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
};

function performDelete(slot) {
  SaveManager.deleteSlot(slot);
  if (currentSlot === slot) {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    gameLoopActive = false;
    gamePaused = false;
    clearAllMeshes();
    resetStateToDefault(-1);
    currentSlot = -1;
    showMainMenu();
  } else {
    renderSlots();
  }
}

window.loadSlot = function(slot) {
  if (slot === currentSlot && gameSystemsReady && gamePaused) {
    hideMainMenu();
    return;
  }

  if (gameLoopActive) {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    gameLoopActive = false;
    gamePaused = false;
  }

  var data = SaveManager.loadGame(slot);
  clearAllMeshes();
  var loadedSaveTime = data ? data.lastSaveTime : Date.now();
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
  state.lastSaveTime = loadedSaveTime;
  if (!state.bossTimer || state.bossTimer <= 0) {
    state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  }
  AudioManager.sfx.buttonClick();
  updateBossTimer();
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
    } else {
      checkDailyLogin();
    }
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

// ----- Main loop (with label visibility control) -----
var eLC = 0, sC = 0, cLP = 0, storageUpdateCounter = 0, achCheckAccumulator = 0, workerRebalanceAccumulator = 0, tutorialCheckAccumulator = 0, animFrameId = null;
var vwFoodAccum = 0;

function startGameLoop() {
  gameLoopActive = true;
  gamePaused = false;
  state.lastTime = performance.now();
  state.lastSaveTime = Date.now();

  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
  var summonBtn = document.getElementById('summon-btn');
  if (summonBtn) summonBtn.style.display = 'none';

  function animate() {
    if (!gameLoopActive) { animFrameId = null; return; }
    animFrameId = requestAnimationFrame(animate);

    if (gamePaused) return;

    var now = performance.now();
    var dt = (now - state.lastTime) / 1000;
    dt = Math.min(dt, 0.1);
    state.lastTime = now;

    // Safe updates (timers, basic state)
    try {
      state.lifetimeStats.totalPlayTime = (state.lifetimeStats.totalPlayTime || 0) + dt;

      if (typeof updateInertia === 'function') updateInertia(dt);
      updateParticles(dt); updateShake(dt); updateTutorial(dt); updateQueenIdle(dt);

      if (state.speedBoostTimer > 0) { state.speedBoostTimer -= dt; if (state.speedBoostTimer <= 0) applyAllWorkerSpeeds(); }
      if (state.luckyHourTimer > 0) { state.luckyHourTimer -= dt; }
      if (state.defenseBannerTimer > 0) { state.defenseBannerTimer -= dt; }

      if (state.virtualWorkers > 0) {
        vwFoodAccum += state.virtualWorkers * BAL.virtualFoodPerSecond * dt;
        if (vwFoodAccum >= 1) {
          var addNow = Math.floor(vwFoodAccum);
          vwFoodAccum -= addNow;
          addFood(addNow);
        }
      }

      if (state.earlyGameBoost > 0) { state.earlyGameBoost -= dt; if (state.earlyGameBoost <= 0) { state.earlyGameBoost = 0; updateEggLayTime(); } }

      // Build Queue processing
      if (state.buildQueue.length > 0) {
        var currentBuild = state.buildQueue[0];
        currentBuild.timeRemaining -= dt;
        if (currentBuild.timeRemaining <= 0) {
          switch (currentBuild.type) {
            case "foodStorage": buildFoodStorageChamber(); break;
            case "nursery": buildNurseryChamber(); break;
            case "soldier": buildSoldierChamber(); break;
            case "research": buildResearchChamber(); break;
            case "scout": buildScoutChamber(); break;
          }
          state.buildQueue.shift();
        }
      }
    } catch(e) { console.error('General update error:', e); }

    // Rain update (isolated)
    try {
      if (state.weatherActive && state.weatherType === "rain") {
        _lastRainUpdate += dt;
        if (_lastRainUpdate >= 0.03) {
          _lastRainUpdate = 0;
          for (var ri = 0; ri < rainDrops.length; ri++) {
            var drop = rainDrops[ri]; if (!drop.visible) continue;
            drop.position.y -= drop.userData.speed * dt;
            if (drop.position.y < -1) { drop.position.y = 12 + Math.random() * 3; drop.position.x = -SW/2 + Math.random()*SW; drop.position.z = -SD/2 + Math.random()*SD; }
          }
        }
      }
    } catch(e) { console.error('Rain error:', e); }

    // Rally, wave, events, boss (isolated)
    try {
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

      // Event handling (reactive events first)
      if (!state.eventActive && !state.eventChoiceActive) {
        state.eventTimer -= dt;
        if (state.eventTimer <= 0) {
          var reactiveAvailable = [];
          for (var i = 0; i < REACTIVE_EVENTS.length; i++) {
            if (REACTIVE_EVENTS[i].condition()) reactiveAvailable.push(REACTIVE_EVENTS[i]);
          }
          if (reactiveAvailable.length > 0 && Math.random() < 0.7) {
            var rev = reactiveAvailable[Math.floor(Math.random() * reactiveAvailable.length)];
            state.eventChoices = rev.choices;
            state.eventChoiceActive = true;
            state.eventActive = true;
            state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
            showReactiveEventUI(rev);
          } else {
            triggerRandomEvent();
          }
        }
      } else if (state.eventActive && !state.eventChoiceActive) {
        state.eventTimer -= dt;
        if (state.eventTimer <= -15) {
          state.eventActive = false;
          if (eventBtn) eventBtn.style.display = "none";
          state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
        }
      }
      updateEventTimer();

      // Boss logic
      if (!state.bossActive) {
        state.bossTimer -= dt;
        if (state.bossTimer <= 0) {
          spawnBoss();
          state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
          updateSummonButton();
        }
      } else {
        summonBtn.style.display = "none";
        updateBoss(dt);
      }
      updateBossTimer();
    } catch(e) { console.error('Wave/event/boss error:', e); }

    // Weather logic (isolated)
    try {
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
          for (var mi = 0; mi < mushroomMeshes.length; mi++) {
            if (mushroomMeshes[mi].userData.capMat) mushroomMeshes[mi].userData.capMat.emissiveIntensity = gi * 0.8;
          }
        }
        if (state.weatherTimeLeft <= 0) {
          applyWeatherEffects(state.weatherType, false);
          state.weatherActive = false;
          state.weatherTimer = BAL.weatherIntervalMin + Math.random() * (BAL.weatherIntervalMax - BAL.weatherIntervalMin);
          checkAchievements();
        }
      }
    } catch(e) { console.error('Weather error:', e); }

    // Surge, soldier respawn (safe)
    try {
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
    } catch(e) { console.error('Surge/respawn error:', e); }

    // Enemies (flee loop with safety checks)
    try {
      for (var i = enemies.length - 1; i >= 0; i--) {
        var sp = enemies[i];
        if (!sp || !sp.mesh) { enemies.splice(i, 1); continue; }
        if (sp.stealing && sp.fleeTarget && !isNaN(sp.fleeTarget.x)) {
          var p = sp.mesh.position, t = sp.fleeTarget;
          if (!p || isNaN(p.x)) { disposeMesh(sp.mesh); scene.remove(sp.mesh); enemies.splice(i, 1); continue; }
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
        } else if (sp.stealing && !sp.fleeTarget) {
          sp._stuckTimer = (sp._stuckTimer || 0) + dt;
          if (sp._stuckTimer > 5) {
            disposeMesh(sp.mesh); scene.remove(sp.mesh); enemies.splice(i, 1);
            if (state.waveActive && state.waveSpidersRemaining > 0) state.waveSpidersRemaining--;
          }
        }
      }
    } catch(e) { console.error('Enemy flee error:', e); }

    // Eggs (isolated)
    try {
      eLC += dt;
      if (eLC >= state.eggLayTime && eggMs.length < 30) { eLC = 0; layEgg(); }
      else if (eLC >= state.eggLayTime) { eLC = 0; state.eggs++; state.virtualWorkers++; }

      for (var i = eggMs.length - 1; i >= 0; i--) {
        var egg = eggMs[i];
        if (!egg || !egg.mesh) continue;
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
    } catch(e) { console.error('Egg error:', e); }

    // Hatch FX (isolated)
    try {
      for (var i = hatchFx.length - 1; i >= 0; i--) {
        var fx = hatchFx[i]; if (!fx || !fx.group) continue;
        fx.life += dt; var t = fx.life / fx.maxLife;
        for (var ci = 0; ci < fx.group.children.length; ci++) {
          var s = fx.group.children[ci];
          s.position.x += s.userData.dir.x * dt * 1.2; s.position.y += s.userData.dir.y * dt * 1.2; s.position.z += s.userData.dir.z * dt * 1.2;
          s.scale.setScalar(Math.max(0, 1 - t));
        }
        if (t >= 1) { disposeMesh(fx.group); scene.remove(fx.group); hatchFx.splice(i, 1); }
      }
    } catch(e) { console.error('HatchFX error:', e); }

    // Workers, soldiers, scouts (isolated)
    try {
      for (var wi = 0; wi < workers.length; wi++) updateWorker(workers[wi], dt);
      for (var si = 0; si < soldiers.length; si++) updateSoldier(soldiers[si], dt);
      for (var sci = 0; sci < scouts.length; sci++) updateScout(scouts[sci], dt);
    } catch(e) { console.error('Worker/soldier/scout error:', e); }

    // Enemy movement (non-stealing) (isolated)
    try {
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        if (!e || !e.mesh || e.stealing) continue;
        var p = e.mesh.position;
        if (!p || isNaN(p.x)) continue;
        var dx = e.target.x - p.x, dy = e.target.y - p.y, dz = e.target.z - p.z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.5) {
          var step = Math.min(e.speed * dt, dist);
          p.x += (dx / dist) * step; p.y += (dy / dist) * step; p.z += (dz / dist) * step;
          e.mesh.rotation.y = Math.atan2(dx, dz);
        }
      }
    } catch(e) { console.error('Enemy movement error:', e); }

    // Combat (isolated)
    try {
      combatUpdate(dt);
    } catch(e) { console.error('Combat error:', e); }

    // Health bars (isolated)
    try {
      for (var si = 0; si < soldiers.length; si++) {
        var s = soldiers[si]; if (!s || !s.healthBar) continue;
        updateHealthBar(s.healthBar, s.health / s.maxHealth);
      }
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei]; if (!e || !e.healthBar) continue;
        updateHealthBar(e.healthBar, e.health / e.maxHealth);
      }
      if (state.bossActive && state.currentBoss && state.currentBoss.healthBar) {
        updateHealthBar(state.currentBoss.healthBar, state.currentBoss.health / state.currentBoss.maxHealth);
      }
    } catch(e) { console.error('Health bar error:', e); }

    // Label visibility: only show labels when camera is underground (looking at tunnel)
    try {
      var cameraY = camera.position.y;
      var isUnderground = cameraY < CCY + 1.0; // below surface level
      // Toggle all sprites that are labels
      scene.traverse(function(obj) {
        if (obj.isSprite && obj.userData && obj.userData.isLabel) {
          obj.visible = isUnderground;
        }
      });
    } catch(e) { console.error('Label visibility error:', e); }

    // Research orbs
    try {
      if (researchChamberGroup && researchChamberGroup.children) {
        var time = performance.now() / 1000;
        for (var oi = 0; oi < researchChamberGroup.children.length; oi++) {
          var orb = researchChamberGroup.children[oi];
          var a = (oi / 5) * Math.PI * 2 + time * 0.5;
          orb.position.x = Math.cos(a) * 0.6; orb.position.z = Math.sin(a) * 0.6; orb.position.y = Math.sin(time * 2 + oi) * 0.15;
        }
      }
    } catch(e) { console.error('Research orb error:', e); }

    // Lights
    try {
      cLP = Math.max(0, cLP - dt * 2.5);
      qgLight.intensity = Math.max(2.5, qgLight.intensity - dt * 3);
      qgSphere.material.emissiveIntensity = Math.max(1, qgSphere.material.emissiveIntensity - dt * 3);
      cLight.intensity = 1.6 + cLP * 1.8;

      for (var fi = 0; fi < FS.length; fi++) {
        var st = FS[fi];
        if (st.pileMesh) st.pileMesh.rotation.y += dt * 0.3;
        if (st.markerMesh) { st.markerMesh.position.y = GTY + 1.3 + Math.sin(now / 400 + st.x) * 0.08; st.markerMesh.rotation.y += dt; }
      }
    } catch(e) { console.error('Lights error:', e); }

    // Storage piles
    try {
      storageUpdateCounter += dt;
      if (storagePilesDirty && storageUpdateCounter > 30) { storageUpdateCounter = 0; storagePilesDirty = false; updateStoragePiles(); }
    } catch(e) { console.error('Storage piles error:', e); }

    // Achievements, rebalance, tutorials
    try {
      achCheckAccumulator += dt;
      if (achCheckAccumulator > 8) { achCheckAccumulator = 0; checkAchievements(); }
      workerRebalanceAccumulator += dt;
      if (workerRebalanceAccumulator > BAL.workerRebalanceInterval) { workerRebalanceAccumulator = 0; rebalanceWorkers(); }
      tutorialCheckAccumulator += dt;
      if (tutorialCheckAccumulator > 5) { tutorialCheckAccumulator = 0; checkTutorials(); }
    } catch(e) { console.error('Achievement/tutorial error:', e); }

    // Camera, HUD, save
    try {
      if (typeof updateCameraAnim === 'function') updateCameraAnim(dt);
      if (typeof updateCamera === 'function') updateCamera();
      refreshHUD();
    } catch(e) { console.error('HUD/camera error:', e); }

    try {
      sC += dt;
      if (sC > 10) { sC = 0; state.lastSaveTime = Date.now(); saveGame(); }
    } catch(e) { console.error('Save error:', e); }

    // Render always runs
    try {
      renderer.render(scene, camera);
    } catch(e) { console.error('Render error:', e); }
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

  var bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = 'none';
  var summonBtn = document.getElementById('summon-btn');
  if (summonBtn) summonBtn.style.display = 'none';
}

initThreeJS();
