# Space Systems Engineering demonstrations

Interactive WebGL demonstrations of spacecraft systems and orbital mechanics.

- Keplerian two-body orbits and orbital elements
- Atmospheric drag, ballistic properties, contraction, and circularization
- J2 nodal regression, apsidal precession, and sun-synchronous orbits
- Earth-orbit/Sun reference, sun-synchronous mismatch drift, and Molniya frozen-apsides comparison
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
