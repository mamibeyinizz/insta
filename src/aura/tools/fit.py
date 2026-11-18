# union sınır kutusundan ölçek (S) ve NDC kaydırma (ox, oy) hesaplar. kullanım: fit.py <sahne> <bg> <S0> <ox0> <oy0> <x0> <y0> <x1> <y1>
import sys, glob, os, numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]; S0, ox0, oy0 = map(float, sys.argv[3:6]); bx0, by0, bx1, by1 = map(float, sys.argv[6:10])
rows = []
for f in sorted(glob.glob(a + '/t*.png')):
    n = os.path.basename(f); t = float(n[1:-4])
    A = np.asarray(Image.open(f).convert('RGB')).astype(np.int16); B = np.asarray(Image.open(b + '/' + n).convert('RGB')).astype(np.int16)
    m = np.abs(A - B).max(axis=2) > 8; ys, xs = np.where(m)
    if len(xs): rows.append((t, xs.min(), ys.min(), xs.max(), ys.max()))
X0 = min(r[1] for r in rows); X1 = max(r[3] for r in rows); Y0 = min(r[2] for r in rows); Y1 = max(r[4] for r in rows)
w, h = X1 - X0, Y1 - Y0; print('UNION x%d-%d y%d-%d  w=%d h=%d' % (X0, X1, Y0, Y1, w, h))
k = min((bx1 - bx0) / w, (by1 - by0) / h) * 0.99; S1 = S0 * k
# birleşim merkezi (px) -> hedef merkez: x' = S*x_ndc + ox   (ndc = (px-540)/540 , y_ndc = (960-px)/960)
cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; tx, ty = (bx0 + bx1) / 2, (by0 + by1) / 2
ndc = lambda p, c, n: (p - c) / c
# eski dönüşümle merkez ndc (sahne) = (c_ndc - ox0)/S0
sx = (ndc(cx, 540, 540) - ox0) / S0; sy = -(ndc(cy, 960, 960)) ; sy = ((960 - cy) / 960 - oy0) / S0
ox1 = (tx - 540) / 540 - S1 * sx; oy1 = (960 - ty) / 960 - S1 * sy
print('S=%.4f ox=%.4f oy=%.4f' % (S1, ox1, oy1))
hh = [(r[0], r[4] - r[2]) for r in rows if r[0] <= 3.0]; print('ilk 3 sn yükseklik (S0): min %d px = %.3f' % (min(x[1] for x in hh), min(x[1] for x in hh) / 1920 * k))
