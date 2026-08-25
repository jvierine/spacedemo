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
 const history=[];
 for(let k=0;k<=72;k++){
  const day=v.days*k/72,point=propagateAveragedDrag(base,{days:day,rho400:10**v.rhoPower,scaleHeightKm:v.scaleHeight,cd:v.cd,areaToMass:v.areaToMass});
  history.push({day,altitude:point.a-EARTH_RADIUS_KM,e:point.e});
 }
 renderChart(document.querySelector('#altitudeChart'),history,p=>p.day,p=>p.altitude,'days','km',0x54d6dd);
 renderChart(document.querySelector('#eccentricityChart'),history,p=>p.altitude,p=>p.e,'a − Rᴇ (km)','e',0xff766d);
}
sliderBindings(document.querySelector('#controls'),update); function animate(){requestAnimationFrame(animate);labels.forEach(l=>l.update());view.render()}animate();

function renderChart(svg,data,getX,getY,xLabel,yLabel,color){
 const width=430,height=150,left=48,right=14,top=9,bottom=29,xValues=data.map(getX),yValues=data.map(getY);
 let xMin=Math.min(...xValues),xMax=Math.max(...xValues),yMin=Math.min(...yValues),yMax=Math.max(...yValues);
 if(xMax===xMin){xMax=xMin+1}if(yMax===yMin){const pad=Math.max(Math.abs(yMin)*.05,.001);yMin-=pad;yMax+=pad}else{const pad=(yMax-yMin)*.08;yMin=Math.max(0,yMin-pad);yMax+=pad}
 const px=x=>left+(x-xMin)/(xMax-xMin)*(width-left-right),py=y=>top+(yMax-y)/(yMax-yMin)*(height-top-bottom),hex=`#${color.toString(16).padStart(6,'0')}`;
 const path=data.map((p,i)=>`${i?'L':'M'}${px(getX(p)).toFixed(2)},${py(getY(p)).toFixed(2)}`).join(' '),last=data.at(-1);
 const grids=[0,.25,.5,.75,1].map(f=>{const y=top+f*(height-top-bottom),value=yMax-f*(yMax-yMin);return `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"/><text class="chart-text" x="${left-5}" y="${y+3}" text-anchor="end">${formatTick(value)}</text>`}).join('');
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=`${grids}<line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}"/><line class="chart-axis" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"/><path class="chart-path" stroke="${hex}" d="${path}"/><circle class="chart-point" fill="${hex}" cx="${px(getX(last))}" cy="${py(getY(last))}" r="4"/><text class="chart-text" x="${left}" y="${height-8}">${formatTick(xMin)}</text><text class="chart-text" x="${width-right}" y="${height-8}" text-anchor="end">${formatTick(xMax)}</text><text class="chart-text" x="${(left+width-right)/2}" y="${height-8}" text-anchor="middle">${xLabel}</text><text class="chart-text" x="10" y="${top+8}">${yLabel}</text>`;
}
function formatTick(value){return Math.abs(value)<.1&&value!==0?value.toFixed(3):Math.abs(value)<10?value.toFixed(2):value.toFixed(0)}
