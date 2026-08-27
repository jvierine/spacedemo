import { nextAccessEvent } from '../js/coverage.js';

self.addEventListener('message',event=>{
  const {id,requestedAt,elements,satellitesPerPlane,planeCount,station,minimumElevation,useJ2}=event.data;
  const result=nextAccessEvent(elements,satellitesPerPlane,planeCount,requestedAt,station,minimumElevation,useJ2);
  self.postMessage({id,requestedAt,result});
});
