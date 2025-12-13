# loom99-animations justfile

# Default recipe - show available commands
default:
    @just --list

# Start React gallery dev server
dev port="8889":
    cd gallery && pnpm dev --port {{port}}

# Start React gallery (alias)
gallery port="8889":
    cd gallery && pnpm dev --port {{port}}

# Build the gallery
build:
    cd gallery && pnpm build

# Run tests
test:
    cd gallery && pnpm test

# Start simple HTTP server for raw HTML animations (legacy)
serve-html port="8888":
    python3 -m http.server {{port}} --bind 0.0.0.0

# Start simple HTTP server on localhost only (legacy)
serve-html-local port="8888":
    python3 -m http.server {{port}} --bind 127.0.0.1

# Kill any running servers
kill-server:
    pkill -f "python3 -m http.server" || true
    pkill -f "vite" || true