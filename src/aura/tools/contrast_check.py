# notext render karelerinde (scrim var, yazı saydam) metin kutusu altındaki arka plan parlaklığından kontrast oranı.
import sys, json, glob, numpy as np
from PIL import Image
lay = json.load(open(sys.argv[1])); d = sys.argv[2]
def lin(c): c = c / 255.0; return np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lum(a): return 0.2126 * lin(a[..., 0]) + 0.7152 * lin(a[..., 1]) + 0.0722 * lin(a[..., 2])
worst = 99
for s in lay['segs']:
    t = (s['a'] + s['b']) / 2; f = '%s/t%.2f.png' % (d, t)
    im = np.asarray(Image.open(f).convert('RGB')).astype(float)
    x0, x1, y0, y1 = s['textLeft'], s['textRight'], s['textTop'] + 8, s['textBottom'] - 8
    reg = im[y0:y1, x0:x1]; Lb = lum(reg); p = np.percentile(Lb, 99.5)
    c_read = (1.0 + 0.05) / (p + 0.05)                         # okunmuş kelime: beyaz
    unread = 0.64 * 255 + 0.36 * reg; Lu = lum(unread); c_unread = np.min((Lu + 0.05) / (Lb + 0.05))   # okunmamış: %64 beyaz
    worst = min(worst, c_read, c_unread)
    print('seg %2d t=%.2f  bg-lum p99.5=%.3f  kontrast(okunmuş)=%.1f  kontrast(okunmamış,en kötü piksel)=%.1f' % (s['seg'], t, p, c_read, c_unread))
print('EN KÖTÜ KONTRAST: %.2f' % worst)
