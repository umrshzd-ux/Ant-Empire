// ===== CONFIGURATION & BALANCE CONSTANTS (ENGAGEMENT UPDATE) =====

var BAL = {
  baseEggLayTime: 10, eggLayTimePerWorker: 2.5, baseHatchTime: 10, foodPerTrip: 3, foodPerTripDiminished: 1, baseFoodCap: 60,
  foodCapPerStorage: 50, storageCost: 60, storageCostMult: 0.25, maxStorage: 8, nurseryCost: 100,
  soldierChamberCost: 150, researchChamberCost: 200, scoutChamberCost: 180,
  soldierHealth: 55, soldierDamage: 10, soldierAttackCD: 1.0, soldierRegenDelay: 5, soldierRegenRate: 0.5, soldierRespawnTime: 25,
  spiderHealth: 30, spiderDamage: 6, spiderAttackCD: 1.4, spiderSpeed: 0.35, spiderStealMin: 8, spiderStealMax: 15, spiderFleeDistance: 9,
  workerFleeRange: 3.5, maxEnemies: 8, waveIntervalMin: 60, waveIntervalMax: 90, waveSpidersMin: 2, waveSpidersMax: 5,
  rallyDuration: 15, rallyCooldown: 120, rallySpeedMultiplier: 2, surgeIntervalMin: 60, surgeIntervalMax: 90, surgeDuration: 12, surgeEggs: 2,
  scoutRewardMin: 4, scoutRewardMax: 8, scoutGemChance: 0.25, expansionTripsNeeded: 15, maxRenderedAnts: 50,
  workerBaseScale: 1.2, workerScalePerUpgrade: 0.12, soldierMandibleBaseThickness: 0.03, soldierMandibleScalePerUpgrade: 0.012,
  queenBaseScale: 3.5, queenScalePer5Levels: 0.25, eventIntervalMin: 120, eventIntervalMax: 180, rareAntChance: 0.05,
  weatherIntervalMin: 70, weatherIntervalMax: 110, weatherDuration: 25, nestEvolveLevels: [4, 8, 14, 22, 32, 45, 60],
  offlineEfficiency: 0.6, gemPerLevel: 1, earlyGameBoostDuration: 300, earlyGameEggMultiplier: 0.7, virtualFoodPerSecond: 0.15,
  maxNursery: 3, maxSoldierChambers: 5, maxScoutChambers: 3, soldierRowStart: 10, researchRowStart: 16, scoutRowStart: 22,
  spiderSneakChance: 0.1, spiderGuardRadius: 2.5, bossIntervalMin: 1500, bossIntervalMax: 2100,
  bossHealthQueen: 250, bossHealthBeetle: 400, bossHealthWasp: 150, bossDamageQueen: 15, bossDamageBeetle: 10, bossDamageWasp: 20,
  bossSpeedQueen: 0.6,
  bossSpeedBeetle: 0.4,
  bossSpeedWasp: 0.8,
  bossRewardFood: 80, bossRewardGems: 5, summonCost: 5,
  prestigeLevelReq: 30, prestigePPPerLevel: 0.5, prestigeBasePP: 3, workerRebalanceInterval: 300,
  speedBoostDuration: 300, evolutionUnlockLevel: 8,
  ascendUnlockPrestige: 100,
  ascensionMultiplierFood: 1.10,
  ascensionMultiplierDamage: 1.05,
  ascensionMultiplierGem: 1.05,
  ascensionMultiplierHatch: 0.95,
  bossHealthCentipede: 300, bossDamageCentipede: 18, bossSpeedCentipede: 0.55,
  bossHealthHydra: 350, bossDamageHydra: 14, bossSpeedHydra: 0.35,
  bossHealthWyrm: 400, bossDamageWyrm: 22, bossSpeedWyrm: 0.5,

  // Build Queue times (seconds per chamber)
  buildTimes: {
    foodStorage: 5,
    nursery: 8,
    soldier: 7,
    research: 10,
    scout: 6
  },
  // Food tension thresholds
  foodLowThreshold: 0.2,
  foodHighThreshold: 0.8,
  foodTensionMaxSlowdown: 0.5,
  foodTensionHatchBoost: 0.2
};

// Boss tier lookup for defeat penalties
var BOSS_TIER = {
  beetle:    1,
  wasp:      2,
  centipede: 3,
  hydra:     4,
  wyrm:      5
};
var BOSS_DEFEAT_PENALTY_BASE = 0.10;   // tier 1 takes 10%
var BOSS_DEFEAT_PENALTY_STEP = 0.05;   // +5% per tier above 1
var BOSS_DEFEAT_PENALTY_MAX  = 0.35;   // hard cap

var UPGRADES = {
  soldierDamage: { name: "Soldier Might", baseCost: 120, maxLevel: 10, effect: 4, costMult: 1.8 },
  workerSpeed: { name: "Worker Haste", baseCost: 100, maxLevel: 10, effect: 0.12, costMult: 1.7 },
  eggLayTime: { name: "Queen Fertility", baseCost: 150, maxLevel: 10, effect: 1.2, costMult: 1.9 },
  foodCap: { name: "Storage Expansion", baseCost: 90, maxLevel: 10, effect: 40, costMult: 1.6 }
};

var GEM_ITEMS = {
  goldenEgg:    { name: "Golden Egg",       desc: "+1 golden worker",                     cost: 50, category: "permanent", oneTime: true },
  soldierArmor: { name: "Soldier Armor",    desc: "+30 HP to all soldiers",               cost: 40, category: "permanent", oneTime: true },
  queenBless:   { name: "Queen's Blessing", desc: "-5s egg lay time",                     cost: 35, category: "permanent", oneTime: true },
  scoutMap:     { name: "Scout's Map",      desc: "Scouts bring +5 food/trip",            cost: 30, category: "permanent", oneTime: true },
  goldenSkin:   { name: "Golden Skin",      desc: "Workers golden, +1 food/trip",         cost: 45, category: "permanent", oneTime: true },
  antStrength:  { name: "Ant Strength",     desc: "+4 soldier damage",                    cost: 35, category: "permanent", oneTime: true },
  deepStorage:  { name: "Deep Storage",     desc: "+300 food capacity",                   cost: 25, category: "permanent", oneTime: true },
  gemMagnet:    { name: "Gem Magnet",       desc: "+15% scout gem chance",                cost: 60, category: "permanent", oneTime: true },
  rapidHatch:   { name: "Rapid Hatch",      desc: "-4s base hatch time",                  cost: 50, category: "permanent", oneTime: true },
  luckyAnt:     { name: "Lucky Ant",        desc: "+10% rare ant chance",                 cost: 40, category: "permanent", oneTime: true },
  shadowSkin:       { name: "Shadow Skin",       desc: "Workers dark grey",               cost: 60,  category: "skin", oneTime: true },
  fireSkin:         { name: "Fire Skin",         desc: "Workers orange/red",              cost: 60,  category: "skin", oneTime: true },
  iceSkin:          { name: "Ice Skin",          desc: "Workers blue/white",              cost: 60,  category: "skin", oneTime: true },
  rainbowSkin:      { name: "Rainbow Skin",      desc: "Workers cycling colours",         cost: 200, category: "skin", oneTime: true },
  glowingNest:      { name: "Glowing Nest",      desc: "Nest emits soft glow",            cost: 80,  category: "skin", oneTime: true },
  crystalEntrance:  { name: "Crystal Entrance",  desc: "Nest rim becomes crystal",        cost: 120, category: "skin", oneTime: true },
  royalCarpet:      { name: "Royal Carpet",      desc: "Trail leading to nest",           cost: 100, category: "skin", oneTime: true },
  goldenSparkles:   { name: "Golden Sparkles",   desc: "Workers leave golden sparkles",   cost: 150, category: "skin", oneTime: true },
  speedBoost:    { name: "Speed Boost",    desc: "2× worker speed (5 min)",              cost: 15, category: "consumable", oneTime: false },
  instantHatch:  { name: "Insta-Hatch",    desc: "Hatch all eggs instantly",             cost: 10, category: "consumable", oneTime: false },
  foodCrate:     { name: "Food Crate",     desc: "Instantly gain 500 food",              cost: 8,  category: "consumable", oneTime: false },
  bossLure:      { name: "Boss Lure",      desc: "Summon a boss immediately",            cost: 20, category: "consumable", oneTime: false },
  weatherCharm:  { name: "Weather Charm",  desc: "End current rain/night",               cost: 10, category: "consumable", oneTime: false },
  rallyCharge:   { name: "Rally Charge",   desc: "Reset rally cooldown",                 cost: 12, category: "consumable", oneTime: false },
  luckyHour:     { name: "Lucky Hour",     desc: "Double rare ant chance (5 min)",       cost: 18, category: "consumable", oneTime: false },
  defenseBanner: { name: "Defense Banner", desc: "Soldiers take 50% damage (3 min)",     cost: 25, category: "consumable", oneTime: false }
};

var DAILY_REWARDS = [
  { day: 1, gems: 1 }, { day: 2, gems: 1 }, { day: 3, gems: 2 }, { day: 4, gems: 2 },
  { day: 5, gems: 3 }, { day: 6, gems: 3 }, { day: 7, gems: 5, special: true, bonusItem: "goldenEgg" }
];

var ACHIEVEMENTS = [
  { id: "hatch", name: "Hatch Master", icon: "🐣", tier: "bronze", hidden: false, tiers: [
    { req: 10, desc: "Hatch 10 workers", reward: 2 }, { req: 50, desc: "Hatch 50 workers", reward: 5 },
    { req: 100, desc: "Hatch 100 workers", reward: 8 }, { req: 500, desc: "Hatch 500 workers", reward: 12 },
    { req: 1000, desc: "Hatch 1,000 workers", reward: 20 }, { req: 5000, desc: "Hatch 5,000 workers", reward: 30 },
    { req: 10000, desc: "Hatch 10,000 workers", reward: 50 }
  ]},
  { id: "spider", name: "Spider Slayer", icon: "🕷️", tier: "bronze", hidden: false, tiers: [
    { req: 10, desc: "Defeat 10 spiders", reward: 3 }, { req: 50, desc: "Defeat 50 spiders", reward: 8 },
    { req: 100, desc: "Defeat 100 spiders", reward: 12 }, { req: 500, desc: "Defeat 500 spiders", reward: 18 },
    { req: 1000, desc: "Defeat 1,000 spiders", reward: 25 }, { req: 5000, desc: "Defeat 5,000 spiders", reward: 40 }
  ]},
  { id: "boss", name: "Boss Hunter", icon: "💀", tier: "gold", hidden: false, tiers: [
    { req: 1, desc: "Defeat 1 boss", reward: 10 }, { req: 5, desc: "Defeat 5 bosses", reward: 15 },
    { req: 10, desc: "Defeat 10 bosses", reward: 20 }, { req: 25, desc: "Defeat 25 bosses", reward: 30 },
    { req: 50, desc: "Defeat 50 bosses", reward: 40 }, { req: 100, desc: "Defeat 100 bosses", reward: 60 }
  ]},
  { id: "level", name: "Colony Level", icon: "⭐", tier: "bronze", hidden: false, tiers: [
    { req: 5, desc: "Reach Level 5", reward: 1 }, { req: 15, desc: "Reach Level 15", reward: 5 },
    { req: 30, desc: "Reach Level 30", reward: 10 }, { req: 50, desc: "Reach Level 50", reward: 15 },
    { req: 75, desc: "Reach Level 75", reward: 25 }, { req: 100, desc: "Reach Level 100", reward: 40 }
  ]},
  { id: "storage", name: "Vast Storage", icon: "🌾", tier: "bronze", hidden: false, tiers: [
    { req: 1000, desc: "1,000 food capacity", reward: 5 }, { req: 5000, desc: "5,000 food capacity", reward: 10 },
    { req: 10000, desc: "10,000 food capacity", reward: 15 }, { req: 50000, desc: "50,000 food capacity", reward: 25 },
    { req: 100000, desc: "100,000 food capacity", reward: 40 }
  ]},
  { id: "prestige", name: "Prestige Journey", icon: "✨", tier: "gold", hidden: false, tiers: [
    { req: 1, desc: "Prestige 1 time", reward: 15 }, { req: 3, desc: "Prestige 3 times", reward: 20 },
    { req: 5, desc: "Prestige 5 times", reward: 30 }, { req: 10, desc: "Prestige 10 times", reward: 40 },
    { req: 25, desc: "Prestige 25 times", reward: 60 }, { req: 50, desc: "Prestige 50 times", reward: 100 }
  ]},
  { id: "builder", name: "Master Builder", icon: "🔨", tier: "silver", hidden: false, tiers: [
    { req: 1, desc: "Build all 5 chamber types", reward: 8 }
  ]},
  { id: "rare", name: "Rare Collector", icon: "💗", tier: "gold", hidden: false, tiers: [
    { req: 3, desc: "Hatch 3 rare ants", reward: 5 }, { req: 10, desc: "Hatch 10 rare ants", reward: 10 },
    { req: 25, desc: "Hatch 25 rare ants", reward: 20 }, { req: 50, desc: "Hatch 50 rare ants", reward: 35 }
  ]},
  { id: "gem", name: "Gem Hoarder", icon: "💎", tier: "silver", hidden: false, tiers: [
    { req: 20, desc: "Earn 20 gems total", reward: 3 }, { req: 100, desc: "Earn 100 gems total", reward: 8 },
    { req: 500, desc: "Earn 500 gems total", reward: 15 }, { req: 1000, desc: "Earn 1,000 gems total", reward: 25 },
    { req: 5000, desc: "Earn 5,000 gems total", reward: 40 }
  ]},
  { id: "explorer", name: "Explorer", icon: "🌿", tier: "gold", hidden: false, tiers: [
    { req: 1, desc: "Unlock Meadow", reward: 3 }, { req: 2, desc: "Unlock Forest Edge", reward: 5 },
    { req: 3, desc: "Unlock Riverside", reward: 8 }, { req: 4, desc: "Unlock Deep Woods", reward: 12 }
  ]},
  { id: "feast", name: "Feast King", icon: "🍞", tier: "silver", hidden: false, tiers: [
    { req: 10000, desc: "Earn 10K lifetime food", reward: 5 }, { req: 100000, desc: "Earn 100K lifetime food", reward: 10 },
    { req: 1000000, desc: "Earn 1M lifetime food", reward: 20 }, { req: 10000000, desc: "Earn 10M lifetime food", reward: 35 }
  ]},
  { id: "time", name: "Time Flies", icon: "⏰", tier: "silver", hidden: false, tiers: [
    { req: 3600, desc: "Play 1 hour", reward: 5 }, { req: 18000, desc: "Play 5 hours", reward: 10 },
    { req: 72000, desc: "Play 20 hours", reward: 20 }, { req: 360000, desc: "Play 100 hours", reward: 35 },
    { req: 1800000, desc: "Play 500 hours", reward: 60 }
  ]},
  { id: "rally", name: "Rally Captain", icon: "💨", tier: "silver", hidden: false, tiers: [
    { req: 10, desc: "Use Rally 10 times", reward: 5 }, { req: 50, desc: "Use Rally 50 times", reward: 10 },
    { req: 100, desc: "Use Rally 100 times", reward: 20 }, { req: 500, desc: "Use Rally 500 times", reward: 35 }
  ]},
  { id: "surge", name: "Surge Master", icon: "👑", tier: "gold", hidden: false, tiers: [
    { req: 5, desc: "Collect 5 Surges", reward: 8 }, { req: 25, desc: "Collect 25 Surges", reward: 15 },
    { req: 50, desc: "Collect 50 Surges", reward: 25 }, { req: 100, desc: "Collect 100 Surges", reward: 40 }
  ]},
  { id: "night", name: "Night Owl", icon: "🦉", tier: "silver", hidden: true, tiers: [
    { req: 1, desc: "Survive 1 night", reward: 5 }, { req: 5, desc: "Survive 5 nights", reward: 10 },
    { req: 10, desc: "Survive 10 nights", reward: 20 }, { req: 25, desc: "Survive 25 nights", reward: 35 }
  ]},
  { id: "speed", name: "Speed Demon", icon: "⚡", tier: "gold", hidden: true, tiers: [
    { req: 1, desc: "Prestige in under 2 hours", reward: 20 }, { req: 2, desc: "Prestige in under 1 hour", reward: 40 },
    { req: 3, desc: "Prestige in under 30 minutes", reward: 80 }
  ]},
  { id: "pacifist", name: "Pacifist", icon: "☮️", tier: "gold", hidden: true, tiers: [
    { req: 1, desc: "Reach Lv30 without Soldier Chamber", reward: 25 }
  ]},
  { id: "queenclick", name: "Queen's Favorite", icon: "👸", tier: "diamond", hidden: true, tiers: [
    { req: 100, desc: "Click the queen 100 times", reward: 10 }
  ]},
  { id: "weathervet", name: "Weather Veteran", icon: "🌦️", tier: "silver", hidden: true, tiers: [
    { req: 1, desc: "Experience 10 rain & 10 night cycles", reward: 15 }
  ]},
  { id: "golden", name: "Golden Army", icon: "🥇", tier: "gold", hidden: true, tiers: [
    { req: 3, desc: "Own 3 golden workers at once", reward: 20 }
  ]},
  { id: "beetle", name: "Beetle Crusher", icon: "🪲", tier: "silver", hidden: false, tiers: [
    { req: 25, desc: "Defeat 25 Beetle Tanks", reward: 25 }
  ]},
  { id: "wasp", name: "Wasp Swatter", icon: "🐝", tier: "silver", hidden: false, tiers: [
    { req: 25, desc: "Defeat 25 Wasp Swarms", reward: 25 }
  ]},
  { id: "cave", name: "Cave Explorer", icon: "🕳️", tier: "silver", hidden: false, tiers: [
    { req: 10, desc: "Defeat Cave Centipede 10 times", reward: 5 }, { req: 25, desc: "Defeat Cave Centipede 25 times", reward: 10 },
    { req: 50, desc: "Defeat Cave Centipede 50 times", reward: 15 }
  ]},
  { id: "swamp", name: "Swamp Survivor", icon: "🌿", tier: "silver", hidden: false, tiers: [
    { req: 10, desc: "Defeat Swamp Hydra 10 times", reward: 5 }, { req: 25, desc: "Defeat Swamp Hydra 25 times", reward: 10 },
    { req: 50, desc: "Defeat Swamp Hydra 50 times", reward: 15 }
  ]},
  { id: "mountain", name: "Mountain Conqueror", icon: "🏔️", tier: "silver", hidden: false, tiers: [
    { req: 10, desc: "Defeat Mountain Wyrm 10 times", reward: 5 }, { req: 25, desc: "Defeat Mountain Wyrm 25 times", reward: 10 },
    { req: 50, desc: "Defeat Mountain Wyrm 50 times", reward: 15 }
  ]},
  { id: "ascend1", name: "Ascension Novice", icon: "⬆️", tier: "gold", hidden: false, tiers: [
    { req: 1, desc: "Ascend 1 time", reward: 10 }, { req: 3, desc: "Ascend 3 times", reward: 20 },
    { req: 5, desc: "Ascend 5 times", reward: 30 }, { req: 10, desc: "Ascend 10 times", reward: 50 }
  ]},
  { id: "ascend2", name: "Eternal Monarch", icon: "👑", tier: "platinum", hidden: false, tiers: [
    { req: 5, desc: "Spend 5 AP in Ascension Shop", reward: 15 }, { req: 10, desc: "Spend 10 AP", reward: 25 },
    { req: 15, desc: "Spend 15 AP", reward: 40 }, { req: 20, desc: "Spend 20 AP", reward: 60 }
  ]},
  { id: "zoneMaster", name: "Master of All", icon: "🗺️", tier: "gold", hidden: false, tiers: [
    { req: 1, desc: "Unlock all 6 zones", reward: 20 }
  ]},
  { id: "poisonProof", name: "Poison Resistant", icon: "🛡️", tier: "silver", hidden: false, tiers: [
    { req: 50, desc: "Kill 50 Centipedes", reward: 10 }, { req: 200, desc: "Kill 200 Centipedes", reward: 20 }
  ]},
  { id: "regenerationSlayer", name: "Regeneration Slayer", icon: "⚔️", tier: "silver", hidden: false, tiers: [
    { req: 50, desc: "Kill 50 Hydras", reward: 10 }, { req: 200, desc: "Kill 200 Hydras", reward: 20 }
  ]},
  { id: "frostBreaker", name: "Frost Breaker", icon: "❄️", tier: "silver", hidden: false, tiers: [
    { req: 50, desc: "Kill 50 Wyrms", reward: 10 }, { req: 200, desc: "Kill 200 Wyrms", reward: 20 }
  ]},
  { id: "ascendFast", name: "Speed Ascender", icon: "⚡", tier: "gold", hidden: true, tiers: [
    { req: 1, desc: "Ascend within 24h of starting a fresh run", reward: 15 }, { req: 2, desc: "Ascend within 12h of starting", reward: 30 }
  ]},
  { id: "allBosses", name: "Boss Collector", icon: "💀", tier: "diamond", hidden: false, tiers: [
    { req: 1, desc: "Defeat every boss type at least once", reward: 25 }
  ]},
  { id: "endGame", name: "True Empire", icon: "🐜", tier: "diamond", hidden: false, tiers: [
    { req: 1, desc: "Reach Prestige 100 and Ascend at least once", reward: 50 }
  ]}
];

var DAILY_CHALLENGE_POOL = [
  { id: "hatch5", desc: "Hatch 5 eggs", getProgress: function() { return Math.min(1, (state.dailyProgress.hatch5 || 0) / 5); }, reward: 2, target: 5 },
  { id: "kill8", desc: "Defeat 8 spiders", getProgress: function() { return Math.min(1, (state.dailyProgress.kill8 || 0) / 8); }, reward: 3, target: 8 },
  { id: "food300", desc: "Collect 300 food", getProgress: function() { return Math.min(1, (state.dailyProgress.food300 || 0) / 300); }, reward: 2, target: 300 },
  { id: "rally2", desc: "Use Rally 2 times", getProgress: function() { return Math.min(1, (state.dailyProgress.rally2 || 0) / 2); }, reward: 3, target: 2 },
  { id: "boss1", desc: "Defeat a boss", getProgress: function() { return (state.dailyProgress.boss1 || 0) >= 1 ? 1 : 0; }, reward: 5, target: 1 },
  { id: "zone1", desc: "Switch zones 1 time", getProgress: function() { return (state.dailyProgress.zone1 || 0) >= 1 ? 1 : 0; }, reward: 2, target: 1 },
  { id: "upgrade1", desc: "Buy 1 upgrade", getProgress: function() { return (state.dailyProgress.upgrade1 || 0) >= 1 ? 1 : 0; }, reward: 3, target: 1 },
  { id: "build1", desc: "Build 1 chamber", getProgress: function() { return (state.dailyProgress.build1 || 0) >= 1 ? 1 : 0; }, reward: 2, target: 1 },
  { id: "rare1", desc: "Hatch a rare ant", getProgress: function() { return (state.dailyProgress.rare1 || 0) >= 1 ? 1 : 0; }, reward: 5, target: 1 },
  { id: "night1", desc: "Survive a night cycle", getProgress: function() { return (state.dailyProgress.night1 || 0) >= 1 ? 1 : 0; }, reward: 3, target: 1 }
];

var PRESTIGE_MILESTONES = [
  { prestige: 1, desc: "Unlock Prestige Shop", icon: "✨", effect: function() {} },
  { prestige: 3, desc: "Start with +1 Worker", icon: "🐜", effect: function() { state.workerCount += 1; } },
  { prestige: 5, desc: "Start with Nursery Lv1", icon: "🥚", effect: function() { state.chambers.nursery.count = 1; state.chambers.nursery.hatchReduction = 2; recalculateHatchTime(); } },
  { prestige: 10, desc: "Start with Soldier Chamber", icon: "🛡️", effect: function() { state.chambers.soldier.count = 1; state.soldierCount = 1; } },
  { prestige: 15, desc: "+10% food per trip", icon: "🌾", effect: function() { state.prestigeFoodBonus = (state.prestigeFoodBonus || 0) + 0.1; } },
  { prestige: 25, desc: "Start with Research Chamber", icon: "🔬", effect: function() { state.chambers.research.count = 1; } },
  { prestige: 35, desc: "Start with +2 Workers", icon: "🐜", effect: function() { state.workerCount += 2; } },
  { prestige: 50, desc: "Queen 2× size + all food +1", icon: "👑", effect: function() { queenScale = BAL.queenBaseScale * 2; if (qMesh) qMesh.scale.setScalar(queenScale); state.prestigeFoodBonus = (state.prestigeFoodBonus || 0) + 1; } },
  { prestige: 75, desc: "Start with Scout Chamber", icon: "🔍", effect: function() { state.chambers.scout.count = 1; state.scoutCount = 1; } },
  { prestige: 100, desc: "Golden Queen skin + 2× PP", icon: "✨", effect: function() {} }
];

var PRESTIGE_SHOP = [
  { id: "ppFood", name: "Eternal Harvest", desc: "Base food/trip +1", cost: 1, maxLevel: 5, icon: "🌾" },
  { id: "ppSpeed", name: "Swift Colony", desc: "Worker & Scout speed +10%", cost: 1, maxLevel: 5, icon: "💨" },
  { id: "ppHatch", name: "Rapid Hatching", desc: "Base hatch time -1s", cost: 1, maxLevel: 5, icon: "🥚" },
  { id: "ppCap", name: "Vast Storage", desc: "Base food cap +50", cost: 1, maxLevel: 5, icon: "📦" },
  { id: "ppGem", name: "Gem Magnet", desc: "+10% gem chance from scouts", cost: 2, maxLevel: 3, icon: "💎" },
  { id: "ppBoss", name: "Boss Hunter", desc: "+25% damage vs bosses", cost: 2, maxLevel: 3, icon: "💀" }
];

var ASCENSION_SHOP = [
  { id: "goldenQueen", name: "Golden Queen", desc: "All worker speeds ×2 permanently", cost: 1, maxLevel: 1, icon: "👑" },
  { id: "eternalHatch", name: "Eternal Hatch", desc: "Eggs hatch instantly (no timer)", cost: 2, maxLevel: 1, icon: "🥚" },
  { id: "monarchMight", name: "Monarch's Might", desc: "All boss rewards ×2 (food & gems)", cost: 2, maxLevel: 1, icon: "💀" },
  { id: "elderWisdom", name: "Elder's Wisdom", desc: "Start each run with Research Chamber built", cost: 3, maxLevel: 1, icon: "🔬" }
];

var ZONE_CONFIG = {
  forest: { name: "Forest", bg: 0x87ceeb, fog: 0x87ceeb, foodBonus: 0, enemyMult: 1, label: "🌳 Forest", tripReq: 0 },
  meadow: { name: "Meadow", bg: 0x7ab44d, fog: 0x7ab44d, foodBonus: 1, enemyMult: 1, label: "🌿 Meadow", tripReq: 15 },
  forestEdge: { name: "Forest Edge", bg: 0x6b8e5a, fog: 0x6b8e5a, foodBonus: 2, enemyMult: 1.2, label: "🌲 Forest Edge", tripReq: 30 },
  riverside: { name: "Riverside", bg: 0x5a8a8a, fog: 0x5a8a8a, foodBonus: 2, enemyMult: 0.8, label: "🏞️ Riverside", tripReq: 60 },
  deepWoods: { name: "Deep Woods", bg: 0x2a4a2a, fog: 0x2a4a2a, foodBonus: 3, enemyMult: 1.5, label: "🌲 Deep Woods", tripReq: 100 },
  cave: { name: "Cave", bg: 0x334455, fog: 0x334455, foodBonus: 4, enemyMult: 1.6, label: "🕳️ Cave", tripReq: 0, prestigeReq: 10 },
  swamp: { name: "Swamp", bg: 0x3a5a3a, fog: 0x3a5a3a, foodBonus: 5, enemyMult: 1.3, label: "🌿 Swamp", tripReq: 0, prestigeReq: 25 },
  mountain: { name: "Mountain", bg: 0x88aacc, fog: 0x88aacc, foodBonus: 6, enemyMult: 1.9, label: "🏔️ Mountain", tripReq: 0, prestigeReq: 50 }
};

var ZONE_ORDER = ["forest", "meadow", "forestEdge", "riverside", "deepWoods", "cave", "swamp", "mountain"];

var BOSS_TYPES = {
  queen: { name: "Queen Spider", icon: "👑", hpKey: "bossHealthQueen", dmgKey: "bossDamageQueen", spdKey: "bossSpeedQueen", color: 0x880000, legColor: 0x440000, zones: ["forest","meadow","riverside"] },
  beetle: { name: "Beetle Tank", icon: "🪲", hpKey: "bossHealthBeetle", dmgKey: "bossDamageBeetle", spdKey: "bossSpeedBeetle", color: 0x444400, legColor: 0x222200, zones: ["forestEdge","deepWoods"] },
  wasp: { name: "Wasp Swarm", icon: "🐝", hpKey: "bossHealthWasp", dmgKey: "bossDamageWasp", spdKey: "bossSpeedWasp", color: 0x888800, legColor: 0x444400, zones: ["meadow","riverside","deepWoods"] },
  centipede: { name: "Giant Centipede", icon: "🐛", hpKey: "bossHealthCentipede", dmgKey: "bossDamageCentipede", spdKey: "bossSpeedCentipede", color: 0x664422, legColor: 0x332211, zones: ["cave"], special: "poison" },
  hydra: { name: "Swamp Hydra", icon: "🐍", hpKey: "bossHealthHydra", dmgKey: "bossDamageHydra", spdKey: "bossSpeedHydra", color: 0x336633, legColor: 0x224422, zones: ["swamp"], special: "regen" },
  wyrm: { name: "Frost Wyrm", icon: "🐉", hpKey: "bossHealthWyrm", dmgKey: "bossDamageWyrm", spdKey: "bossSpeedWyrm", color: 0x88aaff, legColor: 0x4477aa, zones: ["mountain"], special: "freeze" }
};

var EVOLUTION_TREE = {
  worker: {
    name: "Worker Ants",
    tiers: [
      { tier: 1, name: "Forager", desc: "+1 food per trip", cost: 30, effect: { foodBonus: 1 }, icon: "🌾" },
      { tier: 2, name: "Builder", desc: "-15% chamber cost", cost: 50, effect: { buildDiscount: 0.15 }, icon: "🔨", reqPrestige: 0 },
      { tier: 3, name: "Nurse", desc: "-1s hatch time", cost: 80, effect: { hatchReduction: 1 }, icon: "🥚", reqPrestige: 1 }
    ]
  },
  soldier: {
    name: "Soldier Ants",
    tiers: [
      { tier: 1, name: "Tank", desc: "+20 HP", cost: 40, effect: { healthBonus: 20 }, icon: "🛡️" },
      { tier: 2, name: "Striker", desc: "+5 damage", cost: 60, effect: { damageBonus: 5 }, icon: "⚔️", reqPrestige: 0 },
      { tier: 3, name: "Guardian", desc: "Guard nest radius +2", cost: 100, effect: { guardRadiusBonus: 2 }, icon: "🏰", reqPrestige: 1 }
    ]
  },
  scout: {
    name: "Scout Ants",
    tiers: [
      { tier: 1, name: "Explorer", desc: "Faster scout trips", cost: 35, effect: { speedBonus: 0.5 }, icon: "🔍" },
      { tier: 2, name: "Treasure Hunter", desc: "+15% gem chance", cost: 55, effect: { gemChanceBonus: 0.15 }, icon: "💎", reqPrestige: 0 },
      { tier: 3, name: "Cartographer", desc: "Zone unlock 20% faster", cost: 90, effect: { zoneTripReduction: 0.2 }, icon: "🗺️", reqPrestige: 1 }
    ]
  }
};

var EVENTS = [
  { name: "Dead Insect", emoji: "🪲", action: function() { addFood(40, new THREE.Vector3(TX+5, GTY, TCZ-3)); emitParticles(new THREE.Vector3(TX+5, GTY+0.5, TCZ-3), 20, 0xaa8844, 0.06, 1.0, 0.7); } },
  { name: "Honey Drop", emoji: "🍯", action: function() { addFood(60, new THREE.Vector3(TX-3, GTY, TCZ+2)); addGems(1); emitParticles(new THREE.Vector3(TX-3, GTY+0.5, TCZ+2), 25, 0xffdd44, 0.07, 1.2, 0.8); } },
  { name: "Gem Shard", emoji: "💠", action: function() { addGems(2); emitParticles(new THREE.Vector3(TX+2, GTY+0.5, TCZ-2), 30, 0xff44ff, 0.05, 1.0, 0.6); } },
  { name: "Berry Bush", emoji: "🫐", action: function() { addFood(30, new THREE.Vector3(TX-2, GTY, TCZ-4)); emitParticles(new THREE.Vector3(TX-2, GTY+0.5, TCZ-4), 15, 0xcc44cc, 0.05, 0.8, 0.5); } }
];

var RARE_TYPES = [
  { color: 0xff66aa, name: "Pink Worker", emoji: "💗", speedBonus: 0.3, foodBonus: 1 },
  { color: 0x66ff66, name: "Green Worker", emoji: "💚", speedBonus: 0, foodBonus: 2 },
  { color: 0x6666ff, name: "Blue Worker", emoji: "💙", speedBonus: 0.5, foodBonus: 0 }
];

var PRESTIGE_GOALS = [
  { id: "pacifistGoal", name: "Pacifist", desc: "Reach Lv30 without Soldier Chamber", bonusPP: 5, check: function() { return state.level >= 30 && state.chambers.soldier.count === 0; } },
  { id: "speedGoal", name: "Speed Run", desc: "Reach Lv30 in 15 min", bonusPP: 8, check: function() { return state.level >= 30 && (state.lifetimeStats.totalPlayTime - (state.prestigeStartTime || 0)) < 900; } },
  { id: "scoutGoal", name: "Explorer", desc: "Unlock 2 zones", bonusPP: 3, check: function() { return state.unlockedZonesList.length >= 3; } },
  { id: "hatchGoal", name: "Hatchery", desc: "Hatch 20 workers", bonusPP: 4, check: function() { return state.totalHatched >= 20; } }
];

var REACTIVE_EVENTS = [
  { name: "Food Surplus", emoji: "🍞", condition: function() { return state.food > state.foodCap * 0.7 && state.virtualWorkers > 0; },
    choices: [
      { text: "Convert to Gems (+3💎)", action: function() { addGems(3); } },
      { text: "Boost Workers (2x speed 30s)", action: function() { state.speedBoostTimer = 30; applyAllWorkerSpeeds(); } }
    ] },
  { name: "Hunger Crisis", emoji: "🍂", condition: function() { return state.food < state.foodCap * 0.2; },
    choices: [
      { text: "Ration Supply (+200 food)", action: function() { addFood(200); } },
      { text: "Tough it out (+5 soldier dmg 30s)", action: function() { state.defenseBannerTimer = 30; } }
    ] },
  { name: "Spider Migration", emoji: "🕷️", condition: function() { return soldiers.length >= 2; },
    choices: [
      { text: "Ambush (+8 soldier dmg permanently)", action: function() { state.gemUpgrades.antStrength = (state.gemUpgrades.antStrength || 0) + 8; } },
      { text: "Fortify (+100 food)", action: function() { addFood(100); } }
    ] }
];
