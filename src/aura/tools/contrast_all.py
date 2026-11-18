# Altyazı görünen her 0.5 sn karede (notext render) en kötü kontrastı ölçer.
import sys, json, glob, os, numpy as np
from PIL import Image
lay = json.load(open(sys.argv[1])); d = sys.argv[2]
def lin(c): c = c / 255.0; return np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lum(a): return 0.2126 * lin(a[..., 0]) + 0.7152 * lin(a[..., 1]) + 0.0722 * lin(a[..., 2])
res = []
for f in sorted(glob.glob(d + '/t*.png')):
    t = float(os.path.basename(f)[1:-4]); seg = [s for s in lay['segs'] if s['a'] + 0.1 <= t <= min(s['b'], 40.9) - 0.05]
    if not seg: continue
    s = seg[0]; im = np.asarray(Image.open(f).convert('RGB')).astype(float)
    reg = im[s['textTop'] + 8:s['textBottom'] - 8, s['textLeft']:s['textRight']]; Lb = lum(reg)
    p995 = np.percentile(Lb, 99.5); c_read = 1.05 / (p995 + 0.05)
    Lu = lum(0.64 * 255 + 0.36 * reg); cu = (Lu + 0.05) / (Lb + 0.05); frac_fail = float((cu < 4.5).mean())
    res.append((t, c_read, float(np.percentile(cu, 0.5)), frac_fail))
w = min(res, key=lambda r: r[2])
print('kare sayısı', len(res), '| okunmuş en kötü %.1f (t=%.1f)' % (min(r[1] for r in res), min(res, key=lambda r: r[1])[0]),
      '| okunmamış 0.5.yüzdelik en kötü %.1f (t=%.1f) | 4.5 altı piksel oranı en kötü %.4f' % (w[2], w[0], max(r[3] for r in res)))
