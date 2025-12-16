# Transformation Plan: From Wired Graph to Bus-Centric Architecture

This document outlines the step-by-step plan to transform the visual animation editor from a node-wiring paradigm to an infinite-looping, bus-centric system.

---

### **Phase 1: Foundational Data Model and Store Changes for Buses**

This phase introduces the concept of buses at the data level, without yet changing the UI or compiler. It's the essential groundwork.

#### 1. **Update Type System (`gallery/src/editor/types.ts`)**
*   **Goal:** Define `Bus`, `Binding`, and integrate them into the `Patch` structure.
*   **Changes:**
    *   Create a `Bus` interface:
        ```typescript
        // gallery/src/editor/types.ts

        export interface Bus {
          id: string; // UUID
          name: string;
          type: SlotType; // The type of signal the bus carries
          combineMode: 'sum' | 'average' | 'max' | 'min' | 'last' | 'layer'; // Add more as needed
          defaultValue: any; // e.g., 0 for numbers, black for colors
        }
        ```
    *   Modify the `Slot` interface to support bus connections.
        ```typescript
        // gallery/src/editor/types.ts
        
        export interface Slot {
          id: string;
          // ... existing properties
          
          // New properties for bus connections
          publishesToBusId?: string;
          subscribesToBusId?: string;
        
          // Optional: Store adapter chain for "convertible" subscriptions
          adapterChain?: any[]; // Define a type for this
        }
        ```
    *   Update the `Patch` interface to include buses and a version number for future-proofing.
        ```typescript
        // gallery/src/editor/types.ts

        export interface Patch {
          id: string;
          version: '2.0-bus'; // Mark patches using the new system
          blocks: Block[];
          connections: Connection[]; // Kept for backward compatibility
          buses: Bus[]; // New
          // ... other properties
        }
        ```

#### 2. **Update State Management (`gallery/src/editor/store.ts`)**
*   **Goal:** Make the MobX store aware of buses and provide actions to manage them.
*   **Changes:**
    *   In `EditorStore`, add an observable array for buses.
        ```typescript
        // gallery/src/editor/store.ts

        import { makeAutoObservable, observable, action } from 'mobx';
        // ... other imports

        export class EditorStore {
          // ... existing observables
          @observable buses: Bus[] = [];

          constructor() {
            // ...
            makeAutoObservable(this);
          }
          
          // ...
        }
        ```
    *   Create new actions for bus management.
        ```typescript
        // gallery/src/editor/store.ts

        // Inside EditorStore class

        @action
        createBus(name: string, type: SlotType, combineMode: Bus['combineMode'] = 'last') {
          const newBus: Bus = {
            id: uuidv4(),
            name,
            type,
            combineMode,
            defaultValue: 0, // Or determine based on type
          };
          this.buses.push(newBus);
          return newBus;
        }

        @action
        publishToBus(slotId: string, busId: string) {
          const block = this.findBlockBySlotId(slotId);
          if (block) {
            const slot = block.slots.find(s => s.id === slotId);
            if (slot) {
              slot.publishesToBusId = busId;
              // Important: Disconnect any existing wire from this output slot
              this.connections = this.connections.filter(c => c.from.slotId !== slotId);
            }
          }
        }
        
        @action
        subscribeToBus(slotId: string, busId: string) {
          const block = this.findBlockBySlotId(slotId);
          if (block) {
            const slot = block.slots.find(s => s.id === slotId);
            if (slot) {
              slot.subscribesToBusId = busId;
               // Important: Disconnect any existing wire to this input slot
              this.connections = this.connections.filter(c => c.to.slotId !== slotId);
            }
          }
        }

        // ... other actions for updating/deleting buses
        ```
    *   Update `loadPatch` and `toJSON` to handle the new `buses` array and `version`.

---

### **Phase 2: Backend Compiler Rearchitecture**

This is the most complex phase. The compiler must shift from a simple DAG traversal to a multi-pass system that understands bus semantics.

#### 1. **Modify Compiler (`gallery/src/editor/compiler/compile.ts`)**
*   **Goal:** Re-architect the `compilePatch` function.
*   **Corrected `compilePatch` Flow:**
    1.  **Build Dependency Graph:** Construct the full dependency graph including both wire and bus connections. An edge exists from Block A to Block B if B subscribes to a bus A publishes to, or if they are wired. Detect illegal cycles (cycles without a `Delay` block).
    2.  **Topological Sort:** Get the final execution order of all blocks from the graph.
    3.  **Iterative Compilation:**
        *   Initialize two maps: `blockArtifacts: Map<string, CompiledArtifact>` and `busArtifacts: Map<string, CompiledArtifact[]>`.
        *   Iterate through the sorted blocks:
            *   For the current `block`, resolve its inputs by looking up dependencies in `blockArtifacts` and `busArtifacts`.
            *   Compile the block. Store its output in `blockArtifacts`.
            *   If any of its output slots `publishToBusId`, push the resulting artifact into the `busArtifacts` map (e.g., `busArtifacts.get(busId).push(output)`).
    4.  **Final Bus Combination:**
        *   After all blocks are compiled, iterate through the `busArtifacts` map.
        *   For each bus, take the array of artifacts and combine them using the `bus.combineMode` function (e.g., sum them up, average them). This produces the final, single value for each bus.
    5.  **Final Program Assembly:** The compiled output will need to be a function that takes `time` and a context object containing the resolved bus values.

---

### **Phase 3: UI Implementation for Bus Board and Block Interaction**

This phase brings the bus concept to the user interface.

#### 1. **Create Bus Board Component (`gallery/src/editor/ui/BusBoard.tsx`)**
*   **Goal:** Build the central mixer panel described in the planning docs.
*   **Implementation:**
    *   Create a new React component that receives `editorStore.buses` as a prop.
    *   Render a list of "channels" (`BusChannel.tsx`), each displaying:
        *   Bus name (editable).
        *   Type badge.
        *   Live visualization (e.g., sparkline).
        *   Publisher/subscriber counts.
        *   A dropdown to change `combineMode`.
    *   Add a "New Bus" button that calls `editorStore.createBus`.
    *   Integrate this `BusBoard` component into `Editor.tsx`.

#### 2. **Update Block/Slot UI (`gallery/src/editor/PatchBay.tsx` and node components)**
*   **Goal:** Replace wire-dragging with bus publishing/subscribing.
*   **Implementation:**
    *   **Input Slots:** Show a "binding dot". Clicking it opens a `BusPicker` dropdown to select a compatible bus, which calls `editorStore.subscribeToBus`.
    *   **Output Slots:** On click/drag, show a radial menu with options: "Create new bus" or "Publish to existing bus...".
    *   Phase out rendering of bezier curves for connections.

---

### **Phase 4: Implementing Infinite Looping and Time Controls**

With the bus architecture in place, you can now build the infinite looping capabilities.

#### 1. **Introduce New Time-Management Blocks**
*   **Goal:** Add the minimum block set for looping and stateful feedback.
*   **Implementation:**
    *   Create the following new blocks:
        *   `Delay`: A stateful block. Its output at time `t` is its input from time `t-1`. This is the key to safe feedback loops and must be treated as a special case by the cycle detector in the compiler.
        *   `Cycle`: Outputs a `Phase` signal (0-1) based on a configurable loop duration.
        *   `PhaseAccumulator`: A local time accumulator.
        *   `MapRange`, `Slew`, etc. as described in `minimum-block-set-for-infinite.md`.

#### 2. **Update UI for Time Mode**
*   **Goal:** Add UI controls for managing looping behavior.
*   **Implementation:**
    *   Add a `Time Mode` switch: `Clip | Loop | Ambient` to the main transport/timeline area.
    *   In `Loop` or `Ambient` mode, the timeline should visualize cycles.
    *   Expose controls for `Loop Length` and `Drift`.

---

### **Phase 5: Backward Compatibility and Deprecation**

This phase ensures a smooth transition for users and existing projects.

#### 1. **Manage Patch Versions**
*   **Goal:** Gracefully handle old and new patch formats.
*   **Implementation:**
    *   `EditorStore.loadPatch` should inspect the `patch.version` field.
    *   If the version is old or missing, use the old compiler/UI logic for wires.
    *   If the version is `2.0-bus`, use the new bus-centric logic.
    *   Consider adding a "Migrate to Buses" button that attempts to convert a wired patch to a bus-based one.

#### 2. **Gradually Deprecate Wires and Lanes**
*   **Goal:** Nudge users towards the new paradigm.
*   **Plan:**
    *   **Initially:** Wires and buses coexist.
    *   **Mid-transition:** Change the default interaction. Hide wires by default. Make creating buses the primary action.
    *   **Finally:** Remove the wire-drawing and connection logic entirely. Remove the "Lane" concept from the UI.
