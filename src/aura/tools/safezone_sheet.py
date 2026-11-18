# Videodan 0.5 sn aralıkla kare çıkarır, güvenli bölge bantlarını (üst 270, alt 672, yan 65) kırmızıyla çizer, contact sheet kaydeder.
import sys, subprocess, os, glob
from PIL import Image, ImageDraw
v, outdir = sys.argv[1], sys.argv[2]; os.makedirs(outdir, exist_ok=True)
for f in glob.glob(outdir + '/s*.png'): os.remove(f)
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',v,'-vf','fps=2,scale=out_color_matrix=bt709:in_color_matrix=bt709:in_range=tv:out_range=pc','-pix_fmt','rgb24',outdir+'/s%03d.png'],check=True)
files = sorted(glob.glob(outdir + '/s*.png')); print(len(files), 'kare')
def band(im):
    W, H = im.size
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for r in ((0,0,W,270),(0,1248,W,H),(0,0,65,H),(W-65,0,W,H)): d.rectangle(r, fill=(255,0,0,60))
    for r in ((0,270,W,270),(0,1248,W,1248),(65,0,65,H),(W-65,0,W-65,H)): d.line(r, fill=(255,40,40,255), width=4)
    return Image.alpha_composite(im, ov)
tw, th, cols, per = 300, 533, 6, 24
for si in range(0, len(files), per):
    chunk = files[si:si+per]; rows = (len(chunk)+cols-1)//cols
    sheet = Image.new('RGB', (cols*tw, rows*th), (30,30,30))
    for i, f in enumerate(chunk):
        im = band(Image.open(f).convert('RGBA')).convert('RGB').resize((tw, th), Image.LANCZOS)
        sheet.paste(im, ((i%cols)*tw, (i//cols)*th))
    p = outdir + '/sheet_%d.jpg' % (si//per); sheet.save(p, quality=88); print(p)
