// ===== WORLD CONSTANTS & TERRAIN GENERATION (PERFORMANCE OPTIMISED) =====

var _v3 = new THREE.Vector3();

var SW = 36, SD = 26, TX = -9, CD = 5, CZ = 2.5, DFZ = CZ + CD / 2, TCZ = CZ;
var CCY = -3.2, CH = 3.6, CCEY = CCY + CH / 2, CCFY = CCY - CH / 2;
var GTY = 1.0, GUY = 0, TTY = GUY + 0.05, TBY = CCEY - 0.05, NR = 1.15;
var NP = new THREE.Vector3(TX, CCFY + 0.02, CZ);
var ER = new THREE.Vector3(TX, GTY + 0.18, TCZ);
var ED = new THREE.Vector3(TX, TTY - 0.3, TCZ);
var TB_vec = new THREE.Vector3(TX, TBY, TCZ);
var FS = [
  { x: 5, z: -8, color: 0xd6a85a, label: "FOOD A", slotOccupants: null },
  { x: 10, z: 0, color: 0xc98f4a, label: "FOOD B", slotOccupants: null },
  { x: 5, z: 8, color: 0xdfae62, label: "FOOD C", slotOccupants: null }
];
var SPS = 10, SRR = 1.3;
function getStationSlotOffset(si) {
  var a = (si / SPS) * Math.PI * 2;
  return { x: Math.cos(a) * SRR, z: Math.sin(a) * SRR };
}
var PATROL_POINTS = [
  new THREE.Vector3(TX + 3, GTY, TCZ + 3),
  new THREE.Vector3(TX + 3, GTY, TCZ - 3),
  new THREE.Vector3(TX - 2, GTY, TCZ - 3),
  new THREE.Vector3(TX - 2, GTY, TCZ + 3)
];

var mound, rim, collar;
function buildTerrain() {
  // Simple grass texture
  var c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  var ctx = c.getContext("2d");
  ctx.fillStyle = "#4d7a32";
  ctx.fillRect(0, 0, 512, 512);
  for (var i = 0; i < 6000; i++) {  // reduced noise specs
    var shade = Math.random() * 30 - 15;
    ctx.fillStyle = "rgb(" + Math.floor(77 + shade) + "," + Math.floor(122 + shade) + "," + Math.floor(50 + shade) + ")";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  var grassTex = new THREE.CanvasTexture(c);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(4, 3);
  var surfaceMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9, color: 0xffffff, side: THREE.DoubleSide });
  var surf = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), surfaceMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(0, GTY + 0.01, 0);
  surf.receiveShadow = true;
  scene.add(surf);

  // Dirt layers
  var dMat = new THREE.MeshStandardMaterial({ color: 0x6b4626, roughness: 1 });
  var bottomPlat = new THREE.Mesh(new THREE.PlaneGeometry(SW + 20, SD + 10), dMat);
  bottomPlat.rotation.x = -Math.PI / 2;
  bottomPlat.position.set(0, DFZ - (CD + 4) - 5, 0);
  bottomPlat.receiveShadow = true;
  scene.add(bottomPlat);

  [new THREE.Mesh(new THREE.PlaneGeometry(SW, 10), dMat), new THREE.Mesh(new THREE.PlaneGeometry(SW, 10), dMat)]
    .forEach(function(m, idx) {
      m.position.set(0, -5, idx === 0 ? DFZ : DFZ - (CD + 4));
      m.receiveShadow = true;
      scene.add(m);
    });
  [new THREE.Mesh(new THREE.PlaneGeometry(CD + 4, 10), dMat), new THREE.Mesh(new THREE.PlaneGeometry(CD + 4, 10), dMat)]
    .forEach(function(m, idx) {
      m.rotation.y = (idx === 0 ? 1 : -1) * Math.PI / 2;
      m.position.set((idx === 0 ? -1 : 1) * SW / 2, -5, DFZ - (CD + 4) / 2);
      m.receiveShadow = true;
      scene.add(m);
    });
  var bottomDirt = new THREE.Mesh(new THREE.PlaneGeometry(SW, CD + 4), dMat);
  bottomDirt.rotation.x = Math.PI / 2;
  bottomDirt.position.set(0, -10, DFZ - (CD + 4) / 2);
  bottomDirt.receiveShadow = true;
  scene.add(bottomDirt);

  // ----- TREES & BUSHES (reduced density, no foliage shadows) -----
  function addTree(x, z, s) {
    var g = new THREE.Group();
    var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.8 * s, 6), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }));
    tr.position.y = 0.4 * s; tr.castShadow = true; tr.receiveShadow = true; g.add(tr);
    var fm = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });
    var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 0.9 * s, 8), fm);
    f1.position.y = 0.9 * s; f1.castShadow = false; f1.receiveShadow = true; g.add(f1);  // foliage no longer casts shadow
    var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 0.9 * s, 8), fm);
    f2.scale.set(0.8, 0.8, 0.8); f2.position.y = 1.2 * s; f2.castShadow = false; f2.receiveShadow = true; g.add(f2);
    g.position.set(x, GTY, z);
    scene.add(g);
  }
  function addBush(x, z, s) {
    var g = new THREE.Group();
    var m = new THREE.MeshStandardMaterial({ color: 0x3a6b2f, roughness: 0.7 });
    for (var i = 0; i < 4; i++) {  // fewer spheres per bush
      var p = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 5, 5), m);
      p.position.set((Math.random() - 0.5) * 0.3 * s, 0.1 * s + Math.random() * 0.2 * s, (Math.random() - 0.5) * 0.3 * s);
      p.castShadow = false; p.receiveShadow = true;  // no shadow casting from bushes
      g.add(p);
    }
    g.position.set(x, GTY, z);
    scene.add(g);
  }

  // Wider spacing, fewer trees
  for (var x = -SW / 2 + 3; x <= SW / 2 - 3; x += 3.5 + Math.random() * 1.2) {
    if (Math.random() < 0.6) addTree(x, SD / 2 - 1.5 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
    else addBush(x, SD / 2 - 1.5, 0.4 + Math.random() * 0.3);
    if (Math.random() < 0.6) addTree(x, -SD / 2 + 1.5 - Math.random() * 0.5, 0.8 + Math.random() * 0.4);
    else addBush(x, -SD / 2 + 1.5, 0.4 + Math.random() * 0.3);
  }
  for (var z = -SD / 2 + 3; z <= SD / 2 - 3; z += 3.5 + Math.random() * 1.2) {
    if (Math.random() < 0.6) addTree(-SW / 2 + 1.5 - Math.random() * 0.5, z, 0.8 + Math.random() * 0.4);
    else addBush(-SW / 2 + 1.5, z, 0.4 + Math.random() * 0.3);
    if (Math.random() < 0.6) addTree(SW / 2 - 1.5 + Math.random() * 0.5, z, 0.8 + Math.random() * 0.4);
    else addBush(SW / 2 - 1.5, z, 0.4 + Math.random() * 0.3);
  }

  // Trail paths to food stations (unchanged)
  var trMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 1 });
  for (var fi = 0; fi < FS.length; fi++) {
    var st = FS[fi];
    var from = new THREE.Vector2(TX, TCZ), to = new THREE.Vector2(st.x, st.z);
    var segs = Math.max(4, Math.round(from.distanceTo(to) / 2)), pts = [];
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var bx = from.x + (to.x - from.x) * t, bz = from.y + (to.y - from.y) * t;
      var w = Math.sin(t * Math.PI) * 0.6 * Math.sin(t * 7 + st.x);
      var pa = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
      pts.push(new THREE.Vector3(bx + Math.cos(pa) * w, GTY + 0.01, bz + Math.sin(pa) * w));
    }
    for (var i = 0; i < pts.length - 1; i++) {
      var a2 = pts[i], b2 = pts[i + 1];
      var sl = a2.distanceTo(b2);
      var m2 = new THREE.Mesh(new THREE.PlaneGeometry(sl + 0.4, 1.1), trMat);
      m2.rotation.x = -Math.PI / 2;
      m2.rotation.z = -Math.atan2(b2.z - a2.z, b2.x - a2.x);
      m2.position.set((a2.x + b2.x) / 2, GTY + 0.005, (a2.z + b2.z) / 2);
      m2.receiveShadow = true;
      scene.add(m2);
    }
  }

  // Mound, rim, collar (unchanged)
  mound = new THREE.Mesh(new THREE.CylinderGeometry(NR + 0.3, NR + 0.6, 0.18, 16), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  mound.position.set(TX, GTY + 0.06, TCZ);
  mound.receiveShadow = mound.castShadow = true;
  scene.add(mound);
  rim = new THREE.Mesh(new THREE.TorusGeometry(NR, 0.18, 8, 20), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(TX, GTY + 0.06, TCZ);
  rim.castShadow = rim.receiveShadow = true;
  scene.add(rim);
  collar = new THREE.Mesh(new THREE.CylinderGeometry(NR, NR, 0.45, 20), new THREE.MeshStandardMaterial({ color: 0x2a1a0c, roughness: 0.9, side: THREE.DoubleSide }));
  collar.position.set(TX, GTY - 0.25, TCZ);
  collar.castShadow = collar.receiveShadow = true;
  scene.add(collar);

  // Patrol point markers (unchanged)
  for (var pi = 0; pi < PATROL_POINTS.length; pi++) {
    var pt = PATROL_POINTS[pi];
    var m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xaa4444, emissive: 0x220000, emissiveIntensity: 0.3 }));
    m.position.set(pt.x, GTY + 0.1, pt.z);
    scene.add(m);
  }
}

// ===== MUSHROOMS (reduced to 6, no per‑frame emissive update unless needed) =====
var mushroomMeshes = [], mushroomLights = [];
var _lastNightProgress = -1;  // cached value to avoid redundant updates
function initMushrooms() {
  for (var mi = 0; mi < 6; mi++) {
    var mx = -SW / 2 + 4 + Math.random() * (SW - 8);
    var mz = -SD / 2 + 4 + Math.random() * (SD - 8);
    if (Math.abs(mx - TX) > 5 || Math.abs(mz - TCZ) > 5) createMushroom(mx, mz);
  }
}
function createMushroom(x, z) {
  var group = new THREE.Group();
  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
  stem.position.y = 0.15;
  group.add(stem);
  var capMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4466aa, emissiveIntensity: 0, roughness: 0.5 });
  var cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), capMat);
  cap.position.y = 0.25;
  cap.scale.set(1, 0.4, 1);
  group.add(cap);
  group.position.set(x, GTY + 0.01, z);
  group.visible = false;
  group.userData = { capMat: capMat };
  scene.add(group);
  var light = new THREE.PointLight(0x88ccff, 0, 2);
  light.position.copy(group.position);
  light.position.y += 0.3;
  scene.add(light);
  light.visible = false;
  mushroomMeshes.push(group);
  mushroomLights.push(light);
}

// ===== RAIN DROPS (reduced to 80) =====
var rainDrops = [];
function initRainDrops() {
  for (var ri = 0; ri < 80; ri++) {
    var drop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.5, emissive: 0x334466, emissiveIntensity: 0.2 }));
    drop.visible = false;
    drop.position.set(-SW / 2 + Math.random() * SW, Math.random() * 15, -SD / 2 + Math.random() * SD);
    drop.userData = { speed: 4 + Math.random() * 6 };
    scene.add(drop);
    rainDrops.push(drop);
  }
}

// ===== PARTICLE SYSTEM (reduced pool) =====
var particlePool = [];
function initParticles() { for (var pi = 0; pi < 150; pi++) particlePool.push(createParticle()); }
function createParticle() {
  var m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  m.visible = false;
  scene.add(m);
  return { mesh: m, life: 0, maxLife: 1, velocity: new THREE.Vector3(), active: false };
}
function emitParticles(worldPos, count, color, size, speed, maxLife) {
  var emitted = 0;
  for (var i = 0; i < particlePool.length && emitted < count; i++) {
    var p = particlePool[i];
    if (!p.active) {
      p.active = true; p.life = 0; p.maxLife = maxLife || 0.6;
      p.mesh.position.copy(worldPos);
      p.mesh.scale.setScalar(size || 0.05);
      p.mesh.material.color.setHex(color);
      p.mesh.material.emissive.setHex(color);
      p.mesh.material.emissiveIntensity = 0.8;
      p.mesh.visible = true;
      var angle = Math.random() * Math.PI * 2, upAngle = (Math.random() - 0.5) * Math.PI * 0.8, spd = speed * (0.5 + Math.random());
      p.velocity.set(Math.cos(angle) * Math.cos(upAngle) * spd, Math.sin(upAngle) * spd + spd * 0.5, Math.sin(angle) * Math.cos(upAngle) * spd);
      emitted++;
    }
  }
}
function updateParticles(dt) {
  for (var i = 0; i < particlePool.length; i++) {
    var p = particlePool[i];
    if (!p.active) continue;
    p.life += dt;
    var t = p.life / p.maxLife;
    p.mesh.position.x += p.velocity.x * dt;
    p.mesh.position.y += p.velocity.y * dt;
    p.mesh.position.z += p.velocity.z * dt;
    p.velocity.y -= 1.5 * dt;
    p.mesh.scale.setScalar(p.mesh.scale.x * (1 - dt * 3));
    p.mesh.material.emissiveIntensity = Math.max(0, 0.8 - t);
    if (p.life >= p.maxLife) { p.active = false; p.mesh.visible = false; }
  }
}

// Mesh disposal helper
function disposeMesh(mesh) {
  if (!mesh) return;
  mesh.traverse(function(child) {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        for (var i = 0; i < child.material.length; i++) child.material[i].dispose();
      } else child.material.dispose();
    }
  });
}

// Food station visuals (unchanged)
function initFoodStations() {
  for (var fi = 0; fi < FS.length; fi++) {
    var st = FS[fi];
    st.slotOccupants = new Array(SPS);
    for (var si = 0; si < SPS; si++) st.slotOccupants[si] = null;
    var p = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 8), new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.7 }));
    p.position.set(st.x, GTY + 0.45, st.z);
    p.castShadow = true;
    scene.add(p);
    st.pileMesh = p;
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xaa7a20, emissiveIntensity: 0.4 }));
    m.position.set(st.x, GTY + 1.3, st.z);
    scene.add(m);
    st.markerMesh = m;
    makeLabel("🌾 " + st.label, st.x, GTY + 2.2, st.z, 256, 64, false);
  }
                                                                         }
