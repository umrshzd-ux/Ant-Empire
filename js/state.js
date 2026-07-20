// ===== STATE, SAVE/LOAD, AND DYNAMIC RECALCULATIONS =====

var SaveManager = {};
(function(SM) {
  var SAVE_KEYS = ['antEmpire_slot_0', 'antEmpire_slot_1', 'antEmpire_slot_2'];
  SM.getSlotMeta = function(slot) {
    try {
      var r = localStorage.getItem(SAVE_KEYS[slot]);
      if (!r) return null;
      var d = JSON.parse(r);
      return {
        slot: slot,
        name: d.colonyName || ('Colony ' + (slot + 1)),
        level: d.level || 1,
        prestige: d.prestigeCount || 0,
        ascension: d.ascensionCount || 0,
        lastSaved: d.lastSaveTime || 0,
        hasData: true
      };
    } catch(e) { return null; }
  };
  SM.getAllSlots = function() {
    var slots = [];
    for (var i = 0; i < 3; i++) {
      var m = SM.getSlotMeta(i);
      slots.push(m || { slot: i, name: 'Empty', level: 0, prestige: 0, ascension: 0, lastSaved: 0, hasData: false });
    }
    return slots;
  };
  SM.saveGame = function(slot, data) {
    data.colonyName = data.colonyName || ('Colony ' + (slot + 1));
    data.lastSaveTime = Date.now();
    data.slot = slot;
    try { localStorage.setItem(SAVE_KEYS[slot], JSON.stringify(data)); } catch(e) {}
    return true;
  };
  SM.loadGame = function(slot) {
    try {
      var r = localStorage.getItem(SAVE_KEYS[slot]);
      return r ? JSON.parse(r) : null;
    } catch(e) { return null; }
  };
  SM.deleteSlot = function(slot) {
    try { localStorage.removeItem(SAVE_KEYS[slot]); } catch(e) {}
    return true;
  };
  SM.getLastSlot = function() {
    var best = -1, bestTime = 0;
    for (var i = 0; i < 3; i++) {
      var m = SM.getSlotMeta(i);
      if (m && m.hasData && m.lastSaved > bestTime) { bestTime = m.lastSaved; best = i; }
    }
    return best;
  };
})(SaveManager);

var currentSlot = 0;
var state = {
  colonyName: "Colony 1", food: 60, gems: 0, foodCap: 60, level: 1, xp: 0, xpToNext: 40, eggs: 0,
  eggLayTime: 10, hatchTime: 10,
  workerCount: 4, soldierCount: 0, scoutCount: 0, lastTime: 0, lastSaveTime: 0,
  chambers: { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 },
              soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 }, royal: { count: 0 } },
  deadSoldiers: 0, soldierRespawnTimer: 0,
  upgrades: { soldierDamage: 0, workerSpeed: 0, eggLayTime: 0, foodCap: 0 },
  gemUpgrades: {},
  expansionTrips: 0, unlockedZones: 0,
  rallyActive: false, rallyTimer: 0, rallyCooldown: 0,
  waveActive: false, waveTimer: 35, waveSpidersRemaining: 0,
  surgeActive: false, surgeTimer: 0,
  eventActive: false, eventTimer: 0,
  weatherActive: false, weatherTimer: 0, weatherType: null, weatherTimeLeft: 0,
  isNight: false, rareAntCount: 0, nestEvolutionLevel: 0,
  totalHatched: 0, totalKills: 0, totalGemsEarned: 0,
  achievementsClaimed: {},
  dailyStreak: 0, lastLoginDay: "", earlyGameBoost: 300,
  survivedNight: 0, rallyUses: 0, surgesCollected: 0, virtualWorkers: 0,
  evolution: { worker: 0, soldier: 0, scout: 0 },
  bossActive: false, bossTimer: 0, bossHealth: 0, bossMaxHealth: 0, currentBoss: null, bossKills: 0, bossType: null,
  prestigeCount: 0, prestigePoints: 0,
  prestigeUpgrades: { ppFood: 0, ppSpeed: 0, ppHatch: 0, ppCap: 0, ppGem: 0, ppBoss: 0 },
  prestigeFoodBonus: 0,
  currentZone: "forest", unlockedZonesList: ["forest"], workerRebalanceTimer: 300,
  preWeatherZone: null, preWeatherBg: null, preWeatherFog: null,
  speedBoostTimer: 0, luckyHourTimer: 0, defenseBannerTimer: 0,
  beetleKills: 0, waspKills: 0, tutorialsShown: {}, lastSaveTime: 0,
  queenClicks: 0, prestigeStartTime: 0, prestigeStartLevel: 0,
  dailyChallengeDate: "", dailyChallengeIds: [],
  dailyProgress: { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 },
  lifetimeStats: { totalFood: 0, totalHatched: 0, totalKills: 0, totalBossKills: 0, totalPrestiges: 0, totalPlayTime: 0, totalGems: 0, totalRallies: 0, totalSurges: 0, totalNights: 0, fastestPrestige: 0 },
  ascensionCount: 0, ascensionPoints: 0,
  ascensionUpgrades: { goldenQueen: 0, eternalHatch: 0, monarchMight: 0, elderWisdom: 0 },
  caveBossKills: 0, swampBossKills: 0, mountainBossKills: 0,
  hasAscended: false,

  // Engagement systems
  buildQueue: [],
  prestigeGoal: null,
  prestigeGoalSelected: false,
  eventChoices: [],
  eventChoiceActive: false,

  // New systems
  researchBonuses: {
    foodPerTrip: 0,
    soldierHealth: 0,
    soldierDamage: 0,
    discoveryChance: 0,
    zoneTripReduction: 0,
    eggLayReduction: 0,
    scoutSpeed: 0,
    foodCap: 0,
    poisonResist: false,
    queensWrathUnlocked: false,
    pheromoneShieldUnlocked: false
  },
  completedResearch: [],
  queensWrathActive: false,
  queensWrathTimer: 0,
  queenProtected: false,
  _royalGroups: [],
  bossFightTimer: 0,
  _bossMilestonesHit: {},
  _bossRetreatTimer: 0,
  _lastBossStealTime: 0,

  // ===== TERRITORY SYSTEM (new) =====
  territoriesClaimed: [],          // [{ id, zone, pos:{x,y,z}, resourceType, level, claimedAt, assignedWorkers, assignedSoldiers }]
  territoryUnlockCost: 100,        // base food cost to claim a new territory
  territoryPassiveTimer: 0,        // accumulates dt for resource ticks
  territoryScoutQueue: []          // queue of territories to be discovered by scouts
};
var queenScale = BAL.queenBaseScale;
state.lastTime = performance.now();
state.lastSaveTime = Date.now();
state.foodCap = BAL.baseFoodCap;
state.eggLayTime = BAL.baseEggLayTime;
state.surgeTimer = BAL.surgeIntervalMin + Math.random() * (BAL.surgeIntervalMax - BAL.surgeIntervalMin);
state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
state.weatherTimer = BAL.weatherIntervalMin + Math.random() * (BAL.weatherIntervalMax - BAL.weatherIntervalMin);
state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
state.xpToNext = Math.floor(40 * Math.pow(1.15, state.level - 1));

// Reset state to fresh default (used when starting a new colony)
function resetStateToDefault(slot) {
  var prevGemUpgrades = state.gemUpgrades;
  state.colonyName = "Colony " + (slot + 1);
  state.food = BAL.baseFoodCap; state.gems = 0; state.foodCap = BAL.baseFoodCap;
  state.level = 1; state.xp = 0; state.xpToNext = Math.floor(40 * Math.pow(1.15, 0));
  state.eggs = 0; state.workerCount = 4; state.soldierCount = 0; state.scoutCount = 0;
  state.lastTime = performance.now(); state.lastSaveTime = Date.now();
  state.chambers = { foodStorage: { count: 0, bonusCap: 0 }, nursery: { count: 0, hatchReduction: 0 },
                     soldier: { count: 0 }, research: { count: 0 }, scout: { count: 0 }, royal: { count: 0 } };
  state.deadSoldiers = 0; state.soldierRespawnTimer = 0;
  state.upgrades = { soldierDamage: 0, workerSpeed: 0, eggLayTime: 0, foodCap: 0 };
  state.gemUpgrades = prevGemUpgrades;
  state.expansionTrips = 0; state.unlockedZones = 0;
  state.rallyActive = false; state.rallyTimer = 0; state.rallyCooldown = 0;
  state.waveActive = false; state.waveTimer = 35; state.waveSpidersRemaining = 0;
  state.surgeActive = false; state.surgeTimer = BAL.surgeIntervalMin + Math.random() * (BAL.surgeIntervalMax - BAL.surgeIntervalMin);
  state.eventActive = false; state.eventTimer = BAL.eventIntervalMin + Math.random() * (BAL.eventIntervalMax - BAL.eventIntervalMin);
  state.weatherActive = false; state.weatherTimer = BAL.weatherIntervalMin + Math.random() * (BAL.weatherIntervalMax - BAL.weatherIntervalMin);
  state.weatherType = null; state.weatherTimeLeft = 0;
  state.isNight = false; state.rareAntCount = 0; state.nestEvolutionLevel = 0;
  state.totalHatched = 0; state.totalKills = 0; state.totalGemsEarned = 0;
  state.achievementsClaimed = {};
  state.dailyStreak = 0; state.lastLoginDay = ""; state.earlyGameBoost = BAL.earlyGameBoostDuration;
  state.survivedNight = 0; state.rallyUses = 0; state.surgesCollected = 0; state.virtualWorkers = 0;
  state.evolution = { worker: 0, soldier: 0, scout: 0 };
  state.bossActive = false; state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  state.bossHealth = 0; state.bossMaxHealth = 0; state.currentBoss = null; state.bossKills = 0; state.bossType = null;
  state.prestigeCount = 0; state.prestigePoints = 0;
  state.prestigeUpgrades = { ppFood: 0, ppSpeed: 0, ppHatch: 0, ppCap: 0, ppGem: 0, ppBoss: 0 };
  state.prestigeFoodBonus = 0;
  state.currentZone = "forest"; state.unlockedZonesList = ["forest"];
  state.preWeatherZone = null; state.preWeatherBg = null; state.preWeatherFog = null;
  state.speedBoostTimer = 0; state.luckyHourTimer = 0; state.defenseBannerTimer = 0;
  state.beetleKills = 0; state.waspKills = 0; state.tutorialsShown = {};
  state.queenClicks = 0; state.prestigeStartTime = 0; state.prestigeStartLevel = 0;
  state.dailyChallengeDate = ""; state.dailyChallengeIds = [];
  state.dailyProgress = { hatch5: 0, kill8: 0, food300: 0, rally2: 0, boss1: 0, zone1: 0, upgrade1: 0, build1: 0, rare1: 0, night1: 0 };
  state.lifetimeStats = { totalFood: 0, totalHatched: 0, totalKills: 0, totalBossKills: 0, totalPrestiges: 0, totalPlayTime: 0, totalGems: 0, totalRallies: 0, totalSurges: 0, totalNights: 0, fastestPrestige: 0 };
  state.ascensionCount = 0; state.ascensionPoints = 0;
  state.ascensionUpgrades = { goldenQueen: 0, eternalHatch: 0, monarchMight: 0, elderWisdom: 0 };
  state.caveBossKills = 0; state.swampBossKills = 0; state.mountainBossKills = 0;
  state.hasAscended = false;
  queenScale = BAL.queenBaseScale;
  if (!state.bossTimer || state.bossTimer <= 0) {
    state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  }
  // Engagement reset
  state.buildQueue = [];
  state.prestigeGoal = null;
  state.prestigeGoalSelected = false;
  state.eventChoices = [];
  state.eventChoiceActive = false;
  // New systems reset
  state.researchBonuses = {
    foodPerTrip: 0, soldierHealth: 0, soldierDamage: 0, discoveryChance: 0,
    zoneTripReduction: 0, eggLayReduction: 0, scoutSpeed: 0, foodCap: 0,
    poisonResist: false, queensWrathUnlocked: false, pheromoneShieldUnlocked: false
  };
  state.completedResearch = [];
  state.queensWrathActive = false;
  state.queensWrathTimer = 0;
  state.queenProtected = false;
  state._royalGroups = [];
  state.bossFightTimer = 0;
  state._bossMilestonesHit = {};
  state._bossRetreatTimer = 0;
  state._lastBossStealTime = 0;
  // Territory reset
  state.territoriesClaimed = [];
  state.territoryUnlockCost = 100;
  state.territoryPassiveTimer = 0;
  state.territoryScoutQueue = [];
  recalculateHatchTime();
  updateEggLayTime();
  recalculateFoodCap();
}

// Achievement validation
function validateAchievements() {
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var ach = ACHIEVEMENTS[i];
    var claimed = state.achievementsClaimed[ach.id];
    if (claimed !== undefined) {
      var num = Number(claimed);
      if (isNaN(num)) num = 0;
      num = Math.floor(num);
      if (num < 0) num = 0;
      if (num > ach.tiers.length) num = ach.tiers.length;
      state.achievementsClaimed[ach.id] = num;
    } else {
      state.achievementsClaimed[ach.id] = 0;
    }
  }
}

// --- Dynamic recalculations ---
function recalculateHatchTime() {
  var base = BAL.baseHatchTime;
  if (state.gemUpgrades.rapidHatch) base -= 4;
  if (state.prestigeUpgrades.ppHatch) base -= state.prestigeUpgrades.ppHatch;
  if (state.evolution.worker >= 3) base -= EVOLUTION_TREE.worker.tiers[2].effect.hatchReduction;
  base -= state.chambers.nursery.hatchReduction;
  if (state.ascensionUpgrades.eternalHatch > 0) base = 0;
  if (state.food / state.foodCap > BAL.foodHighThreshold) { base *= (1 - BAL.foodTensionHatchBoost); }
  state.hatchTime = Math.max(0, base);
}
function updateEggLayTime() {
  var extra = Math.max(0, state.workerCount - 4);
  var blessing = state.gemUpgrades.queenBless ? 5 : 0;
  var baseTime = state.earlyGameBoost > 0 ? BAL.baseEggLayTime * BAL.earlyGameEggMultiplier : BAL.baseEggLayTime;
  if (state.researchBonuses.eggLayReduction > 0) baseTime *= (1 - state.researchBonuses.eggLayReduction);
  if (state.food / state.foodCap > BAL.foodHighThreshold) { baseTime *= (1 - BAL.foodTensionHatchBoost); }
  state.eggLayTime = Math.max(2, baseTime + extra * BAL.eggLayTimePerWorker - state.upgrades.eggLayTime * UPGRADES.eggLayTime.effect - blessing);
}
function recalculateFoodCap() {
  state.foodCap = BAL.baseFoodCap + state.chambers.foodStorage.bonusCap + state.upgrades.foodCap * UPGRADES.foodCap.effect + (state.level - 1) * 25 + (state.prestigeUpgrades.ppCap || 0) * 50;
  if (state.gemUpgrades.deepStorage) state.foodCap += 300;
  if (state.researchBonuses && state.researchBonuses.foodCap) state.foodCap += state.researchBonuses.foodCap;
  // Zone exploration bonus: +30 per unlocked zone
  if (state.unlockedZonesList) state.foodCap += state.unlockedZonesList.length * 30;
  // Territory bonus: +50 per claimed territory
  if (state.territoriesClaimed) state.foodCap += state.territoriesClaimed.length * 50;
}
function getUpgradeCost(type) {
  var upg = UPGRADES[type];
  return Math.floor(upg.baseCost * Math.pow(upg.costMult, state.upgrades[type]));
}
function getEffectiveChamberCost(baseCost) {
  if (state.evolution.worker >= 2) return Math.floor(baseCost * (1 - EVOLUTION_TREE.worker.tiers[1].effect.buildDiscount));
  return baseCost;
}
function getStorageCost() {
  return Math.floor(BAL.storageCost * (1 + state.chambers.foodStorage.count * BAL.storageCostMult));
}
function getEffectiveFoodPerTrip() {
  var base = BAL.foodPerTrip + (state.prestigeUpgrades.ppFood || 0) + (state.prestigeFoodBonus || 0);
  if (state.gemUpgrades.goldenSkin) base += 1;
  if (state.evolution.worker >= 1) base += EVOLUTION_TREE.worker.tiers[0].effect.foodBonus;
  if (state.researchBonuses.foodPerTrip > 0) base += state.researchBonuses.foodPerTrip;
  var mult = Math.pow(BAL.ascensionMultiplierFood, state.ascensionCount);
  return base * mult;
}
function getEffectiveWorkerSpeed() {
  var base = 1.6 * (1 + state.upgrades.workerSpeed * UPGRADES.workerSpeed.effect);
  if (state.prestigeUpgrades.ppSpeed) base *= 1 + state.prestigeUpgrades.ppSpeed * 0.1;
  if (state.speedBoostTimer > 0) base *= 2;
  if (state.ascensionUpgrades.goldenQueen > 0) base *= 2;
  var foodRatio = state.food / Math.max(1, state.foodCap);
  if (foodRatio < BAL.foodLowThreshold) {
    base *= (BAL.foodTensionMaxSlowdown + (1 - BAL.foodTensionMaxSlowdown) * (foodRatio / BAL.foodLowThreshold));
  }
  return base;
}
function getEffectiveScoutSpeed() {
  var base = 1.2;
  if (state.evolution.scout >= 1) base += EVOLUTION_TREE.scout.tiers[0].effect.speedBonus;
  if (state.prestigeUpgrades.ppSpeed) base *= 1 + state.prestigeUpgrades.ppSpeed * 0.1;
  if (state.ascensionUpgrades.goldenQueen > 0) base *= 2;
  if (state.researchBonuses.scoutSpeed > 0) base += state.researchBonuses.scoutSpeed;
  return base;
}
function getEffectiveSoldierDamage() {
  var base = BAL.soldierDamage + state.upgrades.soldierDamage * UPGRADES.soldierDamage.effect;
  if (state.gemUpgrades.antStrength) base += 4;
  if (state.evolution.soldier >= 2) base += EVOLUTION_TREE.soldier.tiers[1].effect.damageBonus;
  if (state.researchBonuses.soldierDamage > 0) base += state.researchBonuses.soldierDamage;
  var mult = Math.pow(BAL.ascensionMultiplierDamage, state.ascensionCount);
  return base * mult;
}
function getEffectiveSoldierMaxHealth() {
  var base = BAL.soldierHealth;
  if (state.gemUpgrades.soldierArmor) base += 30;
  if (state.evolution.soldier >= 1) base += EVOLUTION_TREE.soldier.tiers[0].effect.healthBonus;
  if (state.researchBonuses.soldierHealth > 0) base += state.researchBonuses.soldierHealth;
  return base;
}
function getEffectiveGuardRadius() {
  var base = BAL.spiderGuardRadius;
  if (state.evolution.soldier >= 3) base += EVOLUTION_TREE.soldier.tiers[2].effect.guardRadiusBonus;
  return base;
}
function getEffectiveGemChance() {
  var base = BAL.scoutGemChance;
  if (state.gemUpgrades.gemMagnet) base += 0.15;
  if (state.prestigeUpgrades.ppGem) base += state.prestigeUpgrades.ppGem * 0.1;
  if (state.evolution.scout >= 2) base += EVOLUTION_TREE.scout.tiers[1].effect.gemChanceBonus;
  var mult = Math.pow(BAL.ascensionMultiplierGem, state.ascensionCount);
  return base * mult;
}
function getRareAntChance() {
  var base = BAL.rareAntChance;
  if (state.gemUpgrades.luckyAnt) base += 0.1;
  if (state.luckyHourTimer > 0) base *= 2;
  return base;
}
function getCurrentZoneConfig() {
  var cfg = ZONE_CONFIG[state.currentZone];
  if (!cfg) return ZONE_CONFIG.forest;
  if (cfg.prestigeReq && state.prestigeCount < cfg.prestigeReq) return ZONE_CONFIG.forest;
  return cfg;
}

// Temporary state cleanup (prestige/ascension)
function resetWeatherAndBoosts() {
  state.speedBoostTimer = 0;
  state.luckyHourTimer = 0;
  state.defenseBannerTimer = 0;
  state.weatherActive = false; state.weatherTimeLeft = 0; state.weatherType = null; state.isNight = false;
  for (var ri = 0; ri < rainDrops.length; ri++) rainDrops[ri].visible = false;
  for (var mi = 0; mi < mushroomMeshes.length; mi++) mushroomMeshes[mi].visible = false;
  for (var mi = 0; mi < mushroomLights.length; mi++) { mushroomLights[mi].visible = false; mushroomLights[mi].intensity = 0; }
  if (typeof sLight !== 'undefined') sLight.intensity = 1.3;
  if (typeof hLight !== 'undefined') hLight.intensity = 1;
}

// Save / Load helpers
function saveGame() {
  if (currentSlot < 0 || currentSlot > 2) return;
  state.lastSaveTime = Date.now();
  SaveManager.saveGame(currentSlot, state);
}
function loadGameData(data) {
  if (!data) return;
  var nk = ["food","gems","foodCap","level","xp","xpToNext","eggs","workerCount","soldierCount","scoutCount","deadSoldiers","expansionTrips","unlockedZones","rareAntCount","nestEvolutionLevel","totalHatched","totalKills","totalGemsEarned","dailyStreak","earlyGameBoost","survivedNight","rallyUses","surgesCollected","virtualWorkers","bossKills","bossTimer","beetleKills","waspKills","prestigeCount","prestigePoints","colonyName","queenClicks","prestigeStartTime","prestigeStartLevel","prestigeFoodBonus"];
  for (var i = 0; i < nk.length; i++) { var k = nk[i]; if (data[k] !== undefined) state[k] = data[k]; }
  if (data.chambers) state.chambers = data.chambers;
  if (!state.chambers.royal) state.chambers.royal = { count: 0 };
  if (data.upgrades) state.upgrades = data.upgrades;
  if (data.gemUpgrades) state.gemUpgrades = data.gemUpgrades;
  if (data.achievementsClaimed) {
    var migrated = {};
    for (var key in data.achievementsClaimed) {
      if (typeof data.achievementsClaimed[key] === 'boolean') migrated[key] = data.achievementsClaimed[key] ? 1 : 0;
      else migrated[key] = data.achievementsClaimed[key];
    }
    state.achievementsClaimed = migrated;
  }
  var oldToNew = { hatch10: "hatch", kill10: "spider", level5: "level", food1k: "storage", hatch50: "hatch", kill50: "spider", level15: "level", allChambers: "builder", hatch100: "hatch", level30: "level", rare3: "rare", garden: "explorer", nightOwl: "night", speedDemon: "speed", surgeMaster: "surge", gem20: "gem", boss1: "boss", prestige1: "prestige" };
  for (var oldKey in oldToNew) {
    var newKey = oldToNew[oldKey];
    if (state.achievementsClaimed[oldKey] && !state.achievementsClaimed[newKey]) {
      state.achievementsClaimed[newKey] = state.achievementsClaimed[oldKey];
      delete state.achievementsClaimed[oldKey];
    }
  }
  validateAchievements();
  if (data.queenScale !== undefined) queenScale = data.queenScale;
  if (data.lastLoginDay !== undefined) state.lastLoginDay = data.lastLoginDay;
  if (data.lastSaveTime) state.lastSaveTime = data.lastSaveTime;
  if (data.evolution) state.evolution = data.evolution;
  if (data.prestigeUpgrades) state.prestigeUpgrades = data.prestigeUpgrades;
  if (data.currentZone) state.currentZone = data.currentZone;
  if (data.unlockedZonesList) state.unlockedZonesList = data.unlockedZonesList;
  if (data.bossTimer !== undefined) state.bossTimer = data.bossTimer;
  if (!state.bossTimer || state.bossTimer <= 0) {
    state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  }
  if (data.tutorialsShown) state.tutorialsShown = data.tutorialsShown;
  if (data.lifetimeStats) state.lifetimeStats = data.lifetimeStats;
  if (data.dailyChallengeDate) state.dailyChallengeDate = data.dailyChallengeDate;
  if (data.dailyChallengeIds) state.dailyChallengeIds = data.dailyChallengeIds;
  if (data.dailyProgress) state.dailyProgress = data.dailyProgress;
  if (data.ascensionCount !== undefined) state.ascensionCount = data.ascensionCount;
  if (data.ascensionPoints !== undefined) state.ascensionPoints = data.ascensionPoints;
  if (data.ascensionUpgrades) state.ascensionUpgrades = data.ascensionUpgrades;
  if (data.hasAscended !== undefined) state.hasAscended = data.hasAscended;
  if (data.caveBossKills !== undefined) state.caveBossKills = data.caveBossKills;
  if (data.swampBossKills !== undefined) state.swampBossKills = data.swampBossKills;
  if (data.mountainBossKills !== undefined) state.mountainBossKills = data.mountainBossKills;
  if (data.bossKillsByType) state.bossKillsByType = data.bossKillsByType;
  if (data.speedBoostTimer !== undefined) state.speedBoostTimer = data.speedBoostTimer;
  if (data.luckyHourTimer !== undefined) state.luckyHourTimer = data.luckyHourTimer;
  if (data.defenseBannerTimer !== undefined) state.defenseBannerTimer = data.defenseBannerTimer;
  // Engagement systems
  if (data.buildQueue) state.buildQueue = data.buildQueue;
  else state.buildQueue = [];
  state.prestigeGoal = data.prestigeGoal || null;
  state.prestigeGoalSelected = data.prestigeGoalSelected || false;
  state.eventChoices = [];
  state.eventChoiceActive = false;
  // New systems
  if (data.researchBonuses) state.researchBonuses = data.researchBonuses;
  if (data.completedResearch) state.completedResearch = data.completedResearch;
  state.queensWrathActive = data.queensWrathActive || false;
  state.queensWrathTimer = data.queensWrathTimer || 0;
  state.queenProtected = false;
  state._royalGroups = [];
  state.bossFightTimer = 0;
  state._bossMilestonesHit = {};
  state._bossRetreatTimer = 0;
  state._lastBossStealTime = 0;
  // Territory load
  if (data.territoriesClaimed) state.territoriesClaimed = data.territoriesClaimed;
  if (data.territoryUnlockCost !== undefined) state.territoryUnlockCost = data.territoryUnlockCost;
  if (data.territoryPassiveTimer !== undefined) state.territoryPassiveTimer = data.territoryPassiveTimer;
  if (data.territoryScoutQueue) state.territoryScoutQueue = data.territoryScoutQueue;
  state.xpToNext = Math.floor(40 * Math.pow(1.15, state.level - 1));
  recalculateHatchTime();
  updateEggLayTime();
  recalculateFoodCap();
}

// Core resource functions
function addFood(amount, wp) {
  amount = Math.floor(amount);
  if (amount <= 0) return;
  state.food = Math.min(state.food + amount, state.foodCap);
  state.lifetimeStats.totalFood = (state.lifetimeStats.totalFood || 0) + amount;
  updateDailyProgress('food300', amount);
  if (wp) {
    spawnFloater("+" + amount + "🌾", window.innerWidth/2, window.innerHeight/2, "#ffd27a");
    emitParticles(wp, 4, 0xffd27a, 0.04, 0.5, 0.3);
  }
}
function addGems(amount) {
  amount = Math.floor(amount);
  if (amount <= 0) return;
  state.gems += amount;
  state.totalGemsEarned += amount;
  state.lifetimeStats.totalGems = (state.lifetimeStats.totalGems || 0) + amount;
  showToast("+" + amount + "💎");
      }
