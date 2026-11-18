# Anlatım + çok düşük seviyeli sentezlenmiş ambient pad -> loudnorm (2 geçiş) -> 48 kHz stereo wav
import subprocess, json, sys, re
narr, out_wav, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
FF = ['ffmpeg', '-y', '-hide_banner', '-nostats']
def run(args):
    r = subprocess.run(args, capture_output=True, text=True); 
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(1)
    return r.stderr
D = dur
tonal = ("aevalsrc='(0.20*sin(2*PI*110*t)+0.14*sin(2*PI*164.81*t+0.6)+0.10*sin(2*PI*220*t+1.3)+0.06*sin(2*PI*329.63*t))*(0.75+0.25*sin(2*PI*0.07*t))"
         "|(0.20*sin(2*PI*110.4*t+0.4)+0.14*sin(2*PI*165.2*t)+0.10*sin(2*PI*219.6*t+0.2)+0.06*sin(2*PI*330*t+0.9))*(0.75+0.25*sin(2*PI*0.06*t+1))':s=48000:d=%g" % D)
noiseL = "anoisesrc=d=%g:c=pink:r=48000:a=0.5:seed=11,lowpass=f=500,lowpass=f=420" % D
noiseR = "anoisesrc=d=%g:c=pink:r=48000:a=0.5:seed=23,lowpass=f=500,lowpass=f=420" % D
PAD_DB = float(sys.argv[4]) if len(sys.argv) > 4 else -26
fc = (f"{tonal}[t];{noiseL}[nl];{noiseR}[nr];[nl][nr]join=inputs=2:channel_layout=stereo[ns];"
      f"[t]volume=0.6[t2];[ns]volume=1.0[ns2];[t2][ns2]amix=inputs=2:normalize=0,highpass=f=35,volume={PAD_DB}dB[pad];"
      f"[0:a]aresample=48000,acompressor=threshold=-21dB:ratio=2.4:attack=8:release=140:makeup=1,pan=stereo|c0=c0|c1=c0,apad=whole_dur={D}[nr_];"
      f"[nr_][pad]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.80:attack=4:release=70:level=false[mix]")
run(FF + ['-i', narr, '-filter_complex', fc, '-map', '[mix]', '-ar', '48000', '-c:a', 'pcm_f32le', out_wav + '.pre.wav'])
TP = -2.0
j = run(FF + ['-i', out_wav + '.pre.wav', '-af', f'loudnorm=I=-14:TP={TP}:LRA=9:print_format=json', '-f', 'null', '-'])
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', j, re.S).group(0)); print('pass1', m)
af = (f"loudnorm=I=-14:TP={TP}:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
      f"afade=t=out:st={D-0.4}:d=0.4,aresample=48000")
run(FF + ['-i', out_wav + '.pre.wav', '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', out_wav])
print('done', out_wav)
