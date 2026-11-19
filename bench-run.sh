#!/bin/sh
# SCRATCH: before/after PTY bind bench. after = PR head 0668118de4e256c62a80bc3ddce3041e5bedf08a; before = base 9cc26c17610 implementation.
B=src/main/persistence/loading-store/terminal-bindings/pty-bind-bench.test.ts
run() { echo "=== ARM $1"; timeout 840 pnpm exec vitest run --config config/vitest.config.ts $B --maxWorkers=1 2>&1 | grep -E "BENCH|Tests |Error" ; }
uptime; nproc
run after
for f in src/main/persistence/loading-store/terminal-bindings/pty-binding-persistence.ts src/main/persistence/loading-store/terminal-bindings/pty-binding-session-update.ts src/main/ipc/pty/pane/stable-owner.ts; do git show 9cc26c17610:$f > $f; done
run before
git checkout -- src
run after-repeat
uptime
