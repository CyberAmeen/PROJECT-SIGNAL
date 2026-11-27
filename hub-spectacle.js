/* PROJECT SIGNAL — HUB "THE SPECTACLE"
   A living deep-space scene for the hub, drawn by one WebGL canvas (one GPU layer):
   hero planet (rotating surface, clouds, terminator, night-side emerald lights, aurora, rings with planet shadow),
   two orbiting moons, a distant gas giant, a drifting nebula band, three parallax star layers with twinkle,
   and ambient events (shooting stars, a comet, aurora pulses, signal pings, ship flybys) every ~20–40s.
   Textures are baked once on the GPU, so each frame is mostly texture lookups.
   Performance: capped pixel ratio, adaptive quality, paused when hidden / off-screen, GPU released when
   Intel or Atlas covers the hub. Falls back to the original CSS scene if WebGL is missing.
   Reduced motion: near-still scene with gentle drift only. Never autoplays sound. */
(() => {
  'use strict';
  const card = document.querySelector('.hero.cosmic-bridge');
  const sceneEl = card && card.querySelector('.bridge-scene');
  if (!card || !sceneEl) return;

  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => RM.matches;
  const qs = new URLSearchParams(location.search);
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };
  const SA = () => window.SignalAudio;
  const hexv = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /* ---------------------------------------------------------------- PALETTES (three concept directions) */
  const PALETTES = {
    // A — Emerald Dawn: jade oceans, champagne continents, green aurora light
    emerald: { bg0: '#03100e', bg1: '#0a2b2c', nA: '#1d9c78', nB: '#2a5f9e', oc: '#0d5a5f', ld: '#b8c98b', hi: '#f2e8c6', cl: '#eafcf5', at: '#5ff3c6', nt: '#4dffb4', rg: '#c2ebd8', sun: '#ffe9bd', gg: '#7fc9a8' },
    // B — Pastel Odyssey: the current Observation Deck look pushed further, with emerald signal lights
    odyssey: { bg0: '#060a1a', bg1: '#1b2453', nA: '#7a5ad6', nB: '#e07aa9', oc: '#35569f', ld: '#e8b8a3', hi: '#fff0da', cl: '#f6f1ff', at: '#a4dcff', nt: '#3dffb2', rg: '#f2dbc4', sun: '#ffd9a8', gg: '#c9a3d9' },
    // C — Abyssal Signal: cobalt night world, magenta nebula, razor cyan rim
    abyssal: { bg0: '#02040c', bg1: '#0b0f2f', nA: '#3b2cb8', nB: '#b2306f', oc: '#101b4c', ld: '#3e5192', hi: '#a1b8ff', cl: '#c8d6ff', at: '#4fc4ff', nt: '#3affa2', rg: '#8fa3d9', sun: '#cad9ff', gg: '#6a7fc4' }
  };
  const PALETTE = PALETTES[qs.get('hubpalette')] || PALETTES.odyssey;

  /* ---------------------------------------------------------------- SHADERS */
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const NOISE = `
    float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
      return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fb(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}`;
  // planet surface, equirectangular: r=elevation g=clouds b=detail a=night lights
  const FS_PLANET = `precision highp float;uniform vec2 R;${NOISE}
    void main(){vec2 uv=gl_FragCoord.xy/R;float lon=uv.x*6.2831853,lat=(uv.y-.5)*3.14159265;
      vec3 p=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));
      float w=fb(p*1.1+4.);float e=fb(p*2.1+w*1.25)*.8+fb(p*7.+w)*.2;e=clamp((e-.30)*1.9,0.,1.);
      vec3 q=p+.35*vec3(fb(p*3.+1.),fb(p*3.+5.),fb(p*3.+9.));float cl=fb(q*vec3(3.,6.5,3.)+11.)*.7+fb(q*11.+3.)*.3;cl=smoothstep(.42,.68,cl);
      float det=n3(p*26.)*.6+n3(p*61.)*.4;
      float land=smoothstep(.55,.58,e);float lights=land*smoothstep(.70,.95,n3(p*58.))*smoothstep(.45,.75,n3(p*9.));
      gl_FragColor=vec4(e,cl,det,lights);}`;
  // nebula field: r=main gas g=secondary gas b=dust lanes a=dense star speckle
  const FS_NEB = `precision highp float;uniform vec2 R;${NOISE}
    void main(){vec2 q=gl_FragCoord.xy/R*4.;
      float w=fb(vec3(q*1.4,4.));float a=fb(vec3(q,1.3)+w*1.3);a=clamp((a-.32)*2.,0.,1.);
      float b=fb(vec3(q*1.7+3.,7.)+w*.7);b=clamp((b-.35)*2.2,0.,1.);
      float c=fb(vec3(q*3.1,9.));float s=pow(n3(vec3(q*55.,2.)),14.)*2.;
      gl_FragColor=vec4(a,b,c,clamp(s,0.,1.));}`;
  const FS_MAIN = `precision highp float;
    uniform vec2 RES;uniform float S,H,T,ROT,ZOOM,WARP,AU,LITE;uniform vec2 PAR,ZC;uniform vec3 PL;uniform vec4 GG,M1,M2,SH,CO,PG,FOC;
    uniform sampler2D TP,TN;
    uniform vec3 Cb0,Cb1,CnA,CnB,Coc,Cld,Chi,Ccl,Cat,Cnt,Crg,Csun,Cgg;
    float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    const vec3 L=vec3(.70,-.52,.49);
    vec3 star(vec2 p,float cell,float seed,float prob,float big){
      vec2 g=p/cell,id=floor(g),f=fract(g);float h=hs(id+seed);if(h>prob)return vec3(0.);
      vec2 sp=vec2(hs(id+seed+1.3),hs(id+seed+7.1))*.8+.1;float d=length((f-sp)*cell);
      float r=hs(id+seed+3.7);float sz=mix(.45,1.25,r*r)*big;float tw=.72+.28*sin(T*(1.+r*3.)+h*60.);
      float b=exp(-d*d/(sz*sz))*tw;if(big>1.5&&r>.93){vec2 o=abs((f-sp)*cell);b+=(exp(-o.x*2.2-o.y*.55)+exp(-o.y*2.2-o.x*.55))*.10*tw*step(max(o.x,o.y),7.);}
      vec3 c=mix(vec3(.72,.82,1.),vec3(1.,.86,.72),hs(id+seed+9.2));return c*b*(.55+r);}
    vec3 stars(vec2 p){return star(p+PAR*2.+vec2(T*.6,0.),9.,1.,.10,1.)*.75+star(p+PAR*5.+vec2(T*.9,0.),17.,7.,.11,1.2)+star(p+PAR*10.+vec2(T*1.3,0.),43.,13.,.09,1.9)*1.2;}
    vec4 sphere(vec2 c,vec2 o,float r){vec2 d=(c-o)/r;float q=dot(d,d);return vec4(d,q,q<1.?sqrt(1.-q):-1.);}
    vec3 moon(vec4 sp,float seed){vec3 n=vec3(sp.xy,sp.w);float dif=dot(n,normalize(L));
      vec3 t=texture2D(TP,vec2(atan(n.x,n.z)*.159+seed,.5+asin(clamp(n.y,-1.,1.))*.318)).rgb;
      vec3 base=mix(vec3(.46,.47,.52),vec3(.86,.84,.8),t.r*.7+t.b*.5);return base*smoothstep(-.15,.45,dif)+Cat*pow(1.-n.z,3.)*.35;}
    void main(){
      vec2 css=vec2(gl_FragCoord.x,RES.y-gl_FragCoord.y)/S;vec2 c=ZC+(css-ZC)/ZOOM;vec2 uh=c/H;
      vec3 col=mix(Cb1,Cb0,clamp(length(uh-vec2(.72,.32))*1.15,0.,1.));
      // nebula band
      vec4 nb=texture2D(TN,uh*.62+vec2(T*.0012,T*.0004)+PAR*.004);
      vec2 bd=normalize(vec2(1.,.42));float band=exp(-pow(dot(uh-vec2(.55,.45),vec2(-bd.y,bd.x))*2.4,2.));
      col+=(CnA*nb.r*.55+CnB*nb.g*.42)*(.28+band*.85)*(1.-nb.b*.55);
      // sun bloom (off-frame light source)
      col+=Csun*.16*exp(-length(uh-vec2(1.15,-.05))*2.2);
      vec3 st=stars(c);
      if(WARP>.01){vec2 dir=c-ZC;for(int k=1;k<6;k++){st=max(st,stars(ZC+dir*(1.-WARP*.05*float(k)))*(1.-float(k)*.12));}}
      col+=st;
      // gas giant
      vec4 g=sphere(c+PAR*3.,GG.xy,GG.z);
      if(g.w>0.){vec3 n=vec3(g.xy,g.w);float lat=asin(clamp(n.y,-1.,1.));
        float lon2=atan(n.x,n.z);float tb=texture2D(TP,vec2(lon2*.08+T*.0011,.5-lat*.06)).g;float bnd=.5+.5*sin(lat*9.+tb*4.);
        vec3 gc=mix(Cgg*.5,mix(Cgg*1.3,vec3(1.,.93,.85),.25),bnd)*(.88+.24*tb);
        col=gc*smoothstep(-.2,.5,dot(n,normalize(L)))+Cat*pow(1.-n.z,3.)*.25;}
      else col+=Cgg*.10*exp(-(sqrt(g.z)-1.)*7.);
      // planet frame
      vec2 pc=c+PAR*14.;vec4 sp=sphere(pc,PL.xy,PL.z);vec2 d=sp.xy;float r2=sp.z;
      vec3 N=normalize(vec3(-.22,.90,.40));
      // ring geometry
      float rz=-(N.x*d.x+N.y*d.y)/N.z;vec3 Q=vec3(d,rz);float rr=length(Q);vec4 ring=vec4(0.);
      if(rr>1.38&&rr<2.15){float bb=clamp(.6+.17*sin(rr*23.7+.4)+.13*sin(rr*61.3+1.3)+.07*sin(rr*157.1),0.,1.);float gap=smoothstep(.012,.04,abs(rr-1.80))*.85+.15;
        float a=(.35+.65*bb)*gap*smoothstep(1.38,1.46,rr)*smoothstep(2.15,1.98,rr)*.85;
        float s=dot(Q,normalize(L));float sh=s<0.?mix(.32,1.,smoothstep(.92,1.04,length(Q-s*normalize(L)))):1.;
        vec3 rc=Crg*(.62+.65*abs(dot(N,normalize(L))))*sh*(.75+.35*bb)+Csun*.10*bb;ring=vec4(rc,a);}
      // moons behind
      vec4 m1=sphere(c+PAR*18.,M1.xy,M1.w),m2=sphere(c+PAR*18.,M2.xy,M2.w);
      if(M1.z<0.&&m1.w>0.)col=moon(m1,.1);if(M2.z<0.&&m2.w>0.)col=moon(m2,.6);
      if(ring.a>0.&&rz<0.&&r2>1.)col=mix(col,ring.rgb,ring.a);
      // planet
      if(sp.w>0.){vec3 n=vec3(d,sp.w);float ct=cos(.32),st2=sin(.32);vec3 m=vec3(ct*n.x-st2*n.y,st2*n.x+ct*n.y,n.z);
        float lon=atan(m.x,m.z),lat=asin(clamp(m.y,-1.,1.));
        vec4 t=texture2D(TP,vec2(lon*.15915+ROT,.5-lat*.31831));float cl=texture2D(TP,vec2(lon*.15915+ROT*1.35+.21,.5-lat*.31831)).g;
        float ocean=1.-smoothstep(.55,.58,t.r);
        vec3 land=mix(mix(Cld*.62,Cld,smoothstep(.58,.68,t.r)),Chi,smoothstep(.72,.9,t.r))*(.78+.4*t.b);vec3 sea=mix(Coc*.42,Coc*1.08,smoothstep(.2,.56,t.r))+t.b*.03;vec3 surf=mix(land,sea,ocean);
        surf=mix(surf,Ccl,cl*.92);
        float dif=dot(n,normalize(L));float lit=smoothstep(-.12,.38,dif);
        vec3 pcol=surf*(.04+lit*1.05);
        pcol+=Csun*exp(-pow(dif*6.5,2.))*.22;
        pcol+=pow(max(dot(reflect(-normalize(L),n),vec3(0,0,1)),0.),28.)*ocean*(1.-cl)*.55*Csun;
        pcol+=Cnt*t.a*(1.-lit)*(1.-cl*.8)*1.5;
        float au=AU*exp(-pow((lat-1.08-.035*sin(lon*5.+T*1.1)-.015*sin(lon*17.-T*2.))*24.,2.))*(.72+.28*sin(lon*9.+T*1.7))*(1.-lit*.8)*smoothstep(.0,.25,n.z);
        pcol+=mix(Cnt,Cat,.3)*au*.9;
        pcol+=Cat*pow(1.-n.z,2.6)*(.25+.95*lit);
        // ring shadow on the planet
        float tt=-dot(n,N)/dot(normalize(L),N);vec3 P=n+tt*normalize(L);float pr=length(P);
        if(tt>0.&&pr>1.38&&pr<2.15)pcol*=1.-.28*smoothstep(1.38,1.5,pr)*smoothstep(2.15,1.98,pr)*smoothstep(.012,.04,abs(pr-1.80));
        col=pcol;}
      else{float rd=sqrt(r2);float side=.35+.65*clamp(dot(normalize(vec3(d,.0)),normalize(L))+.35,0.,1.);
        col+=Cat*(exp(-(rd-1.)*10.)*.55+exp(-(rd-1.)*3.2)*.10)*side;}
      if(ring.a>0.&&rz>0.&&(r2>1.||rz>sp.w))col=mix(col,ring.rgb,ring.a);
      if(M1.z>=0.&&m1.w>0.)col=moon(m1,.1);if(M2.z>=0.&&m2.w>0.)col=moon(m2,.6);
      // shooting star
      if(SH.w>=0.&&SH.w<1.3){vec2 dr=vec2(cos(SH.z),sin(SH.z));vec2 hd=SH.xy+dr*SH.w*620.;vec2 v=c-hd;float along=dot(v,-dr);
        float perp=length(v+dr*along);float tl=160.;float a=step(0.,along)*(1.-clamp(along/tl,0.,1.));
        col+=mix(vec3(1.),Cnt,.25)*exp(-perp*perp/.9)*a*a*sin(3.14159*min(SH.w/1.3,1.))*1.4;}
      // comet
      if(CO.w>=0.&&CO.w<9.){vec2 dr=vec2(cos(CO.z),sin(CO.z));vec2 hd=CO.xy+dr*CO.w*46.;vec2 v=c-hd;float env=sin(3.14159*CO.w/9.);
        vec2 tail=normalize(-normalize(L).xy);float along=dot(v,tail);float perp=length(v-tail*along);
        float w=1.5+max(along,0.)*.09;float ta=step(0.,along)*exp(-along/120.)*exp(-perp*perp/(w*w));
        col+=(mix(Cat,vec3(1.),.4)*ta*.55+vec3(1.)*exp(-dot(v,v)/6.)*.9+Cat*exp(-length(v)/14.)*.25)*env;}
      // signal ping
      if(PG.z>=0.&&PG.z<3.6){float dd=length(c-PG.xy);float fade=1.-PG.z/3.6;float pr2=0.;
        for(int k=0;k<3;k++){float rad=PG.z*70.-float(k)*24.;if(rad>0.)pr2+=exp(-pow((dd-rad)/1.6,2.))*(1.-float(k)*.25);}
        col+=Cnt*(pr2*.75+exp(-dd*dd/9.)*1.5*exp(-PG.z*2.))*fade;}
      // tap focus glow
      if(FOC.w>0.){float dd=length(c-FOC.xy);col+=Cnt*exp(-pow((dd-FOC.z*1.06)/(FOC.z*.06+2.),2.))*FOC.w*.8;}
      // vignette + dither
      vec2 vv=css/RES*S-.5;col*=1.-dot(vv,vv)*.55;
      col+=(hs(gl_FragCoord.xy+fract(T))-.5)/255.;
      gl_FragColor=vec4(col,1.);}`;

  /* ---------------------------------------------------------------- GL SETUP */
  let canvas = null, gl = null, prog = null, U = {}, texP = null, texN = null, buf = null, alive = false, raf = 0;
  let cssW = 0, cssH = 0, S = 1, quality = 1; const fixedQ = qs.get('hubq') === '1';
  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  function bake(fs, w, h, wrapS, wrapT) {
    const p = program(fs), t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.useProgram(p); gl.uniform2f(gl.getUniformLocation(p, 'R'), w, h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteProgram(p); return t;
  }
  function init() {
    if (alive) return true;
    try {
      canvas = document.createElement('canvas'); canvas.className = 'hs-canvas'; canvas.setAttribute('aria-hidden', 'true');
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
      if (!gl) throw new Error('no webgl');
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      texP = bake(FS_PLANET, 1024, 512, gl.REPEAT, gl.CLAMP_TO_EDGE);
      texN = bake(FS_NEB, 512, 512, gl.MIRRORED_REPEAT, gl.MIRRORED_REPEAT);
      prog = program(FS_MAIN); gl.useProgram(prog);
      ['RES', 'S', 'H', 'T', 'ROT', 'ZOOM', 'WARP', 'AU', 'LITE', 'PAR', 'ZC', 'PL', 'GG', 'M1', 'M2', 'SH', 'CO', 'PG', 'FOC', 'TP', 'TN', 'Cb0', 'Cb1', 'CnA', 'CnB', 'Coc', 'Cld', 'Chi', 'Ccl', 'Cat', 'Cnt', 'Crg', 'Csun', 'Cgg'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
      setPalette(PALETTE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texP); gl.uniform1i(U.TP, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texN); gl.uniform1i(U.TN, 1);
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); alive = false; stop(); }, false);
      canvas.addEventListener('webglcontextrestored', () => { dispose(); if (wanted()) start(); }, false);
      sceneEl.prepend(canvas); alive = true; card.classList.add('hs-on'); resize(); return true;
    } catch (err) { console.warn('Hub scene unavailable, using the classic scene:', err && err.message); dispose(); card.classList.remove('hs-on'); return false; }
  }
  function setPalette(p) { if (!gl || !prog) return; gl.useProgram(prog); const map = { Cb0: 'bg0', Cb1: 'bg1', CnA: 'nA', CnB: 'nB', Coc: 'oc', Cld: 'ld', Chi: 'hi', Ccl: 'cl', Cat: 'at', Cnt: 'nt', Crg: 'rg', Csun: 'sun', Cgg: 'gg' }; Object.entries(map).forEach(([u, k]) => gl.uniform3fv(U[u], hexv(p[k]))); card.style.setProperty('--hs-glow', p.nt); card.style.setProperty('--hs-atmo', p.at); }
  function dispose() {
    stop(); alive = false;
    if (gl) { try { [texP, texN].forEach(t => t && gl.deleteTexture(t)); if (buf) gl.deleteBuffer(buf); if (prog) gl.deleteProgram(prog); const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch {} }
    if (canvas) canvas.remove(); canvas = gl = prog = texP = texN = buf = null; U = {};
  }

  /* ---------------------------------------------------------------- LAYOUT */
  let layout = null;
  function resize() {
    const r = card.getBoundingClientRect(); cssW = Math.max(1, Math.round(r.width)); cssH = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    S = Math.min(dpr * quality, Math.sqrt(1.7e6 / (cssW * cssH)));
    if (canvas) { canvas.width = Math.round(cssW * S); canvas.height = Math.round(cssH * S); }
    const phone = cssW < 700;
    const R = phone ? Math.min(cssW * 0.31, cssH * 0.17) : Math.min(cssH * 0.25, cssW * 0.18);
    layout = { phone, R, px: phone ? cssW * 0.58 : cssW * 0.70, py: phone ? cssH * 0.215 : cssH * 0.40,
      gx: phone ? cssW * 0.15 : cssW * 0.47, gy: phone ? cssH * 0.075 : cssH * 0.13, gr: R * (phone ? 0.15 : 0.13) };
  }
  function moons(t) {
    const L = layout, out = [];
    [[2.05, 0.115, 46, 0.4], [2.95, 0.065, 92, 2.6]].forEach(([ro, rad, per, ph]) => {
      const a = t / per * Math.PI * 2 + ph, x = Math.cos(a) * ro, z = Math.sin(a) * ro;
      const y = Math.sin(a) * ro * 0.17 - Math.cos(a) * ro * 0.13;
      out.push({ x: L.px + x * L.R, y: L.py + y * L.R, z, r: L.R * rad * (1 + z * 0.03) });
    });
    return out;
  }

  /* ---------------------------------------------------------------- INPUT: drag + gyro parallax */
  let par = { x: 0, y: 0 }, parT = { x: 0, y: 0 }, tiltOn = false;
  card.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = card.getBoundingClientRect(); parT.x = ((e.clientX - r.left) / r.width - 0.5) * 2; parT.y = ((e.clientY - r.top) / r.height - 0.5) * 2; }, { passive: true });
  card.addEventListener('pointerleave', () => { if (!tiltOn) parT = { x: 0, y: 0 }; });
  let touch0 = null;
  card.addEventListener('touchstart', e => { const t = e.touches[0]; touch0 = { x: t.clientX, y: t.clientY, px: parT.x, py: parT.y }; }, { passive: true });
  card.addEventListener('touchmove', e => { if (!touch0 || tiltOn) return; const t = e.touches[0]; parT.x = Math.max(-1, Math.min(1, touch0.px + (t.clientX - touch0.x) / 140)); parT.y = Math.max(-1, Math.min(1, touch0.py + (t.clientY - touch0.y) / 220)); }, { passive: true });
  card.addEventListener('touchend', () => { touch0 = null; if (!tiltOn) setTimeout(() => { if (!touch0 && !tiltOn) parT = { x: parT.x * 0.4, y: parT.y * 0.4 }; }, 900); }, { passive: true });
  function onOrient(e) { if (e.gamma == null) return; parT.x = Math.max(-1, Math.min(1, e.gamma / 22)); parT.y = Math.max(-1, Math.min(1, ((e.beta || 0) - 50) / 26)); }
  function enableTilt(btn) {
    const go = () => { tiltOn = true; window.addEventListener('deviceorientation', onOrient, { passive: true }); if (btn) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); btn.querySelector('b').textContent = 'TILT ON'; } ss.set('ps-hub-tilt', '1'); };
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') go(); else if (btn) { btn.querySelector('b').textContent = 'TILT OFF'; } }).catch(() => {});
    else if (D) go();
  }
  function disableTilt(btn) { tiltOn = false; window.removeEventListener('deviceorientation', onOrient); parT = { x: 0, y: 0 }; btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); btn.querySelector('b').textContent = 'TILT'; ss.set('ps-hub-tilt', '0'); }
  function setupTiltChip() {
    if (!('DeviceOrientationEvent' in window) || !('ontouchstart' in window) || reduced()) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hs-tilt'; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Tilt your phone to look around the scene'); b.innerHTML = '<i aria-hidden="true">◎</i><b>TILT</b>';
    b.addEventListener('click', e => { e.stopPropagation(); tiltOn ? disableTilt(b) : enableTilt(b); });
    card.appendChild(b);
    if (ss.get('ps-hub-tilt') === '1' && typeof window.DeviceOrientationEvent.requestPermission !== 'function') enableTilt(b);
  }

  /* ---------------------------------------------------------------- SHIP (DOM, above the canvas) */
  const shipSvg = sceneEl.querySelector('.bridge-ship');
  let shipBox = null;
  if (shipSvg) {
    shipBox = document.createElement('div'); shipBox.className = 'hs-ship'; shipSvg.parentNode.insertBefore(shipBox, shipSvg); shipBox.appendChild(shipSvg);
    const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'hs-engines');
    g.innerHTML = '<circle cx="10" cy="55" r="9"/><circle cx="10" cy="55" r="4" class="hs-core"/>'; shipSvg.insertBefore(g, shipSvg.firstChild);
  }
  function flyby() {
    if (!shipBox || !shipBox.animate) return;
    const r = shipBox.getBoundingClientRect(), cr = card.getBoundingClientRect(), dx = cr.right - r.left + 80;
    const streak = document.createElement('i'); streak.className = 'hs-warp'; shipBox.appendChild(streak);
    const a = shipBox.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(-18px,4px) scale(.96)', offset: .18 }, { transform: `translate(${dx}px,-${Math.round(dx * .18)}px) scale(.55)`, offset: .62, opacity: 1 }, { transform: `translate(${dx}px,-${Math.round(dx * .18)}px) scale(.55)`, opacity: 0, offset: .63 }, { transform: 'translate(-60px,30px) scale(.8)', opacity: 0, offset: .7 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 7000, easing: 'cubic-bezier(.45,0,.2,1)' });
    streak.animate([{ opacity: 0 }, { opacity: 0, offset: .3 }, { opacity: 1, offset: .45 }, { opacity: 0, offset: .62 }, { opacity: 0 }], { duration: 7000 });
    a.onfinish = () => streak.remove();
    if (audible()) { const s = SA(); s.noise({ at: 1.6, f: 300, to: 2600, ft: 'bandpass', dur: 1.6, gain: 0.05, a: 0.6, pan: 0.6, rev: 0.4 }); s.tone({ at: 2.9, f: 90, to: 50, dur: 0.9, gain: 0.03, pan: 0.8, rev: 0.4 }); }
  }

  /* ---------------------------------------------------------------- AMBIENT EVENTS (shuffled bag, never the same twice in a row) */
  const ev = { sh: [0, 0, 0, -1], co: [0, 0, 0, -1], pg: [0, 0, -1, 0], au: -99, foc: null };
  let bag = [], lastEv = '', evTimer = 0, clock = 0;
  const audible = () => { const s = SA(); return !!(s && s.live && s.live() && document.body && !document.body.classList.contains('stream-active') && !(document.getElementById('atlas-shell') && !document.getElementById('atlas-shell').hidden)); };
  function nextEvent() {
    if (!bag.length) { bag = ['shoot', 'comet', 'aurora', 'ping', 'shoot', 'flyby', 'ping']; for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    let k = bag.findIndex(x => x !== lastEv); if (k < 0) k = 0; const e = bag.splice(k, 1)[0]; lastEv = e; fire(e);
    scheduleEvent();
  }
  function scheduleEvent(first) { clearTimeout(evTimer); if (reduced()) return; evTimer = setTimeout(() => { if (running) nextEvent(); else scheduleEvent(); }, first ? 6000 + Math.random() * 4000 : 20000 + Math.random() * 20000); }
  function fire(e) {
    const W = cssW, Hh = cssH, s = SA(), loud = audible();
    if (e === 'shoot') { const fromLeft = Math.random() < .5; ev.sh = [fromLeft ? W * (.05 + Math.random() * .3) : W * (.6 + Math.random() * .35), Hh * (.04 + Math.random() * .25), fromLeft ? .35 + Math.random() * .3 : Math.PI - .35 - Math.random() * .3, 0]; if (loud) s.tone({ f: 2400, to: 900, dur: 0.9, gain: 0.012, type: 'sine', a: 0.05, pan: fromLeft ? .4 : -.4, rev: 0.8, dly: 0.3 }); }
    if (e === 'comet') { ev.co = [W * (.02 + Math.random() * .2), Hh * (.12 + Math.random() * .25), .12 + Math.random() * .25, 0]; if (loud) s.noise({ f: 500, to: 1400, ft: 'bandpass', dur: 7, gain: 0.018, a: 3, pan: -.3, rev: 0.9 }); }
    if (e === 'aurora') { ev.au = clock; if (loud) [0, 4, 7, 11].forEach((n, i) => s.tone({ at: i * .35, f: 220 * Math.pow(2, n / 12), dur: 3.5, gain: 0.010, a: 1.2, type: 'triangle', rev: 0.9, dly: 0.4, pan: (i - 1.5) * .3 })); }
    if (e === 'ping') { const ok = layout; let x, y, tries = 0; do { x = W * (.08 + Math.random() * .84); y = Hh * (.05 + Math.random() * (ok.phone ? .33 : .55)); tries++; } while (tries < 8 && Math.hypot(x - ok.px, y - ok.py) < ok.R * 2.4); ev.pg = [x, y, 0, 0]; if (loud) [0, .5, 1].forEach((at, i) => s.bell(1318 * (i === 2 ? 1.5 : 1), { at, gain: 0.014 - i * 0.003, dur: 2, rev: 0.9, pan: (x / W - .5) })); }
    if (e === 'flyby') flyby();
  }

  /* ---------------------------------------------------------------- TAP REWARDS */
  const BODIES = {
    planet: { name: 'ARIADNE-7', kind: 'Terrestrial world', rows: [['ROTATION', '31.4 h'], ['ATMOSPHERE', 'N₂ · O₂ · Ar'], ['NIGHT SIDE', 'Emerald light clusters']] },
    moon1: { name: 'KORE', kind: 'Inner moon', rows: [['ORBIT', '46 s (time-lapse)'], ['SURFACE', 'Basalt plains'], ['ALBEDO', '0.31']] },
    moon2: { name: 'THALIA', kind: 'Outer moon', rows: [['ORBIT', '92 s (time-lapse)'], ['SURFACE', 'Ice and dust'], ['ALBEDO', '0.62']] },
    giant: { name: 'HELIOS MAJOR', kind: 'Distant gas giant', rows: [['DISTANCE', '4.2 AU'], ['BANDS', 'Ammonia storms'], ['MOONS', '61 catalogued']] },
    ship: { name: 'SAGE-07', kind: 'Observation vessel', rows: [['STATUS', 'Holding orbit'], ['ARRAY', 'Deep-space uplink'], ['CREW', 'Commander Sage']] }
  };
  let readout = null, readTimer = 0;
  function showReadout(key, x, y) {
    const b = BODIES[key]; if (!b) return;
    if (!readout) { readout = document.createElement('div'); readout.className = 'hs-readout'; readout.setAttribute('role', 'status'); card.appendChild(readout); }
    readout.innerHTML = `<small>◈ ${b.kind.toUpperCase()}</small><b>${b.name}</b>${b.rows.map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join('')}<em>ARTIST RENDER · FICTIONAL BODY</em>`;
    const w = 210, left = Math.max(10, Math.min(cssW - w - 10, x + 18)), top = Math.max(60, Math.min(cssH - 170, y - 40));
    readout.style.left = left + 'px'; readout.style.top = top + 'px'; readout.classList.remove('show'); void readout.offsetWidth; readout.classList.add('show');
    clearTimeout(readTimer); readTimer = setTimeout(() => readout && readout.classList.remove('show'), 4200);
    if (audible()) { const s = SA(); s.bell(key === 'ship' ? 988 : 1568, { gain: 0.016, dur: 1.4, rev: 0.7 }); s.tone({ f: 3200, dur: 0.03, gain: 0.01, type: 'square', lp: 4000 }); }
  }
  card.addEventListener('click', e => {
    if (!layout || e.target.closest('button,a,input,select,textarea,.bridge-console,.bridge-telemetry,.hs-readout,label')) return;
    const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (shipBox) { const b = shipBox.getBoundingClientRect(); if (e.clientX > b.left - 12 && e.clientX < b.right + 12 && e.clientY > b.top - 12 && e.clientY < b.bottom + 12) { shipBox.classList.remove('hs-ping'); void shipBox.offsetWidth; shipBox.classList.add('hs-ping'); return showReadout('ship', x, y); } }
    const px = parSm(), M = moons(clock);
    const hit = (cx, cy, rad, k) => Math.hypot(x + px[0] * k - cx, y + px[1] * k - cy) < Math.max(rad, 16);
    let key = null, f = null;
    for (const [i, m] of M.entries()) if (m.z >= 0 && hit(m.x, m.y, m.r * 1.6, 18)) { key = i ? 'moon2' : 'moon1'; f = [m.x, m.y, m.r]; }
    if (!key && hit(layout.px, layout.py, layout.R, 14)) { key = 'planet'; f = [layout.px, layout.py, layout.R]; }
    if (!key) for (const [i, m] of M.entries()) if (hit(m.x, m.y, m.r * 1.6, 18)) { key = i ? 'moon2' : 'moon1'; f = [m.x, m.y, m.r]; }
    if (!key && hit(layout.gx, layout.gy, layout.gr * 1.4, 3)) { key = 'giant'; f = [layout.gx, layout.gy, layout.gr]; }
    if (!key) return;
    ev.foc = { key, t0: clock, f }; showReadout(key, x, y);
  });
  const parSm = () => [par.x * 1, par.y * 1];

  /* ---------------------------------------------------------------- OPENING CHOREOGRAPHY (once per session, skippable) */
  let intro = null;
  // byGate: the Power-On Gate is opening its iris and already animates the hub UI in — we add the camera push.
  function startIntro(byGate) {
    if (ss.get('ps-hub-intro') || document.body.classList.contains('stream-active')) { card.classList.add('hs-powered'); return; }
    ss.set('ps-hub-intro', '1');
    if (byGate === true) { if (!reduced()) { intro = { t0: performance.now(), dur: 3400 }; card.addEventListener('pointerdown', () => { if (intro) intro.t0 = performance.now() - intro.dur; }, { once: true }); } card.classList.add('hs-powered'); return; }
    if (reduced()) { card.classList.add('hs-intro', 'hs-intro-calm'); requestAnimationFrame(() => card.classList.add('hs-powered')); setTimeout(() => card.classList.remove('hs-intro', 'hs-intro-calm'), 1600); return; }
    intro = { t0: performance.now(), dur: 3400 };
    card.classList.add('hs-intro');
    const skip = () => { if (!intro) return; intro.t0 = performance.now() - intro.dur; };
    card.addEventListener('pointerdown', skip, { once: true });
    setTimeout(() => card.classList.add('hs-powered'), 1700);
    setTimeout(() => { card.classList.add('hs-powered'); card.classList.remove('hs-intro'); }, 4800);
    if (audible()) { const s = SA(); s.noise({ f: 200, to: 3000, ft: 'bandpass', dur: 2.8, gain: 0.03, a: 1.6, rev: 0.6 }); s.tone({ at: 2.7, f: 110, to: 55, dur: 1.6, gain: 0.05, rev: 0.7 }); s.bell(880, { at: 2.95, gain: 0.02, dur: 2.5, rev: 0.9 }); }
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ---------------------------------------------------------------- RENDER LOOP */
  let running = false, last = 0, frames = [], tierChecked = 0;
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const rm = reduced();
    if (rm && now - last < 66) return; // ~15fps is plenty for a near-still scene
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    clock += dt * (rm ? 0.18 : 1);
    // adaptive quality: watch real frame times for the first seconds of each run
    if (!rm && !fixedQ) { frames.push(dt); if (frames.length > 90) frames.shift(); if (now - tierChecked > 2500 && frames.length >= 60) { tierChecked = now; const avg = frames.reduce((a, b) => a + b, 0) / frames.length; if (avg > 0.024 && quality > 0.6) { quality = quality > 0.8 ? 0.75 : 0.6; resize(); frames = []; card.classList.add('hs-lite'); } } }
    const k = 1 - Math.pow(0.002, dt); par.x += (parT.x - par.x) * k; par.y += (parT.y - par.y) * k;
    let zoom = 1, warp = 0;
    if (intro) { const p = Math.min(1, (now - intro.t0) / intro.dur); zoom = 1 + 0.9 * (1 - ease(p)); warp = Math.max(0, 1 - p * 1.6); if (p >= 1) { intro = null; card.classList.remove('hs-intro'); card.classList.add('hs-powered'); } }
    ['sh', 'co'].forEach(n => { if (ev[n][3] >= 0) ev[n][3] += dt; if (ev[n][3] > 12) ev[n][3] = -1; });
    if (ev.pg[2] >= 0) { ev.pg[2] += dt; if (ev.pg[2] > 4) ev.pg[2] = -1; }
    const L = layout, M = moons(clock), auT = clock - ev.au, au = auT >= 0 && auT < 7 ? Math.sin(Math.PI * auT / 7) : 0;
    const foc = ev.foc && clock - ev.foc.t0 < 2.5 ? ev.foc : null;
    if (foc && foc.key.startsWith('moon')) { const m = M[foc.key === 'moon1' ? 0 : 1]; foc.f = [m.x, m.y, m.r]; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.RES, canvas.width, canvas.height); gl.uniform1f(U.S, S); gl.uniform1f(U.H, cssH); gl.uniform1f(U.T, clock);
    gl.uniform1f(U.ROT, clock * 0.0042); gl.uniform1f(U.ZOOM, zoom); gl.uniform1f(U.WARP, warp); gl.uniform1f(U.AU, au + (rm ? 0 : 0.12));
    gl.uniform2f(U.PAR, par.x * (rm ? 0.3 : 1), par.y * (rm ? 0.3 : 1)); gl.uniform2f(U.ZC, L.px, L.py);
    gl.uniform3f(U.PL, L.px, L.py, L.R); gl.uniform4f(U.GG, L.gx, L.gy, L.gr, 0);
    gl.uniform4f(U.M1, M[0].x, M[0].y, M[0].z, M[0].r); gl.uniform4f(U.M2, M[1].x, M[1].y, M[1].z, M[1].r);
    gl.uniform4fv(U.SH, ev.sh); gl.uniform4fv(U.CO, ev.co); gl.uniform4f(U.PG, ev.pg[0], ev.pg[1], ev.pg[2], 0);
    gl.uniform4f(U.FOC, foc ? foc.f[0] : 0, foc ? foc.f[1] : 0, foc ? foc.f[2] : 0, foc ? Math.sin(Math.PI * Math.min(1, (clock - foc.t0) / 2.5)) : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (shipBox) shipBox.style.translate = `${(-par.x * 22).toFixed(1)}px ${(-par.y * 14).toFixed(1)}px`;
  }
  function start() { if (running) return; if (!alive && !init()) return; running = true; last = 0; frames = []; tierChecked = performance.now(); raf = requestAnimationFrame(frame); scheduleEvent(true); }
  function stop() { running = false; cancelAnimationFrame(raf); clearTimeout(evTimer); }

  /* ---------------------------------------------------------------- VISIBILITY: pause off-screen, release GPU when covered */
  let onScreen = true;
  const covered = () => document.body.classList.contains('stream-active') || !!(document.getElementById('atlas-shell') && !document.getElementById('atlas-shell').hidden) || !!document.querySelector('.ax-boot:not(.ax-leave)');
  const wanted = () => !document.hidden && onScreen && !covered();
  function sync() { if (covered()) { if (alive) dispose(); return; } if (wanted()) start(); else stop(); }
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.02 }).observe(card);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const atlasShell = document.getElementById('atlas-shell'); if (atlasShell) new MutationObserver(sync).observe(atlasShell, { attributes: true, attributeFilter: ['hidden'] });
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (alive) resize(); }, 120); }, { passive: true });
  RM.addEventListener && RM.addEventListener('change', () => { if (alive) { dispose(); sync(); } });

  /* ---------------------------------------------------------------- BOOT */
  card.classList.add('hs-ready');
  if (!init()) return;
  setupTiltChip();
  sync();
  const gate = document.getElementById('power-gate');
  if (gate && document.body.contains(gate) && !gate.classList.contains('pg-opening')) {
    const mo = new MutationObserver(() => { if (gate.classList.contains('pg-opening')) { mo.disconnect(); startIntro(true); } });
    mo.observe(gate, { attributes: true, attributeFilter: ['class'] });
  } else startIntro(false);
  window.HubSpectacle = { fire, setPalette: n => setPalette(PALETTES[n] || PALETTE), palettes: Object.keys(PALETTES), state: () => ({ running, alive, quality, S, intro: !!intro, introFlag: ss.get('ps-hub-intro'), w: canvas && canvas.width, h: canvas && canvas.height }) };
})();
