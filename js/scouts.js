// ===== SCOUT SYSTEM – EXPLORATION & DISCOVERIES =====
// Scouts explore the map, trigger discoveries, and unlock new zones.
// This file extracts scout logic from ants.js and adds discovery mechanics.
// Ant classes integrated.

var scouts = [];
var SCOUT_SCALE = 1.4;
var _firstScoutReturned = false;  // track first scout return for guaranteed discovery

// ---- Spawn a new scout ----
function spawnScout() {
  var mesh = buildAntMesh(SCOUT_SCALE, 0x8a7a4a, 1.0);
  mesh.position.copy(ER);
  scene.add(mesh);
  addLabel(mesh, "🔍 Scout", 0.9, false);
  var scout = {
    mesh: mesh,
    state: "GOING",
    target: null,
    carryingResource: false,
    resourceOrb: null,
    tripsCompleted: 0,
    discoveryBonus: 0
  };

  // ----- Ant Class Integration -----
  var cls = typeof assignClass === 'function' ? assignClass("scout") : null;
  if (cls) applyClassBonuses(scout, cls);

  scouts.push(scout);
  return scout;
}

// ---- Update a single scout each frame ----
function updateScout(s, dt) {
  if (!s.mesh) return;
  var scoutSpeed = getEffectiveScoutSpeed();

  if (s.state === "GOING") {
    // Pick a random destination on the map edge
    if (!s.target) {
      var edge = Math.floor(Math.random() * 4), margin = 3;
      if (edge === 0) s.target = new THREE.Vector3(SW / 2 - margin, GTY, (Math.random() - 0.5) * (SD - 6));
      else if (edge === 1) s.target = new THREE.Vector3(-SW / 2 + margin, GTY, (Math.random() - 0.5) * (SD - 6));
      else if (edge === 2) s.target = new THREE.Vector3((Math.random() - 0.5) * (SW - 6), GTY, SD / 2 - margin);
      else s.target = new THREE.Vector3((Math.random() - 0.5) * (SW - 6), GTY, -SD / 2 + margin);
    }

    var p = s.mesh.position;
    var dx = s.target.x - p.x, dy = s.target.y - p.y, dz = s.target.z - p.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.5) {
      // Scout reached destination, turn around and head home
      s.state = "RETURNING";
      s.carryingResource = true;

      // Visual orb showing scout is carrying something
      var orbColor = 0xffcc00;
      var discoveryChance = typeof getBiomeDiscoveryChance === 'function' ? getBiomeDiscoveryChance() : 0.15;
      if (Math.random() < discoveryChance) {
        orbColor = 0xff6600; // orange = potential discovery
      }
      var orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6),
        new THREE.MeshStandardMaterial({ color: orbColor, emissive: orbColor, emissiveIntensity: 0.8 }));
      orb.position.set(0, 0.6, 0);
      s.mesh.add(orb);
      s.resourceOrb = orb;
      s.target = ER.clone();
      return;
    }

    var step = Math.min(scoutSpeed * dt, dist);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.z += (dz / dist) * step;
    s.mesh.rotation.y = Math.atan2(dx, dz);
    s.mesh.position.y += Math.sin(performance.now() / 100 + p.x * 3) * 0.005;

  } else if (s.state === "RETURNING") {
    var p = s.mesh.position;
    var dx = s.target.x - p.x, dy = s.target.y - p.y, dz = s.target.z - p.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.5) {
      // Scout reached the nest – process rewards
      processScoutReturn(s);

      // Clean up visual orb
      if (s.resourceOrb) {
        disposeMesh(s.resourceOrb);
        s.mesh.remove(s.resourceOrb);
        s.resourceOrb = null;
      }

      s.carryingResource = false;
      s.state = "GOING";
      s.target = null;
      return;
    }

    var step = Math.min(scoutSpeed * dt, dist);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.z += (dz / dist) * step;
    s.mesh.rotation.y = Math.atan2(dx, dz);
    s.mesh.position.y += Math.sin(performance.now() / 100 + p.x * 3) * 0.005;
  }
}

// ---- Process scout return: food, gems, zone progress, and discoveries ----
function processScoutReturn(s) {
  var pos = s.mesh ? s.mesh.position.clone() : ER.clone();
  var mapBonus = state.gemUpgrades.scoutMap ? 2 : 0;
  var reward = BAL.scoutRewardMin + Math.floor(Math.random() * (BAL.scoutRewardMax - BAL.scoutRewardMin + 1)) + mapBonus;
  addFood(reward, pos);

  // Gem chance
  var gemChance = getEffectiveGemChance();
  if (Math.random() < gemChance) addGems(1);

  // Zone progress
  state.expansionTrips++;
  s.tripsCompleted++;

  // Explorer class bonus: each trip counts as 2
  if (s.antClass === "explorer") {
    state.expansionTrips++;
  }

  // Check zone unlocks
  checkZoneUnlocks();

  // ATTEMPT A DISCOVERY
  var discoveryChance = typeof getBiomeDiscoveryChance === 'function' ? getBiomeDiscoveryChance() : 0.15;
  // Scout class bonus: +15% discovery chance
  if (s.antClass === "scout") discoveryChance += 0.15;
  // Explorer class bonus: double discovery chance
  if (s.antClass === "explorer") discoveryChance *= 2;

  var discoveryMade = false;

  // First scout return: guaranteed discovery (Seed Cache)
  if (!_firstScoutReturned && typeof DISCOVERIES !== 'undefined' && DISCOVERIES.seedCache) {
    _firstScoutReturned = true;
    DISCOVERIES.seedCache.action(pos);
    showToast("🎉 First discovery! Seed Cache found! +food, +10 permanent food cap");
    AudioManager.sfx.achievement();
    discoveryMade = true;
  } else if (Math.random() < discoveryChance) {
    if (typeof attemptDiscovery === 'function') {
      attemptDiscovery(pos);
      discoveryMade = true;
    }
  }

  // Meadow Legend: +1 gem whenever a discovery is made
  if (discoveryMade && state.gemUpgrades.legendaryMeadow) {
    addGems(1);
  }

  // Deep Cartography: chance to claim unclaimed territory (5%) — FREE
  if (state.researchBonuses.deepCartography && Math.random() < 0.05) {
    var unclaimedMarkers = [];
    for (var i = 0; i < territoryMarkers.length; i++) {
      if (!territoryMarkers[i].claimed) {
        unclaimedMarkers.push(i);
      }
    }
    if (unclaimedMarkers.length > 0) {
      var randomIndex = unclaimedMarkers[Math.floor(Math.random() * unclaimedMarkers.length)];
      claimFreeTerritory(randomIndex);
      showToast("🗺️ Deep Cartography: Scout claimed a new territory!");
    }
  }
}

// ---- Free territory claim (no cost, no unlock price increase) ----
function claimFreeTerritory(markerIndex) {
  if (markerIndex < 0 || markerIndex >= territoryMarkers.length) return;
  var marker = territoryMarkers[markerIndex];
  if (marker.claimed) return;

  // Mark as claimed and turn flag gold
  marker.claimed = true;
  marker.mesh.userData.claimed = true;
  marker.mesh.children.forEach(function(child) {
    if (child.isMesh && child.material.color) {
      child.material.color.setHex(0xFFD700);
    }
  });

  // Add territory to state without cost
  var territoryId = 't_free_' + Date.now();
  var newTerritory = {
    id: territoryId,
    zone: marker.zoneId,
    pos: { x: marker.position.x, y: marker.position.y, z: marker.position.z },
    resourceType: 'food',
    level: 1,
    claimedAt: Date.now(),
    assignedWorkers: 0,
    assignedSoldiers: 0
  };
  state.territoriesClaimed.push(newTerritory);
  recalculateFoodCap();
  emitParticles(marker.position, 8, 0xFFD700, 0.05, 0.6, 0.4);
  refreshHUD();
  saveGame();
}

// ---- Helper: claim territory by world position (used by deep cartography) ----
function claimTerritoryByPosition(x, z) {
  for (var i = 0; i < territoryMarkers.length; i++) {
    var marker = territoryMarkers[i];
    if (!marker.claimed) {
      var dist = Math.sqrt(
        Math.pow(marker.position.x - x, 2) + 
        Math.pow(marker.position.z - z, 2)
      );
      if (dist < 1.5) {
        claimFreeTerritory(i);
        return true;
      }
    }
  }
  return false;
}

// ---- Get effective scout speed ----
function getEffectiveScoutSpeed() {
  var base = 1.2;
  if (state.evolution.scout >= 1) base += EVOLUTION_TREE.scout.tiers[0].effect.speedBonus;
  if (state.prestigeUpgrades.ppSpeed) base *= 1 + state.prestigeUpgrades.ppSpeed * 0.1;
  if (state.ascensionUpgrades.goldenQueen > 0) base *= 2;
  if (state.researchBonuses && state.researchBonuses.scoutSpeed) base += state.researchBonuses.scoutSpeed;
  // Legendary Riverside: +20% scout speed
  if (state.gemUpgrades.legendaryRiverside) base *= 1.20;
  return base;
}

// ---- Reset first-scout flag on prestige/ascension (call from main.js reset) ----
function resetFirstScoutFlag() {
  _firstScoutReturned = false;
}

// ---- Kill all scouts (used during prestige/ascension reset) ----
function clearAllScouts() {
  for (var i = scouts.length - 1; i >= 0; i--) {
    var sc = scouts[i];
    if (sc.mesh) {
      if (sc.resourceOrb) { disposeMesh(sc.resourceOrb); sc.mesh.remove(sc.resourceOrb); }
      disposeMesh(sc.mesh);
      scene.remove(sc.mesh);
    }
  }
  scouts = [];
}
