import * as THREE from './Three JS/build/three.module.js'
import { OrbitControls } from './Three JS/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from './Three JS/examples/jsm/loaders/GLTFLoader.js'
import { FontLoader } from './Three JS/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from './Three JS/examples/jsm/geometries/TextGeometry.js'

let camera, camera2, scene, renderer, controls;
let hamster, hamsterBody;
let darkWarrior;
let gltfLoader = new GLTFLoader();

const moveSpeed = 0.1;
const rotSpeed  = 0.05;
const keys = { w:false, a:false, s:false, d:false, q:false, e:false };

const init = () => {
    scene = new THREE.Scene();

    let fov = 75;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let aspect = w / h;
    let near = 0.1;
    let far = 1000;

    // Camera for 3rd point of view
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(6, 3, 5);
    camera.lookAt(0, 0, 0);
    
    // Camera for 1st point of view 
    camera2 = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera2.position.set(0, 1.8, 0)
    
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);

    createObjects();
    createLight(scene);    
    eventHandler();

    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    window.addEventListener('click', (e) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        mouse.x = (e.clientX / w) * 2 - 1;
        mouse.y = -(e.clientY / h) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (hamsterBody) {
          const intersection = raycaster.intersectObject(hamsterBody);
          if(intersection.length > 0){
              hamsterBody.toggleTexture();
          }
        }
    })
}

const createObjects = () => {
    let ground = createBox(25, 2, 25, 0xffffff, './assets/textures/grass/rocky_terrain_02_diff_1k.jpg');
    ground.position.set(0, -1, 0);
    ground.castShadow = true;
    ground.receiveShadow = true;

    hamster = createHamster();
    hamster.castShadow = true;
    hamster.receiveShadow = true;

    let tree1 = createTree(-5, 0, -5);
    let tree2 = createTree(7, 0, -6);
    let tree3 = createTree(-8, 0, 8);

    createSkybox();
    createText();
    createDarkWarrior();

    let objects = [ground, hamster, tree1, tree2, tree3];
    
    objects.forEach((obj) => {
        scene.add(obj);
    });
}

const createLight = (scene) => {
    // Ambient Light
    let ambientLight = new THREE.AmbientLight('#FFFFFF', 0.7);
    scene.add(ambientLight);

    // Spot Light
    let spotLight = new THREE.SpotLight(0xffffff, 1.2, 1000);
    spotLight.position.set(0, 10, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    scene.add(spotLight);

    // Directional Light
    let directionalLight = new THREE.DirectionalLight(0xffffee, 0.5);
    directionalLight.position.set(5, 2, 8);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

let loader = new THREE.TextureLoader();     

const createBox = (width, height, depth, color, image) => {
    // Box with standard mesh material 
    let geo = new THREE.BoxGeometry(width, height, depth);
    let texture = loader.load(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    let mat = new THREE.MeshStandardMaterial({
        color, 
        map: texture
    });

    let box = new THREE.Mesh(geo, mat);
    return box;
}

const createPhongBox = (width, height, depth, color) => {
    // Box with phong mesh material
    let geo = new THREE.BoxGeometry(width, height, depth);
    let mat = new THREE.MeshPhongMaterial({ color })
    let box = new THREE.Mesh(geo, mat);
    return box;
}

const createHamsterBody = (width, height, depth, color, face, LR, TB, sad) => {
    // Box for body of the hamster
    let geo = new THREE.BoxGeometry(width, height, depth);
    let faceTexture = loader.load(face);
    let LRTexture = loader.load(LR);
    let TBTexture = loader.load(TB);
    let sadTexture = loader.load(sad);
    [faceTexture, LRTexture, TBTexture, sadTexture].forEach(t => t.colorSpace = THREE.SRGBColorSpace);

    let faceMat = new THREE.MeshPhongMaterial({ color, map: faceTexture });
    let sadMat  = new THREE.MeshPhongMaterial({ color, map: sadTexture });
    let LRMat   = new THREE.MeshPhongMaterial({ color, map: LRTexture });
    let TBMat   = new THREE.MeshPhongMaterial({ color, map: TBTexture });

    let materials = [
        LRMat, // 0
        LRMat, // 1
        TBMat, // 2
        TBMat, // 3
        faceMat, // 4
        LRMat, // 5
    ]

    let box = new THREE.Mesh(geo, materials);
    box.userData = {
        faceMat,
        sadMat,
        isClick: false
    };

    box.toggleTexture = function(){
        this.userData.isClick = !this.userData.isClick;
        this.material[4] = this.userData.isClick ? this.userData.sadMat : this.userData.faceMat;
        this.material.needsUpdate = true;
    }

    return box;
}

let spellCircle = null,spellActive = true,spellLight = null;
const spellLightOffset = new THREE.Vector3(0, 0.5, 0);

const createSpellEffect = (x, z) => {
  if (!spellLight) {
    spellLight = new THREE.PointLight("#FFD700", 2, 3);
    spellLight.castShadow = true;
    spellLight.visible = false;
    scene.add(spellLight);
  }
  spellLight.position.set(x, 0.5, z);
};

const spellMat = new THREE.MeshPhongMaterial({
    color: "#DAA520",
    emissive: "#FFCC00",
    emissiveIntensity: 2,
    shininess: 100,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
});

function createSpellCircle() {
    const g = new THREE.Group();

    // --- Inner Ring ---
    const innerGeo = new THREE.RingGeometry(1, 1.2, 64);
    const innerRing = new THREE.Mesh(innerGeo, spellMat);
    innerRing.position.set(0, 0.02, 0);
    innerRing.rotation.set(Math.PI / 2, 0, 0);
    g.add(innerRing);

    // --- Outer Ring ---
    const outerGeo = new THREE.RingGeometry(1.8, 2, 64);
    const outerRing = new THREE.Mesh(outerGeo, spellMat);
    outerRing.position.set(0, 0.02, 0);
    outerRing.rotation.set(Math.PI / 2, 0, 0);
    g.add(outerRing);

    // --- Pointer 1 ---
    const pointerGeo1 = new THREE.BoxGeometry(0.05, 4, 0.01);
    const pointer1 = new THREE.Mesh(pointerGeo1, spellMat);
    pointer1.position.set(0, 0.01, 0);
    pointer1.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    g.add(pointer1);

    // --- Pointer 2 ---
    const pointerGeo2 = new THREE.BoxGeometry(0.05, 4, 0.01);
    const pointer2 = new THREE.Mesh(pointerGeo2, spellMat);
    pointer2.position.set(0, 0.01, 0);
    pointer2.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    g.add(pointer2);
    return g;
}

function updateSpellEffect() {
  if (!darkWarrior || !spellCircle) return;

  const on = spellActive;

  spellCircle.visible = on;
  if (spellLight) spellLight.visible = on;

  if (on) {
    spellCircle.position.set(darkWarrior.position.x, 0.02, darkWarrior.position.z);
    spellCircle.rotation.y = darkWarrior.rotation.y;

    if (spellLight) {
      spellLight.position.set(
        darkWarrior.position.x + spellLightOffset.x,
        spellLightOffset.y,
        darkWarrior.position.z + spellLightOffset.z
      );
    }
  }
}

function enableShadowForModel(root) {
    root.traverse((child) => {
        if(child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true;
        }
    })
}

function createDarkWarrior(){
    gltfLoader.load(
      "./assets/models/momonga_ainz_ooal_gown/scene.gltf",
        (gltf) => {
            darkWarrior = gltf.scene;
            enableShadowForModel(darkWarrior);
            darkWarrior.position.set(0, -0.01, 3);
            darkWarrior.scale.set(0.01, 0.01, 0.01);
            darkWarrior.rotation.set(0, Math.PI / 2, 0);
            scene.add(darkWarrior);

            spellCircle = createSpellCircle();
            scene.add(spellCircle);

            createSpellEffect(
              darkWarrior.position.x + spellLightOffset.x,
              darkWarrior.position.z + spellLightOffset.z
            );
        }
    );
}

function updateDarkWarriorControls() {
    if (!darkWarrior) return;

    if (keys.q) darkWarrior.rotation.y += rotSpeed;
    if (keys.e) darkWarrior.rotation.y -= rotSpeed;

    const rot = darkWarrior.rotation.y;
    const sin = Math.sin(rot);
    const cos = Math.cos(rot);

    if (keys.s) {
        darkWarrior.position.x += -sin * moveSpeed;
        darkWarrior.position.z += -cos * moveSpeed;
    }
    if (keys.w) {
        darkWarrior.position.x -= -sin * moveSpeed;
        darkWarrior.position.z -= -cos * moveSpeed;
    }
    if (keys.d) {
        darkWarrior.position.x += cos * moveSpeed;
        darkWarrior.position.z += -sin * moveSpeed;
    }
    if (keys.a) {
        darkWarrior.position.x -= cos * moveSpeed;
        darkWarrior.position.z -= -sin * moveSpeed;
    }
}

function eventHandler() {
    window.addEventListener("keydown", (e) => {
        const k = e.key.toLowerCase();
        if (k in keys) keys[k] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            if (!darkWarrior || !spellCircle) return;
            spellActive = !spellActive;
            spellCircle.visible = spellActive;
            spellLight.visible = spellActive;
        }

    });

    window.addEventListener("keyup", (e) => {
        const k = e.key.toLowerCase();
        if (k in keys) keys[k] = false;
    });
}

const createCone = (radius, height, radialSegments, color) => {
    let geo = new THREE.ConeGeometry(radius, height, radialSegments);
    let mat = new THREE.MeshPhongMaterial({ color })
    return new THREE.Mesh(geo, mat);
}

const createHamster = () => {
    let mainTail = createPhongBox(0.6, 2.8, 0.6, "#023020");
    mainTail.position.set(2.6, 1.4, -2.25);
    mainTail.rotation.set(0, Math.PI/8, 0);
    mainTail.castShadow = true;
    mainTail.receiveShadow = true;

    let extensionTail = createPhongBox(0.6, 0.6, 1.4, "#023020");
    extensionTail.position.set(2.44, 2.8, -2.62);
    extensionTail.rotation.set(0, Math.PI/8, Math.PI/2);
    extensionTail.castShadow = true;
    extensionTail.receiveShadow = true;

    let leftEar = createCone(0.2, 0.7, 128, "#023020");
    leftEar.position.set(4.05, 2.2, -0.6);
    leftEar.rotation.set(0, 0, -Math.PI/8);
    leftEar.castShadow = true;
    leftEar.receiveShadow = true;

    let rightEar = createCone(0.2, 0.7, 128, "#6B6860");
    rightEar.position.set(2.5, 2.2, 0);
    rightEar.rotation.set(0, 0, -Math.PI/8);
    rightEar.castShadow = true;
    rightEar.receiveShadow = true; 

    let body = createHamsterBody(2, 2, 2, "#FFFFFF",
        './assets/textures/hamsuke/front_happy.png',
        './assets/textures/hamsuke/side.png',
        './assets/textures/hamsuke/top&back.png',
        './assets/textures/hamsuke/front_sad.png'
    )
    body.position.set(3, 1, -1);
    body.rotation.set(0, Math.PI/8, 0);

    hamsterBody = body;
    hamsterBody.castShadow = true;
    hamsterBody.receiveShadow = true;

    let hampter = new THREE.Group();
    hampter.add(mainTail, extensionTail, leftEar, rightEar, body);
    return hampter;
}

const createTree = (x, y, z) => {
    const tree = new THREE.Group();
    const barkTexture = loader.load('./assets/textures/tree/chinese_cedar_bark_diff_1k.jpg');
    barkTexture.colorSpace = THREE.SRGBColorSpace;

    const trunkGeo = new THREE.CylinderGeometry(0.6, 0.6, 3);
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTexture, color: 0xffffff});
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 1.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const bottomGeo = new THREE.ConeGeometry(3, 4);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x374F2F });
    const bottom = new THREE.Mesh(bottomGeo, leavesMat);
    bottom.position.set(x, y + 4, z);
    bottom.castShadow = true;
    bottom.receiveShadow = true;

    const topGeo = new THREE.ConeGeometry(2.1, 2.8);
    const top = new THREE.Mesh(topGeo, leavesMat);
    top.position.set(x, y + 6, z);
    top.castShadow = true;
    top.receiveShadow = true;

    tree.add(trunk, bottom, top);
    return tree;
};

const createSkybox = () => {
    const size = 1200;
    const textureLoader = new THREE.TextureLoader();

    const textures = [
        './assets/skybox/side-1.png', // px
        './assets/skybox/side-4.png', // nx
        './assets/skybox/top.png',    // py
        './assets/skybox/bottom.png', // ny
        './assets/skybox/side-3.png', // pz
        './assets/skybox/side-2.png', // nz
    ];

    const materials = textures.map((url) => {
        const tex = textureLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.BackSide,
            depthWrite: false,
        });
    });

    const skyboxGeo = new THREE.BoxGeometry(size, size, size);
    const skybox = new THREE.Mesh(skyboxGeo, materials);
    scene.add(skybox);
};

const createText = () => {
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
        const textGeo = new TextGeometry("OVerlord", {
            font: font,
            size: 1,
            height: 0.2,
            curveSegments: 12,
        });

        const textMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(-6, 4, 5);
        textMesh.rotation.set(0, Math.PI / 2, 0);
        textMesh.castShadow = true;
        textMesh.receiveShadow = true;

        scene.add(textMesh);
    });
};


function render () {
    renderer.shadowMap.enabled = true;
    requestAnimationFrame(render)
    updateDarkWarriorControls();
    updateSpellEffect();
    renderer.render(scene, camera)
    controls.update();
}

window.onload = () => {
    init();
    render();
}

window.onresize = () => {
    let w = window.innerWidth;
    let h = window.innerHeight;
    renderer.setSize(w, h);

    camera.aspect = w/h;
    camera.updateProjectionMatrix();
}
