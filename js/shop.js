// ===== GEM SHOP PURCHASES (REVISED) =====

function buyGemItem(ik) {
  var item = GEM_ITEMS[ik];
  if (!item) { showToast("Item not found!"); return; }
  if (item.oneTime && state.gemUpgrades[ik]) { showToast("Already owned!"); return; }
  if (state.gems < item.cost) { showToast("Need " + item.cost + " 💎"); return; }

  // Safe sound helper
  function safeSound() { try { AudioManager.sfx.buttonClick(); } catch(e) {} }

  try {
    state.gems -= item.cost;

    // --- Permanent upgrades ---
    if (ik === "goldenEgg") {
      state.gemUpgrades[ik] = true;
      state.workerCount++;
      var gw = createWorker(true, null, true);
      if (gw) workers.push(gw);
      if (state.rallyActive) gw.speed *= BAL.rallySpeedMultiplier;
      showToast("🥇 Golden worker spawned!");
    }
    else if (ik === "soldierArmor") {
      state.gemUpgrades[ik] = true;
      for (var si = 0; si < soldiers.length; si++) {
        soldiers[si].maxHealth = getEffectiveSoldierMaxHealth();
        soldiers[si].health = Math.min(soldiers[si].health + 30, soldiers[si].maxHealth);
      }
      showToast("🛡️ Armor +30 HP");
    }
    else if (ik === "queenBless") {
      state.gemUpgrades[ik] = true;
      updateEggLayTime();
      showToast("👸 Queen blessed! Egg lay -5s");
    }
    else if (ik === "scoutMap") {
      state.gemUpgrades[ik] = true;
      showToast("🗺️ Scouts +5 food");
    }
    else if (ik === "goldenSkin") {
      state.gemUpgrades[ik] = true;
      rebuildAllWorkerMeshes();
      showToast("✨ Golden Skin active");
    }
    else if (ik === "antStrength") {
      state.gemUpgrades[ik] = true;
      showToast("💪 Soldier damage +4");
    }
    else if (ik === "deepStorage") {
      state.gemUpgrades[ik] = true;
      recalculateFoodCap();
      showToast("📦 Food cap +300");
    }
    else if (ik === "gemMagnet") {
      state.gemUpgrades[ik] = true;
      showToast("💎 Gem chance +15%");
    }
    else if (ik === "rapidHatch") {
      state.gemUpgrades[ik] = true;
      recalculateHatchTime();
      showToast("⏱️ Hatch time -4s");
    }
    else if (ik === "luckyAnt") {
      state.gemUpgrades[ik] = true;
      showToast("🔥 Rare ant chance +10%");
    }
    // --- Skins ---
    else if (["shadowSkin","fireSkin","iceSkin","rainbowSkin","glowingNest","crystalEntrance","royalCarpet","goldenSparkles"].indexOf(ik) !== -1) {
      state.gemUpgrades[ik] = true;
      if (ik.indexOf("Skin") !== -1) rebuildAllWorkerMeshes(); // skin change
      showToast(item.name + " unlocked!");
    }
    // --- Consumables ---
    else if (ik === "speedBoost") {
      state.speedBoostTimer = BAL.speedBoostDuration;
      applyAllWorkerSpeeds();
      showToast("⚡ Speed Boost activated (5 min)");
    }
    else if (ik === "instantHatch") {
      var hatched = 0;
      for (var i = eggMs.length - 1; i >= 0; i--) { hatchEgg(eggMs[i], i); hatched++; }
      showToast("🥚 Insta-Hatch! " + hatched + " eggs hatched");
    }
    else if (ik === "foodCrate") {
      addFood(500, NP.clone());
      showToast("🍞 +500 food");
    }
    else if (ik === "bossLure") {
      if (state.bossActive) { showToast("Boss already active!"); return; }
      spawnBoss();
      showToast("💀 Boss summoned!");
    }
    else if (ik === "weatherCharm") {
      if (state.weatherActive) {
        applyWeatherEffects(state.weatherType, false);
        state.weatherActive = false;
        state.weatherTimer = BAL.weatherIntervalMin + Math.random() * (BAL.weatherIntervalMax - BAL.weatherIntervalMin);
        showToast("🌤️ Weather cleared!");
      } else { showToast("No weather active!"); }
    }
    else if (ik === "rallyCharge") {
      state.rallyCooldown = 0;
      showToast("🔱 Rally cooldown reset!");
    }
    else if (ik === "luckyHour") {
      state.luckyHourTimer = 300; // 5 min
      showToast("🎯 Lucky Hour activated (5 min)");
    }
    else if (ik === "defenseBanner") {
      state.defenseBannerTimer = 180; // 3 min
      showToast("🛡️ Defense Banner active (3 min)");
    }

    // Disable button if one-time
    if (item.oneTime) {
      var btn = document.getElementById("btn-shop-" + ik);
      if (btn) { btn.disabled = true; btn.textContent = "Owned"; }
    }
    safeSound();
    refreshHUD();
    saveGame();
  } catch(e) {
    console.error(e);
    state.gems += item.cost; // refund
    showToast("Error purchasing item. Gems refunded.");
  }
}

function rebuildAllWorkerMeshes() {
  for (var i = 0; i < workers.length; i++) {
    var w = workers[i];
    if (!w.rendered || w.isSoldier || w.isScout) continue;
    var oldMesh = w.mesh;
    var ws = getWorkerVisualScale();
    var skinColor = 0x1c1410;
    if (state.gemUpgrades.goldenSkin) skinColor = 0xd4af37;
    else if (state.gemUpgrades.shadowSkin) skinColor = 0x333333;
    else if (state.gemUpgrades.fireSkin) skinColor = 0xff6600;
    else if (state.gemUpgrades.iceSkin) skinColor = 0x88ccff;
    // rainbow skin would need dynamic; skip for now
    var newMesh = buildAntMesh(ws, skinColor, 1, null, null, w.isRare ? w.rareType.color : null);
    newMesh.position.copy(oldMesh.position);
    newMesh.rotation.copy(oldMesh.rotation);
    scene.remove(oldMesh);
    disposeMesh(oldMesh);
    scene.add(newMesh);
    w.mesh = newMesh;
  }
             }
