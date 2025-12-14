“LineDrawMorph compiler” is not an old-doc artifact — it’s still a valid concept. What changes with the more generic kernel is what “compiler” means and where specificity lives.

Yes, you still have specific compilers — but they’re now “archetype compilers”

Your kernel gives you universal building blocks (Signals/Events/Fields/PhaseMachine/RenderTree). That doesn’t eliminate the need for domain-specific compilation steps that:
	•	take a SceneSpec in some domain form (strokes, paths, targets, text)
	•	take a field bundle / mode stack
	•	produce a Program

That mapping is inherently specific to the archetype because:
	•	line drawing needs “straight scaffold → curved stroke interpolation”
	•	particles needs “startPos → targetPos transport + behavior offsets”
	•	reveal mask needs “mask geometry drives visibility constraint”
	•	typewriter needs “event script → fold → text geometry”

Those are different semantics. You want them to live in separate compilers.

What’s different now

In the early framing, “compiler” sounded like “big pile of code that does everything.” Now it’s:
	•	tiny, pure, archetype-level function
	•	that stitches together:
	•	(a) common kernel combinators
	•	(b) one archetype’s geometry/constraint math
	•	(c) the renderer for that geometry type

So you keep names like:
	•	compileLineDrawMorph(spec, seed, env) -> Animation
	•	compileParticles(spec, seed, env) -> Animation
	•	compileRevealMask(...)
	•	compileTypewriter(...)

…but each compiler is basically “connect the slots correctly” + “delegate to geometry renderer”.

If you want maximal genericity: factor one level up

You can define a generic compiler shape:
	•	compileArchetype<A>(archetype: Archetype<A>, spec: A, seed, env) -> Animation

Where Archetype<A> is a record of the slots it needs:
	•	scene derivation
	•	required fields
	•	phase policy
	•	trajectory law
	•	render interpreter

Then LineDrawMorph is just one Archetype instance.

So:
	•	“LineDrawMorph compiler” is still a thing
	•	it’s just either:
	1.	a named archetype compiler function, or
	2.	an Archetype value passed into a single compileArchetype

Quick rule of thumb
	•	If the thing requires new geometry math or new constraint interpretation, it gets a specific compiler/archetype.
	•	If it’s just “same archetype, different look,” it’s a mode/preset (fields + envelopes + phase timings).

So: LineDrawMorph remains a specific compiler because it defines a specific morph law + renderer behavior, even though everything around it is now generic and composable.