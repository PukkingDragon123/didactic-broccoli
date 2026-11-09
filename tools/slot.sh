#!/bin/bash
# Run a heavy command (a headless browser run) in one of a few slots, so several agents sharing the machine
# don't pile up browsers. Usage: tools/slot.sh node tools/run.mjs "index.html?autotest&q=low" steps.json
N=${GG_SLOTS:-3}
while true; do
  for i in $(seq 1 "$N"); do
    exec {fd}>"/tmp/gg-slot-$i.lock"
    if flock -n "$fd"; then nice -n 10 "$@"; exit $?; fi
    exec {fd}>&-
  done
  sleep 2
done
