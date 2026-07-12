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

function closeAllModals() {
  ['offline-modal', 'daily-modal', 'prestige-modal', 'ascend-modal', 'about-modal'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

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
  apill.style.display = (state.prestigeCount >= BAL.ascendUnlockPrestige && !state.bossActive) ? 'flex' : 'none';
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
  if (!elBossTimer) return;   // safety check
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
function calculateOfflineProgress() {
  var now = Date.now();
  var elapsed = (now - state.lastSaveTime) / 1000;
  if (elapsed < 30 || state.lastSaveTime === 0) return null;
  var cappedTime = Math.min(elapsed, 28800);
  var eff = BAL.offlineEfficiency;
  var foodEarned = Math.floor(state.workerCount * getEffectiveFoodPerTrip() * (cappedTime / (state.eggLayTime * 2)) * eff);
  var eggsLaid = Math.floor(cappedTime / state.eggLayTime * eff);
  var gemsEarned = Math.floor(cappedTime / 1800 * eff);
  foodEarned = Math.min(foodEarned, state.foodCap * 3);
  eggsLaid = Math.min(eggsLaid, 30);
  gemsEarned = Math.min(gemsEarned, 5);
  return { time: cappedTime, food: foodEarned, eggs: eggsLaid, gems: gemsEarned };
}
function showOfflineModal(data) {
  closeAllModals();
  if (!data || data.time < 30) { checkDailyLogin(); return; }
  var modal = document.getElementById('offline-modal');
  var mins = Math.floor(data.time / 60), hrs = Math.floor(mins / 60), timeStr = hrs > 0 ? hrs + "h " + (mins % 60) + "m" : mins + "m";
  document.getElementById('offline-time').textContent = "⏰ You were away for " + timeStr;
  document.getElementById('offline-food').textContent = "🌾 +" + data.food + " food";
  document.getElementById('offline-eggs').textContent = "🥚 +" + data.eggs + " eggs";
  document.getElementById('offline-gems').textContent = "💎 +" + data.gems + " gems";
  modal.style.display = "flex";
  document.getElementById('offline-claim').onclick = function() {
    for (var i = 0; i < data.eggs; i++) {
      state.eggs++;
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 }));
      m.position.copy(qMesh.position);
      m.position.x += (Math.random() - 0.5) * 1.6;
      m.position.z += (Math.random() - 0.5) * 1.4;
      m.scale.setScalar(0.3);
      scene.add(m);
      eggMs.push({ mesh: m, mat: m.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: m.position.x, restZ: m.position.z, settling: false, settleT: 0 });
    }
    addFood(data.food);
    addGems(data.gems);
    state.earlyGameBoost = Math.max(0, state.earlyGameBoost - data.time);
    state.bossTimer = Math.max(10, state.bossTimer - data.time);
    modal.style.display = "none";
    showToast("✅ Offline rewards collected!");
    refreshHUD();
    checkAchievements();
    checkDailyLogin();
  };
}

// Daily login
function getTodayString() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function checkDailyLogin() {
  closeAllModals();
  var today = getTodayString();
  if (state.lastLoginDay === today) { updateStreakDisplay(); return; }
  var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + "-" + (yesterday.getMonth() + 1) + "-" + yesterday.getDate();
  if (state.lastLoginDay === yesterdayStr) { state.dailyStreak++; if (state.dailyStreak > 7) state.dailyStreak = 1; }
  else { state.dailyStreak = 1; }
  state.lastLoginDay = today;
  var dayIndex = (state.dailyStreak - 1) % 7;
  var reward = DAILY_REWARDS[dayIndex];
  var gemsEarned = reward.gems;
  var hasSpecial = reward.special || false;
  state.gems += gemsEarned;
  state.totalGemsEarned += gemsEarned;
  var modal = document.getElementById('daily-modal');
  var streakIcons = ""; for (var i = 0; i < state.dailyStreak; i++) streakIcons += "🔥";
  document.getElementById('daily-streak-icon').textContent = streakIcons;
  document.getElementById('daily-reward-text').textContent = "Day " + state.dailyStreak + " — 💎 +" + gemsEarned + " gems";
  var specialEl = document.getElementById('daily-special-text');
  if (hasSpecial) { specialEl.textContent = "🎁 SPECIAL: Free Golden Ant Egg!"; specialEl.style.display = "block"; }
  else { specialEl.style.display = "none"; }
  modal.style.display = "flex";
  modal.dataset.special = hasSpecial ? "true" : "false";
  AudioManager.sfx.dailyStreak();
  document.getElementById('daily-claim').onclick = function() {
    if (modal.dataset.special === "true") {
      state.workerCount++;
      var gw = createWorker(true, null, true);
      if (gw) workers.push(gw);
      if (state.rallyActive) gw.speed *= BAL.rallySpeedMultiplier;
      showToast("🥇 Golden worker from daily streak!");
      refreshHUD();
    }
    modal.style.display = "none";
    showToast("🔥 Day " + state.dailyStreak + " streak! +" + gemsEarned + " 💎");
    refreshHUD();
    updateStreakDisplay();
  };
}
function updateStreakDisplay() { var el = document.getElementById('streak-display'); if (el) el.textContent = "🔥" + state.dailyStreak; }

// Prestige modal
function showPrestigeModal() {
  closeAllModals();
  if (state.level < BAL.prestigeLevelReq) { showToast("Reach Level " + BAL.prestigeLevelReq + " to prestige!"); return; }
  var ppGain = Math.floor((state.level - BAL.prestigeLevelReq + 1) * BAL.prestigePPPerLevel) + BAL.prestigeBasePP;
  var modal = document.getElementById('prestige-modal');
  document.getElementById('prestige-info-text').textContent = "Reset colony to Level 1 with bonuses.";
  document.getElementById('prestige-reward-text').textContent = "✨ You will gain " + ppGain + " Prestige Points!";
  modal.style.display = "flex";
  document.getElementById('prestige-confirm').onclick = function() { performPrestige(ppGain); modal.style.display = "none"; };
  document.getElementById('prestige-cancel').onclick = function() { modal.style.display = "none"; };
}
function performPrestige(ppGain) {
  resetWeatherAndBoosts();
  var pt = state.lifetimeStats.totalPlayTime + (performance.now() - state.lastTime) / 1000;
  if (state.prestigeStartTime > 0) {
    var thisPrestigeTime = pt - state.prestigeStartTime;
    if (!state.lifetimeStats.fastestPrestige || thisPrestigeTime < state.lifetimeStats.fastestPrestige) state.lifetimeStats.fastestPrestige = thisPrestigeTime;
  }
  state.prestigeCount++; state.prestigePoints += ppGain; state.lifetimeStats.totalPrestiges++;
  state.level = 1; state.xp = 0; state.xpToNext = Math.floor(40 * Math.pow(1.15, 0));
  state.food = BAL.baseFoodCap; state.eggs = 0; state.workerCount = 4; state.soldierCount = 0; state.scoutCount = 0;
  AudioManager.sfx.prestige(); triggerShake(8, 0.8);
  state.chambers = { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 }, soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 } };
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
  barracksSoldiers = [];
  if (researchChamberGroup) { disposeMesh(researchChamberGroup); scene.remove(researchChamberGroup); researchChamberGroup = null; }
  if (state.currentBoss) { disposeMesh(state.currentBoss.mesh); scene.remove(state.currentBoss.mesh); state.currentBoss = null; }
  state.bossActive = false; document.getElementById('boss-name').style.display = 'none'; document.getElementById('boss-health-bar').style.display = 'none';
  for (var i = 0; i < PRESTIGE_MILESTONES.length; i++) { var m = PRESTIGE_MILESTONES[i]; if (state.prestigeCount >= m.prestige) m.effect(); }
  rebuildAllChambers();
  if (state.ascensionUpgrades.elderWisdom > 0 && state.chambers.research.count === 0) {
    state.chambers.research.count = 1;
    var chX = getNextResearchX();
    researchChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a3a5a) });
    makeLabel("🔬 Research", chX, CCY + 1.4, CZ, 256, 64, true);
    researchChamberGroup = new THREE.Group(); researchChamberGroup.position.set(chX, CCY + 1.8, CZ);
    var orbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
    for (var i = 0; i < 5; i++) { var orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), orbMat); var angle = (i / 5) * Math.PI * 2; orb.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6); researchChamberGroup.add(orb); }
    scene.add(researchChamberGroup);
  }
  for (var wi = 0; wi < state.workerCount; wi++) { var nw = createWorker(false); if (nw) workers.push(nw); }
  buildQueenChamberWalls(); recalculateHatchTime(); updateEggLayTime(); recalculateFoodCap();
  state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  state.prestigeStartTime = state.lifetimeStats.totalPlayTime;
  emitParticles(_v3.set(TX, GTY + 1.5, TCZ), 40, 0xff44ff, 0.1, 2.0, 1.0);
  showToast("✨ Prestige complete! Gained " + ppGain + " PP");
  refreshHUD(); checkAchievements(); saveGame();
}

// Ascension modal
function showAscendModal() {
  if (state.prestigeCount < BAL.ascendUnlockPrestige) { showToast("Reach Prestige " + BAL.ascendUnlockPrestige + " to unlock Ascension!"); return; }
  if (state.bossActive) { showToast("Defeat the boss first!"); return; }
  closeAllModals();
  var apGain = 1;
  var modal = document.getElementById('ascend-modal');
  document.getElementById('ascend-info-text').textContent = "Reset ALL progress to gain 1 Ascension Point.";
  document.getElementById('ascend-reward-text').textContent = "⬆️ You will gain " + apGain + " AP and permanent multipliers!";
  modal.style.display = "flex";
  document.getElementById('ascend-confirm').onclick = function() { performAscension(apGain); modal.style.display = "none"; };
  document.getElementById('ascend-cancel').onclick = function() { modal.style.display = "none"; };
}
function performAscension(apGain) {
  resetWeatherAndBoosts();
  var ascCount = state.ascensionCount + apGain;
  var ascPoints = state.ascensionPoints + apGain;
  var ascUpgrades = JSON.parse(JSON.stringify(state.ascensionUpgrades));
  state.colonyName = "Colony " + (currentSlot + 1);
  state.food = BAL.baseFoodCap; state.gems = 0; state.foodCap = BAL.baseFoodCap;
  state.level = 1; state.xp = 0; state.xpToNext = Math.floor(40 * Math.pow(1.15, 0));
  state.eggs = 0; state.workerCount = 4; state.soldierCount = 0; state.scoutCount = 0;
  state.chambers = { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 }, soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 } };
  state.upgrades = { soldierDamage: 0, workerSpeed: 0, eggLayTime: 0, foodCap: 0 };
  state.gemUpgrades = { goldenEgg: false, soldierArmor: false, queenBless: false, scoutMap: false, goldenSkin: false };
  state.expansionTrips = 0; state.unlockedZones = 0; state.rallyActive = false; state.rallyTimer = 0; state.rallyCooldown = 0;
  state.waveActive = false; state.waveTimer = 35; state.surgeActive = false; state.surgeTimer = 60 + Math.random() * 30;
  state.eventActive = false; state.eventTimer = 35 + Math.random() * 25; state.weatherActive = false; state.weatherTimer = 70 + Math.random() * 40;
  state.isNight = false; state.rareAntCount = 0; state.nestEvolutionLevel = 0; state.totalHatched = 0; state.totalKills = 0; state.totalGemsEarned = 0;
  state.achievementsClaimed = state.achievementsClaimed || {};
  state.dailyStreak = state.dailyStreak || 0; state.lastLoginDay = state.lastLoginDay || "";
  state.earlyGameBoost = BAL.earlyGameBoostDuration;
  state.survivedNight = 0; state.rallyUses = 0; state.surgesCollected = 0; state.virtualWorkers = 0;
  state.evolution = { worker: 0, soldier: 0, scout: 0 };
  state.bossActive = false; state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  state.bossKills = 0; state.bossType = null; state.currentBoss = null;
  state.prestigeCount = 0; state.prestigePoints = 0; state.prestigeUpgrades = { ppFood: 0, ppSpeed: 0, ppHatch: 0, ppCap: 0, ppGem: 0, ppBoss: 0 };
  state.prestigeFoodBonus = 0;
  state.currentZone = "forest"; state.unlockedZonesList = ["forest"];
  state.speedBoostTimer = 0; state.beetleKills = 0; state.waspKills = 0;
  state.tutorialsShown = {}; state.queenClicks = 0; state.prestigeStartTime = 0; state.prestigeStartLevel = 0;
  state.dailyChallengeDate = ""; state.dailyChallengeIds = []; state.dailyProgress = { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 };
  state.lifetimeStats = { totalFood: 0, totalHatched: 0, totalKills: 0, totalBossKills: 0, totalPrestiges: 0, totalPlayTime: 0, totalGems: 0, totalRallies: 0, totalSurges: 0, totalNights: 0, fastestPrestige: 0 };
  state.ascensionCount = ascCount; state.ascensionPoints = ascPoints; state.ascensionUpgrades = ascUpgrades; state.hasAscended = true;
  state.caveBossKills = 0; state.swampBossKills = 0; state.mountainBossKills = 0;
  clearAllMeshes();
  buildQueenChamberWalls(); rebuildAllChambers();
  for (var wi = 0; wi < state.workerCount; wi++) { var nw = createWorker(false); if (nw) workers.push(nw); }
  recalculateHatchTime(); updateEggLayTime(); recalculateFoodCap();
  state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  AudioManager.sfx.ascend();
  emitParticles(_v3.set(TX, GTY + 1.5, TCZ), 60, 0xffaa00, 0.12, 2.5, 1.2);
  showToast("⬆️ Ascension complete! +1 AP, permanent multipliers active!");
  refreshHUD(); checkAchievements(); saveGame();
  var cfg = ZONE_CONFIG.forest;
  scene.background = new THREE.Color(cfg.bg); scene.fog = new THREE.Fog(cfg.fog, 20, 80);
  document.getElementById('zone-display').textContent = cfg.label;
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
  document.getElementById('boss-name').style.display = 'none';
  document.getElementById('boss-health-bar').style.display = 'none';
}

// Ascension shop UI
function refreshAscensionShopUI() {
  var list = document.getElementById('ascension-shop-list');
  if (!list) return;
  var html = "";
  for (var i = 0; i < ASCENSION_SHOP.length; i++) {
    var item = ASCENSION_SHOP[i];
    var lv = state.ascensionUpgrades[item.id] || 0;
    var owned = lv >= item.maxLevel;
    html += '<div class="ascension-option"><span>' + item.icon + ' ' + item.name + '<br><small style="color:#aaa">' + item.desc + '</small></span>';
    html += '<button ' + (owned ? 'disabled' : '') + ' onclick="window._buyAsc(\'' + item.id + '\')">' + (owned ? '✅ Owned' : item.cost + ' AP') + '</button></div>';
  }
  list.innerHTML = html;
}
window._buyAsc = buyAscensionUpgrade;

// Prestige shop UI
function refreshPrestigeShopUI() {
  var list = document.getElementById('prestige-shop-list');
  if (!list) return;
  var html = "";
  for (var i = 0; i < PRESTIGE_SHOP.length; i++) {
    var item = PRESTIGE_SHOP[i];
    var lv = state.prestigeUpgrades[item.id] || 0;
    var owned = lv >= item.maxLevel;
    html += '<div class="prestige-option"><span>' + item.icon + ' ' + item.name + '<br><small style="color:#aaa">' + item.desc + '</small></span>';
    html += '<button ' + (owned ? 'disabled' : '') + ' onclick="window._buyPP(\'' + item.id + '\')">' + (owned ? '✅ Owned' : item.cost + ' PP') + '</button></div>';
  }
  list.innerHTML = html;
}
function buyPrestigeUpgrade(id) {
  var item = null;
  for (var i = 0; i < PRESTIGE_SHOP.length; i++) { if (PRESTIGE_SHOP[i].id === id) { item = PRESTIGE_SHOP[i]; break; } }
  if (!item) return;
  var lv = state.prestigeUpgrades[id] || 0;
  if (lv >= item.maxLevel) { showToast("Already max level!"); return; }
  if (state.prestigePoints < item.cost) { showToast("Need " + item.cost + " PP!"); return; }
  state.prestigePoints -= item.cost;
  state.prestigeUpgrades[id] = lv + 1;
  AudioManager.sfx.upgrade();
  showToast(item.icon + " " + item.name + " upgraded!");
  refreshPrestigeShopUI();
  refreshHUD();
  saveGame();
}
window._buyPP = buyPrestigeUpgrade;

// Evolution UI
function refreshEvolutionUI() {
  var list = document.getElementById('evo-list');
  if (!list) return;
  var html = "";
  var types = ["worker", "soldier", "scout"];
  for (var ti = 0; ti < types.length; ti++) {
    var type = types[ti];
    var evo = EVOLUTION_TREE[type];
    var ct = state.evolution[type] || 0;
    html += '<div style="color:#ff88cc;font-weight:700;margin-top:4px;">' + evo.name + ' (Tier ' + ct + '/' + evo.tiers.length + ')</div>';
    for (var i = 0; i < evo.tiers.length; i++) {
      var tier = evo.tiers[i];
      var unlocked = i < ct;
      var available = i === ct;
      var locked = i > ct;
      if (available && tier.reqPrestige && state.prestigeCount < tier.reqPrestige) { available = false; locked = true; }
      html += '<div class="evo-option"><span>' + tier.icon + ' ' + tier.name + '<br><small style="color:#aaa">' + tier.desc + (tier.reqPrestige ? ' (Req. Prestige ' + tier.reqPrestige + ')' : '') + '</small></span>';
      if (unlocked) html += '<span style="color:#4a4;">✓ Owned</span>';
      else if (available) html += '<button onclick="window._buyEvo(\'' + type + '\')">' + tier.cost + ' 🌾</button>';
      else html += '<span style="color:#888;">Locked</span>';
      html += '</div>';
    }
  }
  list.innerHTML = html;
}
window._buyEvo = buyEvolution;

// Upgrade UI
function refreshUpgradeUI() {
  function fmt(type) { var lv = state.upgrades[type], max = UPGRADES[type].maxLevel; var cost = lv < max ? getUpgradeCost(type) : 0; return "Lv" + lv + "/" + max + (lv < max ? " " + cost + "🌾" : " MAX"); }
  document.getElementById("upg-damage").textContent = fmt("soldierDamage");
  document.getElementById("upg-speed").textContent = fmt("workerSpeed");
  document.getElementById("upg-egg").textContent = fmt("eggLayTime");
  document.getElementById("upg-cap").textContent = fmt("foodCap");
  document.getElementById("btn-upg-damage").disabled = state.upgrades.soldierDamage >= UPGRADES.soldierDamage.maxLevel;
  document.getElementById("btn-upg-speed").disabled = state.upgrades.workerSpeed >= UPGRADES.workerSpeed.maxLevel;
  document.getElementById("btn-upg-egg").disabled = state.upgrades.eggLayTime >= UPGRADES.eggLayTime.maxLevel;
  document.getElementById("btn-upg-cap").disabled = state.upgrades.foodCap >= UPGRADES.foodCap.maxLevel;
}

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
function buildFoodStorageChamber() {
  if (state.chambers.foodStorage.count >= BAL.maxStorage) { showToast("Max storage reached!"); return; }
  var cost = getStorageCost();
  if (state.food < cost) { showToast("Need " + cost + " food!"); return; }
  state.food -= cost;
  state.chambers.foodStorage.count++;
  state.chambers.foodStorage.bonusCap += BAL.foodCapPerStorage;
  recalculateFoodCap();
  var chX = getNextStorageX();
  storageChambers.push(makeChamber(chX, CCY, CZ, 3, 2, 4, 0x5a4020));
  makeLabel("🌾 Storage", chX, CCY + 1.4, CZ, 256, 64, true);
  var pile = new THREE.Group(); pile.position.set(chX, CCY - 0.8, CZ); scene.add(pile); storagePiles.push(pile);
  AudioManager.sfx.buttonClick(); updateDailyProgress('build1', 1);
  showToast("Food Storage built! +" + BAL.foodCapPerStorage);
  refreshHUD(); updateBuildButtons(); checkAchievements(); checkTutorials();
}
function buildNurseryChamber() {
  if (state.chambers.nursery.count >= BAL.maxNursery) { showToast("Max nurseries!"); return; }
  var cost = getEffectiveChamberCost(BAL.nurseryCost);
  if (state.food < cost) { showToast("Need " + cost + " food!"); return; }
  state.food -= cost; state.chambers.nursery.count++; state.chambers.nursery.hatchReduction += 2; recalculateHatchTime();
  var chX = TX - 5 - (state.chambers.nursery.count - 1) * 3.5;
  nurseryChambers.push(makeChamber(chX, CCY, CZ, 3, 2, 4, 0x6b5040));
  makeLabel("🥚 Nursery", chX, CCY + 1.4, CZ, 256, 64, true);
  var cluster = new THREE.Group(); cluster.position.set(chX, CCFY + 0.05, CZ); scene.add(cluster); nurseryEggClusters.push(cluster);
  buildQueenChamberWalls();
  AudioManager.sfx.buttonClick(); updateDailyProgress('build1', 1);
  showToast("Nursery built! Hatch -2s"); refreshHUD(); updateBuildButtons(); checkAchievements();
}
function buildSoldierChamber() {
  if (state.chambers.soldier.count >= BAL.maxSoldierChambers) { showToast("Max soldier chambers!"); return; }
  var cost = getEffectiveChamberCost(BAL.soldierChamberCost);
  if (state.food < cost) { showToast("Need " + cost + " food!"); return; }
  state.food -= cost; state.chambers.soldier.count++;
  var chX = getNextSoldierX();
  soldierChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x4a2a1a) });
  makeLabel("🛡️ Barracks", chX, CCY + 1.4, CZ, 256, 64, true);
  state.soldierCount++; spawnSoldier(chX);
  AudioManager.sfx.buttonClick(); updateDailyProgress('build1', 1);
  showToast("Soldier +1"); refreshHUD(); updateBuildButtons(); checkAchievements();
}
function buildResearchChamber() {
  if (state.chambers.research.count >= 1) { showToast("Only one research chamber!"); return; }
  var cost = getEffectiveChamberCost(BAL.researchChamberCost);
  if (state.food < cost) { showToast("Need " + cost + " food!"); return; }
  state.food -= cost; state.chambers.research.count++;
  var chX = getNextResearchX();
  researchChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a3a5a) });
  makeLabel("🔬 Research", chX, CCY + 1.4, CZ, 256, 64, true);
  researchChamberGroup = new THREE.Group(); researchChamberGroup.position.set(chX, CCY + 1.8, CZ);
  var orbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
  for (var i = 0; i < 5; i++) { var orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), orbMat); var angle = (i / 5) * Math.PI * 2; orb.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6); researchChamberGroup.add(orb); }
  scene.add(researchChamberGroup);
  var btns = ["btn-upgrades", "btn-shop", "btn-achievements", "btn-daily"];
  for (var bi = 0; bi < btns.length; bi++) { var b = document.getElementById(btns[bi]); if (b) b.style.display = "inline-block"; }
  if (state.level >= BAL.evolutionUnlockLevel) { var evoBtn = document.getElementById("btn-evolution"); if (evoBtn) evoBtn.style.display = "inline-block"; }
  AudioManager.sfx.buttonClick(); updateDailyProgress('build1', 1);
  showToast("Research Chamber built!"); refreshHUD(); updateBuildButtons(); checkAchievements(); checkTutorials();
}
function buildScoutChamber() {
  if (state.chambers.scout.count >= BAL.maxScoutChambers) { showToast("Max scout chambers!"); return; }
  var cost = getEffectiveChamberCost(BAL.scoutChamberCost);
  if (state.food < cost) { showToast("Need " + cost + " food!"); return; }
  state.food -= cost; state.chambers.scout.count++;
  var chX = getNextScoutX();
  scoutChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a5a3a) });
  makeLabel("🔍 Scout Post", chX, CCY + 1.4, CZ, 256, 64, true);
  state.scoutCount++; spawnScout();
  AudioManager.sfx.buttonClick(); updateDailyProgress('build1', 1);
  showToast("Scout +1"); refreshHUD(); updateBuildButtons(); checkAchievements();
}

// Setup all buttons
function setupButtons() {
  buildPanel = document.getElementById("build-panel");
  upgradePanel = document.getElementById("upgrade-panel");
  shopPanel = document.getElementById("shop-panel");
  achPanel = document.getElementById("achievements-panel");
  evoPanel = document.getElementById("evolution-panel");
  ppPanel = document.getElementById("prestige-shop-panel");
  ascPanel = document.getElementById("ascension-shop-panel");

  function closeAllPanels() {
    [buildPanel, upgradePanel, shopPanel, achPanel, evoPanel, ppPanel, ascPanel].forEach(function(p) { if (p) p.classList.remove("open"); });
  }

  var btnBuild = document.getElementById("btn-build"); if (btnBuild) btnBuild.onclick = function() { AudioManager.sfx.buttonClick(); if (buildPanel && buildPanel.classList.contains("open")) { buildPanel.classList.remove("open"); } else { closeAllPanels(); if (buildPanel) { buildPanel.classList.add("open"); updateBuildButtonLabels(); } } };
  var btnEvo = document.getElementById("btn-evolution"); if (btnEvo) btnEvo.onclick = function() { AudioManager.sfx.buttonClick(); if (evoPanel && evoPanel.classList.contains("open")) { evoPanel.classList.remove("open"); } else { closeAllPanels(); if (evoPanel) { evoPanel.classList.add("open"); refreshEvolutionUI(); } } };
  var btnUpgrades = document.getElementById("btn-upgrades"); if (btnUpgrades) btnUpgrades.onclick = function() { AudioManager.sfx.buttonClick(); if (upgradePanel && upgradePanel.classList.contains("open")) { upgradePanel.classList.remove("open"); } else { closeAllPanels(); if (upgradePanel) { upgradePanel.classList.add("open"); refreshUpgradeUI(); } } };
  var btnShop = document.getElementById("btn-shop"); if (btnShop) btnShop.onclick = function() { AudioManager.sfx.buttonClick(); if (shopPanel && shopPanel.classList.contains("open")) { shopPanel.classList.remove("open"); } else { closeAllPanels(); if (shopPanel) shopPanel.classList.add("open"); } };
  var btnAch = document.getElementById("btn-achievements"); if (btnAch) btnAch.onclick = function() { AudioManager.sfx.buttonClick(); if (achPanel && achPanel.classList.contains("open")) { achPanel.classList.remove("open"); } else { closeAllPanels(); if (achPanel) { achPanel.classList.add("open"); refreshAchievementsUI(); } } };
  var btnPP = document.getElementById("btn-prestige-shop"); if (btnPP) btnPP.onclick = function() { AudioManager.sfx.buttonClick(); if (ppPanel && ppPanel.classList.contains("open")) { ppPanel.classList.remove("open"); } else { closeAllPanels(); if (ppPanel) { ppPanel.classList.add("open"); refreshPrestigeShopUI(); } } };
  var btnAscShop = document.getElementById("btn-ascension-shop"); if (btnAscShop) btnAscShop.onclick = function() { AudioManager.sfx.buttonClick(); if (ascPanel && ascPanel.classList.contains("open")) { ascPanel.classList.remove("open"); } else { closeAllPanels(); if (ascPanel) { ascPanel.classList.add("open"); refreshAscensionShopUI(); } } };
  var btnDaily = document.getElementById("btn-daily"); if (btnDaily) btnDaily.onclick = function() { AudioManager.sfx.buttonClick(); var dp = document.getElementById('daily-panel'); dp.style.display = dp.style.display === 'flex' ? 'none' : 'flex'; refreshDailyUI(); };

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

  document.getElementById("prestige-pill").onclick = function() { AudioManager.sfx.buttonClick(); showPrestigeModal(); };
  document.getElementById("ascend-pill").onclick = function() { AudioManager.sfx.buttonClick(); showAscendModal(); };
  document.getElementById("zone-pill").onclick = function() { AudioManager.sfx.buttonClick(); var zones = state.unlockedZonesList; if (zones.length <= 1) { showToast("Explore more to unlock new zones!"); return; } var idx = zones.indexOf(state.currentZone); var nextIdx = (idx + 1) % zones.length; switchZone(zones[nextIdx]); };
  document.getElementById("btn-menu-ingame").onclick = function() { AudioManager.sfx.buttonClick(); showMainMenu(); };
  document.getElementById("btn-settings-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('settings-panel').style.display = 'flex'; };
  document.getElementById("btn-stats-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('stats-panel').style.display = 'flex'; refreshStatsUI(); };
  document.getElementById("btn-roadmap-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('roadmap-panel').style.display = 'flex'; refreshRoadmapUI(); };
  document.getElementById("btn-howtoplay-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('howtoplay-panel').style.display = 'flex'; };
  document.getElementById("btn-about-menu").onclick = function() { AudioManager.sfx.buttonClick(); document.getElementById('about-modal').style.display = 'flex'; };
  document.getElementById("btn-close-settings").onclick = function() { document.getElementById('settings-panel').style.display = 'none'; };
  document.getElementById("btn-close-stats").onclick = function() { document.getElementById('stats-panel').style.display = 'none'; };
  document.getElementById("btn-close-daily").onclick = function() { document.getElementById('daily-panel').style.display = 'none'; };
  document.getElementById("btn-close-roadmap").onclick = function() { document.getElementById('roadmap-panel').style.display = 'none'; };
  document.getElementById("btn-close-ascension").onclick = function() { document.getElementById('ascension-panel').style.display = 'none'; };
  document.getElementById("btn-close-howtoplay").onclick = function() { document.getElementById('howtoplay-panel').style.display = 'none'; };
  document.getElementById("btn-close-about").onclick = function() { document.getElementById('about-modal').style.display = 'none'; };
  document.getElementById("toggle-sfx").onclick = function() { GameSettings.sfxOn = !GameSettings.sfxOn; AudioManager.setSfx(GameSettings.sfxOn); this.className = 'toggle-switch' + (GameSettings.sfxOn ? ' on' : ''); };
  document.getElementById("toggle-ambient").onclick = function() { GameSettings.ambientOn = !GameSettings.ambientOn; AudioManager.setAmbient(GameSettings.ambientOn); this.className = 'toggle-switch' + (GameSettings.ambientOn ? ' on' : ''); };
  document.getElementById("toggle-shake").onclick = function() { GameSettings.shakeOn = !GameSettings.shakeOn; localStorage.setItem('antEmpire_shake', GameSettings.shakeOn ? '1' : '0'); this.className = 'toggle-switch' + (GameSettings.shakeOn ? ' on' : ''); };

  updateBuildButtons();
  if (state.chambers.research.count > 0) { ["btn-upgrades","btn-shop","btn-achievements","btn-daily"].forEach(function(id) { var b = document.getElementById(id); if (b) b.style.display = "inline-block"; }); if (state.level >= BAL.evolutionUnlockLevel) { var evoBtn = document.getElementById("btn-evolution"); if (evoBtn) evoBtn.style.display = "inline-block"; } }
  if (state.prestigeCount > 0) { var ppBtn = document.getElementById("btn-prestige-shop"); if (ppBtn) ppBtn.style.display = "inline-block"; }
  if (state.prestigeCount >= BAL.ascendUnlockPrestige || state.ascensionCount > 0) { var ascBtn = document.getElementById("btn-ascension-shop"); if (ascBtn) ascBtn.style.display = "inline-block"; }
  for (var si = 0; si < shopBtns.length; si++) { var sid = shopBtns[si]; if (GEM_ITEMS[sid] && GEM_ITEMS[sid].oneTime && state.gemUpgrades[sid]) { var btn = document.getElementById("btn-shop-" + sid); if (btn) { btn.disabled = true; btn.textContent = "Owned"; } } }
  refreshUpgradeUI(); refreshAscensionShopUI();
    }
