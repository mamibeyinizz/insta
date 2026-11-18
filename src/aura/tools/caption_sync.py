# Render edilmiş karelerde altyazının açılış/kapanış karelerini ölçer, ses boşluklarıyla karşılaştırır.
import sys, glob, json, numpy as np
from PIL import Image
frames_dir = sys.argv[1]; fps = 30
gaps = [(3.529, 3.899), (8.104, 8.513), (11.571, 11.955), (13.796, 14.16), (16.779, 17.124), (20.177, 20.521), (24.941, 25.32), (32.159, 32.489), (36.525, 36.844)]
extra = [(27.994, 28.208)]   # 25-32 sn bloğunun bölündüğü sessizlik
files = sorted(glob.glob(frames_dir + '/f*.png'))
on = []
for i, f in enumerate(files):
    a = np.asarray(Image.open(f).convert('L').crop((160, 1000, 920, 1210)))
    on.append(int((a > 235).sum()))
on = np.array(on); vis = on > 150
edges = []
for i in range(1, len(vis)):
    if vis[i] != vis[i-1]: edges.append(('in' if vis[i] else 'out', i / fps))
print('altyazı görünür kare oranı: %.3f' % vis.mean(), ' ilk kare görünür:', bool(vis[0]), ' son kare görünür:', bool(vis[-1]))
print('kenarlar:', [(k, round(t, 3)) for k, t in edges])
# her boşluk için: altyazı çıkış (out) zamanı = boşluğun başlangıcı, giriş (in) zamanı = boşluğun bitişi
for g in gaps + extra:
    outs = [t for k, t in edges if k == 'out' and abs(t - g[0]) < 0.35]; ins = [t for k, t in edges if k == 'in' and abs(t - g[1]) < 0.35]
    print('boşluk %.3f-%.3f  altyazı-kapanış %s (Δ=%s)  altyazı-açılış %s (Δ=%s)' % (g[0], g[1], [round(x, 3) for x in outs], [round(x - g[0], 3) for x in outs], [round(x, 3) for x in ins], [round(x - g[1], 3) for x in ins]))
