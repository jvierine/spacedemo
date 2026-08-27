export const DAY_SECONDS=86400;
export const AU_KM=149597870.7;
export const SUN_MU_KM3_S2=132712440018;
export const EARTH_YEAR_DAYS=365.256363004;
export const MARS_YEAR_DAYS=686.98;
export const MARS_RADIUS_AU=1.523679;
export const COMET_IMPACT_DAY=2200;
export const COMET_IMPACT_VELOCITY_KM_S=[-15,-28,28];

const clamp=(value,minimum,maximum)=>Math.min(maximum,Math.max(minimum,value));
export const add=(a,b)=>a.map((value,index)=>value+b[index]);
export const subtract=(a,b)=>a.map((value,index)=>value-b[index]);
export const scale=(vector,factor)=>vector.map(value=>value*factor);
export const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const magnitude=vector=>Math.hypot(...vector);

export function circularState(radiusKm,periodDays,day,phase=0){
  const angularRate=Math.PI*2/(periodDays*DAY_SECONDS),angle=phase+angularRate*day*DAY_SECONDS;
  return {position:[radiusKm*Math.cos(angle),radiusKm*Math.sin(angle),0],velocity:[-radiusKm*angularRate*Math.sin(angle),radiusKm*angularRate*Math.cos(angle),0]};
}

export function earthState(day){return circularState(AU_KM,EARTH_YEAR_DAYS,day)}
export function marsState(day,phase=0){return circularState(MARS_RADIUS_AU*AU_KM,MARS_YEAR_DAYS,day,phase)}

function stumpffC(z){
  if(z>1e-7){const root=Math.sqrt(z);return(1-Math.cos(root))/z}
  if(z< -1e-7){const root=Math.sqrt(-z);return(Math.cosh(root)-1)/(-z)}
  return .5-z/24+z*z/720-z*z*z/40320;
}
function stumpffS(z){
  if(z>1e-7){const root=Math.sqrt(z);return(root-Math.sin(root))/(root**3)}
  if(z< -1e-7){const root=Math.sqrt(-z);return(Math.sinh(root)-root)/(root**3)}
  return 1/6-z/120+z*z/5040-z*z*z/362880;
}

function timeEquation(z,r1Length,r2Length,A,target){
  const C=stumpffC(z),S=stumpffS(z);
  if(!(C>0))return null;
  const y=r1Length+r2Length+A*(z*S-1)/Math.sqrt(C);
  if(!(y>=0))return null;
  return {value:(y/C)**1.5*S+A*Math.sqrt(y)-target,y};
}

export function solveLambert(r1,r2,timeSeconds,mu=SUN_MU_KM3_S2){
  if(!(timeSeconds>0))throw new RangeError('Lambert time of flight must be positive');
  const r1Length=magnitude(r1),r2Length=magnitude(r2),cosine=clamp(dot(r1,r2)/(r1Length*r2Length),-1,1),sineMagnitude=Math.sqrt(Math.max(0,1-cosine*cosine)),sine=cross(r1,r2)[2]>=0?sineMagnitude:-sineMagnitude;
  if(sineMagnitude<1e-8)throw new RangeError('Collinear Lambert geometry requires the analytic transfer');
  const A=sine*Math.sqrt(r1Length*r2Length/(1-cosine)),target=Math.sqrt(mu)*timeSeconds;
  let lower=null,upper=null,previous=null;
  const minimum=-4*Math.PI*Math.PI+1e-5,maximum=4*Math.PI*Math.PI-1e-5;
  const bracketSamples=120;
  for(let index=0;index<=bracketSamples;index+=1){
    const z=minimum+(maximum-minimum)*index/bracketSamples,result=timeEquation(z,r1Length,r2Length,A,target);
    if(!result||!Number.isFinite(result.value))continue;
    if(previous&&previous.result.value*result.value<=0){lower=previous;upper={z,result};break}
    previous={z,result};
  }
  if(!lower||!upper)throw new RangeError('No single-revolution Lambert solution for this geometry and time');
  for(let iteration=0;iteration<70;iteration+=1){
    const z=(lower.z+upper.z)/2,result=timeEquation(z,r1Length,r2Length,A,target);
    if(!result)lower={z,result:lower.result};
    else if(lower.result.value*result.value<=0)upper={z,result};
    else lower={z,result};
  }
  const solution=upper.result,y=solution.y,f=1-y/r1Length,g=A*Math.sqrt(y/mu),gdot=1-y/r2Length;
  if(Math.abs(g)<1e-12)throw new RangeError('Lambert solution is singular');
  return {departureVelocity:scale(subtract(r2,scale(r1,f)),1/g),arrivalVelocity:scale(subtract(scale(r2,gdot),r1),1/g)};
}

export function hohmannEarthMars(){
  const r1=AU_KM,r2=MARS_RADIUS_AU*AU_KM,a=(r1+r2)/2,e=(r2-r1)/(r2+r1),timeSeconds=Math.PI*Math.sqrt(a**3/SUN_MU_KM3_S2);
  const earthSpeed=Math.sqrt(SUN_MU_KM3_S2/r1),marsSpeed=Math.sqrt(SUN_MU_KM3_S2/r2),departureSpeed=Math.sqrt(SUN_MU_KM3_S2*(2/r1-1/a)),arrivalSpeed=Math.sqrt(SUN_MU_KM3_S2*(2/r2-1/a));
  return {a,e,r1,r2,timeSeconds,timeDays:timeSeconds/DAY_SECONDS,earthSpeed,marsSpeed,departureSpeed,arrivalSpeed,departureVInfinity:departureSpeed-earthSpeed,arrivalVInfinity:marsSpeed-arrivalSpeed,phaseAngle:Math.PI-Math.PI*2*timeSeconds/(MARS_YEAR_DAYS*DAY_SECONDS)};
}

function acceleration(position,mu){const radius=magnitude(position);return scale(position,-mu/radius**3)}

export function propagateState(state,deltaSeconds,mu=SUN_MU_KM3_S2,maximumStepSeconds=DAY_SECONDS/2){
  const steps=Math.max(1,Math.ceil(Math.abs(deltaSeconds)/maximumStepSeconds)),dt=deltaSeconds/steps;
  let position=[...state.position],velocity=[...state.velocity];
  for(let step=0;step<steps;step+=1){
    const k1r=velocity,k1v=acceleration(position,mu);
    const k2r=add(velocity,scale(k1v,dt/2)),k2v=acceleration(add(position,scale(k1r,dt/2)),mu);
    const k3r=add(velocity,scale(k2v,dt/2)),k3v=acceleration(add(position,scale(k2r,dt/2)),mu);
    const k4r=add(velocity,scale(k3v,dt)),k4v=acceleration(add(position,scale(k3r,dt)),mu);
    position=add(position,scale(add(add(k1r,scale(k2r,2)),add(scale(k3r,2),k4r)),dt/6));
    velocity=add(velocity,scale(add(add(k1v,scale(k2v,2)),add(scale(k3v,2),k4v)),dt/6));
  }
  return {position,velocity};
}

export function cometImpactState(){
  return {position:earthState(COMET_IMPACT_DAY).position,velocity:[...COMET_IMPACT_VELOCITY_KM_S]};
}

export function cometState(day){return propagateState(cometImpactState(),(day-COMET_IMPACT_DAY)*DAY_SECONDS)}

export function sampleTrajectory(state,timeSeconds,samples=180){
  const points=[[...state.position]];let current={position:[...state.position],velocity:[...state.velocity]},previousTime=0;
  for(let index=1;index<=samples;index+=1){const time=timeSeconds*index/samples;current=propagateState(current,time-previousTime);points.push([...current.position]);previousTime=time}
  return points;
}
