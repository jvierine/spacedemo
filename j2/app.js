import { DAY_SECONDS, EARTH_J2, EARTH_OBLIQUITY_DEG, EARTH_RADIUS_KM, degrees, eclipticDirection, hasWellDefinedPeriapsis, j2Rates, periodSeconds, positionAtTrue, radians, sampleOrbit, sunSynchronousInclination } from '../js/orbit.js?v=20260825-9';
import { attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, setPosition, sliderBindings } from '../js/scene.js?v=20260825-7';
const controls=document.querySelector('#controls'),viewport=document.querySelector('#viewport'),j2Toggle=document.querySelector('#enableJ2'),view=createSpaceScene(viewport);
view.setEarthRotationScale(12000);
const ghost=makeLine([],0x90a1a8,.45,true),orbit=makeLine([],0x8bd99d,1),apsePeri=makeLine([],0xffb14e,.9),apseApo=makeLine([],0xffb14e,.9),nodes=makeLine([],0x54d6dd,.8);view.scene.add(ghost,orbit,apsePeri,apseApo,nodes);
const ascending=makeDot(0x54d6dd,.03),peri=makeDot(0xffb14e,.032);view.scene.add(ascending,peri);
const northPole=makeDot(0xffffff,.022);northPole.position.set(0,0,1.055);view.scene.add(northPole);
const sunLine=makeLine([],0xffe09a,.9),sunDot=makeDot(0xffe09a,.055);view.scene.add(sunLine,sunDot);
const axisAnchor=makeDot(0xffffff,.001);axisAnchor.position.set(0,0,1.46);view.scene.add(axisAnchor);
const equatorAnchor=makeDot(0x54d6dd,.001);equatorAnchor.position.set(1.62,0,0);view.scene.add(equatorAnchor);
const eclipticRadius=1.9,eclipticCircle=makeLine(Array.from({length:181},(_,index)=>eclipticDirection(index*Math.PI*2/180).map(value=>value*eclipticRadius)),0xffe09a,.34);view.scene.add(eclipticCircle);
const eclipticAnchor=makeDot(0xffe09a,.001);eclipticAnchor.position.set(...eclipticDirection(Math.PI/2).map(value=>value*eclipticRadius));view.scene.add(eclipticAnchor);
const obliquity=radians(EARTH_OBLIQUITY_DEG),tiltArc=makeLine(Array.from({length:31},(_,index)=>{const angle=obliquity*index/30;return[0,-1.28*Math.sin(angle),1.28*Math.cos(angle)]}),0xffe09a,.85),tiltAnchor=makeDot(0xffe09a,.001);tiltAnchor.position.set(0,-1.36*Math.sin(obliquity/2),1.36*Math.cos(obliquity/2));view.scene.add(tiltArc,tiltAnchor);
const periLabel=attachLabel(viewport,view.camera,peri,'periapsis ω','orange');
const labels=[attachLabel(viewport,view.camera,ascending,'ascending node Ω','cyan'),periLabel,attachLabel(viewport,view.camera,sunDot,'Sun direction · ecliptic','orange'),attachLabel(viewport,view.camera,northPole,'N · North pole'),attachLabel(viewport,view.camera,axisAnchor,'Earth rotation axis · +Z'),attachLabel(viewport,view.camera,equatorAnchor,'Earth rotation equator','cyan',[-54,12]),attachLabel(viewport,view.camera,eclipticAnchor,'ecliptic plane','orange',[16,-12]),attachLabel(viewport,view.camera,tiltAnchor,`axial tilt ε = ${EARTH_OBLIQUITY_DEG.toFixed(2)}°`,'orange',[18,-8])];
let latest,playing=false,last=performance.now();
const refresh=sliderBindings(controls,v=>{latest=v;renderState(v)});
function renderState(v){
 const original={a:EARTH_RADIUS_KM+v.altitude,e:v.eccentricity,i:radians(v.inclination),raan:radians(18),argp:radians(v.argp)};
 const physicalRates=j2Rates(original,EARTH_J2),j2Enabled=j2Toggle.checked,rates=j2Enabled?physicalRates:{raan:0,argp:0},dt=v.days*DAY_SECONDS;
 const current={...original,raan:original.raan+rates.raan*dt,argp:original.argp+rates.argp*dt};
 ghost.visible=j2Enabled;replaceLine(ghost,scaled(sampleOrbit(original)));replaceLine(orbit,scaled(sampleOrbit(current)));
 const periPosition=positionAtTrue(current,0),apoPosition=positionAtTrue(current,Math.PI),aboveSurface=point=>{const scale=EARTH_RADIUS_KM*1.025/Math.hypot(...point);return point.map(value=>value*scale)};
 const showApsides=hasWellDefinedPeriapsis(current.e);apsePeri.visible=showApsides;apseApo.visible=showApsides;peri.visible=showApsides;
 replaceLine(apsePeri,scaled([aboveSurface(periPosition),periPosition]));replaceLine(apseApo,scaled([aboveSurface(apoPosition),apoPosition]));
 const nLen=current.a*1.2,co=Math.cos(current.raan),so=Math.sin(current.raan);replaceLine(nodes,scaled([[-nLen*co,-nLen*so,0],[nLen*co,nLen*so,0]]));
 setPosition(ascending,positionAtTrue(current,-current.argp));setPosition(peri,periPosition);
 const yearAngle=2*Math.PI*v.days/365.2422,sunLongitude=yearAngle+Math.PI,sunDistance=2.35,sunDirection=eclipticDirection(sunLongitude);
 replaceLine(sunLine,[[0,0,0],sunDirection.map(value=>value*sunDistance)]);sunDot.position.set(...sunDirection.map(value=>value*sunDistance));
 const insetEarth=document.querySelector('#insetEarth');insetEarth.style.transform=`translate(-50%,-50%) rotate(${v.days/365.2422*360}deg) translateX(52px) rotate(${-v.days/365.2422*360}deg)`;
 const dayFactor=DAY_SECONDS*180/Math.PI;
 document.querySelector('#nodeRate').textContent=`${(rates.raan*dayFactor).toFixed(3)} °/day`;document.querySelector('#apseRate').textContent=`${(rates.argp*dayFactor).toFixed(3)} °/day`;
 document.querySelector('#nodeDelta').textContent=`${degrees(rates.raan*dt).toFixed(1)}°`;document.querySelector('#apseDelta').textContent=`${degrees(rates.argp*dt).toFixed(1)}°`;
 const sunNode=((degrees(current.raan-sunLongitude)%360)+540)%360-180;document.querySelector('#sunNodeAngle').textContent=`${sunNode.toFixed(1)}°`;
 const required=sunSynchronousInclination(original.a,original.e,EARTH_J2),solarRate=2*Math.PI/(365.2422*DAY_SECONDS),drift=(rates.raan-solarRate)*dayFactor;
 document.querySelector('#requiredI').textContent=Number.isFinite(required)?`${degrees(required).toFixed(2)}°`:'not possible';document.querySelector('#sunDrift').textContent=`${drift>=0?'+':''}${drift.toFixed(3)} °/day`;
 const periodHours=periodSeconds(original.a)/3600,criticalError=v.inclination-degrees(Math.acos(Math.sqrt(1/5)));
 document.querySelector('#orbitPeriod').textContent=`${periodHours.toFixed(2)} h`;document.querySelector('#criticalError').textContent=`${criticalError>=0?'+':''}${criticalError.toFixed(2)}°`;
 const apseDeg=Math.abs(rates.argp*dayFactor),inclinationError=Number.isFinite(required)?Math.abs(v.inclination-degrees(required)):Infinity;
 const argpError=Math.abs(((v.argp-270+540)%360)-180),canonicalMolniya=v.eccentricity>.65&&Math.abs(periodHours-12)<.35&&Math.abs(criticalError)<.15&&argpError<2;
 document.querySelector('#designStatus').textContent=!j2Enabled?'J₂ disabled: the orbital plane and apsides remain fixed in the inertial frame.':canonicalMolniya?'Molniya matched: 12-hour orbit and critical inclination; apsidal precession is zero.':Math.abs(criticalError)<.15&&v.eccentricity>.4?`Apsides remain frozen because i is critical, but this is not the canonical Molniya geometry (period ${periodHours.toFixed(2)} h, e ${v.eccentricity.toFixed(2)}).`:inclinationError<.15?'Sun-synchronous matched: nodal precession follows the Sun, preserving local solar time.':`Off-design: Sun–node drift ${Math.abs(drift).toFixed(3)}°/day; apsidal precession ${apseDeg.toFixed(3)}°/day.`;
 document.querySelector('#warning').textContent=original.a*(1-original.e)-EARTH_RADIUS_KM<100?'Perigee is below 100 km.':!showApsides?'Periapsis marker hidden: its direction becomes ill-defined as eccentricity approaches zero.':'';
}
function setValues(values){Object.entries(values).forEach(([id,value])=>{document.querySelector(`#${id}`).value=String(value)});refresh()}
function fitNearEarth(){view.camera.position.set(2.6,-3.2,2.2);view.controls.target.set(0,0,0)}
function selectPreset(id){document.querySelectorAll('.preset-row button').forEach(button=>button.classList.toggle('accent',button.id===id))}
function enableJ2(){j2Toggle.checked=true}
document.querySelector('#sso').addEventListener('click',()=>{enableJ2();setValues({altitude:700,eccentricity:.01,argp:0,days:365});const a=EARTH_RADIUS_KM+700,i=sunSynchronousInclination(a,.01,EARTH_J2);setValues({inclination:degrees(i).toFixed(1)});fitNearEarth();selectPreset('sso')});
document.querySelector('#molniya').addEventListener('click',()=>{enableJ2();setValues({altitude:20200,eccentricity:.74,inclination:63.4,argp:270,days:365});view.camera.position.set(12,-15,9);view.controls.target.set(0,0,0);selectPreset('molniya')});
document.querySelector('#mismatch').addEventListener('click',()=>{enableJ2();const e=Number(document.querySelector('#eccentricity').value);if(e>.4){setValues({inclination:68.4,days:730});view.camera.position.set(12,-15,9)}else{const a=EARTH_RADIUS_KM+Number(document.querySelector('#altitude').value),i=sunSynchronousInclination(a,e,EARTH_J2);if(Number.isFinite(i)){setValues({inclination:(degrees(i)+5).toFixed(1),days:730});fitNearEarth()}}selectPreset('mismatch')});
 j2Toggle.addEventListener('change',()=>{selectPreset('');refresh()});
document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#days').value='0';refresh()});document.querySelector('#play').addEventListener('click',e=>{playing=!playing;e.currentTarget.textContent=playing?'Pause':'Play'});
function animate(now){requestAnimationFrame(animate);if(playing&&latest){const input=document.querySelector('#days'),elapsedSeconds=Math.min(.1,(now-last)/1000);input.value=(Number(input.value)+elapsedSeconds*latest.animationSpeed)%7305;refresh()}last=now;labels.forEach(l=>l.update());if(!peri.visible)periLabel.element.hidden=true;view.render()}requestAnimationFrame(animate);
