# Strategic Considerations & Future Directions

This document explores potential challenges and future opportunities to build upon the bus-centric architecture.

### 1. Wire and Bus Coexistence (PERMANENT POLICY)

**Important**: Wires and buses will coexist indefinitely. This is a deliberate design choice, not a transitional state.

*   **Wires remain in the codebase:**
    *   The `connections: Connection[]` array stays in the `Patch` type.
    *   The `connect` and `disconnect` actions remain in the store.
    *   Wire rendering and interaction logic remains in PatchBay.
*   **UI de-emphasis (not removal):**
    *   Buses are promoted as the primary routing mechanism in the UI.
    *   Wire creation UI is available but not prominent (e.g., in advanced mode, context menus).
    *   New users are guided toward buses; power users can still wire directly.
*   **Internal use cases for wires:**
    *   Composite block internals (wiring between internal primitive blocks).
    *   Legacy patch support without conversion.
    *   Explicit, visible connections when debugging or when the user prefers them.
*   **Lanes will be removed:** The Lane concept is being phased out. The patch bay will become a freeform canvas organized by buses rather than lanes.

### 2. Things to Watch Out For (Risks & Mitigations)

*   **Performance:**
    *   **Challenge:** The multi-pass compiler and real-time evaluation for the Bus Board's live visualizations can be computationally expensive, especially with many publishers on a single bus.
    *   **Mitigation:** Implement aggressive memoization and caching in the compiler. The evaluation engine should be highly optimized, possibly exploring WASM for critical "hot" blocks or bus combiners. Introduce a "Performance Profiler" UI overlay early to identify bottlenecks.
*   **Illegal Feedback Loops:**
    *   **Challenge:** A user accidentally creating a cycle without a `Delay` or `State` block can lead to infinite loops, crashes, or `NaN` value propagation.
    *   **Mitigation:** The cycle detection algorithm in the compiler must be flawless. When a cycle is detected, the UI must provide immediate, clear, and visual feedback, highlighting the exact blocks and buses forming the illegal loop and suggesting the insertion of a `Delay` block.
*   **User Experience & Complexity:**
    *   **Challenge:** While powerful, the bus system introduces a level of abstraction that can be less intuitive than direct wiring for simple patches. A crowded Bus Board could be overwhelming.
    *   **Mitigation:** Invest heavily in the UX. The "binding dot" and bus picker UI must be seamless. The Bus Board needs excellent organization tools like grouping and filtering. Provide built-in, interactive tutorials that guide users through the "why" of buses, not just the "how".
*   **Determinism:**
    *   **Challenge:** Features like the `last` writer `combineMode` depend on a stable, deterministic block execution order. Changes to the layout or block IDs should not affect the final animation.
    *   **Mitigation:** The topological sort must be stable. The execution order should be based on the dependency graph alone, not on incidental properties like array order or block position on the canvas.

### 3. Taking It Further (Next-Level Features)

Once the bus architecture is in place, it unlocks powerful new capabilities:

*   **User-Defined Bus Combiners:** Allow advanced users to write their own JavaScript or WASM functions to use as a `combineMode` on a bus, enabling complex, custom mixing logic.
*   **First-Class Composite Blocks:** Develop a workflow where a user can select a group of blocks, and the editor automatically collapses them into a single "macro" block, exposing a curated set of its internal bus subscriptions and publications as new inputs/outputs.
*   **Field Buses:** As mentioned in the planning docs, this is a killer feature. Double down on `Field<T>` buses, allowing multiple systems to influence per-element attributes (e.g., one bus for particle color, another for particle size, a third for particle velocity).
*   **Scoped Buses:** Introduce "local" buses that only exist within a composite block, preventing pollution of the global bus namespace and enabling cleaner, more modular patches.

### 4. Ideas Inspired by Other Software

*   **Ableton Live:** The "Sends/Returns" model is a direct parallel. We can also draw inspiration from "Max for Live" for custom user-programmable blocks and the "Clip Launcher" for triggering different animation scenes or states.
*   **Bitwig Studio:** Its universal modulation system is a masterclass in UX for connecting anything to anything. The way it displays small, animated modulator icons next to each parameter is a great reference for how bus subscriptions can be visualized directly on a block's UI.
*   **TouchDesigner / Notch:** These tools demonstrate what's possible in terms of performance and library size. Aspire to their level of real-time feedback. They also seamlessly integrate 3D, textures, and video streams, which could be a future direction.
*   **Resolume / VJ Software:** The layer-based composition paradigm is a strong model for the "Composition Stack" that should work alongside the bus system. The handling of tempo, BPM sync, and trigger-based effects is also highly relevant.

### 5. Interoperability & Compatibility

The bus system is perfect for external integration. Any value on a bus can be seen as a control signal.

*   **OSC (Open Sound Control):** This is the top priority.
    *   **OSC Out:** Any bus should have a simple toggle to broadcast its value over OSC.
    *   **OSC In:** Create an `OSC In` block that listens on a specific OSC address and publishes the received data to a bus. This would connect the editor to countless other creative tools (TouchDesigner, Max/MSP, VCV Rack).
*   **MIDI:**
    *   **MIDI In:** A `MIDI In` block could translate MIDI CC, Note On/Off, and Clock signals into values on `num`, `trigger`, and `phase` buses.
    *   **MIDI Out:** Allow `trigger` buses to send MIDI notes or CCs.
*   **NDI (Network Device Interface):**
    *   **NDI Out:** An `NDI Out` block could broadcast the final rendered canvas as a video source on the local network, allowing it to be used in OBS, live streaming software, or VJ tools.
    *   **NDI In:** An `NDI In` block could bring in external video streams to be used as textures or analysis sources within the animation patch.
*   **Advanced Export Formats:** Go beyond simple video renders.
    *   **Lottie:** Export animations as Lottie JSON files for use on the web.
    *   **Standalone JS/WASM Bundle:** Package an entire animation patch and the runtime engine into a single file that can run interactively on a website.

### 6. Other Improvements

*   **Visual Debugging Tools:** Beyond sparklines, add a more advanced "scope" or "plot" view for buses. For a `vec2` bus, show an XY plot. For a `phase` bus, show a phase portrait.
*   **Patch Snapshots & Morphing:** Add a feature to store the state of all bus values as a "snapshot." Then, create a block that can smoothly interpolate or "morph" between different snapshots over time.
*   **Improved Type System:** Introduce more granular semantic types like `Angle`, `Frequency`, `BPM`, or `Normalized (0-1)` to enable more intelligent automatic conversions and clearer UI.
