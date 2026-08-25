import { EARTH_RADIUS_KM, ellipseGeometry, positionAtTrue, propagateAveragedDrag, radians, sampleOrbit } from '../js/orbit.js';
import { attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, setPosition, sliderBindings } from '../js/scene.js';
const viewport=document.querySelector('#viewport'), view=createSpaceScene(viewport);
const initialLine=makeLine([],0x90a1a8,.55,true), currentLine=makeLine([],0xff766d,1); view.scene.add(initialLine,currentLine);
const initialApo=makeDot(0x90a1a8,.022), currentApo=makeDot(0xff766d,.03), peri=makeDot(0xffb14e,.026); view.scene.add(initialApo,currentApo,peri);
const labels=[attachLabel(viewport,view.camera,initialApo,'initial apogee'),attachLabel(viewport,view.camera,currentApo,'current apogee','red'),attachLabel(viewport,view.camera,peri,'perigee · strongest drag','orange')];
function update(v){
 const base={a:EARTH_RADIUS_KM+v.altitude,e:v.eccentricity,i:radians(35),raan:radians(25),argp:radians(20)};
 const result=propagateAveragedDrag(base,{days:v.days,rho400:10**v.rhoPower,scaleHeightKm:v.scaleHeight,cd:v.cd,areaToMass:v.areaToMass});
 const now={...base,a:result.a,e:result.e};
 replaceLine(initialLine,scaled(sampleOrbit(base))); replaceLine(currentLine,scaled(sampleOrbit(now)));
 setPosition(initialApo,positionAtTrue(base,Math.PI)); setPosition(currentApo,positionAtTrue(now,Math.PI)); setPosition(peri,positionAtTrue(now,0));
 const g=ellipseGeometry(now.a,now.e);
 document.querySelector('#currentA').textContent=`${(now.a-EARTH_RADIUS_KM).toFixed(1)} km`;
 document.querySelector('#currentE').textContent=now.e.toFixed(4); document.querySelector('#density').textContent=result.density.toExponential(2)+' kg/m³';
 document.querySelector('#ballistic').textContent=`${(1/(v.cd*v.areaToMass)).toFixed(1)} kg/m²`;
 document.querySelector('#warning').textContent=result.reentered?'Re-entry threshold reached (80 km).':g.rp<EARTH_RADIUS_KM+100?'Perigee is in the re-entry region.':'';
}
sliderBindings(document.querySelector('#controls'),update); function animate(){requestAnimationFrame(animate);labels.forEach(l=>l.update());view.render()}animate();

