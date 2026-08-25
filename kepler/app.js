import { EARTH_RADIUS_KM, ellipseGeometry, periodSeconds, positionAtTrue, radians, sampleOrbit, trueFromMean } from '../js/orbit.js';
import { attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, setPosition, sliderBindings } from '../js/scene.js';

const viewport = document.querySelector('#viewport');
const view = createSpaceScene(viewport);
const orbit = makeLine([], 0xffb14e, 1); view.scene.add(orbit);
const major = makeLine([], 0x8bd99d, .75, true); view.scene.add(major);
const minor = makeLine([], 0x8bd99d, .45, true); view.scene.add(minor);
const nodes = makeLine([], 0x54d6dd, .7, true); view.scene.add(nodes);
const inclinationArc = makeLine([],0x54d6dd,1);view.scene.add(inclinationArc);
const craft = makeDot(0xffffff, .075); view.scene.add(craft);
const peri = makeDot(0xff766d, .026); view.scene.add(peri);
const apo = makeDot(0x54d6dd, .026); view.scene.add(apo);
const centre = makeDot(0x8bd99d, .018); view.scene.add(centre);
const aAnchor = makeDot(0x8bd99d, .001), bAnchor = makeDot(0x8bd99d, .001); view.scene.add(aAnchor, bAnchor);
const northPole = makeDot(0xffffff, .022); northPole.position.set(0,0,1.055); view.scene.add(northPole);
const axisAnchor=makeDot(0xffffff,.001);axisAnchor.position.set(0,0,1.46);view.scene.add(axisAnchor);
const inclinationAnchor=makeDot(0x54d6dd,.012);view.scene.add(inclinationAnchor);
const inclinationLabel=attachLabel(viewport,view.camera,inclinationAnchor,'inclination i','cyan',[16,-14]);
const labels = [inclinationLabel, attachLabel(viewport, view.camera, craft, 'spacecraft ball','',[16,-16]), attachLabel(viewport, view.camera, peri, 'periapsis', 'red',[14,14]), attachLabel(viewport, view.camera, apo, 'apoapsis', 'cyan',[-14,14]), attachLabel(viewport, view.camera, centre, 'focus offset ae', 'green',[16,-14]), attachLabel(viewport, view.camera, aAnchor, 'semi-major axis a', 'green',[14,-14]), attachLabel(viewport, view.camera, bAnchor, 'semi-minor axis b', 'green',[14,-14]),attachLabel(viewport,view.camera,northPole,'N · North pole','',[12,-14]),attachLabel(viewport,view.camera,axisAnchor,'Earth rotation axis · +Z','',[18,-12])];
let angleEquationVersion=0;

function updateAngleEquation(v) {
  const element=document.querySelector('#angleEquation'),version=++angleEquationVersion;
  element.textContent=`\\[\\begin{aligned}i&=${v.inclination.toFixed(0)}^\\circ & \\Omega&=${v.raan.toFixed(0)}^\\circ\\\\\\omega&=${v.argp.toFixed(0)}^\\circ & M&=${v.anomaly.toFixed(0)}^\\circ\\end{aligned}\\]`;
  const typeset=()=>{if(version!==angleEquationVersion)return;if(window.MathJax?.typesetPromise){window.MathJax.typesetClear?.([element]);window.MathJax.typesetPromise([element]).catch(()=>{});}else setTimeout(typeset,100)};typeset();
}

function update(v) {
  updateAngleEquation(v);
  view.setEarthRotationScale(v.earthRotation);
  const elements = { a: EARTH_RADIUS_KM + v.altitude, e: v.eccentricity, i: radians(v.inclination), raan: radians(v.raan), argp: radians(v.argp) };
  const geometry = ellipseGeometry(elements.a, elements.e);
  const nu = trueFromMean(radians(v.anomaly), elements.e);
  replaceLine(orbit, scaled(sampleOrbit(elements)));
  setPosition(craft, positionAtTrue(elements, nu)); setPosition(peri, positionAtTrue(elements, 0)); setPosition(apo, positionAtTrue(elements, Math.PI));
  const centreP = positionAtTrue({ ...elements, a: elements.a * elements.e, e: 0 }, Math.PI);
  setPosition(centre, centreP);
  replaceLine(major, scaled([positionAtTrue(elements, 0), positionAtTrue(elements, Math.PI)]));
  const b = geometry.b;
  const toWorld = p => {
    const c = Math.cos(elements.argp), s = Math.sin(elements.argp), ci = Math.cos(elements.i), si = Math.sin(elements.i), co = Math.cos(elements.raan), so = Math.sin(elements.raan);
    const x1 = c*p[0]-s*p[1], y1=s*p[0]+c*p[1]; return [co*x1-so*ci*y1, so*x1+co*ci*y1, si*y1];
  };
  const centreVec = centreP;
  const m1 = toWorld([0,b,0]).map((x,k)=>x+centreVec[k]), m2 = toWorld([0,-b,0]).map((x,k)=>x+centreVec[k]);
  setPosition(aAnchor, positionAtTrue({ ...elements, a: elements.a / 2, e: 0 }, 0).map((x,k)=>x+centreVec[k]));
  setPosition(bAnchor, m1.map((x,k)=>(x+centreVec[k])/2));
  replaceLine(minor, scaled([m1,m2]));
  const nodeLength = elements.a * 1.2;
  replaceLine(nodes, [[-nodeLength/EARTH_RADIUS_KM*Math.cos(elements.raan),-nodeLength/EARTH_RADIUS_KM*Math.sin(elements.raan),0],[nodeLength/EARTH_RADIUS_KM*Math.cos(elements.raan),nodeLength/EARTH_RADIUS_KM*Math.sin(elements.raan),0]]);
  const arcRadius=1.38,node=[Math.cos(elements.raan),Math.sin(elements.raan),0],equatorialNormal=[-Math.sin(elements.raan),Math.cos(elements.raan),0];
  const arcPoints=Array.from({length:41},(_,k)=>{const angle=elements.i*k/40,c=Math.cos(angle),s=Math.sin(angle),cross=[node[1]*equatorialNormal[2]-node[2]*equatorialNormal[1],node[2]*equatorialNormal[0]-node[0]*equatorialNormal[2],node[0]*equatorialNormal[1]-node[1]*equatorialNormal[0]];return equatorialNormal.map((value,j)=>arcRadius*(value*c+cross[j]*s+node[j]*(node[0]*equatorialNormal[0]+node[1]*equatorialNormal[1])* (1-c)))});
  replaceLine(inclinationArc,arcPoints);inclinationAnchor.position.set(...arcPoints[Math.floor(arcPoints.length/2)]);inclinationLabel.setText(`inclination i = ${v.inclination.toFixed(0)}°`);
  document.querySelector('#period').textContent = `${(periodSeconds(elements.a)/60).toFixed(1)} min`;
  document.querySelector('#minor').textContent = `${geometry.b.toFixed(0)} km`;
  document.querySelector('#perigee').textContent = `${(geometry.rp-EARTH_RADIUS_KM).toFixed(0)} km`;
  document.querySelector('#apogee').textContent = `${(geometry.ra-EARTH_RADIUS_KM).toFixed(0)} km`;
  document.querySelector('#warning').textContent = geometry.rp < EARTH_RADIUS_KM ? 'The selected ellipse intersects Earth.' : '';
}
sliderBindings(document.querySelector('#controls'), update);
function animate(){ requestAnimationFrame(animate); labels.forEach(l=>l.update()); view.render(); } animate();
