export const AU_KM=149597870.7;
export const SUN_MASS_KG=1.98847e30;
export const EARTH_MASS_KG=5.9722e24;
export const EARTH_ORBIT_ECCENTRICITY=.0167086;
export const MOON_DISTANCE_KM=384400;
export const EARTH_YEAR_DAYS=365.256363004;

export function sphereOfInfluence(distanceKm=AU_KM,planetMass=EARTH_MASS_KG,primaryMass=SUN_MASS_KG){return distanceKm*(planetMass/primaryMass)**(2/5)}
export function hillRadius(distanceKm=AU_KM,eccentricity=EARTH_ORBIT_ECCENTRICITY,planetMass=EARTH_MASS_KG,primaryMass=SUN_MASS_KG){return distanceKm*(1-eccentricity)*(planetMass/(3*primaryMass))**(1/3)}

function collinearEquation(x,mu){
  const dx1=x+mu,dx2=x-(1-mu);
  return x-(1-mu)*dx1/Math.abs(dx1)**3-mu*dx2/Math.abs(dx2)**3;
}
function bisect(mu,lower,upper){
  let left=lower,right=upper,leftValue=collinearEquation(left,mu);
  for(let iteration=0;iteration<100;iteration+=1){const middle=(left+right)/2,value=collinearEquation(middle,mu);if(leftValue*value<=0)right=middle;else{left=middle;leftValue=value}}
  return(left+right)/2;
}
export function lagrangePoints(planetMass=EARTH_MASS_KG,primaryMass=SUN_MASS_KG){
  const mu=planetMass/(primaryMass+planetMass),epsilon=1e-8,xPrimary=-mu,xPlanet=1-mu;
  return {mu,L1:[bisect(mu,xPrimary+epsilon,xPlanet-epsilon),0],L2:[bisect(mu,xPlanet+epsilon,2),0],L3:[bisect(mu,-2,xPrimary-epsilon),0],L4:[.5-mu,Math.sqrt(3)/2],L5:[.5-mu,-Math.sqrt(3)/2],sun:[xPrimary,0],earth:[xPlanet,0]};
}
export function effectivePotential(x,y,mu=lagrangePoints().mu){
  const r1=Math.hypot(x+mu,y),r2=Math.hypot(x-(1-mu),y);
  return .5*(x*x+y*y)+(1-mu)/r1+mu/r2;
}
