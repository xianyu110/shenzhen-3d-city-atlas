import * as THREE from 'three';

// A deliberately low-poly, map-like interpretation of Shenzhen's real geography.
const C = { land: 0x102b32, landEdge: 0x1f4950, block: 0x173949, block2: 0x1c4657, glass: 0x5fcbd0, cyan: 0x55e6df, coral: 0xff806d, lime: 0xb8e36b, amber: 0xffc46b, road: 0x0f2635, lane: 0x397080, water: 0x0a4964, waterEdge: 0x116b7c, hill: 0x17473f, hill2: 0x1d5a4a };
const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: .2, ...options });
const mats = { land: material(C.land), landEdge: material(C.landEdge), block: material(C.block), block2: material(C.block2), glass: material(C.glass, { emissive: C.glass, emissiveIntensity: .5, transparent: true, opacity: .8 }), cyan: material(C.cyan, { emissive: C.cyan, emissiveIntensity: 2.2, toneMapped: false }), coral: material(C.coral, { emissive: C.coral, emissiveIntensity: 2.1, toneMapped: false }), lime: material(C.lime, { emissive: C.lime, emissiveIntensity: 1.6, toneMapped: false }), amber: material(C.amber, { emissive: C.amber, emissiveIntensity: 1.7, toneMapped: false }), road: material(C.road), lane: material(C.lane, { emissive: C.lane, emissiveIntensity: .35 }), water: material(C.water, { roughness: .2, metalness: .1 }), waterEdge: material(C.waterEdge, { emissive: C.waterEdge, emissiveIntensity: .45, transparent: true, opacity: .78 }), hill: material(C.hill), hill2: material(C.hill2) };
const mesh = (geo, mat, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = true; m.receiveShadow = true; return m; };
const box = (s, mat, p, r) => mesh(new THREE.BoxGeometry(...s), mat, p, r);
function makeLabel(text, color = '#a6fff5') { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#071623'; x.fillRect(0, 0, c.width, c.height); x.font = '700 30px Arial'; x.fillStyle = color; x.fillText(text, 22, 61); const t = new THREE.CanvasTexture(c); return new THREE.Mesh(new THREE.PlaneGeometry(4.4, .8), new THREE.MeshBasicMaterial({ map: t, transparent: true })); }
function polygon(points, mat, depth = .12, y = .08) { const shape = new THREE.Shape(); points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)); shape.closePath(); const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); return mesh(geo, mat, [0, y, 0]); }
function segment(group, a, b, width, mat = mats.road, y = .2) { const dx = b[0] - a[0]; const dz = b[1] - a[1]; const length = Math.hypot(dx, dz); const angle = Math.atan2(dz, dx); group.add(box([length, .1, width], mat, [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2], [0, -angle, 0])); }
function route(group, points, width, withLane = true) { for (let i = 0; i < points.length - 1; i += 1) { segment(group, points[i], points[i + 1], width); if (withLane) segment(group, points[i], points[i + 1], .06, mats.lane, .27); } }
function building(group, x, z, w, d, h, mat, label = '', district = 'CITY', rotation = 0) { const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = rotation; const body = box([w, h, d], mat, [0, h / 2, 0]); body.userData = { label, district }; root.add(body); if (h > 8) { root.add(box([w * .72, .16, d * .72], mats.glass, [0, h * .62, 0])); root.add(box([w * .84, .08, .08], mats.glass, [0, h * .82, d / 2 + .02])); } if (label) { const sign = makeLabel(label, mat === mats.coral ? '#ffb1a1' : '#93fff5'); sign.position.set(0, h + 1, d / 2 + .05); sign.rotation.x = -Math.PI / 2.8; root.add(sign); } group.add(root); return root; }
function tower(group, x, z, h, radius, mat, label, district, kind = 'taper') { const root = new THREE.Group(); root.position.set(x, 0, z); root.userData.district = district; let body; if (kind === 'needle') body = mesh(new THREE.CylinderGeometry(radius * .48, radius, h, 6), mat, [0, h / 2, 0]); else if (kind === 'spring') body = mesh(new THREE.CylinderGeometry(radius * .62, radius, h, 12), mat, [0, h / 2, 0]); else body = mesh(new THREE.CylinderGeometry(radius * .78, radius, h, 8), mat, [0, h / 2, 0]); body.userData = { label, district }; root.add(body); root.add(mesh(new THREE.CylinderGeometry(radius * .84, radius * .84, .16, 12), mats.glass, [0, h * .68, 0])); if (kind === 'needle') root.add(mesh(new THREE.CylinderGeometry(.08, .08, 4, 6), mats.coral, [0, h + 2, 0])); const sign = makeLabel(label, mat === mats.coral ? '#ffb1a1' : '#93fff5'); sign.position.set(0, h + 1.4, radius + .1); sign.rotation.x = -Math.PI / 2.8; root.add(sign); group.add(root); return root; }
function hill(group, x, z, w, h, mat, label = '') { const root = new THREE.Group(); root.position.set(x, 0, z); const m = mesh(new THREE.ConeGeometry(1, h, 8), mat, [0, h / 2, 0]); m.scale.set(w, 1, w * .7); root.add(m); if (label) { const sign = makeLabel(label, '#b8e36b'); sign.position.set(0, h + .4, 0); sign.rotation.x = -Math.PI / 2; root.add(sign); } group.add(root); return root; }

export async function createCity(scene) {
  const root = new THREE.Group(); scene.add(root);
  const layers = { landmarks: new THREE.Group(), roads: new THREE.Group(), water: new THREE.Group() }; Object.values(layers).forEach((g) => root.add(g));
  const pickables = []; const landmarks = layers.landmarks; const pulse = [];
  // Approximate municipal outline: west (Bao'an) to east (Dapeng), with the north ridge and southern bays.
  const outline = [[-38, -17], [-36, -5], [-34, 8], [-29, 19], [-19, 27], [-6, 30], [8, 29], [19, 26], [29, 28], [37, 21], [38, 8], [35, 0], [39, -9], [34, -18], [21, -22], [6, -22], [-11, -23], [-25, -22]];
  root.add(polygon(outline, mats.land, .55, -.18)); root.add(polygon(outline, mats.landEdge, .06, .38));
  // The bays are positioned according to Shenzhen's real coast: Shenzhen Bay in the southwest and Dapeng Bay to the east.
  const shenzhenBay = [[-42, -25], [-42, -4], [-35, -4], [-30, -8], [-24, -14], [-15, -18], [-5, -20], [-5, -26]];
  const dapengBay = [[22, -25], [42, -25], [42, 9], [36, 8], [32, 1], [28, -5], [24, -12]];
  layers.water.add(polygon(shenzhenBay, mats.water, .12, .42)); layers.water.add(polygon(dapengBay, mats.water, .12, .43));
  // Low-poly northern mountains and signature green spaces.
  const terrain = new THREE.Group(); root.add(terrain); hill(terrain, -27, 19, 5.6, 7, mats.hill2, '凤凰山'); hill(terrain, -5, 12, 3.3, 4, mats.lime, '莲花山'); hill(terrain, 27, 21, 7, 13, mats.hill2, '梧桐山'); hill(terrain, 12, 25, 4.4, 7, mats.hill, '梅沙尖');
  // A handful of planted tree clusters makes the parks read as real green wedges.
  for (let i = 0; i < 42; i += 1) { const x = -32 + ((i * 37) % 610) / 10; const z = 8 + ((i * 23) % 190) / 10; if ((x > -9 && x < 2 && z > 8 && z < 16) || (x > 23 && z > 14)) terrain.add(mesh(new THREE.ConeGeometry(.18 + (i % 3) * .06, .55 + (i % 4) * .12, 5), mats.lime, [x, .7, z])); }
  // Real arterial logic rather than a square grid.
  route(layers.roads, [[-34, -10], [-25, -8], [-12, -5], [2, -3], [16, -1], [31, 3]], 1.45); // Shennan Avenue
  route(layers.roads, [[-33, -17], [-19, -16], [-4, -14], [12, -12], [27, -10], [35, -5]], 1.05); // Binhai / coastal corridor
  route(layers.roads, [[-32, 10], [-19, 12], [-6, 13], [7, 14], [21, 14], [33, 12]], 1.05); // Beihuan / north ring
  route(layers.roads, [[-25, 22], [-12, 20], [1, 19], [15, 20], [28, 22]], .72); // northern ring
  route(layers.roads, [[-1, -22], [0, -12], [0, -1], [1, 12], [4, 27]], .78); // central north-south spine
  route(layers.roads, [[17, -20], [18, -9], [20, 3], [25, 14], [27, 24]], .68); // eastern spine
  route(layers.roads, [[-28, -2], [-18, 5], [-9, 12]], .62); route(layers.roads, [[9, 3], [17, 9], [28, 10]], .62);
  // District-scale urban fabric, seeded for a stable render.
  const seeded = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  let index = 1; for (let x = -31; x <= 31; x += 4.2) for (let z = -12; z <= 19; z += 4.2) { const nearBay = z < -16 || (x > 22 && z < 0); if (!nearBay && seeded(index++) > .7) { const h = 1.4 + seeded(index++) * 3.2; const w = 1.8 + seeded(index++) * 1.1; building(landmarks, x + (seeded(index++) - .5) * 1.2, z + (seeded(index++) - .5) * 1.1, w, w * (.8 + seeded(index++) * .35), h, seeded(index++) > .5 ? mats.block : mats.block2); } }
  // Recognisable landmarks, placed in their actual district relationships.
  pickables.push(tower(landmarks, -3, -2, 13, 2.7, mats.glass, '平安金融中心', 'FUTIAN', 'needle'));
  pickables.push(tower(landmarks, 8, 1, 11, 2.4, mats.glass, '京基100', 'LUOHU', 'taper'));
  pickables.push(tower(landmarks, -18, -6, 10, 2.8, mats.glass, '春笋', 'NANSHAN', 'spring'));
  pickables.push(tower(landmarks, -25, -2, 8, 2.1, mats.glass, '腾讯滨海', 'NANSHAN', 'taper'));
  const civic = building(landmarks, -8, -8, 9, 2.8, 4.2, mats.amber, '市民中心', 'FUTIAN', -.03); civic.add(box([10, .16, 3.3], mats.coral, [0, 4.35, 0])); pickables.push(civic);
  const port = new THREE.Group(); port.position.set(30, 0, 7); port.userData.district = 'YANTIAN'; port.add(box([8, .7, 2.8], mats.block2, [0, .35, 0])); for (let i = -3; i <= 3; i += 2) { port.add(box([.22, 5 + Math.abs(i) * .3, .22], mats.amber, [i, 3, 0])); port.add(box([2.2, .16, .16], mats.amber, [i + 1, 5 + Math.abs(i) * .3, 0])); } const portLabel = makeLabel('盐田港', '#ffd38a'); portLabel.position.set(0, 6.5, 0); portLabel.rotation.x = -Math.PI / 2.8; port.add(portLabel); landmarks.add(port); pickables.push(port);
  const qianhai = building(landmarks, -30, -10, 4.5, 2.4, 2.2, mats.lime, '前海石公园', 'QIANHAI'); qianhai.add(mesh(new THREE.TorusGeometry(1.2, .18, 8, 20, Math.PI), mats.lime, [0, 2.3, 0], [Math.PI / 2, 0, 0])); pickables.push(qianhai);
  // OpenStreetMap geometry gives the central city a real street and block rhythm. The data is bundled locally at build time.
  try {
    const [buildingResponse, roadResponse] = await Promise.all([fetch('./data/shenzhen-buildings-compact.json'), fetch('./data/shenzhen-roads-compact.json')]);
    const [buildingData, roadData] = await Promise.all([buildingResponse.json(), roadResponse.json()]);
    const osmLandmarks = new THREE.Group(); osmLandmarks.name = 'OSM buildings'; landmarks.add(osmLandmarks);
    const osmRoads = new THREE.Group(); osmRoads.name = 'OSM roads'; layers.roads.add(osmRoads);
    const buildingMaterials = [mats.block, mats.block2, material(0x214d5e), material(0x1b4050)];
    buildingData.elements.forEach((item, i) => {
      if (!item.p || item.p.length < 3) return;
      const shape = new THREE.Shape(); item.p.forEach(([x, z], index) => index ? shape.lineTo(x, -z) : shape.moveTo(x, -z)); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.42, Math.min(10, (item.h || 3) * .34)), bevelEnabled: false }); geometry.rotateX(-Math.PI / 2);
      const b = mesh(geometry, buildingMaterials[i % buildingMaterials.length], [0, .45, 0]); b.userData = { district: 'CITY', label: '' }; osmLandmarks.add(b);
      if (i % 9 === 0 && item.h > 8) { const roof = box([.16, .08, .16], mats.glass, [item.p[0][0], item.h + .55, -item.p[0][1]]); roof.position.y = item.h + .55; }
    });
    const lineMaterial = new THREE.LineBasicMaterial({ color: C.lane, transparent: true, opacity: .52 });
    roadData.elements.slice(0, 950).forEach((item) => { if (!item.p || item.p.length < 2) return; const points = item.p.map(([x, z]) => new THREE.Vector3(x, .34, -z)); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial); line.userData = { label: item.n || '城市道路' }; osmRoads.add(line); });
  } catch (error) { console.warn('OSM data unavailable, using generated city fabric.', error); }
  // Waterfront promenade and small ferry piers.
  for (let x = -31; x <= 20; x += 2.5) layers.water.add(box([.08, .05, .25], mats.cyan, [x, .62, -19.6])); for (let z = -10; z <= 3; z += 3) layers.water.add(box([4, .05, .12], mats.waterEdge, [23, .62, z]));
  [['NANSHAN', -18, 5], ['FUTIAN', -4, 10], ['LUOHU', 9, 8], ['QIANHAI', -29, -3], ['YANTIAN', 28, 15], ['BAOAN', -29, 17], ['LONGGANG', 18, 24]].forEach(([text, x, z]) => { const l = makeLabel(text, '#8faebb'); l.position.set(x, .5, z); l.rotation.x = -Math.PI / 2; root.add(l); });
  landmarks.traverse((o) => { if (o.material?.emissiveIntensity > 1) pulse.push(o); });
  const districtTargets = { NANSHAN: [-18, -5], 南山: [-18, -5], FUTIAN: [-4, -2], 福田: [-4, -2], LUOHU: [8, 1], 罗湖: [8, 1], QIANHAI: [-29, -9], 前海: [-29, -9], YANTIAN: [29, 8], 盐田: [29, 8] };
  function focusDistrict(name) { const [x, z] = districtTargets[name] || [0, 0]; window.dispatchEvent(new CustomEvent('city-focus', { detail: { x, z } })); }
  function setMode(mode) { root.userData.mode = mode; if (mode === 'night') { scene.background.set(0x030811); scene.fog.color.set(0x030811); } else { scene.background.set(0x06121d); scene.fog.color.set(0x06121d); } if (mode === 'bay') window.dispatchEvent(new CustomEvent('city-camera', { detail: { x: 0, z: -8, distance: 48 } })); }
  function toggleLayer(layer, visible) { layers[layer].visible = visible; }
  function update(delta, elapsed) { pulse.forEach((o, i) => { if (o.material) o.material.emissiveIntensity = 1.35 + Math.sin(elapsed * 1.7 + i) * .5; }); }
  return { root, layers, pickables, focusDistrict, setMode, toggleLayer, update };
}
