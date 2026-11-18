/* Aura Alanı – 3D CGI reels sahnesi (deterministik: window.frame(t)) */
THREE.ColorManagement.enabled = false;
const W = 1080, H = 1920, FOV = 36;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x04030a, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
const PXS = H / (2 * Math.tan(FOV * Math.PI / 360));
const QS = new URLSearchParams(location.search);
/* güvenli bölge uyumu: tüm sahne tek tip ölçek (S) + NDC kaydırma (ox, oy) ile küçültülür/kaydırılır */
const SC = { S: parseFloat(QS.get('s') || '1'), ox: parseFloat(QS.get('ox') || '0'), oy: parseFloat(QS.get('oy') || '0') };
const NODUST = QS.has('nodust'), NOCAP = QS.has('nocap'), BGONLY = QS.has('bgonly'), NOTEXT = QS.has('notext');
const BASE_P = camera.projectionMatrix.clone();

/* ---------- yardımcılar ---------- */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
function kf(a, t) {
  if (t <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) if (t <= a[i][0]) {
    const [t0, v0] = a[i - 1], [t1, v1] = a[i]; const u = (t - t0) / (t1 - t0);
    return v0 + (v1 - v0) * (u * u * (3 - 2 * u));
  }
  return a[a.length - 1][1];
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261117);
const rr = (a, b) => a + (b - a) * rnd();
function rdir() { const z = rr(-1, 1), a = rr(0, 6.2832), s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }

/* ---------- zaman çizelgesi (ses analizinden) ---------- */
const T = { A: [0.032, 3.525], B: [3.904, 8.099], C: [8.518, 11.566], D: [11.96, 13.791], E: [14.165, 16.774], F: [17.129, 20.172], G: [20.526, 24.936], H: [25.325, 32.154], I: [32.494, 36.52], J: [36.849, 39.273] };
const DURATION = 41.0;                // anlatım 39.39 sn + 1.6 sn bekleme (hold)
const CY = 0.95;                      // aura merkez yüksekliği
const NL = 7;                         // katman sayısı
const CHAKRA = [[1, .16, .22], [1, .5, .1], [1, .83, .15], [.2, .88, .42], [.2, .6, 1], [.34, .27, 1], [.72, .3, 1]];
const CH_Y = [0.24, 0.47, 0.72, 0.95, 1.14, 1.55, 1.82];
const CH_Z = [0.2, 0.25, 0.27, 0.28, 0.2, 0.2, 0.0];

/* alan ölçeği (daralıp-genişleme) */
const F0 = parseFloat(QS.get('f0') || '1.5');   // başlangıç alan ölçeği: ilk 3 sn'de aura kare yüksekliğinin >=%30'u
const FKF = [[0, F0 * 1.07], [3.8, F0 * 1.07], [5.2, F0], [8, F0], [11.9, F0], [12.4, F0 * 0.93], [12.92, 0.55], [13.85, 1.4], [16.75, 1.4], [17.2, 1.32],
[20.5, 1.3], [21.9, 1.2], [22.8, 1.05], [23.5, 0.95], [24.9, 0.85], [26.3, 0.8], [32.1, 0.52], [33.4, 0.55], [35.9, 1.3], [36.9, 1.36], [39.4, 1.4]];
const INNER_T = [17.124, 17.972, 18.69, 19.5];   // duyguların / anıların / düşüncelerin / dürtülerin
const DIRT = [[25.3, 0], [26.4, 0.04], [26.72, 0.3], [27.99, 0.55], [29.12, 0.72], [30.03, 0.9], [31.0, 1.0], [41.5, 1.0]];
const PRESS = [[20.5, 0], [21.9, 0.2], [22.0, 0.5], [22.8, 0.35], [23.5, 0.6], [24.9, 0.75], [25.4, 0.15], [26.2, 0]];
const SHIELD = [[6.2, 0], [7.2, 0.8], [7.6, 1.15], [8.6, 0.6], [20.5, 0.6], [25.3, 0.35], [32.1, 0.22], [33.6, 0.4], [36.9, 0.9], [38.4, 1.25], [39.4, 1.0]];
const CAMD = [[0, 12.6], [3.5, 11.6], [36, 11.6], [39.6, 12.4]];   // güvenli bölge için sabit mesafe (itme yok)
const WAVE_T0 = 33.4, WAVE_DUR = 2.7;
const waveR = t => t < WAVE_T0 ? -1 : 8 * (1 - Math.pow(1 - clamp((t - WAVE_T0) / WAVE_DUR, 0, 1), 2));
const fieldF = t => kf(FKF, t) * (1 + 0.025 * Math.sin(t * 1.7)) + innerPulse(t) - hitPulse(t) * 0.05;
function innerPulse(t) { let s = 0; for (const ts of INNER_T) if (t > ts) s += Math.exp(-(t - ts) * 4.2) * 0.1 * sstep(0, 0.05, t - ts); return s; }

/* ---------- gölgelendirici ortak uniformlar ---------- */
const SH = {
  uT: { value: 0 }, uDirt: { value: 0 }, uWaveR: { value: -1 }, uBoost: { value: 1 },
  uCenterW: { value: new THREE.Vector3(0, CY, 0) }, uPress: { value: 0 }, uPxS: { value: PXS * SC.S },
  uRip: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 1, 0, -10)) },
};
const ASP = parseFloat(QS.get('asp') || '1.2');
const shellRx = i => 0.72 + 0.085 * i, shellRy = i => (0.72 + 0.085 * i) * ASP;

/* ---------- arka plan ---------- */
{
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: SH.uT, uGlow: { value: 0 }, uTint: { value: new THREE.Vector3(.35, .25, .9) } },
    vertexShader: 'varying vec2 vU; void main(){ vU=position.xy*0.5+0.5; gl_Position=vec4(position.xy,0.9999,1.); }',
    fragmentShader: `uniform float uT,uGlow; uniform vec3 uTint; varying vec2 vU;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 c=vU-vec2(.5,.56); c.x*=.56;
        float r=length(c);
        vec3 top=vec3(.045,.03,.12), bot=vec3(.012,.01,.03);
        vec3 col=mix(bot,top,smoothstep(0.,1.,vU.y));
        col+=uTint*exp(-r*r*14.)*(.10+.22*uGlow);
        col*=1.-smoothstep(.3,.62,r)*.55;
        col+=(h(vU*vec2(1080.,1920.)+uT)-.5)*.012;
        gl_FragColor=vec4(col,1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -100; scene.add(mesh);
  SH.bg = m; SH.bgMesh = mesh;
}

/* ---------- zemin ışığı ---------- */
{
  const g = new THREE.CircleGeometry(2.4, 72); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: SH.uT, uCol: { value: new THREE.Vector3(.4, .6, 1) }, uK: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT,uK; uniform vec3 uCol; varying vec3 vP;
      void main(){ float r=length(vP.xz);
        float a=exp(-r*r*.9)*.34+exp(-pow((r-1.15-.08*sin(uT*1.2))/.05,2.))*.42+exp(-pow((r-1.75)/.04,2.))*.2;
        a*=smoothstep(2.35,1.9,r)*uK; gl_FragColor=vec4(uCol,a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m); mesh.position.y = 0.005; mesh.renderOrder = 1; scene.add(mesh); SH.floor = m;
}

/* ---------- insan figürü (meditasyon) ---------- */
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uT: SH.uT, uHeart: { value: 0.3 }, uRim: { value: new THREE.Vector3(.35, .55, 1) }, uHeartCol: { value: new THREE.Vector3(1, .45, .5) }, uDirt: SH.uDirt, uWaveR: SH.uWaveR, uCenterW: SH.uCenterW },
  vertexShader: 'varying vec3 vN,vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform float uT,uHeart,uDirt,uWaveR; uniform vec3 uRim,uHeartCol,uCenterW; varying vec3 vN,vP;
    void main(){
      vec3 N=normalize(vN), V=normalize(cameraPosition-vP);
      float ndv=clamp(dot(N,V),0.,1.);
      float f=pow(1.-ndv,2.2);
      vec3 L=normalize(vec3(-.5,.8,.6)); float lam=max(dot(N,L),0.);
      vec3 L2=normalize(vec3(.7,.3,-.6)); float lam2=max(dot(N,L2),0.);
      vec3 base=vec3(.03,.035,.085)*(.5+lam*2.2)+vec3(.05,.03,.1)*lam2;
      float d=uDirt*smoothstep(uWaveR-.5,uWaveR+.5,length(vP-uCenterW));
      vec3 rim=mix(uRim,vec3(.35,.22,.3),d*.55);
      vec3 col=base+rim*f*1.35+rim*pow(1.-ndv,6.)*1.4;
      float hg=exp(-pow(length(vP-vec3(0.,.95,.2))/.5,2.))*uHeart;
      col+=uHeartCol*hg*.9*(.45+.55*ndv);
      col+=vec3(.15,.12,.3)*exp(-pow((vP.y-1.55)/.5,2.))*.0;
      gl_FragColor=vec4(col,1.);
    }`,
});
const figure = new THREE.Group();
function capsuleBetween(a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A), len = d.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.001), 8, 20), bodyMat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); figure.add(m);
}
function ball(p, r, s) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), bodyMat); m.position.set(...p); if (s) m.scale.set(...s); figure.add(m); }
{
  const prof = [[0.001, 0.2], [0.27, 0.23], [0.31, 0.4], [0.29, 0.65], [0.27, 0.86], [0.33, 1.08], [0.29, 1.2], [0.12, 1.29], [0.001, 1.31]].map(p => new THREE.Vector2(p[0], p[1]));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), bodyMat); torso.scale.z = 0.74; figure.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 24), bodyMat); neck.position.y = 1.36; figure.add(neck);
  ball([0, 1.56, 0.02], 0.185, [0.9, 1.1, 1]);
  for (const s of [-1, 1]) {
    ball([s * 0.31, 1.07, 0], 0.115);
    capsuleBetween([s * 0.33, 1.04, 0], [s * 0.43, 0.62, 0.13], 0.085);
    capsuleBetween([s * 0.43, 0.62, 0.13], [s * 0.4, 0.33, 0.52], 0.075);
    ball([s * 0.4, 0.3, 0.56], 0.07, [1, 0.8, 1.25]);
    capsuleBetween([s * 0.2, 0.2, 0.0], [s * 0.64, 0.16, 0.5], 0.135);
    capsuleBetween([s * 0.64, 0.16, 0.5], [-s * 0.18, 0.13, 0.64], 0.105);
  }
  figure.position.y = 0.0; scene.add(figure);
}

/* ---------- aura katmanları ---------- */
const shells = [];
const sphereG = new THREE.SphereGeometry(1, 72, 56);
const shellVS = `uniform float uT,uPress,uWob,uPh; uniform vec2 uRad; uniform vec3 uCenter; varying vec3 vN,vW;
  void main(){ vec3 p=position;
    float w=uWob*(sin(p.x*3.+uT*1.3+uPh)+sin(p.y*4.-uT*1.7+uPh)+sin(p.z*3.5+uT*1.1))*.333;
    float pr=uPress*.2*(.5+.5*sin(p.y*5.+uT*8.+uPh));
    vec3 q=p*(1.+w-pr); q=vec3(q.x*uRad.x,q.y*uRad.y,q.z*uRad.x)+uCenter;
    vN=normalize(vec3(p.x/uRad.x,p.y/uRad.y,p.z/uRad.x)); vW=q;
    gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }`;
const shellFS = `uniform float uT,uAlpha,uMix,uPh,uDirt,uWaveR,uBoost,uPow; uniform vec3 uColor,uPale,uCenterW; varying vec3 vN,vW;
  void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW);
    float f=1.-abs(dot(N,V)); float rim=pow(f,uPow);
    float sw=.5+.5*sin(vW.y*7.+atan(vW.z,vW.x)*3.+uT*1.4+uPh);
    float a=(rim*1.15+.05+sw*.06*f)*uAlpha*uBoost;
    float dist=length(vW-uCenterW);
    float d=uDirt*smoothstep(uWaveR-.5,uWaveR+.5,dist);
    vec3 col=mix(uPale,uColor,uMix);
    col=mix(col,vec3(.36,.2,.3),d*.65)*(1.-.45*d);
    float front=exp(-pow((dist-uWaveR)/.45,2.))*step(0.,uWaveR);
    col+=vec3(1.,.82,.45)*front*1.2; a+=front*.35*f;
    gl_FragColor=vec4(col,a); }`;
for (let i = 0; i < NL; i++) {
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, SH, {
      uRad: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector3(0, CY, 0) }, uWob: { value: 0.02 }, uPh: { value: i * 1.7 },
      uAlpha: { value: 0 }, uMix: { value: 0 }, uPow: { value: 2.0 + i * 0.12 },
      uColor: { value: new THREE.Vector3(...CHAKRA[i]) }, uPale: { value: new THREE.Vector3(.5, .78, 1.0) },
    }),
    vertexShader: shellVS, fragmentShader: shellFS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(sphereG, mat); mesh.frustumCulled = false; mesh.renderOrder = 10 + i; scene.add(mesh); shells.push(mat);
}
/* kirli (tortu) katmanlar */
const sludge = [];
for (const idx of [2, 5]) {
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, SH, { uRad: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector3(0, CY, 0) }, uWob: { value: 0.03 }, uPh: { value: idx * 2.3 } }),
    vertexShader: shellVS,
    fragmentShader: `uniform float uT,uDirt,uWaveR; uniform vec3 uCenterW; varying vec3 vN,vW;
      void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); float f=1.-abs(dot(N,V));
        float n=sin(vW.x*6.+sin(vW.y*4.+uT*.4))*sin(vW.z*5.+vW.y*3.-uT*.3)*.5+.5;
        float d=uDirt*smoothstep(uWaveR-.5,uWaveR+.5,length(vW-uCenterW));
        float a=d*smoothstep(.28,.72,n)*(.3+.7*f)*.62;
        gl_FragColor=vec4(.11,.035,.14,a); }`,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(sphereG, mat); mesh.frustumCulled = false; mesh.renderOrder = 30; scene.add(mesh); sludge.push({ mat, idx });
}

/* ---------- manyetik alan çizgileri (dipol) ---------- */
let lineMat;
{
  const Ls = [0.55, 0.8, 1.05, 1.3, 1.6], NP = 16, NS = 230, pos = [], att = [];
  Ls.forEach((L, li) => { for (let p = 0; p < NP; p++) for (let s = 0; s < NS; s++) {
    const th = 0.1 + (Math.PI - 0.2) * s / (NS - 1); pos.push(0, 0, 0); att.push(L, p / NP * Math.PI * 2, th, li);
  } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aP', new THREE.BufferAttribute(new Float32Array(att), 4));
  lineMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, SH, { uScale: { value: 1 }, uLine: { value: 0 }, uSpeed: { value: 0.5 }, uMixL: { value: 0 }, uCy: { value: CY }, uLinePx: { value: Math.max(SC.S, 0.75) } }),
    vertexShader: `attribute vec4 aP; uniform float uT,uScale,uLine,uSpeed,uDirt,uMixL,uCy,uPxS,uLinePx; varying float vA; varying vec3 vCol;
      void main(){ float L=aP.x,phi=aP.y,th=aP.z,id=aP.w; float s=sin(th);
        float r=L*s*s*uScale; r*=1.+uDirt*.1*sin(th*9.+uT*2.+phi*3.);
        vec3 q=vec3(r*s*cos(phi),uCy+r*cos(th)*2.2,r*s*sin(phi));
        float ph=fract(th/3.14159*1.2-uT*uSpeed+phi*.16+id*.21);
        float pulse=smoothstep(0.,.14,ph)*(1.-smoothstep(.14,.55,ph));
        vA=uLine*(.12+.88*pulse)*smoothstep(.04,.22,r)*(1.-.55*uDirt);
        vec3 c1=vec3(.45,.8,1.), c2=mix(vec3(.5,.9,1.),vec3(.8,.45,1.),id/4.);
        vCol=mix(c1,c2,uMixL)*(1.-.35*uDirt)+vec3(.15,.1,.0)*pulse;
        vec4 mv=viewMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.7+2.6*pulse)*1.5*uLinePx; }`,
    fragmentShader: `varying float vA; varying vec3 vCol; void main(){ float d=length(gl_PointCoord-.5)*2.; gl_FragColor=vec4(vCol,vA*smoothstep(1.,.15,d)); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(g, lineMat); pts.frustumCulled = false; pts.renderOrder = 8; scene.add(pts);
}

/* ---------- geodezik kalkan (zırh) ---------- */
let shieldMat;
{
  const g0 = new THREE.IcosahedronGeometry(1, 3);
  const n = g0.attributes.position.count, bary = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) bary[i * 3 + (i % 3)] = 1;
  g0.setAttribute('bary', new THREE.BufferAttribute(bary, 3));
  shieldMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, SH, { uRad: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector3(0, CY, 0) }, uShield: { value: 0 }, uGold: { value: 0 } }),
    vertexShader: `attribute vec3 bary; uniform vec2 uRad; uniform vec3 uCenter; varying vec3 vB,vP,vN,vW;
      void main(){ vB=bary; vP=position; vN=normalize(vec3(position.x/uRad.x,position.y/uRad.y,position.z/uRad.x));
        vec3 q=vec3(position.x*uRad.x,position.y*uRad.y,position.z*uRad.x)+uCenter; vW=q; gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }`,
    fragmentShader: `uniform float uT,uShield,uGold,uDirt,uWaveR; uniform vec3 uCenterW; uniform vec4 uRip[6]; varying vec3 vB,vP,vN,vW;
      void main(){ vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
        float e=min(min(vB.x,vB.y),vB.z); float line=1.-smoothstep(0.,.05,e);
        float f=1.-abs(dot(N,V));
        float rip=0.; for(int i=0;i<6;i++){ vec4 r=uRip[i]; float age=uT-r.w; if(r.w>0.&&age>0.){ float ang=acos(clamp(dot(normalize(vP),r.xyz),-1.,1.)); rip+=exp(-pow((ang-age*2.3)/.2,2.))*exp(-age*1.5); } }
        float d=uDirt*smoothstep(uWaveR-.5,uWaveR+.5,length(vW-uCenterW));
        float a=uShield*(line*(.12+.95*pow(f,1.3))+.045*f)+rip*(.10+line*.55);
        vec3 col=mix(vec3(.5,.85,1.),vec3(1.,.86,.5),uGold); col=mix(col,vec3(.42,.26,.34),d*.6);
        col+=vec3(.8,.9,1.)*rip*.25;
        gl_FragColor=vec4(col,a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g0, shieldMat); mesh.frustumCulled = false; mesh.renderOrder = 25; scene.add(mesh);
}

/* ---------- temizlik dalgası ---------- */
let waveMat;
{
  waveMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, SH, { uK: { value: 0 }, uRadius: { value: 1 } }),
    vertexShader: 'uniform float uRadius; varying vec3 vN,vW; void main(){ vec3 q=position*vec3(uRadius,uRadius*1.0,uRadius)+vec3(0.,.95,0.); vW=q; vN=normalize(position); gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }',
    fragmentShader: 'uniform float uK; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=1.-abs(dot(normalize(vN),V)); float a=pow(f,3.6)*1.2*uK; gl_FragColor=vec4(1.,.84,.5,a); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), waveMat); mesh.frustumCulled = false; mesh.renderOrder = 40; scene.add(mesh);
}

/* ---------- frekans halkaları ---------- */
const rings = [];
for (let i = 0; i < 5; i++) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(.55, .8, 1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = Math.PI / 2 + rr(-0.35, 0.35); m.rotation.z = rr(-0.3, 0.3); m.renderOrder = 45; m.visible = false; scene.add(m); rings.push({ m, ph: i / 5, tilt: m.rotation.clone() });
}

/* ---------- parçacık sistemleri ---------- */
const fxVS = `attribute vec4 aCol; attribute float aSize; uniform float uPxS; varying vec4 vC;
  void main(){ vec4 mv=viewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uPxS/(-mv.z); vC=aCol; }`;
function makePoints(n, additive) {
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(n * 3), C = new Float32Array(n * 4), S = new Float32Array(n);
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(C, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(S, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPxS: SH.uPxS }, vertexShader: fxVS,
    fragmentShader: additive
      ? 'varying vec4 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,0.,d); a=a*a*(1.+.6*smoothstep(.35,0.,d)); gl_FragColor=vec4(vC.rgb,vC.a*a); }'
      : 'varying vec4 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.15,d); gl_FragColor=vec4(vC.rgb,vC.a*a); }',
    transparent: true, depthWrite: false, depthTest: !additive ? true : true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  return { pts, P, C, S, n, i: 0, mat };
}
const ADD = makePoints(2000, true); ADD.pts.renderOrder = 50;
const DARK = makePoints(520, false); DARK.pts.renderOrder = 28;
const GLOW = makePoints(16, true); GLOW.pts.renderOrder = 60; GLOW.mat.depthTest = false;
function put(G, x, y, z, r, g, b, a, s) { const i = G.i++; if (i >= G.n) return; G.P[i * 3] = x; G.P[i * 3 + 1] = y; G.P[i * 3 + 2] = z; G.C[i * 4] = r; G.C[i * 4 + 1] = g; G.C[i * 4 + 2] = b; G.C[i * 4 + 3] = a; G.S[i] = s; }
function flush(G) { for (let i = G.i; i < G.n; i++) { G.C[i * 4 + 3] = 0; G.S[i] = 0; } G.pts.geometry.attributes.position.needsUpdate = true; G.pts.geometry.attributes.aCol.needsUpdate = true; G.pts.geometry.attributes.aSize.needsUpdate = true; G.i = 0; }

/* parçacık verileri */
const dust = Array.from({ length: 280 }, () => ({ x: rr(-2.4, 2.4), y: rr(-0.6, 3.0), z: rr(-1.4, 1.4), s: rr(0.02, 0.05), v: rr(0.05, 0.22), ph: rr(0, 6.28), a: rr(0.25, 0.7) }));
const emo = Array.from({ length: 100 }, () => ({ d: rdir(), ph: rnd(), sp: rr(0.9, 1.5), h: rnd(), s: rr(0.05, 0.1) }));
const mem = Array.from({ length: 64 }, () => ({ R: rr(0.6, 1.25), y: rr(0.35, 1.85), a0: rr(0, 6.28), w: rr(0.35, 0.8) * (rnd() < .5 ? -1 : 1), ph: rr(0, 6.28), s: rr(0.07, 0.15), zs: rr(0.8, 1.1) }));
const tho = Array.from({ length: 130 }, () => ({ a0: rr(0, 6.28), w: rr(1.2, 2.6), R: rr(0.22, 0.55), ph: rnd(), per: rr(1.8, 2.8), s: rr(0.035, 0.065) }));
const imp = Array.from({ length: 120 }, () => ({ d: (() => { const a = rr(0, 6.28), e = rr(-0.1, 0.75); return [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]; })(), ph: rnd(), per: rr(0.7, 1.2), sp: rr(1.3, 2.7), s: rr(0.035, 0.07) }));
/* darbeler (dış müdahale / enerji / frekans) */
const hits = [];
[20.95, 21.3, 21.62, 21.95, 22.28, 22.52, 22.72].forEach(t => hits.push({ t, ty: 0, d: (() => { const d = rdir(); return d; })() }));
[22.92, 23.06, 23.2, 23.34, 23.48, 23.6].forEach(t => hits.push({ t, ty: 1, d: rdir() }));
[23.7, 24.05, 24.4, 24.75].forEach(t => hits.push({ t, ty: 2, d: (() => { const d = rdir(); d[1] = Math.abs(d[1]) * 0.5 + 0.55; const l = Math.hypot(...d); return d.map(v => v / l); })() }));
function hitPulse(t) { let s = 0; for (const h of hits) if (t > h.t) s += Math.exp(-(t - h.t) * 6) * (h.ty === 1 ? .6 : 1); return s; }
/* kirler */
const CATS = [{ n: 70, a: 25.95, b: 26.8, c: [.07, .06, .2], r0: 0.7 }, { n: 110, a: 26.9, b: 28.0, c: [.16, .05, .15], r0: 0.85 }, { n: 90, a: 28.2, b: 29.2, c: [.12, .07, .2], r0: 1.0 }, { n: 110, a: 29.2, b: 31.2, c: [.18, .15, .06], r0: 1.1 }];
const dirt = [];
CATS.forEach(cat => { for (let k = 0; k < cat.n; k++) {
  const ts = lerp(cat.a, cat.b, k / cat.n) + rr(-0.05, 0.05), dd = rdir();
  dirt.push({ ts, ta: ts + rr(0.8, 1.2), d: dd, shell: Math.floor(rr(2.6, 7)), s: rr(0.1, 0.24), c: cat.c.map(v => v * rr(0.8, 1.25)), ph: rr(0, 6.28), td: 1e9, wob: rr(0.97, 1.04) });
} });
const sparks = Array.from({ length: 200 }, (_, k) => ({ tk: lerp(WAVE_T0 + 0.05, WAVE_T0 + WAVE_DUR, k / 200) + rr(-0.05, 0.05), d: rdir(), up: rr(0.25, 0.7), shell: Math.floor(rr(1, 7)), s: rr(0.04, 0.09), life: rr(0.9, 1.6) }));
const ellPos = (d, shell, F, k) => [d[0] * shellRx(shell) * F * k, CY + d[1] * shellRy(shell) * F * k, d[2] * shellRx(shell) * F * k];
/* kirlerin temizlenme zamanı (ön hesap) */
dirt.forEach(p => { for (let t = WAVE_T0; t < WAVE_T0 + WAVE_DUR + 0.5; t += 0.02) { const F = fieldF(t), q = ellPos(p.d, p.shell, F, p.wob); if (Math.hypot(q[0], q[1] - CY, q[2]) < waveR(t)) { p.td = t; break; } } });

/* ---------- altyazı ---------- */
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
SEGS[SEGS.length - 1].b = 1e6;                                             // son altyazı bekleme (hold) boyunca kalır
const capEl = document.getElementById('cap'), capIn = document.getElementById('capin'), discEl = document.getElementById('disc');
if (NOTEXT) document.body.classList.add('notext');
let lastCap = -2;
function setCaption(t) {
  discEl.style.opacity = NOCAP ? 0 : 0.92;                                   // uyarı metni 0. sn'den son kareye kadar
  let idx = -1; for (let i = 0; i < SEGS.length; i++) if (t >= SEGS[i].a - 0.08 && t <= SEGS[i].b + 0.08) idx = i;
  if (idx < 0 || NOCAP) { capEl.style.opacity = 0; lastCap = -1; return; }
  const s = SEGS[idx];
  if (idx !== lastCap) { capIn.innerHTML = s.words.map(w => '<span>' + w + '</span>').join(' '); lastCap = idx; }
  const sp = capIn.children; for (let i = 0; i < sp.length; i++) sp[i].className = (t >= s.ts[i] || (idx === 0 && i === 0)) ? 'on' : '';
  // giriş: sesin başlangıcına hizalı, en çok 0.08 sn; ilk ifade t=0'da tam görünür
  const fin = idx === 0 ? 1 : sstep(s.a - 0.07, s.a + 0.01, t);
  capEl.style.opacity = Math.min(fin, 1 - sstep(s.b, s.b + 0.08, t));
}

/* ---------- ana kare ---------- */
const tmpV = new THREE.Vector3();
function drawScene(t) {
  SH.uT.value = t;
  const F = fieldF(t), D = kf(DIRT, t), P = kf(PRESS, t), S = kf(SHIELD, t), wR = waveR(t);
  const cleanK = sstep(WAVE_T0, WAVE_T0 + WAVE_DUR, t);
  SH.uDirt.value = D; SH.uWaveR.value = wR; SH.uPress.value = P * (0.6 + 0.4 * Math.sin(t * 9));
  const gold = sstep(35.0, 37.5, t) * 0.55 + sstep(37.8, 38.7, t) * 0.45;
  const boost = (1 + 0.5 * sstep(36.9, 38.6, t)) * (1 + 0.5 * sstep(WAVE_T0, WAVE_T0 + 1.2, t) * (1 - sstep(35.5, 37, t)));
  SH.uBoost.value = boost;

  /* katmanlar */
  shells.forEach((m, i) => {
    const rev = 0.55 + 0.45 * sstep(0.0, 1.5 + 0.25 * i, t);
    m.uniforms.uAlpha.value = rev * (0.5 + 0.06 * i) * (0.9 + 0.1 * Math.sin(t * 2 + i));
    m.uniforms.uMix.value = sstep(T.C[0] + 0.05 + 0.38 * i, T.C[0] + 0.6 + 0.38 * i, t);
    m.uniforms.uRad.value.set(shellRx(i) * F, shellRy(i) * F);
    m.uniforms.uWob.value = 0.012 + 0.03 * D + 0.01 * P;
  });
  sludge.forEach(s => { s.mat.uniforms.uRad.value.set(shellRx(s.idx) * F * 1.03, shellRy(s.idx) * F * 1.03); });
  /* kalkan */
  shieldMat.uniforms.uRad.value.set(shellRx(NL - 1) * F * 1.04 + 0.04, shellRy(NL - 1) * F * 1.04 + 0.05);
  shieldMat.uniforms.uShield.value = S; shieldMat.uniforms.uGold.value = gold;
  const act = hits.filter(h => t > h.t && t - h.t < 1.5).slice(-6);
  const rip = SH.uRip.value; for (let i = 0; i < 6; i++) { const h = act[i]; if (h) rip[i].set(h.d[0], h.d[1], h.d[2], h.t); else rip[i].set(0, 1, 0, -10); }
  /* manyetik çizgiler */
  const lineAmt = sstep(4.9, 5.9, t) * 0.9 * (1 + 0.5 * sstep(9.1, 10.2, t) - 0.35 * sstep(30, 31, t) * (1 - cleanK)) + 0.0;
  lineMat.uniforms.uLine.value = lineAmt; lineMat.uniforms.uScale.value = F * 1.05;
  lineMat.uniforms.uSpeed.value = 0.35 + 0.35 * sstep(9.1, 10.2, t) + 0.5 * sstep(T.G[0], T.G[0] + 1, t) * (1 - sstep(T.H[0], T.H[0] + 0.5, t));
  lineMat.uniforms.uMixL.value = sstep(T.C[0], T.C[0] + 1.2, t);
  /* zemin / arka plan */
  SH.floor.uniforms.uK.value = sstep(0.3, 1.5, t) * (1 - 0.5 * D * (1 - cleanK)) + 0.3 * cleanK;
  SH.floor.uniforms.uCol.value.set(lerp(.4, 1, gold), lerp(.62, .84, gold), lerp(1, .5, gold));
  SH.bg.uniforms.uGlow.value = 1.6 * (1 - sstep(0, 1.3, t)) + sstep(8.5, 11, t) * .5 + sstep(13, 14, t) * .4 + gold * 1.2 - D * (1 - cleanK) * .5;
  SH.bg.uniforms.uTint.value.set(lerp(.35, 1, gold) - .1 * D, lerp(.25, .75, gold), lerp(.9, .4, gold));
  /* gövde */
  const hb = 0.3 + 0.12 * Math.sin(t * 5.2) + sstep(T.E[0], T.E[1], t) * 0.45 + sstep(32.8, 34, t) * 0.6 * (1 - sstep(36, 37, t)) + gold * 0.4;
  bodyMat.uniforms.uHeart.value = hb;
  bodyMat.uniforms.uRim.value.set(lerp(.35, .95, gold), lerp(.55, .8, gold), lerp(1, .55, gold));
  bodyMat.uniforms.uHeartCol.value.set(1, lerp(.45, .78, gold), lerp(.55, .35, gold));
  /* dalga küresi */
  waveMat.uniforms.uK.value = wR > 0 ? (1 - sstep(WAVE_T0 + 1.9, WAVE_T0 + WAVE_DUR + 0.2, t)) * 1.0 : 0;
  waveMat.uniforms.uRadius.value = clamp(wR, 0.01, 2.15);

  /* frekans halkaları */
  const fa = sstep(23.4, 23.8, t) * (1 - sstep(24.6, 25.1, t));
  rings.forEach((r, i) => {
    const u = ((t - 23.4) * 0.95 + r.ph) % 1, R = lerp(2.3, 0.9, u * u * 0.5 + u * 0.5);
    r.m.visible = fa > 0.01; r.m.scale.set(R * F * 0.9 + 0.3, R * F * 0.9 + 0.3, R * F * 0.9 + 0.3);
    r.m.position.set(0, CY + 0.6 * Math.sin(r.ph * 9 + t) * (1 - u), 0);
    r.m.material.opacity = fa * (1 - u) * sstep(0, 0.12, u) * 0.75;
  });

  /* ---- kamera ---- */
  const d = kf(CAMD, t), az = 0.45 * Math.sin(0.16 * t + 0.4) + 0.12 * Math.sin(0.5 * t), el = 1.55 + 0.45 * Math.sin(0.12 * t) ;
  const shake = hitPulse(t) * 0.022;
  camera.position.set(Math.sin(az) * d + shake * Math.sin(t * 91), el + shake * Math.cos(t * 83), Math.cos(az) * d);
  camera.lookAt(0, 0.62, 0);
  camera.updateMatrixWorld();
  camera.projectionMatrix.copy(BASE_P);
  { const E = camera.projectionMatrix.elements; E[0] *= SC.S; E[5] *= SC.S; E[8] = -SC.ox; E[9] = -SC.oy; }

  /* ---- parçacıklar ---- */
  const dim = 1 - 0.4 * D * (1 - cleanK);
  if (!NODUST) for (const p of dust) {
    const y = ((p.y + 0.6 + t * p.v) % 3.6) - 0.6;
    put(ADD, p.x + Math.sin(t * .3 + p.ph) * .12, y, p.z, .6, .7, 1, p.a * (0.5 + 0.5 * Math.sin(t * 1.3 + p.ph)) * sstep(0, 1.5, t) * dim * (1 + gold), p.s);
  }
  /* kalp-merkezi + çakra noktaları */
  for (let i = 0; i < 7; i++) {
    const lit = 0.25 + 0.75 * sstep(T.C[0] + 0.05 + 0.38 * i, T.C[0] + 0.45 + 0.38 * i, t);
    const pulse = 1 + 0.25 * Math.sin(t * 3 + i) + (i === 3 ? 0.6 * sstep(32.8, 34, t) : 0);
    const c = CHAKRA[i], gg = gold * .4;
    put(GLOW, 0, CH_Y[i], CH_Z[i], c[0] + gg, c[1] + gg * .6, c[2], lit * sstep(2.8, 4.0, t) * 0.9 * (1 - 0.5 * D * (1 - cleanK)), 0.2 * lit * pulse);
  }
  put(GLOW, 0, 0.95, 0.22, 1, .55 + gold * .3, .6 - gold * .2, (0.15 + 0.5 * sstep(T.E[0], T.E[1], t) + 0.4 * gold) * (0.7 + 0.3 * Math.sin(t * 5)), 0.55 + 0.6 * sstep(T.E[0], T.E[1], t));
  /* duygular */
  for (const e of emo) {
    const env = sstep(T.F[0], T.F[0] + 0.3, t) * (1 - 0.7 * sstep(20.6, 22, t)) * (1 - sstep(24.5, 25.3, t) * 0.8) * (1 - D * (1 - cleanK) * .8);
    if (env < 0.01) continue;
    const age = (((t - T.F[0]) * e.sp / 1.7 + e.ph) % 1 + 1) % 1, r = 0.12 + age * 1.15;
    put(ADD, e.d[0] * r, 0.98 + e.d[1] * r * 1.1, 0.1 + e.d[2] * r, 1, lerp(.35, .7, e.h), lerp(.55, .3, e.h), env * Math.pow(1 - age, 1.3) * sstep(0, .08, age) * .95, e.s);
  }
  /* anılar */
  for (const m of mem) {
    const env = sstep(INNER_T[1], INNER_T[1] + 0.3, t) * (1 - 0.65 * sstep(20.6, 22, t)) * (1 - sstep(24.5, 25.3, t) * .8) * (1 - D * (1 - cleanK) * .8);
    if (env < 0.01) continue;
    for (let k = 0; k < 4; k++) {
      const a = m.a0 + (t - INNER_T[1]) * m.w - k * 0.13 * Math.sign(m.w), rad = m.R * (1 + 0.05 * Math.sin(t + m.ph));
      put(ADD, Math.cos(a) * rad * m.zs, m.y + 0.08 * Math.sin(t * 1.3 + m.ph), Math.sin(a) * rad * 0.8, .68, .8, 1, env * (0.55 + 0.45 * Math.sin(t * 2.1 + m.ph)) * (1 - k * 0.24) * .8, m.s * (1 - k * 0.15));
    }
  }
  /* düşünceler */
  for (const th of tho) {
    const env = sstep(INNER_T[2], INNER_T[2] + 0.3, t) * (1 - 0.65 * sstep(20.6, 22, t)) * (1 - sstep(24.5, 25.3, t) * .8) * (1 - D * (1 - cleanK) * .8);
    if (env < 0.01) continue;
    const age = (((t - INNER_T[2]) / th.per + th.ph) % 1 + 1) % 1, a = th.a0 + t * th.w;
    put(ADD, Math.cos(a) * th.R * (0.6 + age * .8), 1.45 + age * 1.5, Math.sin(a) * th.R * (0.6 + age * .8), 1, .9, .55, env * Math.sin(age * 3.14159) * .95, th.s);
  }
  /* dürtüler */
  for (const im of imp) {
    const env = sstep(INNER_T[3], INNER_T[3] + 0.25, t) * (1 - 0.65 * sstep(20.6, 22, t)) * (1 - sstep(24.5, 25.3, t) * .8) * (1 - D * (1 - cleanK) * .8);
    if (env < 0.01) continue;
    const age = (((t - INNER_T[3]) / im.per + im.ph) % 1 + 1) % 1, r = age * im.sp;
    put(ADD, im.d[0] * r, 0.32 + im.d[1] * r - age * age * 0.3, 0.12 + im.d[2] * r, 1, lerp(.3, .7, age), lerp(.1, .15, age), env * (1 - age) * 1.0, im.s * (1.1 - age * .5));
  }
  /* dış darbeler */
  for (const h of hits) {
    const u = (t - (h.t - 0.7)) / 0.7;
    if (u < 0 || t > h.t + 0.5) continue;
    const col = h.ty === 0 ? [1, .22, .28] : h.ty === 1 ? [.6, .95, 1] : [.75, .6, 1];
    const sizeK = h.ty === 1 ? 0.075 : 0.06, Rs = 1.12;
    if (u <= 1) {
      for (let k = 0; k < 6; k++) {
        const uu = clamp(u - k * 0.05, 0, 1), kk = lerp(1.5, Rs, uu * uu * (3 - 2 * uu * 0.4)), q = ellPos(h.d, NL - 1, F, kk);
        put(ADD, q[0], q[1], q[2], col[0], col[1], col[2], (1 - k * 0.15) * sstep(0, .15, u), sizeK * (1 - k * 0.1));
      }
    } else {
      const age = t - h.t, q = ellPos(h.d, NL - 1, F, Rs);
      put(ADD, q[0], q[1], q[2], col[0], col[1], col[2], Math.exp(-age * 7) * 1.2, 0.35 + age * 0.5);
    }
  }
  /* kirler (koyu) + temizlenme kıvılcımları */
  for (const p of dirt) {
    if (t < p.ts) continue;
    const u = clamp((t - p.ts) / (p.ta - p.ts), 0, 1), k = lerp(1.55, p.wob, 1 - Math.pow(1 - u, 2));
    const q = ellPos(p.d, p.shell, F, k);
    const a0 = Math.cos(t * 0.3 + p.ph) * 0.02;
    const gone = t >= p.td ? clamp((t - p.td) / 0.35, 0, 1) : 0;
    if (gone < 1) put(DARK, q[0] + a0, q[1], q[2], p.c[0], p.c[1], p.c[2], 0.82 * sstep(0, .2, u) * (1 - gone), p.s * (1 + 0.1 * Math.sin(t * 2 + p.ph)));
    if (t >= p.td && t - p.td < 1.3) { const ag = t - p.td; put(ADD, q[0], q[1] + ag * 0.5, q[2], 1, .82, .45, Math.exp(-ag * 2.4) * 1.0, 0.07); }
  }
  for (const s of sparks) {
    const age = t - s.tk; if (age < 0 || age > s.life) continue;
    const q = ellPos(s.d, s.shell, F, 0.98 - 0.25 * (s.up - 0.25));
    put(ADD, q[0], q[1] + age * s.up * 0.6, q[2], 1, .85, .5, (1 - age / s.life) * .95, s.s);
  }
  /* son: altın tozlar */
  const motes = sstep(35.5, 37, t);
  if (motes > 0.01) for (let i = 0; i < 60; i++) {
    const a = i * 2.399, r = 0.6 + (i % 7) * 0.22, y = ((i * 0.37 + t * (0.15 + (i % 5) * 0.04)) % 3.4) - 0.1;
    put(ADD, Math.cos(a + t * 0.2) * r, y, Math.sin(a + t * 0.2) * r, 1, .86, .55, motes * 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i)), 0.035);
  }
  flush(ADD); flush(DARK); flush(GLOW);

  /* ---- DOM ---- */
  if (BGONLY) scene.children.forEach(c => { if (c !== SH.bgMesh) c.visible = false; });
  renderer.render(scene, camera);
}
/* kare: sahne + altyazı; son 0.5 sn'de aura, t=0 durumuna crossfade (döngü) */
const snap = document.getElementById('snap'), snapCtx = snap.getContext('2d');
const handleEl = document.getElementById('handle');
const LOOP_FADE = 0.5;
/* aura alt kenarının ekran y'si (kabaca): altyazı scrim'i aura bindiğinde koyulaşır */
function auraBottomPx(t) {
  const F = fieldF(t), px = y => (1 - new THREE.Vector3(0, y, 0).project(camera).y) * H / 2;
  return Math.max(px(CY - (shellRy(NL - 1) * F * 1.04 + 0.05)), px(CY - 1.45 * F * 1.05), px(0));
}
window.frame = function (t) {
  const k = clamp((t - (DURATION - LOOP_FADE)) / (LOOP_FADE - 1 / 30), 0, 1);
  let yb;
  if (k > 0) {
    drawScene(t); yb = auraBottomPx(t); snapCtx.clearRect(0, 0, W, H); snapCtx.drawImage(canvas, 0, 0);
    drawScene(0); snap.style.opacity = 1 - k * k * (3 - 2 * k);
  } else { snap.style.opacity = 0; drawScene(t); yb = auraBottomPx(t); }
  handleEl.style.opacity = NOCAP ? 0 : 0.9;
  setCaption(t);
  const top = capIn.getBoundingClientRect().top;
  capIn.style.setProperty('--sa', (0.58 + 0.28 * sstep(top - 70, top + 20, yb)).toFixed(3));   // aura bindiğinde %86'ya kadar
};
window.ready = true;
