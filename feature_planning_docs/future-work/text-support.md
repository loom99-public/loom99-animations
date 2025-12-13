Mostly: same archetypes, different scenes + different “constraints of meaning.” The kernel/compiler shape barely changes; what changes is what you feed it and what you optimize for.

Here are the real differences you’ll feel when porting.

1) Scene differences (the big one)

Logos
	•	Usually one fixed composition.
	•	Parts are often hand-picked / nicely grouped.
	•	Fewer elements, heavier strokes/shapes.
	•	“Looks cool” is the primary constraint.

Text
	•	Scene comes from glyph geometry + layout:
	•	baseline, x-height, cap-height
	•	kerning / letter spacing
	•	multi-line wrapping (sometimes)
	•	Many more primitives:
	•	lots of short strokes/segments/paths per glyph
	•	Identity/grouping matters more:
	•	group by letter, word, line, or stroke order

Practical upshot: text needs a layout/segmentation layer (even if it’s simple) so fields can reference meaningful structure.

2) Coordination defaults change

Text wants coordination that preserves readability:
	•	stagger tends to be by letter, not by raw path index
	•	reveal tends to be left→right or center-out, not random
	•	variance envelopes need to be tighter or it becomes illegible

Logos tolerate (and benefit from) more chaos.

3) Perceptual constraints are stricter

For text, there are “don’t break the message” invariants:
	•	don’t occlude too long
	•	don’t deform glyphs past recognition
	•	don’t randomize color so much it harms contrast
	•	timing needs to match reading rhythm

So the Mode library differs more than the compiler:
	•	text presets bias toward coherence and legibility
	•	logo presets bias toward drama and novelty

4) Archetype-by-archetype mapping (what actually changes)
	•	text-01 line drawing vs logo-01: same LineMorph archetype. Text version mostly differs by:
	•	many more strokes
	•	grouping by glyph (better stagger)
	•	thinner widths / gentler glow
	•	text-02 particles vs logo-02: same Particles/Liquid-style transport. Text version tends to:
	•	use targets sampled from glyph outlines
	•	coordinate by word/line
	•	text-03 morphing vs logo-03: same PathMorph archetype, but text usually has:
	•	more paths
	•	smaller features → requires more careful normalization / segment length choices
	•	text-08 reveal mask vs logo-08: same RevealMask archetype; text just prefers:
	•	directional wipes that track reading order
	•	softer edges tuned for thin strokes
	•	text-10 typewriter vs logo-10: same Typewriter archetype; text version cares about:
	•	tokenization (chars vs graphemes vs words)
	•	caret placement on baseline
	•	variable speed / pauses at spaces/punctuation

5) The only “new” thing text really demands

A reusable TextScene Derivation step that outputs:
	•	stable per-glyph IDs
	•	per-glyph bounds/centers
	•	grouping indices (glyph/word/line)
	•	an order that matches reading order

Once you have that, the rest is mostly swapping Mode stacks and adjusting default field constants.

If you want, I can summarize each text-0X as “same archetype as logo-0Y, plus these scene/grouping knobs,” so you can port them mechanically.