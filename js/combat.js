// ===== COMBAT RESOLUTION, BOSS SYSTEM =====

function combatUpdate(dt) {
  var cdt = Math.min(dt, 0.2);
  var guardRadius = getEffectiveGuardRadius();

  // Soldier attacks vs spiders
  for (var i = soldiers.length - 1; i >= 0; i--) {
    var s = soldiers[i];
    if (s.attackCooldown > 0) s.attackCooldown -= cdt;
    var te = null, nd = 1.8;
    for (var j = 0; j < enemies.length; j++) {
      var d = s.mesh.position.distanceTo(enemies[j].mesh.position);
      if (d < nd) { nd = d; te = enemies[j]; }
    }
    if (te && s.attackCooldown <= 0) {
      var dmg = getEffectiveSoldierDamage();
      if (s.damageMultiplier) dmg *= s.damageMultiplier;
      te.health -= dmg;
      spawnDamageNumber(dmg, te.mesh.position, "#ff4444");
      s.attackCooldown = BAL.soldierAttackCD;
      s.lastCombatTime = performance.now() / 1000;
      if (te.health <= 0) killSpider(te);
    }
  }

  // Spider attacks vs soldiers / nest
  for (var j = enemies.length - 1; j >= 0; j--) {
    var sp = enemies[j];
    if (sp.stealing) continue;
    var dtn = sp.mesh.position.distanceTo(ER);
    var hasNearbySoldier = false;
    for (var i = 0; i < soldiers.length; i++) {
      if (sp.mesh.position.distanceTo(soldiers[i].mesh.position) < guardRadius) {
        hasNearbySoldier = true;
        break;
      }
    }
    var canSneak = (dtn < 1.2 && !hasNearbySoldier && Math.random() < BAL.spiderSneakChance);
    if ((dtn < 1.0 && soldiers.length === 0) || canSneak) {
      var stolen = Math.min(state.food, BAL.spiderStealMin + Math.floor(Math.random() * (BAL.spiderStealMax - BAL.spiderStealMin + 1)));
      state.food = Math.max(0, state.food - stolen);
      sp.stealing = true;
      sp.fleeTarget = sp.mesh.position.clone().add(new THREE.Vector3(SW / 2, 0, 0));
      showToast("🕷️ Spider stole " + stolen + " food!");
      spawnFloater("-" + stolen + " 🌾", window.innerWidth / 2, window.innerHeight / 2, "#ff6666");
      continue;
    }
    if (sp.attackCooldown > 0) { sp.attackCooldown -= cdt; continue; }
    var ts = null, nsd = 1.5;
    for (var i = 0; i < soldiers.length; i++) {
      var d = sp.mesh.position.distanceTo(soldiers[i].mesh.position);
      if (d < nsd) { nsd = d; ts = soldiers[i]; }
    }
    if (ts) {
      var dmg = BAL.spiderDamage;
      // Defense banner halves damage to soldiers
      if (state.defenseBannerTimer > 0) dmg = Math.floor(dmg / 2);
      ts.health -= dmg;
      spawnDamageNumber(dmg, ts.mesh.position, "#ffaa00");
      sp.attackCooldown = BAL.spiderAttackCD;
      ts.lastCombatTime = performance.now() / 1000;
      updateHealthBar(ts.healthBar, ts.health / ts.maxHealth);
      if (ts.health <= 0) soldierDied(ts);
    }
  }
}

function getBossTypeForZone() {
  var available = [];
  var cfg = getCurrentZoneConfig();
  for (var key in BOSS_TYPES) {
    var bt = BOSS_TYPES[key];
    if (bt.zones.indexOf(state.currentZone) !== -1) available.push(key);
  }
  if (available.length === 0) return "queen";
  return available[Math.floor(Math.random() * available.length)];
}

function spawnBoss() {
  if (state.bossActive) return;
  state.bossActive = true;
  var bossKey = getBossTypeForZone();
  var bt = BOSS_TYPES[bossKey];
  state.bossType = bossKey;
  var cfg = getCurrentZoneConfig();
  var hpMult = 1 + state.prestigeCount * 0.3;
  var bossHealth = Math.floor(BAL[bt.hpKey] * hpMult * cfg.enemyMult);
  state.bossMaxHealth = bossHealth;
  state.bossHealth = bossHealth;
  var bossMesh = new THREE.Group();
  var bodyMat = new THREE.MeshStandardMaterial({ color: bt.color, roughness: 0.2, metalness: 0.4 });
  var abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), bodyMat);
  abdomen.position.set(0, 0.4, -0.5);
  abdomen.scale.set(1, 0.8, 1.5);
  abdomen.castShadow = true;
  bossMesh.add(abdomen);
  var thorax = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), bodyMat);
  thorax.position.set(0, 0.5, 0.5);
  thorax.castShadow = true;
  bossMesh.add(thorax);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat);
  head.position.set(0, 0.5, 1.0);
  head.castShadow = true;
  bossMesh.add(head);
  var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
  [-0.12, 0.12].forEach(function(sd) {
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
    eye.position.set(sd, 0.6, 1.15);
    bossMesh.add(eye);
  });
  var legMat = new THREE.MeshStandardMaterial({ color: bt.legColor, roughness: 0.3 });
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), legMat);
    leg.position.set(Math.cos(angle) * 0.7, 0.2, Math.sin(angle) * 0.5);
    leg.rotation.z = Math.cos(angle) * 0.4;
    leg.rotation.x = 0.5;
    leg.castShadow = true;
    bossMesh.add(leg);
  }
  var sx = SW / 2 - 5, sz = (Math.random() - 0.5) * (SD - 8);
  bossMesh.position.set(sx, GTY + 0.5, sz);
  scene.add(bossMesh);
  var hb = createHealthBar(bossMesh, 120, 12, 1.8);
  var hbFill = document.getElementById('boss-health-fill');
  var colorMap = { beetle: "#888800", wasp: "#cccc00", centipede: "#886644", hydra: "#44aa44", wyrm: "#4488ff" };
  hbFill.style.background = colorMap[bossKey] || "#cc0000";
  state.currentBoss = {
    mesh: bossMesh,
    health: bossHealth,
    maxHealth: bossHealth,
    healthBar: hb,
    speed: BAL[bt.spdKey],
    target: ER.clone(),
    attackCooldown: 0,
    lastAttack: 0,
    bossKey: bossKey,
    special: bt.special || null
  };
  document.getElementById('boss-name').textContent = bt.icon + " " + bt.name;
  document.getElementById('boss-name').style.color = colorMap[bossKey] || "#ff4444";
  document.getElementById('boss-name').style.display = "block";
  document.getElementById('boss-health-bar').style.display = "block";
  AudioManager.sfx.bossSpawn();
  triggerShake(6, 0.5);
  showToast("💀 " + bt.name + " appeared!");
}

function updateBoss(dt) {
  if (!state.bossActive || !state.currentBoss) return;
  var boss = state.currentBoss;
  var bt = BOSS_TYPES[boss.bossKey];
  state.bossHealth = boss.health;
  document.getElementById('boss-health-fill').style.width = Math.max(0, (boss.health / boss.maxHealth) * 100) + "%";
  var p = boss.mesh.position;
  var dx = boss.target.x - p.x, dy = boss.target.y - p.y, dz = boss.target.z - p.z;
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > 0.5) {
    var step = Math.min(boss.speed * dt, dist);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.z += (dz / dist) * step;
    boss.mesh.rotation.y = Math.atan2(dx, dz);
  }
  var now = performance.now() / 1000;
  if (boss.attackCooldown > 0) boss.attackCooldown -= dt;
  if (boss.attackCooldown <= 0 && dist < 2.5) {
    for (var i = 0; i < soldiers.length; i++) {
      if (soldiers[i].mesh.position.distanceTo(p) < 2.5) {
        var dmg = BAL[bt.dmgKey];
        // Defense banner halves boss damage
        if (state.defenseBannerTimer > 0) dmg = Math.floor(dmg / 2);
        soldiers[i].health -= dmg;
        spawnDamageNumber(dmg, soldiers[i].mesh.position, "#ff0000");
        boss.attackCooldown = 2.0;
        boss.lastAttack = now;
        updateHealthBar(soldiers[i].healthBar, soldiers[i].health / soldiers[i].maxHealth);
        if (boss.special === "poison") { soldiers[i].damageMultiplier = 0.7; setTimeout(function() { soldiers[i].damageMultiplier = 1; }, 5000); }
        if (boss.special === "freeze") { soldiers[i].freezeTimer = 3.0; }
        if (soldiers[i].health <= 0) soldierDied(soldiers[i]);
        break;
      }
    }
  }
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
      s.attackCooldown = BAL.soldierAttackCD;
      s.lastCombatTime = now;
      if (boss.health <= 0) killBoss();
    }
  }
  if (boss.special === "regen" && boss.health < boss.maxHealth) {
    boss.health += boss.maxHealth * 0.05 * dt;
    if (boss.health > boss.maxHealth) boss.health = boss.maxHealth;
  }
}

function killBoss() {
  var boss = state.currentBoss;
  var bossKey = boss.bossKey;
  disposeMesh(boss.mesh);
  scene.remove(boss.mesh);
  state.bossActive = false;
  state.currentBoss = null;
  state.bossKills++;
  state.lifetimeStats.totalBossKills++;
  if (bossKey === "beetle") state.beetleKills++;
  if (bossKey === "wasp") state.waspKills++;
  if (bossKey === "centipede") state.caveBossKills++;
  if (bossKey === "hydra") state.swampBossKills++;
  if (bossKey === "wyrm") state.mountainBossKills++;
  if (!state.bossKillsByType) state.bossKillsByType = {};
  state.bossKillsByType[bossKey] = (state.bossKillsByType[bossKey] || 0) + 1;
  var cfg = getCurrentZoneConfig();
  var foodReward = BAL.bossRewardFood + cfg.foodBonus * 10;
  var gemReward = BAL.bossRewardGems + (bossKey === "wasp" ? 2 : 0);
  if (state.ascensionUpgrades.monarchMight > 0) { foodReward *= 2; gemReward *= 2; }
  addFood(foodReward, boss.mesh.position);
  addGems(gemReward);
  emitParticles(boss.mesh.position, 15, bossKey === "wasp" ? 0xffff00 : (bossKey === "centipede" ? 0x886644 : 0xff4444), 0.08, 2.0, 0.8);
  document.getElementById('boss-name').style.display = "none";
  document.getElementById('boss-health-bar').style.display = "none";
  state.bossTimer = BAL.bossIntervalMin + Math.random() * (BAL.bossIntervalMax - BAL.bossIntervalMin);
  AudioManager.sfx.bossDefeat();
  updateDailyProgress('boss1', 1);
  showToast("💀 " + BOSS_TYPES[bossKey].name + " defeated! +" + foodReward + " food, +" + gemReward + " gems");
  checkAchievements();
  triggerShake(2, 0.3);
}

function summonBoss() {
  if (state.bossActive) { showToast("Boss already active!"); return; }
  if (state.gems < BAL.summonCost) { showToast("Need " + BAL.summonCost + " 💎!"); return; }
  state.gems -= BAL.summonCost;
  spawnBoss();
  showToast("💀 Boss summoned!");
      }
