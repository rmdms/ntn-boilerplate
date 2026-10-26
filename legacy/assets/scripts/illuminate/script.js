import * as THREE from 'three'
import PP from 'postprocessing'
import TweenMax from 'gsap'
import CANNON from 'cannon'

var composer
// Light
class Light {
  constructor() {
    this.radius = 1
    this.widthSegments = 36
    this.heightSegments = 16

    this.color = 0xfff5e8;

    this.ambient = 0xaa886f
    this.intensity = 0.5
    this.dist = 35

    this.mass = 1
    this.position = new CANNON.Vec3(MATHS.getRandom(LIGHTS.mouseX + 10, LIGHTS.mouseX - 10), LIGHTS.mouseY, MATHS.getRandom(5, 7.5))
    this.velocity = new CANNON.Vec3(MATHS.getRandom(-10, 10), 0, MATHS.getRandom(-10, 10))

    this.geometry = null
    this.texture = null
    this.sphere = null

    this.point = null

    this.damping = 0.1

    this.sleep = true
    this.speedLimit = 1
    this.timeLimit = 3

    this.scalar = .99

    this.shape = null
    this.material = null
    this.body = null
  }

  init() {
    this.geometry = new THREE.SphereBufferGeometry(this.radius, this.widthSegments, this.heightSegments)
    this.texture = new THREE.MeshBasicMaterial({
      color: this.color
    })
    this.sphere = new THREE.Mesh(this.geometry, this.texture)

    this.point = new THREE.PointLight(this.ambient, this.intensity, this.dist)
    this.point.add(this.sphere)

    this.point.position.set(this.position.x, this.position.y, this.position.z)

    SCENE.obj.add(this.point)

    this.shape = new CANNON.Sphere(this.radius, this.widthSegments, this.heightSegments)
    this.shape.linearDamping = this.damping
    this.shape.angularDamping = this.damping
    this.material = new CANNON.Material(PHYSICS.ground)
    this.body = new CANNON.Body({
      mass: this.mass,
      material: this.material
    })
    this.body.addShape(this.shape)

    this.body.position.set(this.position.x, this.position.y, this.position.z)
    this.body.applyImpulse(this.velocity, this.position)

    this.body.allowSleep = this.sleep
    this.body.sleepSpeedLimit = this.speedLimit
    this.body.sleepTimeLimit = this.timeLimit

    PHYSICS.world.add(this.body)
  }

  update() {
    this.body.velocity.scale(this.scalar, this.body.velocity)

    this.point.position.copy(this.body.position)
    this.point.quaternion.copy(this.body.quaternion)
  }
}

// ----- // ----- //

// Window
const WINDOW = {
  getHeight: function () {
    return window.innerHeight
  },
  getWidth: function () {
    return window.innerWidth
  },
  getRatio: function () {
    return WINDOW.getWidth() / WINDOW.getHeight()
  }
}
// Render
const RENDER = {
  obj: null,
  alpha: true,
  antialias: true,
  init: function () {
    RENDER.obj = new THREE.WebGLRenderer({
      alpha: RENDER.alpha,
      antialias: RENDER.antialias
    })

    RENDER.obj.setSize(WINDOW.getWidth(), WINDOW.getHeight())
    // RENDER.obj.toneMapping = THREE.ReinhardToneMapping;

    document.getElementById('main').appendChild(RENDER.obj.domElement)
    document.body.style.background = 'black'
    document.querySelector('canvas').style.top = '5%'

    SCENE.init()
    CAMERA.init()

    window.addEventListener('resize', RENDER.resize)
  },
  update() {
    RENDER.obj.render(SCENE.obj, CAMERA.obj)
  },
  resize: function () {
    CAMERA.aspect = WINDOW.getRatio()

    CAMERA.obj.updateProjectionMatrix()

    RENDER.obj.setSize(WINDOW.getWidth(), WINDOW.getHeight())
  }
}
// Scene
const SCENE = {
  obj: null,
  init: function () {
    SCENE.obj = new THREE.Scene()
  }
}
// Camera
const CAMERA = {
  obj: null,
  fov: 50,
  near: 1,
  far: 1000,
  position: new THREE.Vector3(0, 0, 100),
  init: function () {
    CAMERA.obj = new THREE.PerspectiveCamera(CAMERA.fov, WINDOW.getRatio(), CAMERA.near, CAMERA.far)

    CAMERA.obj.position.add(CAMERA.position)

    SCENE.obj.add(CAMERA.obj)
  }
}
// Physics
const PHYSICS = {
  world: new CANNON.World(),
  gravity: new CANNON.Vec3(0, -100, 0),
  broadphase: new CANNON.NaiveBroadphase(),
  iterations: 10,
  time: 1 / 60,
  ground: null,
  friction: .1,
  restitution: .55,
  sleep: true,
  init: function () {
    PHYSICS.world.gravity.set(PHYSICS.gravity.x, PHYSICS.gravity.y, PHYSICS.gravity.z)

    PHYSICS.world.solver.iterations = PHYSICS.iterations

    PHYSICS.world.allowSleep = PHYSICS.sleep

    PHYSICS.ground = new CANNON.ContactMaterial(new CANNON.Material("groundMaterial"), new CANNON.Material("slipperyMaterial"), {
      friction: PHYSICS.friction,
      restitution: PHYSICS.restitution
    })
    PHYSICS.world.addContactMaterial(PHYSICS.ground)
  },
  update: function () {
    PHYSICS.world.step(PHYSICS.time)
  }
}
// Maths
const MATHS = {
  getRandom: function (min, max) {
    return Math.random() * (max - min + 1) + min
  }
}
// Lights
const LIGHTS = {
  obj: [],
  number: 10,
  limit: 50,
  mouseX: 0,
  mouseX: 0,
  isAdd: true,
  isRemove: true,
  init: function () {
    document.addEventListener('click', LIGHTS.add)
    window.addEventListener('mousemove', function (event) {
      LIGHTS.mouseMove(event)
    })
  },
  update: function () {
    for (let light of LIGHTS.obj) {
      light.update()
    }
  },
  add: async function () {
    if (LIGHTS.isAdd) {
      LIGHTS.isAdd = false
      LIGHTS.isAdd = await LIGHTS.resolveAdd()
    }
  },
  resolveAdd: function () {
    return new Promise(resolve => {
      document.getElementById('reset').addEventListener('click', function () {
        LIGHTS.remove()
      })
      DOM.removeTitle()

      if (LIGHTS.obj.length <= LIGHTS.limit) {
        for (let i = 0; i < LIGHTS.number; i++) {
          let light = new Light()
          light.init()

          LIGHTS.obj.push(light)
        }
      } else {
        LIGHTS.remove()
      }
      resolve(true)
    });
  },
  remove: async function () {
    if (LIGHTS.isRemove) {
      LIGHTS.isRemove = false
      if (LIGHTS.obj.length) {
        DOM.removeLetters()
        DOM.removeTitle()
      }
      document.removeEventListener('click', LIGHTS.add)
      PHYSICS.world.gravity.set(PHYSICS.gravity.x, PHYSICS.gravity.y * -25, PHYSICS.gravity.z)
      for (let light of LIGHTS.obj) {
        light.body.wakeUp()
      }
      LIGHTS.isRemove = await LIGHTS.resolveRemove()
    }
  },
  resolveRemove: function () {
    return new Promise(resolve => {
      setTimeout(function () {
        for (let light of LIGHTS.obj) {
          SCENE.obj.remove(light.point)
          PHYSICS.world.remove(light.body)
        }
        LIGHTS.obj = []
        PHYSICS.world.gravity.set(PHYSICS.gravity.x, PHYSICS.gravity.y, PHYSICS.gravity.z)
        document.addEventListener('click', LIGHTS.add)
      }, 500)
      setTimeout(function () {
        DOM.addLetters()
        DOM.addTitle()
        resolve(true)
      }, 250)
    });
  },
  mouseMove: function (event) {
    LIGHTS.mouseX = ((event.clientX / WINDOW.getWidth()) * 2 - 1) * 45
    LIGHTS.mouseY = -((event.clientY / WINDOW.getWidth()) * 2 - 1) * 45
    if (LIGHTS.mouseY < 25) {
      LIGHTS.mouseY = 25
    }
  }
}
// Ground
const GROUND = {
  obj: null,
  geometry: null,
  width: 1000,
  height: 1000,
  depth: .1,
  texture: null,
  color: 0xaa907d,
  emissive: 0x000000,
  specular: 0x111111,
  shininess: 4,
  body: null,
  mass: 0,
  position: new CANNON.Vec3(0, -12.5, 0),
  quaternion: new CANNON.Vec3(1, 0, 0),
  rotation: -Math.PI / 2,
  shape: null,
  material: null,
  init: function () {
    GROUND.geometry = new THREE.BoxGeometry(GROUND.width, GROUND.height, GROUND.depth)
    GROUND.texture = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: GROUND.color,
      emissive: GROUND.emissive,
      specular: GROUND.specular,
      shininess: GROUND.shininess
    })
    GROUND.obj = new THREE.Mesh(GROUND.geometry, GROUND.texture)

    SCENE.obj.add(GROUND.obj)

    GROUND.shape = new CANNON.Plane()
    GROUND.material = new CANNON.Material(PHYSICS.ground)
    GROUND.body = new CANNON.Body({
      mass: GROUND.mass,
      material: GROUND.material
    })
    GROUND.body.addShape(GROUND.shape)

    GROUND.body.position.set(GROUND.position.x, GROUND.position.y, GROUND.position.z)
    GROUND.body.quaternion.setFromAxisAngle(GROUND.quaternion, GROUND.rotation)

    PHYSICS.world.add(GROUND.body)
  },
  update: function () {
    GROUND.obj.position.copy(GROUND.body.position)
    GROUND.obj.quaternion.copy(GROUND.body.quaternion)
  }
}
// Ground
const WALL = {
  obj: null,
  geometry: null,
  width: 1000,
  height: 1000,
  depth: .1,
  texture: null,
  color: 0xaa907d,
  emissive: 0x000000,
  specular: 0x111111,
  shininess: 4,
  body: null,
  mass: 0,
  position: new CANNON.Vec3(0, 0, -35),
  shape: null,
  material: null,
  init: function () {
    WALL.geometry = new THREE.BoxBufferGeometry(WALL.width, WALL.height, WALL.depth)
    WALL.texture = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: WALL.color,
      emissive: WALL.emissive,
      specular: WALL.specular,
      shininess: WALL.shininess
    })
    WALL.obj = new THREE.Mesh(WALL.geometry, WALL.texture)

    SCENE.obj.add(WALL.obj)

    WALL.shape = new CANNON.Plane()
    WALL.material = new CANNON.Material()
    WALL.body = new CANNON.Body({
      mass: WALL.mass,
      material: WALL.material
    })
    WALL.body.addShape(WALL.shape)

    WALL.body.position.set(WALL.position.x, WALL.position.y, WALL.position.z)

    PHYSICS.world.add(WALL.body)
  },
  update: function () {
    WALL.obj.position.copy(WALL.body.position)
    WALL.obj.quaternion.copy(WALL.body.quaternion)
  }
}
// Text
// const TEXT = {
//   obj: null,
//   font: '/json/Morganite_SemiBold.json',
//   geometry: null,
//   text: "HEY! WHAT'S UP",
//   size: 1,
//   height: 1,
//   texture: null,
//   color: 0x000000,
//   emissive: 0x000000,
//   specular: 0x111111,
//   shininess: 100,
//   body: null,
//   position: {
//     x: 0,
//     y: -0.35,
//     z: 95
//   },
//   mass: 0,
//   shape: null,
//   material: null,
//   load: function () {
//     let loader = new THREE.FontLoader()
//     loader.load(TEXT.font, TEXT.init)
//   },
//   init: function (font) {
//     TEXT.geometry = new THREE.TextGeometry(TEXT.text, {
//       font: font,
//       size: TEXT.size,
//       height: TEXT.height
//     })
//     // TEXT.texture = new THREE.MeshNormalMaterial()
//     TEXT.texture = new THREE.MeshPhongMaterial({
//       side: THREE.DoubleSide,
//       color: GROUND.color,
//       emissive: GROUND.emissive,
//       specular: GROUND.specular,
//       shininess: GROUND.shininess
//     })
//     TEXT.obj = new THREE.Mesh(TEXT.geometry, TEXT.texture)

//     TEXT.obj.geometry.computeBoundingBox()
//     TEXT.position.x = TEXT.getCenter(TEXT.obj.geometry.boundingBox.max.x, TEXT.obj.geometry.boundingBox.min.x)
//     TEXT.obj.position.set(TEXT.position.x, TEXT.position.y, TEXT.position.z)

//     SCENE.obj.add(TEXT.obj)
//     TEXT.shape = new CANNON.Box(new CANNON.Vec3(TEXT.obj.geometry.boundingBox.max.x / 2, TEXT.obj.geometry.boundingBox.max.y, TEXT.obj.geometry.boundingBox.max.z / 2))
//     TEXT.material = new CANNON.Material(PHYSICS.ground)
//     TEXT.body = new CANNON.Body({
//       mass: TEXT.mass,
//       material: TEXT.material
//     })
//     TEXT.body.addShape(TEXT.shape)

//     TEXT.body.position.set(0, TEXT.position.y, TEXT.obj.geometry.boundingBox.max.z / 2)

//     PHYSICS.world.add(TEXT.body)
//   },
//   getCenter: function (max, min) {
//     return -0.5 * (max - min)
//   }

// }
const TEXT = {
  obj: null,
  font: '/json/Morganite_SemiBold.json',
  geometry: null,
  text: 'HAPPY NEW YEAR',
  size: 22,
  height: 10,
  texture: null,
  color: 0xaa907d,
  emissive: 0x000000,
  specular: 0xffffff,
  shininess: 4,
  body: null,
  position: {
    x: 0,
    y: -7,
    z: 0
  },
  mass: 0,
  shape: null,
  material: null,
  load: function () {
    let loader = new THREE.FontLoader()
    loader.load(TEXT.font, TEXT.init)
  },
  init: function (font) {
    TEXT.geometry = new THREE.TextGeometry(TEXT.text, {
      font: font,
      size: TEXT.size,
      height: TEXT.height
    })
    TEXT.texture = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: GROUND.color,
      emissive: GROUND.emissive,
      specular: GROUND.specular,
      shininess: GROUND.shininess
    })
    TEXT.obj = new THREE.Mesh(TEXT.geometry, TEXT.texture)

    TEXT.obj.geometry.computeBoundingBox()
    TEXT.position.x = TEXT.getCenter(TEXT.obj.geometry.boundingBox.max.x, TEXT.obj.geometry.boundingBox.min.x)
    TEXT.obj.position.set(TEXT.position.x, TEXT.position.y, TEXT.position.z)

    SCENE.obj.add(TEXT.obj)
    TEXT.shape = new CANNON.Box(new CANNON.Vec3(TEXT.obj.geometry.boundingBox.max.x / 2, TEXT.obj.geometry.boundingBox.max.y, TEXT.obj.geometry.boundingBox.max.z / 2))
    TEXT.material = new CANNON.Material(PHYSICS.ground)
    TEXT.body = new CANNON.Body({
      mass: TEXT.mass,
      material: TEXT.material
    })
    TEXT.body.addShape(TEXT.shape)

    TEXT.body.position.set(0, TEXT.position.y, TEXT.obj.geometry.boundingBox.max.z / 2)

    PHYSICS.world.add(TEXT.body)
  },
  getCenter: function (max, min) {
    return -0.5 * (max - min)
  }

}
// DOM
const DOM = {
  title: document.getElementById('content').querySelector('h1'),
  text: document.getElementById('content').querySelector("p"),
  letters: null,
  init: function () {
    DOM.text.innerHTML = DOM.text.textContent.replace(/(\w)/g, "<span>$&</span>")
    DOM.letters = DOM.text.querySelectorAll('span')

    DOM.addLetters()
    DOM.addTitle()
  },
  addLetters: function () {
    TweenMax.staggerFromTo(DOM.letters, .75, {
      y: "+30px",
      opacity: 0
    }, {
      y: "-=15px",
      opacity: 1,
      ease: Power1.easeOut
    }, 0.05)
  },
  removeLetters: function () {
    TweenMax.staggerTo(DOM.letters, .25, {
      y: "-=30px",
      opacity: 0,
      ease: Power1.easeIn
    })
  },
  addTitle: function () {
    TweenMax.to(DOM.title, .75, {
      opacity: 1,
      ease: Power1.easeOut
    })
  },
  removeTitle: function () {
    TweenMax.to(DOM.title, .25, {
      opacity: 0,
      ease: Power1.easeOut
    })

  },
}
// ----- // ----- //
// Initilize
function initialize() {
  DOM.init()
  RENDER.init()
  PHYSICS.init()
  TEXT.load()
  GROUND.init()
  WALL.init()
  LIGHTS.init()

  // let geometry = new THREE.SphereBufferGeometry(.01, 32, 32)
  // let texture = new THREE.MeshBasicMaterial({
  //   color: 0xffffff
  // })
  // let sphere = new THREE.Mesh(geometry, texture)

  // let point = new THREE.PointLight(0xffffff, 1, 2)
  // point.add(sphere)

  // point.position.set(0, 0, 100)

  // SCENE.obj.add(point)

  // window.addEventListener('mousemove', ()=>{
  //   let mouse = {}
  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  //   point.position.x = mouse.x
  //   point.position.y = mouse.y
  // })

  animate()
}
// Animate
function animate() {

  RENDER.update()
  PHYSICS.update()
  LIGHTS.update()
  GROUND.update()
  WALL.update()

  requestAnimationFrame(animate)
}

// ----- // ----- //

initialize()