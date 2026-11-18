# v1 (etiketsiz, JPEG->yuv420p bt601 matrisli) ile v2 (bt709 etiketli) neon renklerini kaynak karelere göre karşılaştırır.
import sys, subprocess, numpy as np
from PIL import Image
v1, v2, src1, src2 = sys.argv[1:5]   # v1.mp4, v2.mp4, v1 kaynak jpg kalıbı, v2 kaynak png kalıbı
def grab(video, n, interp):
    vf = f"select=eq(n\\,{n}),scale=in_color_matrix={interp}:in_range=tv:out_range=pc,format=rgb24"
    r = subprocess.run(['ffmpeg','-v','error','-i',video,'-vf',vf,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(r, np.uint8).reshape(1920,1080,3).astype(float)
def sat_mask(a):
    mx=a.max(2); mn=a.min(2); return ((mx-mn)/(mx+1e-6)>0.5)&(mx>130)
def hue(a):
    import colorsys
    r,g,b=[a[...,i]/255 for i in range(3)]; mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b); d=mx-mn+1e-9
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60; return h
for t in (10.0, 20.0, 36.0):
    n=int(round(t*30))
    s1=np.asarray(Image.open(src1%n).convert('RGB')).astype(float); s2=np.asarray(Image.open(src2%n).convert('RGB')).astype(float)
    for name,vid,src,interp in (('v1 (etiketsiz) bt709 gibi çözülürse',v1,s1,'bt709'),('v1 bt601 gibi çözülürse',v1,s1,'bt601'),('v2 (bt709 etiketli)',v2,s2,'bt709')):
        d=grab(vid,n,interp); m=sat_mask(src)
        dh=((hue(d)-hue(src)+180)%360-180)[m]
        print('t=%4.1f %-36s doygun px=%7d  ΔRGB ort=(%+.1f,%+.1f,%+.1f)  |Δ| ort=%.1f  ton kayması ort=%+.1f° (|.|=%.1f°)'%(t,name,m.sum(),*(d[m]-src[m]).mean(0),np.abs(d[m]-src[m]).mean(),dh.mean(),np.abs(dh).mean()))
