// ===== GEM SHOP PURCHASES =====

function buyGemItem(ik) {
  var item = GEM_ITEMS[ik];
  if (!item) return;
  if (item.oneTime && state.gemUpgrades[ik]) { showToast("Already purchased!"); return; }
  if (state.gems < item.cost) { showToast("Need " + item.cost + " 💎"); return; }
  state.gems -= item.cost;
  if (ik === "goldenEgg") {
    state.gemUpgrades.goldenEgg = true;
    state.workerCount++;
    var gw = createWorker(true, null, true);
    if (gw) workers.push(gw);
    if (state.rallyActive) gw.speed *= BAL.rallySpeedMultiplier;
    showToast("🥇 Golden worker!");
  } else if (ik === "soldierArmor") {
    state.gemUpgrades.soldierArmor = true;
    for (var si = 0; si < soldiers.length; si++) {
      soldiers[si].maxHealth = getEffectiveSoldierMaxHealth();
      soldiers[si].health = Math.min(soldiers[si].health + 15, soldiers[si].maxHealth);
    }
    showToast("🛡️ Armor +15HP");
  } else if (ik === "queenBless") {
    state.gemUpgrades.queenBless = true;
    updateEggLayTime();
    showToast("👸 Queen blessed!");
  } else if (ik === "scoutMap") {
    state.gemUpgrades.scoutMap = true;
    showToast("🗺️ Scouts +2 food");
  } else if (ik === "speedBoost") {
    state.speedBoostTimer = BAL.speedBoostDuration;
    applyAllWorkerSpeeds();
    showToast("⚡ Speed Boost! 2× speed for 5min");
  } else if (ik === "instantHatch") {
    var hatched = 0;
    for (var i = eggMs.length - 1; i >= 0; i--) {
      hatchEgg(eggMs[i], i);
      hatched++;
    }
    showToast("🥚 Insta-Hatch! " + hatched + " eggs hatched");
  } else if (ik === "goldenSkin") {
    state.gemUpgrades.goldenSkin = true;
    rebuildAllWorkerMeshes();
    showToast("✨ Golden Skin! Workers get golden tint");
  }
  AudioManager.sfx.buttonClick();
  if (item.oneTime) {
    var btn = document.getElementById("btn-shop-" + ik);
    if (btn) { btn.disabled = true; btn.textContent = "Owned"; }
  }
  refreshHUD();
  checkAchievements();
}

// Golden skin rebuild (helper)
function rebuildAllWorkerMeshes() {
  for (var i = 0; i < workers.length; i++) {
    var w = workers[i];
    if (!w.rendered || w.isSoldier || w.isScout) continue;
    var oldMesh = w.mesh;
    var ws = getWorkerVisualScale();
    var newMesh = buildAntMesh(ws, 0x1c1410, 1, w.isGolden ? 0xd4af37 : null, null, w.isRare ? w.rareType.color : null);
    newMesh.position.copy(oldMesh.position);
    newMesh.rotation.copy(oldMesh.rotation);
    scene.remove(oldMesh);
    disposeMesh(oldMesh);
    scene.add(newMesh);
    w.mesh = newMesh;
    if (w.foodIcon) { disposeMesh(w.foodIcon); w.mesh.remove(w.foodIcon); w.foodIcon = null; }
    if (w.eggIcon) { disposeMesh(w.eggIcon); w.mesh.remove(w.eggIcon); w.eggIcon = null; }
  }
}
