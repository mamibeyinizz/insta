#!/bin/bash
# kullanım: gaplevels.sh <ses|video>  -> cümle arası pencerelerde ortalama seviye (dB)
F="$1"
for g in "3.58 3.86" "8.15 8.48" "11.62 11.92" "13.84 14.12" "16.83 17.08" "20.22 20.48" "24.99 25.28" "32.2 32.45" "36.58 36.8" "26.74 26.88" "28.02 28.2"; do
 a=${g% *}; b=${g#* }
 echo -n "boşluk $a-$b: "; ffmpeg -hide_banner -nostats -ss $a -to $b -i "$F" -vn -af volumedetect -f null - 2>&1 | grep mean_volume | sed 's/.*mean_volume: //'
done
