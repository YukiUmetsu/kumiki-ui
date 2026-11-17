# The rendered ocean (WATER1) — research, 2026-11-16

The owner asked for much more realism in the ocean surface and waves. Before, the sea was bands of colour mixed with
the reflected sky. Now it is a spectrum of real waves summed by FFT, rendered under SKY1's physical sky.

Grades:
- **reported:** quoted from the source;
- **measured:** from data in the repository;
- **estimated:** chosen within what the sources support.

## The sea for a wind

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Fully developed sea | H_s ≈ 0.22 U₁₉.₅²/g; peak ω_p = 0.877 g/U₁₉.₅; α 0.0081 | reported | Pierson & Moskowitz 1964, via Stewart, *Introduction to Physical Oceanography* 16.4 (already in WATER1) |
| Fetch-limited sea | JONSWAP: γ 3.3, σ 0.07 / 0.09, α = 0.076 X^−0.22, ω_p = 22 (g/U) X^−1/3 | reported | Hasselmann et al. 1973, via Stewart |
| Directional spreading | cos^2s(θ/2) with s = 6.97 (f/f_p)^4.06 below the peak, 9.77 (f/f_p)^−2.33 above | estimated | The Hasselmann et al. 1980 fit as commonly quoted; the coefficients were not confirmed against the paper |
| Dispersion | ω² = gk + (T/ρ)k³ | reported | Deep-water gravity–capillary waves |
| The surface | FFT synthesis, choppy displacement, the Jacobian for folding | reported (method) | Tessendorf 2001, *Simulating Ocean Water* |
| Whitecap cover | W = 3.84 × 10⁻⁶ U^3.41 | reported | Monahan & O'Muircheartaigh 1980 (already in WATER1) |
| Foam decay | e-folding about 5 s | measured | WATER1, eight breaks in a CC0 surf video |
| Mean square slope | σ² = 0.003 + 5.12 × 10⁻³ U | reported | Cox & Munk 1954 (already in WATER1) |
| Fresnel | Unpolarised, n 1.333: 2.0% at normal incidence | reported | Optics |
| Seawater scattering | b_w(500) = 0.00288 m⁻¹ × (λ/500)^−4.32; backscatter half of it | reported | Morel 1974 |
| Light back out of the water | R ≈ 0.33 b_b ÷ a | estimated | The Gordon et al. 1975 approximation as commonly quoted |

**Checks** (tests/water.test.tsx):
- Fully developed heights and periods are within 10% of the relations above, for winds of 6–16 m/s.
- Whitecaps cover Monahan's share within a factor of 2.5 on a sample of the surface.
- Resolved slopes stay within Cox–Munk's.
- Clear deep water sends back more blue than green, and more green than red.

## Comparisons

Public-domain NOAA photographs on Wikimedia Commons, compared with renders at the same wind and light:
- *Wea04118* (a rough open sea, Allen Shimada, NOAA);
- *Wea00800* (a ship in heavy seas);
- *Clipperton Waves* (Shannon Rankin, NOAA).

## What changed in review

| Defect | Fix |
| --- | --- |
| Troughs sharp, crests broad | The choppy displacement's sign: points move by −λD |
| A dark band and then a brownish band above the horizon | The atmosphere's single scattering darkened long, low paths. A multiple-scattering source now whitens the horizon, tinted by skylight, so the horizon is pale blue-white rather than warm |
| Soft white blobs on a calm sea | Light through crests was applied without backlighting; it is now only backlit and turquoise (a few metres of water) |
| Glints from a sun behind the viewer on a calm sea | The spectrum's short waves were steeper than Cox–Munk measured; the finer cascades are scaled to stay within 85% of it |
| Lighter wedges at the frame edges | The level-of-detail footprint used 1/|d_y|; now the geometric mean of the footprint's sides |
| Distant clouds broken in the sky above the sea | Two rays per pixel near the horizon, more steps |

## Limits

- Deep water only: no shoaling, breaking surf or spray here (see `breakerShape`).
- Foam remembers only 2.5 s.
- The spreading coefficients are estimated.
- Only the agent has reviewed the renders; no human visual review yet.
