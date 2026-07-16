// ===== RIVAL COLONY INVASIONS =====
// Periodic scripted events where enemy ant colonies attack.
// Difficulty scales with player level. Victory rewards resources.
// Defeat means losing food.

var RIVAL_TYPES = {
  // ---- Tier 1: Weak rival (early game) ----
  scouts: {
    name: "Scout Party",
    emoji: "🐜",
    tier: 1,
    desc: "A small scouting party from a nearby colony.",
    enemyCount: 3,
    enemyHealth: 25,
    enemyDamage: 5,
    enemySpeed: 0.4,
    rewardFood: 40,
    rewardGems: 1,
    penaltyFood: 20,
    warningTime: 20, // seconds before attack
    minLevel: 3
  },

  // ---- Tier 2: Medium rival ----
  raiders: {
    name: "Raider Column",
    emoji: "⚔️",
    tier: 2,
    desc: "A column of raiders looking to steal food.",
    enemyCount: 5,
    enemyHealth: 40,
    enemyDamage: 8,
    enemySpeed: 0.5,
    rewardFood: 80,
    rewardGems: 2,
    penaltyFood: 40,
    warningTime: 25,
    minLevel: 8
  },

  // ---- Tier 3: Strong rival ----
  warriors: {
    name: "Warrior Invasion",
    emoji: "💀",
    tier: 3,
    desc: "A full invasion force from a rival colony.",
    enemyCount: 8,
    enemyHealth: 60,
    enemyDamage: 12,
    enemySpeed: 0.55,
    rewardFood: 150,
    rewardGems: 3,
    penaltyFood: 80,
    warningTime: 30,
    minLevel: 15
  },

  // ---- Tier 4: Elite rival ----
  elites: {
    name: "Elite Legion",
    emoji: "👑",
    tier: 4,
    desc: "The elite guard of a powerful rival Queen.",
    enemyCount: 10,
    enemyHealth: 90,
    enemyDamage: 18,
    enemySpeed: 0.6,
    rewardFood: 250,
    rewardGems: 5,
    penaltyFood: 150,
    warningTime: 35,
    minLevel: 25
  },

  // ---- Tier 5: Legendary rival ----
  legendary: {
    name: "Legendary Horde",
    emoji: "🔥",
    tier: 5,
    desc: "A legendary army from the depths of the earth.",
    enemyCount: 15,
    enemyHealth: 130,
    enemyDamage: 25,
    enemySpeed: 0.65,
    rewardFood: 500,
    rewardGems: 10,
    penaltyFood: 300,
    warningTime: 40,
    minLevel: 40
  }
};

// ---- Rival invasion state ----
var rivalState = {
  active: false,
  warningActive: false,
  warningTimer: 0,
  rivalType: null,
  enemiesRemaining: 0,
  enemiesSpawned: 0,
  totalEnemies: 0,
  victoryProcessed: false
};

// ---- Pick a rival based on player level ----
function pickRivalType() {
  var level = state.level;
  var available = [];
  for (var key in RIVAL_TYPES) {
    if (level >= RIVAL_TYPES[key].minLevel) {
      available.push(key);
    }
  }
  if (available.length === 0) return "scouts";
  // Weight toward higher tiers as level increases
  var highestTier = available[available.length - 1];
  var randomIndex = Math.floor(Math.random() * available.length);
  // 60% chance of picking the highest available tier
  return Math.random() < 0.6 ? highestTier : available[randomIndex];
}

// ---- Start a rival invasion warning ----
function triggerRivalInvasion() {
  if (rivalState.active || rivalState.warningActive) return;
  if (state.level < 3) return; // no rivals before level 3

  var rivalKey = pickRivalType();
  var rival = RIVAL_TYPES[rivalKey];

  rivalState.warningActive = true;
  rivalState.warningTimer = rival.warningTime;
  rivalState.rivalType = rivalKey;
  rivalState.active = false;
  rivalState.enemiesRemaining = rival.enemyCount;
  rivalState.enemiesSpawned = 0;
  rivalState.totalEnemies = rival.enemyCount;
  rivalState.victoryProcessed = false;

  showToast(rival.emoji + " " + rival.name + " approaching! " + Math.ceil(rival.warningTime) + "s to prepare!");
  AudioManager.sfx.waveIncoming();

  // Show warning on HUD
  updateRivalWarning();
}

// ---- Update rival warning timer ----
function updateRivalWarning(dt) {
  if (!rivalState.warningActive) return;

  rivalState.warningTimer -= dt;

  // Update HUD warning
  updateRivalWarning();

  if (rivalState.warningTimer <= 0) {
    // Start the invasion
    startRivalInvasion();
  }
}

// ---- Display rival warning on HUD ----
function updateRivalWarning() {
  var el = document.getElementById('rival-warning');
  if (!rivalState.warningActive) {
    if (el) el.style.display = 'none';
    return;
  }

  if (!el) {
    el = document.createElement('div');
    el.id = 'rival-warning';
    el.style.cssText = 'position:absolute; top:130px; left:50%; transform:translateX(-50%); z-index:30; padding:8px 16px; background:rgba(200,50,50,0.9); border:2px solid #ff4444; border-radius:12px; color:#fff; font-weight:700; font-size:14px; pointer-events:none;';
    document.body.appendChild(el);
  }

  var rival = RIVAL_TYPES[rivalState.rivalType];
  el.style.display = 'block';
  el.textContent = rival.emoji + ' ' + rival.name + ' in ' + Math.ceil(rivalState.warningTimer) + 's!';
}

// ---- Start the actual invasion ----
function startRivalInvasion() {
  var rival = RIVAL_TYPES[rivalState.rivalType];
  rivalState.warningActive = false;
  rivalState.active = true;

  // Hide warning
  var el = document.getElementById('rival-warning');
  if (el) el.style.display = 'none';

  showToast(rival.emoji + " " + rival.name + " is attacking!");
  AudioManager.sfx.bossSpawn();

  // Spawn enemies in waves
  spawnRivalWave();
}

// ---- Spawn a wave of rival ants ----
function spawnRivalWave() {
  var rival = RIVAL_TYPES[rivalState.rivalType];
  var spawnCount = Math.min(3, rivalState.enemiesRemaining - rivalState.enemiesSpawned);

  for (var i = 0; i < spawnCount; i++) {
    if (enemies.length >= BAL.maxEnemies) break;
    createRivalAnt(rival);
    rivalState.enemiesSpawned++;
  }

  // If more to spawn, schedule next wave
  if (rivalState.enemiesSpawned < rivalState.enemiesRemaining) {
    setTimeout(function() {
      if (rivalState.active) spawnRivalWave();
    }, 2000);
  }
}

// ---- Create a single rival ant ----
function createRivalAnt(rival) {
  var g = new THREE.Group();

  // Rival ant uses a brown/red colour scheme
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.3, metalness: 0.1 });
  var abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bodyMat);
  abdomen.position.set(0, 0.2, -0.2);
  abdomen.scale.set(1, 0.8, 1.2);
  abdomen.castShadow = true;
  g.add(abdomen);

  var thorax = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), bodyMat);
  thorax.position.set(0, 0.25, 0.1);
  thorax.castShadow = true;
  g.add(thorax);

  var head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), bodyMat);
  head.position.set(0, 0.25, 0.28);
  head.castShadow = true;
  g.add(head);

  // Red eyes
  var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
  [-0.05, 0.05].forEach(function(sd) {
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
    eye.position.set(sd, 0.28, 0.32);
    g.add(eye);
  });

  // Legs
  var legMat = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.5 });
  for (var j = 0; j < 6; j++) {
    var angle = (j / 6) * Math.PI * 2;
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), legMat);
    leg.position.set(Math.cos(angle) * 0.25, 0.1, Math.sin(angle) * 0.15);
    leg.rotation.z = Math.cos(angle) * 0.3;
    leg.rotation.x = 0.4;
    leg.castShadow = true;
    g.add(leg);
  }

  // Spawn from a random edge
  var edge = Math.floor(Math.random() * 4);
  var sx, sz, m = 2;
  if (edge === 0) { sx = SW / 2 - m; sz = (Math.random() - 0.5) * (SD - 4); }
  else if (edge === 1) { sx = -SW / 2 + m; sz = (Math.random() - 0.5) * (SD - 4); }
  else if (edge === 2) { sx = (Math.random() - 0.5) * (SW - 4); sz = SD / 2 - m; }
  else { sx = (Math.random() - 0.5) * (SW - 4); sz = -SD / 2 + m; }

  g.position.set(sx, GTY + 0.2, sz);
  scene.add(g);

  var hb = createHealthBar(g, 70, 8, 1.0);
  var enemy = {
    mesh: g,
    health: rival.enemyHealth,
    maxHealth: rival.enemyHealth,
    speed: rival.enemySpeed + Math.random() * 0.1,
    healthBar: hb,
    target: ER.clone(),
    attackCooldown: 0,
    stealing: false,
    fleeTarget: null,
    isRival: true,
    damage: rival.enemyDamage,
    _stuckTimer: 0
  };
  enemies.push(enemy);
  return enemy;
}

// ---- Process rival invasion progress ----
function updateRivalInvasion(dt) {
  if (!rivalState.active) return;

  // Check if all enemies are dead
  if (rivalState.enemiesSpawned >= rivalState.totalEnemies) {
    var rivalAlive = false;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].isRival) { rivalAlive = true; break; }
    }

    if (!rivalAlive && !rivalState.victoryProcessed) {
      resolveRivalInvasion(true);
    }
  }

  // Check if too much time has passed (defeat)
  if (rivalState.active && !rivalState.victoryProcessed) {
    rivalState._totalTime = (rivalState._totalTime || 0) + dt;
    if (rivalState._totalTime > 120) {
      resolveRivalInvasion(false);
    }
  }
}

// ---- Resolve rival invasion outcome ----
function resolveRivalInvasion(victory) {
  var rival = RIVAL_TYPES[rivalState.rivalType];
  rivalState.active = false;
  rivalState.victoryProcessed = true;

  // Clear remaining rival enemies
  for (var i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].isRival) {
      disposeMesh(enemies[i].mesh);
      scene.remove(enemies[i].mesh);
      enemies.splice(i, 1);
    }
  }

  if (victory) {
    addFood(rival.rewardFood, ER);
    if (rival.rewardGems > 0) addGems(rival.rewardGems);
    showToast("🏆 " + rival.name + " defeated! +" + rival.rewardFood + " food, +" + rival.rewardGems + "💎");
    AudioManager.sfx.bossDefeat();
    triggerShake(2, 0.3);
  } else {
    var lost = Math.min(state.food, rival.penaltyFood);
    state.food = Math.max(0, state.food - lost);
    showToast("💀 " + rival.name + " overran the colony! Lost " + lost + " food.");
    AudioManager.sfx.spiderDeath();
    triggerShake(4, 0.5);
  }

  // Reset for next invasion (long cooldown)
  setTimeout(function() {
    rivalState.warningActive = false;
    rivalState.active = false;
    rivalState.victoryProcessed = false;
  }, 300000); // 5 minutes between invasions
}
