#!/bin/bash
# kullanım: encode.sh <kareDizini> <ses.wav> <çıktı.mp4>
set -e
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i "$1/f%05d.png" -i "$2" \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -profile:v high -level 4.2 -b:v 9M -maxrate 10M -bufsize 20M -g 60 -bf 2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -r 30 -fps_mode cfr -c:a aac -b:a 192k -ar 48000 -ac 2 -t 41.0 -movflags +faststart "$3"
