(() => {
  'use strict';
  const root = document.documentElement;
  const canvas = document.querySelector('#space-canvas');
  const sections = Array.from(document.querySelectorAll('.scene'));
  const progressLine = document.querySelector('#scroll-line');
  const chapter = document.querySelector('#chapter-current');
  const loader = document.querySelector('#loading');
  const loaderFill = document.querySelector('#loading-fill');
  const menuButton = document.querySelector('#menu-button');
  const mobileNav = document.querySelector('#mobile-nav');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded','false'); }
  });

  const phases = [
    {x:.57, y:.51, r:.44, light:.25, spin:.10},
    {x:.83, y:.50, r:.58, light:1.0, spin:.65},
    {x:.17, y:.48, r:.56, light:-1.15, spin:1.5},
    {x:.80, y:.52, r:.60, light:.30, spin:2.4},
    {x:.50, y:.40, r:.38, light:1.18, spin:3.3},
    {x:.61, y:.49, r:.48, light:-.35, spin:4.2}
  ];
  let state = {...phases[0]};
  let target = {...phases[0]};
  let pointerDrag = {active:false, id:null, prevX:0, prevY:0, moved:false};
  let dragYaw = 0;
  let dragPitch = 0;
  let inertial = 0;
  let scrollT = 0;
  let lastScrollY = -999;
  let firstInteractive = false;
  let paused = document.hidden;
  const lerp = (a,b,t) => a+(b-a)*t;
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const smooth = t => t*t*(3-2*t);

  function updateScroll() {
    const y = window.scrollY;
    const viewport = window.innerHeight;
    const center = y + viewport*.5;
    const centers = sections.map(s => s.offsetTop + s.offsetHeight*.5);
    let i = 0;
    while (i < centers.length-2 && center >= centers[i+1]) i++;
    let t = clamp((center-centers[i]) / Math.max(1, (centers[i+1]||centers[i]) - centers[i]), 0, 1);
    if (i === centers.length-1) t = 0;
    const a = phases[i], b = phases[Math.min(i+1, phases.length-1)];
    const s = smooth(t);
    target = {x:lerp(a.x,b.x,s),y:lerp(a.y,b.y,s),r:lerp(a.r,b.r,s),light:lerp(a.light,b.light,s),spin:lerp(a.spin,b.spin,s)};
    const active = t>.55 ? i+1 : i;
    chapter.textContent = String(Math.min(active+1,5)).padStart(2,'0');
    scrollT = clamp(y/Math.max(1,document.documentElement.scrollHeight-viewport),0,1);
    progressLine.style.transform = 'scaleY('+scrollT+')';
    if (lastScrollY!==y) {
      document.body.dataset.scene = String(active);
      lastScrollY=y;
    }
  }
  addEventListener('scroll', updateScroll, {passive:true});
  addEventListener('resize', updateScroll, {passive:true});
  updateScroll();

  document.addEventListener('pointerdown', e => {
    if (e.button!==0 || e.target.closest('button,a,.mobile-nav')) return;
    pointerDrag = {active:true,id:e.pointerId,prevX:e.clientX,prevY:e.clientY,moved:false};
    inertial = 0;
  }, true);
  document.addEventListener('pointermove', e => {
    if (!pointerDrag.active || pointerDrag.id !== e.pointerId) return;
    const dx=e.clientX-pointerDrag.prevX;
    const dy=e.clientY-pointerDrag.prevY;
    if (Math.abs(dx)+Math.abs(dy) > 2) pointerDrag.moved=true;
    dragYaw += dx*.006;
    inertial = dx*.00065;
    dragPitch = clamp(dragPitch + dy*.003,-.6,.6);
    pointerDrag.prevX=e.clientX;
    pointerDrag.prevY=e.clientY;
  }, {passive:true});
  function endDrag(e){if (pointerDrag.id===e.pointerId) pointerDrag.active=false;}
  document.addEventListener('pointerup',endDrag);
  document.addEventListener('pointercancel',endDrag);
  document.addEventListener('visibilitychange',()=>paused=document.hidden);

  let gl;
  try { gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'high-performance'}); } catch(e) {}
  if (!gl) {root.classList.add('no-webgl');endLoading();return;}
  const vert = `attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
  const frag = `
    precision highp float;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uLight;
    uniform float uTime;
    uniform float uScroll;
    uniform sampler2D uMoon;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
    mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
    void main(){
      vec2 p=gl_FragCoord.xy;
      float m=min(uResolution.x,uResolution.y);
      vec2 uv=(p-uCenter*uResolution)/(uRadius*m);
      float r=length(uv);
      vec2 st=p/uResolution;
      vec3 bg=mix(vec3(.0035,.0042,.009),vec3(.011,.014,.025),smoothstep(.0,.92,1.-length(st-vec2(.5,.5))));
      bg += vec3(.007,.008,.018)*max(.0,1.-length((st-vec2(.55,.46))*vec2(1.0,1.4))*2.);
      vec2 cell=floor(p/4.);
      float star=hash(cell);
      vec2 center=fract(p/4.)-.5;
      float starDisk=1.-smoothstep(.02,.23,length(center));
      float twinkle=.65+.35*sin(uTime*.7+hash(cell+9.)*12.);
      bg+=vec3(.60,.66,.82)*starDisk*step(.997,star)*twinkle;
      float aura=exp(-max(0.,r-1.)*15.)*.030 + exp(-max(0.,r-1.)*3.0)*.012;
      bg+=vec3(.28,.34,.47)*aura;
      if(r<1.){
        vec3 n=vec3(uv.x,uv.y,sqrt(max(0.,1.-dot(uv,uv))));
        vec3 rotated=rotY(uYaw)*rotX(uPitch)*n;
        float lon=atan(rotated.x,rotated.z);
        float lat=asin(clamp(rotated.y,-1.,1.));
        vec2 tc=vec2(fract(.5 + lon/6.2831853), .5 + lat/3.14159265);
        vec3 albedo=texture2D(uMoon,tc).rgb;
        float grey=dot(albedo,vec3(.30,.59,.11));
        grey=mix(.19,.90,grey);
        float micro=noise(tc*vec2(280.,140.))*.028;
        vec3 light=normalize(vec3(sin(uLight)*1.7,.30,cos(uLight)*1.55));
        float diffuse=max(dot(n,light),0.);
        float terminator=smoothstep(.0,.09,diffuse);
        float illumination=mix(.019,.20+pow(diffuse,.58)*.91,terminator);
        float rim=pow(1.-n.z,4.0)*.11;
        vec3 moon=vec3(grey+micro)*vec3(1.00,1.015,1.046)*(illumination+rim);
        moon+=vec3(.016,.019,.026)*pow(max(0.,n.z),2.0);
        float edge=1.-smoothstep(.986,1.,r);
        bg=mix(bg,moon,edge);
      }
      float grain=(hash(p+uTime*.001)-.5)*.014;
      gl_FragColor=vec4(max(bg+grain,vec3(0.)),1.);
    }
  `;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(shader));throw Error('Shader compile error');}return shader;};
  let program;
  try{
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  } catch(e){root.classList.add('no-webgl');console.warn(e);endLoading();return;}
  gl.useProgram(program);
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const uniform={};
  for(const n of ['uResolution','uCenter','uRadius','uYaw','uPitch','uLight','uTime','uScroll','uMoon'])uniform[n]=gl.getUniformLocation(program,n);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([145,147,151,255]));gl.uniform1i(uniform.uMoon,0);

  function proceduralMoon(){
    const c=document.createElement('canvas');c.width=1024;c.height=512;
    const x=c.getContext('2d',{willReadFrequently:true});const im=x.createImageData(c.width,c.height);const d=im.data;
    for(let j=0;j<c.height;j++)for(let i=0;i<c.width;i++){
      const idx=(j*c.width+i)*4;
      const base=141+14*Math.sin(i*.017)*Math.sin(j*.031)+7*Math.sin(i*.11)*Math.sin(j*.097)+6*Math.sin(i*.43+j*.5)+6*(Math.random()-.5);
      d[idx]=d[idx+1]=d[idx+2]=base;d[idx+3]=255;
    }
    x.putImageData(im,0,0);
    let seed=941;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    x.save();
    for(let k=0;k<20;k++){
      const cx=rnd()*1024,cy=rnd()*512,r=(.04+rnd()*.15)*512;
      const gradient=x.createRadialGradient(cx,cy,0,cx,cy,r);
      gradient.addColorStop(0,'rgba(15,15,21,.22)');gradient.addColorStop(.75,'rgba(44,43,49,.12)');gradient.addColorStop(1,'rgba(110,113,121,0)');
      x.fillStyle=gradient;x.beginPath();x.ellipse(cx,cy,r,r*(.36+rnd()*.45),0,0,6.283);x.fill();
    }
    for(let k=0;k<2200;k++){
      const r=.7+Math.pow(rnd(),4)*15,cx=rnd()*1024,cy=rnd()*512;
      x.beginPath();x.arc(cx,cy,r,0,6.283);x.strokeStyle='rgba(228,229,234,'+(.06+rnd()*.22)+')';x.lineWidth=Math.max(.7,r*.16);x.stroke();
      x.beginPath();x.arc(cx+r*.14,cy+r*.19,r*.77,0,6.283);x.strokeStyle='rgba(20,20,22,'+(.08+rnd()*.18)+')';x.lineWidth=Math.max(.6,r*.14);x.stroke();
    }
    x.restore();return c;
  }
  const fallbackTex=proceduralMoon();
  function setTexture(img){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);}
  try{setTexture(fallbackTex);}catch(e){console.warn('texture fallback',e);}
  const photo=new Image();photo.crossOrigin='anonymous';photo.onload=()=>{try{setTexture(photo);}catch(e){console.info('Using procedural moon texture');}};photo.onerror=()=>console.info('Using procedural moon texture');
  photo.src='https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg';

  function resize(){
    const scale=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.floor(innerWidth*scale)),height=Math.max(1,Math.floor(innerHeight*scale));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
  }
  addEventListener('resize',resize,{passive:true});
  resize();
  let last=0;let started=false;
  function frame(ms){
    requestAnimationFrame(frame);
    if(paused)return;
    if(!started){started=true;endLoading();}
    if(ms-last<30 && !reduced.matches)return;
    last=ms;
    if(!pointerDrag.active){dragYaw+=inertial;inertial*=.97;}
    const m=innerWidth<680?{x:.50,y:.57,r:.37}:null;
    const dest={...target};
    if(m){dest.x=lerp(target.x,m.x,.25);dest.r=target.r*.82;dest.y=lerp(target.y,m.y,.23);}
    const amount=reduced.matches?1:.035;
    for(const key of ['x','y','r','light','spin'])state[key]=lerp(state[key],dest[key],amount);
    const now=reduced.matches?0:ms*.001;
    gl.uniform2f(uniform.uResolution,canvas.width,canvas.height);
    gl.uniform2f(uniform.uCenter,state.x,state.y);
    gl.uniform1f(uniform.uRadius,state.r);
    gl.uniform1f(uniform.uYaw,state.spin+dragYaw+(reduced.matches?0:now*.018));
    gl.uniform1f(uniform.uPitch,dragPitch);
    gl.uniform1f(uniform.uLight,state.light);
    gl.uniform1f(uniform.uTime,now);
    gl.uniform1f(uniform.uScroll,scrollT);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    if(reduced.matches){paused=true;}
  }
  requestAnimationFrame(frame);
  reduced.addEventListener('change',()=>{paused=document.hidden;});
  addEventListener('scroll',()=>{if(reduced.matches){paused=false;}},{passive:true});

  function endLoading(){
    if(loaderFill)loaderFill.style.width='100%';
    setTimeout(()=>{if(loader){loader.classList.add('hidden');setTimeout(()=>loader.remove(),1300);}},380);
  }
  setTimeout(endLoading,1700);
})();
