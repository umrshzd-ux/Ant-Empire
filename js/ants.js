// ===== ANT MODEL, WORKERS, SOLDIERS, QUEEN, EGGS =====
// Scouts have been moved to scouts.js
// Ant classes integrated via antclasses.js

var NEST_SAFE_RADIUS = 6.0;

function buildAntMesh(scale, bodyColor, headScale, goldenColor, mandibleOverride, rareColor) {
  var g = new THREE.Group();
  var bh = 0.22;
  var color = rareColor || goldenColor || (state.gemUpgrades && state.gemUpgrades.goldenSkin ? 0xd4af37 : bodyColor);
  var isRare = !!rareColor;
  var isGolden = goldenColor || (state.gemUpgrades && state.gemUpgrades.goldenSkin);
  var am = new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: (isGolden || isRare) ? 0.3 : 0.1, emissive: isRare ? color : 0x000000, emissiveIntensity: isRare ? 0.3 : 0 });
  var ab = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), am);
  ab.position.set(0, bh, -0.32); ab.scale.set(1, 0.9, 1.3); ab.castShadow = true; g.add(ab);
  var th = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), am);
  th.position.set(0, bh, 0); th.castShadow = true; g.add(th);
  var hs = headScale || 1;
  var hd = new THREE.Mesh(new THREE.SphereGeometry(0.15 * hs, 8, 8), am);
  hd.position.set(0, bh, 0.26); hd.castShadow = true; g.add(hd);
  var mandibles = [];
  if (hs > 1.2) {
    var mandThickness = mandibleOverride || (BAL.soldierMandibleBaseThickness + state.upgrades.soldierDamage * BAL.soldierMandibleScalePerUpgrade);
    [-1, 1].forEach(function(sd) {
      var mand = new THREE.Mesh(new THREE.CylinderGeometry(mandThickness, mandThickness * 0.8, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.3 }));
      mand.position.set(sd * 0.08, bh, 0.38); mand.rotation.x = sd * 0.5; mand.castShadow = true; g.add(mand); mandibles.push(mand);
    });
  }
  g.userData = { mandibles: mandibles, headMesh: hd, idleTime: Math.random() * Math.PI * 2 };
  var lm = new THREE.MeshStandardMaterial({ color: isGolden ? 0xb8860b : (isRare ? 0x333333 : 0x4a3826), roughness: 0.5 });
  for (var i = -1; i <= 1; i++) { [-1, 1].forEach(function(sd) { var lg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, bh * 1.45, 4), lm); lg.position.set(sd * 0.2, bh / 2, i * 0.1); lg.rotation.z = sd * 0.6; lg.castShadow = true; g.add(lg); }); }
  g.scale.set(scale, scale, scale);
  return g;
}

function createLabelSprite(text) {
  var c = document.createElement("canvas"); c.width = 128; c.height = 32;
  var ctx = c.getContext("2d"); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(4, 2, 120, 28); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 64, 20);
  var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  return { sprite: s, canvas: c, texture: t };
}
function setLabelText(lb, text) { var ctx = lb.canvas.getContext("2d"); ctx.clearRect(0, 0, 128, 32); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(4, 2, 120, 28); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 64, 20); lb.texture.needsUpdate = true; }
function addLabel(parent, text, yOff, undergroundOnly) { var l = createLabelSprite(text); l.sprite.position.set(0, yOff, 0); l.sprite.scale.set(1.0, 0.25, 1); l.sprite.userData = { isLabel: true, undergroundOnly: !!undergroundOnly }; parent.add(l.sprite); return l; }

var qMesh;
function initQueen() { qMesh = buildAntMesh(queenScale, 0x8a4a1a); qMesh.position.set(TX, NP.y, CZ); scene.add(qMesh); addLabel(qMesh, "👑 Queen", 1.3, true); qMesh.userData = { idleTime: 0, isQueen: true }; }
initQueen();

renderer.domElement.addEventListener('click', function(e) {
  if (!qMesh) return; var mouse = new THREE.Vector2(); mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera); var intersects = raycaster.intersectObject(qMesh, true);
  if (intersects.length > 0) { state.queenClicks++; emitParticles(_v3.copy(qMesh.position), 5, 0xff44ff, 0.03, 0.5, 0.4); showToast("👑 Queen clicked! (" + state.queenClicks + ")"); checkAchievements(); }
});

var workers = []; var nWI = 0;
function getWorkerVisualScale() { return BAL.workerBaseScale + state.upgrades.workerSpeed * BAL.workerScalePerUpgrade; }
function pathToStation(st) { return [TB_vec, ED, ER, new THREE.Vector3(st.x, GTY, st.z)]; }
function pathToNest(st) { return [new THREE.Vector3(st.x, GTY, st.z), ER, ED, TB_vec, NP]; }
function getLeastLoadedStation() { var best = null, bestCount = 999; for (var i = 0; i < FS.length; i++) { var count = 0; var st = FS[i]; for (var j = 0; j < workers.length; j++) { if (workers[j].rendered && !workers[j].isSoldier && !workers[j].isScout && workers[j].station === st) count++; } if (count < bestCount) { bestCount = count; best = st; } } return best || FS[0]; }
function createWorker(golden, rareType, forceRender) {
  var id = nWI++; var vis = true; if (!forceRender) { var vc = 0; for (var i = 0; i < workers.length; i++) if (workers[i].rendered && !workers[i].isSoldier && !workers[i].isScout) vc++; vis = vc < BAL.maxRenderedAnts; } if (!vis) { return null; }
  var st = getLeastLoadedStation(); var mesh = null; var ws = getWorkerVisualScale();
  if (rareType) mesh = buildAntMesh(ws, 0x1c1410, 1, null, null, rareType.color); else if (golden) mesh = buildAntMesh(ws, 0x1c1410, 1, 0xd4af37); else mesh = buildAntMesh(ws, 0x1c1410);
  mesh.position.copy(NP); scene.add(mesh);
  if (rareType) addLabel(mesh, rareType.emoji + " " + rareType.name, 0.9, false); else if (golden) addLabel(mesh, "🥇 Golden Worker", 0.9, false);
  var baseSpeed = getEffectiveWorkerSpeed(); var speedMult = 1; if (golden) speedMult = 2; if (rareType) speedMult = 1 + rareType.speedBonus;
  var w = { id: id, mesh: mesh, station: st, slotIndex: null, state: "TO_FOOD", path: pathToStation(st), pathIndex: 0, speed: baseSpeed * speedMult + Math.random() * 0.4, waitTimer: Math.random() * 1.5, carrying: false, foodIcon: null, eggIcon: null, targetScale: ws, rendered: true, personalOffset: (Math.random() - 0.5) * 0.6, isSoldier: false, isScout: false, carryingEgg: false, avoidTimer: 0, isGolden: golden || false, isRare: !!rareType, rareType: rareType, foodBonus: rareType ? rareType.foodBonus : 0, _speedMult: speedMult };
  if (state.rallyActive) w.speed *= BAL.rallySpeedMultiplier;

  // Ant class integration
  var cls = typeof assignClass === 'function' ? assignClass("worker") : null;
  if (cls) applyClassBonuses(w, cls);

  return w;
}
function setPathTarget(w, d) { w.path = d === "FOOD" ? pathToStation(w.station) : pathToNest(w.station); w.pathIndex = 0; }
function rebalanceWorkers() { for (var i = 0; i < workers.length; i++) { var w = workers[i]; if (!w.rendered || w.isSoldier || w.isScout || w.carrying || w.carryingEgg) continue; if (Math.random() < 0.2) { var newSt = getLeastLoadedStation(); if (newSt !== w.station) { if (w.slotIndex !== null) releaseStationSlot(w.station, w.slotIndex); w.station = newSt; w.slotIndex = null; w.path = pathToStation(newSt); w.pathIndex = 0; w.state = "TO_FOOD"; } } } }
function findEggCarrier() { for (var i = 0; i < workers.length; i++) { var w = workers[i]; if (!w.rendered || w.isSoldier || w.isScout || w.carrying || w.carryingEgg) continue; if (w.state !== "TO_FOOD" && w.state !== "AT_FOOD") continue; if (w.mesh && w.mesh.position.distanceTo(qMesh.position) < 8) return w; } return null; }
function createEggTransport() { if (state.chambers.nursery.count === 0) return false; var carrier = findEggCarrier(); if (!carrier) return false; carrier.carryingEgg = true; carrier.state = "CARRY_EGG"; var eggIcon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.3, emissive: 0xffeecc, emissiveIntensity: 0.6 })); eggIcon.position.set(0, 0.7, 0); carrier.mesh.add(eggIcon); carrier.eggIcon = eggIcon; var nurseryX = TX - 5 - (state.chambers.nursery.count - 1) * 3.5; var nurseryPos = new THREE.Vector3(nurseryX, CCFY + 0.15, CZ); carrier.path = [NP, nurseryPos]; carrier.pathIndex = 0; carrier.waitTimer = 0; return true; }
function applyWorkerSpeed(w) { var base = getEffectiveWorkerSpeed(); if (state.rallyActive) base *= BAL.rallySpeedMultiplier; if (w.isGolden) base *= 2; if (w.isRare && w.rareType) base *= (1 + w.rareType.speedBonus); w.speed = base + Math.random() * 0.4; }
function applyAllWorkerSpeeds() { for (var i = 0; i < workers.length; i++) applyWorkerSpeed(workers[i]); }
function updateWorker(w, dt) {
  if (!w.rendered || w.isSoldier || w.isScout || !w.mesh) return;
  if (w.carryingEgg) { updateEggCarrier(w, dt); return; }
  if (w.mesh.userData && w.mesh.userData.headMesh) { w.mesh.userData.idleTime += dt; w.mesh.userData.headMesh.rotation.z = Math.sin(w.mesh.userData.idleTime * 3) * 0.1; }
  if (isEnemyNearby(w, BAL.workerFleeRange)) { w.avoidTimer = 0.5; var nearestPos = null, nd = 999; for (var i = 0; i < enemies.length; i++) { var d = w.mesh.position.distanceTo(enemies[i].mesh.position); if (d < nd) { nd = d; nearestPos = enemies[i].mesh.position; } } if (nearestPos) { var dx = w.mesh.position.x - nearestPos.x, dz = w.mesh.position.z - nearestPos.z, a = Math.atan2(dx, dz); w.mesh.position.x += Math.sin(a) * 0.03; w.mesh.position.z += Math.cos(a) * 0.03; } return; }
  if (w.avoidTimer > 0) { w.avoidTimer -= dt; return; }
  var distToEntrance = w.mesh.position.distanceTo(ER);
  if (distToEntrance > NEST_SAFE_RADIUS && isBossNearby(w, BAL.workerFleeRange * 2)) { w.avoidTimer = 0.5; if (state.bossActive && state.currentBoss && state.currentBoss.mesh) { var bdx = w.mesh.position.x - state.currentBoss.mesh.position.x, bdz = w.mesh.position.z - state.currentBoss.mesh.position.z, a = Math.atan2(bdx, bdz); w.mesh.position.x += Math.sin(a) * 0.03; w.mesh.position.z += Math.cos(a) * 0.03; } return; }
  if (!(distToEntrance < NEST_SAFE_RADIUS && (w.state === "TO_NEST" || w.carrying))) { if (avoidSoldiers(w)) return; }
  if (w.birthTimer !== undefined && w.birthTimer > 0) { w.birthTimer -= dt; var t = 1 - Math.max(0, w.birthTimer / w.birthDuration), e = t * t * (3 - 2 * t); w.mesh.scale.setScalar(w.targetScale * (0.05 + 0.95 * e)); if (w.birthTimer <= 0) { w.mesh.scale.setScalar(w.targetScale); w.birthTimer = undefined; } }
  if (w.dropAnimTimer !== undefined && w.dropAnimTimer > 0 && w.foodIcon) { w.dropAnimTimer -= dt; var t = 1 - Math.max(0, w.dropAnimTimer / 0.4); w.foodIcon.position.y = 0.55 - t * 0.5; w.foodIcon.scale.setScalar(Math.max(0, 1 - t)); if (w.dropAnimTimer <= 0) { disposeMesh(w.foodIcon); w.mesh.remove(w.foodIcon); w.foodIcon = null; w.dropAnimTimer = undefined; } }
  if (w.waitTimer > 0) { w.waitTimer -= dt; return; }
  var effectiveFood = getEffectiveFoodPerTrip(); var diminishedFood = Math.floor(effectiveFood * 0.4); if (diminishedFood < 1) diminishedFood = 1;
  var fpt = (state.food > state.foodCap * 0.5 ? diminishedFood : effectiveFood) + (w.foodBonus || 0);
  if (state.evolution.worker >= 1) fpt += EVOLUTION_TREE.worker.tiers[0].effect.foodBonus;
  var cfg = getCurrentZoneConfig(); if (cfg) fpt += cfg.foodBonus;
  if (w.state === "AT_FOOD") { releaseStationSlot(w.station, w.slotIndex); w.slotIndex = null; w.waitTimer = 0.5; w.carrying = true; w.state = "TO_NEST"; setPathTarget(w, "NEST"); return; }
  if (w.state === "AT_NEST") { addFood(fpt, NP.clone()); addStockpileCrumb(); storagePilesDirty = true; qgLight.intensity = 3; qgSphere.material.emissiveIntensity = 1.5; cLP = 1; w.carrying = false; w.dropAnimTimer = 0.4; w.waitTimer = 0.4; w.state = "TO_FOOD"; setPathTarget(w, "FOOD"); return; }
  var raw = w.path[w.pathIndex]; if (!raw) return; var isF = w.pathIndex === w.path.length - 1; var target;
  if (isF) { if (w.state === "TO_FOOD") { if (w.slotIndex === null) w.slotIndex = claimStationSlot(w.station, w); var o = getStationSlotOffset(w.slotIndex); target = { x: raw.x + o.x, y: raw.y, z: raw.z + o.z }; } else target = { x: raw.x, y: raw.y, z: raw.z }; }
  else { var sgn = w.state === "TO_FOOD" ? 1 : -1; target = { x: raw.x, y: raw.y, z: raw.z + sgn * 0.5 + w.personalOffset }; }
  var p = w.mesh.position; var dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z; var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.15) { w.pathIndex++; if (w.pathIndex >= w.path.length) w.state = w.state === "TO_FOOD" ? "AT_FOOD" : "AT_NEST"; return; }
  var step = Math.min(w.speed * dt, dist); p.x += (dx / dist) * step; p.y += (dy / dist) * step; p.z += (dz / dist) * step; w.mesh.rotation.y = Math.atan2(dx, dz); w.mesh.position.y += Math.sin(performance.now() / 90 + p.x * 5) * 0.008;
  if (w.carrying && !w.foodIcon) { var ic = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x553300, emissiveIntensity: 0.3 })); ic.position.set(0, 0.55, 0); w.mesh.add(ic); w.foodIcon = ic; }
  else if (!w.carrying && w.foodIcon && w.dropAnimTimer === undefined) { disposeMesh(w.foodIcon); w.mesh.remove(w.foodIcon); w.foodIcon = null; }
}
function updateEggCarrier(w, dt) {
  if (!w.carryingEgg || !w.mesh) return;
  var raw = w.path[w.pathIndex]; if (!raw) { w.carryingEgg = false; w.state = "TO_FOOD"; setPathTarget(w, "FOOD"); if (w.eggIcon) { disposeMesh(w.eggIcon); w.mesh.remove(w.eggIcon); w.eggIcon = null; } return; }
  var target = { x: raw.x, y: raw.y, z: raw.z }; var p = w.mesh.position; var dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z; var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.3) { w.pathIndex++; if (w.pathIndex >= w.path.length) { w.carryingEgg = false; w.state = "TO_FOOD"; setPathTarget(w, "FOOD"); if (w.eggIcon) { disposeMesh(w.eggIcon); w.mesh.remove(w.eggIcon); w.eggIcon = null; } state.eggs++; updateNurseryClusters(); var em = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4, emissive: 0xffcc66, emissiveIntensity: 0.3 })); em.position.copy(target); em.position.x += Math.random() * 0.4 - 0.2; em.position.z += Math.random() * 0.4 - 0.2; em.scale.setScalar(0.3); scene.add(em); eggMs.push({ mesh: em, mat: em.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: em.position.x, restZ: em.position.z, settling: false, settleT: 0 }); } return; }
  var step = Math.min(w.speed * dt, dist); p.x += (dx / dist) * step; p.y += (dy / dist) * step; p.z += (dz / dist) * step; w.mesh.rotation.y = Math.atan2(dx, dz); w.mesh.position.y += Math.sin(performance.now() / 90 + p.x * 5) * 0.008;
}
function updateQueenIdle(dt) { if (!qMesh) return; qMesh.userData.idleTime = (qMesh.userData.idleTime || 0) + dt; qMesh.rotation.z = Math.sin(qMesh.userData.idleTime * 0.5) * 0.05; qMesh.position.y = NP.y + Math.sin(qMesh.userData.idleTime * 0.7) * 0.04; }
function avoidSoldiers(w) { if (w.isSoldier || w.isScout) return false; if (w.mesh.position.distanceTo(ER) < NEST_SAFE_RADIUS) return false; for (var i = 0; i < soldiers.length; i++) { if (w.mesh && w.mesh.position.distanceTo(soldiers[i].mesh.position) < 0.7) { w.avoidTimer = 0.3; return true; } } return false; }

var soldiers = [];
function createHealthBar(parent, w, h, yOff) { var c = document.createElement("canvas"); c.width = w; c.height = h; var tx = new THREE.CanvasTexture(c); var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(0, yOff, 0); sp.scale.set(w / 50, h / 50, 1); parent.add(sp); return { sprite: sp, canvas: c, texture: tx }; }
function updateHealthBar(bar, ratio) { var ctx = bar.canvas.getContext("2d"); ctx.clearRect(0, 0, bar.canvas.width, bar.canvas.height); ctx.fillStyle = "#333"; ctx.fillRect(0, 0, bar.canvas.width, bar.canvas.height); ctx.fillStyle = ratio > 0.5 ? "#4a4" : ratio > 0.25 ? "#aa4" : "#a44"; ctx.fillRect(1, 1, (bar.canvas.width - 2) * Math.max(0, ratio), bar.canvas.height - 2); bar.texture.needsUpdate = true; }
function spawnSoldier(chX) {
  var mesh = buildAntMesh(1.8, 0x3a1a0a, 1.5);
  mesh.position.copy(ER);
  scene.add(mesh);
  addLabel(mesh, "🛡️ Soldier Lv" + (state.upgrades.soldierDamage + 1), 1.1, false);
  var hb = createHealthBar(mesh, 60, 8, 1.2);
  var mh = getEffectiveSoldierMaxHealth();
  var soldier = { mesh: mesh, health: mh, maxHealth: mh, healthBar: hb, patrolIndex: 0, target: PATROL_POINTS[0].clone(), speed: 0.9 + Math.random() * 0.3, waitTimer: 0, isSoldier: true, attackCooldown: 0, lastCombatTime: 0, guardMesh: null, chX: chX, freezeTimer: 0, damageMultiplier: 1 };

  // Ant class integration
  var cls = typeof assignClass === 'function' ? assignClass("soldier") : null;
  if (cls) applyClassBonuses(soldier, cls);

  var gm = buildAntMesh(1.5, 0x3a1a0a, 1.3);
  gm.position.set(chX, CCFY + 0.05, CZ);
  gm.rotation.y = Math.PI / 2;
  scene.add(gm);
  soldier.guardMesh = gm;
  barracksSoldiers.push(gm);
  soldiers.push(soldier);
  return soldier;
}
function soldierDied(soldier) { var idx = soldiers.indexOf(soldier); if (idx >= 0) { if (soldier.guardMesh) { disposeMesh(soldier.guardMesh); scene.remove(soldier.guardMesh); var gi = barracksSoldiers.indexOf(soldier.guardMesh); if (gi >= 0) barracksSoldiers.splice(gi, 1); } disposeMesh(soldier.mesh); scene.remove(soldier.mesh); soldiers.splice(idx, 1); } state.soldierCount--; state.deadSoldiers++; state.soldierRespawnTimer = BAL.soldierRespawnTime; showToast("💀 Soldier fallen!"); if (state.bossActive && soldiers.length === 0) { resolveBossFight("defeat"); } }
function respawnSoldier() { state.soldierCount++; state.deadSoldiers--; var chX = BAL.soldierRowStart + TX + 5 + (state.chambers.soldier.count - 1) * 3.5; spawnSoldier(chX); showToast("🛡️ Soldier respawned!"); }
function updateSoldier(s, dt) {
  var now = performance.now() / 1000;
  if (s.mesh && s.mesh.userData && s.mesh.userData.mandibles && s.mesh.userData.mandibles.length > 0) { s.mesh.userData.idleTime = (s.mesh.userData.idleTime || 0) + dt; var twitch = Math.sin(s.mesh.userData.idleTime * 2) > 0.9 ? 0.02 : 0; s.mesh.userData.mandibles.forEach(function(m) { m.rotation.x = (m.userData && m.userData.baseRX || 0.5) + twitch; }); }
  if (s.health < s.maxHealth && now - s.lastCombatTime > BAL.soldierRegenDelay) { s.health = Math.min(s.maxHealth, s.health + BAL.soldierRegenRate * dt); updateHealthBar(s.healthBar, s.health / s.maxHealth); }
  if (s.waitTimer > 0) { s.waitTimer -= dt; return; }

  // ---- COMBAT ALWAYS HAS PRIORITY ----
  var ne = null, nd = 4.0;
  for (var i = 0; i < enemies.length; i++) {
    var d = s.mesh.position.distanceTo(enemies[i].mesh.position);
    if (d < nd) { nd = d; ne = enemies[i]; }
  }
  if (ne) {
    var p = s.mesh.position, e = ne.mesh.position;
    var dx = e.x - p.x, dy = e.y - p.y, dz = e.z - p.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 1.2) {
      var step = Math.min(s.speed * 1.2 * dt, dist);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.z += (dz / dist) * step;
      s.mesh.rotation.y = Math.atan2(dx, dz);
    }
    return;
  }

  // ---- BOSS TARGETING ----
  if (state.bossActive && state.currentBoss) {
    var bPos = state.currentBoss.mesh.position;
    var bDist = s.mesh.position.distanceTo(bPos);
    if (bDist < 8.0) {
      var bdx = bPos.x - s.mesh.position.x, bdz = bPos.z - s.mesh.position.z;
      var bDist2 = Math.sqrt(bdx * bdx + bdz * bdz);
      if (bDist2 > 1.2) {
        var bstep = Math.min(s.speed * 1.5 * dt, bDist2);
        s.mesh.position.x += (bdx / bDist2) * bstep;
        s.mesh.position.z += (bdz / bDist2) * bstep;
        s.mesh.rotation.y = Math.atan2(bdx, bdz);
        s.mesh.position.y = GTY;
      }
      return;
    }
  }

  // ---- NEST ENTRANCE PUSH ----
  var distToNest = s.mesh.position.distanceTo(ER);
  if (distToNest < 2.0) {
    var pushDir = new THREE.Vector3().subVectors(s.mesh.position, ER).normalize();
    if (pushDir.length() < 0.01) pushDir.set(1, 0, 0);
    s.mesh.position.x += pushDir.x * 0.15;
    s.mesh.position.z += pushDir.z * 0.15;
  }

  // ---- SKIP PATROL TARGETS NEAR ENTRANCE ----
  if (s.target && s.target.distanceTo(ER) < 2.0) {
    s.patrolIndex = (s.patrolIndex + 1) % PATROL_POINTS.length;
    s.target.copy(PATROL_POINTS[s.patrolIndex]);
    s.waitTimer = 0.3;
    return;
  }

  // ---- NORMAL PATROL ----
  var tgt = s.target;
  var dx = tgt.x - s.mesh.position.x, dz = tgt.z - s.mesh.position.z;
  var dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.5) {
    s.patrolIndex = (s.patrolIndex + 1) % PATROL_POINTS.length;
    s.waitTimer = Math.random() < 0.4 ? 1.5 + Math.random() * 3 : 0.2;
    s.target.copy(PATROL_POINTS[s.patrolIndex]);
    return;
  }
  var ta = Math.atan2(dx, dz);
  var ad = ta - s.mesh.rotation.y;
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  s.mesh.rotation.y += ad * Math.min(1, dt * 3);
  var step = Math.min(s.speed * dt, dist);
  s.mesh.position.x += (dx / dist) * step;
  s.mesh.position.z += (dz / dist) * step;
  s.mesh.position.y = GTY;
}

var eggMs = [], hatchFx = [];
function pTH() { var b = document.getElementById("btn-tunnel"); if (b) { b.classList.remove("hint-pulse"); void b.offsetWidth; b.classList.add("hint-pulse"); } }
function layEgg() {
  if (state.chambers.nursery.count > 0) { var cf = createEggTransport(); if (!cf) { state.eggs++; var m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 })); m.position.copy(qMesh.position); m.position.x += (Math.random() - 0.5) * 1.6; m.position.z += (Math.random() - 0.5) * 1.4; m.scale.setScalar(0.3); scene.add(m); eggMs.push({ mesh: m, mat: m.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: m.position.x, restZ: m.position.z, settling: false, settleT: 0 }); } }
  else { state.eggs++; var m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4 })); var jx = (Math.random() - 0.5) * 1.6, jz = (Math.random() - 0.5) * 1.4; m.position.copy(qMesh.position); m.position.x += jx; m.position.z += jz; m.scale.setScalar(0.3); scene.add(m); eggMs.push({ mesh: m, mat: m.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: m.position.x, restZ: m.position.z, settling: false, settleT: 0 }); }
  qgLight.intensity = 4; qgSphere.material.emissiveIntensity = 2; pTH();
}
function spawnHatchSparkles(pos) { var g = new THREE.Group(); var m = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffcc66, emissiveIntensity: 1 }); for (var i = 0; i < 7; i++) { var s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), m); var a = (i / 7) * Math.PI * 2; s.userData = { dir: new THREE.Vector3(Math.cos(a), 1.2 + Math.random() * 0.6, Math.sin(a)) }; s.position.copy(pos); g.add(s); } scene.add(g); hatchFx.push({ group: g, life: 0, maxLife: 0.6 }); }
function hatchEgg(egg, i) {
  var hp = egg.mesh.position.clone(); disposeMesh(egg.mesh); scene.remove(egg.mesh); eggMs.splice(i, 1); state.eggs = Math.max(0, state.eggs - 1); state.workerCount++; state.totalHatched++; state.lifetimeStats.totalHatched++; updateEggLayTime();
  var rt = null; if (Math.random() < 0.08) { rt = RARE_TYPES[Math.floor(Math.random() * RARE_TYPES.length)]; state.rareAntCount++; updateDailyProgress('rare1', 1); }
  var nw = createWorker(false, rt); if (nw) {
    nw.mesh.position.copy(hp); nw.mesh.scale.setScalar(0.05); nw.birthTimer = 0.5; nw.birthDuration = 0.5; nw.waitTimer = 0.5;
    if (state.rallyActive) nw.speed *= BAL.rallySpeedMultiplier;
    spawnHatchSparkles(hp); workers.push(nw); AudioManager.sfx.hatch();
  } else { state.virtualWorkers++; }
  updateNurseryClusters(); updateDailyProgress('hatch5', 1); if (rt) showToast(rt.emoji + " Rare " + rt.name + " hatched!"); checkAchievements(); pTH();
}

function isBossNearby(w, range) { if (!state.bossActive || !state.currentBoss || !state.currentBoss.mesh) return false; if (!w.mesh) return false; return w.mesh.position.distanceTo(state.currentBoss.mesh.position) < range; }
