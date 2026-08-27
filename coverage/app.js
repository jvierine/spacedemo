import {
  bestGroundTrackRepeat,
  constellationAccess,
  constellationMember,
  earthFixedDirection,
  earthSurfaceFraction,
  nextAccessEvent,
  propagatedOrbitPosition,
  rotateZ,
  sphericalCapAreaKm2,
  stationUnitVector,
  unitVector,
  visibilityCentralAngle
} from '../js/coverage.js';
import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  EARTH_SIDEREAL_DAY_SECONDS,
  TAU,
  degrees,
  periodSeconds,
  radians,
  sampleOrbit,
  sunSynchronousInclination
} from '../js/orbit.js';
import { THREE, attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, sliderBindings } from '../js/scene.js';

const stations={
  tromso:{name:'Tromsø',latitude:69.65,longitude:18.96},
  svalbard:{name:'Svalbard',latitude:78.23,longitude:15.41},
  quito:{name:'Quito',latitude:-.18,longitude:-78.47},
  kennedy:{name:'Kennedy',latitude:28.57,longitude:-80.65},
  canberra:{name:'Canberra',latitude:-35.28,longitude:149.13},
  tokyo:{name:'Tokyo',latitude:35.68,longitude:139.76}
};
const siderealGeoAltitude=Math.cbrt(EARTH_MU_KM3_S2*(EARTH_SIDEREAL_DAY_SECONDS/TAU)**2)-EARTH_RADIUS_KM;
const navigationAltitude=Math.cbrt(EARTH_MU_KM3_S2*(EARTH_SIDEREAL_DAY_SECONDS/(2*TAU))**2)-EARTH_RADIUS_KM;
const gtoPerigee=EARTH_RADIUS_KM+200,gtoApogee=EARTH_RADIUS_KM+siderealGeoAltitude;
const presets={
  polar:{name:'Polar LEO',altitude:550,eccentricity:0,inclination:90,argp:0,planeCount:1,satelliteCount:3},
  sso:{name:'Sun-synchronous LEO',altitude:600,eccentricity:0,inclination:degrees(sunSynchronousInclination(EARTH_RADIUS_KM+600)),argp:0,planeCount:1,satelliteCount:3,useJ2:true},
  leo:{name:'Arbitrary LEO',altitude:500,eccentricity:0,inclination:45,argp:0,planeCount:1,satelliteCount:3},
  vleo:{name:'VLEO',altitude:250,eccentricity:0,inclination:51.6,argp:0,planeCount:1,satelliteCount:3},
  meo:{name:'Navigation MEO',altitude:navigationAltitude,eccentricity:0,inclination:55,argp:0,planeCount:3,satelliteCount:2},
  molniya:{name:'Molniya',altitude:20200,eccentricity:.74,inclination:63.4,argp:270,planeCount:3,satelliteCount:1,useJ2:true},
  geo:{name:'Geostationary orbit',altitude:siderealGeoAltitude,eccentricity:0,inclination:0,argp:0,planeCount:1,satelliteCount:3},
  gto:{name:'Geostationary transfer orbit',altitude:(gtoPerigee+gtoApogee)/2-EARTH_RADIUS_KM,eccentricity:(gtoApogee-gtoPerigee)/(gtoApogee+gtoPerigee),inclination:28.5,argp:0,planeCount:1,satelliteCount:1}
};

const controls=document.querySelector('#controls'),viewport=document.querySelector('#viewport');
const orbitPreset=document.querySelector('#orbitPreset'),groundStation=document.querySelector('#groundStation');
const view=createSpaceScene(viewport,{equatorialPlane:false});
view.camera.position.set(3.2,-4.1,2.7);view.controls.target.set(0,0,0);
const orbitLines=Array.from({length:6},(_,index)=>makeLine([],0xffb14e,index===0?.8:.35)),groundTrack=makeLine([],0x8bd99d,.9),contactLines=Array.from({length:36},()=>makeLine([],0x8bd99d,.95));
view.scene.add(...orbitLines,groundTrack,...contactLines);
const stationDot=makeDot(0xff766d,.038);view.scene.add(stationDot);
const stationLabel=attachLabel(viewport,view.camera,stationDot,'Tromsø ground station','red',[15,-15]);
const satelliteDots=[],satelliteLabels=[],footprints=[];
for(let index=0;index<36;index+=1){
  const dot=makeDot(index===0?0xffffff:0xffb14e,index===0?.052:.035);view.scene.add(dot);satelliteDots.push(dot);
  satelliteLabels.push(index===0?attachLabel(viewport,view.camera,dot,'satellite 1','',[15,-15]):null);
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0x54d6dd,transparent:true,opacity:index===0?.16:.045,side:THREE.DoubleSide,depthWrite:false}));
  mesh.renderOrder=2;view.scene.add(mesh);footprints.push(mesh);
}

let current=null,simulationTime=0,playing=true,lastFrame=performance.now(),applyingPreset=false,applyingStation=false;
let repeatResult=null,nextEvent=null,lastEventWall=0,groundTrackFrame=0;

function setInput(id,value){document.querySelector(`#${id}`).value=String(value)}
function setPreset(name,fit=true){
  const preset=presets[name];if(!preset)return;
  applyingPreset=true;
  for(const key of ['altitude','eccentricity','inclination','argp','planeCount','satelliteCount'])setInput(key,preset[key]);
  applyingPreset=false;refresh();if(fit)fitOrbit();
}
function selectStation(name){
  const station=stations[name];if(!station)return;
  applyingStation=true;setInput('stationLatitude',station.latitude);setInput('stationLongitude',station.longitude);applyingStation=false;refresh();
}
function currentStation(values){
  const selected=stations[groundStation.value];
  return {name:selected?.name??'Custom',latitude:radians(values.stationLatitude),longitude:radians(values.stationLongitude)};
}
function buildState(values){
  const preset=presets[orbitPreset.value];
  return {
    values,
    elements:{a:EARTH_RADIUS_KM+values.altitude,e:values.eccentricity,i:radians(values.inclination),raan:radians(18),argp:radians(values.argp),meanAnomaly:0},
    satellitesPerPlane:Math.round(values.satelliteCount),planeCount:Math.round(values.planeCount),station:currentStation(values),minimumElevation:radians(values.minimumElevation),useJ2:Boolean(preset?.useJ2)
  };
}
function updateConfiguration(values){
  current=buildState(values);
  const count=current.satellitesPerPlane*current.planeCount;
  orbitLines.forEach((line,index)=>{line.visible=index<current.planeCount;if(line.visible)replaceLine(line,scaled(sampleOrbit({...current.elements,raan:current.elements.raan+TAU*index/current.planeCount},360)))});
  satelliteDots.forEach((dot,index)=>{const active=index<count;dot.visible=active;footprints[index].visible=active});
  repeatResult=bestGroundTrackRepeat(current.elements,{useJ2:current.useJ2,maximumDays:30});
  nextEvent=null;lastEventWall=0;updateOrbitDescription();updateGroundTrack();renderDynamic(performance.now());
}
const refresh=sliderBindings(controls,updateConfiguration);

document.querySelectorAll('[data-orbit]').forEach(input=>input.addEventListener('input',()=>{if(!applyingPreset){orbitPreset.value='leo';refresh()}}));
document.querySelectorAll('[data-station]').forEach(input=>input.addEventListener('input',()=>{if(!applyingStation){groundStation.value='custom';refresh()}}));
orbitPreset.addEventListener('change',()=>setPreset(orbitPreset.value));
groundStation.addEventListener('change',()=>selectStation(groundStation.value));
document.querySelector('#play').addEventListener('click',event=>{playing=!playing;event.currentTarget.textContent=playing?'Pause':'Play';event.currentTarget.classList.toggle('accent',playing)});
document.querySelector('#reset').addEventListener('click',()=>{simulationTime=0;nextEvent=null;renderDynamic(performance.now())});

function updateOrbitDescription(){
  const geometry=current.elements,perigee=geometry.a*(1-geometry.e)-EARTH_RADIUS_KM,apogee=geometry.a*(1+geometry.e)-EARTH_RADIUS_KM;
  const name=presets[orbitPreset.value]?.name??'Custom orbit';
  document.querySelector('#orbitDescription').textContent=`${name} · perigee ${perigee.toFixed(0)} km · apogee ${apogee.toFixed(0)} km · ${current.planeCount} plane${current.planeCount===1?'':'s'}${current.useJ2?' · secular J₂ included':''}`;
  document.querySelector('#warning').textContent=perigee<120?'Perigee is below a sustainable orbit; atmospheric drag is not modeled here.':'';
}
function fitOrbit(){
  const radius=current.elements.a*(1+current.elements.e)/EARTH_RADIUS_KM,distance=Math.max(3.5,radius*2.05);
  view.camera.position.set(distance*.62,-distance*.78,distance*.5);view.controls.target.set(0,0,0);view.controls.update();
}
function capGeometry(direction,angle){
  const center=unitVector(direction),reference=Math.abs(center[2])<.9?[0,0,1]:[1,0,0];
  const u=unitVector([reference[1]*center[2]-reference[2]*center[1],reference[2]*center[0]-reference[0]*center[2],reference[0]*center[1]-reference[1]*center[0]]);
  const v=[center[1]*u[2]-center[2]*u[1],center[2]*u[0]-center[0]*u[2],center[0]*u[1]-center[1]*u[0]],positions=[],rings=8,segments=48,radius=1.009;
  const point=(theta,phi)=>center.map((value,index)=>radius*(value*Math.cos(theta)+(u[index]*Math.cos(phi)+v[index]*Math.sin(phi))*Math.sin(theta)));
  for(let ring=0;ring<rings;ring+=1){const t0=angle*ring/rings,t1=angle*(ring+1)/rings;for(let segment=0;segment<segments;segment+=1){const p0=TAU*segment/segments,p1=TAU*(segment+1)/segments,a=point(t0,p0),b=point(t1,p0),c=point(t1,p1),d=point(t0,p1);positions.push(...a,...b,...c,...a,...c,...d)}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
}
function updateFootprint(mesh,position){
  const angle=visibilityCentralAngle(Math.hypot(...position),current.minimumElevation),geometry=capGeometry(position,angle);mesh.geometry.dispose();mesh.geometry=geometry;
}
function updateGroundTrack(){
  if(!current)return;
  const period=periodSeconds(current.elements.a),earthAngle=TAU*simulationTime/EARTH_SIDEREAL_DAY_SECONDS,points=[];
  for(let index=0;index<=240;index+=1){const time=simulationTime+period*index/240,position=propagatedOrbitPosition(current.elements,time,0,current.useJ2),fixed=earthFixedDirection(position,time),display=rotateZ(fixed,earthAngle);points.push(display.map(value=>value*1.014))}
  replaceLine(groundTrack,points);
}
function formatDuration(seconds){if(seconds<60)return`${seconds.toFixed(0)} s`;if(seconds<3600)return`${(seconds/60).toFixed(1)} min`;if(seconds<86400)return`${(seconds/3600).toFixed(1)} h`;return`${(seconds/86400).toFixed(2)} d`}
function formatEpoch(seconds){const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);return`${days} d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`}
function longitudeShiftPerOrbit(){
  const period=periodSeconds(current.elements.a),start=earthFixedDirection(propagatedOrbitPosition(current.elements,0,0,current.useJ2),0),end=earthFixedDirection(propagatedOrbitPosition(current.elements,period,0,current.useJ2),period);
  let shift=degrees(Math.atan2(end[1],end[0])-Math.atan2(start[1],start[0]));shift=((shift+540)%360)-180;return shift;
}
function renderDynamic(now){
  if(!current)return;
  const earthAngle=TAU*simulationTime/EARTH_SIDEREAL_DAY_SECONDS;view.setEarthRotationAngle(earthAngle);
  const positions=[];
  const satelliteCount=current.satellitesPerPlane*current.planeCount;
  for(let index=0;index<satelliteCount;index+=1){const member=constellationMember(current.elements,index,current.satellitesPerPlane,current.planeCount),position=propagatedOrbitPosition(member.elements,simulationTime,member.phase,current.useJ2);positions.push(position);satelliteDots[index].position.set(...position.map(value=>value/EARTH_RADIUS_KM));updateFootprint(footprints[index],position)}
  const stationDirection=stationUnitVector(current.station.latitude,current.station.longitude,earthAngle);stationDot.position.set(...stationDirection.map(value=>value*1.035));stationLabel.setText(`${current.station.name} ground station`);
  const access=constellationAccess(current.elements,current.satellitesPerPlane,current.planeCount,simulationTime,current.station,current.minimumElevation,current.useJ2);
  stationDot.material.color.setHex(access.visible?0x8bd99d:0xff766d);
  const visibleByIndex=new Map(access.visibleSatellites.map(satellite=>[satellite.index,satellite.position]));
  contactLines.forEach((line,index)=>{const position=visibleByIndex.get(index);replaceLine(line,position?[stationDirection.map(value=>value*1.035),position.map(value=>value/EARTH_RADIUS_KM)]:[])});
  const firstRadius=Math.hypot(...positions[0]),footprintAngle=visibilityCentralAngle(firstRadius,current.minimumElevation),area=sphericalCapAreaKm2(footprintAngle),fraction=earthSurfaceFraction(footprintAngle);
  if(!nextEvent||now-lastEventWall>1000){nextEvent=nextAccessEvent(current.elements,current.satellitesPerPlane,current.planeCount,simulationTime,current.station,current.minimumElevation,current.useJ2);lastEventWall=now}
  document.querySelector('#epoch').textContent=formatEpoch(simulationTime);
  const period=periodSeconds(current.elements.a);document.querySelector('#period').textContent=period<7200?`${(period/60).toFixed(1)} min`:`${(period/3600).toFixed(2)} h`;
  document.querySelector('#totalSatellites').textContent=String(satelliteCount);
  document.querySelector('#currentAltitude').textContent=`${(firstRadius-EARTH_RADIUS_KM).toFixed(0)} km`;
  document.querySelector('#footprint').textContent=`${(area/1e6).toFixed(2)} M km² · ${(fraction*100).toFixed(1)}%`;
  const accessElement=document.querySelector('#access');accessElement.textContent=access.visible?`Visible · sat ${access.index+1}`:'No contact';accessElement.className=access.visible?'status-good':'status-bad';
  document.querySelector('#elevation').textContent=`${degrees(access.elevation).toFixed(1)}°`;
  document.querySelector('#nextAccess').textContent=nextEvent?`${nextEvent.type} in ${formatDuration(nextEvent.inSeconds)}`:'No event ≤ 7 d';
  document.querySelector('#repeat').textContent=`${repeatResult.orbits} orbits / ${repeatResult.siderealDays.toFixed(3)} d · ${repeatResult.errorKm.toFixed(repeatResult.errorKm<10?1:0)} km`;
  const shift=longitudeShiftPerOrbit();document.querySelector('#shift').textContent=`${Math.abs(shift).toFixed(2)}° ${shift<0?'west':'east'}`;
}

function animate(now){
  requestAnimationFrame(animate);const wall=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;if(playing&&current)simulationTime+=wall*current.values.timeScale;
  if(++groundTrackFrame%8===0)updateGroundTrack();renderDynamic(now);stationLabel.update();satelliteLabels[0].update();view.render();
}
setPreset('sso',true);requestAnimationFrame(animate);
