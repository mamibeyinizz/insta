#!/bin/bash
# kullanım: runq.sh <sorgu> <çıktıDizini> <adım> [bitiş]  -> 3 paralel işçiyle t=0..bitiş (adım aralıklı) png üretir
q="$1"; d="$2"; step="$3"; end="${4:-41}"
TS=($(seq 0 $step $end)); rm -rf "$d"
for k in 0 1 2; do sub=(); for i in "${!TS[@]}"; do [ $((i%3)) -eq $k ] && sub+=("${TS[$i]}"); done
  node "$(dirname "$0")/../render.mjs" "$d" 30 0 1 0 "$q" png "${sub[@]}" > /dev/null 2>&1 & done; wait
