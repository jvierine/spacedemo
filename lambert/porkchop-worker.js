import {COMET_IMPACT_DAY,DAY_SECONDS,cometState,earthState,magnitude,marsState,solveLambert,subtract} from '../js/lambert.js?v=20260827-2';

function velocityExcess(departure,target,timeDays){
  if(timeDays<20)return null;
  try{const solution=solveLambert(departure.position,target,timeDays*DAY_SECONDS);return magnitude(subtract(solution.departureVelocity,departure.velocity))}catch{return null}
}

const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));

async function cometMap(){
  const columns=58,rows=37,minimumY=5,maximumY=365,maximumX=COMET_IMPACT_DAY-minimumY-20,cells=[];
  for(let row=0;row<rows;row+=1){const lead=minimumY+(maximumY-minimumY)*row/(rows-1),arrival=COMET_IMPACT_DAY-lead,target=cometState(arrival).position,speeds=[];for(let column=0;column<columns;column+=1){const launch=maximumX*column/(columns-1);speeds.push(velocityExcess(earthState(launch),target,arrival-launch))}cells.push(speeds);if(row%8===0)self.postMessage({status:'progress',kind:'comet',row,rows});await yieldTask()}
  return {kind:'comet',columns,rows,minimumY,maximumY,maximumX,cells};
}

async function marsMap(){
  const columns=44,rows=28,minimumY=30,maximumY=500,maximumX=4000,cells=[];
  for(let row=0;row<rows;row+=1){const travel=maximumY-(maximumY-minimumY)*row/(rows-1),speeds=[];for(let column=0;column<columns;column+=1){const departureDay=maximumX*column/(columns-1),target=marsState(departureDay+travel).position;speeds.push(velocityExcess(earthState(departureDay),target,travel))}cells.push(speeds);if(row%7===0)self.postMessage({status:'progress',kind:'mars',row,rows});await yieldTask()}
  return {kind:'mars',columns,rows,minimumY,maximumY,maximumX,cells};
}

self.addEventListener('message',async event=>self.postMessage(await(event.data.kind==='mars'?marsMap():cometMap())));
