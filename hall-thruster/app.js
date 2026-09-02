const $=selector=>document.querySelector(selector);
const canvas=$('#thrusterCanvas'),ctx=canvas.getContext('2d');
const colors={electron:'#54d6dd',neutral:'#b7c0c4',ion:'#ffb14e',field:'#ff766d',wall:'#567078',anode:'#d48b43',plume:'#b58cff'};
let progressValue=0,playing=false,lastFrame=0;

function canvasSize(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}return{width,height,ratio}}
const mix=(a,b,f)=>a+(b-a)*f;
const pointOnQuadratic=(a,b,c,t)=>[(1-t)**2*a[0]+2*(1-t)*t*b[0]+t**2*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t**2*c[1]];

function phaseAt(value){
  if(value<.16){const f=value/.16;return{stage:'emission',f,position:pointOnQuadratic([.78,.16],[.72,.27],[.59,.36],f),afterCollision:false}}
  if(value<.40){const f=(value-.16)/.24;return{stage:'hall',f,hallAngle:f*Math.PI*4,gyroAngle:f*Math.PI*40,position:[mix(.59,.43,f),.36],afterCollision:false}}
  if(value<.53){const f=(value-.40)/.13;return{stage:'ionization',f,position:[.43,.36],afterCollision:f>.48}}
  if(value<.68){const f=(value-.53)/.15;return{stage:'anode',f,position:[mix(.43,.205,f),.36+.028*Math.sin(f*Math.PI*6)*(1-f)],afterCollision:true}}
  if(value<.87){const f=(value-.68)/.19;return{stage:'acceleration',f,ionPosition:[.43+.485*f*f,.36],afterCollision:true}}
  const f=(value-.87)/.13,ionPosition=[.89+.07*f,.36];return{stage:'neutralization',f,ionPosition,electronPosition:pointOnQuadratic([.78,.16],[.84,.25],ionPosition,f),afterCollision:true};
}

function arrow(x1,y1,x2,y2,color,label,scale){const angle=Math.atan2(y2-y1,x2-x1);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.4*scale;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-8*scale*Math.cos(angle-.45),y2-8*scale*Math.sin(angle-.45));ctx.lineTo(x2-8*scale*Math.cos(angle+.45),y2-8*scale*Math.sin(angle+.45));ctx.closePath();ctx.fill();if(label){ctx.font=`${10*scale}px ui-monospace,monospace`;ctx.fillText(label,(x1+x2)/2+5*scale,(y1+y2)/2-5*scale)}}
function particle(position,color,label,radius,project,scale){const [x,y]=project(position);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10*scale;ctx.beginPath();ctx.arc(x,y,radius*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#071014';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(8,radius*1.35)*scale}px ui-monospace,monospace`;ctx.fillText(label,x,y+.5*scale);ctx.textAlign='left';ctx.textBaseline='alphabetic'}
function label(text,position,project,scale,color='#dce9e8'){const [x,y]=project(position);ctx.fillStyle=color;ctx.font=`600 ${10*scale}px ui-monospace,monospace`;ctx.fillText(text,x,y)}

function drawCircuit(width,height,ratio){
  ctx.strokeStyle=colors.field;ctx.lineWidth=1.5*ratio;ctx.beginPath();ctx.moveTo(.16*width,.36*height);ctx.lineTo(.09*width,.36*height);ctx.lineTo(.09*width,.105*height);ctx.lineTo(.42*width,.105*height);ctx.moveTo(.55*width,.105*height);ctx.lineTo(.69*width,.105*height);ctx.lineTo(.69*width,.16*height);ctx.lineTo(.745*width,.16*height);ctx.stroke();
  ctx.fillStyle='rgba(255,118,109,.10)';ctx.fillRect(.42*width,.055*height,.13*width,.10*height);ctx.strokeRect(.42*width,.055*height,.13*width,.10*height);ctx.fillStyle=colors.field;ctx.font=`700 ${11*ratio}px ui-monospace,monospace`;ctx.fillText('+   V_d   −',.445*width,.095*height);ctx.font=`600 ${9*ratio}px ui-monospace,monospace`;ctx.fillText('DC discharge supply',.425*width,.135*height);arrow(.31*width,.105*height,.20*width,.105*height,colors.field,'conventional I_d',ratio);
}

function drawHallInset(phase,width,height,ratio){
  const cx=.82*width,cy=.69*height,outer=.125*height,inner=.064*height,orbitRadius=(outer+inner)/2;ctx.fillStyle='rgba(5,12,15,.88)';ctx.beginPath();ctx.arc(cx,cy,outer+13*ratio,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colors.wall;ctx.lineWidth=(outer-inner);ctx.beginPath();ctx.arc(cx,cy,(outer+inner)/2,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=colors.electron;ctx.lineWidth=1.6*ratio;ctx.beginPath();ctx.arc(cx,cy,orbitRadius,-.35*Math.PI,1.48*Math.PI);ctx.stroke();arrow(cx-.035*width,cy-orbitRadius,cx+.035*width,cy-orbitRadius,colors.electron,'',ratio);
  const angle=phase.stage==='hall'?phase.hallAngle:-.5*Math.PI,gyroAngle=phase.stage==='hall'?phase.gyroAngle:0,guidingX=cx+orbitRadius*Math.cos(angle),guidingY=cy+orbitRadius*Math.sin(angle),gyroRadius=6*ratio,electronX=guidingX+gyroRadius*Math.cos(gyroAngle),electronY=guidingY+gyroRadius*Math.sin(gyroAngle);ctx.strokeStyle='rgba(84,214,221,.7)';ctx.lineWidth=1*ratio;ctx.beginPath();ctx.arc(guidingX,guidingY,gyroRadius,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#dce9e8';ctx.beginPath();ctx.arc(guidingX,guidingY,1.5*ratio,0,Math.PI*2);ctx.fill();particle([electronX/width,electronY/height],colors.electron,'−',5,([x,y])=>[x*width,y*height],ratio);ctx.fillStyle=colors.electron;ctx.font=`600 ${9*ratio}px ui-monospace,monospace`;ctx.fillText('looking downstream',cx-outer,cy+outer+18*ratio);ctx.fillText('bulk E×B drift + small gyromotion',cx-outer,cy+outer+31*ratio);
}

function drawAxialHallMotion(phase,width,height,ratio){
  if(phase.stage!=='hall')return;
  const cycle=((phase.hallAngle/(2*Math.PI))%1+1)%1,x=.585*width,upper=.36*height,lower=.64*height;
  for(let index=0;index<3;index++){
    const outward=(cycle+index/3)%1,inward=1-outward,outRadius=(4+15*outward)*ratio,inRadius=(4+15*inward)*ratio;
    ctx.strokeStyle=`rgba(84,214,221,${.75*(1-outward)})`;ctx.lineWidth=1.2*ratio;ctx.beginPath();ctx.arc(x,upper,outRadius,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(84,214,221,${.75*(1-inward)})`;ctx.beginPath();ctx.arc(x,lower,inRadius,0,Math.PI*2);ctx.stroke();
  }
  ctx.fillStyle=colors.electron;ctx.beginPath();ctx.arc(x,upper,3.2*ratio,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colors.electron;ctx.lineWidth=1.8*ratio;ctx.beginPath();ctx.arc(x,lower,8*ratio,0,Math.PI*2);ctx.moveTo(x-4*ratio,lower-4*ratio);ctx.lineTo(x+4*ratio,lower+4*ratio);ctx.moveTo(x+4*ratio,lower-4*ratio);ctx.lineTo(x-4*ratio,lower+4*ratio);ctx.stroke();
  ctx.fillStyle=colors.electron;ctx.font=`600 ${9*ratio}px ui-monospace,monospace`;ctx.fillText('bulk E×B: out of page',.49*width,.405*height);ctx.fillText('bulk E×B: into page',.49*width,.685*height);
}

function draw(){
  const {width,height,ratio}=canvasSize(),project=([x,y])=>[x*width,y*height],phase=phaseAt(progressValue);ctx.clearRect(0,0,width,height);
  drawCircuit(width,height,ratio);
  const plume=ctx.createLinearGradient(.65*width,0,.98*width,0);plume.addColorStop(0,'rgba(193,132,255,.34)');plume.addColorStop(.48,'rgba(154,103,255,.20)');plume.addColorStop(1,'rgba(116,87,214,0)');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(.65*width,.28*height);ctx.lineTo(.98*width,.18*height);ctx.lineTo(.98*width,.82*height);ctx.lineTo(.65*width,.72*height);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(84,214,221,.08)';ctx.beginPath();ctx.ellipse(.64*width,.50*height,.052*width,.25*height,0,0,Math.PI*2);ctx.fill();
  // Full axial-radial section through the annular channel: the two passages are
  // the upper and lower halves of the same ring, separated by the inner pole.
  ctx.fillStyle=colors.wall;ctx.fillRect(.14*width,.21*height,.54*width,.08*height);ctx.fillRect(.14*width,.71*height,.54*width,.08*height);ctx.fillStyle='#24383f';ctx.fillRect(.15*width,.29*height,.49*width,.14*height);ctx.fillRect(.15*width,.57*height,.49*width,.14*height);
  ctx.fillStyle='#486068';ctx.fillRect(.14*width,.43*height,.54*width,.14*height);label('inner magnetic pole',[.31,.52],project,ratio,'#a9babd');
  ctx.fillStyle='rgba(255,177,78,.10)';ctx.fillRect(.25*width,.29*height,.24*width,.14*height);ctx.fillRect(.25*width,.57*height,.24*width,.14*height);if(phase.stage!=='hall')label('ionization zone',[.31,.41],project,ratio,colors.ion);
  ctx.fillStyle='rgba(255,118,109,.09)';ctx.fillRect(.47*width,.29*height,.19*width,.14*height);ctx.fillRect(.47*width,.57*height,.19*width,.14*height);if(phase.stage!=='hall')label('stronger E / acceleration',[.48,.69],project,ratio,colors.field);
  ctx.fillStyle=colors.anode;ctx.fillRect(.16*width,.30*height,.055*width,.12*height);ctx.fillRect(.16*width,.58*height,.055*width,.12*height);label('ANODE + / Ar manifold',[.145,.18],project,ratio,colors.anode);label('upper annular-channel section',[.27,.27],project,ratio);label('lower annular-channel section',[.27,.75],project,ratio);
  ctx.fillStyle='#8b9ba0';ctx.fillRect(.745*width,.13*height,.10*width,.06*height);ctx.fillStyle=colors.electron;ctx.fillRect(.735*width,.15*height,.018*width,.02*height);label('CATHODE −',[.73,.205],project,ratio,colors.electron);
  for(const y of [.35,.65])arrow(.24*width,y*height,.57*width,y*height,colors.field,'',ratio);label('axial E',[.39,.33],project,ratio,colors.field);
  arrow(.64*width,.43*height,.64*width,.295*height,colors.electron,'+Bᵣ',ratio);arrow(.64*width,.57*height,.64*width,.705*height,colors.electron,'−Bᵣ',ratio);
  drawAxialHallMotion(phase,width,height,ratio);
  drawHallInset(phase,width,height,ratio);
  [[.26,.34],[.36,.38],[.48,.34],[.26,.63],[.38,.67],[.52,.62]].forEach(p=>particle(p,colors.neutral,'Ar',7,project,ratio));
  if(phase.stage==='emission')particle(phase.position,colors.electron,'−',6,project,ratio);
  if(phase.stage==='ionization'){
    const pulse=Math.sin(Math.PI*phase.f);particle([.43,.36],phase.afterCollision?colors.ion:colors.neutral,phase.afterCollision?'+':'Ar',phase.afterCollision?9:10,project,ratio);particle([.43-.025*pulse,.36-.03*pulse],colors.electron,'−',5,project,ratio);if(phase.afterCollision)particle([.43+.028*pulse,.36+.03*pulse],colors.electron,'−',5,project,ratio);
    const [cx,cy]=project([.43,.36]);ctx.strokeStyle=colors.ion;ctx.globalAlpha=pulse;ctx.beginPath();ctx.arc(cx,cy,(15+18*pulse)*ratio,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  if(phase.stage==='anode'){particle([.43,.36],colors.ion,'+',9,project,ratio);particle(phase.position,colors.electron,'−',4.5,project,ratio);ctx.strokeStyle=colors.electron;ctx.globalAlpha=.45;ctx.beginPath();for(let i=0;i<=50;i++){const f=i/50,p=[mix(.43,.205,f),.36+.028*Math.sin(f*Math.PI*6)*(1-f)],[x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.globalAlpha=1}
  if(phase.stage==='acceleration'){particle([.205,.36],colors.electron,'−',4.5,project,ratio);particle(phase.ionPosition,colors.ion,'+',9,project,ratio);arrow(.66*width,.40*height,.90*width,.40*height,colors.ion,'Ar⁺ acceleration',ratio)}
  if(phase.stage==='neutralization'){particle(phase.ionPosition,colors.ion,'+',9,project,ratio);particle(phase.electronPosition,colors.electron,'−',5,project,ratio);if(phase.f>.82)label('charge-neutral plume: Ar⁺ + e⁻',[.77,.44],project,ratio,colors.plume)}
  label('outward radial B on both sides of centerline',[.40,.92],project,ratio,colors.electron);label('Ar⁺ ion beam →',[.84,.31],project,ratio,colors.ion);label('purple glow: excited Ar / Ar⁺',[.72,.80],project,ratio,colors.plume);
}

function stageNote(phase){
  if(phase.stage==='emission')return'An external hollow cathode emits electrons. Some enter the discharge channel; others later neutralize the outgoing ion beam.';
  if(phase.stage==='hall')return'The face-on inset follows the guiding-center drift around the annulus. Simultaneously, expanding ⊙ rings in the upper channel show bulk electron motion out of the axial-cutout page, while contracting ⊗ rings in the lower channel show motion into it. Small gyromotion is superimposed in the inset.';
  if(phase.stage==='ionization')return'Upstream of the peak electric field, the electron strikes neutral Ar and produces Ar⁺ and a second electron. The broad ionization and acceleration zones overlap.';
  if(phase.stage==='anode')return'After ionization the tracked electron has less energy and momentum. Collisions and anomalous cross-field transport allow it to move to the positive anode.';
  if(phase.stage==='acceleration')return'The magnetized Hall current sustains the axial potential drop. Heavy Ar⁺ is weakly magnetized and accelerates outward through the electric field.';
  return'Additional cathode electrons accompany the positive ion beam and neutralize its net charge; this does not require immediate recombination into neutral atoms.';
}
function setStage(){const phase=phaseAt(progressValue);const names={emission:'Cathode electron emission',hall:'Bulk E × B Hall drift',ionization:'Electron-impact argon ionization',anode:'Electron transport to anode',acceleration:'Ar⁺ acceleration',neutralization:'Plume neutralization'};$('#progressOutput').textContent=names[phase.stage];$('#phaseNote').textContent=stageNote(phase);document.querySelectorAll('[data-stage]').forEach(item=>item.classList.toggle('active',item.dataset.stage===phase.stage));draw()}

$('#play').addEventListener('click',()=>{if(progressValue>=1)progressValue=0;playing=!playing;$('#play').textContent=playing?'Pause':'Play';lastFrame=performance.now();setStage()});$('#reset').addEventListener('click',()=>{playing=false;$('#play').textContent='Play';progressValue=0;setStage()});new ResizeObserver(draw).observe($('#viewport'));
function animate(time){if(playing){const elapsed=Math.min(50,time-lastFrame);lastFrame=time;progressValue+=elapsed*.000075;if(progressValue>=1){progressValue=1;playing=false;$('#play').textContent='Replay'}setStage()}requestAnimationFrame(animate)}
setStage();requestAnimationFrame(animate);
