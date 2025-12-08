# loom99-animations justfile

# Default recipe - show available commands
default:
    @just --list

# Start dev server on all interfaces (accessible from other devices)
serve port="8888":
    python3 -m http.server {{port}} --bind 0.0.0.0

# Start dev server on localhost only
serve-local port="8888":
    python3 -m http.server {{port}} --bind 127.0.0.1

# Kill any running python http servers
kill-server:
    pkill -f "python3 -m http.server" || true
