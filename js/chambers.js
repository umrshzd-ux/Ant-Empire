// ===== CHAMBERS, STOCKPILE, NURSERY CLUSTERS, TUNNEL LIGHTS =====

// Chamber meshes
var queenChamberGroup, storageChambers = [], nurseryChambers = [], soldierChambers = [],
    researchChambers = [], scoutChambers = [], storagePiles = [], nurseryEggClusters = [],
    researchChamberGroup = null, barracksSoldiers = [];

// Queen chamber walls
function buildQueenChamberWalls() {
  if (!queenChamberGroup) {
    queenChamberGroup = new THREE.Group();
    queenChamberGroup.position.set(TX, CCY, CZ);
    scene.add(queenChamberGroup);
  }
  while (queenChamberGroup.children.length > 0) {
    var ch = queenChamberGroup.children[0];
    disposeMesh(ch);
    queenChamberGroup.remove(ch);
  }
  var mat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.95 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(7, CD), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -CH / 2, 0);
  floor.receiveShadow = true;
  queenChamberGroup.add(floor);
  var rw = new THREE.Mesh(new THREE.PlaneGeometry(CD, CH), mat);
  rw.rotation.y = -Math.PI / 2;
  rw.position.set(3.5, 0, 0);
  queenChamberGroup.add(rw);
  if (state.chambers.nursery.count === 0) {
    var lw = new THREE.Mesh(new THREE.PlaneGeometry(CD, CH), mat);
    lw.rotation.y = Math.PI / 2;
    lw.position.set(-3.5, 0, 0);
    queenChamberGroup.add(lw);
  }
}

// Generic chamber mesh
function makeChamber(x, y, z, w, h, d, col) {
  var g = new THREE.Group();
  var m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 });
  var fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(0, -h / 2, 0);
  fl.receiveShadow = true;
  g.add(fl);
  var lw = new THREE.Mesh(new THREE.PlaneGeometry(d, h), m);
  lw.rotation.y = Math.PI / 2;
  lw.position.set(-w / 2, 0, 0);
  g.add(lw);
  var rw = new THREE.Mesh(new THREE.PlaneGeometry(d, h), m);
  rw.rotation.y = -Math.PI / 2;
  rw.position.set(w / 2, 0, 0);
  g.add(rw);
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}

// Sprite label
function makeLabel(text, x, y, z, w, h, underground) {
  var c = document.createElement("canvas");
  c.width = w || 256;
  c.height = h || 64;
  var ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(20,14,8,0.85)";
  var rw = c.width - 16, rh = c.height - 16;
  ctx.beginPath();
  ctx.moveTo(28, 8);
  ctx.lineTo(rw - 12, 8);
  ctx.arcTo(rw, 8, rw, 20, 12);
  ctx.lineTo(rw, rh - 12);
  ctx.arcTo(rw, rh, rw - 12, rh, 12);
  ctx.lineTo(20, rh);
  ctx.arcTo(8, rh, 8, rh - 12, 12);
  ctx.lineTo(8, 20);
  ctx.arcTo(8, 8, 20, 8, 12);
  ctx.fill();
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "bold " + (h ? h * 0.4 : 26) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, c.width / 2, c.height * 0.55);
  var t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: !!underground }));
  s.position.set(x, y, z);
  s.scale.set((w || 256) / 80, (h || 64) / 80, 1);
  scene.add(s);
  return s;
}

// Helpers for chamber positions
function getNextStorageX() { return TX + 5 + state.chambers.foodStorage.count * 3.5; }
function getNextSoldierX() { return TX + 5 + BAL.soldierRowStart + state.chambers.soldier.count * 3.5; }
function getNextResearchX() { return TX + 5 + BAL.researchRowStart + state.chambers.research.count * 3.5; }
function getNextScoutX() { return TX + 5 + BAL.scoutRowStart + state.chambers.scout.count * 3.5; }

function rebuildChambersFromSave() {
  rebuildAllChambers();
  makeLabel("🏠 Nest", TX, GTY + 1.2, TCZ);
}

// Storage piles (food fullness)
var storagePilesDirty = true;
function updateStoragePiles() {
  var fillRatio = Math.min(1, state.food / Math.max(1, state.foodCap));
  for (var si = 0; si < storagePiles.length; si++) {
    var pile = storagePiles[si];
    while (pile.children.length > 0) pile.remove(pile.children[0]);
    var crumbCount = Math.floor(fillRatio * 20);
    for (var i = 0; i < crumbCount; i++) {
      var crumb = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0xe0b15a, roughness: 0.6 }));
      crumb.position.set((Math.random() - 0.5) * 1.2, i * 0.03, (Math.random() - 0.5) * 1.5);
      pile.add(crumb);
    }
  }
}

// Nursery egg clusters
function updateNurseryClusters() {
  for (var ci = 0; ci < nurseryEggClusters.length; ci++) {
    var cluster = nurseryEggClusters[ci];
    while (cluster.children.length > 0) cluster.remove(cluster.children[0]);
    var eggCount = Math.min(6, state.eggs);
    for (var i = 0; i < eggCount; i++) {
      var egg = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.3, emissive: 0xffeecc, emissiveIntensity: 0.3 }));
      egg.position.set((Math.random() - 0.5) * 1.0, i * 0.04 + 0.05, (Math.random() - 0.5) * 1.2);
      cluster.add(egg);
    }
  }
}

// Nest evolution visuals
function evolveNestVisuals(newLevel, silent) {
  state.nestEvolutionLevel = newLevel;
  var scale = 1 + newLevel * 0.15;
  if (mound) mound.scale.setScalar(scale);
  if (rim) rim.scale.setScalar(scale);
  if (collar) collar.scale.setScalar(scale);
  if (newLevel >= 1) {
    for (var i = 0; i < 4 * newLevel; i++) {
      var lf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x4a8a2a + newLevel * 0x111100, roughness: 0.7, side: THREE.DoubleSide }));
      var a = (i / (4 * newLevel)) * Math.PI * 2 + Math.random() * 0.5, d = NR * scale + 0.5 + Math.random() * 0.3;
      lf.position.set(TX + Math.cos(a) * d, GTY + 0.02, TCZ + Math.sin(a) * d);
      lf.rotation.z = Math.random() * Math.PI;
      lf.rotation.y = a;
      scene.add(lf);
    }
  }
  if (newLevel >= 3) {
    for (var i = 0; i < newLevel; i++) {
      var mg = new THREE.Group();
      var stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      stem2.position.y = 0.12;
      mg.add(stem2);
      var cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x884400, emissiveIntensity: 0.4, roughness: 0.5 }));
      cap2.position.y = 0.22;
      cap2.scale.set(1, 0.4, 1);
      mg.add(cap2);
      var a = (i / newLevel) * Math.PI * 2, d = NR * scale + 0.7;
      mg.position.set(TX + Math.cos(a) * d, GTY + 0.01, TCZ + Math.sin(a) * d);
      scene.add(mg);
    }
  }
  if (!silent) showToast("🏠 Nest evolved to Level " + newLevel + "!");
}

// Tunnel lights
var cLight, qgLight, qgSphere;
function initTunnelLights() {
  cLight = new THREE.PointLight(0xffd9a0, 1.6, 11);
  cLight.position.set(TX, CCY + 0.9, DFZ - 0.5);
  scene.add(cLight);
  qgLight = new THREE.PointLight(0xffaa33, 2.5, 15);
  qgLight.position.set(TX, CCFY + 0.5, CZ);
  scene.add(qgLight);
  qgSphere = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xff6600, emissiveIntensity: 1 }));
  qgSphere.position.copy(qgLight.position);
  scene.add(qgSphere);
  var tun = new THREE.Mesh(new THREE.CylinderGeometry(NR, NR, GUY - CCEY, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, side: THREE.DoubleSide }));
  tun.position.set(TX, CCEY + (GUY - CCEY) / 2, TCZ);
  scene.add(tun);
}
initTunnelLights();

// Food station slots
function claimStationSlot(st, w) {
  for (var i = 0; i < SPS; i++) {
    if (st.slotOccupants[i] === null) {
      st.slotOccupants[i] = w;
      return i;
    }
  }
  var fallback = (w.id !== undefined) ? w.id % SPS : Math.floor(Math.random() * SPS);
  return fallback;
}
function releaseStationSlot(st, si) {
  if (si !== null && si !== undefined) st.slotOccupants[si] = null;
}
var stockpile = new THREE.Group();
stockpile.position.set(TX + 2, CCY - 1.3, CZ + 1.2);
scene.add(stockpile);
var crMat = new THREE.MeshStandardMaterial({ color: 0xe0b15a, roughness: 0.6 });
function addStockpileCrumb() {
  if (stockpile.children.length >= 24) return;
  var c = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.04, 6, 6), crMat);
  var a = Math.random() * Math.PI * 2, r = Math.random() * 0.55;
  c.position.set(Math.cos(a) * r, stockpile.children.length * 0.045, Math.sin(a) * r);
  stockpile.add(c);
}

// Rebuild all chambers from state (used after prestige/ascension)
function rebuildAllChambers() {
  while (storageChambers.length > 0) { var ch = storageChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (nurseryChambers.length > 0) { var ch = nurseryChambers.pop(); if (ch) { disposeMesh(ch); scene.remove(ch); } }
  while (soldierChambers.length > 0) { var ch = soldierChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (researchChambers.length > 0) { var ch = researchChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  while (scoutChambers.length > 0) { var ch = scoutChambers.pop(); if (ch && ch.mesh) { disposeMesh(ch.mesh); scene.remove(ch.mesh); } }
  barracksSoldiers = [];
  for (var rbi = 0; rbi < state.chambers.foodStorage.count; rbi++) {
    var chX = TX + 5 + rbi * 3.5;
    storageChambers.push(makeChamber(chX, CCY, CZ, 3, 2, 4, 0x5a4020));
    makeLabel("🌾 Storage", chX, CCY + 1.4, CZ, 256, 64, true);
  }
  for (var rbi = 0; rbi < state.chambers.nursery.count; rbi++) {
    var chX = TX - 5 - rbi * 3.5;
    nurseryChambers.push(makeChamber(chX, CCY, CZ, 3, 2, 4, 0x6b5040));
    makeLabel("🥚 Nursery", chX, CCY + 1.4, CZ, 256, 64, true);
  }
  for (var rbi = 0; rbi < state.chambers.soldier.count; rbi++) {
    var chX = BAL.soldierRowStart + TX + 5 + rbi * 3.5;
    soldierChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x4a2a1a) });
    makeLabel("🛡️ Barracks", chX, CCY + 1.4, CZ, 256, 64, true);
  }
  for (var rbi = 0; rbi < state.chambers.research.count; rbi++) {
    var chX = BAL.researchRowStart + TX + 5 + rbi * 3.5;
    researchChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a3a5a) });
    makeLabel("🔬 Research", chX, CCY + 1.4, CZ, 256, 64, true);
  }
  for (var rbi = 0; rbi < state.chambers.scout.count; rbi++) {
    var chX = BAL.scoutRowStart + TX + 5 + rbi * 3.5;
    scoutChambers.push({ x: chX, mesh: makeChamber(chX, CCY, CZ, 3, 2, 4, 0x3a5a3a) });
    makeLabel("🔍 Scout Post", chX, CCY + 1.4, CZ, 256, 64, true);
  }
  if (state.chambers.research.count > 0) {
    var chX = BAL.researchRowStart + TX + 5 + (state.chambers.research.count - 1) * 3.5;
    researchChamberGroup = new THREE.Group();
    researchChamberGroup.position.set(chX, CCY + 1.8, CZ);
    var orbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 });
    for (var i = 0; i < 5; i++) {
      var orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), orbMat);
      var angle = (i / 5) * Math.PI * 2;
      orb.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6);
      researchChamberGroup.add(orb);
    }
    scene.add(researchChamberGroup);
  }
        }
