// ===== HUD, TOASTS, FLOATERS, MENUS, ACHIEVEMENTS, DAILY, STATS, PRESTIGE/ASCENSION UI =====

var elFood, elFoodCap, elGems, elAnts, elAlertCount;
var elAlertsPanel, elAlertsContent, elResourcesPanel;
var elMorePanel;
var toastEl, floatersEl;
var buildPanel, upgradePanel, shopPanel, achPanel, evoPanel, ppPanel, ascPanel, researchPanel;
var surgeBtn, eventBtn, summonBtn, rallyBtn, rallyOverlay;

function initDOMRefs() {
  elFood = document.getElementById("food-count");
  elFoodCap = document.getElementById("food-cap");
  elGems = document.getElementById("gem-count");
  elAnts = document.getElementById("ant-count");
  elAlertCount = document.getElementById("alert-count");
  elAlertsPanel = document.getElementById("alerts-panel");
  elAlertsContent = document.getElementById("alerts-content");
  elResourcesPanel = document.getElementById("resources-panel");
  elMorePanel = document.getElementById("more-panel");

  toastEl = document.getElementById("toast");
  floatersEl = document.getElementById("floaters");

  buildPanel = document.getElementById("build-panel");
  upgradePanel = document.getElementById("upgrade-panel");
  shopPanel = document.getElementById("shop-panel");
  achPanel = document.getElementById("achievements-panel");
  evoPanel = document.getElementById("evolution-panel");
  ppPanel = document.getElementById("prestige-shop-panel");
  ascPanel = document.getElementById("ascension-shop-panel");
  researchPanel = document.getElementById("research-panel");

  surgeBtn = document.getElementById("surge-btn");
  eventBtn = document.getElementById("event-btn");
  summonBtn = document.getElementById("summon-btn");
  rallyBtn = document.getElementById("btn-rally");
  rallyOverlay = rallyBtn ? rallyBtn.querySelector(".cooldown-overlay") : null;
}
initDOMRefs();

// Rally button listener
if (rallyBtn) rallyBtn.addEventListener("click", activateRally);

// ---- Attach summon, surge, event listeners ----
if (surgeBtn) {
  surgeBtn.addEventListener("click", function() {
    try {
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
    } catch (e) {
      console.error("Surge error:", e);
      showToast("❌ Surge collection failed.");
    }
  });
}
if (eventBtn) {
  eventBtn.addEventListener("click", function() {
    try {
      if (!state.eventActive) return;
      var idx = parseInt(eventBtn.dataset.idx);
      if (idx >= 0 && idx < EVENTS.length) EVENTS[idx].action();
      state.eventActive = false;
      eventBtn.style.display = "none";
      state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
      showToast("✅ Event collected!");
    } catch (e) {
      console.error("Event error:", e);
      showToast("❌ Event collection failed.");
    }
  });
}
if (summonBtn) {
  summonBtn.addEventListener("click", function() {
    try {
      if (typeof summonBoss === 'function') summonBoss();
    } catch (e) {
      console.error("Summon error:", e);
    }
  });
}

// ---- Close panels on outside click ----
document.addEventListener('click', function(e) {
  if (!e.target.closest('#alerts-panel') && !e.target.closest('#alerts-pill')) {
    if (elAlertsPanel) elAlertsPanel.style.display = 'none';
  }
  if (!e.target.closest('#resources-panel') && !e.target.closest('#resources-pill')) {
    if (elResourcesPanel) elResourcesPanel.style.display = 'none';
  }
});

// ---- Close buttons inside panels ----
var alertsCloseBtn = document.getElementById('alerts-close-btn');
if (alertsCloseBtn) alertsCloseBtn.onclick = function() { if (elAlertsPanel) elAlertsPanel.style.display = 'none'; };
var resourcesCloseBtn = document.getElementById('resources-close-btn');
if (resourcesCloseBtn) resourcesCloseBtn.onclick = function() { if (elResourcesPanel) elResourcesPanel.style.display = 'none'; };

function closeAllModals() {
  ['offline-modal', 'daily-modal', 'prestige-modal', 'ascend-modal', 'about-modal', 'delete-modal'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
}

// ---- TOAST SYSTEM ----
var toastQueue = [], toastActive = false;
function processToastQueue() {
  if (!toastEl) return;
  if (toastActive || toastQueue.length === 0) return;
  toastActive = true;
  var msg = toastQueue.shift();
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  toastEl.style.transition = "none";
  void toastEl.offsetWidth;
  toastEl.style.transition = "opacity 0.3s ease";
  setTimeout(function() { toastEl.style.opacity = "0"; toastActive = false; setTimeout(processToastQueue, 300); }, 2200);
}
function showToast(msg) { toastQueue.push(msg); processToastQueue(); }

var achToastTimeout = null;
function showAchievementToast(achName, achIcon, tierDesc, reward) {
  var at = document.getElementById('achievement-toast');
  if (!at) return;
  var iconEl = document.getElementById('ach-toast-icon');
  var titleEl = document.getElementById('ach-toast-title');
  var descEl = document.getElementById('ach-toast-desc');
  if (iconEl) iconEl.textContent = achIcon;
  if (titleEl) titleEl.textContent = achName;
  if (descEl) descEl.textContent = tierDesc + " — 💎 +" + reward;
  at.style.opacity = "1";
  if (achToastTimeout) clearTimeout(achToastTimeout);
  achToastTimeout = setTimeout(function() { at.style.opacity = "0"; achToastTimeout = null; }, 3500);
}

function spawnFloater(text, sx, sy, color) {
  if (!floatersEl) return;
  var f = document.createElement("div");
  f.className = "floater";
  f.textContent = text;
  f.style.left = sx + "px";
  f.style.top = sy + "px";
  if (color) f.style.color = color;
  floatersEl.appendChild(f);
  setTimeout(function() { f.remove(); }, 1150);
}

// =============================================
//  ALERTS (wave, event, boss) – unified panel
// =============================================
function updateAlertsPanel() {
  if (!elAlertCount) return;
  var alerts = [];
  if (state.waveActive) alerts.push({ text: "⚠️ Wave in progress", color: "#ffaa00" });
  else alerts.push({ text: "Wave in " + Math.ceil(state.waveTimer) + "s", color: "#ffaa00" });
  if (state.eventActive && !state.eventChoiceActive) alerts.push({ text: "🎲 Event active", color: "#4488ff" });
  else if (state.eventChoiceActive) alerts.push({ text: "❓ Event choice!", color: "#ff44ff" });
  else if (Math.ceil(state.eventTimer) <= 15) alerts.push({ text: "Event in " + Math.ceil(state.eventTimer) + "s", color: "#4488ff" });
  if (state.bossActive) alerts.push({ text: "💀 Boss fight!", color: "#cc0000" });
  else {
    var totalSec = Math.ceil(state.bossTimer);
    var mins = Math.floor(totalSec / 60), secs = totalSec % 60;
    var display = mins > 0 ? mins + "m " + (secs < 10 ? "0" : "") + secs + "s" : secs + "s";
    alerts.push({ text: "Boss in " + display, color: "#cc0000" });
  }
  elAlertCount.textContent = alerts.length;
  if (elAlertsPanel && elAlertsContent && elAlertsPanel.style.display === 'flex') {
    var html = '';
    alerts.forEach(function(a) { html += '<div class="alert-item" style="color:' + a.color + ';">' + a.text + '</div>'; });
    if (alerts.length === 0) html = '<div class="alert-item" style="color:#aaa;">No alerts</div>';
    elAlertsContent.innerHTML = html;
  }
}

function updateWaveTimer() { updateAlertsPanel(); }
function updateEventTimer() { updateAlertsPanel(); }
function updateBossTimer() { updateAlertsPanel(); }

var alertsPill = document.getElementById("alerts-pill");
if (alertsPill) alertsPill.onclick = function() {
  AudioManager.sfx.buttonClick();
  if (elAlertsPanel && elResourcesPanel) {
    if (elAlertsPanel.style.display === 'flex') { elAlertsPanel.style.display = 'none'; }
    else { elResourcesPanel.style.display = 'none'; elAlertsPanel.style.display = 'flex'; updateAlertsPanel(); }
  }
};

// =============================================
//  RESOURCES POPUP
// =============================================
function updateResourcesPopup() {
  var resEggs = document.getElementById("res-eggs");
  var resVW = document.getElementById("res-vw");
  var resStreak = document.getElementById("res-streak");
  var resPP = document.getElementById("res-pp");
  var resAP = document.getElementById("res-ap");
  var resLevel = document.getElementById("res-level");
  if (resEggs) resEggs.textContent = state.eggs;
  if (resVW) resVW.textContent = state.virtualWorkers;
  if (resStreak) resStreak.textContent = "🔥" + state.dailyStreak;
  if (resPP) resPP.textContent = state.prestigePoints + " PP";
  if (resAP) resAP.textContent = state.ascensionPoints + " AP";
  if (resLevel) resLevel.textContent = state.level;
}

var resourcesPill = document.getElementById("resources-pill");
if (resourcesPill) resourcesPill.onclick = function() {
  AudioManager.sfx.buttonClick();
  if (elResourcesPanel && elAlertsPanel) {
    if (elResourcesPanel.style.display === 'flex') { elResourcesPanel.style.display = 'none'; }
    else { elAlertsPanel.style.display = 'none'; elResourcesPanel.style.display = 'flex'; updateResourcesPopup(); }
  }
};

// =============================================
//  HUD UPDATE
// =============================================
function refreshHUD() {
  if (elFood) elFood.textContent = Math.floor(state.food);
  if (elFoodCap) elFoodCap.textContent = state.foodCap;
  if (elGems) elGems.textContent = Math.floor(state.gems);
  if (elAnts) elAnts.textContent = state.workerCount + state.soldierCount + state.scoutCount;
  var zoneDisp = document.getElementById('zone-display');
  if (zoneDisp) zoneDisp.textContent = ZONE_CONFIG[state.currentZone] ? ZONE_CONFIG[state.currentZone].label : '🌳Forest';
  if (typeof updateSummonButton === 'function') updateSummonButton();
  refreshBuildQueueUI();
  updateReactiveEventUI();
}

// =============================================
//  "MORE" PANEL
// =============================================
function toggleMorePanel() {
  if (!elMorePanel) return;
  if (elMorePanel.style.display === 'flex') { elMorePanel.style.display = 'none'; }
  else { elMorePanel.style.display = 'flex'; }
}

var btnMore = document.getElementById("btn-more");
if (btnMore) btnMore.onclick = function() { AudioManager.sfx.buttonClick(); toggleMorePanel(); };

// =============================================
//  REACTIVE EVENT UI
// =============================================
function showReactiveEventUI(ev) {
  var container = document.getElementById('reactive-event-panel');
  if (!container) {
    container = document.createElement('div');
    container.id = 'reactive-event-panel';
    container.className = 'game-panel open';
    container.style.position = 'fixed';
    container.style.top = '30%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%,-50%)';
    container.style.zIndex = '50';
    container.style.minWidth = '280px';
    container.style.textAlign = 'center';
    document.body.appendChild(container);
  }
  var html = '<div class="panel-title">' + ev.emoji + ' ' + ev.name + '</div>';
  for (var i = 0; i < ev.choices.length; i++) {
    html += '<button class="menu-btn" style="margin:4px; display:block; width:100%;" onclick="selectReactiveChoice(' + i + ')">' + ev.choices[i].text + '</button>';
  }
  container.innerHTML = html;
  container.style.display = 'flex';
}

window.selectReactiveChoice = function(idx) {
  if (state.eventChoices[idx]) { state.eventChoices[idx].action(); }
  state.eventChoiceActive = false; state.eventChoices = []; state.eventActive = false;
  state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
  var container = document.getElementById('reactive-event-panel');
  if (container) container.style.display = 'none';
  refreshHUD();
};

function updateReactiveEventUI() {
  var container = document.getElementById('reactive-event-panel');
  if (container && !state.eventChoiceActive) { container.style.display = 'none'; }
}

// =============================================
//  BUILD QUEUE UI
// =============================================
function refreshBuildQueueUI() {
  if (!buildPanel) return;
  var queueEl = buildPanel.querySelector('.build-queue');
  if (!queueEl) {
    queueEl = document.createElement('div');
    queueEl.className = 'build-queue';
    buildPanel.appendChild(queueEl);
  }
  var html = '';
  if (state.buildQueue.length > 0) {
    var q = state.buildQueue[0];
    var progress = 1 - (q.timeRemaining / q.totalTime);
    html += '<div class="panel-option"><span>🔨 Building ' + q.type + '</span><div class="ach-progress-bar" style="width:100px; margin-left:8px;"><div class="ach-progress-fill" style="width:' + (progress*100) + '%"></div></div></div>';
  }
  queueEl.innerHTML = html;
}

// =============================================
//  PRESTIGE GOAL SELECTION
// =============================================
function showPrestigeGoalSelection() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.id = 'prestige-goal-modal';
  var html = '<div class="modal-card"><div class="modal-title">🎯 Choose Goal</div>';
  html += '<div style="color:#f3e3c4; font-size:14px; margin-bottom:10px;">Complete for bonus PP</div>';
  for (var i = 0; i < PRESTIGE_GOALS.length; i++) {
    var g = PRESTIGE_GOALS[i];
    html += '<button class="menu-btn" style="margin:4px;" onclick="selectPrestigeGoal(\'' + g.id + '\')">' + g.name + ': ' + g.desc + ' (+' + g.bonusPP + ' PP)</button>';
  }
  html += '<button class="modal-btn secondary" onclick="document.getElementById(\'prestige-goal-modal\').style.display=\'none\'">Skip</button></div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

window.selectPrestigeGoal = function(id) {
  var goal = null;
  for (var i = 0; i < PRESTIGE_GOALS.length; i++) { if (PRESTIGE_GOALS[i].id === id) { goal = PRESTIGE_GOALS[i]; break; } }
  if (goal) { state.prestigeGoal = goal.id; state.prestigeGoalSelected = true; showToast("🎯 Goal set: " + goal.name); }
  var modal = document.getElementById('prestige-goal-modal');
  if (modal) modal.style.display = 'none';
};

// =============================================
//  ACHIEVEMENTS
// =============================================
function checkAchievements() {
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var ach = ACHIEVEMENTS[i];
    if (ach.hidden && !isAchRevealed(ach)) continue;
    var claimedTier = state.achievementsClaimed[ach.id] || 0;
    if (claimedTier >= ach.tiers.length) continue;
    var nextTier = ach.tiers[claimedTier];
    if (checkAchReq(ach, nextTier.req)) {
      state.achievementsClaimed[ach.id] = claimedTier + 1;
      state.gems += nextTier.reward;
      state.totalGemsEarned += nextTier.reward;
      showAchievementToast(ach.name, ach.icon, nextTier.desc, nextTier.reward);
      showToast("🏆 " + ach.name + " Tier " + (claimedTier + 1) + "! +" + nextTier.reward + "💎");
      AudioManager.sfx.achievement();
    }
  }
}
function isAchRevealed(ach) {
  if (!ach.hidden) return true;
  if (state.achievementsClaimed[ach.id] && state.achievementsClaimed[ach.id] > 0) return true;
  for (var i = 0; i < ach.tiers.length; i++) { if (checkAchReq(ach, ach.tiers[i].req)) return true; }
  return false;
}
function checkAchReq(ach, req) {
  switch (ach.id) {
    case "hatch": return state.totalHatched >= req;
    case "spider": return state.totalKills >= req;
    case "boss": return state.bossKills >= req;
    case "level": return state.level >= req;
    case "storage": return state.foodCap >= req;
    case "prestige": return state.prestigeCount >= req;
    case "builder": return state.chambers.foodStorage.count > 0 && state.chambers.nursery.count > 0 && state.chambers.soldier.count > 0 && state.chambers.research.count > 0 && state.chambers.scout.count > 0;
    case "rare": return state.rareAntCount >= req;
    case "gem": return state.totalGemsEarned >= req;
    case "explorer": return state.unlockedZonesList.length - 1 >= req;
    case "feast": return (state.lifetimeStats.totalFood || 0) >= req;
    case "time": return (state.lifetimeStats.totalPlayTime || 0) >= req;
    case "rally": return state.rallyUses >= req;
    case "surge": return state.surgesCollected >= req;
    case "night": return state.survivedNight >= req;
    case "speed": if (state.prestigeCount === 0) return false; var pt = (state.lifetimeStats.fastestPrestige || 999999); if (req === 1) return pt < 7200; if (req === 2) return pt < 3600; if (req === 3) return pt < 1800; return false;
    case "pacifist": return state.level >= 30 && state.chambers.soldier.count === 0;
    case "queenclick": return state.queenClicks >= req;
    case "weathervet": return state.survivedNight >= 10 && (state.lifetimeStats.totalNights || 0) >= 10;
    case "golden": var gc = 0; for (var j = 0; j < workers.length; j++) if (workers[j].isGolden) gc++; return gc >= req;
    case "beetle": return state.beetleKills >= req;
    case "wasp": return state.waspKills >= req;
    case "cave": return state.caveBossKills >= req;
    case "swamp": return state.swampBossKills >= req;
    case "mountain": return state.mountainBossKills >= req;
    case "ascend1": return state.ascensionCount >= req;
    case "ascend2": var spent = 0; for (var k in state.ascensionUpgrades) spent += state.ascensionUpgrades[k]; return spent >= req;
    case "zoneMaster": return state.unlockedZonesList.length >= 6;
    case "poisonProof": return state.caveBossKills >= req;
    case "regenerationSlayer": return state.swampBossKills >= req;
    case "frostBreaker": return state.mountainBossKills >= req;
    case "ascendFast": if (state.ascensionCount === 0) return false; var timeToAscend = state.lifetimeStats.totalPlayTime; if (req === 1) return timeToAscend < 86400; if (req === 2) return timeToAscend < 43200; return false;
    case "allBosses": var bossTypes = ["queen", "beetle", "wasp", "centipede", "hydra", "wyrm"]; for (var bi = 0; bi < bossTypes.length; bi++) { if (!state.bossKillsByType || (state.bossKillsByType[bossTypes[bi]] || 0) === 0) return false; } return true;
    case "endGame": return state.prestigeCount >= 100 && state.ascensionCount >= 1;
    default: return false;
  }
}
function getAchProgress(ach) {
  var claimedTier = state.achievementsClaimed[ach.id] || 0; if (claimedTier >= ach.tiers.length) return 1;
  var currentReq = ach.tiers[claimedTier].req; var prevReq = claimedTier > 0 ? ach.tiers[claimedTier - 1].req : 0;
  if (currentReq === prevReq) return 0;
  var current = 0;
  switch (ach.id) {
    case "hatch": current = state.totalHatched; break;
    case "spider": current = state.totalKills; break;
    case "boss": current = state.bossKills; break;
    case "level": current = state.level; break;
    case "storage": current = state.foodCap; break;
    case "prestige": current = state.prestigeCount; break;
    case "builder": return ((state.chambers.foodStorage.count>0?1:0)+(state.chambers.nursery.count>0?1:0)+(state.chambers.soldier.count>0?1:0)+(state.chambers.research.count>0?1:0)+(state.chambers.scout.count>0?1:0))/5;
    case "rare": current = state.rareAntCount; break;
    case "gem": current = state.totalGemsEarned; break;
    case "explorer": current = state.unlockedZonesList.length - 1; break;
    case "feast": current = state.lifetimeStats.totalFood || 0; break;
    case "time": current = state.lifetimeStats.totalPlayTime || 0; break;
    case "rally": current = state.rallyUses; break;
    case "surge": current = state.surgesCollected; break;
    case "night": current = state.survivedNight; break;
    case "speed": return state.lifetimeStats.fastestPrestige ? Math.min(1, 3600 / state.lifetimeStats.fastestPrestige) : 0;
    case "pacifist": return state.level >= 30 && state.chambers.soldier.count === 0 ? 1 : Math.min(1, state.level / 30);
    case "queenclick": current = state.queenClicks; break;
    case "weathervet": current = Math.min(state.survivedNight / 10, 1); break;
    case "golden": var gc = 0; for (var j = 0; j < workers.length; j++) if (workers[j].isGolden) gc++; current = gc; break;
    case "beetle": current = state.beetleKills; break;
    case "wasp": current = state.waspKills; break;
    case "cave": current = state.caveBossKills; break;
    case "swamp": current = state.swampBossKills; break;
    case "mountain": current = state.mountainBossKills; break;
    case "ascend1": current = state.ascensionCount; break;
    case "ascend2": var spent = 0; for (var k in state.ascensionUpgrades) spent += state.ascensionUpgrades[k]; current = spent; break;
    case "zoneMaster": return state.unlockedZonesList.length >= 6 ? 1 : 0;
    case "poisonProof": current = state.caveBossKills; break;
    case "regenerationSlayer": current = state.swampBossKills; break;
    case "frostBreaker": current = state.mountainBossKills; break;
    case "ascendFast": return state.ascensionCount > 0 ? Math.min(1, 86400 / (state.lifetimeStats.totalPlayTime || 1)) : 0;
    case "allBosses": return 0;
    case "endGame": return state.prestigeCount >= 100 && state.ascensionCount >= 1 ? 1 : 0;
    default: return 0;
  }
  return Math.min(1, Math.max(0, (current - prevReq) / (currentReq - prevReq)));
}
function refreshAchievementsUI() {
  var list = document.getElementById('ach-list'); if (!list) return;
  var html = "";
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var ach = ACHIEVEMENTS[i];
    if (ach.hidden && !isAchRevealed(ach)) {
      html += '<div class="ach-option ach-hidden"><div class="ach-info"><span class="ach-tier diamond">???</span> ❓ ???<br><small style="color:#aaa">Hidden achievement</small></div><span class="ach-status locked">Locked</span></div>';
      continue;
    }
    var claimedTier = state.achievementsClaimed[ach.id] || 0; var maxTier = ach.tiers.length; var progress = getAchProgress(ach); var status = "";
    if (claimedTier >= maxTier) { status = '<span class="ach-status claimed">✓ MAX</span>'; }
    else { var next = ach.tiers[claimedTier]; status = '<span class="ach-status ready">' + next.desc + ' 💎' + next.reward + '</span>'; }
    html += '<div class="ach-option"><div class="ach-info"><span class="ach-tier ' + ach.tier + '">' + ach.tier.toUpperCase() + '</span> ' + ach.icon + ' ' + ach.name + '<br><small style="color:#aaa">Tier ' + (claimedTier + 1) + '/' + maxTier + '</small><div class="ach-progress-bar"><div class="ach-progress-fill" style="width:' + (progress * 100) + '%"></div></div></div>' + status + '</div>';
  }
  list.innerHTML = html;
}

// =============================================
//  DAILY CHALLENGES
// =============================================
function getDailyChallengeById(id) { for (var i = 0; i < DAILY_CHALLENGE_POOL.length; i++) { if (DAILY_CHALLENGE_POOL[i].id === id) return DAILY_CHALLENGE_POOL[i]; } return null; }
function checkDailyReset() {
  var today = getTodayString(); if (state.dailyChallengeDate === today) return;
  state.dailyChallengeDate = today; state.dailyChallengeIds = []; state.dailyProgress = { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 };
  for (var i = 0; i < DAILY_CHALLENGE_POOL.length; i++) { DAILY_CHALLENGE_POOL[i]._claimed = false; }
  var pool = DAILY_CHALLENGE_POOL.slice();
  for (var i = 0; i < 3 && pool.length > 0; i++) { var idx = Math.floor(Math.random() * pool.length); state.dailyChallengeIds.push(pool[idx].id); pool.splice(idx, 1); }
  refreshDailyUI();
}
function refreshDailyUI() {
  var list = document.getElementById('daily-content'); if (!list) return;
  var html = "";
  for (var i = 0; i < state.dailyChallengeIds.length; i++) { var ch = getDailyChallengeById(state.dailyChallengeIds[i]); if (!ch) continue; var prog = ch.getProgress(); var done = prog >= 1; html += '<div class="daily-challenge' + (done ? ' completed' : '') + '"><span>' + ch.desc + ' 💎' + ch.reward + '</span><span>' + (done ? '✅' : '⬜') + '</span></div>'; if (done && !ch._claimed) { ch._claimed = true; state.gems += ch.reward; state.totalGemsEarned += ch.reward; showToast("📋 Daily challenge complete! +" + ch.reward + "💎"); } }
  list.innerHTML = html;
}
function updateDailyProgress(type, amount) { if (state.dailyProgress[type] === undefined) return; state.dailyProgress[type] += amount; refreshDailyUI(); }

// =============================================
//  LIFETIME STATS
// =============================================
function refreshStatsUI() {
  var el = document.getElementById('stats-content'); if (!el) return;
  var ls = state.lifetimeStats; var pt = ls.totalPlayTime || 0; var h = Math.floor(pt / 3600), m = Math.floor((pt % 3600) / 60);
  var fp = ls.fastestPrestige || 0; var fh = Math.floor(fp / 3600), fm = Math.floor((fp % 3600) / 60), fs = Math.floor(fp % 60);
  var saveAgo = 'N/A'; if (state.lastSaveTime) { var diff = Date.now() - state.lastSaveTime; if (diff < 60000) saveAgo = 'just now'; else if (diff < 3600000) saveAgo = Math.floor(diff / 60000) + 'm ago'; else saveAgo = Math.floor(diff / 3600000) + 'h ago'; }
  el.innerHTML = '<div class="stat-row"><span>Total Food</span><span class="stat-val">' + formatNum(ls.totalFood || 0) + '</span></div>' +
    '<div class="stat-row"><span>Ants Hatched</span><span class="stat-val">' + formatNum(ls.totalHatched || 0) + '</span></div>' +
    '<div class="stat-row"><span>Spiders Killed</span><span class="stat-val">' + formatNum(ls.totalKills || 0) + '</span></div>' +
    '<div class="stat-row"><span>Bosses Defeated</span><span class="stat-val">' + formatNum(ls.totalBossKills || 0) + '</span></div>' +
    '<div class="stat-row"><span>Prestiges</span><span class="stat-val">' + formatNum(state.prestigeCount) + '</span></div>' +
    '<div class="stat-row"><span>Ascensions</span><span class="stat-val">' + formatNum(state.ascensionCount) + '</span></div>' +
    '<div class="stat-row"><span>Play Time</span><span class="stat-val">' + h + 'h ' + m + 'm</span></div>' +
    '<div class="stat-row"><span>Gems Earned</span><span class="stat-val">' + formatNum(ls.totalGems || 0) + '</span></div>' +
    '<div class="stat-row"><span>Rally Uses</span><span class="stat-val">' + formatNum(ls.totalRallies || 0) + '</span></div>' +
    '<div class="stat-row"><span>Surges Collected</span><span class="stat-val">' + formatNum(ls.totalSurges || 0) + '</span></div>' +
    '<div class="stat-row"><span>Nights Survived</span><span class="stat-val">' + formatNum(ls.totalNights || 0) + '</span></div>' +
    '<div class="stat-row"><span>Fastest Prestige</span><span class="stat-val">' + (fp > 0 ? fh + 'h ' + fm + 'm ' + fs + 's' : 'N/A') + '</span></div>' +
    '<div class="stat-row"><span>Last Save</span><span class="stat-val">' + saveAgo + '</span></div>';
}
function formatNum(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return Math.floor(n).toString(); }

// =============================================
//  PRESTIGE ROADMAP
// =============================================
function refreshRoadmapUI() {
  var el = document.getElementById('roadmap-content'); if (!el) return;
  var html = "";
  for (var i = 0; i < PRESTIGE_MILESTONES.length; i++) { var m = PRESTIGE_MILESTONES[i]; var unlocked = state.prestigeCount >= m.prestige; html += '<div class="roadmap-milestone' + (unlocked ? ' unlocked' : '') + '"><span>' + m.icon + ' Prestige ' + m.prestige + ': ' + m.desc + '</span><span>' + (unlocked ? '✅' : '🔒') + '</span></div>'; }
  el.innerHTML = html;
}

// =============================================
//  OFFLINE PROGRESS
// =============================================
function calculateOfflineProgress() {
  var now = Date.now(); var elapsed = (now - state.lastSaveTime) / 1000; if (elapsed < 30 || state.lastSaveTime === 0) return null;
  var cappedTime = Math.min(elapsed, 28800); var eff = BAL.offlineEfficiency;
  var foodEarned = Math.floor(state.workerCount * getEffectiveFoodPerTrip() * (cappedTime / (state.eggLayTime * 2)) * eff);
  var eggsLaid = Math.floor(cappedTime / state.eggLayTime * eff); var gemsEarned = Math.floor(cappedTime / 1800 * eff);
  foodEarned = Math.min(foodEarned, state.foodCap * 3); eggsLaid = Math.min(eggsLaid, 30); gemsEarned = Math.min(gemsEarned, 5);
  return { time: cappedTime, food: foodEarned, eggs: eggsLaid, gems: gemsEarned };
}
function showOfflineModal(data) {
  closeAllModals(); if (!data || data.time < 30) { checkDailyLogin(); return; }
  var modal = document.getElementById('offline-modal'); if (!modal) return;
  var mins = Math.floor(data.time / 60), hrs = Math.floor(mins / 60), timeStr = hrs > 0 ? hrs + "h " + (mins % 60) + "m" : mins + "m";
  var elTime = document.getElementById('offline-time'); if (elTime) elTime.textContent = "⏰ You were away for " + timeStr;
  var elFood = document.getElementById('offline-food'); if (elFood) elFood.textContent = "🌾 +" + data.food + " food";
  var elEggs = document.getElementById('offline-eggs'); if (elEggs) elEggs.textContent = "🥚 +" + data.eggs + " eggs";
  var elGems = document.getElementById('offline-gems'); if (elGems) elGems.textContent = "💎 +" + data.gems + " gems";
  modal.style.display = "flex";
  var claimBtn = document.getElementById('offline-claim');
  if (claimBtn) claimBtn.onclick = function() {
    for (var i = 0; i < data.eggs; i++) { state.eggs++; var m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 })); m.position.copy(qMesh.position); m.position.x += (Math.random() - 0.5) * 1.6; m.position.z += (Math.random() - 0.5) * 1.4; m.scale.setScalar(0.3); scene.add(m); eggMs.push({ mesh: m, mat: m.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: m.position.x, restZ: m.position.z, settling: false, settleT: 0 }); }
    addFood(data.food); addGems(data.gems); state.earlyGameBoost = Math.max(0, state.earlyGameBoost - data.time); state.bossTimer = Math.max(10, state.bossTimer - data.time);
    modal.style.display = "none"; showToast("✅ Offline rewards collected!"); refreshHUD(); checkAchievements(); checkDailyLogin();
  };
}

// =============================================
//  DAILY LOGIN
// =============================================
function getTodayString() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function checkDailyLogin() {
  closeAllModals(); var today = getTodayString(); if (state.lastLoginDay === today) { updateStreakDisplay(); return; }
  var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); var yesterdayStr = yesterday.getFullYear() + "-" + (yesterday.getMonth() + 1) + "-" + yesterday.getDate();
  if (state.lastLoginDay === yesterdayStr) { state.dailyStreak++; if (state.dailyStreak > 7) state.dailyStreak = 1; } else { state.dailyStreak = 1; }
  state.lastLoginDay = today; var dayIndex = (state.dailyStreak - 1) % 7; var reward = DAILY_REWARDS[dayIndex]; var gemsEarned = reward.gems; var hasSpecial = reward.special || false;
  state.gems += gemsEarned; state.totalGemsEarned += gemsEarned;
  var modal = document.getElementById('daily-modal'); if (!modal) return;
  var streakIcons = ""; for (var i = 0; i < state.dailyStreak; i++) streakIcons += "🔥";
  var streakEl = document.getElementById('daily-streak-icon'); if (streakEl) streakEl.textContent = streakIcons;
  var rewardEl = document.getElementById('daily-reward-text'); if (rewardEl) rewardEl.textContent = "Day " + state.dailyStreak + " — 💎 +" + gemsEarned + " gems";
  var specialEl = document.getElementById('daily-special-text'); if (specialEl) { if (hasSpecial) { specialEl.textContent = "🎁 SPECIAL: Free Golden Ant Egg!"; specialEl.style.display = "block"; } else { specialEl.style.display = "none"; } }
  modal.style.display = "flex"; modal.dataset.special = hasSpecial ? "true" : "false";
  AudioManager.sfx.dailyStreak();
  var claimBtn = document.getElementById('daily-claim');
  if (claimBtn) claimBtn.onclick = function() { if (modal.dataset.special === "true") { state.workerCount++; var gw = createWorker(true, null, true); if (gw) workers.push(gw); if (state.rallyActive) gw.speed *= BAL.rallySpeedMultiplier; showToast("🥇 Golden worker from daily streak!"); refreshHUD(); } modal.style.display = "none"; showToast("🔥 Day " + state.dailyStreak + " streak! +" + gemsEarned + " 💎"); refreshHUD(); updateStreakDisplay(); };
}
function updateStreakDisplay() { var el = document.getElementById('streak-display'); if (el) el.textContent = "🔥" + state.dailyStreak; }

// =============================================
//  PRESTIGE MODAL
// =============================================
function showPrestigeModal() {
  closeAllModals(); if (state.level < BAL.prestigeLevelReq) { showToast("Reach Level " + BAL.prestigeLevelReq + " to prestige!"); return; }
  if (!state.prestigeGoalSelected) { showPrestigeGoalSelection(); return; }
  var ppGain = Math.floor((state.level - BAL.prestigeLevelReq + 1) * BAL.prestigePPPerLevel) + BAL.prestigeBasePP;
  var goalCompleted = false;
  if (state.prestigeGoal) { for (var i = 0; i < PRESTIGE_GOALS.length; i++) { if (PRESTIGE_GOALS[i].id === state.prestigeGoal && PRESTIGE_GOALS[i].check()) { goalCompleted = true; ppGain += PRESTIGE_GOALS[i].bonusPP; break; } } }
  var modal = document.getElementById('prestige-modal'); if (!modal) return;
  var infoEl = document.getElementById('prestige-info-text'); if (infoEl) infoEl.textContent = "Reset colony to Level 1 with bonuses.";
  var rewardEl = document.getElementById('prestige-reward-text'); if (rewardEl) { var text = "✨ You will gain " + ppGain + " Prestige Points!"; if (goalCompleted) text += " (Goal bonus included!)"; rewardEl.textContent = text; }
  modal.style.display = "flex";
  var confirmBtn = document.getElementById('prestige-confirm'); if (confirmBtn) confirmBtn.onclick = function() { performPrestige(ppGain); modal.style.display = "none"; };
  var cancelBtn = document.getElementById('prestige-cancel'); if (cancelBtn) cancelBtn.onclick = function() { modal.style.display = "none"; };
}
function performPrestige(ppGain) {
  resetWeatherAndBoosts(); var pt = state.lifetimeStats.totalPlayTime + (performance.now() - state.lastTime) / 1000;
  if (state.prestigeStartTime > 0) { var thisPrestigeTime = pt - state.prestigeStartTime; if (!state.lifetimeStats.fastestPrestige || thisPrestigeTime < state.lifetimeStats.fastestPrestige) state.lifetimeStats.fastestPrestige = thisPrestigeTime; }
  state.prestigeCount++; state.prestigePoints += ppGain; state.lifetimeStats.totalPrestiges++; state.level = 1; state.xp = 0; state.xpToNext = Math.floor(40 * Math.pow(1.15, 0));
  state.food = BAL.baseFoodCap; state.eggs = 0; state.workerCount = 4; state.soldierCount = 0; state.scoutCount = 0;
  AudioManager.sfx.prestige(); triggerShake(8, 0.8);
  state.chambers = { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 }, soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 }, royal: { count: 0 } };
  state.upgrades = { soldierDamage: 0, workerSpeed: 0, eggLayTime: 0, foodCap: 0 }; state.expansionTrips = 0; state.unlockedZones = 0; state.virtualWorkers = 0; state.earlyGameBoost = BAL.earlyGameBoostDuration;
  while (workers.length > 0) { var w = workers.pop(); if (w && w.mesh) { disposeMesh(w.mesh); scene.remove(w.mesh); } }
  while (soldiers.length > 0) { var s = soldiers.pop(); if (s && s.mesh) { disposeMesh(s.mesh); scene.remove(s.mesh); } if (s && s.guardMesh) { disposeMesh(s.guardMesh); scene.remove(s.guardMesh); } }
  while (scouts.length > 0) { var sc = scouts.pop(); if (sc && sc.mesh) { disposeMesh(sc.mesh); scene.remove(sc.mesh); } }
  while (enemies.length > 0) { var e = enemies.pop(); if (e && e.mesh) { disposeMesh(e.mesh); scene.remove(e.mesh); } }
  while (eggMs.length > 0) { var em = eggMs.pop(); if (em && em.mesh) { disposeMesh(em.mesh); scene.remove(em.mesh); } }
  while (storageChambers.length > 0) { var ch = storageChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (nurseryChambers.length > 0) { var ch = nurseryChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (soldierChambers.length > 0) { var ch = soldierChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (researchChambers.length > 0) { var ch = researchChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (scoutChambers.length > 0) { var ch = scoutChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (storagePiles.length > 0) { var sp = storagePiles.pop(); if (sp) { disposeMesh(sp); scene.remove(sp); } }
  while (nurseryEggClusters.length > 0) { var nc = nurseryEggClusters.pop(); if (nc) { disposeMesh(nc); scene.remove(nc); } }
  barracksSoldiers = []; if (researchChamberGroup) { disposeMesh(researchChamberGroup); scene.remove(researchChamberGroup); researchChamberGroup = null; }
  if (state.currentBoss) { disposeMesh(state.currentBoss.mesh); scene.remove(state.currentBoss.mesh); state.currentBoss = null; }
  state.bossActive = false; var bossName = document.getElementById('boss-name'); if (bossName) bossName.style.display = 'none'; var bossBar = document.getElementById('boss-health-bar'); if (bossBar) bossBar.style.display = 'none';
  for (var i = 0; i < PRESTIGE_MILESTONES.length; i++) { var m = PRESTIGE_MILESTONES[i]; if (state.prestigeCount >= m.prestige) m.effect(); }
  rebuildAllChambers();
  if (state.ascensionUpgrades.elderWisdom > 0 && state.chambers.research.count === 0) { state.chambers.research.count = 1; var chX = getNextResearchX(); researchChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a3a5a) }); makeLabel("🔬 Research", chX, CCY + 1.4, CZ, 256, 64, true); researchChamberGroup = new THREE.Group(); researchChamberGroup.position.set(chX, CCY + 1.8, CZ); var orbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 }); for (var i = 0; i < 5; i++) { var orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), orbMat); var angle = (i / 5) * Math.PI * 2; orb.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6); researchChamberGroup.add(orb); } scene.add(researchChamberGroup); }
  for (var wi = 0; wi < state.workerCount; wi++) { var nw = createWorker(false); if (nw) workers.push(nw); }
  buildQueenChamberWalls(); recalculateHatchTime(); updateEggLayTime(); recalculateFoodCap();
  state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  state.prestigeStartTime = state.lifetimeStats.totalPlayTime; state.prestigeGoal = null; state.prestigeGoalSelected = false; state.buildQueue = [];
  emitParticles(_v3.set(TX, GTY + 1.5, TCZ), 40, 0xff44ff, 0.1, 2.0, 1.0);
  showToast("✨ Prestige complete! Gained " + ppGain + " PP"); refreshHUD(); checkAchievements(); saveGame();
}

// =============================================
//  ASCENSION MODAL
// =============================================
function showAscendModal() {
  if (state.prestigeCount < BAL.ascendUnlockPrestige) { showToast("Reach Prestige " + BAL.ascendUnlockPrestige + " to unlock Ascension!"); return; }
  if (state.bossActive) { showToast("Defeat the boss first!"); return; }
  closeAllModals(); var apGain = 1; var modal = document.getElementById('ascend-modal'); if (!modal) return;
  var infoEl = document.getElementById('ascend-info-text'); if (infoEl) infoEl.textContent = "Reset ALL progress to gain 1 Ascension Point.";
  var rewardEl = document.getElementById('ascend-reward-text'); if (rewardEl) rewardEl.textContent = "⬆️ You will gain " + apGain + " AP and permanent multipliers!";
  modal.style.display = "flex";
  var confirmBtn = document.getElementById('ascend-confirm'); if (confirmBtn) confirmBtn.onclick = function() { performAscension(apGain); modal.style.display = "none"; };
  var cancelBtn = document.getElementById('ascend-cancel'); if (cancelBtn) cancelBtn.onclick = function() { modal.style.display = "none"; };
}
function performAscension(apGain) {
  resetWeatherAndBoosts(); var ascCount = state.ascensionCount + apGain; var ascPoints = state.ascensionPoints + apGain; var ascUpgrades = JSON.parse(JSON.stringify(state.ascensionUpgrades));
  state.colonyName = "Colony " + (currentSlot + 1); state.food = BAL.baseFoodCap; state.gems = 0; state.foodCap = BAL.baseFoodCap;
  state.level = 1; state.xp = 0; state.xpToNext = Math.floor(40 * Math.pow(1.15, 0)); state.eggs = 0; state.workerCount = 4; state.soldierCount = 0; state.scoutCount = 0;
  state.chambers = { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 }, soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 }, royal: { count: 0 } };
  state.upgrades = { soldierDamage: 0, workerSpeed: 0, eggLayTime: 0, foodCap: 0 }; state.gemUpgrades = state.gemUpgrades || {};
  state.expansionTrips = 0; state.unlockedZones = 0; state.rallyActive = false; state.rallyTimer = 0; state.rallyCooldown = 0;
  state.waveActive = false; state.waveTimer = 35; state.surgeActive = false; state.surgeTimer = 60 + Math.random() * 30;
  state.eventActive = false; state.eventTimer = 35 + Math.random() * 25; state.weatherActive = false; state.weatherTimer = 70 + Math.random() * 40;
  state.isNight = false; state.rareAntCount = 0; state.nestEvolutionLevel = 0; state.totalHatched = 0; state.totalKills = 0; state.totalGemsEarned = 0;
  state.achievementsClaimed = state.achievementsClaimed || {}; state.dailyStreak = state.dailyStreak || 0; state.lastLoginDay = state.lastLoginDay || ""; state.earlyGameBoost = BAL.earlyGameBoostDuration;
  state.survivedNight = 0; state.rallyUses = 0; state.surgesCollected = 0; state.virtualWorkers = 0; state.evolution = { worker: 0, soldier: 0, scout: 0 };
  state.bossActive = false; state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  state.bossKills = 0; state.bossType = null; state.currentBoss = null; state.prestigeCount = 0; state.prestigePoints = 0;
  state.prestigeUpgrades = { ppFood: 0, ppSpeed: 0, ppHatch: 0, ppCap: 0, ppGem: 0, ppBoss: 0 }; state.prestigeFoodBonus = 0;
  state.currentZone = "forest"; state.unlockedZonesList = ["forest"]; state.speedBoostTimer = 0; state.luckyHourTimer = 0; state.defenseBannerTimer = 0;
  state.beetleKills = 0; state.waspKills = 0; state.tutorialsShown = {}; state.queenClicks = 0; state.prestigeStartTime = 0; state.prestigeStartLevel = 0;
  state.dailyChallengeDate = ""; state.dailyChallengeIds = []; state.dailyProgress = { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 };
  state.lifetimeStats = { totalFood: 0, totalHatched: 0, totalKills: 0, totalBossKills: 0, totalPrestiges: 0, totalPlayTime: 0, totalGems: 0, totalRallies: 0, totalSurges: 0, totalNights: 0, fastestPrestige: 0 };
  state.ascensionCount = ascCount; state.ascensionPoints = ascPoints; state.ascensionUpgrades = ascUpgrades; state.hasAscended = true;
  state.caveBossKills = 0; state.swampBossKills = 0; state.mountainBossKills = 0; state.buildQueue = []; state.prestigeGoal = null; state.prestigeGoalSelected = false;
  state.eventChoices = []; state.eventChoiceActive = false; state.researchBonuses = { foodPerTrip: 0, soldierHealth: 0, soldierDamage: 0, discoveryChance: 0, zoneTripReduction: 0, eggLayReduction: 0, scoutSpeed: 0, poisonResist: false, queensWrathUnlocked: false, pheromoneShieldUnlocked: false };
  state.completedResearch = []; state.queensWrathActive = false; state.queensWrathTimer = 0; state.queenProtected = false; state._royalGroups = [];
  clearAllMeshes(); buildQueenChamberWalls(); rebuildAllChambers();
  for (var wi = 0; wi < state.workerCount; wi++) { var nw = createWorker(false); if (nw) workers.push(nw); }
  recalculateHatchTime(); updateEggLayTime(); recalculateFoodCap();
  state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  AudioManager.sfx.ascend(); emitParticles(_v3.set(TX, GTY + 1.5, TCZ), 60, 0xffaa00, 0.12, 2.5, 1.2);
  showToast("⬆️ Ascension complete! +1 AP, permanent multipliers active!"); refreshHUD(); checkAchievements(); saveGame();
  var cfg = ZONE_CONFIG.forest; scene.background = new THREE.Color(cfg.bg); scene.fog = new THREE.Fog(cfg.fog, 20, 80);
  var zoneDisp = document.getElementById('zone-display'); if (zoneDisp) zoneDisp.textContent = cfg.label;
}
function clearAllMeshes() {
  while (workers.length > 0) { var w = workers.pop(); if (w && w.mesh) { disposeMesh(w.mesh); scene.remove(w.mesh); } }
  while (soldiers.length > 0) { var s = soldiers.pop(); if (s && s.mesh) { disposeMesh(s.mesh); scene.remove(s.mesh); } if (s && s.guardMesh) { disposeMesh(s.guardMesh); scene.remove(s.guardMesh); } }
  while (scouts.length > 0) { var sc = scouts.pop(); if (sc && sc.mesh) { disposeMesh(sc.mesh); scene.remove(sc.mesh); } }
  while (enemies.length > 0) { var e = enemies.pop(); if (e && e.mesh) { disposeMesh(e.mesh); scene.remove(e.mesh); } }
  while (eggMs.length > 0) { var em = eggMs.pop(); if (em && em.mesh) { disposeMesh(em.mesh); scene.remove(em.mesh); } }
  while (storageChambers.length > 0) { var ch = storageChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (nurseryChambers.length > 0) { var ch = nurseryChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (soldierChambers.length > 0) { var ch = soldierChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (researchChambers.length > 0) { var ch = researchChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (scoutChambers.length > 0) { var ch = scoutChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (storagePiles.length > 0) { var sp = storagePiles.pop(); if (sp) { disposeMesh(sp); scene.remove(sp); } }
  while (nurseryEggClusters.length > 0) { var nc = nurseryEggClusters.pop(); if (nc) { disposeMesh(nc); scene.remove(nc); } }
  if (researchChamberGroup) { disposeMesh(researchChamberGroup); scene.remove(researchChamberGroup); researchChamberGroup = null; }
  if (state.currentBoss) { disposeMesh(state.currentBoss.mesh); scene.remove(state.currentBoss.mesh); state.currentBoss = null; }
  var bossName = document.getElementById('boss-name'); if (bossName) bossName.style.display = 'none';
  var bossBar = document.getElementById('boss-health-bar'); if (bossBar) bossBar.style.display = 'none';
}

// =============================================
//  ASCENSION SHOP UI
// =============================================
function refreshAscensionShopUI() {
  var list = document.getElementById('ascension-shop-list'); if (!list) return;
  var html = "";
  for (var i = 0; i < ASCENSION_SHOP.length; i++) { var item = ASCENSION_SHOP[i]; var lv = state.ascensionUpgrades[item.id] || 0; var owned = lv >= item.maxLevel; html += '<div class="ascension-option"><span>' + item.icon + ' ' + item.name + '<br><small style="color:#aaa">' + item.desc + '</small></span>'; html += '<button ' + (owned ? 'disabled' : '') + ' onclick="window._buyAsc(\'' + item.id + '\')">' + (owned ? '✅ Owned' : item.cost + ' AP') + '</button></div>'; }
  list.innerHTML = html;
}
window._buyAsc = buyAscensionUpgrade;

// =============================================
//  PRESTIGE SHOP UI
// =============================================
function refreshPrestigeShopUI() {
  var list = document.getElementById('prestige-shop-list'); if (!list) return;
  var html = "";
  for (var i = 0; i < PRESTIGE_SHOP.length; i++) { var item = PRESTIGE_SHOP[i]; var lv = state.prestigeUpgrades[item.id] || 0; var owned = lv >= item.maxLevel; html += '<div class="prestige-option"><span>' + item.icon + ' ' + item.name + '<br><small style="color:#aaa">' + item.desc + '</small></span>'; html += '<button ' + (owned ? 'disabled' : '') + ' onclick="window._buyPP(\'' + item.id + '\')">' + (owned ? '✅ Owned' : item.cost + ' PP') + '</button></div>'; }
  list.innerHTML = html;
}
function buyPrestigeUpgrade(id) {
  var item = null; for (var i = 0; i < PRESTIGE_SHOP.length; i++) { if (PRESTIGE_SHOP[i].id === id) { item = PRESTIGE_SHOP[i]; break; } } if (!item) return;
  var lv = state.prestigeUpgrades[id] || 0; if (lv >= item.maxLevel) { showToast("Already max level!"); return; } if (state.prestigePoints < item.cost) { showToast("Need " + item.cost + " PP!"); return; }
  state.prestigePoints -= item.cost; state.prestigeUpgrades[id] = lv + 1; AudioManager.sfx.upgrade(); showToast(item.icon + " " + item.name + " upgraded!"); refreshPrestigeShopUI(); refreshHUD(); saveGame();
}
window._buyPP = buyPrestigeUpgrade;

// =============================================
//  EVOLUTION UI
// =============================================
function refreshEvolutionUI() {
  var list = document.getElementById('evo-list'); if (!list) return;
  var html = ""; var types = ["worker", "soldier", "scout"];
  for (var ti = 0; ti < types.length; ti++) { var type = types[ti]; var evo = EVOLUTION_TREE[type]; var ct = state.evolution[type] || 0; html += '<div style="color:#ff88cc;font-weight:700;margin-top:4px;">' + evo.name + ' (Tier ' + ct + '/' + evo.tiers.length + ')</div>';
    for (var i = 0; i < evo.tiers.length; i++) { var tier = evo.tiers[i]; var unlocked = i < ct; var available = i === ct; var locked = i > ct; if (available && tier.reqPrestige && state.prestigeCount < tier.reqPrestige) { available = false; locked = true; } html += '<div class="evo-option"><span>' + tier.icon + ' ' + tier.name + '<br><small style="color:#aaa">' + tier.desc + (tier.reqPrestige ? ' (Req. Prestige ' + tier.reqPrestige + ')' : '') + '</small></span>'; if (unlocked) html += '<span style="color:#4a4;">✓ Owned</span>'; else if (available) html += '<button onclick="window._buyEvo(\'' + type + '\')">' + tier.cost + ' 🌾</button>'; else html += '<span style="color:#888;">Locked</span>'; html += '</div>'; } }
  list.innerHTML = html;
}
window._buyEvo = buyEvolution;

// =============================================
//  UPGRADE UI
// =============================================
function refreshUpgradeUI() {
  function fmt(type) { var lv = state.upgrades[type], max = UPGRADES[type].maxLevel; var cost = lv < max ? getUpgradeCost(type) : 0; return "Lv" + lv + "/" + max + (lv < max ? " " + cost + "🌾" : " MAX"); }
  var elDmg = document.getElementById("upg-damage"); if (elDmg) elDmg.textContent = fmt("soldierDamage");
  var elSpd = document.getElementById("upg-speed"); if (elSpd) elSpd.textContent = fmt("workerSpeed");
  var elEgg = document.getElementById("upg-egg"); if (elEgg) elEgg.textContent = fmt("eggLayTime");
  var elCap = document.getElementById("upg-cap"); if (elCap) elCap.textContent = fmt("foodCap");
  var btnDmg = document.getElementById("btn-upg-damage"); if (btnDmg) btnDmg.disabled = state.upgrades.soldierDamage >= UPGRADES.soldierDamage.maxLevel;
  var btnSpd = document.getElementById("btn-upg-speed"); if (btnSpd) btnSpd.disabled = state.upgrades.workerSpeed >= UPGRADES.workerSpeed.maxLevel;
  var btnEgg = document.getElementById("btn-upg-egg"); if (btnEgg) btnEgg.disabled = state.upgrades.eggLayTime >= UPGRADES.eggLayTime.maxLevel;
  var btnCap = document.getElementById("btn-upg-cap"); if (btnCap) btnCap.disabled = state.upgrades.foodCap >= UPGRADES.foodCap.maxLevel;
}

// =============================================
//  BUILD BUTTONS
// =============================================
function updateBuildButtons() {
  var bfs = document.getElementById("build-food-storage"), bn = document.getElementById("build-nursery"), bs = document.getElementById("build-soldier"), br = document.getElementById("build-research"), bsc = document.getElementById("build-scout"), broyal = document.getElementById("build-royal");
  if (bfs) bfs.disabled = state.chambers.foodStorage.count >= BAL.maxStorage;
  if (bn) bn.disabled = state.chambers.nursery.count >= BAL.maxNursery;
  if (bs) bs.disabled = state.chambers.soldier.count >= BAL.maxSoldierChambers;
  if (br) br.disabled = state.chambers.research.count >= 1;
  if (bsc) bsc.disabled = state.chambers.scout.count >= BAL.maxScoutChambers;
  if (broyal) broyal.disabled = (state.chambers.royal && state.chambers.royal.count >= 1);
  updateBuildButtonLabels();
}
function updateBuildButtonLabels() {
  var bfs = document.getElementById("build-food-storage"), bn = document.getElementById("build-nursery"), bs = document.getElementById("build-soldier"), br = document.getElementById("build-research"), bsc = document.getElementById("build-scout"), broyal = document.getElementById("build-royal");
  if (bfs && !bfs.disabled) bfs.textContent = getStorageCost() + "🌾";
  if (bn && !bn.disabled) bn.textContent = getEffectiveChamberCost(BAL.nurseryCost) + "🌾";
  if (bs && !bs.disabled) bs.textContent = getEffectiveChamberCost(BAL.soldierChamberCost) + "🌾";
  if (br && !br.disabled) br.textContent = getEffectiveChamberCost(BAL.researchChamberCost) + "🌾";
  if (bsc && !bsc.disabled) bsc.textContent = getEffectiveChamberCost(BAL.scoutChamberCost) + "🌾";
  if (broyal && !broyal.disabled) broyal.textContent = "300🌾";
}

// =============================================
//  SHOP CATEGORY TABS
// =============================================
function setupShopTabs() {
  var tabPermanent = document.getElementById("shop-tab-permanent"), tabConsumable = document.getElementById("shop-tab-consumable"), tabSkins = document.getElementById("shop-tab-skins");
  var listPermanent = document.getElementById("shop-list-permanent"), listConsumable = document.getElementById("shop-list-consumable"), listSkins = document.getElementById("shop-list-skins");
  if (!tabPermanent || !listPermanent) return;
  function showTab(tabId) { listPermanent.style.display = (tabId === 'permanent') ? 'block' : 'none'; listConsumable.style.display = (tabId === 'consumable') ? 'block' : 'none'; listSkins.style.display = (tabId === 'skins') ? 'block' : 'none'; tabPermanent.className = (tabId === 'permanent') ? 'active' : ''; tabConsumable.className = (tabId === 'consumable') ? 'active' : ''; tabSkins.className = (tabId === 'skins') ? 'active' : ''; }
  tabPermanent.onclick = function() { showTab('permanent'); }; tabConsumable.onclick = function() { showTab('consumable'); }; tabSkins.onclick = function() { showTab('skins'); }; showTab('permanent');
}

// =============================================
//  BUTTON SETUP
// =============================================
function setupButtons() {
  buildPanel = document.getElementById("build-panel"); upgradePanel = document.getElementById("upgrade-panel"); shopPanel = document.getElementById("shop-panel");
  achPanel = document.getElementById("achievements-panel"); evoPanel = document.getElementById("evolution-panel"); ppPanel = document.getElementById("prestige-shop-panel");
  ascPanel = document.getElementById("ascension-shop-panel"); researchPanel = document.getElementById("research-panel");

  function closeAllPanels() { [buildPanel, upgradePanel, shopPanel, achPanel, evoPanel, ppPanel, ascPanel, researchPanel].forEach(function(p) { if (p) p.classList.remove("open"); }); }

  var btnBuild = document.getElementById("btn-build"); if (btnBuild) btnBuild.onclick = function() { AudioManager.sfx.buttonClick(); if (buildPanel.classList.contains("open")) { buildPanel.classList.remove("open"); } else { closeAllPanels(); buildPanel.classList.add("open"); updateBuildButtonLabels(); refreshBuildQueueUI(); } };
  var btnUpgrades = document.getElementById("btn-upgrades"); if (btnUpgrades) btnUpgrades.onclick = function() { AudioManager.sfx.buttonClick(); if (upgradePanel.classList.contains("open")) { upgradePanel.classList.remove("open"); } else { closeAllPanels(); upgradePanel.classList.add("open"); refreshUpgradeUI(); } };
  var btnShop = document.getElementById("btn-shop"); if (btnShop) btnShop.onclick = function() { AudioManager.sfx.buttonClick(); if (shopPanel.classList.contains("open")) { shopPanel.classList.remove("open"); } else { closeAllPanels(); shopPanel.classList.add("open"); setupShopTabs(); } };
  var btnEvo = document.getElementById("btn-evolution"); if (btnEvo) btnEvo.onclick = function() { AudioManager.sfx.buttonClick(); if (evoPanel.classList.contains("open")) { evoPanel.classList.remove("open"); } else { closeAllPanels(); evoPanel.classList.add("open"); refreshEvolutionUI(); } };
  var btnAch = document.getElementById("btn-achievements"); if (btnAch) btnAch.onclick = function() { AudioManager.sfx.buttonClick(); if (achPanel.classList.contains("open")) { achPanel.classList.remove("open"); } else { closeAllPanels(); achPanel.classList.add("open"); refreshAchievementsUI(); } };
  var btnResearch = document.getElementById("btn-research"); if (btnResearch) btnResearch.onclick = function() { AudioManager.sfx.buttonClick(); if (researchPanel && researchPanel.classList.contains("open")) { researchPanel.classList.remove("open"); } else { closeAllPanels(); if (researchPanel) researchPanel.classList.add("open"); if (typeof refreshResearchUI === 'function') refreshResearchUI(); } };
  var btnPP = document.getElementById("btn-prestige-shop"); if (btnPP) btnPP.onclick = function() { AudioManager.sfx.buttonClick(); if (ppPanel.classList.contains("open")) { ppPanel.classList.remove("open"); } else { closeAllPanels(); ppPanel.classList.add("open"); refreshPrestigeShopUI(); } };
  var btnAsc = document.getElementById("btn-ascension-shop"); if (btnAsc) btnAsc.onclick = function() { AudioManager.sfx.buttonClick(); if (ascPanel.classList.contains("open")) { ascPanel.classList.remove("open"); } else { closeAllPanels(); ascPanel.classList.add("open"); refreshAscensionShopUI(); } };
  var btnDaily = document.getElementById("btn-daily"); if (btnDaily) btnDaily.onclick = function() { AudioManager.sfx.buttonClick(); var dp = document.getElementById('daily-panel'); dp.style.display = dp.style.display === 'flex' ? 'none' : 'flex'; refreshDailyUI(); };

  var btnSurface = document.getElementById("btn-surface"); if (btnSurface) btnSurface.onclick = function() { flyToPreset("surface"); };
  var btnTunnel = document.getElementById("btn-tunnel"); if (btnTunnel) btnTunnel.onclick = function() { flyToPreset("tunnel"); };
  var btnOrbit = document.getElementById("btn-orbit"); if (btnOrbit) btnOrbit.onclick = function() { flyToPreset("orbit"); };

  var zonePill = document.getElementById("zone-pill"); if (zonePill) zonePill.onclick = function() { AudioManager.sfx.buttonClick(); var zones = state.unlockedZonesList; if (zones.length <= 1) { showToast("Explore more to unlock new zones!"); return; } var idx = zones.indexOf(state.currentZone); var nextIdx = (idx + 1) % zones.length; switchZone(zones[nextIdx]); };
  var btnMenu = document.getElementById("btn-menu-ingame"); if (btnMenu) btnMenu.onclick = function() { AudioManager.sfx.buttonClick(); showMainMenu(); };

  var bfs = document.getElementById("build-food-storage"); if (bfs) bfs.onclick = function() { enqueueBuild("foodStorage"); };
  var bn = document.getElementById("build-nursery"); if (bn) bn.onclick = function() { enqueueBuild("nursery"); };
  var bs = document.getElementById("build-soldier"); if (bs) bs.onclick = function() { enqueueBuild("soldier"); };
  var br = document.getElementById("build-research"); if (br) br.onclick = function() { enqueueBuild("research"); };
  var bsc = document.getElementById("build-scout"); if (bsc) bsc.onclick = function() { enqueueBuild("scout"); };
  var broyal = document.getElementById("build-royal"); if (broyal) broyal.onclick = function() { enqueueBuild("royal"); };

  var btnUpgDmg = document.getElementById("btn-upg-damage"); if (btnUpgDmg) btnUpgDmg.onclick = function() { buyUpgrade("soldierDamage"); };
  var btnUpgSpd = document.getElementById("btn-upg-speed"); if (btnUpgSpd) btnUpgSpd.onclick = function() { buyUpgrade("workerSpeed"); };
  var btnUpgEgg = document.getElementById("btn-upg-egg"); if (btnUpgEgg) btnUpgEgg.onclick = function() { buyUpgrade("eggLayTime"); };
  var btnUpgCap = document.getElementById("btn-upg-cap"); if (btnUpgCap) btnUpgCap.onclick = function() { buyUpgrade("foodCap"); };

  var allShopIds = Object.keys(GEM_ITEMS);
  for (var i = 0; i < allShopIds.length; i++) { var id = allShopIds[i]; var btn = document.getElementById("btn-shop-" + id); if (btn) { btn.onclick = (function(itemId) { return function() { buyGemItem(itemId); }; })(id); } }

  updateBuildButtons();
  var btnEvo2 = document.getElementById("btn-evolution"); if (btnEvo2) btnEvo2.style.display = (state.level >= BAL.evolutionUnlockLevel) ? "inline-block" : "none";
  var btnPP2 = document.getElementById("btn-prestige-shop"); if (btnPP2) btnPP2.style.display = (state.prestigeCount > 0) ? "inline-block" : "none";
  var btnAsc2 = document.getElementById("btn-ascension-shop"); if (btnAsc2) btnAsc2.style.display = (state.prestigeCount >= BAL.ascendUnlockPrestige || state.ascensionCount > 0) ? "inline-block" : "none";
  var btnResearch2 = document.getElementById("btn-research"); if (btnResearch2) btnResearch2.style.display = (state.chambers.research.count > 0) ? "inline-block" : "none";
  var btnSurf = document.getElementById("btn-surface"); if (btnSurf) btnSurf.style.display = "inline-block";
  var btnTun = document.getElementById("btn-tunnel"); if (btnTun) btnTun.style.display = "inline-block";
  var btnOrb = document.getElementById("btn-orbit"); if (btnOrb) btnOrb.style.display = "inline-block";

  for (var i = 0; i < allShopIds.length; i++) { var id = allShopIds[i]; if (GEM_ITEMS[id].oneTime && state.gemUpgrades[id]) { var btn = document.getElementById("btn-shop-" + id); if (btn) { btn.disabled = true; btn.textContent = "Owned"; } } }
  refreshUpgradeUI(); refreshAscensionShopUI();
  }
