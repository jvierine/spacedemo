import {ARGON_IONIZATION_ENERGY_EV,hallThrusterState} from '../js/hall-thruster.js?v=20260902-1';

const $=selector=>document.querySelector(selector);
const canvas=$('#thrusterCanvas'),ctx=canvas.getContext('2d'),progress=$('#progress'),voltage=$('#voltage'),magneticField=$('#magneticField'),electronEnergy=$('#electronEnergy');
const colors={electron:'#54d6dd',neutral:'#b7c0c4',ion:'#ffb14e',field:'#ff766d',wall:'#567078',anode:'#d48b43',plume:'#7dcad5'};
let model,playing=false,lastFrame=0;

function canvasSize(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}return{width,height,ratio}}
const mix=(a,b,f)=>a+(b-a)*f;
const pointOnQuadratic=(a,b,c,t)=>[(1-t)**2*a[0]+2*(1-t)*t*b[0]+t**2*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t**2*c[1]];
const formatMomentum=value=>`${value.toExponential(2)} kg·m/s`;

function phaseAt(value){
  if(value<.16){const f=value/.16;return{stage:'emission',f,position:pointOnQuadratic([.78,.16],[.72,.27],[.64,.36],f),afterCollision:false}}
  if(value<.40){const f=(value-.16)/.24,angle=f*Math.PI*8;return{stage:'hall',f,position:[.64+.026*Math.cos(angle),.36+.065*Math.sin(angle)],afterCollision:false}}
  if(value<.53){const f=(value-.40)/.13;return{stage:'ionization',f,position:[.625,.36],afterCollision:f>.48}}
  if(value<.68){const f=(value-.53)/.15;return{stage:'anode',f,position:[mix(.625,.205,f),.36+.028*Math.sin(f*Math.PI*6)*(1-f)],afterCollision:true}}
  if(value<.87){const f=(value-.68)/.19;return{stage:'acceleration',f,ionPosition:[.625+.29*f*f,.36],afterCollision:true}}
  const f=(value-.87)/.13,ionPosition=[.89+.07*f,.36];return{stage:'neutralization',f,ionPosition,electronPosition:pointOnQuadratic([.78,.16],[.84,.25],ionPosition,f),afterCollision:true};
}

function arrow(x1,y1,x2,y2,color,label,scale){const angle=Math.atan2(y2-y1,x2-x1);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.4*scale;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-8*scale*Math.cos(angle-.45),y2-8*scale*Math.sin(angle-.45));ctx.lineTo(x2-8*scale*Math.cos(angle+.45),y2-8*scale*Math.sin(angle+.45));ctx.closePath();ctx.fill();if(label){ctx.font=`${10*scale}px ui-monospace,monospace`;ctx.fillText(label,(x1+x2)/2+5*scale,(y1+y2)/2-5*scale)}}
function particle(position,color,label,radius,project,scale){const [x,y]=project(position);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10*scale;ctx.beginPath();ctx.arc(x,y,radius*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#071014';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(8,radius*1.35)*scale}px ui-monospace,monospace`;ctx.fillText(label,x,y+.5*scale);ctx.textAlign='left';ctx.textBaseline='alphabetic'}
function label(text,position,project,scale,color='#dce9e8'){const [x,y]=project(position);ctx.fillStyle=color;ctx.font=`600 ${10*scale}px ui-monospace,monospace`;ctx.fillText(text,x,y)}

function draw(){
  const {width,height,ratio}=canvasSize(),project=([x,y])=>[x*width,y*height],phase=phaseAt(Number(progress.value)/1000);ctx.clearRect(0,0,width,height);
  const plume=ctx.createLinearGradient(.65*width,0,.98*width,0);plume.addColorStop(0,'rgba(84,214,221,.20)');plume.addColorStop(1,'rgba(84,214,221,0)');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(.65*width,.28*height);ctx.lineTo(.98*width,.18*height);ctx.lineTo(.98*width,.82*height);ctx.lineTo(.65*width,.72*height);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(84,214,221,.08)';ctx.beginPath();ctx.ellipse(.64*width,.50*height,.052*width,.25*height,0,0,Math.PI*2);ctx.fill();
  // Full axial-radial section through the annular channel: the two passages are
  // the upper and lower halves of the same ring, separated by the inner pole.
  ctx.fillStyle=colors.wall;ctx.fillRect(.14*width,.21*height,.54*width,.08*height);ctx.fillRect(.14*width,.71*height,.54*width,.08*height);ctx.fillStyle='#24383f';ctx.fillRect(.15*width,.29*height,.49*width,.14*height);ctx.fillRect(.15*width,.57*height,.49*width,.14*height);
  ctx.fillStyle='#486068';ctx.fillRect(.14*width,.43*height,.54*width,.14*height);label('inner magnetic pole',[.31,.52],project,ratio,'#a9babd');
  ctx.fillStyle=colors.anode;ctx.fillRect(.16*width,.30*height,.055*width,.12*height);ctx.fillRect(.16*width,.58*height,.055*width,.12*height);label('+ annular anode / Ar manifold',[.145,.18],project,ratio,colors.anode);label('upper annular-channel section',[.27,.27],project,ratio);label('lower annular-channel section',[.27,.75],project,ratio);
  ctx.fillStyle='#8b9ba0';ctx.fillRect(.745*width,.13*height,.10*width,.06*height);ctx.fillStyle=colors.electron;ctx.fillRect(.735*width,.15*height,.018*width,.02*height);label('hollow cathode',[.73,.11],project,ratio,colors.electron);
  for(const y of [.35,.65])arrow(.24*width,y*height,.57*width,y*height,colors.field,'',ratio);label('axial E',[.39,.33],project,ratio,colors.field);
  arrow(.64*width,.43*height,.64*width,.295*height,colors.electron,'+Bᵣ',ratio);arrow(.64*width,.57*height,.64*width,.705*height,colors.electron,'−Bᵣ',ratio);
  ctx.strokeStyle='rgba(84,214,221,.62)';ctx.lineWidth=1.4*ratio;ctx.setLineDash([5*ratio,4*ratio]);ctx.beginPath();ctx.ellipse(.64*width,.36*height,.027*width,.067*height,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);label('projected azimuthal Hall orbit',[.53,.84],project,ratio,colors.electron);
  [[.26,.34],[.36,.38],[.48,.34],[.26,.63],[.38,.67],[.52,.62]].forEach(p=>particle(p,colors.neutral,'Ar',7,project,ratio));
  if(['emission','hall'].includes(phase.stage))particle(phase.position,colors.electron,'−',6,project,ratio);
  if(phase.stage==='ionization'){
    const pulse=Math.sin(Math.PI*phase.f);particle([.625,.36],phase.afterCollision?colors.ion:colors.neutral,phase.afterCollision?'+':'Ar',phase.afterCollision?9:10,project,ratio);particle([.625-.025*pulse,.36-.03*pulse],colors.electron,'−',5,project,ratio);if(phase.afterCollision)particle([.625+.028*pulse,.36+.03*pulse],colors.electron,'−',5,project,ratio);
    const [cx,cy]=project([.625,.36]);ctx.strokeStyle=colors.ion;ctx.globalAlpha=pulse;ctx.beginPath();ctx.arc(cx,cy,(15+18*pulse)*ratio,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  if(phase.stage==='anode'){particle([.625,.36],colors.ion,'+',9,project,ratio);particle(phase.position,colors.electron,'−',4.5,project,ratio);ctx.strokeStyle=colors.electron;ctx.globalAlpha=.45;ctx.beginPath();for(let i=0;i<=50;i++){const f=i/50,p=[mix(.625,.205,f),.36+.028*Math.sin(f*Math.PI*6)*(1-f)],[x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.globalAlpha=1}
  if(phase.stage==='acceleration'){particle([.205,.36],colors.electron,'−',4.5,project,ratio);particle(phase.ionPosition,colors.ion,'+',9,project,ratio);arrow(.66*width,.40*height,.90*width,.40*height,colors.ion,'Ar⁺ acceleration',ratio)}
  if(phase.stage==='neutralization'){particle(phase.ionPosition,colors.ion,'+',9,project,ratio);particle(phase.electronPosition,colors.electron,'−',5,project,ratio);if(phase.f>.82)label('charge-neutral plume: Ar⁺ + e⁻',[.77,.44],project,ratio,colors.plume)}
  label('outward radial B on both sides of centerline',[.49,.92],project,ratio,colors.electron);label('ion beam →',[.84,.31],project,ratio,colors.ion);
}

function stageNote(phase){
  if(phase.stage==='emission')return'An external hollow cathode emits electrons. Some enter the discharge channel; others later neutralize the outgoing ion beam.';
  if(phase.stage==='hall')return'The radial magnetic field magnetizes the electron. Gyromotion plus axial E × B drift produces the azimuthal Hall current—the projected “electron vortex” shown here.';
  if(phase.stage==='ionization')return`The electron strikes neutral Ar. Removing one electron costs at least ${ARGON_IONIZATION_ENERGY_EV.toFixed(4)} eV, producing Ar⁺ and a second electron.`;
  if(phase.stage==='anode')return`After ionization the tracked electron has ${model.postCollisionEnergyEv.toFixed(2)} eV and less momentum. Collisions and anomalous cross-field transport allow it to move to the positive anode.`;
  if(phase.stage==='acceleration')return'The magnetized Hall current sustains the axial potential drop. Heavy Ar⁺ is weakly magnetized and accelerates outward through the electric field.';
  return'Additional cathode electrons accompany the positive ion beam and neutralize its net charge; this does not require immediate recombination into neutral atoms.';
}
function setStage(){const phase=phaseAt(Number(progress.value)/1000);const names={emission:'Cathode electron emission',hall:'Magnetized Hall-current orbit',ionization:'Electron-impact argon ionization',anode:'Electron transport to anode',acceleration:'Ar⁺ acceleration',neutralization:'Plume neutralization'};$('#progressOutput').textContent=names[phase.stage];$('#phaseNote').textContent=stageNote(phase);document.querySelectorAll('[data-stage]').forEach(item=>item.classList.toggle('active',item.dataset.stage===phase.stage));draw()}
function updateModel(){model=hallThrusterState({dischargeVoltageV:Number(voltage.value),radialMagneticFieldT:Number(magneticField.value)/1000,electronEnergyEv:Number(electronEnergy.value)});$('#voltageOutput').textContent=`${voltage.value} V`;$('#magneticFieldOutput').textContent=`${magneticField.value} mT`;$('#electronEnergyOutput').textContent=`${electronEnergy.value} eV`;$('#gyrofrequency').textContent=`${(model.cyclotronFrequencyHz/1e6).toFixed(0)} MHz`;$('#larmorRadius').textContent=`${(model.electronLarmorRadiusM*1000).toFixed(2)} mm`;$('#driftSpeed').textContent=`${(model.exbDriftSpeedMs/1000).toFixed(0)} km/s`;$('#ionSpeed').textContent=`${(model.ionSpeedMs/1000).toFixed(1)} km/s`;$('#specificImpulse').textContent=`${Math.round(model.idealSpecificImpulseS).toLocaleString()} s`;$('#momentumBefore').textContent=formatMomentum(model.electronMomentumBefore);$('#momentumAfter').textContent=formatMomentum(model.electronMomentumAfter);setStage()}

[voltage,magneticField,electronEnergy].forEach(input=>input.addEventListener('input',updateModel));progress.addEventListener('input',()=>{playing=false;$('#play').textContent='Play';setStage()});$('#play').addEventListener('click',()=>{if(Number(progress.value)>=1000)progress.value='0';playing=!playing;$('#play').textContent=playing?'Pause':'Play';lastFrame=performance.now()});$('#reset').addEventListener('click',()=>{playing=false;$('#play').textContent='Play';progress.value='0';setStage()});new ResizeObserver(draw).observe($('#viewport'));
function animate(time){if(playing){const elapsed=Math.min(50,time-lastFrame);lastFrame=time;let value=Number(progress.value)+elapsed*.075;if(value>=1000){value=1000;playing=false;$('#play').textContent='Replay'}progress.value=String(value);setStage()}requestAnimationFrame(animate)}
updateModel();requestAnimationFrame(animate);
