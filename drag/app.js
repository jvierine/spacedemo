import { compressedDecaySpiral, EARTH_RADIUS_KM, estimateDecayDays, propagateAveragedDrag, radians, sampleAveragedDrag } from '../js/orbit.js?v=20260826-dragspiral1';
import { msisDensity } from '../js/msis-density.js?v=20260826-msis1';
import { FIXED_DRAG_COEFFICIENT, sphereAreaToMass, sphereDiameterCm, sphereMassKg } from '../js/drag-object.js?v=20260826-drag1';
import { attachLabel, createSpaceScene, makeDot, makeLine, replaceLine, scaled, setPosition, sliderBindings } from '../js/scene.js';
const viewport=document.querySelector('#viewport'), view=createSpaceScene(viewport);
const decayLine=makeLine([],0xff766d,1),startDot=makeDot(0x90a1a8,.025),decayDot=makeDot(0xffb14e,.03); view.scene.add(decayLine,startDot,decayDot);
const labels=[attachLabel(viewport,view.camera,startDot,'start'),attachLabel(viewport,view.camera,decayDot,'decay · 80 km','orange')];
function update(v){
 const base={a:EARTH_RADIUS_KM+v.altitude,e:v.eccentricity,i:radians(35),raan:radians(25),argp:radians(20)};
 const densityAtAltitude=altitudeKm=>v.densityScale*msisDensity(altitudeKm,150,4);
 const dragOptions={densityAtAltitude,cd:FIXED_DRAG_COEFFICIENT,areaToMass:v.areaToMass};
 const decayDays=estimateDecayDays(base,dragOptions);
 document.querySelector('#decayTime').textContent=formatDuration(decayDays);
 const result=propagateAveragedDrag(base,{...dragOptions,days:decayDays});
 const now={...base,a:result.a,e:result.e};
 const spiralHistory=sampleAveragedDrag(base,dragOptions,decayDays,960),spiral=compressedDecaySpiral(base,spiralHistory);
 replaceLine(decayLine,scaled(spiral));setPosition(startDot,spiral[0]);setPosition(decayDot,spiral.at(-1));
 document.querySelector('#currentA').textContent=`${(now.a-EARTH_RADIUS_KM).toFixed(1)} km`;
 document.querySelector('#currentE').textContent=now.e.toFixed(4); document.querySelector('#density').textContent=result.density.toExponential(2)+' kg/m³';
 document.querySelector('[data-output="areaToMass"]').textContent=`${v.areaToMass.toExponential(3)} m²/kg`;
 document.querySelector('#ballistic').textContent=`${(1/(FIXED_DRAG_COEFFICIENT*v.areaToMass)).toFixed(1)} kg/m²`;
 document.querySelector('#objectMass').textContent=formatMass(sphereMassKg(v.diameter));
 document.querySelector('#warning').textContent=result.reentered?'Decay endpoint: 80 km.':'';
 const history=sampleAveragedDrag(base,dragOptions,decayDays),useYears=decayDays>=730;
 renderChart(document.querySelector('#altitudeChart'),history,p=>useYears?p.day/365.25:p.day,p=>p.altitude,useYears?'years':'days','km',0x54d6dd);
 renderChart(document.querySelector('#eccentricityChart'),history,p=>useYears?p.day/365.25:p.day,p=>p.e,useYears?'years':'days','e',0xff766d);
}
const diameterInput=document.querySelector('#diameter'),areaInput=document.querySelector('#areaToMass');
diameterInput.addEventListener('input',()=>{areaInput.value=sphereAreaToMass(Number(diameterInput.value))});
areaInput.addEventListener('input',()=>{diameterInput.value=sphereDiameterCm(Number(areaInput.value))});
sliderBindings(document.querySelector('#controls'),update); function animate(){requestAnimationFrame(animate);labels.forEach(l=>l.update());view.render()}animate();

function formatMass(kg){return kg<.001?`${(kg*1e6).toFixed(2)} mg`:kg<1?`${(kg*1000).toFixed(kg<.01?2:1)} g`:`${kg.toFixed(kg<10?2:1)} kg`}
function formatDuration(days){if(days>=365.25)return `${formatNumber(days/365.25)} years`;if(days>=1)return `${formatNumber(days)} days`;return `${formatNumber(days*24)} hours`}
function formatNumber(value){if(value>=1e6)return value.toExponential(2);if(value>=1000)return value.toLocaleString('en-US',{maximumFractionDigits:0});if(value>=10)return value.toFixed(1);return value.toFixed(2)}

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
