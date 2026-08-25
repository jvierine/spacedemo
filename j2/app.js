import { DAY_SECONDS, EARTH_J2, EARTH_RADIUS_KM, degrees, j2Rates, positionAtTrue, radians, sampleOrbit, sunSynchronousInclination } from '../js/orbit.js';
import { attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, setPosition, sliderBindings } from '../js/scene.js';
const controls=document.querySelector('#controls'),viewport=document.querySelector('#viewport'),view=createSpaceScene(viewport);
const ghost=makeLine([],0x90a1a8,.45,true),orbit=makeLine([],0x8bd99d,1),apsides=makeLine([],0xffb14e,.9),nodes=makeLine([],0x54d6dd,.8);view.scene.add(ghost,orbit,apsides,nodes);
const ascending=makeDot(0x54d6dd,.03),peri=makeDot(0xffb14e,.032);view.scene.add(ascending,peri);
const labels=[attachLabel(viewport,view.camera,ascending,'ascending node Ω','cyan'),attachLabel(viewport,view.camera,peri,'periapsis ω','orange')];
let latest,playing=false,last=performance.now();
const refresh=sliderBindings(controls,v=>{latest=v;renderState(v)});
function renderState(v){
 const original={a:EARTH_RADIUS_KM+v.altitude,e:v.eccentricity,i:radians(v.inclination),raan:radians(18),argp:radians(28)};
 const rates=j2Rates(original,EARTH_J2*v.j2Scale),dt=v.days*DAY_SECONDS;
 const current={...original,raan:original.raan+rates.raan*dt,argp:original.argp+rates.argp*dt};
 replaceLine(ghost,scaled(sampleOrbit(original)));replaceLine(orbit,scaled(sampleOrbit(current)));
 replaceLine(apsides,scaled([positionAtTrue(current,0),positionAtTrue(current,Math.PI)]));
 const nLen=current.a*1.2,co=Math.cos(current.raan),so=Math.sin(current.raan);replaceLine(nodes,scaled([[-nLen*co,-nLen*so,0],[nLen*co,nLen*so,0]]));
 setPosition(ascending,positionAtTrue(current,-current.argp));setPosition(peri,positionAtTrue(current,0));
 const dayFactor=DAY_SECONDS*180/Math.PI;
 document.querySelector('#nodeRate').textContent=`${(rates.raan*dayFactor).toFixed(3)} °/day`;document.querySelector('#apseRate').textContent=`${(rates.argp*dayFactor).toFixed(3)} °/day`;
 document.querySelector('#nodeDelta').textContent=`${degrees(rates.raan*dt).toFixed(1)}°`;document.querySelector('#apseDelta').textContent=`${degrees(rates.argp*dt).toFixed(1)}°`;
 document.querySelector('#warning').textContent=original.a*(1-original.e)-EARTH_RADIUS_KM<100?'Perigee is below 100 km.':'';
}
document.querySelector('#sso').addEventListener('click',()=>{const a=EARTH_RADIUS_KM+Number(document.querySelector('#altitude').value),e=Number(document.querySelector('#eccentricity').value),i=sunSynchronousInclination(a,e,EARTH_J2*Number(document.querySelector('#j2Scale').value));if(Number.isFinite(i)){document.querySelector('#inclination').value=degrees(i).toFixed(1);refresh()}});
document.querySelector('#critical').addEventListener('click',()=>{document.querySelector('#inclination').value='63.4';refresh()});document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#days').value='0';refresh()});document.querySelector('#play').addEventListener('click',e=>{playing=!playing;e.currentTarget.textContent=playing?'Pause':'Play'});
function animate(now){requestAnimationFrame(animate);if(playing&&latest){const input=document.querySelector('#days');input.value=(Number(input.value)+(now-last)*.0025)%365;refresh()}last=now;labels.forEach(l=>l.update());view.render()}requestAnimationFrame(animate);
