// ===== RESEARCH SYSTEM =====
// Research unlocks new mechanics and abilities, not just stat increases.
// Players spend food to research technologies in different categories.

var RESEARCH_TREE = {
  // ========== ECONOMY BRANCH ==========
  efficientGathering: {
    id: "efficientGathering",
    name: "Efficient Gathering",
    emoji: "🌾",
    category: "economy",
    tier: 1,
    cost: 80,
    desc: "Workers learn to gather food more efficiently.",
    effect: "Workers carry +1 food per trip permanently.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.foodPerTrip = (state.researchBonuses.foodPerTrip || 0) + 1;
      showToast("🌾 Efficient Gathering complete! +1 food per trip");
    },
    prereq: null,
    // Additional condition: must have at least 1 Scout Post built (forces exploration)
    canResearch: function() {
      return state.chambers.scout && state.chambers.scout.count >= 1;
    }
  },

  deepStorage: {
    id: "deepStorage",
    name: "Deep Storage",
    emoji: "📦",
    category: "economy",
    tier: 2,
    cost: 150,
    desc: "Expand storage chambers to hold more food.",
    effect: "Permanently increases food capacity by 100.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.foodCap = (state.researchBonuses.foodCap || 0) + 100;
      recalculateFoodCap();
      showToast("📦 Deep Storage complete! +100 food capacity");
    },
    prereq: "efficientGathering"
  },

  efficientConstruction: {
    id: "efficientConstruction",
    name: "Efficient Construction",
    emoji: "🔨",
    category: "economy",
    tier: 2,
    cost: 120,
    desc: "New building techniques speed up chamber construction.",
    effect: "Unlocks the Builder ant class. Build times reduced by 25%.",
    unlocks: ["builderClass"],
    onComplete: function() {
      if (typeof unlockClass === 'function') unlockClass("builder");
      showToast("🔨 Efficient Construction complete! Builder class unlocked");
    },
    prereq: "efficientGathering"
  },

  // ========== MILITARY BRANCH ==========
  hardenedCarapace: {
    id: "hardenedCarapace",
    name: "Hardened Carapace",
    emoji: "🛡️",
    category: "military",
    tier: 1,
    cost: 100,
    desc: "Soldiers develop tougher exoskeletons.",
    effect: "All soldiers gain +15 max health.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.soldierHealth = (state.researchBonuses.soldierHealth || 0) + 15;
      for (var i = 0; i < soldiers.length; i++) {
        soldiers[i].maxHealth += 15;
        soldiers[i].health += 15;
      }
      showToast("🛡️ Hardened Carapace complete! Soldiers +15 HP");
    },
    prereq: null
  },

  poisonResistance: {
    id: "poisonResistance",
    name: "Poison Resistance",
    emoji: "💚",
    category: "military",
    tier: 2,
    cost: 180,
    desc: "Soldiers develop partial immunity to poison.",
    effect: "Poison effects from bosses are reduced by 50%.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.poisonResist = true;
      showToast("💚 Poison Resistance complete! Poison damage halved");
    },
    prereq: "hardenedCarapace"
  },

  advancedCombat: {
    id: "advancedCombat",
    name: "Advanced Combat Tactics",
    emoji: "⚔️",
    category: "military",
    tier: 3,
    cost: 250,
    desc: "Soldiers learn advanced attack formations.",
    effect: "Unlocks the Royal Guard class. Soldiers deal +5 damage.",
    unlocks: ["royalGuardClass"],
    onComplete: function() {
      state.researchBonuses.soldierDamage = (state.researchBonuses.soldierDamage || 0) + 5;
      if (typeof unlockClass === 'function') unlockClass("royalGuard");
      showToast("⚔️ Advanced Combat complete! Royal Guard class +5 damage");
    },
    prereq: "poisonResistance"
  },

  // ========== EXPLORATION BRANCH ==========
  keenSenses: {
    id: "keenSenses",
    name: "Keen Senses",
    emoji: "👁️",
    category: "exploration",
    tier: 1,
    cost: 90,
    desc: "Scouts develop sharper senses for finding resources.",
    effect: "Scout discovery chance increased by 10%.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.discoveryChance = (state.researchBonuses.discoveryChance || 0) + 0.10;
      showToast("👁️ Keen Senses complete! +10% discovery chance");
    },
    prereq: null
  },

  cartography: {
    id: "cartography",
    name: "Cartography",
    emoji: "🗺️",
    category: "exploration",
    tier: 2,
    cost: 160,
    desc: "Scouts map new territories, speeding up zone discovery.",
    effect: "Zone unlock requirement reduced by 20%.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.zoneTripReduction = 0.2;
      showToast("🗺️ Cartography complete! Zone unlock 20% faster");
    },
    prereq: "keenSenses"
  },

  trailblazing: {
    id: "trailblazing",
    name: "Trailblazing",
    emoji: "🏔️",
    category: "exploration",
    tier: 3,
    cost: 220,
    desc: "Scouts become expert explorers, moving faster and finding more.",
    effect: "Unlocks the Explorer class. Scout speed +30%.",
    unlocks: ["explorerClass"],
    onComplete: function() {
      if (typeof unlockClass === 'function') unlockClass("explorer");
      state.researchBonuses.scoutSpeed = (state.researchBonuses.scoutSpeed || 0) + 0.3;
      showToast("🏔️ Trailblazing complete! Explorer class +30% speed");
    },
    prereq: "cartography"
  },

  // ========== QUEEN BRANCH ==========
  royalJelly: {
    id: "royalJelly",
    name: "Royal Jelly",
    emoji: "🍯",
    category: "queen",
    tier: 1,
    cost: 100,
    desc: "Special jelly accelerates Queen's egg production.",
    effect: "Egg lay time reduced by 15%.",
    unlocks: [],
    onComplete: function() {
      state.researchBonuses.eggLayReduction = (state.researchBonuses.eggLayReduction || 0) + 0.15;
      updateEggLayTime();
      showToast("🍯 Royal Jelly complete! Egg lay 15% faster");
    },
    prereq: null
  },

  queensWrathResearch: {
    id: "queensWrathResearch",
    name: "Queen's Wrath",
    emoji: "⚡",
    category: "queen",
    tier: 2,
    cost: 200,
    desc: "The Queen learns to channel her rage into her soldiers.",
    effect: "Unlocks the Queen's Wrath ability.",
    unlocks: ["queensWrath"],
    onComplete: function() {
      state.researchBonuses.queensWrathUnlocked = true;
      updateQueenAbilityButtons();
      showToast("⚡ Queen's Wrath ability unlocked!");
    },
    prereq: "royalJelly"
  },

  pheromoneMastery: {
    id: "pheromoneMastery",
    name: "Pheromone Mastery",
    emoji: "🧪",
    category: "queen",
    tier: 3,
    cost: 280,
    desc: "Advanced pheromones provide colony-wide protection.",
    effect: "Unlocks the Pheromone Shield ability.",
    unlocks: ["pheromoneShield"],
    onComplete: function() {
      state.researchBonuses.pheromoneShieldUnlocked = true;
      updateQueenAbilityButtons();
      showToast("🛡️ Pheromone Shield ability unlocked!");
    },
    prereq: "queensWrathResearch"
  }
};

// ---- Research state (ensure defaults exist) ----
if (!state.researchBonuses) {
  state.researchBonuses = {
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
  };
}
if (!state.completedResearch) {
  state.completedResearch = [];
}

// ---- Attempt to research a technology ----
function startResearch(researchId) {
  var tech = RESEARCH_TREE[researchId];
  if (!tech) {
    showToast("Research not found!");
    return false;
  }

  // Already completed?
  if (state.completedResearch.indexOf(researchId) !== -1) {
    showToast(tech.emoji + " " + tech.name + " already researched!");
    return false;
  }

  // Check prerequisite
  if (tech.prereq && state.completedResearch.indexOf(tech.prereq) === -1) {
    var preTech = RESEARCH_TREE[tech.prereq];
    showToast("Requires: " + (preTech ? preTech.name : tech.prereq));
    return false;
  }

  // Check additional condition (e.g. Scout Post for Efficient Gathering)
  if (tech.canResearch && !tech.canResearch()) {
    showToast("Build a Scout Post to unlock this research.");
    return false;
  }

  // Check cost
  if (state.food < tech.cost) {
    showToast("Need " + tech.cost + " food for " + tech.name);
    return false;
  }

  // Pay cost
  state.food -= tech.cost;

  // Complete research
  state.completedResearch.push(researchId);
  tech.onComplete();

  // Update UI
  AudioManager.sfx.upgrade();
  refreshResearchUI();
  refreshHUD();
  checkAchievements();
  saveGame();

  return true;
}

// ---- Get research progress for UI ----
function getResearchProgress(category) {
  var total = 0, completed = 0;
  for (var id in RESEARCH_TREE) {
    if (RESEARCH_TREE[id].category === category) {
      total++;
      if (state.completedResearch.indexOf(id) !== -1) completed++;
    }
  }
  return { completed: completed, total: total };
}

// ---- Check if research can be started ----
function canStartResearch(researchId) {
  var tech = RESEARCH_TREE[researchId];
  if (!tech) return false;
  if (state.completedResearch.indexOf(researchId) !== -1) return false;
  if (tech.prereq && state.completedResearch.indexOf(tech.prereq) === -1) return false;
  if (tech.canResearch && !tech.canResearch()) return false;
  if (state.food < tech.cost) return false;
  return true;
}

// ---- Refresh research UI (called from ui.js) ----
function refreshResearchUI() {
  var panel = document.getElementById('research-panel');
  if (!panel) return;

  var categories = ["economy", "military", "exploration", "queen"];
  var html = '<div style="color:#ffd27a; font-weight:700; text-align:center; margin-bottom:6px;">🔬 Research Tree</div>';

  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var prog = getResearchProgress(cat);
    html += '<div style="color:#ffcc88; font-weight:700; margin-top:8px; border-bottom:1px solid #ffcc88; padding-bottom:2px;">' +
            cat.toUpperCase() + ' (' + prog.completed + '/' + prog.total + ')</div>';

    for (var id in RESEARCH_TREE) {
      var tech = RESEARCH_TREE[id];
      if (tech.category !== cat) continue;

      var completed = state.completedResearch.indexOf(id) !== -1;
      var available = canStartResearch(id);
      var locked = !completed && !available;

      html += '<div class="panel-option" style="opacity:' + (locked ? '0.4' : '1') + '">';
      html += '<span>' + tech.emoji + ' ' + tech.name + '<br><small>' + tech.desc + '</small></span>';

      if (completed) {
        html += '<span style="color:#4a4;">✓ Done</span>';
      } else if (available) {
        html += '<button onclick="startResearch(\'' + id + '\')">' + tech.cost + '🌾</button>';
      } else {
        var reason = tech.prereq ? 'Locked' : (tech.canResearch ? 'Need Scout' : tech.cost + '🌾');
        html += '<span style="color:#888;">' + reason + '</span>';
      }
      html += '</div>';
    }
  }

  panel.innerHTML = html;
}

// ---- Initialize research system ----
function initResearch() {
  if (!state.researchBonuses) {
    state.researchBonuses = {
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
    };
  }
  if (!state.completedResearch) {
    state.completedResearch = [];
  }
  }
