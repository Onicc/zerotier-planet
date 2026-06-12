import * as THREE from './assets/vendor/three.module.js';

const canvas = document.querySelector('#orbitalStarCanvas');

function hasWebGLSupport() {
  if (!window.WebGLRenderingContext) {
    return false;
  }
  const testCanvas = document.createElement('canvas');
  return Boolean(
    testCanvas.getContext('webgl2')
    || testCanvas.getContext('webgl')
    || testCanvas.getContext('experimental-webgl'),
  );
}

if (canvas && hasWebGLSupport()) {
  try {
  const palette = [0x39f2df, 0xff6b9f, 0xffc857, 0x7cb7ff, 0xd2ff70];
  const starNames = ['Aster', 'Vega', 'Nova', 'Lumen', 'Helio', 'Cygnus', 'Orion', 'Solis'];
  let seed = 16;
  let nodes = [];
  let linkPairs = [];
  let selectedIndex = 6;
  let hoveredIndex = -1;
  let pointerTarget = new THREE.Vector2();
  let frameId = 0;
  const ringRadii = [9, 13.4, 17.8, 22.2];

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050810, 0.028);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
  camera.position.set(0, 0, 46);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const root = new THREE.Group();
  const orbitGroup = new THREE.Group();
  const nodeGroup = new THREE.Group();
  const linkGroup = new THREE.Group();
  const laserGroup = new THREE.Group();
  const glowGroup = new THREE.Group();
  const flareGroup = new THREE.Group();
  scene.add(root);
  root.position.set(3.4, -1.2, 0);
  root.scale.setScalar(0.84);
  root.add(orbitGroup, linkGroup, laserGroup, glowGroup, flareGroup, nodeGroup);

  scene.add(new THREE.AmbientLight(0x6da7ff, 1.2));
  const keyLight = new THREE.PointLight(0x39f2df, 70, 70);
  keyLight.position.set(-18, 14, 20);
  scene.add(keyLight);
  const roseLight = new THREE.PointLight(0xff6b9f, 46, 64);
  roseLight.position.set(18, -10, 18);
  scene.add(roseLight);

  const clock = new THREE.Clock();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();
  const tempDir = new THREE.Vector3();
  const tempSide = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const cameraDirectionLocal = new THREE.Vector3();
  const rootQuaternion = new THREE.Quaternion();
  const laserTextures = {
    glow: makeLaserTexture('glow'),
    core: makeLaserTexture('core'),
    scan: makeLaserTexture('scan'),
  };

  const starfield = createStarfield();
  scene.add(starfield);
  createOrbitGuides();

  function seededRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  function createStarfield() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const radius = 50 + seededRandom() * 44;
      const theta = seededRandom() * Math.PI * 2;
      const phi = Math.acos(seededRandom() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) - 14;

      color.set(palette[Math.floor(seededRandom() * palette.length)]);
      color.lerp(new THREE.Color(0xffffff), 0.48 + seededRandom() * 0.32);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
  }

  function makeGlowTexture(colorValue) {
    const size = 128;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = size;
    glowCanvas.height = size;
    const ctx = glowCanvas.getContext('2d');
    const color = new THREE.Color(colorValue);
    const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.22, `rgba(${rgb}, 0.48)`);
    gradient.addColorStop(0.58, `rgba(${rgb}, 0.14)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(glowCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeStarTexture(colorValue) {
    const size = 160;
    const starCanvas = document.createElement('canvas');
    starCanvas.width = size;
    starCanvas.height = size;
    const ctx = starCanvas.getContext('2d');
    const center = size / 2;
    const color = new THREE.Color(colorValue);
    const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;

    const glow = ctx.createRadialGradient(center, center, 0, center, center, center * 0.62);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.08, `rgba(${rgb}, 1)`);
    glow.addColorStop(0.24, `rgba(${rgb}, 0.64)`);
    glow.addColorStop(0.54, `rgba(${rgb}, 0.16)`);
    glow.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = `rgba(${rgb}, 0.9)`;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(${rgb}, 0.76)`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * center * 0.34;
      const y = Math.sin(angle) * center * 0.34;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.68)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, center * 0.42, -0.25 * Math.PI, 0.72 * Math.PI);
    ctx.stroke();
    ctx.restore();

    const texture = new THREE.CanvasTexture(starCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeFlareTexture(colorValue) {
    const size = 192;
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = size;
    flareCanvas.height = size;
    const ctx = flareCanvas.getContext('2d');
    const center = size / 2;
    const color = new THREE.Color(colorValue);
    const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;

    ctx.save();
    ctx.translate(center, center);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i += 1) {
      ctx.rotate(Math.PI / 3);
      const gradient = ctx.createLinearGradient(-center * 0.86, 0, center * 0.86, 0);
      gradient.addColorStop(0, `rgba(${rgb}, 0)`);
      gradient.addColorStop(0.45, `rgba(${rgb}, 0.08)`);
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.46)');
      gradient.addColorStop(0.55, `rgba(${rgb}, 0.08)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = i % 2 === 0 ? 1.1 : 0.55;
      ctx.beginPath();
      ctx.moveTo(-center * 0.82, 0);
      ctx.lineTo(center * 0.82, 0);
      ctx.stroke();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(flareCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeLaserTexture(type) {
    const width = type === 'scan' ? 256 : 512;
    const height = type === 'scan' ? 48 : 64;
    const laserCanvas = document.createElement('canvas');
    laserCanvas.width = width;
    laserCanvas.height = height;
    const ctx = laserCanvas.getContext('2d');
    const vertical = ctx.createLinearGradient(0, 0, 0, height);

    if (type === 'core') {
      vertical.addColorStop(0, 'rgba(255,255,255,0)');
      vertical.addColorStop(0.44, 'rgba(255,255,255,0.2)');
      vertical.addColorStop(0.5, 'rgba(255,255,255,1)');
      vertical.addColorStop(0.56, 'rgba(255,255,255,0.2)');
      vertical.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = vertical;
      ctx.fillRect(0, 0, width, height);
    } else if (type === 'scan') {
      const horizontal = ctx.createLinearGradient(0, 0, width, 0);
      horizontal.addColorStop(0, 'rgba(255,255,255,0)');
      horizontal.addColorStop(0.36, 'rgba(255,255,255,0)');
      horizontal.addColorStop(0.5, 'rgba(255,255,255,1)');
      horizontal.addColorStop(0.64, 'rgba(255,255,255,0)');
      horizontal.addColorStop(1, 'rgba(255,255,255,0)');
      vertical.addColorStop(0, 'rgba(255,255,255,0)');
      vertical.addColorStop(0.5, 'rgba(255,255,255,1)');
      vertical.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = horizontal;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = vertical;
      ctx.fillRect(0, 0, width, height);
    } else {
      vertical.addColorStop(0, 'rgba(255,255,255,0)');
      vertical.addColorStop(0.28, 'rgba(255,255,255,0.08)');
      vertical.addColorStop(0.5, 'rgba(255,255,255,0.78)');
      vertical.addColorStop(0.72, 'rgba(255,255,255,0.08)');
      vertical.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = vertical;
      ctx.fillRect(0, 0, width, height);
    }

    const texture = new THREE.CanvasTexture(laserCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createGlowMaterial(color) {
    return new THREE.SpriteMaterial({
      map: makeGlowTexture(color),
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  function createStarMaterial(color) {
    return new THREE.SpriteMaterial({
      map: makeStarTexture(color),
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  function createFlareMaterial(color) {
    return new THREE.SpriteMaterial({
      map: makeFlareTexture(color),
      transparent: true,
      opacity: 0.74,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  function makeLaserMaterial(color, type) {
    const colorObject = new THREE.Color(color).lerp(new THREE.Color(0xffffff), type === 'core' ? 0.28 : 0.08);
    const texture = laserTextures[type].clone();
    texture.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: colorObject,
      transparent: true,
      opacity: type === 'core' ? 0.92 : type === 'scan' ? 0.86 : 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  function createOrbitGuides() {
    const segments = 192;
    ringRadii.forEach((radius, lane) => {
      const points = [];
      for (let i = 0; i < segments; i += 1) {
        const theta = (i / segments) * Math.PI * 2 + lane * 0.28;
        points.push(
          Math.cos(theta) * radius,
          Math.sin(theta) * radius * 0.58,
          (lane - 1.5) * 1.35,
        );
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const guide = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({
        color: palette[lane % palette.length],
        transparent: true,
        opacity: 0.12 + lane * 0.015,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      orbitGroup.add(guide);
    });
  }

  function layoutPosition(index, count) {
    const lane = index % 4;
    const theta = (index / count) * Math.PI * 2 + lane * 0.28;
    const ring = ringRadii[lane];
    const x = Math.cos(theta) * ring + (seededRandom() - 0.5) * 3.2;
    const y = Math.sin(theta) * ring * 0.58 + (seededRandom() - 0.5) * 5.8;
    const z = (seededRandom() - 0.5) * 24;
    return new THREE.Vector3(x, y, z);
  }

  function rebuildNetwork() {
    seed += 97;
    [nodeGroup, linkGroup, laserGroup, glowGroup, flareGroup].forEach(clearGroup);
    nodes = [];
    linkPairs = [];
    const count = 28;
    selectedIndex = Math.min(selectedIndex, count - 1);

    for (let i = 0; i < count; i += 1) {
      const color = palette[i % palette.length];
      const position = layoutPosition(i, count);
      const star = new THREE.Sprite(createStarMaterial(color));
      star.position.copy(position);
      star.userData.index = i;
      star.userData.baseScale = 1.48 + seededRandom() * 0.46;
      star.scale.setScalar(star.userData.baseScale);
      nodeGroup.add(star);

      const glow = new THREE.Sprite(createGlowMaterial(color));
      glow.position.copy(position);
      glow.scale.setScalar(4.8 + seededRandom() * 2.2);
      glowGroup.add(glow);

      const flare = new THREE.Sprite(createFlareMaterial(color));
      flare.position.copy(position);
      flare.scale.set(3.2 + seededRandom() * 1.9, 0.6, 1);
      flare.material.rotation = seededRandom() * Math.PI;
      flare.userData.baseX = flare.scale.x;
      flare.userData.baseY = flare.scale.y;
      flare.userData.spin = (seededRandom() - 0.5) * 0.016;
      flareGroup.add(flare);

      nodes.push({
        mesh: star,
        glow,
        flare,
        name: `${starNames[i % starNames.length]}-${String(i + 1).padStart(2, '0')}`,
        color,
        orbit: seededRandom() * Math.PI * 2,
        phase: seededRandom() * Math.PI * 2,
        links: 0,
        position: position.clone(),
      });
    }

    createLinks();
  }

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.geometry?.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
      if (child.children?.length) {
        clearGroup(child);
      }
    }
  }

  function createLinks() {
    const linePositions = [];
    const lineColors = [];
    const colorA = new THREE.Color();
    const colorB = new THREE.Color();
    const linkSet = new Set();
    const neighborCount = 2;

    for (let i = 0; i < nodes.length; i += 1) {
      const nearest = nodes
        .map((node, index) => ({
          index,
          distance: index === i ? Infinity : nodes[i].mesh.position.distanceTo(node.mesh.position),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, neighborCount);
      nearest.forEach(({ index }) => addLink(i, index, linkSet, linePositions, lineColors, colorA, colorB));
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const next = (i + 1) % nodes.length;
      addLink(i, next, linkSet, linePositions, lineColors, colorA, colorB);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    }));
    lines.userData.kind = 'structure-lines';
    linkGroup.add(lines);
  }

  function addLink(aIndex, bIndex, linkSet, linePositions, lineColors, colorA, colorB) {
    if (aIndex === bIndex) return;
    const i = Math.min(aIndex, bIndex);
    const j = Math.max(aIndex, bIndex);
    const key = `${i}:${j}`;
    if (linkSet.has(key)) return;
    linkSet.add(key);

    const a = nodes[i].mesh.position;
    const b = nodes[j].mesh.position;
    linkPairs.push([i, j]);
    nodes[i].links += 1;
    nodes[j].links += 1;
    colorA.set(nodes[i].color);
    colorB.set(nodes[j].color);
    linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    lineColors.push(colorA.r, colorA.g, colorA.b, colorB.r, colorB.g, colorB.b);
    createLaserBeam(i, j, seededRandom());
  }

  function createLaserBeam(aIndex, bIndex, offset) {
    const colorA = new THREE.Color(nodes[aIndex].color);
    const colorB = new THREE.Color(nodes[bIndex].color);
    const beamColor = colorA.lerp(colorB, 0.44 + seededRandom() * 0.18);
    const group = new THREE.Group();
    const glow = createLaserPlane(makeLaserMaterial(beamColor, 'glow'));
    const core = createLaserPlane(makeLaserMaterial(beamColor, 'core'));
    const scan = createLaserPlane(makeLaserMaterial(beamColor, 'scan'));
    glow.userData.kind = 'glow';
    core.userData.kind = 'core';
    scan.userData.kind = 'scan';
    group.add(glow, core, scan);
    group.userData = {
      a: aIndex,
      b: bIndex,
      offset,
      width: 0.22 + seededRandom() * 0.16,
      scanSpeed: 0.68 + seededRandom() * 0.72,
      flicker: seededRandom() * Math.PI * 2,
    };
    laserGroup.add(group);
  }

  function createLaserPlane(material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    return new THREE.Mesh(geometry, material);
  }

  function updateLaserBeam(beam, elapsed, speed) {
    const a = nodes[beam.userData.a]?.mesh.position;
    const b = nodes[beam.userData.b]?.mesh.position;
    if (!a || !b) return;
    tempDir.subVectors(b, a);
    const distance = tempDir.length();
    if (distance < 0.001) return;
    tempDir.normalize();

    camera.getWorldDirection(cameraDirection);
    root.getWorldQuaternion(rootQuaternion);
    cameraDirectionLocal.copy(cameraDirection).applyQuaternion(rootQuaternion.invert());
    tempSide.crossVectors(tempDir, cameraDirectionLocal);
    if (tempSide.lengthSq() < 0.001) tempSide.set(1, 0, 0);
    tempSide.normalize();

    const phase = elapsed * beam.userData.scanSpeed * speed + beam.userData.offset;
    const flicker = 0.82 + Math.sin(elapsed * 15 + beam.userData.flicker) * 0.08;

    beam.children.forEach((plane) => {
      const kind = plane.userData.kind;
      let width;
      let inset = 0;

      if (kind === 'glow') {
        width = beam.userData.width * 2.1;
        plane.material.opacity = 0.18 * flicker;
        plane.material.map.offset.x = -phase * 0.08;
        plane.material.map.repeat.x = Math.max(1, distance / 6);
      } else if (kind === 'core') {
        width = Math.max(0.045, beam.userData.width * 0.17);
        plane.material.opacity = 0.76 + Math.sin(elapsed * 9 + beam.userData.flicker) * 0.08;
        plane.material.map.offset.x = phase * 0.18;
        plane.material.map.repeat.x = Math.max(1, distance / 4);
      } else {
        width = beam.userData.width * 1.25;
        inset = Math.min(distance * 0.02, 0.18);
        plane.material.opacity = 0.34 + Math.sin(elapsed * 11 + beam.userData.flicker) * 0.14;
        plane.material.map.offset.x = phase * 0.4;
        plane.material.map.repeat.x = Math.max(1, distance / 3.5);
      }

      setBeamPlaneVertices(plane, a, b, width, inset);
    });
  }

  function setBeamPlaneVertices(plane, a, b, width, inset) {
    tempA.copy(a).addScaledVector(tempDir, inset);
    tempB.copy(b).addScaledVector(tempDir, -inset);
    const halfWidth = width * 0.5;
    const positions = plane.geometry.attributes.position.array;
    positions[0] = tempA.x + tempSide.x * halfWidth;
    positions[1] = tempA.y + tempSide.y * halfWidth;
    positions[2] = tempA.z + tempSide.z * halfWidth;
    positions[3] = tempB.x + tempSide.x * halfWidth;
    positions[4] = tempB.y + tempSide.y * halfWidth;
    positions[5] = tempB.z + tempSide.z * halfWidth;
    positions[6] = tempA.x - tempSide.x * halfWidth;
    positions[7] = tempA.y - tempSide.y * halfWidth;
    positions[8] = tempA.z - tempSide.z * halfWidth;
    positions[9] = tempB.x - tempSide.x * halfWidth;
    positions[10] = tempB.y - tempSide.y * halfWidth;
    positions[11] = tempB.z - tempSide.z * halfWidth;
    plane.geometry.attributes.position.needsUpdate = true;
  }

  function updateStructureLines() {
    const lines = linkGroup.children.find((child) => child.userData.kind === 'structure-lines');
    if (!lines) return;
    const positions = lines.geometry.attributes.position.array;
    linkPairs.forEach(([aIndex, bIndex], index) => {
      const a = nodes[aIndex]?.mesh.position;
      const b = nodes[bIndex]?.mesh.position;
      if (!a || !b) return;
      const offset = index * 6;
      positions[offset] = a.x;
      positions[offset + 1] = a.y;
      positions[offset + 2] = a.z;
      positions[offset + 3] = b.x;
      positions[offset + 4] = b.y;
      positions[offset + 5] = b.z;
    });
    lines.geometry.attributes.position.needsUpdate = true;
  }

  function onResize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    camera.aspect = width / height;
    camera.position.z = width < 520 ? 52 : 46;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerTarget.x = pointer.x;
    pointerTarget.y = pointer.y;
  }

  function onPointerLeave() {
    hoveredIndex = -1;
    pointer.set(-10, -10);
  }

  function animate() {
    const authShell = document.querySelector('#authShell');
    if (authShell?.hidden) {
      frameId = requestAnimationFrame(animate);
      return;
    }

    const elapsed = clock.getElapsedTime();
    const speed = 0.88;
    const selected = nodes[selectedIndex];
    root.rotation.y += 0.00145 * speed;
    root.rotation.x += (pointerTarget.y * 0.12 - root.rotation.x) * 0.012;
    root.rotation.z += (pointerTarget.x * -0.06 - root.rotation.z) * 0.012;
    starfield.rotation.y -= 0.00042 * speed;
    starfield.rotation.x = Math.sin(elapsed * 0.13) * 0.035;

    nodes.forEach((node, index) => {
      const isActive = index === selectedIndex || index === hoveredIndex;
      const beat = Math.sin(elapsed * (2.4 + speed) + node.phase) * 0.5 + 0.5;
      const sparkle = Math.pow(Math.sin(elapsed * (5.6 + index * 0.07) + node.phase) * 0.5 + 0.5, 3);
      const orbitStrength = 0.012;
      node.mesh.position.x = node.position.x + Math.cos(elapsed * orbitStrength * (index + 2) + node.orbit) * 0.34;
      node.mesh.position.y = node.position.y + Math.sin(elapsed * orbitStrength * (index + 3) + node.orbit) * 0.26;
      node.glow.position.copy(node.mesh.position);
      node.flare.position.copy(node.mesh.position);
      node.mesh.scale.setScalar(node.mesh.userData.baseScale * (isActive ? 1.7 : 1 + beat * 0.18 + sparkle * 0.24));
      node.glow.material.opacity = isActive ? 0.82 : 0.32 + beat * 0.18;
      node.mesh.material.opacity = isActive ? 1 : 0.68 + sparkle * 0.24;
      node.flare.material.opacity = isActive ? 0.8 : 0.16 + sparkle * 0.42;
      node.flare.material.rotation += node.flare.userData.spin * speed;
      node.flare.scale.x = node.flare.userData.baseX * (isActive ? 1.22 : 0.82 + sparkle * 0.4);
      node.flare.scale.y = node.flare.userData.baseY * (isActive ? 1.3 : 0.72 + beat * 0.32);
    });

    updateStructureLines();
    laserGroup.children.forEach((beam) => updateLaserBeam(beam, elapsed, speed));
    if (selected) {
      keyLight.position.lerp(selected.mesh.position.clone().add(new THREE.Vector3(-8, 7, 16)), 0.025);
    }
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeGroup.children, false);
    hoveredIndex = hits.length ? hits[0].object.userData.index : -1;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  rebuildNetwork();
  onResize();
  animate();

  window.addEventListener('resize', onResize);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!frameId) {
      animate();
    }
  });
  } catch (error) {
    canvas.hidden = true;
  }
} else if (canvas) {
  canvas.hidden = true;
}
