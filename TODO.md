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
- [x] Apply feedback: plot drag eccentricity versus time, smooth J2 animation with speed control, and derive Dzhanibekov body shape from its moments.
- [x] Apply feedback: restart the Dzhanibekov solver immediately when moments change and show the live Euler-equation state.
- [x] Apply feedback: typeset the live Keplerian angles, render the spacecraft as a ball, and offset point labels.
- [x] Require a server-configured class password before accepting feedback.
- [x] Apply feedback: widen and discretize all rigid-body moment sliders on one shared scale, including equal moments.
- [x] Show the equivalence between Fortescue equation 4.38 and the J₂ apsidal-rate form used by the demo.
- [x] Make the equations and sliders panel resizable with pointer and keyboard controls.
- [x] Add a J₂ enable/disable comparison control.
- [x] Show Earth’s rotation equator, physical axial tilt, and ecliptic plane in the J₂ scene.
- [x] Remove J₂ scene flicker caused by aliased Earth spin, overlapping geometry, ecliptic diameters, and an ill-conditioned near-circular periapsis marker.

## Next demonstrations

- [x] Ground tracks with Earth rotation, station visibility, coverage footprints, and repeat cycles.
- [x] Lambert problem targeting with comet-intercept and Earth–Mars Hohmann examples.
- [x] Earth–Sun sphere of influence, Hill sphere, and Lagrange-point comparison.
- [ ] Orbit transfers: Hohmann, bi-elliptic, and plane changes.
- [ ] Third-body perturbations from the Moon and Sun.
- [ ] Solar-radiation pressure and eclipse seasons.
- [ ] Frozen orbits and Molniya critical-inclination preset.
- [ ] Relative motion and Clohessy–Wiltshire formation flying.
- [ ] Export/share a selected parameter set through the URL.
- [ ] Replace the simple exponential atmosphere with selectable empirical atmosphere profiles.
