// ===== PLAYER GOALS SYSTEM (Rule of Three) =====
// Always shows the player one immediate, one medium, and one long-term goal.
// Goals update dynamically as the player progresses.

var GOALS = {
  // ---- Immediate Goals (should be completable in ~30 seconds) ----
  immediate: [
    { id: "collect50", desc: "Collect 50 food", check: function() { return state.food >= 50; }, reward: "Unlock next goal" },
    { id: "hatch1", desc: "Hatch 1 worker", check: function() { return state.totalHatched >= 1; }, reward: "Population grows" },
    { id: "buildStorage", desc: "Build a Food Storage", check: function() { return state.chambers.foodStorage.count >= 1; }, reward: "+Food capacity" },
    { id: "hatch3", desc: "Hatch 3 workers", check: function() { return state.totalHatched >= 3; }, reward: "Faster collection" },
    { id: "reach100food", desc: "Reach 100 food", check: function() { return state.food >= 100; }, reward: "Colony is stable" },
    { id: "defeatSpider", desc: "Defeat 1 spider", check: function() { return state.totalKills >= 1; }, reward: "First victory" },
    { id: "upgradeAny", desc: "Buy any upgrade", check: function() { return (state.upgrades.soldierDamage + state.upgrades.workerSpeed + state.upgrades.eggLayTime + state.upgrades.foodCap) > 0; }, reward: "Colony improves" },
    { id: "rally", desc: "Use Rally ability", check: function() { return state.rallyUses >= 1; }, reward: "Temporary boost" }
  ],

  // ---- Medium Goals (~30 minutes) ----
  medium: [
    { id: "buildNursery", desc: "Build a Nursery", check: function() { return state.chambers.nursery.count >= 1; }, reward: "Eggs hatch faster" },
    { id: "buildSoldier", desc: "Build a Soldier Chamber", check: function() { return state.chambers.soldier.count >= 1; }, reward: "Defend the colony" },
    { id: "buildResearch", desc: "Build a Research Chamber", check: function() { return state.chambers.research.count >= 1; }, reward: "Unlock upgrades" },
    { id: "buildScout", desc: "Build a Scout Post", check: function() { return state.chambers.scout.count >= 1; }, reward: "Explore the world" },
    { id: "reachLv5", desc: "Reach Colony Level 5", check: function() { return state.level >= 5; }, reward: "Stronger colony" },
    { id: "reachLv10", desc: "Reach Colony Level 10", check: function() { return state.level >= 10; }, reward: "Evolution unlocks" },
    { id: "defeat5spiders", desc: "Defeat 5 spiders", check: function() { return state.totalKills >= 5; }, reward: "Safer colony" },
    { id: "unlockMeadow", desc: "Unlock the Meadow zone", check: function() { return state.unlockedZonesList.indexOf("meadow") !== -1; }, reward: "New biome" },
    { id: "surviveNight", desc: "Survive one night", check: function() { return state.survivedNight >= 1; }, reward: "Night survivor" },
    { id: "hatchRare", desc: "Hatch a rare worker", check: function() { return state.rareAntCount >= 1; }, reward: "Special ant" }
  ],

  // ---- Long-Term Goals (days) ----
  longTerm: [
    { id: "defeatBoss", desc: "Defeat your first boss", check: function() { return state.bossKills >= 1; }, reward: "Boss Hunter title" },
    { id: "prestige", desc: "Prestige for the first time", check: function() { return state.prestigeCount >= 1; }, reward: "New chapter begins" },
    { id: "reachLv30", desc: "Reach Colony Level 30", check: function() { return state.level >= 30; }, reward: "Prestige unlocked" },
    { id: "unlockCave", desc: "Unlock the Cave zone", check: function() { return state.unlockedZonesList.indexOf("cave") !== -1; }, reward: "Deep exploration" },
    { id: "defeat10bosses", desc: "Defeat 10 bosses", check: function() { return state.bossKills >= 10; }, reward: "Elite hunter" },
    { id: "ascend", desc: "Ascend for the first time", check: function() { return state.ascensionCount >= 1; }, reward: "Eternal legacy" },
    { id: "allZones", desc: "Unlock all 6 zones", check: function() { return state.unlockedZonesList.length >= 6; }, reward: "Master explorer" },
    { id: "hatch100", desc: "Hatch 100 workers", check: function() { return state.totalHatched >= 100; }, reward: "Thriving colony" },
    { id: "prestige10", desc: "Prestige 10 times", check: function() { return state.prestigeCount >= 10; }, reward: "Veteran Queen" }
  ]
};

// ---- Current active goals (one of each tier) ----
var activeGoals = {
  immediate: null,
  medium: null,
  longTerm: null
};

// ---- Pick a new goal from the list, avoiding duplicates with already-completed ones ----
function pickGoal(tier) {
  var list = GOALS[tier];
  var available = [];
  for (var i = 0; i < list.length; i++) {
    if (!list[i].check()) {
      available.push(list[i]);
    }
  }
  if (available.length === 0) {
    // All goals in this tier are complete – pick a repeatable generic goal
    if (tier === "immediate") return { id: "collectMore", desc: "Keep collecting food", check: function() { return false; }, reward: "Sustain colony" };
    if (tier === "medium") return { id: "keepGrowing", desc: "Continue expanding the colony", check: function() { return false; }, reward: "Growth" };
    return { id: "endless", desc: "Build the greatest ant civilization", check: function() { return false; }, reward: "Eternal glory" };
  }
  return available[Math.floor(Math.random() * available.length)];
}

// ---- Refresh all goals if they're completed ----
function refreshGoals() {
  var changed = false;

  if (!activeGoals.immediate || activeGoals.immediate.check()) {
    if (activeGoals.immediate) {
      showToast("✅ Goal done: " + activeGoals.immediate.desc);
    }
    activeGoals.immediate = pickGoal("immediate");
    changed = true;
  }
  if (!activeGoals.medium || activeGoals.medium.check()) {
    if (activeGoals.medium) {
      showToast("🎯 Goal done: " + activeGoals.medium.desc);
    }
    activeGoals.medium = pickGoal("medium");
    changed = true;
  }
  if (!activeGoals.longTerm || activeGoals.longTerm.check()) {
    if (activeGoals.longTerm) {
      showToast("👑 Goal done: " + activeGoals.longTerm.desc);
    }
    activeGoals.longTerm = pickGoal("longTerm");
    changed = true;
  }

  if (changed) {
    updateGoalsDisplay();
  }
}

// ---- Show goals on the HUD ----
function updateGoalsDisplay() {
  // Do NOT show if the game is paused (main menu, loading, etc.)
  if (typeof gamePaused !== 'undefined' && gamePaused) return;

  var container = document.getElementById('goals-panel');
  if (!container) {
    // Create the goals panel if it doesn't exist – now positioned top‑left, below the HUD pills
    container = document.createElement('div');
    container.id = 'goals-panel';
    container.style.cssText = 'position:fixed; top:65px; left:8px; z-index:100; display:none; flex-direction:column; gap:4px; pointer-events:none;';
    document.body.appendChild(container);
  }

  var goals = [
    { label: '⚡', goal: activeGoals.immediate, color: '#ffd27a' },
    { label: '🎯', goal: activeGoals.medium, color: '#88ccff' },
    { label: '👑', goal: activeGoals.longTerm, color: '#ff88cc' }
  ];

  var html = '';
  for (var i = 0; i < goals.length; i++) {
    var g = goals[i];
    if (g.goal) {
      html += '<div style="display:flex; align-items:center; background:rgba(0,0,0,0.7); border-left:3px solid ' + g.color + '; border-radius:6px; padding:3px 8px; font-size:11px; color:#fff; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">' +
              '<span style="color:' + g.color + '; font-weight:bold; margin-right:4px;">' + g.label + '</span> ' + g.goal.desc +
              '</div>';
    }
  }
  container.innerHTML = html;
  container.style.display = 'flex';
}

// ---- Initialize goals on game start ----
function initGoals() {
  activeGoals.immediate = pickGoal("immediate");
  activeGoals.medium = pickGoal("medium");
  activeGoals.longTerm = pickGoal("longTerm");
  updateGoalsDisplay();
      }
