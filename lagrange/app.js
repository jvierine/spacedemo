import {AU_KM,EARTH_YEAR_DAYS,MOON_DISTANCE_KM,effectivePotential,hillRadius,lagrangePoints,sphereOfInfluence} from '../js/three-body.js?v=20260828-1';

const $=selector=>document.querySelector(selector),canvas=$('#canvas'),ctx=canvas.getContext('2d'),points=lagrangePoints(),soi=sphereOfInfluence(),hill=hillRadius();
let elapsedDays=0,playing=true,lastTime=performance.now();
const colors={earth:'#54d6dd',sun:'#ffe09a',lagrange:'#ffb14e',soi:'#8bd99d',hill:'#ff766d',muted:'#90a1a8'};
const rotate=(point,angle)=>[point[0]*Math.cos(angle)-point[1]*Math.sin(angle),point[0]*Math.sin(angle)+point[1]*Math.cos(angle)];
function sizeCanvas(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}return{width,height,ratio}}

const potentialStops=[[22,11,57],[53,42,135],[36,103,142],[39,145,134],[77,190,107],[173,220,48],[246,233,69]];
function potentialColor(value){
  const position=Math.max(0,Math.min(1,value))*(potentialStops.length-1),index=Math.min(potentialStops.length-2,Math.floor(position)),mix=position-index,a=potentialStops[index],b=potentialStops[index+1];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*mix)} ${Math.round(a[1]+(b[1]-a[1])*mix)} ${Math.round(a[2]+(b[2]-a[2])*mix)})`;
}
function drawPotential({width,height,ratio,center,extent,angle}){
  const cell=Math.max(5,Math.round(7*ratio)),columns=Math.ceil(width/cell),rows=Math.ceil(height/cell),samples=[];
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
    const screenX=((column+.5)*cell-width/2)*2*extent/Math.min(width,height),screenY=(height/2-(row+.5)*cell)*2*extent/Math.min(width,height),relative=rotate([screenX,screenY],-angle),x=center[0]+relative[0]/AU_KM,y=center[1]+relative[1]/AU_KM;
    samples.push(effectivePotential(x,y,points.mu));
  }
  const ordered=[...samples].sort((a,b)=>a-b),low=ordered[Math.floor(ordered.length*.03)],high=ordered[Math.floor(ordered.length*.97)],range=Math.max(Number.EPSILON,high-low);
  samples.forEach((value,index)=>{const normalized=Math.log1p(9*Math.max(0,Math.min(1,(value-low)/range)))/Math.log(10);ctx.fillStyle=potentialColor(normalized);ctx.fillRect(index%columns*cell,Math.floor(index/columns)*cell,cell+1,cell+1)});
  const barWidth=112*ratio,barHeight=7*ratio,barX=width-138*ratio,barY=24*ratio,gradient=ctx.createLinearGradient(barX,0,barX+barWidth,0);
  potentialStops.forEach((stop,index)=>gradient.addColorStop(index/(potentialStops.length-1),`rgb(${stop.join(' ')})`));ctx.fillStyle='rgba(5,12,19,.76)';ctx.fillRect(barX-8*ratio,barY-17*ratio,barWidth+16*ratio,35*ratio);ctx.fillStyle=gradient;ctx.fillRect(barX,barY,barWidth,barHeight);ctx.fillStyle='#d8e3e7';ctx.font=`${9*ratio}px ui-monospace,monospace`;ctx.fillText('lower Ω',barX,barY-4*ratio);ctx.textAlign='right';ctx.fillText('higher Ω',barX+barWidth,barY-4*ratio);ctx.textAlign='left';
}
function draw(){
  const {width,height,ratio}=sizeCanvas(),earthView=$('#viewScale').value==='earth',angle=Math.PI*2*elapsedDays/EARTH_YEAR_DAYS,extent=earthView?2.15e6:1.18*AU_KM,center=earthView?points.earth:[0,0],scale=Math.min(width,height)/(2*extent),project=raw=>{const relative=[raw[0]*AU_KM-center[0]*AU_KM,raw[1]*AU_KM-center[1]*AU_KM],rotated=rotate(relative,angle);return[width/2+rotated[0]*scale,height/2-rotated[1]*scale]};
  ctx.clearRect(0,0,width,height);
  if($('#showPotential').checked)drawPotential({width,height,ratio,center,extent,angle});
  if(!earthView){const [sx,sy]=project(points.sun);ctx.strokeStyle='rgba(84,214,221,.28)';ctx.lineWidth=ratio;ctx.beginPath();ctx.arc(sx,sy,AU_KM*scale,0,Math.PI*2);ctx.stroke()}
  const earthPoint=project(points.earth),sunPoint=project(points.sun);
  const circle=(radius,color,dashed=false)=>{ctx.beginPath();ctx.arc(earthPoint[0],earthPoint[1],radius*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.6*ratio;ctx.setLineDash(dashed?[5*ratio,4*ratio]:[]);ctx.stroke();ctx.setLineDash([])};
  if($('#showSoi').checked)circle(soi,colors.soi,true);if($('#showHill').checked)circle(hill,colors.hill);
  if(earthView){circle(MOON_DISTANCE_KM,'rgba(180,218,225,.35)',true);const direction=rotate([-1,0],angle),labelX=width/2+direction[0]*width*.29,labelY=height/2-direction[1]*height*.29;ctx.strokeStyle=colors.sun;ctx.lineWidth=2*ratio;ctx.beginPath();ctx.moveTo(width/2,height/2);ctx.lineTo(width/2+direction[0]*width*.42,height/2-direction[1]*height*.42);ctx.stroke();ctx.fillStyle=colors.sun;ctx.font=`${11*ratio}px ui-monospace,monospace`;ctx.fillText('toward Sun',labelX+7*ratio,labelY-7*ratio)}
  const marker=(point,color,radius,label,offset=[8,-8],critical=false)=>{const [x,y]=project(point);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10*ratio;ctx.beginPath();ctx.arc(x,y,radius*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(critical){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=ratio;ctx.beginPath();ctx.arc(x,y,(radius+3)*ratio,0,Math.PI*2);ctx.stroke()}ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.lineWidth=3*ratio;ctx.strokeStyle='rgba(5,12,19,.88)';ctx.strokeText(label,x+offset[0]*ratio,y+offset[1]*ratio);ctx.fillStyle=color;ctx.fillText(label,x+offset[0]*ratio,y+offset[1]*ratio)};
  if(!earthView)marker(points.sun,colors.sun,7,'Sun',[10,-9]);marker(points.earth,colors.earth,earthView?7:4,earthView?'Earth':'Earth · switch scale for L1/L2',[9,-8]);
  const visible=earthView?['L1','L2']:['L3','L4','L5'];for(const name of visible)marker(points[name],colors.lagrange,3,`${name} · ∇Ω=0`,name==='L5'?[8,15]:[8,-8],true);
  if(earthView){ctx.fillStyle=colors.muted;ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.fillText('Moon orbit',earthPoint[0]+MOON_DISTANCE_KM*scale+5*ratio,earthPoint[1]);ctx.fillStyle=colors.soi;ctx.fillText('SOI',earthPoint[0]+soi*scale+5*ratio,earthPoint[1]-14*ratio);ctx.fillStyle=colors.hill;ctx.fillText('Hill',earthPoint[0]+hill*scale+5*ratio,earthPoint[1]+16*ratio)}
}
function readouts(){const km=value=>`${Math.round(value).toLocaleString()} km`;$('#soiRadius').textContent=km(soi);$('#hillRadius').textContent=km(hill);$('#soiMoon').textContent=`${(soi/MOON_DISTANCE_KM).toFixed(2)} ×`;$('#hillMoon').textContent=`${(hill/MOON_DISTANCE_KM).toFixed(2)} ×`;$('#l1Distance').textContent=km((points.earth[0]-points.L1[0])*AU_KM);$('#l2Distance').textContent=km((points.L2[0]-points.earth[0])*AU_KM);$('#timeScaleOutput').textContent=`${$('#timeScale').value} days/s`}
document.querySelectorAll('select,input').forEach(control=>control.addEventListener('input',()=>{readouts();draw()}));$('#play').textContent='Pause';$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'Pause':'Play';lastTime=performance.now()});$('#reset').addEventListener('click',()=>{elapsedDays=0;playing=true;$('#play').textContent='Pause';lastTime=performance.now();draw()});new ResizeObserver(draw).observe($('#viewport'));
function animate(time){if(playing){elapsedDays+=(time-lastTime)/1000*Number($('#timeScale').value);draw()}lastTime=time;requestAnimationFrame(animate)}readouts();draw();requestAnimationFrame(animate);
