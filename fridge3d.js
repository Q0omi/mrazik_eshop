/* MRÁZIK interactive product study. Three.js 0.170.0, vendored from the official npm package.
   The presentation supplies exterior/brand cues; internal layout is explicitly illustrative. */
import * as THREE from './assets/vendor/three.module.js';

const section = document.querySelector('[data-fridge-viewer]');
if (section) bootViewer(section);

function bootViewer(section) {
  const wrap = section.querySelector('#m3-canvas-wrap');
  const loading = section.querySelector('#m3-loading');
  const fallback = section.querySelector('#m3-fallback');
  const status = section.querySelector('#m3-status');
  const modelLabel = section.querySelector('#m3-model-label');
  const buttons = [...section.querySelectorAll('[data-viewer-action]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const variants = {
    mini: { name: 'Mrázik Mini', w: 1.48, h: 2.83, d: 1.22, doors: 1, bottom: .25, freezer: false },
    krystal: { name: 'Kryštál 600', w: 2.12, h: 3.78, d: 1.43, doors: 2, bottom: 1.13, freezer: true },
    family: { name: 'Family (Large)', w: 2.56, h: 4.01, d: 1.54, doors: 2, bottom: .24, freezer: false }
  };
  let id = 'krystal', renderer, scene, camera, product, env;
  let visible = false, initialized = false, failed = false, frame = 0, lastTime = 0, activeUntil = 0;
  let doors = [], drawer, lights = [], openTarget = 0, drawerTarget = 0, openValue = 0, drawerValue = 0, insideMode = false;
  let aim = new THREE.Vector3(0,1.9,0), targetAim = aim.clone();
  let orbit = { theta: .32, phi: 1.38, radius: 8.1 }, targetOrbit = { ...orbit };
  let floor, ring, materials, raycaster, pointerDown, dragTravel = 0, pinchDistance = null;
  const pointers = new Map();
  const resources = new Set();
  const track = value => { resources.add(value); return value; };
  const announce = message => { status.textContent = message; };
  const clamp = THREE.MathUtils.clamp;
  const ease = t => t*t*(3-2*t);

  function activeConfig(){return variants[id];}
  function requestRender(duration=800) {
    activeUntil = Math.max(activeUntil, performance.now()+duration);
    if (initialized && visible && !frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function studioEnvironment() {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#a9bcc9');
    const addPanel = (w,h,pos,rotation,intensity) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),side:THREE.DoubleSide}));
      p.position.set(...pos);p.rotation.set(...rotation);studio.add(p);
    };
    addPanel(4,11,[-5,3,3],[0,Math.PI/3,0],4);
    addPanel(2,10,[5,3,1],[0,-Math.PI/3,0],2.7);
    addPanel(9,5,[0,7,0],[Math.PI/2,0,0],3.5);
    addPanel(6,7,[0,3,-6],[0,0,0],.36);
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(studio,.04);
    studio.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});
    generator.dispose();return target;
  }
  function initialize(){
    if(initialized || failed)return;
    try {
      renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.75));
      renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden','true');
      wrap.appendChild(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();unavailable();});
      scene = new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.05,80);
      env=studioEnvironment();scene.environment=env.texture;
      scene.add(new THREE.HemisphereLight('#e1f6ff','#607181',2.5));
      const key=new THREE.DirectionalLight('#ffffff',4.6);key.position.set(-4,7,6);key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-4;key.shadow.normalBias=.03;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
      const fill=new THREE.DirectionalLight('#a5d9ff',2.2);fill.position.set(4,4,-3);scene.add(fill);
      const front=new THREE.DirectionalLight('#fff5e7',1.3);front.position.set(2,1.5,6);scene.add(front);
      floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#304d61',opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
      const disk=new THREE.Mesh(new THREE.CylinderGeometry(2.03,2.03,.025,100),new THREE.MeshStandardMaterial({color:'#e3eff5',roughness:.38,metalness:.07,transparent:true,opacity:.7}));disk.position.y=-.027;disk.receiveShadow=true;scene.add(disk);
      ring = disk;
      raycaster=new THREE.Raycaster();
      initialized=true;buildProduct();resize();loading.hidden=true;
      requestRender(1500);
    } catch(error){console.warn('MRÁZIK 3D unavailable:',error?.message || error);unavailable();}
  }
  function unavailable(){
    failed=true;visible=false;if(frame)cancelAnimationFrame(frame);frame=0;
    loading.hidden=true;fallback.hidden=false;section.classList.add('m3-unavailable');
    renderer?.domElement.remove();buttons.forEach(b=>b.disabled=true);announce('3D zobrazenie v tomto prehliadači nie je dostupné.');
  }
  function material(config){return track(new THREE.MeshStandardMaterial(config));}
  function roundedGeometry(w,h,d,r=.03){
    const radius=Math.min(r,w/3,h/3,d/3), shape=new THREE.Shape();
    const x=-w/2,y=-h/2;
    shape.moveTo(x+radius,y);shape.lineTo(x+w-radius,y);shape.quadraticCurveTo(x+w,y,x+w,y+radius);
    shape.lineTo(x+w,y+h-radius);shape.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
    shape.lineTo(x+radius,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-radius);
    shape.lineTo(x,y+radius);shape.quadraticCurveTo(x,y,x+radius,y);
    const g=new THREE.ExtrudeGeometry(shape,{depth:d-radius*2,bevelEnabled:true,bevelThickness:radius,bevelSize:radius*.45,bevelSegments:2,steps:1,curveSegments:4});
    g.translate(0,0,-d/2+radius);return track(g);
  }
  function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.016){
    const mesh=new THREE.Mesh(r ? roundedGeometry(w,h,d,r) : track(new THREE.BoxGeometry(w,h,d)),mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cyl(parent,rTop,rBottom,height,mat,x,y,z,segments=20){
    const mesh=new THREE.Mesh(track(new THREE.CylinderGeometry(rTop,rBottom,height,segments)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function sphere(parent,r,mat,x,y,z,sx=1,sy=1,sz=1){
    const mesh=new THREE.Mesh(track(new THREE.SphereGeometry(r,16,12)),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function labelTexture(text,sub='',dark=false){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle=dark?'#132632':'#e4edf0';ctx.fillRect(0,0,512,256);
    ctx.textAlign='center';ctx.fillStyle=dark?'#c0eaff':'#244655';ctx.font='600 57px Arial';ctx.fillText(text,256,132);
    if(sub){ctx.font='22px Arial';ctx.fillStyle=dark?'#84a8ba':'#728b97';ctx.fillText(sub,256,182);}
    const texture=track(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  function print(parent,text,sub,w,h,x,y,z,dark=false){
    const mat=track(new THREE.MeshBasicMaterial({map:labelTexture(text,sub,dark)}));
    const mesh=new THREE.Mesh(track(new THREE.PlaneGeometry(w,h)),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function fruit(parent,x,y,z,color,size=.12){
    const mat=material({color,roughness:.42});sphere(parent,size,mat,x,y,z,1,.88,1);
    const stem=cyl(parent,.012,.014,.055,materials.stem,x,y+size*.83,z,8);stem.rotation.z=.18;
    const leaf=sphere(parent,.045,materials.green,x+.025,y+size*.8,z,1.1,.15,.6);leaf.rotation.z=.35;
  }
  function bottle(parent,x,y,z,color='#dfb462',scale=1){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    const drink=material({color,roughness:.25,metalness:.02});cyl(g,.075,.083,.31,drink,0,.155,0);
    cyl(g,.035,.075,.07,drink,0,.345,0);cyl(g,.035,.035,.09,drink,0,.42,0);
    cyl(g,.043,.043,.035,materials.white,0,.472,0);box(g,.164,.11,.025,materials.label,0,.19,.072,.003);return g;
  }
  function carton(parent,x,y,z){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
    box(g,.18,.35,.17,materials.carton,0,.175,0,.012);box(g,.185,.025,.175,materials.white,0,.36,0,.005);
    box(g,.145,.13,.02,materials.label,0,.19,.085,.001);cyl(g,.027,.027,.025,materials.blue,.042,.384,.015,12);return g;
  }
  function foodShelf(parent,y,w,d,index){
    box(parent,w-.21,.027,d-.2,materials.glass,0,y,-.01,.003);
    box(parent,w-.18,.035,.035,materials.chrome,0,y+.005,d/2-.105,.006);
    for(const x of [-w/2+.11,w/2-.11])box(parent,.035,.055,d-.25,materials.white,x,y-.02,-.03,.004);
    if(index===0){
      for(let j=0;j<3;j++)bottle(parent,-w*.26+j*.21,y+.02,-d*.13,['#edb458','#aa6751','#dae8df'][j],.93);
      const bowl=cyl(parent,.22,.145,.12,materials.bowl,w*.22,y+.075,.12);fruit(parent,w*.18,y+.19,.12,'#d96743',.105);fruit(parent,w*.28,y+.18,.16,'#eccb65',.1);
    }else if(index===1){
      box(parent,.48,.075,.35,materials.bowl,-w*.2,y+.055,.05,.025);
      for(let j=0;j<4;j++)fruit(parent,-w*.34+j*.105,y+.14,.05,j%2?'#e99f51':'#a8bf5e',.085);
      for(let j=0;j<2;j++){const jar=cyl(parent,.11,.105,.15,materials.yogurt,w*.23+j*.245,y+.1,.07);cyl(parent,.115,.115,.018,materials.white,jar.position.x,y+.183,.07);}
    }else{
      for(let j=0;j<2;j++)carton(parent,-w*.27+j*.26,y+.02,0);
      box(parent,.36,.13,.25,materials.sand,w*.22,y+.08,.02,.018);
      box(parent,.36,.025,.25,materials.white,w*.22,y+.155,.02,.008);
    }
  }
  function crispDrawer(parent,x,y,w,h,d){
    const g=new THREE.Group();g.position.set(x,y,0);parent.add(g);
    box(g,w,h,.025,materials.crisper,0,h/2,d/2-.09,.006);
    box(g,w,.025,d-.18,materials.crisper,0,.015,0,.003);
    box(g,.025,h,d-.18,materials.crisper,-w/2,h/2,0,.003);box(g,.025,h,d-.18,materials.crisper,w/2,h/2,0,.003);
    box(g,w-.15,.025,.04,materials.white,0,h-.04,d/2-.068,.005);
    for(let j=0;j<4;j++)fruit(g,-w*.32+j*w*.21,.12,.08,j%2?'#a8c173':'#cf774e',.105);
    return g;
  }
  function doorBin(parent,cx,y,w,z){
    box(parent,w,.12,.022,materials.crisper,cx,y,z-.2,.003);
    box(parent,w,.022,.23,materials.white,cx,y-.06,z-.09,.004);
    for(const x of [cx-w/2,cx+w/2])box(parent,.025,.12,.23,materials.white,x,y,z-.09,.004);
    for(let i=0;i<2;i++)bottle(parent,cx-w*.23+i*w*.45,y-.05,z-.075,i?'#e8e9dc':'#c8964e',.65);
  }
  function clearProduct(){
    if(product)scene.remove(product);for(const r of resources)r.dispose?.();resources.clear();doors=[];lights=[];drawer=null;
  }
  function buildProduct(){
    clearProduct();const c=activeConfig(),{w,h,d}=c;const front=d/2;
    product=new THREE.Group();scene.add(product);
    materials={
      steel:material({color:'#8f9ca9',metalness:.84,roughness:.31,envMapIntensity:1.25}),
      steelSide:material({color:'#82909d',metalness:.77,roughness:.37,envMapIntensity:1.15}),
      chrome:material({color:'#b6c4ce',metalness:.95,roughness:.19,envMapIntensity:1.5}),
      dark:material({color:'#263844',metalness:.42,roughness:.42}),
      white:material({color:'#e8f0f2',roughness:.33,metalness:.03}),
      lining:material({color:'#e4eef3',roughness:.48}),
      glass:material({color:'#b9e4f2',transparent:true,opacity:.43,roughness:.17,metalness:.05,depthWrite:false,side:THREE.DoubleSide}),
      crisper:material({color:'#c8e6ef',transparent:true,opacity:.62,roughness:.22,metalness:.03,depthWrite:false,side:THREE.DoubleSide}),
      label:material({color:'#e5e9d1',roughness:.65}),
      bowl:material({color:'#d6e3da',roughness:.38}),
      green:material({color:'#6a9d6f',roughness:.5}),
      stem:material({color:'#78644b',roughness:.8}),
      yogurt:material({color:'#b8d6d8',roughness:.42}),
      carton:material({color:'#becfd5',roughness:.67}),
      sand:material({color:'#ddc9a1',roughness:.7}),
      blue:material({color:'#88b6c9',roughness:.4}),
      led:material({color:'#e9faff',emissive:'#c0edff',emissiveIntensity:2,roughness:.2})
    };
    // Hollow cabinet: separate wall meshes leave a real visible interior volume.
    box(product,w,.12,d,materials.steel,0,h-.06,0,.025);
    box(product,.1,h-.12,d,materials.steelSide,-w/2+.05,h/2,0,.022);box(product,.1,h-.12,d,materials.steelSide,w/2-.05,h/2,0,.022);
    box(product,w-.12,h-.15,.09,materials.steelSide,0,h/2,-d/2+.04,.015);
    box(product,w-.15,.14,d,materials.dark,0,.15,0,.015);
    for(const x of [-w/2+.22,w/2-.22])for(const z of [-d/2+.2,d/2-.2])cyl(product,.075,.085,.12,materials.dark,x,.06,z,16);
    box(product,w-.2,h-.3,.035,materials.lining,0,h/2+.02,-d/2+.12,.012);
    for(const x of [-w/2+.12,w/2-.12])box(product,.04,h-.28,d-.2,materials.lining,x,h/2+.01,0,.01);
    box(product,w-.21,.05,d-.2,materials.white,0,h-.16,0,.008);
    box(product,w-.2,.05,d-.18,materials.white,0,c.bottom+.025,0,.005);
    // Top vent and glowing interior light strip are geometry, not a background image.
    box(product,w*.58,.1,.035,materials.white,0,h-.33,-d/2+.15,.01);
    for(let i=0;i<12;i++)box(product,.025,.047,.009,materials.dark,-w*.24+i*w*.044,h-.33,-d/2+.172,.002);
    box(product,w*.65,.025,.08,materials.led,0,h-.18,-.18,.005);
    const interiorLight=new THREE.PointLight('#caebff',0,5,1.7);interiorLight.position.set(0,h-.3,.15);product.add(interiorLight);lights.push(interiorLight);
    const usableHeight=h-c.bottom-.27;
    if(id==='family'){
      box(product,.06,usableHeight,d-.17,materials.white,0,c.bottom+usableHeight/2,0,.008);
      for(const side of [-1,1]){
        const g=new THREE.Group();g.position.x=side*w*.235;product.add(g);
        for(let n=0;n<3;n++)foodShelf(g,c.bottom+usableHeight*(.3+n*.24),w*.46,d-.08,n);
        crispDrawer(g,0,c.bottom+.05,w*.4,.37,d-.05);
      }
    }else{
      const count=id==='mini'?2:3;
      for(let n=0;n<count;n++)foodShelf(product,c.bottom+usableHeight*(.32+n*(id==='mini'?.29:.23)),w-.12,d-.08,n);
      if(id==='mini')crispDrawer(product,0,c.bottom+.04,w-.34,.37,d-.04);
      else for(const side of [-1,1])crispDrawer(product,side*w*.222,c.bottom+.05,w*.41,.34,d-.05);
    }
    const doorY=(h+c.bottom)/2-.025, doorH=h-c.bottom-.09, thick=.13;
    for(let n=0;n<c.doors;n++){
      const left=n===0,side=left?-1:1,dw=c.doors===1?w-.045:w/2-.025;
      const hinge=new THREE.Group();hinge.position.set(left?-w/2+.02:w/2-.02,doorY,front+.03);product.add(hinge);
      const cx=left?dw/2:-dw/2;
      const panel=box(hinge,dw,doorH,thick,materials.steel,cx,0,0,.028);panel.userData.door=true;
      box(hinge,dw-.09,doorH-.1,.045,materials.dark,cx,0,-thick/2-.02,.012);
      box(hinge,dw-.14,doorH-.17,.06,materials.white,cx,0,-thick/2-.055,.015);
      const hx=left?dw-.13:-dw+.13;
      box(hinge,.07,Math.min(doorH*.52,1.18),.095,materials.chrome,hx,.02,thick/2+.07,.022);
      for(const y of [-.4,.4])box(hinge,.055,.06,.12,materials.chrome,hx,y,thick/2+.022,.01);
      for(let k=0;k<3;k++)doorBin(hinge,cx,-doorH*.35+k*doorH*.32,dw-.23,-thick/2-.06);
      if((n===1 || c.doors===1)){
        print(hinge,'MRÁZIK','KRYŠTÁL',Math.min(.54,dw*.52),.23,cx,doorH*.22,thick/2+.005);
        print(hinge,'4°C','Wi-Fi  ·  SMART',.31,.18,cx,doorH*.37,thick/2+.007,true);
      }
      doors.push({object:hinge,sign:left?-1:1});
      // Thin hinge caps and gaskets make the opening mechanism visible.
      for(const y of [doorY-doorH/2+.08,doorY+doorH/2-.08])box(product,.075,.055,.16,materials.dark,left?-w/2+.055:w/2-.055,y,front-.025,.01);
    }
    if(c.freezer){
      // The freezer tray really slides out, carrying its bins and contents.
      box(product,w-.22,c.bottom-.27,.04,materials.lining,0,c.bottom/2+.11,-d/2+.15,.008);
      drawer=new THREE.Group();product.add(drawer);
      box(drawer,w-.045,c.bottom-.19,.15,materials.steel,0,c.bottom/2+.035,front+.035,.028);
      box(drawer,w-.21,.05,d-.22,materials.white,0,.27,-.015,.006);
      box(drawer,.04,.47,d-.22,materials.white,-w/2+.16,.49,-.015,.005);box(drawer,.04,.47,d-.22,materials.white,w/2-.16,.49,-.015,.005);
      box(drawer,w-.3,.4,.035,materials.crisper,0,.47,-d/2+.17,.004);
      box(drawer,.025,.3,d-.24,materials.white,0,.44,0,.005);
      box(drawer,w*.62,.075,.1,materials.chrome,0,c.bottom-.32,front+.17,.025);
      for(const x of [-w*.2,w*.2])box(drawer,.055,.06,.13,materials.chrome,x,c.bottom-.32,front+.1,.01);
      for(let j=0;j<4;j++)box(drawer,.33,.16,.38,j%2?materials.blue:materials.carton,-w*.3+j*w*.2,.39,-.03+j%2*.15,.025);
      for(const x of [-w/2+.2,w/2-.2])box(product,.035,.035,d-.22,materials.chrome,x,.3,-.02,.006);
    }
    // Lower kick plate and real vent slots anchor the model to the studio floor.
    box(product,w-.08,.13,.08,materials.dark,0,.2,front+.015,.008);
    for(let j=0;j<Math.round(w*15);j++)box(product,.015,.056,.012,materials.steelSide,-w/2+.09+j*.063,.2,front+.06,.002);
    ring.scale.setScalar(id==='family'?1.14:id==='mini'?.8:1);
    applyMechanics();updateControls();
  }
  function applyMechanics(){
    const angle=ease(openValue)*1.76;for(const door of doors)door.object.rotation.y=door.sign*angle;
    if(drawer)drawer.position.z=ease(drawerValue)*.88;
    lights.forEach(l=>l.intensity=.25+openValue*2.8);
  }
  function defaultView(){
    const c=activeConfig(),mobile=wrap.clientWidth<600;
    return {theta:.32,phi:1.4,radius:(id==='mini'?6.7:id==='family'?8.8:8.2)*(mobile?1.16:1),aim:new THREE.Vector3(0,c.h*.49,0)};
  }
  function setView(view){targetOrbit={theta:view.theta,phi:view.phi,radius:view.radius};targetAim.copy(view.aim);if(reduced.matches){orbit={...targetOrbit};aim.copy(targetAim);}requestRender(1400);}
  function updateControls(){
    const doorButton=buttons.find(b=>b.dataset.viewerAction==='doors');
    doorButton.setAttribute('aria-pressed',String(!!openTarget));doorButton.querySelector('span').textContent=openTarget?'Zavrieť dvere':'Otvoriť dvere';
    const drawerButton=buttons.find(b=>b.dataset.viewerAction==='drawer');drawerButton.hidden=!activeConfig().freezer;drawerButton.setAttribute('aria-pressed',String(!!drawerTarget));drawerButton.querySelector('span').textContent=drawerTarget?'Zasunúť mrazničku':'Vysunúť mrazničku';
    buttons.find(b=>b.dataset.viewerAction==='inside').setAttribute('aria-pressed',String(insideMode));
    modelLabel.textContent=activeConfig().name;
  }
  function setVariant(value){
    const next=typeof value==='string'?value:value?.id;if(!variants[next]||(initialized&&next===id))return;
    id=next;openTarget=drawerTarget=openValue=drawerValue=0;insideMode=false;
    if(initialized&&!failed)buildProduct();setView(defaultView());updateControls();announce(`3D model: ${activeConfig().name}.`);
  }
  function open(){openTarget=1;insideMode=false;updateControls();requestRender(1400);announce('Dvere sú otvorené. Môžete si prezrieť police a priehradky.');}
  function close(){openTarget=0;drawerTarget=0;insideMode=false;setView(defaultView());updateControls();requestRender(1400);announce('Dvere a mraznička sa zatvárajú.');}
  function inside(){
    const c=activeConfig();openTarget=1;insideMode=true;
    setView({theta:0,phi:1.5,radius:id==='mini'?3.65:id==='family'?5.05:4.6,aim:new THREE.Vector3(0,c.bottom+(c.h-c.bottom)*.52,.12)});
    updateControls();announce('Detailný pohľad dovnútra. Interiér je ilustračný.');
  }
  function reset(){openTarget=drawerTarget=0;insideMode=false;setView(defaultView());updateControls();requestRender(1400);announce('Pôvodný pohľad bol obnovený.');}
  function zoom(direction){targetOrbit.radius=clamp(targetOrbit.radius*(direction>0?.86:1.16),3,13);insideMode=false;updateControls();requestRender(700);}
  function resize(){if(!renderer)return;const width=wrap.clientWidth,height=wrap.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender(500);}
  function tick(now){
    frame=0;if(!visible||document.hidden||failed)return;
    const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;
    const blend=reduced.matches?1:1-Math.exp(-dt*9);
    const mechanical=reduced.matches?1:1-Math.exp(-dt*5.8);
    openValue=THREE.MathUtils.lerp(openValue,openTarget,mechanical);drawerValue=THREE.MathUtils.lerp(drawerValue,drawerTarget,mechanical);
    for(const key of ['theta','phi','radius'])orbit[key]=THREE.MathUtils.lerp(orbit[key],targetOrbit[key],blend);
    aim.lerp(targetAim,blend);applyMechanics();
    camera.position.set(aim.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),aim.y+orbit.radius*Math.cos(orbit.phi),aim.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta));camera.lookAt(aim);
    renderer.render(scene,camera);
    const moving=Math.abs(openValue-openTarget)+Math.abs(drawerValue-drawerTarget)+Math.abs(orbit.radius-targetOrbit.radius)+Math.abs(orbit.theta-targetOrbit.theta)+Math.abs(orbit.phi-targetOrbit.phi)+aim.distanceTo(targetAim)>.001;
    if(now<activeUntil||moving)frame=requestAnimationFrame(tick);
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
    if(failed)return;initialize();
    switch(button.dataset.viewerAction){
      case'doors':openTarget?close():open();break;
      case'drawer':drawerTarget=drawerTarget?0:1;updateControls();requestRender(1400);announce(drawerTarget?'Mraziaca zásuvka je vysunutá.':'Mraziaca zásuvka sa zasúva.');break;
      case'inside':insideMode?reset():inside();break;
      case'reset':reset();break;
      case'zoom-in':zoom(1);break;case'zoom-out':zoom(-1);break;
    }
    if(['doors','drawer','inside','reset'].includes(button.dataset.viewerAction)){
      const rect=section.getBoundingClientRect();
      const header=document.querySelector('.header')?.getBoundingClientRect().height || 0;
      const bottom=innerHeight-(matchMedia('(max-width:700px)').matches?84:0);
      if(rect.top<header+8 || rect.bottom>bottom) section.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    }
  }));
  wrap.addEventListener('pointerdown',event=>{
    if(failed)return;initialize();wrap.focus({preventScroll:true});wrap.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});pointerDown={x:event.clientX,y:event.clientY};dragTravel=0;
    if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}requestRender();
  });
  wrap.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    const previous=pointers.get(event.pointerId);const dx=event.clientX-previous.x,dy=event.clientY-previous.y;dragTravel+=Math.abs(dx)+Math.abs(dy);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance)targetOrbit.radius=clamp(targetOrbit.radius*pinchDistance/distance,3,13);pinchDistance=distance;}
    else{targetOrbit.theta=clamp(targetOrbit.theta-dx*.008,-Math.PI,Math.PI);targetOrbit.phi=clamp(targetOrbit.phi-dy*.006,.5,1.8);}
    insideMode=false;updateControls();requestRender(500);
  });
  function pointerEnd(event){
    const wasSingle=pointers.size===1;pointers.delete(event.pointerId);pinchDistance=null;
    if(event.type==='pointerup'&&wasSingle&&dragTravel<6&&pointerDown&&initialized){
      const rect=wrap.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
      const hit=raycaster.intersectObject(product,true)[0];if(hit?.object.userData.door)openTarget?close():open();
    }
    pointerDown=null;
  }
  wrap.addEventListener('pointerup',pointerEnd);wrap.addEventListener('pointercancel',pointerEnd);
  // Let the page scroll normally until the visitor deliberately focuses the viewer.
  wrap.addEventListener('wheel',event=>{if(!initialized||failed||document.activeElement!==wrap)return;event.preventDefault();targetOrbit.radius=clamp(targetOrbit.radius*Math.exp(event.deltaY*.001),3,13);requestRender(600);},{passive:false});
  wrap.addEventListener('keydown',event=>{
    if(failed)return;let handled=true;
    switch(event.key){case'ArrowLeft':targetOrbit.theta-=.14;break;case'ArrowRight':targetOrbit.theta+=.14;break;case'ArrowUp':targetOrbit.phi=clamp(targetOrbit.phi-.12,.5,1.8);break;case'ArrowDown':targetOrbit.phi=clamp(targetOrbit.phi+.12,.5,1.8);break;case'+':case'=':zoom(1);break;case'-':zoom(-1);break;case'Enter':case' ':openTarget?close():open();break;case'Escape':case'Home':reset();break;default:handled=false;}
    if(handled){event.preventDefault();initialize();requestRender(700);}
  });
  document.addEventListener('mrazik:variant',event=>setVariant(event.detail?.id));
  window.addEventListener('mrazik:variant',event=>{if(event.target===window)setVariant(event.detail?.id);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}else requestRender(400);});
  new ResizeObserver(resize).observe(wrap);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){initialize();lastTime=0;requestRender(1000);}else{if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}},{rootMargin:'150px'});observer.observe(section);
  window.Mrazik3D={setVariant,open,close,inside,reset,getState:()=>({variant:id,ready:initialized,failed,doorsOpen:!!openTarget,drawerOpen:!!drawerTarget,inside:insideMode})};
  // Match an existing product selector without requiring changes in the shop code.
  const shopVariant=window.MrazikShop?.getVariant?.();
  const selected=document.querySelector('[data-select-variant][aria-pressed="true"], [data-variant][aria-pressed="true"], [data-model][aria-selected="true"]');
  const initial=(typeof shopVariant==='string'?shopVariant:shopVariant?.id)||selected?.dataset.selectVariant||selected?.dataset.variant||selected?.dataset.model;
  if(variants[initial])id=initial;
  updateControls();setView(defaultView());
}
