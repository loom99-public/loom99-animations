# loom99 Animation Gallery

React + TypeScript gallery for viewing and managing animation techniques.

## Architecture

### Core Track System

The gallery includes a greenfield animation track system:

- **Track.ts**: Time-based value interpolation with easing
- **Element.ts**: Base class for animated elements
- **Animation.ts**: Lifecycle orchestration (entrance/hold/exit/waiting)
- **easing.ts**: Comprehensive easing functions library
- **SVGExporter.ts**: Export animations as static SVG with SMIL

### Element Types

- **LineElement**: Animated SVG paths with line drawing and fade effects
- Extensible architecture for additional element types

### React Components

- **Gallery**: Main container with expand/collapse controls
- **TechniqueSection**: Collapsible accordion for each technique
- **AnimationCard**: Individual animation preview with iframe
- **MobX Store**: Reactive state management

### Data Structure

Metadata-driven architecture:
- **types.ts**: TypeScript type definitions
- **techniques.ts**: 10 animation technique definitions
- **animations.ts**: Animation file metadata

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
gallery/
├── src/
│   ├── core/              # Track system
│   │   ├── Track.ts
│   │   ├── Element.ts
│   │   ├── Animation.ts
│   │   ├── easing.ts
│   │   └── SVGExporter.ts
│   ├── elements/          # Element types
│   │   └── LineElement.ts
│   ├── components/        # React components
│   │   ├── Gallery.tsx
│   │   ├── TechniqueSection.tsx
│   │   └── AnimationCard.tsx
│   ├── stores/            # MobX stores
│   │   └── galleryStore.ts
│   ├── data/              # Animation metadata
│   │   ├── types.ts
│   │   ├── techniques.ts
│   │   └── animations.ts
│   ├── App.tsx
│   └── main.tsx
└── vite.config.ts
```

## Features

- Metadata-driven animation gallery
- Collapsible technique sections
- Iframe-based animation preview
- Expand/collapse all controls
- Dark theme UI matching existing design
- TypeScript type safety
- MobX reactive state
- SVG export capability
- Production-ready build

## Adding New Animations

To add a new animation:

1. Create the animation HTML file in `../animations/`
2. Add metadata to `src/data/animations.ts`:

```typescript
{
  id: 'logo-11-bounce',
  title: 'Original',
  description: 'Bouncy entrance effect',
  technique: '11',
  target: 'logo',
  variant: 'original',
  filePath: 'logo/logo-11-bounce.html',
}
```

3. The gallery will automatically render the new animation

## Phase 1 Status

Complete:
- React + Vite + TypeScript setup
- Core track system implementation
- React gallery components
- MobX state management
- One technique (Line Drawing) with 6 animations
- Production build verified

Next Steps:
- Add remaining animation metadata (54 files)
- Test iframe embedding with actual files
- Consider URL state management
- Add keyboard navigation
- Add search/filter capabilities
