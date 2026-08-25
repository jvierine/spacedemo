# Visualization roadmap

## Released in the first version

- [x] Two-body Keplerian orbit with interactive semi-major axis, eccentricity, inclination, right ascension of ascending node, argument of periapsis, and anomaly controls.
- [x] Pan, rotate, and zoom a three-dimensional orbit view.
- [x] Render the spacecraft as a point and show a gridded equatorial plane, geographic north pole, prime meridian, and Earth rotation.
- [x] Annotate the ellipse with the focus, semi-major and semi-minor axes, periapsis, apoapsis, spacecraft position, and line of nodes.
- [x] Atmospheric-drag visualization with density, scale height, drag coefficient, area-to-mass ratio, and elapsed-time controls.
- [x] Show drag-driven contraction and circularization against the initial osculating ellipse.
- [x] Plot semi-major-axis altitude versus time and eccentricity versus altitude during drag decay.
- [x] J2 visualization of nodal and apsidal precession with an adjustable time scale.
- [x] Sun-synchronous orbit preset calculated from altitude and eccentricity.
- [x] Show Earth's heliocentric orbit and Sun direction in the J2 demo; use Earth's physical J2 value without an artificial scale control.
- [x] Add physical sun-synchronous, Molniya, and incorrect-inclination comparison presets.
- [x] Extend J2 evolution to 20 years and align the rendered Earth grid with the geographic +Z north pole.
- [x] Multistage rocket mass and Δv budget with a solved final-stage requirement.
- [x] Dzhanibekov-effect simulation using torque-free Euler rigid-body dynamics.
- [x] Render equations with larger MathJax typography and provide QR codes for phone access.
- [x] Collect categorized improvement feedback and new-demo suggestions using a Rust and SQLite backend.

## Next demonstrations

- [ ] Ground tracks with Earth rotation and repeat-orbit resonances.
- [ ] Orbit transfers: Hohmann, bi-elliptic, and plane changes.
- [ ] Third-body perturbations from the Moon and Sun.
- [ ] Solar-radiation pressure and eclipse seasons.
- [ ] Frozen orbits and Molniya critical-inclination preset.
- [ ] Relative motion and Clohessy–Wiltshire formation flying.
- [ ] Export/share a selected parameter set through the URL.
- [ ] Replace the simple exponential atmosphere with selectable empirical atmosphere profiles.
