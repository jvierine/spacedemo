import { VEHICLE_MODELS, stagingBudget } from '../js/staging.js?v=20260901-2';

const mission=document.querySelector('#mission'),editor=document.querySelector('#stageEditor'),rocket=document.querySelector('#rocket'),budgetEl=document.querySelector('#budget');
const vehicleSelect=document.querySelector('#vehiclePreset'),payloadInput=document.querySelector('#payload'),targetInput=document.querySelector('#target');
let currentModel=VEHICLE_MODELS.starship;

function formatMission(){mission.querySelector('[data-output="payload"]').textContent=`${Number(payloadInput.value).toLocaleString()} kg`;mission.querySelector('[data-output="target"]').textContent=`${Number(targetInput.value).toLocaleString()} m/s`}

function buildEditors(){
  editor.innerHTML='';
  currentModel.stages.forEach((stage,index)=>editor.insertAdjacentHTML('beforeend',`<article class="stage-card"><h3>Stage ${index+1} · ${stage.name}${index===currentModel.stages.length-1?' · final':''}</h3><p class="stage-spec">${stage.engines} · ${(stage.propellantKg/1000).toLocaleString()} t propellant</p><div class="stage-fields"><label>Wet kg<input data-stage="${index}" data-key="wetKg" type="number" min="1" value="${stage.wetKg}"></label><label>Dry kg<input data-stage="${index}" data-key="dryKg" type="number" min="1" value="${stage.dryKg}"></label><label>Isp s<input data-stage="${index}" data-key="ispS" type="number" min="1" value="${stage.ispS}"></label></div></article>`));
  editor.querySelectorAll('input').forEach(input=>input.addEventListener('input',update));
  update();
}

function getStages(){return [...editor.querySelectorAll('.stage-card')].map(card=>Object.fromEntries([...card.querySelectorAll('input')].map(input=>[input.dataset.key,Number(input.value)])))}

function singleRocketSvg(stages){
  const width=420,height=600,cx=185,bottom=520,totalHeight=currentModel.stages.reduce((sum,stage)=>sum+stage.heightM,0),drawHeight=410,maxDiameter=Math.max(...currentModel.stages.map(stage=>stage.diameterM));
  let y=bottom,shapes='',labels='';
  stages.forEach((stage,index)=>{
    const spec=currentModel.stages[index],stageHeight=drawHeight*spec.heightM/totalHeight,stageWidth=132*spec.diameterM/maxDiameter,left=cx-stageWidth/2,top=y-stageHeight,isTop=index===stages.length-1;
    if(isTop){const shoulder=top+Math.min(58,stageHeight*.3);shapes+=`<path class="vehicle-shell stage-shell-${index}" d="M ${cx} ${top} Q ${left} ${shoulder-8} ${left} ${shoulder} L ${left} ${y} L ${left+stageWidth} ${y} L ${left+stageWidth} ${shoulder} Q ${left+stageWidth} ${shoulder-8} ${cx} ${top} Z"/>`;}
    else shapes+=`<rect class="vehicle-shell stage-shell-${index}" x="${left}" y="${top}" width="${stageWidth}" height="${stageHeight}" rx="3"/>`;
    shapes+=`<line class="stage-seam" x1="${left}" y1="${y}" x2="${left+stageWidth}" y2="${y}"/>`;
    if(currentModel===VEHICLE_MODELS.saturnV)shapes+=`<rect class="saturn-band" x="${left}" y="${top+stageHeight*.54}" width="${stageWidth}" height="${Math.max(8,stageHeight*.11)}"/>`;
    const labelY=top+stageHeight*.52;labels+=`<line class="callout" x1="${left+stageWidth+4}" y1="${labelY}" x2="${cx+105}" y2="${labelY}"/><text class="rocket-label" x="${cx+112}" y="${labelY+4}">${spec.name} · ${(stage.wetKg/1000).toFixed(0)} t</text>`;
    y=top;
  });
  const baseWidth=132*currentModel.stages[0].diameterM/maxDiameter;
  return `<svg class="rocket-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${currentModel.name} rocket silhouette"><defs><linearGradient id="metal" x1="0" x2="1"><stop stop-color="#455b63"/><stop offset=".48" stop-color="#edf3f3"/><stop offset="1" stop-color="#40535a"/></linearGradient><linearGradient id="flame" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff7ca"/><stop offset=".35" stop-color="#ffb14e"/><stop offset="1" stop-color="#ff5533" stop-opacity="0"/></linearGradient></defs>${shapes}<path class="engine-skirt" d="M ${cx-baseWidth*.46} ${bottom} L ${cx-baseWidth*.58} ${bottom+24} L ${cx+baseWidth*.58} ${bottom+24} L ${cx+baseWidth*.46} ${bottom} Z"/><path fill="url(#flame)" d="M ${cx-baseWidth*.25} ${bottom+24} Q ${cx-baseWidth*.45} ${bottom+70} ${cx} ${bottom+78} Q ${cx+baseWidth*.45} ${bottom+70} ${cx+baseWidth*.25} ${bottom+24} Z"/>${labels}</svg>`;
}

function heavyRocketSvg(stages){
  const boosterMass=(stages[0].wetKg/3/1000).toFixed(0),upperMass=(stages[1].wetKg/1000).toFixed(0);
  return `<svg class="rocket-svg" viewBox="0 0 420 600" role="img" aria-label="Falcon Heavy three-core rocket silhouette"><defs><linearGradient id="metal" x1="0" x2="1"><stop stop-color="#42565d"/><stop offset=".5" stop-color="#f0f5f5"/><stop offset="1" stop-color="#3d5057"/></linearGradient><linearGradient id="flame" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff7ca"/><stop offset=".35" stop-color="#ffb14e"/><stop offset="1" stop-color="#ff5533" stop-opacity="0"/></linearGradient></defs><g class="heavy-side"><path class="vehicle-shell" d="M90 190 Q62 215 62 235 L62 500 H118 V235 Q118 215 90 190Z"/><path class="vehicle-shell" d="M280 190 Q252 215 252 235 L252 500 H308 V235 Q308 215 280 190Z"/></g><path class="vehicle-shell" d="M185 72 Q150 108 150 145 L150 220 H220 V145 Q220 108 185 72Z"/><rect class="vehicle-shell" x="145" y="220" width="80" height="280" rx="3"/><path class="engine-skirt" d="M145 500 L134 525 H236 L225 500Z"/><path class="engine-skirt" d="M62 500 L55 522 H125 L118 500Z"/><path class="engine-skirt" d="M252 500 L245 522 H315 L308 500Z"/><path fill="url(#flame)" d="M158 525 Q185 590 212 525Z"/><path fill="url(#flame)" d="M70 522 Q90 580 110 522Z"/><path fill="url(#flame)" d="M260 522 Q280 580 300 522Z"/><line class="callout" x1="225" y1="155" x2="330" y2="155"/><text class="rocket-label" x="336" y="159">Upper stage · ${upperMass} t</text><line class="callout" x1="308" y1="350" x2="330" y2="350"/><text class="rocket-label" x="336" y="354">3 cores · ${boosterMass} t each</text></svg>`;
}

function renderRocket(stages){rocket.innerHTML=currentModel.layout==='heavy'?heavyRocketSvg(stages):singleRocketSvg(stages)}

function update(){
  formatMission();const stages=getStages();if(!stages.length)return;
  const target=Number(targetInput.value),result=stagingBudget(stages,Number(payloadInput.value),target),margin=result.finalAvailable-result.finalRequired;
  document.querySelector('#required').textContent=`${result.finalRequired.toFixed(0)} m/s`;document.querySelector('#available').textContent=`${result.finalAvailable.toFixed(0)} m/s`;document.querySelector('#total').textContent=`${result.total.toFixed(0)} m/s`;document.querySelector('#margin').textContent=`${margin>=0?'+':''}${margin.toFixed(0)} m/s`;document.querySelector('#margin').className=margin>=0?'status-good':'status-bad';document.querySelector('#warning').textContent=stages.some(stage=>stage.dryKg>=stage.wetKg)?'Each wet mass must exceed its dry mass.':margin<0?'The final stage cannot close the requested Δv budget.':'The ideal Δv budget closes.';
  renderRocket(stages);
  budgetEl.innerHTML='<strong>Ideal stage Δv</strong>'+result.deltas.map((deltaV,index)=>`<div class="budget-row"><span>${currentModel.stages[index].name}</span><div class="budget-bar"><i style="width:${Math.min(100,deltaV/Math.max(target,...result.deltas)*250)}%"></i></div><b>${(deltaV/1000).toFixed(2)} km/s</b></div>`).join('');
}

function applyModel(){
  currentModel=VEHICLE_MODELS[vehicleSelect.value];payloadInput.value=String(currentModel.payloadKg);targetInput.value=String(currentModel.targetMps);
  document.querySelector('#baselineTitle').textContent=`${currentModel.name} baseline`;document.querySelector('#vehicleDescription').textContent=currentModel.description;
  document.querySelector('#vehicleFacts').innerHTML=currentModel.facts.map(([label,value])=>`<div class="readout"><span>${label}</span><strong>${value}</strong></div>`).join('');
  document.querySelector('#modelAssumptions').textContent=currentModel.assumptions;buildEditors();
}

vehicleSelect.addEventListener('change',applyModel);payloadInput.addEventListener('input',update);targetInput.addEventListener('input',update);applyModel();
