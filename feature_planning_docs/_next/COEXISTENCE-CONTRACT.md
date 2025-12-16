# Wire/Bus Coexistence Contract
Generated: 2025-12-16
Status: APPROVED - Permanent architectural policy

## Executive Summary

**Wires and buses coexist indefinitely. Lanes will be removed.**

This is a deliberate architectural decision, not a transitional state.

---

## Policy Statements

### 1. Wires: REMAIN (De-emphasized)

Block-to-block wiring will **NOT** be deprecated or removed.

**Rationale:**
- Wires are essential for composite block internals (primitive blocks wired together)
- Legacy patches continue to work without forced migration
- Advanced users may prefer explicit wiring for debugging or specific use cases
- Simpler internal implementation for some block connections

**UI Treatment:**
- Wires are de-emphasized in the UI (not the primary interaction)
- Wire creation available via context menus, advanced mode, or drag-from-port
- New users are guided toward buses as the primary routing mechanism
- Existing wire rendering and interaction logic remains functional

**Compiler Support:**
- The compiler supports patches with wires only, buses only, or both
- Wire connections and bus connections can coexist in the same patch
- No auto-conversion or forced migration

### 2. Buses: PRIMARY (Promoted)

Buses are the **primary** routing mechanism in the UI.

**Rationale:**
- Buses provide "shared influence" mental model (vs wires' "explicit connection")
- Better for emergence without visual spaghetti
- Natural for musicians/VJs/lighting designers
- Enables multiple publishers to influence the same value
- Cleaner separation of concerns

**UI Treatment:**
- Bus Board is prominently displayed
- Publishing/subscribing to buses is the default interaction
- Buses are first-class citizens in the Library panel

### 3. Lanes: REMOVED

The Lane concept will be **completely removed**.

**Rationale:**
- Lanes tried to imply flow but failed
- Buses provide better organization via named signals
- Freeform canvas with optional zones is more flexible
- Lanes added complexity without clear benefit

**Migration Path:**
- Phase out lane UI progressively
- Replace with freeform canvas
- Optional visual "zones" (Material/Motion/Look/Post) as soft background hints
- Blocks organized by bus relationships, not lane placement

---

## Implementation Phases

| Phase | Wires | Buses | Lanes |
|-------|-------|-------|-------|
| Current | Primary | None | Primary |
| Phase 1 | Available | Introduced | Available |
| Phase 2 | Available | Encouraged | De-emphasized |
| Phase 3+ | De-emphasized | Primary | Removed |
| Permanent | Available | Primary | Gone |

---

## Technical Implications

### Data Model
```typescript
interface Patch {
  version: number;
  blocks: Block[];
  connections: Connection[];  // KEPT - wires remain
  buses: Bus[];               // ADDED - buses are primary
  publishers: Publisher[];    // ADDED
  listeners: Listener[];      // ADDED
  // lanes: Lane[];           // REMOVED in future
}
```

### Compiler
- `compilePatch()` - handles wire-only patches (legacy)
- `compileBusAwarePatch()` - handles patches with buses (and optional wires)
- Both paths remain supported indefinitely

### Store Actions
- `connect()` / `disconnect()` - KEPT for wire management
- `createBus()` / `deleteBus()` - ADDED for bus management
- `addPublisher()` / `addListener()` - ADDED for bus routing
- Lane-related actions - REMOVED in future

---

## Non-Negotiables

1. **Wires are never removed from the codebase**
2. **Buses are the promoted UI paradigm**
3. **Lanes are removed entirely**
4. **No forced migration of wire-based patches**
5. **Compiler supports both paradigms indefinitely**

---

## Rationale Summary

| Concept | Decision | Why |
|---------|----------|-----|
| Wires | Keep (de-emphasize) | Internal use, composites, legacy, power users |
| Buses | Promote (primary) | Better mental model, cleaner emergence, VJ-friendly |
| Lanes | Remove | Failed abstraction, replaced by bus organization |
