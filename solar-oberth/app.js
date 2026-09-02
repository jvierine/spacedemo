import {AU_KM,SUN_MU_KM3_S2,SUN_RADIUS_KM,sampleConic,solarOberthScenario,stateOnEllipse} from '../js/oberth.js?v=20260902-1';

const $=selector=>document.querySelector(selector);
const perihelion=$('#perihelion'),targetSpeed=$('#targetSpeed'),burnAngle=$('#burnAngle');
const orbitCanvas=$('#orbitCanvas'),orbitContext=orbitCanvas.getContext('2d'),chartCanvas=$('#chartCanvas'),chartContext=chartCanvas.getContext('2d');
let model;
const colors={cyan:'#54d6dd',orange:'#ffb14e',muted:'#90a1a8'};

function canvasSize(canvas){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}return{width,height,ratio}}
const fmt=value=>`${value.toFixed(value>=100?1:2)} km/s`;
function ellipsePoints(rp,ra,count=360){const points=[];for(let index=0;index<=count;index++)points.push(stateOnEllipse(SUN_MU_KM3_S2,rp,ra,-Math.PI+2*Math.PI*index/count).position);return points}

function drawOrbit(){
  const {width,height,ratio}=canvasSize(orbitCanvas),ctx=orbitContext,cx=width/2,cy=height/2,outer=Math.min(width,height)*.43,rMin=SUN_RADIUS_KM,rMax=3*AU_KM;
  ctx.clearRect(0,0,width,height);
  const project=point=>{const r=Math.hypot(...point),angle=Math.atan2(point[1],point[0]),fraction=Math.max(0,Math.min(1,Math.log(Math.max(r,rMin)/rMin)/Math.log(rMax/rMin))),rho=(18*ratio)+(outer-18*ratio)*fraction;return[cx+rho*Math.cos(angle),cy-rho*Math.sin(angle)]};
  const path=(points,color,widthPx=1,dash=[])=>{ctx.beginPath();points.forEach((point,index)=>{const [x,y]=project(point);index?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=widthPx*ratio;ctx.setLineDash(dash.map(value=>value*ratio));ctx.stroke();ctx.setLineDash([])};
  const earth=[];for(let index=0;index<=260;index++){const a=2*Math.PI*index/260;earth.push([AU_KM*Math.cos(a),AU_KM*Math.sin(a)])}path(earth,colors.cyan,1,[4,4]);
  path(ellipsePoints(model.periapsis,model.apoapsis),colors.muted,1.6);path(sampleConic(model.burn.conic,420,rMax),colors.orange,2.5);
  ctx.fillStyle='#ffe09a';ctx.shadowColor='#ffe09a';ctx.shadowBlur=16*ratio;ctx.beginPath();ctx.arc(cx,cy,9*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  const [bx,by]=project(model.state.position);ctx.fillStyle=colors.orange;ctx.shadowColor=colors.orange;ctx.shadowBlur=12*ratio;ctx.beginPath();ctx.arc(bx,by,5*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  const label=(text,x,y,color)=>{ctx.fillStyle=color;ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.fillText(text,x,y)};label('Sun',cx+13*ratio,cy-12*ratio,'#ffe09a');label('burn',bx+9*ratio,by-8*ratio,colors.orange);const [ex,ey]=project([AU_KM,0]);label('Earth orbit',ex-65*ratio,ey-10*ratio,colors.cyan);
}

function drawChart(){
  const {width,height,ratio}=canvasSize(chartCanvas),ctx=chartContext,left=58*ratio,right=22*ratio,top=18*ratio,bottom=32*ratio,pw=width-left-right,ph=height-top-bottom;
  const samples=[];for(let angle=0;angle<=180;angle+=2)samples.push([angle,solarOberthScenario({perihelionSolarRadii:Number(perihelion.value),targetVInfinity:Number(targetSpeed.value),burnAngleDeg:angle}).totalDeltaV]);
  const minimum=Math.min(model.optimumTotalDeltaV,model.directDeltaV)*.92,maximum=Math.max(...samples.map(point=>point[1]),model.directDeltaV)*1.05,x=angle=>left+pw*angle/180,y=value=>top+ph*(maximum-value)/(maximum-minimum);
  ctx.clearRect(0,0,width,height);ctx.font=`${9*ratio}px ui-monospace,monospace`;ctx.fillStyle=colors.muted;ctx.strokeStyle='rgba(180,218,225,.16)';ctx.lineWidth=ratio;
  for(let index=0;index<=4;index++){const value=minimum+(maximum-minimum)*index/4,py=y(value);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(left+pw,py);ctx.stroke();ctx.textAlign='right';ctx.fillText(value.toFixed(0),left-7*ratio,py+3*ratio)}for(const angle of [0,45,90,135,180]){ctx.textAlign='center';ctx.fillText(`${angle}°`,x(angle),height-10*ratio)}
  ctx.strokeStyle=colors.orange;ctx.lineWidth=2.2*ratio;ctx.beginPath();samples.forEach(([angle,value],index)=>index?ctx.lineTo(x(angle),y(value)):ctx.moveTo(x(angle),y(value)));ctx.stroke();ctx.strokeStyle=colors.cyan;ctx.setLineDash([5*ratio,4*ratio]);ctx.beginPath();ctx.moveTo(left,y(model.directDeltaV));ctx.lineTo(left+pw,y(model.directDeltaV));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=colors.cyan;ctx.textAlign='left';ctx.fillText('direct from 1 AU',left+7*ratio,y(model.directDeltaV)-7*ratio);
  ctx.fillStyle='#fff';ctx.strokeStyle='#071014';ctx.lineWidth=2*ratio;ctx.beginPath();ctx.arc(x(Number(burnAngle.value)),y(model.totalDeltaV),5*ratio,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.save();ctx.translate(13*ratio,top+ph/2);ctx.rotate(-Math.PI/2);ctx.fillStyle=colors.muted;ctx.textAlign='center';ctx.fillText('total Δv (km/s)',0,0);ctx.restore();
}

function update(){
  model=solarOberthScenario({perihelionSolarRadii:Number(perihelion.value),targetVInfinity:Number(targetSpeed.value),burnAngleDeg:Number(burnAngle.value)});
  $('#perihelionOutput').textContent=`${Number(perihelion.value).toFixed(1)} R☉`;$('#targetSpeedOutput').textContent=`${targetSpeed.value} km/s`;$('#burnAngleOutput').textContent=`${burnAngle.value}°`;$('#injectionDv').textContent=fmt(model.injectionDeltaV);$('#oberthDv').textContent=fmt(model.burn.deltaV);$('#totalDv').textContent=fmt(model.totalDeltaV);$('#directDv').textContent=fmt(model.directDeltaV);
  const saving=model.directDeltaV-model.totalDeltaV;$('#saving').textContent=`${saving>=0?'+':'−'}${Math.abs(saving).toFixed(2)} km/s`;$('#saving').className=saving>=0?'status-good':'status-bad';$('#travelTime').textContent=`${Math.round(model.travelYears).toLocaleString()} yr`;const angle=Number(burnAngle.value),radiusAu=model.state.radius/AU_KM;
  $('#burnNote').textContent=angle===0?`Perihelion optimum: ${model.burn.initialSpeed.toFixed(1)} km/s before the burn; solar flux is ${model.fluxMultiple.toFixed(0)} times Earth's.`:angle===180?`At aphelion the spacecraft is back at 1 AU and slow. The dive adds no Oberth advantage here.`:`At ${radiusAu.toFixed(3)} AU the two-burn route costs ${model.penalty.toFixed(2)} km/s more than burning at perihelion.`;document.querySelectorAll('[data-angle]').forEach(button=>button.classList.toggle('accent',Number(button.dataset.angle)===angle));drawOrbit();drawChart();
}

[perihelion,targetSpeed,burnAngle].forEach(input=>input.addEventListener('input',update));document.querySelectorAll('[data-angle]').forEach(button=>button.addEventListener('click',()=>{burnAngle.value=button.dataset.angle;update()}));new ResizeObserver(()=>{drawOrbit();drawChart()}).observe($('#viewport'));new ResizeObserver(drawChart).observe($('#chartPanel'));update();
