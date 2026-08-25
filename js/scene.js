import * as THREE from 'https://esm.sh/three@0.179.1';
import { OrbitControls } from 'https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js';
import { EARTH_RADIUS_KM, perifocalToInertial } from './orbit.js';

export { THREE };

export function createSpaceScene(container, options = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camera.position.set(2.6, -3.2, 2.2);
  camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.screenSpacePanning = true;
  controls.minDistance = 1.25;
  controls.maxDistance = 30;

  scene.add(new THREE.HemisphereLight(0xbcecff, 0x102027, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.7);
  sun.position.set(-4, -3, 5);
  scene.add(sun);

  const earthGroup = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 36),
    new THREE.MeshStandardMaterial({ color: 0x173d4c, roughness: .72, metalness: .05 })
  );
  // Three.js spheres use +Y as their polar axis; orbital coordinates use +Z.
  earth.rotation.x = Math.PI / 2;
  earthGroup.add(earth);
  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(1.006, 36, 18),
    new THREE.MeshBasicMaterial({ color: 0x4b8a98, wireframe: true, transparent: true, opacity: .24 })
  );
  wire.rotation.x = Math.PI / 2;
  earthGroup.add(wire);
  const primeMeridian = makeLine(Array.from({ length: 121 }, (_, k) => {
    const latitude = -Math.PI / 2 + Math.PI * k / 120;
    return [1.012 * Math.cos(latitude), 0, 1.012 * Math.sin(latitude)];
  }), 0xffb14e, .9);
  earthGroup.add(primeMeridian);
  if (options.earth !== false) scene.add(earthGroup);
  const equator = makeLine(circlePoints(1.025, 160), 0x54d6dd, .35);
  if (options.earth !== false) scene.add(equator);
  if (options.earth !== false && options.equatorialPlane !== false) {
    const plane = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 96),
      new THREE.MeshBasicMaterial({ color: 0x54d6dd, transparent: true, opacity: .055, side: THREE.DoubleSide, depthWrite: false })
    );
    scene.add(plane);
    for (const radius of [1.2, 1.42, 1.65]) scene.add(makeLine(circlePoints(radius, 160), 0x54d6dd, .14));
    const spokes = [];
    for (let k = 0; k < 12; k += 1) {
      const angle = k * Math.PI / 6;
      spokes.push(new THREE.Vector3(1.04*Math.cos(angle),1.04*Math.sin(angle),0),new THREE.Vector3(1.65*Math.cos(angle),1.65*Math.sin(angle),0));
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spokes),new THREE.LineBasicMaterial({color:0x54d6dd,transparent:true,opacity:.13})));
  }
  const axis = makeLine([[0,0,-1.38],[0,0,1.38]], 0xffffff, .68);
  const northArrow = new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,0),1.48,0xffffff,.14,.075);
  if (options.axis !== false) scene.add(axis,northArrow);

  const starsGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let k = 0; k < 420; k += 1) {
    const r = 9 + (k % 11) * .27;
    const u = pseudo(k * 17 + 3) * 2 - 1;
    const phi = pseudo(k * 31 + 9) * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    positions.push(r * q * Math.cos(phi), r * q * Math.sin(phi), r * u);
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x8ba5ad, size: .015, transparent: true, opacity: .65 })));

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let earthRotationScale = options.earthRotationScale ?? 0;
  let previousRenderTime = performance.now();

  return {
    scene, camera, renderer, controls, earthGroup, earthScale: 1 / EARTH_RADIUS_KM,
    setEarthRotationScale(value) { earthRotationScale = Math.max(0, value); },
    render() {
      const now = performance.now(), elapsed = Math.min(.1, (now - previousRenderTime) / 1000);
      previousRenderTime = now;
      earthGroup.rotation.z += elapsed * (Math.PI * 2 / 86164.1) * earthRotationScale;
      controls.update(); renderer.render(scene, camera);
    },
    dispose() { observer.disconnect(); renderer.dispose(); }
  };
}

function pseudo(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function circlePoints(radius, count) { return Array.from({ length: count + 1 }, (_, k) => [radius * Math.cos(k / count * Math.PI * 2), radius * Math.sin(k / count * Math.PI * 2), 0]); }

export function scaled(points, scale = 1 / EARTH_RADIUS_KM) { return points.map(p => p.map(v => v * scale)); }

export function makeLine(points, color = 0xffb14e, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: opacity < 1, opacity, dashSize: .055, gapSize: .035 })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

export function replaceLine(line, points) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  if (line.material.isLineDashedMaterial) line.computeLineDistances();
}

export function makeDot(color = 0xffb14e, radius = .035) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), new THREE.MeshBasicMaterial({ color }));
}

export function makePoint(color = 0xffffff, size = .09) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, sizeAttenuation: true }));
}

export function setPosition(object, point, scale = 1 / EARTH_RADIUS_KM) { object.position.set(point[0] * scale, point[1] * scale, point[2] * scale); }

export function planeVector(lengthKm, angle, elements) {
  return perifocalToInertial([lengthKm * Math.cos(angle), lengthKm * Math.sin(angle), 0], elements.i, elements.raan, elements.argp);
}

export function attachLabel(container, camera, object, text, className = '') {
  const element = document.createElement('span');
  element.className = `label ${className}`;
  element.textContent = text;
  container.append(element);
  const projected = new THREE.Vector3();
  return {
    element,
    setText(value) { element.textContent = value; },
    update() {
      object.getWorldPosition(projected);
      projected.project(camera);
      const visible = projected.z > -1 && projected.z < 1;
      element.hidden = !visible;
      element.style.left = `${(projected.x * .5 + .5) * container.clientWidth}px`;
      element.style.top = `${(-projected.y * .5 + .5) * container.clientHeight}px`;
    }
  };
}

export function sliderBindings(root, onInput) {
  const inputs = [...root.querySelectorAll('input[type="range"]')];
  const refresh = () => {
    inputs.forEach(input => {
      const output = root.querySelector(`[data-output="${input.id}"]`);
      if (output) output.textContent = formatInput(input);
    });
    onInput(Object.fromEntries(inputs.map(input => [input.id, Number(input.value)])));
  };
  inputs.forEach(input => input.addEventListener('input', refresh));
  refresh();
  return refresh;
}

function formatInput(input) {
  const value = Number(input.value);
  if (input.dataset.format === 'exp') return `10^${value.toFixed(1)}`;
  const digits = input.step && input.step.includes('.') ? input.step.split('.')[1].length : 0;
  return `${value.toFixed(Math.min(digits, 3))}${input.dataset.unit ? ` ${input.dataset.unit}` : ''}`;
}
