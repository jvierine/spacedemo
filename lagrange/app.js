import {AU_KM,EARTH_YEAR_DAYS,MOON_DISTANCE_KM,effectivePotential,hillRadius,lagrangePoints,sphereOfInfluence} from '../js/three-body.js?v=20260828-1';

const $=selector=>document.querySelector(selector),canvas=$('#canvas'),ctx=canvas.getContext('2d'),points=lagrangePoints(),fitzpatrickPoints=lagrangePoints(1,99),soi=sphereOfInfluence(),hill=hillRadius();
let elapsedDays=0,playing=true,lastTime=performance.now();
const colors={earth:'#54d6dd',sun:'#ffe09a',lagrange:'#ffb14e',soi:'#8bd99d',hill:'#ff766d',muted:'#90a1a8'};
const rotate=(point,angle)=>[point[0]*Math.cos(angle)-point[1]*Math.sin(angle),point[0]*Math.sin(angle)+point[1]*Math.cos(angle)];
function sizeCanvas(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}return{width,height,ratio}}

const potentialStops=[[22,11,57],[53,42,135],[36,103,142],[39,145,134],[77,190,107],[173,220,48],[246,233,69]];
function potentialColor(value){
  const position=Math.max(0,Math.min(1,value))*(potentialStops.length-1),index=Math.min(potentialStops.length-2,Math.floor(position)),mix=position-index,a=potentialStops[index],b=potentialStops[index+1];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*mix)} ${Math.round(a[1]+(b[1]-a[1])*mix)} ${Math.round(a[2]+(b[2]-a[2])*mix)})`;
}
function drawPotential({width,height,ratio,center,extent,angle,logScale,modelPoints}){
  const cell=Math.max(5,Math.round(7*ratio)),columns=Math.ceil(width/cell),rows=Math.ceil(height/cell),samples=[];
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
    const screenX=((column+.5)*cell-width/2)*2*extent/Math.min(width,height),screenY=(height/2-(row+.5)*cell)*2*extent/Math.min(width,height),relative=rotate([screenX,screenY],-angle),x=center[0]+relative[0]/AU_KM,y=center[1]+relative[1]/AU_KM;
    samples.push(effectivePotential(x,y,modelPoints.mu));
  }
  const mapped=logScale?samples.map(value=>Math.log10(value)):samples,ordered=[...mapped].sort((a,b)=>a-b),low=ordered[Math.floor(ordered.length*.03)],high=ordered[Math.floor(ordered.length*.97)],range=Math.max(Number.EPSILON,high-low);
  mapped.forEach((value,index)=>{const normalized=Math.max(0,Math.min(1,(value-low)/range));ctx.fillStyle=potentialColor(normalized);ctx.fillRect(index%columns*cell,Math.floor(index/columns)*cell,cell+1,cell+1)});
  const barWidth=132*ratio,barHeight=7*ratio,barX=width-158*ratio,barY=height-92*ratio,gradient=ctx.createLinearGradient(barX,0,barX+barWidth,0);
  potentialStops.forEach((stop,index)=>gradient.addColorStop(index/(potentialStops.length-1),`rgb(${stop.join(' ')})`));ctx.fillStyle='rgba(5,12,19,.76)';ctx.fillRect(barX-8*ratio,barY-20*ratio,barWidth+16*ratio,46*ratio);ctx.fillStyle=gradient;ctx.fillRect(barX,barY,barWidth,barHeight);ctx.fillStyle='#d8e3e7';ctx.font=`${9*ratio}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText(logScale?'log₁₀ Ω':'Ω · linear scale',barX+barWidth/2,barY-6*ratio);ctx.textAlign='left';ctx.fillText('lower',barX,barY+18*ratio);ctx.textAlign='right';ctx.fillText('higher',barX+barWidth,barY+18*ratio);ctx.textAlign='left';
}
function drawZeroVelocityContours({width,height,ratio,center,extent,angle,modelPoints}){
  const cell=Math.max(5,Math.round(6*ratio)),columns=Math.ceil(width/cell)+1,rows=Math.ceil(height/cell)+1,values=[];
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
    const screenX=((column+.5)*cell-width/2)*2*extent/Math.min(width,height),screenY=(height/2-(row+.5)*cell)*2*extent/Math.min(width,height),relative=rotate([screenX,screenY],-angle),x=center[0]+relative[0]/AU_KM,y=center[1]+relative[1]/AU_KM;
    values.push(2*effectivePotential(x,y,modelPoints.mu));
  }
  const critical={C1:2*effectivePotential(...modelPoints.L1,modelPoints.mu),C2:2*effectivePotential(...modelPoints.L2,modelPoints.mu),C3:2*effectivePotential(...modelPoints.L3,modelPoints.mu),C4:2*effectivePotential(...modelPoints.L4,modelPoints.mu)},span=critical.C1-critical.C4;
  const levels=[...Array.from({length:13},(_,index)=>critical.C4+span*(.008+index*.115)),critical.C1,critical.C2,critical.C3].sort((a,b)=>a-b).filter((value,index,array)=>index===0||Math.abs(value-array[index-1])>1e-10);
  const crossing=(a,b,level,ax,ay,bx,by)=>{const mix=(level-a)/(b-a);return[ax+(bx-ax)*mix,ay+(by-ay)*mix]};
  for(const level of levels){
    const criticalLevel=Object.values(critical).some(value=>Math.abs(value-level)<1e-10);ctx.beginPath();
    for(let row=0;row<rows-1;row+=1)for(let column=0;column<columns-1;column+=1){
      const x=(column+.5)*cell,y=(row+.5)*cell,a=values[row*columns+column],b=values[row*columns+column+1],c=values[(row+1)*columns+column+1],d=values[(row+1)*columns+column],hits=[];
      if((a<level)!==(b<level))hits.push(crossing(a,b,level,x,y,x+cell,y));
      if((b<level)!==(c<level))hits.push(crossing(b,c,level,x+cell,y,x+cell,y+cell));
      if((c<level)!==(d<level))hits.push(crossing(c,d,level,x+cell,y+cell,x,y+cell));
      if((d<level)!==(a<level))hits.push(crossing(d,a,level,x,y+cell,x,y));
      if(hits.length===2){ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1])}else if(hits.length===4){ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1]);ctx.moveTo(...hits[2]);ctx.lineTo(...hits[3])}
    }
    ctx.strokeStyle=criticalLevel?'rgba(255,177,78,.95)':'rgba(225,242,244,.34)';ctx.lineWidth=(criticalLevel?1.45:.7)*ratio;ctx.stroke();
  }
}
function draw(){
  const {width,height,ratio}=sizeCanvas(),view=$('#viewScale').value,earthView=view==='earth',illustrative=view==='fitzpatrick',modelPoints=illustrative?fitzpatrickPoints:points,angle=Math.PI*2*elapsedDays/EARTH_YEAR_DAYS,extent=earthView?2.15e6:(illustrative?1.5:1.18)*AU_KM,center=earthView?modelPoints.earth:[0,0],scale=Math.min(width,height)/(2*extent),project=raw=>{const relative=[raw[0]*AU_KM-center[0]*AU_KM,raw[1]*AU_KM-center[1]*AU_KM],rotated=rotate(relative,angle);return[width/2+rotated[0]*scale,height/2-rotated[1]*scale]};
  ctx.clearRect(0,0,width,height);
  if($('#showPotential').checked)drawPotential({width,height,ratio,center,extent,angle,logScale:!earthView,modelPoints});
  if($('#showZeroVelocity').checked)drawZeroVelocityContours({width,height,ratio,center,extent,angle,modelPoints});
  if(!earthView){const [sx,sy]=project(modelPoints.sun);ctx.strokeStyle='rgba(84,214,221,.28)';ctx.lineWidth=ratio;ctx.beginPath();ctx.arc(sx,sy,AU_KM*scale,0,Math.PI*2);ctx.stroke()}
  const earthPoint=project(modelPoints.earth),sunPoint=project(modelPoints.sun);
  const circle=(radius,color,dashed=false)=>{ctx.beginPath();ctx.arc(earthPoint[0],earthPoint[1],radius*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.6*ratio;ctx.setLineDash(dashed?[5*ratio,4*ratio]:[]);ctx.stroke();ctx.setLineDash([])};
  if(!illustrative&&$('#showSoi').checked)circle(soi,colors.soi,true);if(!illustrative&&$('#showHill').checked)circle(hill,colors.hill);
  if(earthView){circle(MOON_DISTANCE_KM,'rgba(180,218,225,.35)',true);const direction=rotate([-1,0],angle),labelX=width/2+direction[0]*width*.29,labelY=height/2-direction[1]*height*.29;ctx.strokeStyle=colors.sun;ctx.lineWidth=2*ratio;ctx.beginPath();ctx.moveTo(width/2,height/2);ctx.lineTo(width/2+direction[0]*width*.42,height/2-direction[1]*height*.42);ctx.stroke();ctx.fillStyle=colors.sun;ctx.font=`${11*ratio}px ui-monospace,monospace`;ctx.fillText('toward Sun',labelX+7*ratio,labelY-7*ratio)}
  const marker=(point,color,radius,label,offset=[8,-8],critical=false)=>{const [x,y]=project(point);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10*ratio;ctx.beginPath();ctx.arc(x,y,radius*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(critical){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=ratio;ctx.beginPath();ctx.arc(x,y,(radius+3)*ratio,0,Math.PI*2);ctx.stroke()}ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.lineWidth=3*ratio;ctx.strokeStyle='rgba(5,12,19,.88)';ctx.strokeText(label,x+offset[0]*ratio,y+offset[1]*ratio);ctx.fillStyle=color;ctx.fillText(label,x+offset[0]*ratio,y+offset[1]*ratio)};
  if(!earthView)marker(modelPoints.sun,colors.sun,7,illustrative?'m₁':'Sun',[10,-9]);marker(modelPoints.earth,colors.earth,earthView?7:4,illustrative?'m₂':(earthView?'Earth':'Earth · switch scale for L1/L2'),[9,-8]);
  const visible=illustrative?['L1','L2','L3','L4','L5']:(earthView?['L1','L2']:['L3','L4','L5']);for(const name of visible)marker(modelPoints[name],colors.lagrange,3,`${name} · ∇Ω=0`,name==='L5'?[8,15]:[8,-8],true);
  if(earthView){ctx.fillStyle=colors.muted;ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.fillText('Moon orbit',earthPoint[0]+MOON_DISTANCE_KM*scale+5*ratio,earthPoint[1]);ctx.fillStyle=colors.soi;ctx.fillText('SOI',earthPoint[0]+soi*scale+5*ratio,earthPoint[1]-14*ratio);ctx.fillStyle=colors.hill;ctx.fillText('Hill',earthPoint[0]+hill*scale+5*ratio,earthPoint[1]+16*ratio)}
}
function readouts(){const km=value=>`${Math.round(value).toLocaleString()} km`;$('#soiRadius').textContent=km(soi);$('#hillRadius').textContent=km(hill);$('#soiMoon').textContent=`${(soi/MOON_DISTANCE_KM).toFixed(2)} ×`;$('#hillMoon').textContent=`${(hill/MOON_DISTANCE_KM).toFixed(2)} ×`;$('#l1Distance').textContent=km((points.earth[0]-points.L1[0])*AU_KM);$('#l2Distance').textContent=km((points.L2[0]-points.earth[0])*AU_KM);$('#timeScaleOutput').textContent=`${$('#timeScale').value} days/s`}
document.querySelectorAll('select,input').forEach(control=>control.addEventListener('input',()=>{readouts();draw()}));$('#play').textContent='Pause';$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'Pause':'Play';lastTime=performance.now()});$('#reset').addEventListener('click',()=>{elapsedDays=0;playing=true;$('#play').textContent='Pause';lastTime=performance.now();draw()});new ResizeObserver(draw).observe($('#viewport'));
function animate(time){if(playing){elapsedDays+=(time-lastTime)/1000*Number($('#timeScale').value);draw()}lastTime=time;requestAnimationFrame(animate)}readouts();draw();requestAnimationFrame(animate);
