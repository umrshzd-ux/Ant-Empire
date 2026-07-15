// ===== SPIDER CREATION, MOVEMENT, STEALING =====

var enemies = [];

function createSpider() {
  var g = new THREE.Group();
  var bm = new THREE.MeshStandardMaterial({ color: 0x4a1010, roughness: 0.3, metalness: 0.2 });
  var ab = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bm);
  ab.position.set(0, 0.2, -0.25);
  ab.scale.set(1, 0.8, 1.3);
  ab.castShadow = true;
  g.add(ab);
  var tx = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bm);
  tx.position.set(0, 0.25, 0.3);
  tx.castShadow = true;
  g.add(tx);
  var hd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), bm);
  hd.position.set(0, 0.25, 0.55);
  hd.castShadow = true;
  g.add(hd);
  var em = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
  [-0.08, 0.08].forEach(function(sd) {
    var e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), em);
    e.position.set(sd, 0.3, 0.6);
    g.add(e);
  });
  var lm = new THREE.MeshStandardMaterial({ color: 0x2a1010, roughness: 0.5 });
  [
    { x: 0.28, z: 0.25, a: 0.6 }, { x: -0.28, z: 0.25, a: -0.6 },
    { x: 0.25, z: 0.05, a: 0.5 }, { x: -0.25, z: 0.05, a: -0.5 },
    { x: 0.22, z: -0.15, a: 0.4 }, { x: -0.22, z: -0.15, a: -0.4 },
    { x: 0.18, z: -0.35, a: 0.3 }, { x: -0.18, z: -0.35, a: -0.3 }
  ].forEach(function(lp) {
    var l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 4), lm);
    l.position.set(lp.x, 0.08, lp.z);
    l.rotation.z = lp.a;
    l.rotation.x = 0.3;
    l.castShadow = true;
    g.add(l);
  });

  var be = Math.random() < 0.6 ? (Math.random() < 0.5 ? 0 : 3) : Math.floor(Math.random() * 4);
  var sx, sz, m = 2;
  if (be === 0) { sx = SW / 2 - m; sz = (Math.random() - 0.5) * (SD - 4); }
  else if (be === 1) { sx = -SW / 2 + m; sz = (Math.random() - 0.5) * (SD - 4); }
  else if (be === 2) { sx = (Math.random() - 0.5) * (SW - 4); sz = SD / 2 - m; }
  else { sx = (Math.random() - 0.5) * (SW - 4); sz = -SD / 2 + m; }
  g.position.set(sx, GTY + 0.2, sz);
  scene.add(g);

  var hb = createHealthBar(g, 80, 10, 1.3);
  var sp = {
    mesh: g,
    health: BAL.spiderHealth,
    maxHealth: BAL.spiderHealth,
    speed: BAL.spiderSpeed + Math.random() * 0.15,
    healthBar: hb,
    target: ER.clone(),
    attackCooldown: 0,
    stealing: false,
    fleeTarget: null,
    _stuckTimer: 0  // safety for stuck spiders
  };
  enemies.push(sp);
  return sp;
}

function killSpider(sp) {
  var pos = sp.mesh.position.clone();
  disposeMesh(sp.mesh);
  scene.remove(sp.mesh);
  var idx = enemies.indexOf(sp);
  if (idx >= 0) enemies.splice(idx, 1);
  addFood(18, pos);
  emitParticles(pos, 15, 0xaa2222, 0.06, 1.2, 0.6);
  state.totalKills++;
  state.lifetimeStats.totalKills++;
  AudioManager.sfx.spiderDeath();
  updateDailyProgress('kill8', 1);
  // Decrement wave spider count to allow wave to end
  if (state.waveActive && state.waveSpidersRemaining > 0) {
    state.waveSpidersRemaining--;
  }
  checkAchievements();
}

function isEnemyNearby(w, range) {
  for (var i = 0; i < enemies.length; i++) {
    if (w.mesh && w.mesh.position.distanceTo(enemies[i].mesh.position) < range) return true;
  }
  return false;
}

function spawnDamageNumber(amount, wp, color) {
  var s = worldToScreen(wp);
  var f = document.createElement("div");
  f.className = "floater";
  f.textContent = "-" + amount;
  f.style.left = s.x + "px";
  f.style.top = s.y + "px";
  f.style.color = color || "#ff4444";
  f.style.fontWeight = "900";
  floatersEl.appendChild(f);
  setTimeout(function() { f.remove(); }, 900);
}
