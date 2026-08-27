import {AU_KM,COMET_IMPACT_DAY,DAY_SECONDS,EARTH_YEAR_DAYS,MARS_RADIUS_AU,MARS_YEAR_DAYS,SUN_MU_KM3_S2,cometState,earthState,hohmannEarthMars,magnitude,marsState,sampleTrajectory,solveLambert,subtract} from '../js/lambert.js?v=20260827-2';

const $=selector=>document.querySelector(selector);
const scenario=$('#scenario'),leadTime=$('#leadTime'),launchDay=$('#launchDay'),marsDeparture=$('#marsDeparture'),marsTravel=$('#marsTravel'),progress=$('#progress');
const orbitCanvas=$('#orbitCanvas'),orbitContext=orbitCanvas.getContext('2d'),mapCanvas=$('#porkchopCanvas'),mapContext=mapCanvas.getContext('2d');
const exerciseLeads=[5,10,20,40,365],colors={earth:'#54d6dd',target:'#ff766d',transfer:'#ffb14e',muted:'#90a1a8',green:'#8bd99d'};
let model=null,playing=false,lastFrame=0,mapData=null,mapGeometry=null,mapWorker=null,mapJob=0,mapCalculatingKind=null;

const format=value=>Number.isFinite(value)?value.toFixed(value>=10?1:2):'—';
const positionAt=(points,fraction)=>{
  const scaled=Math.max(0,Math.min(1,fraction))*(points.length-1),index=Math.min(points.length-2,Math.floor(scaled)),mix=scaled-index;
  return points[index].map((value,axis)=>value+(points[index+1][axis]-value)*mix);
};
function setCanvasSize(canvas){
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  return {width,height,ratio};
}

function solveComet(lead,launch,withTrajectory=true){
  const arrivalDay=COMET_IMPACT_DAY-lead,timeDays=arrivalDay-launch;
  if(timeDays<20)return null;
  try{
    const earth=earthState(launch),target=cometState(arrivalDay),solution=solveLambert(earth.position,target.position,timeDays*DAY_SECONDS);
    const departureVInfinity=magnitude(subtract(solution.departureVelocity,earth.velocity)),arrivalVInfinity=magnitude(subtract(solution.arrivalVelocity,target.velocity));
    const result={kind:'comet',launch,arrivalDay,timeDays,lead,departureVInfinity,arrivalVInfinity,c3:departureVInfinity**2,earth,target};
    if(withTrajectory){result.trajectory=sampleTrajectory({position:earth.position,velocity:solution.departureVelocity},timeDays*DAY_SECONDS,160);result.cometTrajectory=[];for(let index=0;index<=120;index++)result.cometTrajectory.push(cometState(launch+(COMET_IMPACT_DAY-launch)*index/120).position)}
    return result;
  }catch{return null}
}

function solveMars(departureDay=684,timeDays=259,useAnalytic=false){
  const transfer=hohmannEarthMars(),samples=180,trajectory=[];
  if(!useAnalytic){
    try{const earth=earthState(departureDay),target=marsState(departureDay+timeDays),solution=solveLambert(earth.position,target.position,timeDays*DAY_SECONDS),departureVInfinity=magnitude(subtract(solution.departureVelocity,earth.velocity)),arrivalVInfinity=magnitude(subtract(solution.arrivalVelocity,target.velocity));return {kind:'mars',launch:departureDay,arrivalDay:departureDay+timeDays,timeDays,departureVInfinity,arrivalVInfinity,c3:departureVInfinity**2,trajectory:sampleTrajectory({position:earth.position,velocity:solution.departureVelocity},timeDays*DAY_SECONDS,180)}}catch{return null}
  }
  const departureAngle=Math.PI*2*departureDay/EARTH_YEAR_DAYS,c=Math.cos(departureAngle),s=Math.sin(departureAngle);
  for(let index=0;index<=samples;index+=1){
    const anomaly=Math.PI*index/samples,radius=transfer.a*(1-transfer.e**2)/(1+transfer.e*Math.cos(anomaly));
    const x=radius*Math.cos(anomaly),y=radius*Math.sin(anomaly);trajectory.push([x*c-y*s,x*s+y*c,0]);
  }
  return {kind:'mars',launch:departureDay,arrivalDay:departureDay+transfer.timeDays,timeDays:transfer.timeDays,departureVInfinity:transfer.departureVInfinity,arrivalVInfinity:transfer.arrivalVInfinity,c3:transfer.departureVInfinity**2,trajectory,transfer};
}

function updateModel(resetProgress=true){
  const isComet=scenario.value==='comet';
  $('#cometControls').hidden=!isComet;$('#marsControls').hidden=isComet;
  if(isComet){
    const lead=Number(leadTime.value),arrival=COMET_IMPACT_DAY-lead;
    launchDay.max=String(arrival-20);if(Number(launchDay.value)>arrival-20)launchDay.value=String(arrival-20);
    model=solveComet(lead,Number(launchDay.value));
    $('#scenarioNote').textContent='Intercept the lecture-note comet before its day-2200 Earth impact. Different flight times can connect the same endpoints with very different energy.';
    $('#scenarioEquation').innerHTML='\\(\\mathbf r_2=\\mathbf r_c(2200-L),\\quad \\Delta t=2200-L-t_1\\)';
  }else{
    model=solveMars(Number(marsDeparture.value),Number(marsTravel.value));
    $('#scenarioNote').textContent='Search a repeating Earth–Mars launch window. The low-energy valley passes through the Hohmann minimum-energy transfer.';
    $('#scenarioEquation').innerHTML='\\(a_t=\\tfrac12(r_\\oplus+r_{\\mathrm M}),\\quad \\Delta t=\\pi\\sqrt{a_t^3/\\mu_\\odot}\\)';
  }
  if(resetProgress)progress.value='0';
  updateReadouts();render();calculateMap(isComet?'comet':'mars');
  if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([$('#scenarioEquation')]);
}

function updateReadouts(){
  $('#leadTimeOutput').textContent=`${leadTime.value} days`;$('#launchDayOutput').textContent=`day ${launchDay.value}`;$('#marsDepartureOutput').textContent=`day ${marsDeparture.value}`;$('#marsTravelOutput').textContent=`${marsTravel.value} days`;$('#progressOutput').textContent=`${(Number(progress.value)/10).toFixed(1)}%`;
  const valid=Boolean(model);$('#warning').textContent=valid?'':'No single-revolution, short-way solution for this selection.';
  const values=valid?model:{};
  $('#departure').textContent=valid?`day ${values.launch.toFixed(0)}`:'—';
  $('#arrival').textContent=valid?`${model.kind==='mars'?'Mars · ':''}day ${values.arrivalDay.toFixed(0)}`:'—';
  $('#flightTime').textContent=valid?`${values.timeDays.toFixed(1)} d`:'—';
  $('#departureVInfinity').textContent=valid?`${format(values.departureVInfinity)} km/s`:'—';
  $('#arrivalVInfinity').textContent=valid?`${format(values.arrivalVInfinity)} km/s`:'—';
  $('#c3').textContent=valid?`${format(values.c3)} km²/s²`:'—';
}

function drawOrbit(){
  const {width,height,ratio}=setCanvasSize(orbitCanvas),ctx=orbitContext;ctx.clearRect(0,0,width,height);
  const padding=44*ratio,maximumRadius=model?.kind==='comet'?Math.max(...model.cometTrajectory.map(magnitude),...model.trajectory.map(magnitude)):1.65*AU_KM,extent=Math.max(1.82*AU_KM,maximumRadius*1.08),scale=Math.min((width-2*padding),(height-2*padding))/(2*extent),cx=width/2,cy=height/2;
  const project=point=>[cx+point[0]*scale,cy-point[1]*scale];
  const circle=(radius,color,alpha=.35)=>{ctx.beginPath();ctx.arc(cx,cy,radius*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=ratio;ctx.stroke();ctx.globalAlpha=1};
  circle(AU_KM,colors.earth);if(model?.kind==='mars')circle(MARS_RADIUS_AU*AU_KM,colors.target);
  ctx.fillStyle='#ffe09a';ctx.shadowColor='#ffe09a';ctx.shadowBlur=15*ratio;ctx.beginPath();ctx.arc(cx,cy,7*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(!model)return;
  ctx.beginPath();model.trajectory.forEach((point,index)=>{const [x,y]=project(point);index?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=colors.transfer;ctx.lineWidth=2.5*ratio;ctx.stroke();
  const fraction=Number(progress.value)/1000,current=positionAt(model.trajectory,fraction);
  let earth,target;
  if(model.kind==='comet'){
    const day=model.launch+model.timeDays*fraction;earth=earthState(day).position;target=cometState(day).position;
    ctx.beginPath();model.cometTrajectory.forEach((point,index)=>{const [x,y]=project(point);index?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='rgba(255,118,109,.45)';ctx.lineWidth=ratio;ctx.setLineDash([4*ratio,4*ratio]);ctx.stroke();ctx.setLineDash([]);
  }else{
    const day=model.launch+model.timeDays*fraction;earth=earthState(day).position;target=marsState(day).position;
  }
  const marker=(point,color,radius,label,dx,dy)=>{const [x,y]=project(point);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=9*ratio;ctx.beginPath();ctx.arc(x,y,radius*ratio,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=colors.muted;ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.fillText(label,x+dx*ratio,y+dy*ratio)};
  marker(earth,colors.earth,4,'Earth',8,-10);marker(target,colors.target,4,model.kind==='mars'?'Mars':'comet',8,15);marker(current,colors.transfer,3,'spacecraft',8,3);
  ctx.fillStyle=colors.muted;ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.fillText(`${(magnitude(current)/AU_KM).toFixed(2)} AU`,18*ratio,height-18*ratio);
}

function heatColor(speed,kind){
  if(!Number.isFinite(speed))return '#172126';const minimum=kind==='mars'?2:4,maximum=kind==='mars'?20:70,t=Math.max(0,Math.min(1,(speed-minimum)/(maximum-minimum)));
  const stops=[[84,214,221],[139,217,157],[255,177,78],[255,118,109]],position=t*(stops.length-1),index=Math.min(stops.length-2,Math.floor(position)),mix=position-index;
  return `rgb(${stops[index].map((value,axis)=>Math.round(value+(stops[index+1][axis]-value)*mix)).join(',')})`;
}
function calculateMap(kind){
  if(mapData?.kind===kind)return drawMap();if(mapCalculatingKind===kind)return;const label=kind==='mars'?'Earth–Mars':'Comet',job=++mapJob;mapCalculatingKind=kind;$('#porkchopTitle').textContent=`${label} pork-chop · calculating in browser…`;if(mapWorker){mapWorker.terminate();mapWorker=null}if(kind==='mars'){calculateMarsMap(job);return}const worker=new Worker('./porkchop-worker.js?v=20260827-8',{type:'module'});mapWorker=worker;worker.addEventListener('message',event=>{if(mapWorker!==worker||job!==mapJob)return;if(event.data.status==='progress'){$('#porkchopTitle').textContent=`${label} pork-chop · ${Math.round(100*(event.data.row+1)/event.data.rows)}%`;return}mapData=event.data;worker.terminate();mapWorker=null;mapCalculatingKind=null;drawMap()});worker.addEventListener('error',()=>{if(mapWorker!==worker)return;worker.terminate();mapWorker=null;mapCalculatingKind=null;$('#warning').textContent='The pork-chop calculation could not start in this browser.'});worker.postMessage({kind});
}
function calculateMarsMap(job){
  const columns=44,rows=28,minimumY=30,maximumY=500,maximumX=4000,cells=[];let row=0;
  const step=()=>{if(job!==mapJob||scenario.value!=='mars')return;const travel=maximumY-(maximumY-minimumY)*row/(rows-1),speeds=[];for(let column=0;column<columns;column+=1){const departureDay=maximumX*column/(columns-1),earth=earthState(departureDay),target=marsState(departureDay+travel);try{const solution=solveLambert(earth.position,target.position,travel*DAY_SECONDS);speeds.push(magnitude(subtract(solution.departureVelocity,earth.velocity)))}catch{speeds.push(null)}}cells.push(speeds);row+=1;$('#porkchopTitle').textContent=`Earth–Mars pork-chop · ${Math.round(100*row/rows)}%`;if(row<rows){setTimeout(step,0);return}mapData={kind:'mars',columns,rows,minimumY,maximumY,maximumX,cells};mapCalculatingKind=null;drawMap()};setTimeout(step,0);
}
function drawMap(){
  if(!mapData)return;
  const {width,height,ratio}=setCanvasSize(mapCanvas),ctx=mapContext,left=68*ratio,right=16*ratio,top=12*ratio,bottom=30*ratio,plotWidth=width-left-right,plotHeight=height-top-bottom,rowHeight=plotHeight/mapData.rows,columnWidth=plotWidth/mapData.columns;
  ctx.clearRect(0,0,width,height);ctx.font=`${10*ratio}px ui-monospace,monospace`;ctx.textBaseline='middle';
  mapData.cells.forEach((row,rowIndex)=>row.forEach((speed,column)=>{ctx.fillStyle=heatColor(speed,mapData.kind);ctx.fillRect(left+column*columnWidth,top+rowIndex*rowHeight,columnWidth+.5,rowHeight+.5)}));
  ctx.fillStyle=colors.muted;ctx.textAlign='right';
  let selectedX,selectedY,yLabel;
  if(mapData.kind==='comet'){
    $('#porkchopTitle').textContent='Comet pork-chop diagram';$('#porkchopCaption').textContent='Departure day × arrival day · color: Earth-departure v∞, 4–70 km/s (clipped). Click to choose.';yLabel='arrival day';
    for(const arrivalDay of [1835,1900,2000,2100,2195]){const lead=COMET_IMPACT_DAY-arrivalDay,y=top+plotHeight*(lead-mapData.minimumY)/(mapData.maximumY-mapData.minimumY);ctx.fillText(String(arrivalDay),left-7*ratio,y)}for(const lead of exerciseLeads){const y=top+plotHeight*(lead-mapData.minimumY)/(mapData.maximumY-mapData.minimumY);ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=.7*ratio;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+plotWidth,y);ctx.stroke()}
    selectedX=Number(launchDay.value);selectedY=Number(leadTime.value);
  }else{
    $('#porkchopTitle').textContent='Earth–Mars pork-chop diagram';$('#porkchopCaption').textContent='Departure day × travel time · color: Earth-departure v∞, 2–20 km/s (clipped). Click to choose.';yLabel='travel time (days)';
    for(const travel of [500,400,300,200,100,30]){const y=top+plotHeight*(mapData.maximumY-travel)/(mapData.maximumY-mapData.minimumY);ctx.fillText(String(travel),left-7*ratio,y)}selectedX=Number(marsDeparture.value);selectedY=mapData.maximumY-Number(marsTravel.value)+mapData.minimumY;
  }
  ctx.save();ctx.translate(10*ratio,top+plotHeight/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(yLabel,0,0);ctx.restore();ctx.textAlign='center';const ticks=mapData.kind==='mars'?[0,1000,2000,3000,4000]:[0,500,1000,1500,2000];for(const day of ticks){const x=left+plotWidth*day/mapData.maximumX;ctx.fillText(String(day),x,height-13*ratio)}ctx.fillText('departure day',left+plotWidth/2,height-2*ratio);
  const x=left+plotWidth*selectedX/mapData.maximumX,y=top+plotHeight*(selectedY-mapData.minimumY)/(mapData.maximumY-mapData.minimumY);
  ctx.strokeStyle='#fff';ctx.lineWidth=2*ratio;ctx.strokeRect(x-columnWidth/2,y-rowHeight/2,columnWidth,rowHeight);
  mapGeometry={left,top,plotWidth,plotHeight,rowHeight};
}

function render(){drawOrbit();drawMap();updateReadouts()}
scenario.addEventListener('change',()=>{mapData=null;updateModel()});leadTime.addEventListener('input',()=>updateModel());launchDay.addEventListener('input',()=>updateModel());marsDeparture.addEventListener('input',()=>updateModel());marsTravel.addEventListener('input',()=>updateModel());progress.addEventListener('input',()=>{playing=false;$('#play').textContent='Play';render()});
document.querySelectorAll('[data-lead]').forEach(button=>button.addEventListener('click',()=>{leadTime.value=button.dataset.lead;updateModel()}));
$('#hohmannPreset').addEventListener('click',()=>{const transfer=hohmannEarthMars(),relativeRate=Math.PI*2/MARS_YEAR_DAYS-Math.PI*2/EARTH_YEAR_DAYS,departure=(transfer.phaseAngle-Math.PI*2)/relativeRate;marsDeparture.value=String(Math.round(departure));marsTravel.value=String(Math.round(transfer.timeDays));model=solveMars(departure,transfer.timeDays,true);progress.value='0';updateReadouts();render()});
$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'Pause':'Play';lastFrame=performance.now()});
$('#reset').addEventListener('click',()=>{playing=false;$('#play').textContent='Play';progress.value='0';render()});
mapCanvas.addEventListener('pointerdown',event=>{
  if(!mapGeometry)return;const rect=mapCanvas.getBoundingClientRect(),sx=mapCanvas.width/rect.width,sy=mapCanvas.height/rect.height,x=(event.clientX-rect.left)*sx,y=(event.clientY-rect.top)*sy,{left,top,plotWidth,plotHeight}=mapGeometry;
  if(x<left||x>left+plotWidth||y<top||y>top+plotHeight)return;const selectedX=Math.round((x-left)/plotWidth*mapData.maximumX),fraction=(y-top)/plotHeight;if(mapData.kind==='comet'){const lead=Math.round(mapData.minimumY+fraction*(mapData.maximumY-mapData.minimumY)),arrival=COMET_IMPACT_DAY-lead;leadTime.value=String(lead);launchDay.value=String(Math.min(arrival-20,selectedX))}else{marsDeparture.value=String(selectedX);marsTravel.value=String(Math.round(mapData.maximumY-fraction*(mapData.maximumY-mapData.minimumY)))}updateModel();
});
new ResizeObserver(render).observe($('#viewport'));new ResizeObserver(drawMap).observe($('#porkchopPanel'));
function animate(time){if(playing&&model){const elapsed=Math.min(50,time-lastFrame);lastFrame=time;let value=Number(progress.value)+elapsed*.045;if(value>=1000){value=0}progress.value=String(value);render()}requestAnimationFrame(animate)}
updateModel();requestAnimationFrame(animate);
