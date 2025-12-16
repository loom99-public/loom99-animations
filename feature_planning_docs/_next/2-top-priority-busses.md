Where to learn more (brief, but high-signal)

The closest “bus-like” systems to study are named send/receive systems in patchers and send/return buses in DAWs:
	•	Max / RNBO “send~ / receive~”: named, invisible signal routing across a patch without patch cords—exactly the mental model you want.  ￼
	•	Pure Data send/receive: same idea, with strong “global name” semantics and one-to-many routing.  ￼
	•	Ableton Live sends/returns (bus routing + feedback): extremely relevant for your “combine mode” and safety (feedback is possible but gated).  ￼

Those three will teach you the UX language people already understand: “send to X, receive from X, and mixes happen at the bus.”

⸻

Bus Board UI Design (detailed, concrete, implementable)

I’ll describe:
	1.	the new screen structure,
	2.	the Bus Board itself (layout + visuals),
	3.	exact interactions (create, bind, combine, inspect, debug),
	4.	how buses integrate with your typed system and adapter chips,
	5.	a migration plan from your current UI.

I’ll assume you keep your current “Library / Preview / Inspector / PatchBay” areas, but you’ll de-emphasize lanes and introduce buses as the primary routing surface.

⸻

1) New overall layout

A) Top bar (keep most of what you have)

Add a new primary toggle group near “Connections / Palette”:
	•	Patch | Buses | Output

“Patch” = node canvas (today’s PatchBay, but freeform / zoned eventually)
“Buses” = Bus Board focus mode (full-height board + details)
“Output” = future composition stack / compositors / render output view (can be stubbed)

In v1, you can keep it as a single page and just toggle panels, but the mental separation is helpful.

B) Left: Library stays

Keep the Library. Add a new section above Blocks:
	•	Buses
	•	“New Bus…”
	•	list of existing buses with type badges and tiny sparklines

This makes buses feel as first-class as blocks.

C) Center: Patch canvas stays (for now)

Your current PatchBay area remains. Lanes can remain visible but become optional; the important change is that connections can terminate on a bus, not just another port.

D) Right: Inspector becomes context-aware

When you select:
	•	a block → same as today
	•	a bus → a Bus Inspector (details below)
	•	a wire shim (adapter chip) → adapter inspector

⸻

2) The Bus Board panel (always available, sometimes expanded)

A) Default position

A dockable Bus Board that sits between Library and PatchBay or as a collapsible column next to Inspector.

My recommendation: right side, above Inspector, because it aligns with “control/inspection.”

So right column becomes:
	1.	Bus Board (top, visible always)
	2.	Inspector (bottom, context details)

The Bus Board has a collapse button so power users can hide it.

B) Bus Board visual structure

It’s a vertical list of bus “channels” (like a mixer), each row showing:
	•	Name (editable)
	•	Type badge: S num, F phase, etc.
	•	Live meter / preview (depends on domain)
	•	num: sparkline + current value
	•	phase: circular ring (0..1) + wrap tick
	•	color: swatch + small gradient strip if animated
	•	trigger: pulse LED
	•	vec2: tiny XY trace
	•	Combine mode badge (e.g., sum, max, layer, last)
	•	Counts: ↑ publishers and ↓ listeners

And a subtle “health” indicator:
	•	green = stable
	•	yellow = warnings (semantics mismatch adapters in path)
	•	red = invalid (type conflict, cycle without delay, etc.)

C) Grouping (important for scale)

Buses are grouped into collapsible sections, defaulting to:
	•	Global Signals (S/*)
	•	Per-Element Fields (F/*)
	•	Triggers
	•	Debug (optional)

Users can create their own groups later.

⸻

3) Exact interactions

3.1 Creating buses

There are three creation paths; all must exist because different users think differently.

Path 1: From Bus Board
	•	Click New Bus
	•	Dialog (small):
	•	Name
	•	Type: pick S/F, domain
	•	Combine mode (default sensible per domain)
	•	Creates empty bus with no publishers; shows as “silent” (0 output)

Path 2: From a block output port (most common)
	•	Drag from an output port into empty space → a small radial menu appears:
	•	“Connect to… (existing compatible buses)”
	•	“Create new bus from this output”
	•	Selecting “Create new bus…” auto-fills:
	•	name suggestion (e.g. energy, phaseA, offsets)
	•	bus type matches output exactly
	•	combine mode default = last if it’s the first publisher, but see combine defaults below
	•	The port becomes a publisher to that bus

Path 3: From an input port (subscription-first)
	•	Click an input port “binding dot” (see below)
	•	Picker: “Bind to bus…”
	•	Option: “Create new bus of this type”
	•	Bus is created and that port becomes the first listener

⸻

3.2 Subscribing to buses (no wires required)

Every input port gets a small binding dot next to it:
	•	If unbound: hollow dot
	•	If bound to bus: filled dot with the bus name (tiny)

Clicking the dot opens a Bus Picker:
	•	shows only compatible buses by default
	•	has “Show convertible” toggle (will show buses that could connect via adapters)
	•	selecting a convertible bus will insert the needed adapter chain as wire chips (details below)

The port then shows:
	•	← energy (or whatever bus name)
This is readable. No spaghetti.

⸻

3.3 Publishing to buses

Every output port gets a symmetric control:
	•	Clicking the port shows:
	•	“Publish to bus…”
	•	“Create bus from output”
	•	“Stop publishing” if already publishing

If a port publishes to multiple buses, it shows a small multi-badge like:
	•	→ energy, drift

(You can restrict to one bus in v1 if you want simplicity.)

⸻

3.4 Combine mode & mixing semantics (bus-level “instrument feel”)

When there are multiple publishers, the bus row shows a combine badge.

Clicking it opens Combine settings:

For num, phase, time, rate:
	•	sum (with clamp option)
	•	avg
	•	max
	•	min
	•	last (last-writer by deterministic order)
	•	weighted (each publisher gets a weight slider)

For color:
	•	mix (linear blend)
	•	layer (ordered)
	•	last

For trigger:
	•	or (any pulse)
	•	xor (rhythmic interesting)
	•	merge (collect pulse stream)

For vec2:
	•	sum
	•	avg
	•	last

Deterministic ordering is shown explicitly as “Order: by patch order / by publish order” so it never feels magical.

Safety for feedback: if a bus has a contributor that depends on itself without a delay/state node, show a red “feedback” badge and prevent enabling it (or require inserting Delay).

⸻

3.5 Bus Inspector (select a bus)

Clicking a bus row opens a rich inspector on the right:

Section A: Summary
	•	Name, type badge, combine mode
	•	“Default value when silent” (e.g. 0, black, etc.)

Section B: Live view
	•	larger scope:
	•	time plot
	•	phase portrait for phase buses (optional)
	•	xy plot for vec2

Section C: Publishers (Upstream)
A list of publishers with:
	•	block name + port
	•	small mute button
	•	weight (if weighted mode)
	•	“Go to block” jump

Section D: Listeners (Downstream)
List of listeners:
	•	block + port
	•	“Go to block”

Section E: Diagnostics
	•	type conversions used (adapters)
	•	semantics mismatches (warnings)
	•	performance cost hints

This is how users learn the system.

⸻

4) How buses integrate with adapters (your type lattice pays off here)

4.1 “Convertible” subscriptions

If an input expects S phase and you pick a bus S time, you can auto-insert:
	•	Time→Phase(period) as an inline chip

But where does that adapter live if you didn’t create a wire?

Two options:

Option A (recommended): invisible “binding chain”
	•	The binding itself has an adapter chain.
	•	UI shows tiny chips next to the input:
	•	← timeBus  [Time→Phase]

Option B: create a tiny hidden node near the target
	•	Creates an adapter node in the patch canvas, but rendered minimized by default.

I recommend Option A. It keeps the patch clean and makes the bus feel like the routing fabric.

4.2 Chip inspection

Clicking the chip opens its params (period, mode, etc.) in Inspector.

This keeps everything inspectable and deterministic.

⸻

5) Going from your current UI → this new UI (concrete plan)

You have:
	•	left library
	•	center preview + patchbay (with lanes)
	•	right inspector
	•	typed ports currently opaque
	•	“Connections” concept in top bar

Here’s a phased plan that won’t brick the project.

⸻

Phase 0 (foundation): Type descriptors everywhere

Before buses, you need port badges + compatibility logic (you already committed to this).

Deliverables:
	•	S/F + domain tags on every port
	•	connection validation uses the lattice
	•	adapter insertion exists as a system primitive (even if UI is minimal)

This phase makes buses possible without UX chaos.

⸻

Phase 1 (introduce buses without removing wires)

Add buses as an additional connection target, not a replacement.

UI changes
	•	Add Bus Board panel (simple list)
	•	Add “Buses” section in library
	•	Add port binding dot for inputs (optional in v1; can be “bind” button)

Functionality
	•	Create bus from output
	•	Subscribe input to bus
	•	Combine mode: start with last + sum only
	•	Bus inspector: just lists publishers/listeners

Migration

Existing patches still work. No changes required.
Users can start using buses immediately.

⸻

Phase 2 (make buses delightful)
	•	Add live bus visualizations (sparklines/rings)
	•	Add combine modes per domain
	•	Add “Show convertible buses” + adapter chips in bindings
	•	Add diagnostics (warnings for nonsense casts, feedback detection)

At this point, Loom stops feeling like a wiring puzzle and starts feeling like a playable routing instrument.

⸻

Phase 3 (de-emphasize lanes / adopt zones or free canvas)

Only after buses are working well:
	•	remove lane skeleton, or keep as optional “guided layout”
	•	introduce faint zones (Material/Motion/Look/Post) as backgrounds
	•	encourage “publish to buses” in starter demos

This is where lanes become irrelevant.

⸻

6) A few opinionated defaults that will make this fun immediately

If you want it to feel like an instrument on day one of buses:

Default buses you auto-create in a new patch
	•	phaseA : S phase
	•	phaseB : S phase
	•	energy : S num
	•	pulse : S trigger
	•	palette : S color

These become “house controls” people naturally map to visuals.

Default combine modes
	•	energy = sum with soft clamp
	•	phaseA/phaseB = last (avoid weird mixing of phases)
	•	pulse = or
	•	palette = mix

⸻

7) What you’ll want to rename in your UI for clarity

Instead of “Connections” in the top bar, consider:
	•	Routing (because this is what it becomes)

Because buses are routing first, wiring second.

⸻

If you want the next step, I can:
	•	write a concrete “Bus JSON schema” for your patch file (typed, deterministic combine modes, bindings with adapter chains),
	•	and a deterministic “evaluation order” spec that preserves purity while allowing multiple publishers (i.e., how last and layer are ordered without ambiguity).
