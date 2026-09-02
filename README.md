# Space Systems Engineering demonstrations

Interactive WebGL demonstrations of spacecraft systems and orbital mechanics.

- Keplerian two-body orbits and orbital elements
- Atmospheric drag, ballistic properties, contraction, and circularization
- J2 nodal regression, apsidal precession, and sun-synchronous orbits
- Earth-orbit/Sun reference, sun-synchronous mismatch drift, and Molniya frozen-apsides comparison
- Orbit-family ground coverage, selectable ground-station access, and repeat ground tracks
- Lambert problem targeting with a comet-intercept launch window and Earth–Mars Hohmann example
- Earth–Sun sphere of influence, Hill sphere, and restricted three-body Lagrange points
- Solar Oberth comparison: Earth-orbit dive, near-Sun burn, and direct Alpha Centauri departure
- GTO injection comparison for perigee, off-apsis, and deliberately suboptimal apogee burns
- Hall-effect thruster electron transport, argon ionization, ion acceleration, and plume neutralization
- Multistage rocket mass and delta-v budgets
- Torque-free intermediate-axis instability (the Dzhanibekov effect)
- QR codes and responsive phone layouts for classroom use
- Rust and SQLite feedback collection for improvements and future demo ideas

The site is dependency-free at build time. It loads Three.js as an ES module from jsDelivr.

## Run locally

```sh
npm test
npm run serve
```

Open <http://localhost:4173>. A local HTTP server is required because the JavaScript uses ES modules.

The feedback service is documented in [`backend/README.md`](backend/README.md). Run it locally with `cargo run --manifest-path backend/Cargo.toml`; the frontend submits to the production-relative `/space/api/feedback` route.

## Deploy

The entire repository is a static site. Publish its root at `https://juha.no/space/`.
