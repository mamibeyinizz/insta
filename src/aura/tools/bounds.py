# Sahne (nocap) ile yalnız-arka-plan karelerinin farkından aura sınır kutusunu çıkarır.
import sys, glob, os, numpy as np
from PIL import Image
a_dir, b_dir = sys.argv[1], sys.argv[2]; thr = int(sys.argv[3]) if len(sys.argv) > 3 else 8
rows = []
for f in sorted(glob.glob(a_dir + '/t*.png')):
    name = os.path.basename(f); t = float(name[1:-4])
    A = np.asarray(Image.open(f).convert('RGB')).astype(np.int16); B = np.asarray(Image.open(b_dir + '/' + name).convert('RGB')).astype(np.int16)
    m = np.abs(A - B).max(axis=2) > thr
    ys, xs = np.where(m)
    if len(xs) == 0: rows.append((t, None)); continue
    rows.append((t, (xs.min(), ys.min(), xs.max(), ys.max(), int(m.sum()))))
rows.sort()
valid = [r for r in rows if r[1]]
U = (min(r[1][0] for r in valid), min(r[1][1] for r in valid), max(r[1][2] for r in valid), max(r[1][3] for r in valid))
print('UNION x%d-%d y%d-%d' % (U[0], U[2], U[1], U[3]))
if '-v' in sys.argv:
    for t, b in rows: print(t, b)
