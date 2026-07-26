// ===== ANT MODEL, WORKERS, SOLDIERS, QUEEN, EGGS =====
// Scouts moved to scouts.js, ant classes integrated.

var NEST_SAFE_RADIUS = 6.0;

// ---------- Mesh builder ----------
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

// ---------- Label helpers ----------
function createLabelSprite(text) {
  var c = document.createElement("canvas"); c.width = 128; c.height = 32;
  var ctx = c.getContext("2d"); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(4, 2, 120, 28); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 64, 20);
  var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  return { sprite: s, canvas: c, texture: t };
}
function setLabelText(lb, text) { var ctx = lb.canvas.getContext("2d"); ctx.clearRect(0, 0, 128, 32); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(4, 2, 120, 28); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 64, 20); lb.texture.needsUpdate = true; }
function addLabel(parent, text, yOff, undergroundOnly) { var l = createLabelSprite(text); l.sprite.position.set(0, yOff, 0); l.sprite.scale.set(1.0, 0.25, 1); l.sprite.userData = { isLabel: true, undergroundOnly: !!undergroundOnly }; parent.add(l.sprite); return l; }

// ---------- Queen ----------
var qMesh;
function initQueen() { qMesh = buildAntMesh(queenScale, 0x8a4a1a); qMesh.position.set(TX, NP.y, CZ); scene.add(qMesh); addLabel(qMesh, "👑 Queen", 1.3, true); qMesh.userData = { idleTime: 0, isQueen: true }; }

// ---------- Workers ----------
var workers = []; var nWI = 0;

function getWorkerVisualScale() { return BAL.workerBaseScale + state.upgrades.workerSpeed * BAL.workerScalePerUpgrade; }

function pathToStation(st) { return [TB_vec, ED, ER, new THREE.Vector3(st.x, GTY, st.z)]; }
function pathToNest(st) { return [new THREE.Vector3(st.x, GTY, st.z), ER, ED, TB_vec, NP]; }

function getLeastLoadedStation() {
  var best = null, bestCount = 999;
  for (var i = 0; i < FS.length; i++) {
    var count = 0;
    var st = FS[i];
    for (var j = 0; j < workers.length; j++) {
      if (workers[j].rendered && !workers[j].isSoldier && !workers[j].isScout && workers[j].station === st) count++;
    }
    if (count < bestCount) { bestCount = count; best = st; }
  }
  return best || FS[0];
}

function claimStationSlot(st, w) { for (var i = 0; i < SPS; i++) { if (st.slotOccupants[i] === null) { st.slotOccupants[i] = w; return i; } } return Math.floor(Math.random() * SPS); }
function releaseStationSlot(st, si) { if (si !== null && si !== undefined) st.slotOccupants[si] = null; }

function createWorker(golden, rareType, forceRender) {
  var id = nWI++; var vis = true; if (!forceRender) { var vc = 0; for (var i = 0; i < workers.length; i++) if (workers[i].rendered && !workers[i].isSoldier && !workers[i].isScout) vc++; vis = vc < BAL.maxRenderedAnts; } if (!vis) { return null; }
  var st = getLeastLoadedStation(); var mesh = null; var ws = getWorkerVisualScale();
  if (rareType) mesh = buildAntMesh(ws, 0x1c1410, 1, null, null, rareType.color); else if (golden) mesh = buildAntMesh(ws, 0x1c1410, 1, 0xd4af37); else mesh = buildAntMesh(ws, 0x1c1410);
  mesh.position.copy(NP); scene.add(mesh);
  if (rareType) addLabel(mesh, rareType.emoji + " " + rareType.name, 0.9, false); else if (golden) addLabel(mesh, "🥇 Golden Worker", 0.9, false);
  var baseSpeed = getEffectiveWorkerSpeed(); var speedMult = 1; if (golden) speedMult = 2; if (rareType) speedMult = 1 + rareType.speedBonus;
  if (isNaN(baseSpeed)) baseSpeed = 1.0;
  var w = { id: id, mesh: mesh, station: st, slotIndex: null, state: "TO_FOOD", path: pathToStation(st), pathIndex: 0, speed: baseSpeed * speedMult + Math.random() * 0.4, waitTimer: Math.random() * 1.5, carrying: false, foodIcon: null, eggIcon: null, targetScale: ws, rendered: true, personalOffset: (Math.random() - 0.5) * 0.6, isSoldier: false, isScout: false, carryingEgg: false, avoidTimer: 0, isGolden: golden || false, isRare: !!rareType, rareType: rareType, foodBonus: 0, _speedMult: speedMult, birthTimer: undefined, birthDuration: undefined, dropAnimTimer: undefined, lastState: "TO_FOOD", stateTimer: 0, tripDelivered: false };
  if (isNaN(w.speed)) w.speed = 1.0;
  if (state.rallyActive) w.speed *= BAL.rallySpeedMultiplier;
  var cls = typeof assignClass === 'function' ? assignClass("worker") : null;
  if (cls) applyClassBonuses(w, cls);
  if (typeof w.foodBonus !== 'number' || w.foodBonus < 0 || w.foodBonus > 10) w.foodBonus = 0;
  return w;
}
function setPathTarget(w, d) { w.path = d === "FOOD" ? pathToStation(w.station) : pathToNest(w.station); w.pathIndex = 0; }
function rebalanceWorkers() { for (var i = 0; i < workers.length; i++) { var w = workers[i]; if (!w.rendered || w.isSoldier || w.isScout || w.carrying || w.carryingEgg) continue; if (Math.random() < 0.2) { var newSt = getLeastLoadedStation(); if (newSt !== w.station) { if (w.slotIndex !== null) releaseStationSlot(w.station, w.slotIndex); w.station = newSt; w.slotIndex = null; w.path = pathToStation(newSt); w.pathIndex = 0; w.state = "TO_FOOD"; } } } }
function findEggCarrier() { for (var i = 0; i < workers.length; i++) { var w = workers[i]; if (!w.rendered || w.isSoldier || w.isScout || w.carrying || w.carryingEgg) continue; if (w.state !== "TO_FOOD" && w.state !== "AT_FOOD") continue; if (w.mesh && w.mesh.position.distanceTo(qMesh.position) < 8) return w; } return null; }
function createEggTransport() { if (state.chambers.nursery.count === 0) return false; var carrier = findEggCarrier(); if (!carrier) return false; carrier.carryingEgg = true; carrier.state = "CARRY_EGG"; var eggIcon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.3, emissive: 0xffeecc, emissiveIntensity: 0.6 })); eggIcon.position.set(0, 0.7, 0); carrier.mesh.add(eggIcon); carrier.eggIcon = eggIcon; var nurseryX = TX - 5 - (state.chambers.nursery.count - 1) * 3.5; var nurseryPos = new THREE.Vector3(nurseryX, CCFY + 0.15, CZ); carrier.path = [NP, nurseryPos]; carrier.pathIndex = 0; carrier.waitTimer = 0; return true; }
function applyWorkerSpeed(w) { var base = getEffectiveWorkerSpeed(); if (state.rallyActive) base *= BAL.rallySpeedMultiplier; if (w.isGolden) base *= 2; if (w.isRare && w.rareType) base *= (1 + w.rareType.speedBonus); w.speed = base + Math.random() * 0.4; if (isNaN(w.speed)) w.speed = 1.0; }
function applyAllWorkerSpeeds() { for (var i = 0; i < workers.length; i++) applyWorkerSpeed(workers[i]); }

// ---------- WORKER UPDATE WITH WATCHDOG AND RECOVERY ----------
function updateWorker(w, dt) {
  if (!w.rendered || w.isSoldier || w.isScout || !w.mesh) return;

  // --- Watchdog: if stuck in same state too long, force reset ---
  if (w.state === w.lastState) {
    w.stateTimer += dt;
    if (w.stateTimer > 8) {
      // Recover frozen worker
      if (w.slotIndex !== null) releaseStationSlot(w.station, w.slotIndex);
      w.carrying = false;
      w.carryingEgg = false;
      w.waitTimer = 0;
      w.avoidTimer = 0;
      w.tripDelivered = false;
      w.state = "TO_FOOD";
      setPathTarget(w, "FOOD");
      w.stateTimer = 0;
      w.lastState = "TO_FOOD";
      console.warn("Worker " + w.id + " auto‑recovered (stuck in " + w.lastState + ")");
      return; // let the next frame pick up the new state
    }
  } else {
    w.lastState = w.state;
    w.stateTimer = 0;
  }

  // Auto‑repair NaN position (if something broke it)
  if (isNaN(w.mesh.position.x) || isNaN(w.mesh.position.y) || isNaN(w.mesh.position.z)) {
    w.mesh.position.copy(NP);
    w.state = "TO_FOOD";
    setPathTarget(w, "FOOD");
    w.waitTimer = 0.1;
    return;
  }

  // Handle egg carrying
  if (w.carryingEgg) {
    var raw = w.path[w.pathIndex];
    if (!raw) { w.carryingEgg = false; w.state = "TO_FOOD"; setPathTarget(w, "FOOD"); if (w.eggIcon) { disposeMesh(w.eggIcon); w.mesh.remove(w.eggIcon); w.eggIcon = null; } return; }
    var tgt = { x: raw.x, y: raw.y, z: raw.z };
    var p = w.mesh.position;
    var dx = tgt.x - p.x, dy = tgt.y - p.y, dz = tgt.z - p.z;
    var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist < 0.3) {
      w.pathIndex++;
      if (w.pathIndex >= w.path.length) {
        w.carryingEgg = false; w.state = "TO_FOOD"; setPathTarget(w, "FOOD");
        if (w.eggIcon) { disposeMesh(w.eggIcon); w.mesh.remove(w.eggIcon); w.eggIcon = null; }
        state.eggs++; updateNurseryClusters();
        var em = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.4, emissive: 0xffcc66, emissiveIntensity: 0.3 }));
        em.position.copy(tgt); em.position.x += Math.random()*0.4-0.2; em.position.z += Math.random()*0.4-0.2;
        em.scale.setScalar(0.3); scene.add(em);
        eggMs.push({ mesh: em, mat: em.material, hatchTimer: state.hatchTime, totalHatchTime: state.hatchTime, restX: em.position.x, restZ: em.position.z, settling: false, settleT: 0 });
      }
      return;
    }
    if (dist < 0.0001) return; // prevent NaN
    var step = Math.min(w.speed * dt, dist);
    p.x += (dx/dist)*step; p.y += (dy/dist)*step; p.z += (dz/dist)*step;
    w.mesh.rotation.y = Math.atan2(dx, dz);
    w.mesh.position.y += Math.sin(performance.now()/90 + p.x*5)*0.008;
    return;
  }

  // Idle animation
  if (w.mesh.userData && w.mesh.userData.headMesh) {
    w.mesh.userData.idleTime += dt;
    w.mesh.userData.headMesh.rotation.z = Math.sin(w.mesh.userData.idleTime*3)*0.1;
  }

  // Flee enemies
  if (isEnemyNearby(w, BAL.workerFleeRange)) {
    w.avoidTimer = 0.5;
    var nearestPos = null, nd = 999;
    for (var i = 0; i < enemies.length; i++) {
      var d = w.mesh.position.distanceTo(enemies[i].mesh.position);
      if (d < nd) { nd = d; nearestPos = enemies[i].mesh.position; }
    }
    if (nearestPos) {
      var dx = w.mesh.position.x - nearestPos.x, dz = w.mesh.position.z - nearestPos.z, a = Math.atan2(dx, dz);
      w.mesh.position.x += Math.sin(a)*0.03; w.mesh.position.z += Math.cos(a)*0.03;
    }
    return;
  }
  if (w.avoidTimer > 0) { w.avoidTimer -= dt; return; }

  // Flee boss
  var distToEntrance = w.mesh.position.distanceTo(ER);
  if (distToEntrance > NEST_SAFE_RADIUS && isBossNearby(w, BAL.workerFleeRange*2)) {
    w.avoidTimer = 0.5;
    if (state.bossActive && state.currentBoss && state.currentBoss.mesh) {
      var bdx = w.mesh.position.x - state.currentBoss.mesh.position.x, bdz = w.mesh.position.z - state.currentBoss.mesh.position.z, a = Math.atan2(bdx, bdz);
      w.mesh.position.x += Math.sin(a)*0.03; w.mesh.position.z += Math.cos(a)*0.03;
    }
    return;
  }

  // Avoid soldiers
  var returningHome = (w.state === "TO_NEST" || w.carrying);
  if (!returningHome || distToEntrance > 3.0) {
    if (avoidSoldiers(w)) return;
  }

  // Birth animation (no return, safe)
  if (w.birthTimer !== undefined && w.birthTimer > 0) { w.birthTimer -= dt; var t = 1 - Math.max(0, w.birthTimer / w.birthDuration), e = t*t*(3-2*t); w.mesh.scale.setScalar(w.targetScale*(0.05 + 0.95*e)); if (w.birthTimer <= 0) { w.mesh.scale.setScalar(w.targetScale); w.birthTimer = undefined; } }
  if (w.dropAnimTimer !== undefined && w.dropAnimTimer > 0 && w.foodIcon) { w.dropAnimTimer -= dt; var t = 1 - Math.max(0, w.dropAnimTimer/0.4); w.foodIcon.position.y = 0.55 - t*0.5; w.foodIcon.scale.setScalar(Math.max(0, 1-t)); if (w.dropAnimTimer <= 0) { disposeMesh(w.foodIcon); w.mesh.remove(w.foodIcon); w.foodIcon = null; w.dropAnimTimer = undefined; } }
  if (w.waitTimer > 0) { w.waitTimer -= dt; return; }

  // Compute food per trip
  var effectiveFood = getEffectiveFoodPerTrip(); var diminishedFood = Math.floor(effectiveFood * 0.4); if (diminishedFood < 1) diminishedFood = 1;
  var fpt = (state.food > state.foodCap * 0.5 ? diminishedFood : effectiveFood) + (w.foodBonus || 0);
  if (state.evolution.worker >= 1) fpt += EVOLUTION_TREE.worker.tiers[0].effect.foodBonus;
  var cfg = getCurrentZoneConfig(); if (cfg) fpt += cfg.foodBonus;

  if (w.state === "AT_FOOD") {
    releaseStationSlot(w.station, w.slotIndex);
    w.slotIndex = null;
    w.waitTimer = 0.5;
    w.carrying = true;
    w.tripDelivered = false;          // new trip starts
    w.state = "TO_NEST";
    setPathTarget(w, "NEST");
    return;
  }
  if (w.state === "AT_NEST") {
    // Only deposit once per trip
    if (!w.tripDelivered) {
      addFood(fpt, NP.clone());
      addStockpileCrumb();
      storagePilesDirty = true;
      qgLight.intensity = 3; qgSphere.material.emissiveIntensity = 1.5; cLP = 1;
      w.tripDelivered = true;
    }
    w.carrying = false;
    w.dropAnimTimer = 0.4;
    w.waitTimer = 0.4;
    w.state = "TO_FOOD";
    setPathTarget(w, "FOOD");
    return;
  }

  // --- Movement ---
  var raw = w.path[w.pathIndex];
  if (!raw) {
    // Path corrupted – rebuild and reset
    w.pathIndex = 0;
    w.state = "TO_FOOD";
    setPathTarget(w, "FOOD");
    console.warn("Worker " + w.id + " path was empty – resetting");
    return;
  }

  var isF = w.pathIndex === w.path.length - 1;
  var target;
  if (isF) {
    if (w.state === "TO_FOOD") { if (w.slotIndex === null) w.slotIndex = claimStationSlot(w.station, w); var o = getStationSlotOffset(w.slotIndex); target = { x: raw.x + o.x, y: raw.y, z: raw.z + o.z }; }
    else target = { x: raw.x, y: raw.y, z: raw.z };
  } else {
    var sgn = w.state === "TO_FOOD" ? 1 : -1;
    target = { x: raw.x, y: raw.y, z: raw.z + sgn * 0.5 + w.personalOffset };
  }
  var p = w.mesh.position;
  var dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z;
  var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (dist < 0.0001) return;          // avoid division by zero
  if (dist < 0.15) { w.pathIndex++; if (w.pathIndex >= w.path.length) w.state = w.state === "TO_FOOD" ? "AT_FOOD" : "AT_NEST"; return; }
  var step = Math.min(w.speed * dt, dist);
  p.x += (dx/dist)*step; p.y += (dy/dist)*step; p.z += (dz/dist)*step;
  w.mesh.rotation.y = Math.atan2(dx, dz);
  w.mesh.position.y += Math.sin(performance.now()/90 + p.x*5)*0.008;
  if (w.carrying) { w.mesh.position.y += Math.sin(performance.now()/80)*0.015; if (!w.foodIcon) { var ic = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x553300, emissiveIntensity: 0.3 })); ic.position.set(0, 0.55, 0); w.mesh.add(ic); w.foodIcon = ic; } }
  else if (w.foodIcon && w.dropAnimTimer === undefined) { disposeMesh(w.foodIcon); w.mesh.remove(w.foodIcon); w.foodIcon = null; }
}

// ---------- Soldiers ----------
var soldiers = [];
function createHealthBar(parent, w, h, yOff) { var c = document.createElement("canvas"); c.width = w; c.height = h; var tx = new THREE.CanvasTexture(c); var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(0, yOff, 0); sp.scale.set(w/50, h/50, 1); parent.add(sp); return { sprite: sp, canvas: c, texture: tx }; }
function updateHealthBar(bar, ratio) { var ctx = bar.canvas.getContext("2d"); ctx.clearRect(0, 0, bar.canvas.width, bar.canvas.height); ctx.fillStyle = "#333"; ctx.fillRect(0, 0, bar.canvas.width, bar.canvas.height); ctx.fillStyle = ratio > 0.5 ? "#4a4" : ratio > 0.25 ? "#aa4" : "#a44"; ctx.fillRect(1, 1, (bar.canvas.width-2)*Math.max(0, ratio), bar.canvas.height-2); bar.texture.needsUpdate = true; }
function spawnSoldier(chX) { var mesh = buildAntMesh(1.8, 0x3a1a0a, 1.5); mesh.position.copy(ER); scene.add(mesh); addLabel(mesh, "🛡️ Soldier Lv" + (state.upgrades.soldierDamage+1), 1.1, false); var hb = createHealthBar(mesh, 60, 8, 1.2); var mh = getEffectiveSoldierMaxHealth(); var soldier = { mesh: mesh, health: mh, maxHealth: mh, healthBar: hb, patrolIndex: 0, target: PATROL_POINTS[0].clone(), speed: 0.9 + Math.random()*0.3, waitTimer: 0, isSoldier: true, attackCooldown: 0, lastCombatTime: 0, guardMesh: null, chX: chX, freezeTimer: 0, damageMultiplier: 1 }; var cls = typeof assignClass === 'function' ? assignClass("soldier") : null; if (cls) applyClassBonuses(soldier, cls); var gm = buildAntMesh(1.5, 0x3a1a0a, 1.3); gm.position.set(chX, CCFY+0.05, CZ); gm.rotation.y = Math.PI/2; scene.add(gm); soldier.guardMesh = gm; barracksSoldiers.push(gm); soldiers.push(soldier); return soldier; }
function soldierDied(soldier) { var idx = soldiers.indexOf(soldier); if (idx >= 0) { if (soldier.guardMesh) { disposeMesh(soldier.guardMesh); scene.remove(soldier.guardMesh); var gi = barracksSoldiers.indexOf(soldier.guardMesh); if (gi >= 0) barracksSoldiers.splice(gi, 1); } disposeMesh(soldier.mesh); scene.remove(soldier.mesh); soldiers.splice(idx, 1); } state.soldierCount--; state.deadSoldiers++; state.soldierRespawnTimer = BAL.soldierRespawnTime; showToast("💀 Soldier fallen!"); if (state.bossActive && soldiers.length === 0) { resolveBossFight("defeat"); } }
function respawnSoldier() { state.soldierCount++; state.deadSoldiers--; var chX = BAL.soldierRowStart + TX + 5 + (state.chambers.soldier.count-1)*3.5; spawnSoldier(chX); showToast("🛡️ Soldier respawned!"); }
function updateSoldier(s, dt) { /* unchanged */ }

// ---------- Eggs ----------
var eggMs = [], hatchFx = [];
function pTH() { var b = document.getElementById("btn-tunnel"); if (b) { b.classList.remove("hint-pulse"); void b.offsetWidth; b.classList.add("hint-pulse"); } }
function layEgg() { /* unchanged */ }
function spawnHatchSparkles(pos) { /* unchanged */ }
function hatchEgg(egg, i) { /* unchanged */ }

function isBossNearby(w, range) { if (!state.bossActive || !state.currentBoss || !state.currentBoss.mesh) return false; if (!w.mesh) return false; return w.mesh.position.distanceTo(state.currentBoss.mesh.position) < range; }
function avoidSoldiers(w) { if (w.isSoldier || w.isScout) return false; if (w.mesh.position.distanceTo(ER) < NEST_SAFE_RADIUS) return false; for (var i = 0; i < soldiers.length; i++) { if (w.mesh && w.mesh.position.distanceTo(soldiers[i].mesh.position) < 0.7) { w.avoidTimer = 0.3; return true; } } return false; }
function isEnemyNearby(w, range) { for (var i = 0; i < enemies.length; i++) { if (w.mesh && w.mesh.position.distanceTo(enemies[i].mesh.position) < range) return true; } return false; }

// Audio and settings unchanged
var AudioManager = {};
(function(AM) {
  var ctx = null, sfxOn = true, ambientOn = true, musicOn = true;
  var ambientNode = null, ambientGain = null;
  var musicNodes = [];

  AM.init = function() {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ctx = null; }
    if (ctx) {
      ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.06;
      ambientGain.connect(ctx.destination);
      if (ambientOn) AM.startAmbient();
      if (musicOn) AM.startMusic();
    }
  };

  AM.resume = function() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(function() {
        if (musicOn && musicNodes.length === 0) {
          AM.startMusic();
        }
      });
    }
  };

  AM.playTone = function(freq, dur, vol, type, rampDown) {
    if (!ctx || !sfxOn) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime((vol || 0.1), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.1) + (rampDown || 0.02));
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (dur || 0.1) + (rampDown || 0.03));
  };

  AM.playNoise = function(dur, vol, filterFreq) {
    if (!ctx || !sfxOn) return;
    var bufferSize = ctx.sampleRate * dur, noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate), output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource(); noise.buffer = noiseBuffer;
    var filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(filterFreq || 800, ctx.currentTime);
    var g = ctx.createGain(); g.gain.setValueAtTime((vol || 0.05), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    noise.connect(filter); filter.connect(g); g.connect(ctx.destination); noise.start();
  };

  AM.playArpeggio = function(notes, dur, vol) {
    if (!ctx || !sfxOn) return;
    notes.forEach(function(n, i) { setTimeout(function() { AM.playTone(n.freq, n.dur || 0.1, (vol || 0.1) * 0.7, n.type || 'sine'); }, i * (dur / notes.length) * 1000); });
  };

  AM.sfx = {
    click: function() { AM.playTone(800, 0.05, 0.08, 'square'); },
    foodCollect: function() { AM.playTone(400, 0.08, 0.06, 'sine'); setTimeout(function() { AM.playTone(600, 0.08, 0.06, 'sine'); }, 40); },
    hatch: function() { AM.playTone(1000, 0.06, 0.07, 'sine'); setTimeout(function() { AM.playTone(1200, 0.04, 0.05, 'sine'); }, 50); },
    levelUp: function() { AM.playArpeggio([{freq:523,dur:0.08},{freq:659,dur:0.08},{freq:784,dur:0.12}], 0.3, 0.08); },
    bossSpawn: function() { AM.playTone(60, 0.4, 0.15, 'sawtooth'); AM.playNoise(0.3, 0.06, 200); },
    bossDefeat: function() { AM.playTone(200, 0.3, 0.12, 'sawtooth'); setTimeout(function() { AM.playTone(80, 0.3, 0.1, 'sawtooth'); }, 150); setTimeout(function() { AM.playTone(40, 0.4, 0.08, 'sawtooth'); }, 300); },
    rally: function() { for (var i = 0; i < 4; i++) { setTimeout(function() { AM.playTone(150, 0.06, 0.08, 'square'); }, i * 80); } },
    spiderDeath: function() { AM.playNoise(0.08, 0.05, 600); },
    prestige: function() { AM.playArpeggio([{freq:392,dur:0.15},{freq:523,dur:0.15},{freq:659,dur:0.15},{freq:784,dur:0.15},{freq:1047,dur:0.3}], 0.9, 0.1); },
    achievement: function() { AM.playArpeggio([{freq:659,dur:0.1},{freq:784,dur:0.1},{freq:1047,dur:0.15}], 0.3, 0.08); },
    gemCollect: function() { AM.playTone(1500, 0.06, 0.06, 'sine'); setTimeout(function() { AM.playTone(1800, 0.04, 0.05, 'sine'); }, 30); setTimeout(function() { AM.playTone(2200, 0.06, 0.04, 'sine'); }, 60); },
    upgrade: function() { AM.playTone(300, 0.08, 0.07, 'triangle'); setTimeout(function() { AM.playTone(500, 0.06, 0.06, 'triangle'); }, 60); },
    surge: function() { AM.playNoise(0.3, 0.06, 400); AM.playTone(200, 0.2, 0.06, 'sawtooth'); },
    waveIncoming: function() { for (var i = 0; i < 3; i++) { setTimeout(function() { AM.playTone(440, 0.1, 0.08, 'square'); }, i * 150); } },
    dailyStreak: function() { AM.playArpeggio([{freq:523,dur:0.08},{freq:659,dur:0.08},{freq:784,dur:0.08},{freq:1047,dur:0.15}], 0.4, 0.07); },
    zoneSwitch: function() { AM.playNoise(0.2, 0.04, 1000); AM.playTone(300, 0.15, 0.04, 'sine'); },
    shake: function() { AM.playTone(40, 0.15, 0.06, 'sine'); },
    buttonClick: function() { AM.playTone(600, 0.04, 0.05, 'square'); },
    ascend: function() { AM.playArpeggio([{freq:523,dur:0.1},{freq:659,dur:0.1},{freq:784,dur:0.1},{freq:1047,dur:0.2},{freq:1318,dur:0.3}], 0.9, 0.12); }
  };

  AM.startAmbient = function() {
    if (!ctx || !ambientOn || !ambientGain) return;
    if (ambientNode) { try { ambientNode.stop(); } catch(e) {} }
    var bufferSize = ctx.sampleRate * 4, noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate), output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    ambientNode = ctx.createBufferSource(); ambientNode.buffer = noiseBuffer; ambientNode.loop = true;
    var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, ctx.currentTime);
    var gain = ctx.createGain(); gain.gain.value = 0.04;
    ambientNode.connect(filter); filter.connect(gain); gain.connect(ambientGain);
    var windOsc = ctx.createOscillator(); windOsc.type = 'sine'; windOsc.frequency.setValueAtTime(30, ctx.currentTime);
    var windGain = ctx.createGain(); windGain.gain.value = 0.02;
    windOsc.connect(windGain); windGain.connect(ambientGain);
    windOsc.start();
    ambientNode.start();
    ambientNode.windOsc = windOsc;
  };

  AM.stopAmbient = function() {
    if (ambientNode) {
      try { ambientNode.stop(); } catch(e) {}
      if (ambientNode.windOsc) { try { ambientNode.windOsc.stop(); } catch(e) {} }
      ambientNode = null;
    }
  };

  AM.startMusic = function() {
    if (!ctx || !musicOn) return;
    AM.stopMusic();
    var now = ctx.currentTime;
    var baseFreq = 130.81;
    var chord = [1, 5/4, 3/2, 2];
    var masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);
    chord.forEach(function(ratio, i) {
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      var vol = ctx.createGain(); vol.gain.setValueAtTime(0.025, now); vol.gain.exponentialRampToValueAtTime(0.015, now + 2);
      osc.connect(vol); vol.connect(masterGain); osc.start(now + i * 0.1);
      musicNodes.push({ osc: osc, gain: vol });
    });
    musicNodes.push({ masterGain: masterGain });
  };

  AM.stopMusic = function() {
    if (!ctx || musicNodes.length === 0) return;
    var masterGainEntry = null;
    for (var i = 0; i < musicNodes.length; i++) { if (musicNodes[i].masterGain) { masterGainEntry = musicNodes[i]; break; } }
    if (masterGainEntry && masterGainEntry.masterGain) {
      var masterGain = masterGainEntry.masterGain;
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      var stopTime = ctx.currentTime + 0.06;
      musicNodes.forEach(function(node) { if (node.osc) try { node.osc.stop(stopTime); } catch(e) {} });
      setTimeout(function() {
        musicNodes.forEach(function(node) {
          try { if (node.osc) node.osc.disconnect(); } catch(e) {}
          try { if (node.gain) node.gain.disconnect(); } catch(e) {}
          try { if (node.masterGain) node.masterGain.disconnect(); } catch(e) {}
        });
        musicNodes = [];
      }, 100);
    } else {
      musicNodes.forEach(function(node) {
        try { if (node.osc) node.osc.stop(); } catch(e) {}
        try { if (node.osc) node.osc.disconnect(); } catch(e) {}
        try { if (node.gain) node.gain.disconnect(); } catch(e) {}
      });
      musicNodes = [];
    }
  };

  AM.setMusic = function(on) {
    musicOn = on;
    localStorage.setItem('antEmpire_music', on ? '1' : '0');
    if (on) {
      if (ctx && ctx.state === 'running') {
        AM.startMusic();
      } else if (ctx) {
        AM.resume();
      }
    } else {
      AM.stopMusic();
    }
  };

  AM.setSfx = function(on) { sfxOn = on; localStorage.setItem('antEmpire_sfx', on ? '1' : '0'); };
  AM.setAmbient = function(on) {
    ambientOn = on; localStorage.setItem('antEmpire_ambient', on ? '1' : '0');
    if (on) AM.startAmbient(); else AM.stopAmbient();
  };

})(AudioManager);

document.addEventListener('click', function() { AudioManager.resume(); }, { once: true });
document.addEventListener('touchstart', function() { AudioManager.resume(); }, { once: true });

// ---- HAPTIC FEEDBACK ----
function triggerHaptic(duration, intensity) {
  if (!GameSettings.hapticOn) return;
  var vibDuration = duration || 15;
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(vibDuration);
  }
}

// Settings
var GameSettings = {
  sfxOn: true, ambientOn: true, musicOn: true, shakeOn: true, hapticOn: true,
  init: function() {
    GameSettings.sfxOn = (localStorage.getItem('antEmpire_sfx') || '1') === '1';
    GameSettings.ambientOn = (localStorage.getItem('antEmpire_ambient') || '1') === '1';
    GameSettings.musicOn = (localStorage.getItem('antEmpire_music') || '1') === '1';
    GameSettings.shakeOn = (localStorage.getItem('antEmpire_shake') || '1') === '1';
    GameSettings.hapticOn = (localStorage.getItem('antEmpire_haptic') || '1') === '1';
    AudioManager.setSfx(GameSettings.sfxOn);
    AudioManager.setAmbient(GameSettings.ambientOn);
    AudioManager.setMusic(GameSettings.musicOn);

    var el;
    el = document.getElementById('toggle-sfx'); if (el) el.className = 'toggle-switch' + (GameSettings.sfxOn ? ' on' : '');
    el = document.getElementById('toggle-ambient'); if (el) el.className = 'toggle-switch' + (GameSettings.ambientOn ? ' on' : '');
    el = document.getElementById('toggle-music'); if (el) el.className = 'toggle-switch' + (GameSettings.musicOn ? ' on' : '');
    el = document.getElementById('toggle-shake'); if (el) el.className = 'toggle-switch' + (GameSettings.shakeOn ? ' on' : '');
    el = document.getElementById('toggle-haptic'); if (el) el.className = 'toggle-switch' + (GameSettings.hapticOn ? ' on' : '');
  }
};
