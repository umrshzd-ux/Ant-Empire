// ===== ROYAL CHAMBER & QUEEN ABILITIES =====
// The Royal Chamber unlocks active Queen abilities that the player can trigger.
// Each ability has a cooldown and provides a temporary powerful effect.

var QUEEN_ABILITIES = {
  // ---- Tier 1: Available when Royal Chamber is built ----
  fertileSurge: {
    name: "Fertile Surge",
    emoji: "👑",
    desc: "Queen lays " + BAL.surgeEggs + " eggs instantly.",
    cooldown: 60, // seconds
    duration: 0,  // instant
    cost: 0,
    action: function() {
      for (var i = 0; i < BAL.surgeEggs; i++) {
        state.eggs++;
        var em = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 }));
        em.position.copy(qMesh.position);
        em.position.x += (Math.random() - 0.5) * 1.6;
        em.position.z += (Math.random() - 0.5) * 1.4;
        em.scale.setScalar(0.3);
        scene.add(em);
        eggMs.push({ mesh: em, mat: em.material, hatchTimer: state.hatchTime,
          totalHatchTime: state.hatchTime, restX: em.position.x, restZ: em.position.z,
          settling: false, settleT: 0 });
      }
      qgLight.intensity = 6;
      qgSphere.material.emissiveIntensity = 3;
      showToast("👑 Fertile Surge! +" + BAL.surgeEggs + " eggs");
      AudioManager.sfx.surge();
    }
  },

  // ---- Tier 2: Unlocked after research ----
  queensWrath: {
    name: "Queen's Wrath",
    emoji: "⚡",
    desc: "All soldiers deal 2x damage for 15 seconds.",
    cooldown: 120,
    duration: 15,
    cost: 0,
    action: function() {
      for (var i = 0; i < soldiers.length; i++) {
        soldiers[i].damageMultiplier = (soldiers[i].damageMultiplier || 1) * 2;
      }
      state.queensWrathActive = true;
      state.queensWrathTimer = 15;
      showToast("⚡ Queen's Wrath! Soldiers deal 2x damage!");
      AudioManager.sfx.rally();
    }
  },

  // ---- Tier 2: Unlocked after research ----
  royalDecree: {
    name: "Royal Decree",
    emoji: "📜",
    desc: "All workers work 2x faster for 20 seconds.",
    cooldown: 90,
    duration: 20,
    cost: 0,
    action: function() {
      state.speedBoostTimer = Math.max(state.speedBoostTimer, 20);
      applyAllWorkerSpeeds();
      showToast("📜 Royal Decree! Workers 2x speed for 20s!");
      AudioManager.sfx.rally();
    }
  },

  // ---- Tier 3: Unlocked after evolution ----
  pheromoneShield: {
    name: "Pheromone Shield",
    emoji: "🛡️",
    desc: "All colony units take 50% less damage for 10 seconds.",
    cooldown: 180,
    duration: 10,
    cost: 0,
    action: function() {
      state.defenseBannerTimer = Math.max(state.defenseBannerTimer, 10);
      showToast("🛡️ Pheromone Shield! 50% damage reduction!");
      AudioManager.sfx.upgrade();
    }
  },

  // ---- Ultimate: Very long cooldown, huge effect ----
  callOfTheQueen: {
    name: "Call of the Queen",
    emoji: "👸",
    desc: "Instantly spawns 3 soldiers and heals all existing soldiers to full.",
    cooldown: 300,
    duration: 0,
    cost: 0,
    action: function() {
      for (var i = 0; i < 3; i++) {
        if (state.chambers.soldier.count < BAL.maxSoldierChambers) {
          state.chambers.soldier.count++;
          state.soldierCount++;
          var chX = BAL.soldierRowStart + TX + 5 + (state.chambers.soldier.count - 1) * 3.5;
          spawnSoldier(chX);
        }
      }
      for (var i = 0; i < soldiers.length; i++) {
        soldiers[i].health = soldiers[i].maxHealth;
        updateHealthBar(soldiers[i].healthBar, 1);
      }
      showToast("👸 Call of the Queen! +3 soldiers, all healed!");
      AudioManager.sfx.ascend();
      triggerShake(3, 0.3);
    }
  }
};

// ---- Queen ability cooldown state ----
var queenAbilityCooldowns = {};
for (var key in QUEEN_ABILITIES) {
  queenAbilityCooldowns[key] = 0;
}

// ---- Build Royal Chamber ----
function buildRoyalChamber() {
  if (state.chambers.royal && state.chambers.royal.count >= 1) {
    showToast("Royal Chamber already exists!");
    return;
  }

  var cost = 300;
  if (state.food < cost) {
    showToast("Need " + cost + " food!");
    return;
  }

  state.food -= cost;
  if (!state.chambers.royal) state.chambers.royal = { count: 0 };
  state.chambers.royal.count = 1;

  // Create visual
  var chX = TX + 5 + BAL.researchRowStart + 4;
  var royalChamber = makeChamber(chX, CCY, CZ, 3, 2, 4, 0x8a6a3a);
  makeLabel("👑 Royal Chamber", chX, CCY + 1.4, CZ, 256, 64, true);

  // Golden orb effect
  var royalGroup = new THREE.Group();
  royalGroup.position.set(chX, CCY + 1.8, CZ);
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

  AudioManager.sfx.buttonClick();
  updateDailyProgress('build1', 1);
  showToast("👑 Royal Chamber built! Queen abilities unlocked!");

  // Unlock first ability button
  updateQueenAbilityButtons();
  refreshHUD();
  checkAchievements();
}

// ---- Use a Queen ability ----
function useQueenAbility(abilityId) {
  var ability = QUEEN_ABILITIES[abilityId];
  if (!ability) return;

  // Check if Royal Chamber exists
  if (!state.chambers.royal || state.chambers.royal.count === 0) {
    showToast("Build a Royal Chamber first!");
    return;
  }

  // Check cooldown
  if (queenAbilityCooldowns[abilityId] > 0) {
    showToast("Ability on cooldown! " + Math.ceil(queenAbilityCooldowns[abilityId]) + "s remaining.");
    return;
  }

  // Check cost (future: some abilities may cost gems)
  if (ability.cost > 0 && state.gems < ability.cost) {
    showToast("Need " + ability.cost + " 💎!");
    return;
  }

  // Pay cost
  if (ability.cost > 0) {
    state.gems -= ability.cost;
  }

  // Execute ability
  ability.action();

  // Set cooldown
  queenAbilityCooldowns[abilityId] = ability.cooldown;

  // Update UI
  updateQueenAbilityButtons();
  refreshHUD();
}

// ---- Update ability cooldowns (called each frame) ----
function updateQueenAbilityCooldowns(dt) {
  for (var key in queenAbilityCooldowns) {
    if (queenAbilityCooldowns[key] > 0) {
      queenAbilityCooldowns[key] -= dt;
      if (queenAbilityCooldowns[key] < 0) queenAbilityCooldowns[key] = 0;
    }
  }

  // Queen's Wrath duration
  if (state.queensWrathActive) {
    state.queensWrathTimer -= dt;
    if (state.queensWrathTimer <= 0) {
      state.queensWrathActive = false;
      for (var i = 0; i < soldiers.length; i++) {
        soldiers[i].damageMultiplier = (soldiers[i].damageMultiplier || 1) / 2;
        if (soldiers[i].damageMultiplier < 1) soldiers[i].damageMultiplier = 1;
      }
    }
  }

  // Update ability button text every 5 seconds
  if (Math.floor(Date.now() / 1000) % 5 === 0) {
    updateQueenAbilityButtons();
  }
}

// ---- Create/update Queen ability buttons on HUD ----
function updateQueenAbilityButtons() {
  var container = document.getElementById('queen-abilities');
  if (!state.chambers.royal || state.chambers.royal.count === 0) {
    if (container) container.style.display = 'none';
    return;
  }

  if (!container) {
    container = document.createElement('div');
    container.id = 'queen-abilities';
    container.style.cssText = 'position:absolute; top:55px; left:50%; transform:translateX(-50%); z-index:25; display:flex; gap:6px;';
    document.body.appendChild(container);
  }

  container.style.display = 'flex';

  var abilityIds = ["fertileSurge", "royalDecree", "queensWrath", "pheromoneShield", "callOfTheQueen"];
  var html = '';
  for (var i = 0; i < abilityIds.length; i++) {
    var ab = QUEEN_ABILITIES[abilityIds[i]];
    var cd = queenAbilityCooldowns[abilityIds[i]];
    var onCooldown = cd > 0;
    html += '<button onclick="useQueenAbility(\'' + abilityIds[i] + '\')" ' +
            'style="padding:6px 10px; border-radius:10px; border:1px solid #ffd700; background:' +
            (onCooldown ? 'rgba(100,100,100,0.7)' : 'rgba(180,120,30,0.8)') +
            '; color:#fff; font-size:11px; cursor:pointer; white-space:nowrap;"' +
            (onCooldown ? ' disabled' : '') + '>' +
            ab.emoji + ' ' + ab.name +
            (onCooldown ? ' (' + Math.ceil(cd) + 's)' : '') +
            '</button>';
  }
  container.innerHTML = html;
}

// ---- Initialize Royal Chamber system (called from main.js on game start) ----
function initRoyalChamber() {
  if (state.chambers.royal && state.chambers.royal.count > 0) {
    updateQueenAbilityButtons();
  }
}
