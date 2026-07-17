// ===== ROYAL CHAMBER & QUEEN ABILITIES =====
// The Royal Chamber unlocks active Queen abilities that the player can trigger.
// Each ability has a cooldown and provides a temporary powerful effect.
// Building is handled by buildings.js – this file only manages abilities.

var QUEEN_ABILITIES = {
  // ---- Tier 1: Available when Royal Chamber is built ----
  fertileSurge: {
    name: "Fertile Surge",
    emoji: "👑",
    desc: "Queen lays " + BAL.surgeEggs + " eggs instantly.",
    cooldown: 60, // seconds
    duration: 0,  // instant
    cost: 0,
    unlock: null, // always available after Royal Chamber
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
    unlock: "queensWrathResearch",
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
    unlock: null, // always available after Royal Chamber
    action: function() {
      state.speedBoostTimer = Math.max(state.speedBoostTimer, 20);
      applyAllWorkerSpeeds();
      showToast("📜 Royal Decree! Workers 2x speed for 20s!");
      AudioManager.sfx.rally();
    }
  },

  // ---- Tier 3: Unlocked after research ----
  pheromoneShield: {
    name: "Pheromone Shield",
    emoji: "🛡️",
    desc: "All colony units take 50% less damage for 10 seconds.",
    cooldown: 180,
    duration: 10,
    cost: 0,
    unlock: "pheromoneMastery",
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
    unlock: null, // always available after Royal Chamber
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

// ---- Use a Queen ability ----
function useQueenAbility(abilityId) {
  var ability = QUEEN_ABILITIES[abilityId];
  if (!ability) return;

  // Check if Royal Chamber exists
  if (!state.chambers.royal || state.chambers.royal.count === 0) {
    showToast("Build a Royal Chamber first!");
    return;
  }

  // Check if ability is unlocked via research
  if (ability.unlock && (!state.completedResearch || state.completedResearch.indexOf(ability.unlock) === -1)) {
    showToast("Research required for " + ability.name + "!");
    return;
  }

  // Check cooldown
  if (queenAbilityCooldowns[abilityId] > 0) {
    showToast("Ability on cooldown! " + Math.ceil(queenAbilityCooldowns[abilityId]) + "s remaining.");
    return;
  }

  // Check cost
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

  // Update ability button display every second
  if (Math.floor(Date.now() / 1000) % 1 === 0) {
    updateQueenAbilityButtons();
  }
}

// ---- Create/update Queen ability buttons on HUD ----
function updateQueenAbilityButtons() {
  // Do NOT show if the game is paused (main menu, loading, etc.)
  if (typeof gamePaused !== 'undefined' && gamePaused) return;

  var container = document.getElementById('queen-abilities');
  if (!state.chambers.royal || state.chambers.royal.count === 0) {
    if (container) container.style.display = 'none';
    return;
  }

  if (!container) {
    container = document.createElement('div');
    container.id = 'queen-abilities';
    // Right‑side vertical bar, small circles, no text
    container.style.cssText = 'position:fixed; top:50%; right:8px; transform:translateY(-50%);' +
      'z-index:120; display:none; flex-direction:column; gap:8px; pointer-events:auto;';
    document.body.appendChild(container);
  }

  container.style.display = 'flex';

  var abilityIds = ["fertileSurge", "royalDecree", "queensWrath", "pheromoneShield", "callOfTheQueen"];
  var html = '';
  for (var i = 0; i < abilityIds.length; i++) {
    var ab = QUEEN_ABILITIES[abilityIds[i]];
    // Check if ability is unlocked
    if (ab.unlock && (!state.completedResearch || state.completedResearch.indexOf(ab.unlock) === -1)) {
      continue; // skip locked abilities
    }

    var cd = queenAbilityCooldowns[abilityIds[i]];
    var onCooldown = cd > 0;

    // Small circle button
    var size = 44; // px
    var bg = onCooldown ? 'rgba(80,80,80,0.85)' : 'rgba(180,120,30,0.85)';
    var ringColor = onCooldown ? '#888' : '#ffd700';
    var cdPercent = onCooldown ? (cd / ab.cooldown) : 0;
    var ringStyle = '';
    if (onCooldown) {
      var angle = 360 * (1 - cdPercent);
      ringStyle = 'background: conic-gradient(#888 ' + angle.toFixed(0) + 'deg, transparent 0);';
    }

    html += '<button onclick="useQueenAbility(\'' + abilityIds[i] + '\')" ' +
            'style="width:' + size + 'px; height:' + size + 'px; border-radius:50%; border:2px solid ' + ringColor + ';' +
            'background: ' + bg + '; color:#fff; font-size:20px; cursor:pointer;' +
            'display:flex; align-items:center; justify-content:center;' +
            'box-shadow:0 4px 8px rgba(0,0,0,0.5);' +
            (onCooldown ? ' position:relative; overflow:hidden;' : '') +
            '"' +
            (onCooldown ? ' disabled' : '') +
            ' title="' + ab.name + (onCooldown ? ' (' + Math.ceil(cd) + 's)' : '') + '"' +
            '>' +
            ab.emoji +
            (onCooldown ? '<span style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:50%;' + ringStyle + '"></span>' : '') +
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
