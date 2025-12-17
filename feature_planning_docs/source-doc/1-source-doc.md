2) You don’t need an SVG editor — you need a Source Dock with import + curation + cleanup

“SVGPathSource with a few hardcoded paths” is fine for prototyping, but it blocks the product because users can’t start from their material.

You can solve this without building Illustrator:

A. Add 4 source types that cover 90% of creation
	1.	Paste/Drop SVG

	•	drag a file in, or paste SVG markup
	•	store it as an asset in the project
	•	show thumbnails in a “Source Dock”

	2.	Text Source

	•	text + font + weight + tracking + alignment
	•	convert to paths using browser font rendering (or pre-baked)
	•	this is the logo animation gateway drug

	3.	Shape Primitives

	•	circle / rect / star / polygon / spiral
	•	parametric, deterministic, editable by sliders
	•	perfect for ambient loops because they’re clean and stable

	4.	Icon Library (curated, not infinite)

	•	ship 50–200 tasteful, known-good paths
	•	organized by vibe: “geometric”, “organic”, “tech”, “playful”
This replaces “some look crappy” with “all look usable”.

B. Add a “Cleanup” pass, not an editor

When imported SVGs look bad in motion, it’s usually:
	•	too many points,
	•	weird winding,
	•	inconsistent path directions,
	•	tiny segments.

So provide a Clean Up button per asset:
	•	simplify (tolerance)
	•	normalize scale/origin
	•	unify direction / close paths
	•	optional resample to N points

This is a transform, not an editor. It keeps your philosophy and makes imported assets behave.