// ===== BOSS SYSTEM – UNIQUE MECHANICS & MILESTONES =====
// Bosses are memorable milestones with unique abilities, visual feedback,
// and meaningful rewards. Legendary bosses added for each biome.

var BOSS_FIGHT_TIMEOUT = 45;               // seconds before forced resolution
var BOSS_MILESTONES = [0.75, 0.5, 0.25];   // health-ratio callouts

// Boss tier lookup for defeat penalties
var BOSS_TIER = {
  queen:     1,
  beetle:    2,
  wasp:      3,
  centipede: 4,
  hydra:     5,
  wyrm:      6
};
var BOSS_DEFEAT_PENALTY_BASE = 0.10;
var BOSS_DEFEAT_PENALTY_STEP = 0.05;
var BOSS_DEFEAT_PENALTY_MAX  = 0.35;

var _bossSpawning = false;
var _firstBossSpawned = false; // for early warning

// ---- Spawn a boss ----
function spawnBoss() {
  if (_bossSpawning) return;
  _bossSpawning = true;

  // Show early warning for first boss
  if (!_firstBossSpawned) {
    _firstBossSpawned = true;
    showToast("💀 Something large approaches from the forest...");
    // spawn after a short delay to give player time to prepare
    setTimeout(function() {
      _doSpawnBoss();
      _bossSpawning = false;
    }, 10000); // 10 second warning
    return;
  }

  setTimeout(function() {
    try {
      _doSpawnBoss();
    } catch (e) {
      console.error("spawnBoss error:", e);
      state.bossActive = false;
    }
    _bossSpawning = false;
  }, 10);
}

function _doSpawnBoss() {
  if (state.bossActive) return;
  state.bossActive = true;

  var zoneId = state.currentZone;
  var isLegendary = false;
  var bossData = null;
  var bossKey = getBossTypeForZone();

  // Check for legendary spawn
  if (state.prestigeCount >= BAL.legendaryPrestigeReq &&
      LEGENDARY_BOSSES[zoneId] &&
      state.legendaryDefeated.indexOf(zoneId) === -1 &&
      Math.random() < BAL.legendarySpawnChance) {
    isLegendary = true;
    bossData = LEGENDARY_BOSSES[zoneId];
    bossKey = "legendary_" + zoneId; // unique key
  } else {
    bossData = BOSS_TYPES[bossKey];
  }

  var bt = bossData;
  state.bossType = bossKey;
  var cfg = getCurrentZoneConfig();
  var hpMult = 1 + state.prestigeCount * 0.3;
  var bossHealth, bossDamage, bossSpeed;

  if (isLegendary) {
    // Legendary stats: multiply base boss stats from config
    var baseBossKey = getBossTypeForZone(); // get the normal boss for this zone to look up base stats
    var baseBt = BOSS_TYPES[baseBossKey];
    bossHealth = Math.floor(BAL[baseBt.hpKey] * bt.hpMult * cfg.enemyMult);
    bossDamage = Math.floor(BAL[baseBt.dmgKey] * bt.dmgMult);
    bossSpeed = BAL[baseBt.spdKey] * bt.speedMult;
  } else {
    bossHealth = Math.floor(BAL[bt.hpKey] * hpMult * cfg.enemyMult);
    bossDamage = BAL[bt.dmgKey];
    bossSpeed = BAL[bt.spdKey];
  }

  state.bossMaxHealth = bossHealth;
  state.bossHealth = bossHealth;
  state._bossRetreatTimer = 0;
  state.bossFightTimer = 0;
  state._bossMilestonesHit = {};

  // Build boss mesh using the unique builder
  var bossMesh = buildBossMeshByType(bossKey, bt, isLegendary);

  var sx = SW / 2 - 5, sz = (Math.random() - 0.5) * (SD - 8);
  bossMesh.position.set(sx, GTY + 0.5, sz);
  scene.add(bossMesh);

  var hb = typeof createHealthBar === 'function' ? createHealthBar(bossMesh, 120, 12, 1.8) : null;
  var hbFill = document.getElementById('boss-health-fill');
  if (hbFill) {
    hbFill.style.background = isLegendary ? "#ff44ff" : "#cc0000";
  }

  // Boss target offset away from nest entrance so fights don't block workers
  var bossTarget = ER.clone().add(new THREE.Vector3(3, 0, 2));

  state.currentBoss = {
    mesh: bossMesh,
    health: bossHealth,
    maxHealth: bossHealth,
    healthBar: hb,
    speed: bossSpeed,
    target: bossTarget,
    attackCooldown: 0,
    lastAttack: 0,
    bossKey: bossKey,
    special: bt.special || null,
    isLegendary: isLegendary,
    legendaryZone: zoneId,
    _lastSpecialTime: 0,
    _burrowTimer: 0,
    _burrowed: false,
    _freezeAuraTimer: 0
  };

  // Show boss UI
  var bossNameEl = document.getElementById('boss-name');
  if (bossNameEl) {
    bossNameEl.textContent = (isLegendary ? "💎 " : "") + bt.name;
    bossNameEl.style.display = "block";
  }
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = "block";

  AudioManager.sfx.bossSpawn();
  triggerShake(isLegendary ? 10 : 6, 0.5);
  showToast((isLegendary ? "💎 Legendary " : "💀 ") + bt.name + " appeared!");
}

// ---- Build a unique boss mesh based on type ----
function buildBossMeshByType(bossKey, bt, isLegendary) {
  var mesh = new THREE.Group();
  var mainColor = bt.color;
  var legColor = bt.legColor;

  // Legendary glow
  var emissiveIntensity = isLegendary ? 0.4 : 0;
  var bodyMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.2, metalness: 0.4, emissive: mainColor, emissiveIntensity: emissiveIntensity });
  var legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.3 });

  // Base parts common to most bosses
  var addBossParts = function() {
    // abdomen
    var abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), bodyMat);
    abdomen.position.set(0, 0.4, -0.5);
    abdomen.scale.set(1, 0.8, 1.5);
    abdomen.castShadow = true;
    mesh.add(abdomen);
    // thorax
    var thorax = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), bodyMat);
    thorax.position.set(0, 0.5, 0.5);
    thorax.castShadow = true;
    mesh.add(thorax);
    // head
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat);
    head.position.set(0, 0.5, 1.0);
    head.castShadow = true;
    mesh.add(head);
    // eyes
    var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
    [-0.12, 0.12].forEach(function(sd) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
      eye.position.set(sd, 0.6, 1.15);
      mesh.add(eye);
    });
    // legs
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), legMat);
      leg.position.set(Math.cos(angle) * 0.7, 0.2, Math.sin(angle) * 0.5);
      leg.rotation.z = Math.cos(angle) * 0.4;
      leg.rotation.x = 0.5;
      leg.castShadow = true;
      mesh.add(leg);
    }
  };

  switch (bossKey) {
    case "queen":
      // Larger abdomen, spikier legs
      addBossParts();
      // increase abdomen size
      mesh.children[0].scale.set(1.4, 1.0, 2.0);
      // add extra spike on abdomen
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), legMat);
      spike.position.set(0, 0.8, -1.2);
      spike.rotation.x = Math.PI;
      mesh.add(spike);
      break;
    case "beetle":
      addBossParts();
      // add horn on head
      var horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), legMat);
      horn.position.set(0, 0.7, 1.3);
      horn.rotation.x = 0;
      mesh.add(horn);
      // thicker legs
      mesh.children.forEach(function(c) {
        if (c.geometry && c.geometry.type === 'CylinderGeometry' && c.position.y === 0.2) {
          c.geometry.dispose();
          c.geometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
        }
      });
      break;
    case "wasp":
      addBossParts();
      // add wings (two flat planes)
      var wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      [-1, 1].forEach(function(sd) {
        var wing = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), wingMat);
        wing.position.set(sd * 0.4, 0.7, 0.3);
        wing.rotation.y = sd * 0.4;
        wing.rotation.x = -0.2;
        mesh.add(wing);
      });
      // slender body
      mesh.children[0].scale.set(0.8, 0.8, 1.2);
      mesh.children[1].scale.set(0.9, 0.9, 1);
      break;
    case "centipede":
      // multiple segments
      var segments = 6;
      for (var i = 0; i < segments; i++) {
        var seg = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), bodyMat);
        seg.position.set(0, 0.3, -0.5 - i * 0.6);
        seg.castShadow = true;
        mesh.add(seg);
        // two short legs per segment
        [-0.3, 0.3].forEach(function(sd) {
          var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4), legMat);
          leg.position.set(sd, -0.1, -0.5 - i * 0.6);
          leg.rotation.z = sd > 0 ? 0.6 : -0.6;
          leg.castShadow = true;
          mesh.add(leg);
        });
      }
      // head
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bodyMat);
      head.position.set(0, 0.3, 0.8);
      head.castShadow = true;
      mesh.add(head);
      // eyes
      var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
      [-0.1, 0.1].forEach(function(sd) {
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
        eye.position.set(sd, 0.4, 0.95);
        mesh.add(eye);
      });
      break;
    case "hydra":
      // three heads on long necks
      var neckMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.4 });
      var headMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.3 });
      var angles = [-0.4, 0, 0.4];
      angles.forEach(function(ang) {
        var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 6), neckMat);
        neck.position.set(ang * 1.5, 0.9, 0.5);
        neck.rotation.z = ang * 1.2;
        neck.castShadow = true;
        mesh.add(neck);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), headMat);
        head.position.set(ang * 1.5, 1.4, 0.7);
        head.castShadow = true;
        mesh.add(head);
        // tiny eyes
        var tinyEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 }));
        tinyEye.position.set(ang * 1.5 + 0.06, 1.44, 0.8);
        mesh.add(tinyEye);
        tinyEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 }));
        tinyEye.position.set(ang * 1.5 - 0.06, 1.44, 0.8);
        mesh.add(tinyEye);
      });
      // central body
      var body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), bodyMat);
      body.position.set(0, 0.3, -0.2);
      body.scale.set(1, 0.8, 1.3);
      body.castShadow = true;
      mesh.add(body);
      // stubby legs
      for (var i = 0; i < 6; i++) {
        var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 4), legMat);
        leg.position.set(Math.cos(i * 1.0) * 0.8, 0.1, Math.sin(i * 1.0) * 0.8);
        leg.rotation.z = Math.cos(i) * 0.5;
        leg.castShadow = true;
        mesh.add(leg);
      }
      break;
    case "wyrm":
      // elongated serpentine body
      var len = 5;
      for (var i = 0; i < len; i++) {
        var seg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bodyMat);
        seg.position.set(0, 0.3, -1.0 - i * 0.8);
        seg.scale.set(1, 0.8, 1.2);
        seg.castShadow = true;
        mesh.add(seg);
      }
      // head
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), bodyMat);
      head.position.set(0, 0.4, 0.5);
      head.castShadow = true;
      mesh.add(head);
      // eyes
      var eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1 });
      [-0.1, 0.1].forEach(function(sd) {
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
        eye.position.set(sd, 0.5, 0.7);
        mesh.add(eye);
      });
      // small fins along back
      var finMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0.5, side: THREE.DoubleSide });
      for (var i = 0; i < len; i++) {
        var fin = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), finMat);
        fin.position.set(0, 0.9, -1.0 - i * 0.8);
        fin.rotation.x = Math.PI / 2;
        fin.castShadow = false;
        mesh.add(fin);
      }
      break;
    default:
      addBossParts();
  }

  // Legendary bosses emit constant glow
  if (isLegendary) {
    mesh.userData._legendaryGlow = true;
  }

  return mesh;
}

// ---- Get boss type for current zone ----
function getBossTypeForZone() {
  var available = [];
  for (var key in BOSS_TYPES) {
    var bt = BOSS_TYPES[key];
    if (bt.zones.indexOf(state.currentZone) !== -1) available.push(key);
  }
  if (available.length === 0) return "queen";
  return available[Math.floor(Math.random() * available.length)];
}

// ---- Check boss health milestones ----
function checkBossMilestones(boss) {
  var ratio = boss.health / boss.maxHealth;
  state._bossMilestonesHit = state._bossMilestonesHit || {};
  for (var i = 0; i < BOSS_MILESTONES.length; i++) {
    var m = BOSS_MILESTONES[i];
    if (ratio <= m && !state._bossMilestonesHit[m]) {
      state._bossMilestonesHit[m] = true;
      var bt = boss.isLegendary ? LEGENDARY_BOSSES[state.currentZone] : BOSS_TYPES[boss.bossKey];
      showToast("⚔️ " + bt.name + " down to " + Math.round(ratio * 100) + "%!");
      triggerShake(1, 0.1); // subtle shake on milestones
    }
  }
}

// ---- Update boss each frame (including legendary specials) ----
function updateBoss(dt) {
  if (!state.bossActive || !state.currentBoss) return;
  var boss = state.currentBoss;
  var bt = boss.isLegendary ? LEGENDARY_BOSSES[state.currentZone] : BOSS_TYPES[boss.bossKey];
  if (!bt) { resolveBossFight("timeout"); return; }

  state.bossHealth = boss.health;
  var hbFill = document.getElementById('boss-health-fill');
  if (hbFill) hbFill.style.width = Math.max(0, (boss.health / boss.maxHealth) * 100) + "%";

  // Legendary glow pulsates
  if (boss.mesh && boss.mesh.userData._legendaryGlow) {
    var glowIntensity = 0.3 + Math.sin(performance.now() / 500) * 0.2;
    boss.mesh.traverse(function(child) {
      if (child.isMesh && child.material.emissive) {
        child.material.emissiveIntensity = glowIntensity;
      }
    });
  }

  // Fight timeout while soldiers are engaged
  if (soldiers.length > 0) {
    state.bossFightTimer = (state.bossFightTimer || 0) + dt;
    if (state.bossFightTimer > BOSS_FIGHT_TIMEOUT) {
      resolveBossFight("timeout");
      return;
    }
  }

  // Unopposed boss retreat
  if (soldiers.length === 0) {
    var dtn = boss.mesh.position.distanceTo(ER);
    if (dtn < 1.5) {
      state._bossRetreatTimer = (state._bossRetreatTimer || 0) + dt;
      if (!state._lastBossStealTime) state._lastBossStealTime = 0;
      state._lastBossStealTime += dt;
      if (state._lastBossStealTime >= 2) {
        state._lastBossStealTime = 0;
        var stolen = Math.min(state.food, 15 + Math.floor(Math.random() * 20));
        if (stolen > 0) {
          state.food = Math.max(0, state.food - stolen);
          showToast("💀 Boss stole " + stolen + " food!");
          spawnFloater("-" + stolen + " 🌾", window.innerWidth / 2, window.innerHeight / 2, "#ff6666");
        }
      }
      if (state._bossRetreatTimer > 30) {
        resolveBossFight("timeout");
        return;
      }
    } else {
      state._bossRetreatTimer = Math.max(0, (state._bossRetreatTimer || 0) - dt);
    }
  }

  // ---- Legendary Special Mechanics ----
  if (boss.isLegendary) {
    var now = performance.now() / 1000;
    if (!boss._lastSpecialTime) boss._lastSpecialTime = now;

    switch (bt.special) {
      case "summonMinions":
        if (now - boss._lastSpecialTime > 10) {
          boss._lastSpecialTime = now;
          for (var mi = 0; mi < 2; mi++) {
            if (enemies.length < BAL.maxEnemies) {
              var miniSpider = createSpider();
              miniSpider.mesh.position.copy(boss.mesh.position);
              miniSpider.mesh.position.x += (Math.random() - 0.5) * 2;
              miniSpider.mesh.position.z += (Math.random() - 0.5) * 2;
              miniSpider.health = 15;
              miniSpider.maxHealth = 15;
              updateHealthBar(miniSpider.healthBar, 1);
            }
          }
        }
        break;

      case "areaAttack":
        if (now - boss._lastSpecialTime > 12) {
          boss._lastSpecialTime = now;
          for (var si = 0; si < soldiers.length; si++) {
            if (soldiers[si].mesh.position.distanceTo(boss.mesh.position) < 3.0) {
              var aoeDmg = Math.floor(getEffectiveSoldierMaxHealth() * 0.2);
              soldiers[si].health -= aoeDmg;
              spawnDamageNumber(aoeDmg, soldiers[si].mesh.position, "#ff8800");
              flashMesh(soldiers[si].mesh, 0xff8800, 0.1);
              updateHealthBar(soldiers[si].healthBar, soldiers[si].health / soldiers[si].maxHealth);
              if (soldiers[si].health <= 0) soldierDied(soldiers[si]);
            }
          }
          emitParticles(boss.mesh.position, 10, 0xff8800, 0.08, 1.5, 0.6);
        }
        break;

      case "healSteal":
        if (now - boss._lastSpecialTime > 8) {
          boss._lastSpecialTime = now;
          var totalHeal = 0;
          for (var si = 0; si < soldiers.length; si++) {
            if (soldiers[si].mesh.position.distanceTo(boss.mesh.position) < 3.0) {
              var steal = 10;
              soldiers[si].health -= steal;
              totalHeal += steal;
              spawnDamageNumber(steal, soldiers[si].mesh.position, "#44ff44");
              flashMesh(soldiers[si].mesh, 0x44ff44, 0.1);
              updateHealthBar(soldiers[si].healthBar, soldiers[si].health / soldiers[si].maxHealth);
              if (soldiers[si].health <= 0) soldierDied(soldiers[si]);
            }
          }
          boss.health = Math.min(boss.maxHealth, boss.health + totalHeal);
        }
        break;

      case "freezeAura":
        if (now - boss._lastSpecialTime > 5) {
          boss._lastSpecialTime = now;
          for (var si = 0; si < soldiers.length; si++) {
            if (soldiers[si].mesh.position.distanceTo(boss.mesh.position) < 2.0) {
              soldiers[si].freezeTimer = 1.0;
              soldiers[si].speed = 0.2;
            } else {
              soldiers[si].freezeTimer = 0;
              soldiers[si].speed = 0.9 + Math.random() * 0.3;
            }
          }
        }
        break;

      case "burrow":
        boss._burrowTimer = (boss._burrowTimer || 0) + dt;
        if (!boss._burrowed && boss._burrowTimer > 10) {
          boss._burrowed = true;
          boss._burrowTimer = 0;
          boss.mesh.position.y = -5; // hide underground
          showToast("🕳️ " + bt.name + " burrows underground!");
          setTimeout(function() {
            if (boss.mesh && soldiers.length > 0) {
              boss.mesh.position.copy(soldiers[0].mesh.position);
              boss.mesh.position.y = GTY + 0.5;
              showToast("💥 " + bt.name + " erupts from the ground!");
              boss._burrowed = false;
            }
          }, 2000);
        }
        break;

      case "regenerate":
        if (boss.health < boss.maxHealth) {
          boss.health += boss.maxHealth * 0.08 * dt; // stronger regen
          if (boss.health > boss.maxHealth) boss.health = boss.maxHealth;
        }
        break;
    }
  }

  // Boss movement toward nest
  var p = boss.mesh.position;
  var dx = boss.target.x - p.x, dy = boss.target.y - p.y, dz = boss.target.z - p.z;
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > 0.5 && !boss._burrowed) {
    var step = Math.min(boss.speed * dt, dist);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.z += (dz / dist) * step;
    boss.mesh.rotation.y = Math.atan2(dx, dz);
  }

  var now = performance.now() / 1000;
  if (boss.attackCooldown > 0) boss.attackCooldown -= dt;

  // Boss attacks soldiers
  if (boss.attackCooldown <= 0 && soldiers.length > 0) {
    for (var i = 0; i < soldiers.length; i++) {
      if (soldiers[i].mesh.position.distanceTo(p) < 2.5) {
        var dmg = boss.isLegendary ? Math.floor(getEffectiveSoldierMaxHealth() * 0.3) : BAL[bt.dmgKey];
        // Legendary Mountain: -15% boss damage taken
        if (state.gemUpgrades.legendaryMountain) dmg = Math.floor(dmg * 0.85);
        soldiers[i].health -= dmg;
        spawnDamageNumber(dmg, soldiers[i].mesh.position, "#ff0000");
        flashMesh(soldiers[i].mesh, 0xff0000, 0.1);
        boss.attackCooldown = 2.0;
        boss.lastAttack = now;
        updateHealthBar(soldiers[i].healthBar, soldiers[i].health / soldiers[i].maxHealth);
        if (boss.special === "poison" || bt.special === "poison") {
          (function(soldier) {
            soldier.damageMultiplier = 0.7;
            setTimeout(function() { if (soldier) soldier.damageMultiplier = 1; }, 5000);
          })(soldiers[i]);
        }
        if (boss.special === "freeze" || bt.special === "freeze") { soldiers[i].freezeTimer = 3.0; }
        if (soldiers[i].health <= 0) soldierDied(soldiers[i]);
        break;
      }
    }
  }

  if (!state.bossActive) return;

  // Soldiers attack boss
  for (var i = 0; i < soldiers.length; i++) {
    var s = soldiers[i];
    if (s.freezeTimer && s.freezeTimer > 0) { s.freezeTimer -= dt; continue; }
    if (s.mesh.position.distanceTo(p) < 2.0 && s.attackCooldown <= 0) {
      var sdmg = getEffectiveSoldierDamage();
      if (s.damageMultiplier) sdmg *= s.damageMultiplier;
      if (state.prestigeUpgrades.ppBoss) sdmg = Math.floor(sdmg * (1 + state.prestigeUpgrades.ppBoss * 0.25));
      if (state.ascensionUpgrades.monarchMight > 0) sdmg = Math.floor(sdmg * 2);
      boss.health -= sdmg;
      spawnDamageNumber(sdmg, p, "#ffaa00");
      flashMesh(boss.mesh, 0xff0000, 0.08);
      s.attackCooldown = BAL.soldierAttackCD;
      s.lastCombatTime = now;
      checkBossMilestones(boss);
      if (boss.health <= 0) { resolveBossFight("victory"); return; }
    }
  }

  // Non-legendary regeneration (Hydra)
  if (!boss.isLegendary && boss.special === "regen" && boss.health < boss.maxHealth) {
    boss.health += boss.maxHealth * 0.05 * dt;
    if (boss.health > boss.maxHealth) boss.health = boss.maxHealth;
  }
}

// ---- Resolve boss fight outcome ----
function resolveBossFight(outcome) {
  var boss = state.currentBoss;
  if (!boss) return;
  var bossKey = boss.bossKey;
  var isLegendary = boss.isLegendary;
  var bt = isLegendary ? LEGENDARY_BOSSES[state.currentZone] : BOSS_TYPES[bossKey];
  var bossPos = boss.mesh ? boss.mesh.position.clone() : ER.clone();

  if (boss.mesh) { disposeMesh(boss.mesh); scene.remove(boss.mesh); }
  state.bossActive = false;
  state.currentBoss = null;
  state.bossFightTimer = 0;
  state._bossMilestonesHit = {};

  var bossNameEl = document.getElementById('boss-name');
  if (bossNameEl) bossNameEl.style.display = "none";
  var bossBar = document.getElementById('boss-health-bar');
  if (bossBar) bossBar.style.display = "none";

  if (outcome === "victory") {
    state.bossKills++;
    state.lifetimeStats.totalBossKills++;
    if (!isLegendary) {
      if (bossKey === "beetle") state.beetleKills++;
      if (bossKey === "wasp") state.waspKills++;
      if (bossKey === "centipede") state.caveBossKills++;
      if (bossKey === "hydra") state.swampBossKills++;
      if (bossKey === "wyrm") state.mountainBossKills++;
    }
    if (!state.bossKillsByType) state.bossKillsByType = {};
    state.bossKillsByType[bossKey] = (state.bossKillsByType[bossKey] || 0) + 1;

    var foodReward = BAL.bossRewardFood + (isLegendary ? 200 : 0);
    var gemReward = BAL.bossRewardGems + (isLegendary ? 10 : 0);
    if (state.ascensionUpgrades.monarchMight > 0) { foodReward *= 2; gemReward *= 2; }

    addFood(foodReward, bossPos);
    addGems(gemReward);

    if (isLegendary && bt.rewardKey) {
      state.gemUpgrades[bt.rewardKey] = true;
      state.legendaryDefeated.push(state.currentZone);
      showToast("💎 Legendary " + bt.name + " defeated! Permanent bonus unlocked: " + GEM_ITEMS[bt.rewardKey].desc);
    } else {
      showToast("🏆 " + bt.name + " defeated! +" + foodReward + " food, +" + gemReward + " gems");
    }

    emitParticles(bossPos, isLegendary ? 30 : 15, bossKey === "wasp" ? 0xffff00 : (isLegendary ? 0xff44ff : 0xff4444), 0.08, 2.0, 0.8);
    AudioManager.sfx.bossDefeat();
    updateDailyProgress('boss1', 1);
    triggerShake(2, 0.3);
    state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);

  } else if (outcome === "defeat") {
    var tier = isLegendary ? 7 : (BOSS_TIER[bossKey] || 1);
    var penaltyPct = Math.min(BOSS_DEFEAT_PENALTY_MAX, BOSS_DEFEAT_PENALTY_BASE + (tier - 1) * BOSS_DEFEAT_PENALTY_STEP);
    var lost = Math.floor(state.food * penaltyPct);
    state.food = Math.max(0, state.food - lost);
    var respawnCut = 1 - (tier - 1) * 0.1;
    state.bossTimer = Math.max(BAL.soldierRespawnTime, BAL.bossIntervalMin * respawnCut);
    showToast("💀 Guard overrun! " + bt.name + " fled with " + lost + " food (" + Math.round(penaltyPct*100) + "%).");
    triggerShake(3 + tier * 0.4, 0.4);

  } else {
    state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
    showToast("🌫️ " + bt.name + " retreated after a long standoff.");
  }
  checkAchievements();
}

// Summon boss via button
function summonBoss() {
  if (state.bossActive) { showToast("Boss already active!"); return; }
  if (state.gems < BAL.summonCost) { showToast("Need " + BAL.summonCost + " 💎!"); return; }
  state.gems -= BAL.summonCost;
  if (summonBtn) summonBtn.disabled = true;
  spawnBoss();
  showToast("💀 Boss summoned!");
}

// Reset first boss flag on prestige/ascension
function resetFirstBossFlag() {
  _firstBossSpawned = false;
            }
