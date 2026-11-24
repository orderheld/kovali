#!/bin/bash
# usage: run_jobs.sh <scale> <ss> <outdir> [name-filter]
scale=$1; ss=$2; out=$3; filt=${4:-.}
mkdir -p $out
while IFS='|' read -r name w h q; do
  [[ -z "$name" ]] && continue
  echo "$name" | grep -qE "$filt" || continue
  W=$(python3 -c "print(round($w*$scale))"); H=$(python3 -c "print(round($h*$scale))")
  NODE_PATH=$(npm root -g) node "$(dirname "$0")/render.js" x $W $H $ss $out/$name.png "$q" 2>&1 | grep -iE "error|rendered"
done < "$(dirname "$0")/jobs.txt"
