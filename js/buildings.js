// ===== CENTRALIZED BUILDING SYSTEM =====
// All building construction, upgrades, costs, and mechanic unlocks.
// Buildings unlock new gameplay, not just increased numbers.
// Builder class bonus applied in build queue processing.

var BUILDINGS = {
  foodStorage: {
    name: "Food Storage",
    emoji: "🌾",
    desc: "Increases food capacity.",
    baseCost: 60,
    costMult: 0.25,
    maxCount: 8,
    category: "economy",
    unlocks: [],
    onBuild: function() {
      state.chambers.foodStorage.count++;
      state.chambers.foodStorage.bonusCap += BAL.foodCapPerStorage;
      recalculateFoodCap();
      showToast("🌾 Food Storage built! +" + BAL.foodCapPerStorage + " capacity");
    },
    getCost: function() {
      return Math.floor(BAL.storageCost * (1 + state.chambers.foodStorage.count * BAL.storageCostMult));
    },
    getNextX: function() {
      return TX + 5 + state.chambers.foodStorage.count * 3.5;
    },
    canBuild: function() {
      return state.chambers.foodStorage.count < BAL.maxStorage;
    }
  },

  nursery: {
    name: "Nursery",
    emoji: "🥚",
    desc: "Eggs hatch faster. Unlocks egg transport.",
    baseCost: 100,
    costMult: 0,
    maxCount: 3,
    category: "economy",
    unlocks: ["eggTransport"],
    onBuild: function() {
      state.chambers.nursery.count++;
      state.chambers.nursery.hatchReduction += 2;
      recalculateHatchTime();
      buildQueenChamberWalls();
      showToast("🥚 Nursery built! Hatch time -2s");
    },
    getCost: function() {
      return getEffectiveChamberCost(BAL.nurseryCost);
    },
    getNextX: function() {
      return TX - 5 - (state.chambers.nursery.count) * 3.5;
    },
    canBuild: function() {
      return state.chambers.nursery.count < BAL.maxNursery;
    }
  },

  soldier: {
    name: "Soldier Chamber",
    emoji: "🛡️",
    desc: "Spawns a soldier to defend the colony. Unlocks summon boss button.",
    baseCost: 150,
    costMult: 0,
    maxCount: 5,
    category: "military",
    unlocks: ["soldierPatrol", "summonBoss"],
    onBuild: function() {
      state.chambers.soldier.count++;
      state.soldierCount++;
      var chX = getNextSoldierX();
      spawnSoldier(chX);
      showToast("🛡️ Soldier +1");
      updateSummonButton();
    },
    getCost: function() {
      return getEffectiveChamberCost(BAL.soldierChamberCost);
    },
    getNextX: function() {
      return TX + 5 + BAL.soldierRowStart + state.chambers.soldier.count * 3.5;
    },
    canBuild: function() {
      return state.chambers.soldier.count < BAL.maxSoldierChambers;
    }
  },

  research: {
    name: "Research Chamber",
    emoji: "🔬",
    desc: "Unlocks upgrades, shop, evolution, and achievements.",
    baseCost: 200,
    costMult: 0,
    maxCount: 1,
    category: "knowledge",
    unlocks: ["upgrades", "shop", "evolution", "achievements", "dailyChallenges"],
    onBuild: function() {
      state.chambers.research.count++;
      showToast("🔬 Research Chamber built! New systems unlocked!");
      // Show previously hidden buttons
      var btns = ["btn-upgrades", "btn-shop", "btn-achievements", "btn-daily"];
      for (var bi = 0; bi < btns.length; bi++) {
        var b = document.getElementById(btns[bi]);
        if (b) b.style.display = "inline-block";
      }
      if (state.level >= BAL.evolutionUnlockLevel) {
        var evoBtn = document.getElementById("btn-evolution");
        if (evoBtn) evoBtn.style.display = "inline-block";
      }
    },
    getCost: function() {
      return getEffectiveChamberCost(BAL.researchChamberCost);
    },
    getNextX: function() {
      return TX + 5 + BAL.researchRowStart + state.chambers.research.count * 3.5;
    },
    canBuild: function() {
      return state.chambers.research.count < 1;
    }
  },

  scout: {
    name: "Scout Post",
    emoji: "🔍",
    desc: "Spawns a scout to explore the world and find discoveries.",
    baseCost: 180,
    costMult: 0,
    maxCount: 3,
    category: "exploration",
    unlocks: ["exploration", "discoveries"],
    onBuild: function() {
      state.chambers.scout.count++;
      state.scoutCount++;
      spawnScout();
      showToast("🔍 Scout +1 – exploring the world!");
    },
    getCost: function() {
      return getEffectiveChamberCost(BAL.scoutChamberCost);
    },
    getNextX: function() {
      return TX + 5 + BAL.scoutRowStart + state.chambers.scout.count * 3.5;
    },
    canBuild: function() {
      return state.chambers.scout.count < BAL.maxScoutChambers;
    }
  },

  royal: {
    name: "Royal Chamber",
    emoji: "👑",
    desc: "Unlocks Queen abilities – powerful active skills with cooldowns.",
    baseCost: 300,
    costMult: 0,
    maxCount: 1,
    category: "royal",
    unlocks: ["queenAbilities"],
    onBuild: function() {
      if (!state.chambers.royal) state.chambers.royal = { count: 0 };
      state.chambers.royal.count = 1;
      buildRoyalChamberVisual();
      initRoyalChamber();
      showToast("👑 Royal Chamber built! Queen abilities unlocked!");
    },
    getCost: function() {
      return 300;
    },
    getNextX: function() {
      return TX + 5 + BAL.researchRowStart + 4;
    },
    canBuild: function() {
      return !state.chambers.royal || state.chambers.royal.count < 1;
    }
  }
};

// ---- Build a chamber by type (called from build queue) ----
// Food was already deducted at enqueue time, so we only validate and create.
function constructBuilding(type) {
  var bld = BUILDINGS[type];
  if (!bld) return false;
  if (!bld.canBuild()) {
    showToast(bld.name + " already at max!");
    return false;
  }

  // The cost was already paid when the item was queued – we do NOT deduct again.

  // Create the 3D chamber
  var x = bld.getNextX();
  var chamberMesh = makeChamber(x, CCY, CZ, 3, 2, 4, getChamberColor(type));
  makeLabel(bld.emoji + " " + bld.name, x, CCY + 1.4, CZ, 256, 64, true);

  // Store chamber reference
  addChamberToArrays(type, x, chamberMesh);

  // Execute building-specific logic
  bld.onBuild();

  // Update UI
  AudioManager.sfx.buttonClick();
  updateDailyProgress('build1', 1);
  updateBuildButtons();
  refreshHUD();
  checkAchievements();
  checkTutorials();

  return true;
}

// ---- Get chamber colour based on type ----
function getChamberColor(type) {
  switch (type) {
    case "foodStorage": return 0x5a4020;
    case "nursery": return 0x6b5040;
    case "soldier": return 0x4a2a1a;
    case "research": return 0x3a3a5a;
    case "scout": return 0x3a5a3a;
    case "royal": return 0x8a6a3a;
    default: return 0x5a5a5a;
  }
}

// ---- Add chamber to tracking arrays ----
function addChamberToArrays(type, x, mesh) {
  switch (type) {
    case "foodStorage":
      storageChambers.push(mesh);
      var pile = new THREE.Group();
      pile.position.set(x, CCY - 0.8, CZ);
      scene.add(pile);
      storagePiles.push(pile);
      break;
    case "nursery":
      nurseryChambers.push(mesh);
      var cluster = new THREE.Group();
      cluster.position.set(x, CCFY + 0.05, CZ);
      scene.add(cluster);
      nurseryEggClusters.push(cluster);
      break;
    case "soldier":
      soldierChambers.push({ x: x, mesh: mesh });
      break;
    case "research":
      researchChambers.push({ x: x, mesh: mesh });
      // Create orbiting research orbs
      researchChamberGroup = new THREE.Group();
      researchChamberGroup.position.set(x, CCY + 1.8, CZ);
      var orbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
      for (var i = 0; i < 5; i++) {
        var orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), orbMat);
        var angle = (i / 5) * Math.PI * 2;
        orb.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6);
        researchChamberGroup.add(orb);
      }
      scene.add(researchChamberGroup);
      break;
    case "scout":
      scoutChambers.push({ x: x, mesh: mesh });
      break;
    case "royal":
      buildRoyalChamberVisual();
      break;
  }
}

// ---- Build Royal Chamber visual ----
function buildRoyalChamberVisual() {
  if (!state.chambers.royal || state.chambers.royal.count === 0) return;
  var x = TX + 5 + BAL.researchRowStart + 4;
  var royalGroup = new THREE.Group();
  royalGroup.position.set(x, CCY + 1.8, CZ);
  var orbMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.2 });
  for (var i = 0; i < 7; i++) {
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), orbMat);
    var angle = (i / 7) * Math.PI * 2;
    orb.position.set(Math.cos(angle) * 0.7, Math.sin(i * 1.5) * 0.2, Math.sin(angle) * 0.7);
    royalGroup.add(orb);
  }
  scene.add(royalGroup);
  if (!state._royalGroups) state._royalGroups = [];
  state._royalGroups.push(royalGroup);
}

// ---- Enqueue a building for construction (build queue system) ----
function enqueueBuild(type) {
  var bld = BUILDINGS[type];
  if (!bld) return;
  if (!bld.canBuild()) {
    showToast(bld.name + " already at max!");
    return;
  }
  var cost = bld.getCost();
  if (state.food < cost) {
    showToast("Need " + cost + " food!");
    return;
  }
  // Deduct food NOW – it will not be deducted again when constructed.
  state.food -= cost;

  state.buildQueue.push({
    type: type,
    timeRemaining: (BAL.buildTimes && BAL.buildTimes[type]) ? BAL.buildTimes[type] : 5,
    totalTime: (BAL.buildTimes && BAL.buildTimes[type]) ? BAL.buildTimes[type] : 5
  });
  updateBuildButtonLabels();
  refreshBuildQueueUI();
  refreshHUD();
}

// ---- Check if a building's unlocks are active ----
function isBuildingUnlockActive(feature) {
  for (var type in BUILDINGS) {
    var bld = BUILDINGS[type];
    var count = 0;
    switch (type) {
      case "foodStorage": count = state.chambers.foodStorage.count; break;
      case "nursery": count = state.chambers.nursery.count; break;
      case "soldier": count = state.chambers.soldier.count; break;
      case "research": count = state.chambers.research.count; break;
      case "scout": count = state.chambers.scout.count; break;
      case "royal": count = state.chambers.royal ? state.chambers.royal.count : 0; break;
    }
    if (count > 0 && bld.unlocks.indexOf(feature) !== -1) {
      return true;
    }
  }
  return false;
}

// ---- Helper: get build speed bonus from Builder class workers ----
function getBuilderBuildSpeedBonus() {
  for (var i = 0; i < workers.length; i++) {
    if (workers[i].antClass === "builder" && workers[i].rendered && !workers[i].isSoldier && !workers[i].isScout) {
      return 0.25; // 25% faster builds if at least one Builder alive
    }
  }
  return 0;
    }
