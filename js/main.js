/* ===========================================================
   線構 LINEFORM — interactions + Three.js immersive scene
   =========================================================== */
(function(){
  'use strict';

  /* ---------- intro overlay ---------- */
  window.addEventListener('load', function(){
    setTimeout(function(){ var i=document.getElementById('intro'); if(i) i.classList.add('gone'); }, 1100);
  });

  /* ---------- custom cursor ---------- */
  var dot=document.querySelector('.cursor-dot'), ring=document.querySelector('.cursor-ring');
  var rx=0, ry=0, dx=0, dy=0;
  if(window.matchMedia('(hover:hover)').matches && dot){
    window.addEventListener('mousemove', function(e){
      dx=e.clientX; dy=e.clientY;
      dot.style.left=dx+'px'; dot.style.top=dy+'px';
    });
    (function trail(){ rx+=(dx-rx)*0.18; ry+=(dy-ry)*0.18; if(ring){ring.style.left=rx+'px';ring.style.top=ry+'px';} requestAnimationFrame(trail); })();
    document.querySelectorAll('[data-hov], a, button').forEach(function(el){
      el.addEventListener('mouseenter', function(){ ring&&ring.classList.add('hov'); });
      el.addEventListener('mouseleave', function(){ ring&&ring.classList.remove('hov'); });
    });
  }

  /* ---------- nav ---------- */
  var nav=document.getElementById('nav');
  window.addEventListener('scroll', function(){ if(nav) nav.classList.toggle('scrolled', scrollY>40); }, {passive:true});
  var burger=document.getElementById('burger');
  if(burger) burger.addEventListener('click', function(){ nav.classList.toggle('mopen'); });
  document.querySelectorAll('.nav-links a').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('mopen'); }); });

  /* ---------- reveal ---------- */
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, {threshold:0.12, rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('.reveal').forEach(function(e){ io.observe(e); });

  /* ---------- mock form ---------- */
  document.querySelectorAll('form[data-mock]').forEach(function(f){
    f.addEventListener('submit', function(e){ e.preventDefault();
      var b=f.querySelector('[type=submit]'); if(b){ b.textContent='線條已送達'; b.style.opacity='.6'; b.disabled=true; }
      if(!f.querySelector('.form-ok')){ var d=document.createElement('div'); d.className='form-ok'; d.textContent='收到了！我們會在一個工作天內回覆你。'; f.appendChild(d); }
    });
  });

  /* ---------- THREE.JS immersive scene ---------- */
  var canvas=document.getElementById('scene');
  if(!canvas || typeof THREE==='undefined') return;
  var renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true, preserveDrawingBuffer:true}); }
  catch(err){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 100);
  camera.position.z=8;

  var INK=0x1a1a18, RED=0xd6442e;
  var group=new THREE.Group(); scene.add(group);

  var geoms=[
    new THREE.IcosahedronGeometry(2.5,1),
    new THREE.TorusKnotGeometry(1.7,0.5,140,18),
    new THREE.OctahedronGeometry(2.7,0),
    new THREE.DodecahedronGeometry(2.5,0)
  ];
  var shapes=geoms.map(function(g,i){
    var wire=new THREE.WireframeGeometry(g);
    var mat=new THREE.LineBasicMaterial({color:INK, transparent:true, opacity:i===0?0.92:0});
    var ls=new THREE.LineSegments(wire, mat); ls._target=(i===0?0.92:0); group.add(ls); return ls;
  });

  // particle field
  var N=540, pos=new Float32Array(N*3);
  for(var i=0;i<N;i++){ var r=5+Math.random()*8, th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th); pos[i*3+2]=r*Math.cos(ph); }
  var pgeo=new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var pmat=new THREE.PointsMaterial({color:INK, size:0.05, transparent:true, opacity:0.45});
  var points=new THREE.Points(pgeo, pmat); scene.add(points);

  var tmx=0, tmy=0, mx=0, my=0, redMix=0, tRed=0;
  window.addEventListener('mousemove', function(e){ tmx=e.clientX/innerWidth-0.5; tmy=e.clientY/innerHeight-0.5; });
  window.addEventListener('deviceorientation', function(e){ if(e.gamma!=null){ tmx=Math.max(-0.5,Math.min(0.5,e.gamma/45)); tmy=Math.max(-0.5,Math.min(0.5,(e.beta-45)/45)); } });

  function onScroll(){
    var max=Math.max(1, document.body.scrollHeight-innerHeight);
    var p=Math.min(Math.max(window.scrollY/max,0),1);
    var idx=Math.min(shapes.length-1, Math.floor(p*shapes.length*0.999));
    shapes.forEach(function(s,i){ s._target=(i===idx?0.92:0.0); });
    camera.position.z=8+p*3.2;
    tRed = p>0.78 ? 1 : 0;
  }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  var tmpA=new THREE.Color(), tmpB=new THREE.Color();
  function lerpColor(mix){ tmpA.setHex(INK); tmpB.setHex(RED); var c=tmpA.clone().lerp(tmpB,mix); return c; }

  function tick(){
    requestAnimationFrame(tick);
    var t=performance.now()*0.001;
    mx+=(tmx-mx)*0.05; my+=(tmy-my)*0.05;
    redMix+=(tRed-redMix)*0.04;
    group.rotation.y += 0.0017;
    group.rotation.x = my*0.6 + Math.sin(t*0.3)*0.12;
    group.rotation.z = mx*0.35;
    group.position.x = mx*1.3;
    group.position.y = -my*0.9;
    var sc=1+Math.sin(t*0.8)*0.05; group.scale.setScalar(sc);
    points.rotation.y -= 0.0006; points.rotation.x += 0.0003;
    var col=lerpColor(redMix);
    shapes.forEach(function(s){ s.material.opacity += (s._target - s.material.opacity)*0.06; s.material.color.copy(col); });
    pmat.color.copy(col);
    renderer.render(scene, camera);
  }
  tick();

  window.addEventListener('resize', function(){
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); onScroll();
  });
})();
