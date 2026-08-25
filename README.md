# Spacecraft orbit demonstrations

Interactive WebGL demonstrations accompanying FYS-3000 spacecraft systems material.

- Keplerian two-body orbits and orbital elements
- Atmospheric drag, ballistic properties, contraction, and circularization
- J2 nodal regression, apsidal precession, and sun-synchronous orbits
- Multistage rocket mass and delta-v budgets
- Torque-free intermediate-axis instability (the Dzhanibekov effect)

The site is dependency-free at build time. It loads Three.js as an ES module from jsDelivr.

## Run locally

```sh
npm test
npm run serve
```

Open <http://localhost:4173>. A local HTTP server is required because the JavaScript uses ES modules.

## Deploy

The entire repository is a static site. Publish its root at `https://juha.no/space/`.
