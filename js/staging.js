export const STANDARD_GRAVITY = 9.80665;

export const STARSHIP_V3_MODEL = Object.freeze({
  name: 'Starship V3', layout: 'single', heightM: 124.4, diameterM: 9, vehicleMassKg: 5533000, payloadKg: 100000, targetMps: 9400,
  description: 'Latest public V3 baseline. Both stages are intended to return for rapid reuse.',
  assumptions: 'SpaceX publishes 5,533 t total vehicle mass and 5,250 t propellant, but not stage dry masses or ascent-average Isp. The 200 t / 100 t dry masses and 350 s / 380 s values are rounded engineering estimates informed by Wikipedia; their 5,550 t sum is within 0.3% of SpaceX’s published vehicle mass.',
  facts: Object.freeze([['Stack','124.4 m · 9 m'],['Vehicle wet mass','5,533 t'],['Reusable payload to LEO','100+ t'],['Engines','39 Raptor 3'],['Super Heavy propellant','3,650 t'],['Starship propellant','1,600 t']]),
  stages: Object.freeze([
    Object.freeze({ name: 'Super Heavy', wetKg: 3850000, dryKg: 200000, ispS: 350, propellantKg: 3650000, heightM: 72, diameterM: 9, engines: '33 Raptor 3' }),
    Object.freeze({ name: 'Starship', wetKg: 1700000, dryKg: 100000, ispS: 380, propellantKg: 1600000, heightM: 52, diameterM: 9, engines: '6 Raptor 3' })
  ])
});

export const VEHICLE_MODELS = Object.freeze({
  starship: STARSHIP_V3_MODEL,
  saturnV: Object.freeze({
    name:'Saturn V',layout:'single',heightM:111,diameterM:10,vehicleMassKg:2965241,payloadKg:43500,targetMps:12000,
    description:'Apollo lunar-launch configuration with three expendable stages.',
    assumptions:'Stage gross and dry masses and Isp are rounded from the Saturn V tables summarized by NASA and Wikipedia. The 43.5 t payload represents the approximate translunar payload rather than the 140 t LEO figure, which includes S-IVB and its remaining propellant.',
    facts:Object.freeze([['Stack','111 m · 10 m'],['Fueled launch mass','2,822–2,965 t'],['Payload to LEO','140 t'],['Payload toward Moon','43.5 t'],['First stage','5 F-1'],['Upper stages','6 J-2 total']]),
    stages:Object.freeze([
      Object.freeze({name:'S-IC',wetKg:2214000,dryKg:137000,ispS:260,propellantKg:2077000,heightM:42,diameterM:10,engines:'5 F-1'}),
      Object.freeze({name:'S-II',wetKg:470000,dryKg:43000,ispS:424,propellantKg:427000,heightM:24.87,diameterM:10,engines:'5 J-2'}),
      Object.freeze({name:'S-IVB',wetKg:120500,dryKg:15200,ispS:424,propellantKg:105300,heightM:17.86,diameterM:6.6,engines:'1 J-2'})
    ])
  }),
  falcon9: Object.freeze({
    name:'Falcon 9 Block 5',layout:'single',heightM:70,diameterM:3.7,vehicleMassKg:549054,payloadKg:22800,targetMps:9400,
    description:'Current two-stage Falcon 9 fairing configuration; first stage reusable.',
    assumptions:'SpaceX publishes total vehicle mass and payload capability but not current stage masses. The editable 437 t / 112 t gross masses, 25.6 t / 4.0 t dry masses, and 312 s / 348 s vacuum Isp values are rounded public estimates.',
    facts:Object.freeze([['Stack','70 m · 3.7 m'],['Vehicle mass','549,054 kg'],['Payload to LEO','22,800 kg'],['Payload to GTO','8,300 kg'],['First stage','9 Merlin 1D'],['Second stage','1 Merlin Vacuum']]),
    stages:Object.freeze([
      Object.freeze({name:'Falcon 9 booster',wetKg:437000,dryKg:25600,ispS:312,propellantKg:411400,heightM:47.7,diameterM:3.7,engines:'9 Merlin 1D'}),
      Object.freeze({name:'Falcon 9 upper stage',wetKg:112000,dryKg:4000,ispS:348,propellantKg:108000,heightM:12.6,diameterM:3.7,engines:'1 Merlin Vacuum'})
    ])
  }),
  falconHeavy: Object.freeze({
    name:'Falcon Heavy',layout:'heavy',heightM:70,diameterM:12.2,vehicleMassKg:1420788,payloadKg:63800,targetMps:9400,
    description:'Three Falcon-derived first-stage cores with a common upper stage.',
    assumptions:'The ideal model combines all three first-stage cores into one simultaneous booster phase; real side-booster separation and center-core throttling are not represented. Stage masses and Isp are rounded Falcon 9-derived estimates.',
    facts:Object.freeze([['Stack','70 m · 12.2 m'],['Vehicle mass','1,420,788 kg'],['Payload to LEO','63,800 kg'],['Payload to GTO','26,700 kg'],['Booster phase','27 Merlin 1D'],['Second stage','1 Merlin Vacuum']]),
    stages:Object.freeze([
      Object.freeze({name:'Three-core booster phase',wetKg:1308788,dryKg:76800,ispS:312,propellantKg:1231988,heightM:47.7,diameterM:12.2,engines:'27 Merlin 1D'}),
      Object.freeze({name:'Falcon upper stage',wetKg:112000,dryKg:4000,ispS:348,propellantKg:108000,heightM:12.6,diameterM:3.7,engines:'1 Merlin Vacuum'})
    ])
  })
});

export function stageDeltaV(stage, upperMassKg) {
  const propellant = Math.max(0, stage.wetKg - stage.dryKg);
  const m0 = upperMassKg + stage.wetKg;
  const mf = m0 - propellant;
  return stage.ispS * STANDARD_GRAVITY * Math.log(m0 / mf);
}

export function stagingBudget(stages, payloadKg, targetMps) {
  const deltas = stages.map((stage, index) => {
    const upperMass = payloadKg + stages.slice(index + 1).reduce((sum, upper) => sum + upper.wetKg, 0);
    return stageDeltaV(stage, upperMass);
  });
  const lowerDeltaV = deltas.slice(0, -1).reduce((sum, value) => sum + value, 0);
  return {
    deltas,
    lowerDeltaV,
    finalRequired: Math.max(0, targetMps - lowerDeltaV),
    finalAvailable: deltas.at(-1),
    total: deltas.reduce((sum, value) => sum + value, 0)
  };
}
