# Anlatım sesinden konuşma bölgelerini (onset/offset) çıkarır -> audio_timing.json
import subprocess, json, sys, numpy as np
src = sys.argv[1]; out = sys.argv[2]
sr = 44100
raw = subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar',str(sr),'-'],capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop = int(sr*0.005); win = int(sr*0.015)
n = (len(x)-win)//hop
rms = np.array([np.sqrt(np.mean(x[i*hop:i*hop+win]**2)+1e-12) for i in range(n)])
db = 20*np.log10(rms+1e-9)
t = np.arange(n)*hop/sr + win/sr/2
print('dur', len(x)/sr, 'max dB', db.max(), 'p10', np.percentile(db,10))
def segs(thr, mingap):
    act = db > thr
    s=[]; i=0
    while i<n:
        if act[i]:
            j=i
            while j<n and act[j]: j+=1
            s.append([t[i], t[j-1]]); i=j
        else: i+=1
    m=[s[0]]
    for a,b in s[1:]:
        if a-m[-1][1] < mingap: m[-1][1]=b
        else: m.append([a,b])
    return m
res = {}
for thr in (-60,-55,-50,-45,-40):
    res[thr] = segs(thr, 0.25)
    print(thr, len(res[thr]), [(round(a,3),round(b,3)) for a,b in res[thr]])
json.dump({'hop':hop/sr,'t':t.tolist(),'db':db.tolist()}, open(out+'.env.json','w'))
# iç sessizlik/düşük enerji arayışı (H bloğu bölme noktası)
for lo,hi in ((26.3,27.2),(27.5,28.5)):
    m=(t>=lo)&(t<=hi); k=np.argmin(db[m]); print('min', lo,hi, round(t[m][k],3), round(db[m][k],1))
