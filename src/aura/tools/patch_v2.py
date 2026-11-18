import re,sys
p='scene.js'; s=open(p,encoding='utf-8').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, 'MISSING: '+old[:70]
    s=s.replace(old,new) if cnt==0 else s.replace(old,new,cnt)

# --- bayraklar + projeksiyon dönüşümü
rep("const PXS = H / (2 * Math.tan(FOV * Math.PI / 360));",
"""const PXS = H / (2 * Math.tan(FOV * Math.PI / 360));
const QS = new URLSearchParams(location.search);
/* güvenli bölge uyumu: tüm sahne tek tip ölçek (S) + NDC kaydırma (ox, oy) ile küçültülür/kaydırılır */
const SC = { S: parseFloat(QS.get('s') || '1'), ox: parseFloat(QS.get('ox') || '0'), oy: parseFloat(QS.get('oy') || '0') };
const NOCAP = QS.has('nocap'), BGONLY = QS.has('bgonly'), NOTEXT = QS.has('notext');
const BASE_P = camera.projectionMatrix.clone();""")
rep("uPxS: { value: PXS },","uPxS: { value: PXS * SC.S },")
rep("gl_PointSize=(1.7+2.6*pulse)*1.5; }`","gl_PointSize=(1.7+2.6*pulse)*1.5*uLinePx; }`")
rep("uniform float uT,uScale,uLine,uSpeed,uDirt,uMixL,uCy,uPxS;","uniform float uT,uScale,uLine,uSpeed,uDirt,uMixL,uCy,uPxS,uLinePx;")
rep("uMixL: { value: 0 }, uCy: { value: CY } }","uMixL: { value: 0 }, uCy: { value: CY }, uLinePx: { value: Math.max(SC.S, 0.75) } }")

# --- zaman çizelgesi (ses dalga formundan ölçülen)
rep("const T = { A: [0, 3.51], B: [3.91, 8.06], C: [8.53, 11.55], D: [11.96, 13.78], E: [14.17, 16.75], F: [17.14, 20.16], G: [20.53, 24.93], H: [25.33, 32.15], I: [32.5, 36.5], J: [36.85, 39.39] };",
    "const T = { A: [0.032, 3.525], B: [3.904, 8.099], C: [8.518, 11.566], D: [11.96, 13.791], E: [14.165, 16.774], F: [17.129, 20.172], G: [20.526, 24.936], H: [25.325, 32.154], I: [32.494, 36.52], J: [36.849, 39.273] };")
rep("const DURATION = 40.0;","const DURATION = 41.0;                // anlatım 39.39 sn + 1.6 sn bekleme (hold)")
rep("[11.9, 1.0], [12.5, 0.96], [13.05, 0.5], [13.95, 1.36],","[11.9, 1.0], [12.4, 0.97], [12.92, 0.5], [13.85, 1.36],")
rep("const INNER_T = [T.F[0], 17.82, 18.49, 19.33];","const INNER_T = [17.124, 17.972, 18.69, 19.5];   // duyguların / anıların / düşüncelerin / dürtülerin")
rep("const DIRT = [[25.3, 0], [26.33, 0.04], [26.7, 0.3], [27.82, 0.55], [28.82, 0.72], [29.82, 0.9], [30.98, 1.0], [40, 1.0]];",
    "const DIRT = [[25.3, 0], [26.4, 0.04], [26.72, 0.3], [27.99, 0.55], [29.12, 0.72], [30.03, 0.9], [31.0, 1.0], [41.5, 1.0]];")
rep("{ n: 70, a: 25.95, b: 26.8,","{ n: 70, a: 25.95, b: 26.8,")
rep("{ n: 110, a: 26.7, b: 28.1,","{ n: 110, a: 26.9, b: 28.0,")
rep("{ n: 90, a: 27.9, b: 29.3,","{ n: 90, a: 28.2, b: 29.2,")
rep("{ n: 110, a: 29.1, b: 31.2,","{ n: 110, a: 29.2, b: 31.2,")
rep("const CAMD = [[0, 13.8], [3.5, 11.6], [8, 11.2], [13, 11.0], [14.2, 10.8], [16.7, 10.0], [17.3, 10.3], [21, 10.8], [25, 11.2], [32, 11.5], [36, 12.4], [39.6, 13.8]];",
    "const CAMD = [[0, 12.6], [3.5, 11.6], [36, 11.6], [39.6, 12.4]];   // güvenli bölge için sabit mesafe (itme yok)")
rep("- 0.55 * sstep(14.2, 16.5, t) * (1 - sstep(17, 18, t));",";")
rep("camera.lookAt(0, 0.38 + 0.25 * sstep(14.2, 16.5, t) * (1 - sstep(17, 18, t)), 0);",
"""camera.lookAt(0, 0.62, 0);
  camera.updateMatrixWorld();
  camera.projectionMatrix.copy(BASE_P);
  { const E = camera.projectionMatrix.elements; E[0] *= SC.S; E[5] *= SC.S; E[8] = -SC.ox; E[9] = -SC.oy; }""")

# --- aura dışına taşan efektleri içeri al
rep("y: rr(-0.5, 5.0), z: rr(-3, 2.5)","y: rr(-1.0, 3.3), z: rr(-2.2, 2.2)")
rep("const y = ((p.y + t * p.v + 0.5) % 5.5) - 0.5;","const y = ((p.y + 1.0 + t * p.v) % 4.3) - 1.0;")
rep("kk = lerp(3.6, Rs,","kk = lerp(1.5, Rs,")
rep("k = lerp(2.4, p.wob,","k = lerp(1.55, p.wob,")
rep("R = lerp(3.4, 1.0, u * u * 0.5 + u * 0.5);","R = lerp(2.3, 0.9, u * u * 0.5 + u * 0.5);")
rep("waveMat.uniforms.uRadius.value = Math.max(wR, 0.01);","waveMat.uniforms.uRadius.value = clamp(wR, 0.01, 2.7);")
rep("""    const R = waveR(s.tk), q = [s.d[0] * R, CY + s.d[1] * R * 1.0, s.d[2] * R];
    put(ADD, q[0], q[1] + age * s.up, q[2], 1, .85, .5, (1 - age / s.life) * (R < 5.5 ? 1 : 0) * .95, s.s);""",
"""    const q = ellPos(s.d, s.shell, F, 0.98 - 0.25 * (s.up - 0.25));
    put(ADD, q[0], q[1] + age * s.up * 0.6, q[2], 1, .85, .5, (1 - age / s.life) * .95, s.s);""")
rep("up: rr(0.25, 0.7), s: rr(0.04, 0.09)","up: rr(0.25, 0.7), shell: Math.floor(rr(1, 7)), s: rr(0.04, 0.09)")
rep("y = ((i * 0.37 + t * (0.15 + (i % 5) * 0.04)) % 4.2) - 0.2;","y = ((i * 0.37 + t * (0.15 + (i % 5) * 0.04)) % 3.4) - 0.1;")

# --- altyazı: faz bazlı zamanlama, güvenli bölge, kalıcı uyarı
a=s.index("/* ---------- altyazı ---------- */"); b=s.index("/* ---------- ana kare ---------- */")
caption = r"""/* ---------- altyazı ---------- */
/* Zamanlar anlatım dalga formundan (tools/analyze_audio.py, -50 dB) ölçüldü: [başlangıç, bitiş, 'kelimeler'].
   Kelime vurgusu, ifade içinde hece sayısıyla orantılı dağıtılır. */
const SEGS = [
  [[0.0, 1.564, 'Spiritüel anlayışa göre'], [1.649, 3.525, 'her canlının bir aurası vardır.']],
  [[3.904, 4.368, 'Aura,'], [4.427, 5.655, 'bedeni saran manyetik'], [5.739, 6.343, 'bir alandır'], [6.573, 8.099, 've bir zırh gibi seni korur.']],
  [[8.518, 9.122, 'Renkleri,'], [9.192, 11.566, 'taşıdığın enerjiyi ve duyguları yansıtır.']],
  [[11.96, 12.853, 'Bu alan daralıp'], [12.918, 13.791, 'genişleyebilir.']],
  [[14.165, 14.844, 'Genişliğini'], [14.899, 16.774, 'önce içerideki dünyan belirler:']],
  [[17.129, 17.807, 'duyguların,'], [17.972, 18.575, 'anıların,'], [18.69, 20.172, 'düşüncelerin ve dürtülerin.']],
  [[20.526, 22.691, 'Sonra dışarıdan gelen müdahaleler,'], [22.851, 24.936, 'enerjiler ve frekanslar etki eder.']],
  [[25.325, 26.722, 'İnanışa göre nazar,'], [26.891, 27.994, 'negatif enerjiler,']],                       // 25–32 sn bloğu, parça 1
  [[28.208, 32.154, 'varlık etkileri ve hastalıkların enerjisel izleri bu alanda birikir.']],           // parça 2
  [[32.494, 33.546, 'Ama bu tortuları,'], [33.591, 34.135, 'belirli'], [34.17, 35.856, 'spiritüel çalışmalarla temizlemek'], [35.931, 36.52, 'mümkündür.']],
  [[36.849, 38.051, 'Çünkü temiz bir alan,'], [38.201, 39.273, 'güçlü bir zırhtır.']],
].map(ph => {
  const words = [], ts = [];
  for (const [a, b, txt] of ph) {
    const w = txt.split(' '), syl = w.map(x => Math.max(1, (x.match(/[aeıioöuüAEIİOÖUÜ]/g) || []).length)), tot = syl.reduce((x, y) => x + y, 0);
    let acc = 0; w.forEach((x, i) => { words.push(x); ts.push(a + (b - a) * acc / tot); acc += syl[i]; });
  }
  return { a: ph[0][0], b: ph[ph.length - 1][1], words, ts };
});
const capEl = document.getElementById('cap'), capIn = document.getElementById('capin'), discEl = document.getElementById('disc');
if (NOTEXT) document.body.classList.add('notext');
let lastCap = -2;
function setCaption(t) {
  discEl.style.opacity = NOCAP ? 0 : 0.92;                                   // uyarı metni 0. sn'den son kareye kadar
  let idx = -1; for (let i = 0; i < SEGS.length; i++) if (t >= SEGS[i].a - 0.03 && t <= SEGS[i].b + 0.08) idx = i;
  if (idx < 0 || NOCAP) { capEl.style.opacity = 0; lastCap = -1; return; }
  const s = SEGS[idx];
  if (idx !== lastCap) { capIn.innerHTML = s.words.map(w => '<span>' + w + '</span>').join(' '); lastCap = idx; }
  const sp = capIn.children; for (let i = 0; i < sp.length; i++) sp[i].className = (t >= s.ts[i] || (idx === 0 && i === 0)) ? 'on' : '';
  // giriş: sesin başlangıcına hizalı, en çok 0.08 sn; ilk ifade t=0'da tam görünür
  const fin = idx === 0 ? 1 : sstep(s.a - 0.03, s.a + 0.05, t);
  capEl.style.opacity = Math.min(fin, 1 - sstep(s.b, s.b + 0.08, t));
}

"""
s=s[:a]+caption+s[b:]
rep("  fadeEl.style.opacity = sstep(DURATION - 0.6, DURATION - 0.05, t) + (1 - sstep(0, 0.5, t));\n","")
rep("  renderer.render(scene, camera);\n};","  if (BGONLY) scene.children.forEach(c => { if (c !== SH.bgMesh) c.visible = false; });\n  renderer.render(scene, camera);\n};")
rep("SH.bg = m;","SH.bg = m; SH.bgMesh = mesh;")
open(p,'w',encoding='utf-8').write(s)
print('ok')
