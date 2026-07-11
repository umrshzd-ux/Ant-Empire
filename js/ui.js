// ===== HUD, TOASTS, FLOATERS, MENUS, ACHIEVEMENTS, DAILY, STATS, PRESTIGE/ASCENSION UI =====

var elFood, elFoodCap, elGems, elLevel, elAnts, elEggs, elWaveTimer, elEventTimer, elBossTimer, elPrestige;
var toastEl, floatersEl;
var buildPanel, upgradePanel, shopPanel, achPanel, evoPanel, ppPanel, ascPanel;
var surgeBtn, eventBtn, summonBtn, rallyBtn, rallyOverlay;

function initDOMRefs() {
  elFood = document.getElementById("food-count");
  elFoodCap = document.getElementById("food-cap");
  elGems = document.getElementById("gem-count");
  elLevel = document.getElementById("level-count");
  elAnts = document.getElementById("ant-count");
  elEggs = document.getElementById("egg-count");
  elWaveTimer = document.getElementById("wave-timer");
  elEventTimer = document.getElementById("event-timer");
  elBossTimer = document.getElementById("boss-timer");
  elPrestige = document.getElementById("prestige-count");
  toastEl = document.getElementById("toast");
  floatersEl = document.getElementById("floaters");
  buildPanel = document.getElementById("build-panel");
  upgradePanel = document.getElementById("upgrade-panel");
  shopPanel = document.getElementById("shop-panel");
  achPanel = document.getElementById("achievements-panel");
  evoPanel = document.getElementById("evolution-panel");
  ppPanel = document.getElementById("prestige-shop-panel");
  ascPanel = document.getElementById("ascension-shop-panel");
  surgeBtn = document.getElementById("surge-btn");
  eventBtn = document.getElementById("event-btn");
  summonBtn = document.getElementById("summon-btn");
  rallyBtn = document.getElementById("btn-rally");
  rallyOverlay = rallyBtn ? rallyBtn.querySelector(".cooldown-overlay") : null;
}
initDOMRefs();

// Toasts
var toastQueue = [], toastActive = false;
function processToastQueue() {
  if (toastActive || toastQueue.length === 0) return;
  toastActive = true;
  var msg = toastQueue.shift();
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  toastEl.style.transition = "none";
  void toastEl.offsetWidth;
  toastEl.style.transition = "opacity 0.3s ease";
  setTimeout(function() {
    toastEl.style.opacity = "0";
    toastActive = false;
    setTimeout(processToastQueue, 300);
  }, 2200);
}
function showToast(msg) { toastQueue.push(msg); processToastQueue(); }

var achToastTimeout = null;
function showAchievementToast(achName, achIcon, tierDesc, reward) {
  var at = document.getElementById('achievement-toast');
  document.getElementById('ach-toast-icon').textContent = achIcon;
  document.getElementById('ach-toast-title').textContent = achName;
  document.getElementById('ach-toast-desc').textContent = tierDesc + " — 💎 +" + reward;
  at.style.opacity = "1";
  if (achToastTimeout) clearTimeout(achToastTimeout);
  achToastTimeout = setTimeout(function() { at.style.opacity = "0"; achToastTimeout = null; }, 3500);
}
function spawnFloater(text, sx, sy, color) {
  var f = document.createElement("div");
  f.className = "floater";
  f.textContent = text;
  f.style.left = sx + "px";
  f.style.top = sy + "px";
  if (color) f.style.color = color;
  floatersEl.appendChild(f);
  setTimeout(function() { f.remove(); }, 1150);
}

function refreshHUD() {
  elFood.textContent = Math.floor(state.food);
  elFoodCap.textContent = state.foodCap;
  elGems.textContent = Math.floor(state.gems);
  elLevel.textContent = state.level;
  elAnts.textContent = state.workerCount + state.soldierCount + state.scoutCount;
  elEggs.textContent = state.eggs;
  elPrestige.textContent = state.prestigePoints + " PP";
  document.getElementById('virtual-display').textContent = state.virtualWorkers;
  document.getElementById('ascend-points').textContent = state.ascensionPoints + " AP";
  var apill = document.getElementById('ascend-pill');
  if (state.prestigeCount >= BAL.ascendUnlockPrestige && !state.bossActive) {
    apill.style.display = 'flex';
  } else {
    apill.style.display = 'none';
  }
}

function updateWaveTimer() {
  if (state.waveActive) {
    elWaveTimer.textContent = "⚠️" + state.waveSpidersRemaining;
    elWaveTimer.parentElement.style.borderColor = "#aa3333";
  } else {
    var sec = Math.ceil(state.waveTimer);
    elWaveTimer.textContent = "Wave " + sec + "s";
    elWaveTimer.parentElement.style.borderColor = sec < 10 ? "#aa3333" : "";
  }
}
function updateEventTimer() {
  if (state.eventActive) {
    elEventTimer.textContent = "🎲Active";
    elEventTimer.parentElement.style.borderColor = "#4488ff";
  } else {
    var sec = Math.ceil(state.eventTimer);
    elEventTimer.textContent = "Event " + sec + "s";
    elEventTimer.parentElement.style.borderColor = sec < 10 ? "#4488ff" : "";
  }
}
function updateBossTimer() {
  if (state.bossActive) {
    elBossTimer.textContent = "💀Boss!";
    elBossTimer.parentElement.style.borderColor = "#cc0000";
  } else {
    var totalSec = Math.ceil(state.bossTimer);
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    var display = mins > 0 ? mins + "m " + (secs < 10 ? "0" : "") + secs + "s" : secs + "s";
    elBossTimer.textContent = "Boss " + display;
    elBossTimer.parentElement.style.borderColor = totalSec < 10 ? "#cc0000" : "";
  }
}

// Achievements
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
  var claimedTier = state.achievementsClaimed[ach.id] || 0;
  if (claimedTier >= ach.tiers.length) return 1;
  var currentReq = ach.tiers[claimedTier].req;
  var prevReq = claimedTier > 0 ? ach.tiers[claimedTier - 1].req : 0;
  if (currentReq === prevReq) return 0;
  var current = 0;
  switch (ach.id) {
    case "hatch": current = state.totalHatched; break;
    case "spider": current = state.totalKills; break;
    case "boss": current = state.bossKills; break;
    case "level": current = state.level; break;
    case "storage": current = state.foodCap; break;
    case "prestige": current = state.prestigeCount; break;
    case "builder": return ((state.chambers.foodStorage.count > 0 ? 1 : 0) + (state.chambers.nursery.count > 0 ? 1 : 0) + (state.chambers.soldier.count > 0 ? 1 : 0) + (state.chambers.research.count > 0 ? 1 : 0) + (state.chambers.scout.count > 0 ? 1 : 0)) / 5;
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
  var list = document.getElementById('ach-list');
  if (!list) return;
  var html = "";
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var ach = ACHIEVEMENTS[i];
    if (ach.hidden && !isAchRevealed(ach)) {
      html += '<div class="ach-option ach-hidden"><div class="ach-info"><span class="ach-tier diamond">???</span> ❓ ???<br><small style="color:#aaa">Hidden achievement</small></div><span class="ach-status locked">Locked</span></div>';
      continue;
    }
    var claimedTier = state.achievementsClaimed[ach.id] || 0;
    var maxTier = ach.tiers.length;
    var progress = getAchProgress(ach);
    var status = "";
    if (claimedTier >= maxTier) {
      status = '<span class="ach-status claimed">✓ MAX</span>';
    } else {
      var next = ach.tiers[claimedTier];
      status = '<span class="ach-status ready">' + next.desc + ' 💎' + next.reward + '</span>';
    }
    html += '<div class="ach-option"><div class="ach-info"><span class="ach-tier ' + ach.tier + '">' + ach.tier.toUpperCase() + '</span> ' + ach.icon + ' ' + ach.name + '<br><small style="color:#aaa">Tier ' + (claimedTier + 1) + '/' + maxTier + '</small><div class="ach-progress-bar"><div class="ach-progress-fill" style="width:' + (progress * 100) + '%"></div></div></div>' + status + '</div>';
  }
  list.innerHTML = html;
}

// Daily challenges
function getDailyChallengeById(id) {
  for (var i = 0; i < DAILY_CHALLENGE_POOL.length; i++) { if (DAILY_CHALLENGE_POOL[i].id === id) return DAILY_CHALLENGE_POOL[i]; }
  return null;
}
function checkDailyReset() {
  var today = getTodayString();
  if (state.dailyChallengeDate === today) return;
  state.dailyChallengeDate = today;
  state.dailyChallengeIds = [];
  state.dailyProgress = { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 };
  for (var i = 0; i < DAILY_CHALLENGE_POOL.length; i++) { DAILY_CHALLENGE_POOL[i]._claimed = false; }
  var pool = DAILY_CHALLENGE_POOL.slice();
  for (var i = 0; i < 3 && pool.length > 0; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    state.dailyChallengeIds.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  refreshDailyUI();
}
function refreshDailyUI() {
  var list = document.getElementById('daily-content');
  if (!list) return;
  var html = "";
  for (var i = 0; i < state.dailyChallengeIds.length; i++) {
    var ch = getDailyChallengeById(state.dailyChallengeIds[i]);
    if (!ch) continue;
    var prog = ch.getProgress();
    var done = prog >= 1;
    html += '<div class="daily-challenge' + (done ? ' completed' : '') + '"><span>' + ch.desc + ' 💎' + ch.reward + '</span><span>' + (done ? '✅' : '⬜') + '</span></div>';
    if (done && !ch._claimed) { ch._claimed = true; state.gems += ch.reward; state.totalGemsEarned += ch.reward; showToast("📋 Daily challenge complete! +" + ch.reward + "💎"); }
  }
  list.innerHTML = html;
}
function updateDailyProgress(type, amount) {
  if (state.dailyProgress[type] === undefined) return;
  state.dailyProgress[type] += amount;
  refreshDailyUI();
}

// Lifetime stats
function refreshStatsUI() {
  var el = document.getElementById('stats-content');
  if (!el) return;
  var ls = state.lifetimeStats;
  var pt = ls.totalPlayTime || 0; var h = Math.floor(pt / 3600), m = Math.floor((pt % 3600) / 60);
  var fp = ls.fastestPrestige || 0; var fh = Math.floor(fp / 3600), fm = Math.floor((fp % 3600) / 60), fs = Math.floor(fp % 60);
  var saveAgo = 'N/A';
  if (state.lastSaveTime) { var diff = Date.now() - state.lastSaveTime; if (diff < 60000) saveAgo = 'just now'; else if (diff < 3600000) saveAgo = Math.floor(diff / 60000) + 'm ago'; else saveAgo = Math.floor(diff / 3600000) + 'h ago'; }
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

// Prestige roadmap
function refreshRoadmapUI() {
  var el = document.getElementById('roadmap-content');
  if (!el) return;
  var html = "";
  for (var i = 0; i < PRESTIGE_MILESTONES.length; i++) {
    var m = PRESTIGE_MILESTONES[i];
    var unlocked = state.prestigeCount >= m.prestige;
    html += '<div class="roadmap-milestone' + (unlocked ? ' unlocked' : '') + '"><span>' + m.icon + ' Prestige ' + m.prestige + ': ' + m.desc + '</span><span>' + (unlocked ? '✅' : '🔒') + '</span></div>';
  }
  el.innerHTML = html;
}

// Offline progress
function calculateOfflineProgress() { /* unchanged */ }
function showOfflineModal(data) { /* unchanged */ }

// Daily login
function getTodayString() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function checkDailyLogin() { /* unchanged */ }
function updateStreakDisplay() { var el = document.getElementById('streak-display'); if (el) el.textContent = "🔥" + state.dailyStreak; }

// Prestige modal
function showPrestigeModal() { /* unchanged */ }
function performPrestige(ppGain) { /* unchanged */ }

// Ascension modal
function showAscendModal() { /* unchanged */ }
function performAscension(apGain) { /* unchanged */ }
function clearAllMeshes() { /* unchanged */ }
function buyAscensionUpgrade(id) { /* unchanged */ }
function refreshAscensionShopUI() { /* unchanged */ }
window._buyAsc = buyAscensionUpgrade;

// Prestige shop UI
function refreshPrestigeShopUI() { /* unchanged */ }
function buyPrestigeUpgrade(id) { /* unchanged */ }
window._buyPP = buyPrestigeUpgrade;

// Evolution UI
function refreshEvolutionUI() { /* unchanged */ }
window._buyEvo = buyEvolution;

// Upgrade UI
function refreshUpgradeUI() { /* unchanged */ }

// Build buttons
function updateBuildButtons() {
  var bfs = document.getElementById("build-food-storage"), bn = document.getElementById("build-nursery"),
      bs = document.getElementById("build-soldier"), br = document.getElementById("build-research"),
      bsc = document.getElementById("build-scout");
  if (bfs) bfs.disabled = state.chambers.foodStorage.count >= BAL.maxStorage;
  if (bn) bn.disabled = state.chambers.nursery.count >= BAL.maxNursery;
  if (bs) bs.disabled = state.chambers.soldier.count >= BAL.maxSoldierChambers;
  if (br) br.disabled = state.chambers.research.count >= 1;
  if (bsc) bsc.disabled = state.chambers.scout.count >= BAL.maxScoutChambers;
  updateBuildButtonLabels();
}
function updateBuildButtonLabels() {
  var bfs = document.getElementById("build-food-storage"), bn = document.getElementById("build-nursery"),
      bs = document.getElementById("build-soldier"), br = document.getElementById("build-research"),
      bsc = document.getElementById("build-scout");
  if (bfs && !bfs.disabled) bfs.textContent = getStorageCost() + "🌾";
  if (bn && !bn.disabled) bn.textContent = getEffectiveChamberCost(BAL.nurseryCost) + "🌾";
  if (bs && !bs.disabled) bs.textContent = getEffectiveChamberCost(BAL.soldierChamberCost) + "🌾";
  if (br && !br.disabled) br.textContent = getEffectiveChamberCost(BAL.researchChamberCost) + "🌾";
  if (bsc && !bsc.disabled) bsc.textContent = getEffectiveChamberCost(BAL.scoutChamberCost) + "🌾";
}
function buildFoodStorageChamber() { /* unchanged */ }
function buildNurseryChamber() { /* unchanged */ }
function buildSoldierChamber() { /* unchanged */ }
function buildResearchChamber() { /* unchanged */ }
function buildScoutChamber() { /* unchanged */ }

// Setup all buttons (with fallback for panel elements)
function setupButtons() {
  // safety re‑fetch of panels
  buildPanel = buildPanel || document.getElementById("build-panel");
  upgradePanel = upgradePanel || document.getElementById("upgrade-panel");
  shopPanel = shopPanel || document.getElementById("shop-panel");
  achPanel = achPanel || document.getElementById("achievements-panel");
  evoPanel = evoPanel || document.getElementById("evolution-panel");
  ppPanel = ppPanel || document.getElementById("prestige-shop-panel");
  ascPanel = ascPanel || document.getElementById("ascension-shop-panel");

  var btnBuild = document.getElementById("btn-build"), btnEvo = document.getElementById("btn-evolution"),
      btnUpgrades = document.getElementById("btn-upgrades"), btnShop = document.getElementById("btn-shop"),
      btnAch = document.getElementById("btn-achievements"), btnPP = document.getElementById("btn-prestige-shop"),
      btnAscShop = document.getElementById("btn-ascension-shop"), btnDaily = document.getElementById("btn-daily");
  var closeAll = function() {
    if (buildPanel) buildPanel.classList.remove("open");
    if (evoPanel) evoPanel.classList.remove("open");
    if (upgradePanel) upgradePanel.classList.remove("open");
    if (shopPanel) shopPanel.classList.remove("open");
    if (achPanel) achPanel.classList.remove("open");
    if (ppPanel) ppPanel.classList.remove("open");
    if (ascPanel) ascPanel.classList.remove("open");
  };
  if (btnBuild) btnBuild.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (buildPanel && buildPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (buildPanel) buildPanel.classList.add("open"); updateBuildButtonLabels(); }
  };
  if (btnEvo) btnEvo.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (evoPanel && evoPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (evoPanel) evoPanel.classList.add("open"); refreshEvolutionUI(); }
  };
  if (btnUpgrades) btnUpgrades.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (upgradePanel && upgradePanel.classList.contains("open")) closeAll();
    else { closeAll(); if (upgradePanel) upgradePanel.classList.add("open"); refreshUpgradeUI(); }
  };
  if (btnShop) btnShop.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (shopPanel && shopPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (shopPanel) shopPanel.classList.add("open"); }
  };
  if (btnAch) btnAch.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (achPanel && achPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (achPanel) achPanel.classList.add("open"); refreshAchievementsUI(); }
  };
  if (btnPP) btnPP.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (ppPanel && ppPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (ppPanel) ppPanel.classList.add("open"); refreshPrestigeShopUI(); }
  };
  if (btnAscShop) btnAscShop.onclick = function() {
    AudioManager.sfx.buttonClick();
    if (ascPanel && ascPanel.classList.contains("open")) closeAll();
    else { closeAll(); if (ascPanel) ascPanel.classList.add("open"); refreshAscensionShopUI(); }
  };
  if (btnDaily) btnDaily.onclick = function() {
    AudioManager.sfx.buttonClick();
    var dp = document.getElementById('daily-panel');
    dp.style.display = dp.style.display === 'flex' ? 'none' : 'flex';
    refreshDailyUI();
  };

  document.getElementById("prestige-pill").onclick = function() { AudioManager.sfx.buttonClick(); showPrestigeModal(); };
  document.getElementById("ascend-pill").onclick = function() { AudioManager.sfx.buttonClick(); showAscendModal(); };
  document.getElementById("zone-pill").onclick = function() {
    AudioManager.sfx.buttonClick();
    var zones = state.unlockedZonesList;
    if (zones.length <= 1) { showToast("Explore more to unlock new zones!"); return; }
    var idx = zones.indexOf(state.currentZone);
    var nextIdx = (idx + 1) % zones.length;
    switchZone(zones[nextIdx]);
  };

  document.getElementById("build-food-storage").onclick = buildFoodStorageChamber;
  document.getElementById("build-nursery").onclick = buildNurseryChamber;
  document.getElementById("build-soldier").onclick = buildSoldierChamber;
  document.getElementById("build-research").onclick = buildResearchChamber;
  document.getElementById("build-scout").onclick = buildScoutChamber;

  document.getElementById("btn-upg-damage").onclick = function() { buyUpgrade("soldierDamage"); };
  document.getElementById("btn-upg-speed").onclick = function() { buyUpgrade("workerSpeed"); };
  document.getElementById("btn-upg-egg").onclick = function() { buyUpgrade("eggLayTime"); };
  document.getElementById("btn-upg-cap").onclick = function() { buyUpgrade("foodCap"); };

  var shopBtns = ["golden", "armor", "bless", "map", "boost", "hatch", "skin"];
  for (var si = 0; si < shopBtns.length; si++) {
    var sid = shopBtns[si];
    var btn = document.getElementById("btn-shop-" + sid);
    if (btn) btn.onclick = function(id) { return function() { buyGemItem(id); }; }(sid);
  }

  document.getElementById("btn-menu-ingame").onclick = function() { AudioManager.sfx.buttonClick(); showMainMenu(); };
  document.getElementById("btn-settings-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('settings-panel').style.display = 'flex'; };
  document.getElementById("btn-stats-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('stats-panel').style.display = 'flex'; refreshStatsUI(); };
  document.getElementById("btn-roadmap-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('roadmap-panel').style.display = 'flex'; refreshRoadmapUI(); };
  document.getElementById("btn-howtoplay-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('howtoplay-panel').style.display = 'flex'; };
  document.getElementById("btn-about-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('about-modal').style.display = 'flex'; };

  document.getElementById("btn-close-settings").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('settings-panel').style.display = 'none'; };
  document.getElementById("btn-close-stats").onclick = function() { document.getElementById('stats-panel').style.display = 'none'; };
  document.getElementById("btn-close-daily").onclick = function() { document.getElementById('daily-panel').style.display = 'none'; };
  document.getElementById("btn-close-roadmap").onclick = function() { document.getElementById('roadmap-panel').style.display = 'none'; };
  document.getElementById("btn-close-ascension").onclick = function() { document.getElementById('ascension-panel').style.display = 'none'; };
  document.getElementById("btn-close-howtoplay").onclick = function() { document.getElementById('howtoplay-panel').style.display = 'none'; };
  document.getElementById("btn-close-about").onclick = function() { document.getElementById('about-modal').style.display = 'none'; };

  document.getElementById("toggle-sfx").onclick = function() {
    GameSettings.sfxOn = !GameSettings.sfxOn; AudioManager.setSfx(GameSettings.sfxOn);
    this.className = 'toggle-switch' + (GameSettings.sfxOn ? ' on' : '');
  };
  document.getElementById("toggle-ambient").onclick = function() {
    GameSettings.ambientOn = !GameSettings.ambientOn; AudioManager.setAmbient(GameSettings.ambientOn);
    this.className = 'toggle-switch' + (GameSettings.ambientOn ? ' on' : '');
  };
  document.getElementById("toggle-shake").onclick = function() {
    GameSettings.shakeOn = !GameSettings.shakeOn; localStorage.setItem('antEmpire_shake', GameSettings.shakeOn ? '1' : '0');
    this.className = 'toggle-switch' + (GameSettings.shakeOn ? ' on' : '');
  };

  updateBuildButtons();
  if (state.chambers.research.count > 0) {
    var btns = ["btn-upgrades", "btn-shop", "btn-achievements", "btn-daily"];
    for (var bi = 0; bi < btns.length; bi++) { var b = document.getElementById(btns[bi]); if (b) b.style.display = "inline-block"; }
    if (state.level >= BAL.evolutionUnlockLevel) { var evoBtn = document.getElementById("btn-evolution"); if (evoBtn) evoBtn.style.display = "inline-block"; }
  }
  if (state.prestigeCount > 0) { var ppBtn = document.getElementById("btn-prestige-shop"); if (ppBtn) ppBtn.style.display = "inline-block"; }
  if (state.prestigeCount >= BAL.ascendUnlockPrestige || state.ascensionCount > 0) { var ascBtn = document.getElementById("btn-ascension-shop"); if (ascBtn) ascBtn.style.display = "inline-block"; }
  for (var si = 0; si < shopBtns.length; si++) {
    var sid = shopBtns[si];
    if (GEM_ITEMS[sid] && GEM_ITEMS[sid].oneTime && state.gemUpgrades[sid]) {
      var btn = document.getElementById("btn-shop-" + sid);
      if (btn) { btn.disabled = true; btn.textContent = "Owned"; }
    }
  }
  refreshUpgradeUI();
  refreshAscensionShopUI();
      }
