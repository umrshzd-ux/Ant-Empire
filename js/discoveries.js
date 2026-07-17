// ===== SCOUT DISCOVERY SYSTEM =====
// Scouts returning to the nest have a chance to trigger a discovery event.
// Discoveries are the primary source of surprises and engagement in the game.

var DISCOVERIES = {
  // ---------- Common discoveries (high chance) ----------
  berryBush: {
    name: "Berry Bush",
    emoji: "🫐",
    rarity: "common",
    chance: 0.25,
    desc: "A bush heavy with ripe berries.",
    action: function(pos) {
      addFood(25 + Math.floor(Math.random() * 20), pos);
      showToast("🫐 Scouts found a berry bush! +food");
    }
  },
  deadInsect: {
    name: "Dead Insect",
    emoji: "🪲",
    rarity: "common",
    chance: 0.25,
    desc: "A large dead beetle, still fresh.",
    action: function(pos) {
      addFood(30 + Math.floor(Math.random() * 25), pos);
      showToast("🪲 Scouts found a dead insect! +food");
    }
  },
  seedCache: {
    name: "Seed Cache",
    emoji: "🌰",
    rarity: "common",
    chance: 0.20,
    desc: "A hidden cache of seeds buried by a squirrel.",
    action: function(pos) {
      var bonus = 20 + Math.floor(Math.random() * 30);
      addFood(bonus, pos);
      state.foodCap += 10; // permanent small increase
      recalculateFoodCap();
      showToast("🌰 Seed cache found! +" + bonus + " food, +10 food cap");
    }
  },

  // ---------- Uncommon discoveries ----------
  honeyDrop: {
    name: "Honey Drop",
    emoji: "🍯",
    rarity: "uncommon",
    chance: 0.15,
    desc: "A drop of honey fallen from a hive above.",
    action: function(pos) {
      addFood(45, pos);
      addGems(1);
      showToast("🍯 Honey drop! +45 food, +1💎");
    }
  },
  rareFlower: {
    name: "Rare Flower",
    emoji: "🌸",
    rarity: "uncommon",
    chance: 0.12,
    desc: "A rare flower with special pollen.",
    action: function(pos) {
      state.speedBoostTimer = Math.max(state.speedBoostTimer, 20);
      applyAllWorkerSpeeds();
      showToast("🌸 Rare flower! Worker speed boosted 20s");
    }
  },
  gemShard: {
    name: "Gem Shard",
    emoji: "💠",
    rarity: "uncommon",
    chance: 0.10,
    desc: "A sparkling gem fragment in the soil.",
    action: function(pos) {
      var gems = 1 + Math.floor(Math.random() * 2);
      addGems(gems);
      showToast("💠 Gem shard! +" + gems + "💎");
    }
  },

  // ---------- Rare discoveries ----------
  abandonedTunnel: {
    name: "Abandoned Tunnel",
    emoji: "🕳️",
    rarity: "rare",
    chance: 0.06,
    desc: "An old tunnel dug by another colony, now empty.",
    action: function(pos) {
      state.expansionTrips += 3;
      checkZoneUnlocks();
      showToast("🕳️ Abandoned tunnel explored! Zone progress boosted");
    }
  },
  crystalFormation: {
    name: "Crystal Formation",
    emoji: "💎",
    rarity: "rare",
    chance: 0.04,
    desc: "A cluster of natural crystals growing in the earth.",
    action: function(pos) {
      var gems = 2 + Math.floor(Math.random() * 3);
      addGems(gems);
      showToast("💎 Crystal formation! +" + gems + "💎");
    }
  },
  ancientFossil: {
    name: "Ancient Fossil",
    emoji: "🦴",
    rarity: "rare",
    chance: 0.03,
    desc: "The fossilised remains of a gigantic ancient insect.",
    action: function(pos) {
      var xpGain = Math.floor(state.xpToNext * 0.3);
      state.xp += xpGain;
      while (state.xp >= state.xpToNext) {
        state.xp -= state.xpToNext;
        state.level++;
        state.xpToNext = Math.floor(40 * Math.pow(1.15, state.level - 1));
        state.foodCap += 15;
        state.gems += BAL.gemPerLevel;
        state.totalGemsEarned += BAL.gemPerLevel;
      }
      recalculateFoodCap();
      showToast("🦴 Ancient fossil studied! Huge knowledge boost");
    }
  },

  // ---------- Legendary discoveries ----------
  bossLair: {
    name: "Boss Lair",
    emoji: "💀",
    rarity: "legendary",
    chance: 0.02,
    desc: "The entrance to a monstrous creature's lair.",
    action: function(pos) {
      if (!state.bossActive) {
        state.bossTimer = 5; // boss spawns very soon
        showToast("💀 A boss lair was discovered! Prepare for battle!");
      } else {
        showToast("💀 A boss lair was found, but a boss is already active!");
      }
    }
  },
  treasureChamber: {
    name: "Treasure Chamber",
    emoji: "🏆",
    rarity: "legendary",
    chance: 0.01,
    desc: "A hidden chamber filled with riches from a forgotten colony.",
    action: function(pos) {
      var gems = 3 + Math.floor(Math.random() * 5);
      addGems(gems);
      addFood(100, pos);
      showToast("🏆 Treasure chamber! +" + gems + "💎, +100 food");
    }
  },
  rareAntEgg: {
    name: "Rare Ant Egg",
    emoji: "🥚",
    rarity: "legendary",
    chance: 0.015,
    desc: "An egg of a rare ant species, abandoned and still viable.",
    action: function(pos) {
      state.workerCount++;
      var rt = RARE_TYPES[Math.floor(Math.random() * RARE_TYPES.length)];
      state.rareAntCount++;
      var nw = createWorker(false, rt, true);
      if (nw) {
        nw.mesh.position.copy(pos);
        nw.mesh.position.y = GTY;
        nw.birthTimer = 0.3;
        nw.birthDuration = 0.3;
        workers.push(nw);
        showToast(rt.emoji + " Rare " + rt.name + " egg found and hatched!");
      } else {
        state.virtualWorkers++;
        showToast("🥚 Rare egg added to virtual workers");
      }
    }
  }
};

// ---- Biome-specific discovery tables ----
var BIOME_DISCOVERIES = {
  forest: ["berryBush", "deadInsect", "seedCache", "honeyDrop", "rareFlower", "gemShard", "abandonedTunnel", "ancientFossil", "rareAntEgg"],
  meadow: ["berryBush", "deadInsect", "honeyDrop", "rareFlower", "gemShard", "crystalFormation", "treasureChamber", "rareAntEgg"],
  forestEdge: ["deadInsect", "seedCache", "rareFlower", "gemShard", "abandonedTunnel", "bossLair", "ancientFossil"],
  riverside: ["berryBush", "honeyDrop", "gemShard", "crystalFormation", "treasureChamber", "rareAntEgg", "abandonedTunnel"],
  deepWoods: ["seedCache", "rareFlower", "abandonedTunnel", "bossLair", "ancientFossil", "treasureChamber", "rareAntEgg"],
  cave: ["gemShard", "crystalFormation", "bossLair", "ancientFossil", "treasureChamber"],
  swamp: ["deadInsect", "honeyDrop", "gemShard", "bossLair", "rareAntEgg"],
  mountain: ["crystalFormation", "gemShard", "bossLair", "treasureChamber", "ancientFossil"]
};

// ---- Get base discovery chance for current biome (merged with research bonuses) ----
function getBiomeDiscoveryChance() {
  // Start with biome-specific base chance
  var base = 0.15;
  if (typeof BIOME_CONTENT !== 'undefined') {
    var cfg = BIOME_CONTENT[state.currentZone];
    if (cfg && cfg.discoveryChance !== undefined) {
      base = cfg.discoveryChance;
    }
  }
  // Add research bonuses
  if (state.researchBonuses && state.researchBonuses.discoveryChance) {
    base += state.researchBonuses.discoveryChance;
  }
  return base;
}

// ---- Main function: attempt a discovery when a scout returns ----
function attemptDiscovery(returnPos) {
  // Base chance that something is found (35% + bonuses)
  var baseChance = 0.35;
  if (state.researchBonuses && state.researchBonuses.discoveryChance) {
    baseChance += state.researchBonuses.discoveryChance;
  }
  if (Math.random() > baseChance) return false;

  var biome = state.currentZone;
  var available = BIOME_DISCOVERIES[biome] || BIOME_DISCOVERIES["forest"];
  var roll = Math.random();
  var cumulative = 0;

  for (var i = 0; i < available.length; i++) {
    var disc = DISCOVERIES[available[i]];
    if (!disc) continue;
    cumulative += disc.chance;
    if (roll <= cumulative) {
      disc.action(returnPos);
      if (disc.rarity === "legendary") {
        AudioManager.sfx.achievement();
      } else {
        AudioManager.sfx.gemCollect();
      }
      return true;
    }
  }
  // Fallback: give a small food bonus
  addFood(10, returnPos);
  return true;
    }
