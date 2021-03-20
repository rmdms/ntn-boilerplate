import * as THREE from 'three'
import TweenMax from 'gsap'
import SimplexNoise from 'simplex-noise'

class App {
  /* ------------------  VARIABLES  ------------------ */

  constructor() {

    /* VARIABLES - Window */
    this.WINDOW_width = window.innerWidth
    this.WINDOW_height = window.innerHeight
    // --- 
    this.WINDOW_ratio = this.WINDOW_width / this.WINDOW_height

    /* VARIABLES - Time */
    this.TIME_object = Date.now()
    // ---
    this.TIME_last = this.TIME_object
    this.TIME_current = 0
    this.TIME_delta = 0

    /* VARIABLES - Noise */
    this.NOISE_OBJECT = new SimplexNoise()

    /* VARIABLE - Render */
    this.RENDER_ALPA = false
    this.RENDER_ANTIALIAS = true
    // --
    this.RENDER_OBJECT

    /* VARIABLE - Scene */
    this.SCENE_OBJECT
    /* VARIABLES - Camera */
    this.CAMERA_FOV = 50
    this.CAMERA_NEAR = 1
    this.CAMERA_FAR = 1000
    // ---
    this.CAMERA_OBJECT

    /* VARIABLE - Control */
    this.CONTROL_OBJECT

    /* VARIABLES - Light */
    this.LIGHT_AMBIENCE = 0xffffff
    this.LIGHT_INTENSITY = .15
    // ---
    this.LIGHT_OBJECT

    /* VARIABLES - Sound */
    this.SOUND_URL = "/audios/EverythingBlack_UnlikePluto.mp3"
    this.SOUND_BPM = 98
    this.SOUND_OFFSET = 0
    this.SOUND_CALLBACK = 98
    this.SOUND_DEBUG = false
    // ---
    this.SOUND_OBJECT
    // ---
    this.beat = 1

    /* VARIABLE - Groud */
    this.GROUND_OBJECT

    /* VARIABLE - Planet */
    this.PLANET_OBJECT

    /* VARIABLES - Morph */
    this.MORPH_OBJECT
    // ---
    this.MORPH_NUMBER = 50
    // ---
    this.MORPH_GROUP = new THREE.Group()

    /* INITIALIZE */
    document.querySelector('.button__play').addEventListener('click', () => {
      TweenMax.to(document.querySelector('.text_ref'), 0.75, {
        autoAlpha: 0.5
      })
      TweenMax.to(document.querySelector('.text_informations'), 0.75, {
        autoAlpha: 0.5
      })
      const text_safari = document.querySelector('.text_informations')
      if (text_safari) {
        TweenMax.to(text_safari, 0.75, {
          autoAlpha: 0.5
        })
      }
      TweenMax.to(document.querySelector('.section_player'), 0.75, {
        autoAlpha: 0,
        onComplete: () => {
          this.SOUND_OBJECT = new Sound(this.SOUND_URL, this.SOUND_BPM, this.SOUND_OFFSET, this.initialize.bind(this), this.SOUND_DEBUG)
        }
      })
    });

  }

  /* ------------------  FUNCTIONS  ------------------ */

  /* FUNCTION - Initialize */
  initialize() {

    /* RENDER */
    this.RENDER_OBJECT = new THREE.WebGLRenderer({
      alpha: this.RENDER_ALPA,
      antialias: this.RENDER_ANTIALIAS
    })
    // ---
    this.RENDER_OBJECT.setSize(this.WINDOW_width, this.WINDOW_height)
    // ---
    document.getElementById('main').appendChild(this.RENDER_OBJECT.domElement)

    /* SCENE */
    this.SCENE_OBJECT = new THREE.Scene()

    /* CAMERA */
    this.CAMERA_OBJECT = new THREE.PerspectiveCamera(this.CAMERA_FOV, this.WINDOW_ratio, this.CAMERA_NEAR, this.CAMERA_FAR)
    // ---
    this.CAMERA_OBJECT.position.set(0, 0, 100) /* !!! éphemère !!! */
    // ---
    this.SCENE_OBJECT.add(this.CAMERA_OBJECT)

    /* LIGHT */
    this.LIGHT_OBJECT = new THREE.AmbientLight(this.LIGHT_AMBIENCE, this.LIGHT_INTENSITY)
    // ---
    this.SCENE_OBJECT.add(this.LIGHT_OBJECT)

    /* GROUND */
    this.GROUND_OBJECT = new Ground()
    // ---
    this.SCENE_OBJECT.add(this.GROUND_OBJECT.MESH_OBJECT)

    /* PLANET */
    this.PLANET_OBJECT = new Planet()
    // ---
    this.SCENE_OBJECT.add(this.PLANET_OBJECT.GROUP_OBJECT)

    /* MORPHS */
    for (let i = 0; i < this.MORPH_NUMBER; i++) {
      this.MORPH_OBJECT = new Morph()
      this.MORPH_GROUP.add(this.MORPH_OBJECT.GROUP_OBJECT)
    }
    // ---
    this.SCENE_OBJECT.add(this.MORPH_GROUP)

    /* EVENT */
    window.addEventListener('resize', this.resize.bind(this), false)

    setTimeout(()=>{
      this.update()
      this.sound_play()
    }, 100)

  }

  /* FUNCTIONS - Random */
  random_color() {

    let RANDOM_tab = [
      0xF1C40F,
      // ---
      0xF10F0F,
      // ---
      0x95F10F,
      // ---
      0x0FF1B7,
      // ---
      0x0F9FF1,
      // ---
      0x5A0FF1,
      // ---
      0xE70FF1
    ]
    // RETURN
    return RANDOM_tab[Math.round(this.random_interval(0, RANDOM_tab.length))]

  }
  // ---
  random_interval(PARAMETER_MIN, PARAMETER_MAX) {

    /* RETURN */
    return Math.random() * (PARAMETER_MAX - PARAMETER_MIN + 1) + PARAMETER_MIN

  }
  // ---
  random_two_numbers(PARAMETER_VALUE_01, PARAMETER_VALUE_02) {

    let RANDOM_tab = [PARAMETER_VALUE_01, PARAMETER_VALUE_02]

    /* RETURN */
    return RANDOM_tab[Math.round(Math.random)]

  }

  /* FUNCTION - Remap */
  remap(PARAMETER_VALUE, PARAMETER_MIN_01, PARAMETER_MAX_01, PARAMETER_MIN_02, PARAMETER_MAX_02) {

    /* RETURN */
    return PARAMETER_MIN_02 + (PARAMETER_MAX_02 - PARAMETER_MIN_02) * (PARAMETER_VALUE - PARAMETER_MIN_01) / (PARAMETER_MAX_01 - PARAMETER_MIN_01)

  }

  /* FUNCTION - Resize */
  resize() {

    /* WINDOW */
    this.WINDOW_width = window.innerWidth
    this.WINDOW_height = window.innerHeight
    // ---
    this.WINDOW_ratio = this.WINDOW_width / this.WINDOW_height

    /* CAMERA */
    this.CAMERA_OBJECT.aspect = this.WINDOW_ratio
    // ---
    this.CAMERA_OBJECT.updateProjectionMatrix()

    /* RENDER */
    this.RENDER_OBJECT.setSize(this.WINDOW_width, this.WINDOW_height)

  }

  /* FUNCTION - Sound */
  sound_play() {
    /* DOM */
    // document.getElementById("loader").remove()

    /* PLAY */
    this.SOUND_OBJECT.play()

    /* BEAT */
    this.SOUND_OBJECT.createBeat({
      onBeat: this.sound_beat.bind(this)
    }).on()

    /* KICK */
    this.SOUND_OBJECT.createKick({
      frequency: [220, 255],
      threshold: 20,
      decay: 50,
      onKick: this.sound_kick_on.bind(this),
      offKick: this.sound_kick_off.bind(this)
    }).on()

  }
  sound_beat() {

    /* PLANET */
    for (let i = 0; i < this.PLANET_OBJECT.GROUP_OBJECT.children[1].children.length; i++) {
      let light = this.PLANET_OBJECT.GROUP_OBJECT.children[1].children[i]
      let frequency = this.SOUND_OBJECT.getSpectrum()
      // ---
      light.position.x = Math.cos(this.TIME_current * 10 + light.position._x) * 5 * this.remap(frequency[i], 0, 255, 0, 2.5)
      light.position.z = Math.sin(this.TIME_current * 10 + light.position._x) * 5 * this.remap(frequency[i], 0, 255, 0, 2.5)
    }

    /* MORPH */
    if ((this.beat >= 16) && (this.beat < 48)) {
      if (this.beat % 2 != 0) {
        this.MORPH_GROUP.children[(this.beat - 16 - 1) / 2].children[1].scale.set(1, 1, 1)
        this.MORPH_GROUP.children[(this.beat - 16 - 1) / 2].children[0].intensity = 450
      }
    } else if ((this.beat >= 48) && (this.beat < 49)) {
      for (let i = 16; i < this.MORPH_GROUP.children.length; i++) {
        this.MORPH_GROUP.children[i].children[1].scale.set(.01, .01, .01)
        this.MORPH_GROUP.children[i].children[0].intensity = 0
      }
    }

    // /* CAMERA */
    // let frequency = this.SOUND_OBJECT.getSpectrum()
    // if (this.beat % 20 != 0) {
    //   this.CAMERA_OBJECT.position.y = 50.0
    // } else {
    //   this.CAMERA_OBJECT.position.y = 0
    // }

    /* BEAT */
    this.beat++

  }
  // ---
  sound_kick_off() {}
  // ---
  sound_kick_on() {

    /* PLANET */
    for (let i = 0; i < this.PLANET_OBJECT.GROUP_OBJECT.children[1].children.length; i++) {
      let light = this.PLANET_OBJECT.GROUP_OBJECT.children[1].children[i]
      let frequency = this.SOUND_OBJECT.getSpectrum()
      let order = this.random_two_numbers(-1, 1)
      // ---
      light.color.setHex(this.random_color())
      // ---
      light.position.x = -Math.cos(this.TIME_current * 10 + light.position._x) * 5 * this.remap(frequency[i], 0, 255, 0, 2.5)
      light.position.z = Math.sin(this.TIME_current * 10 + light.position._x) * 5 * this.remap(frequency[i], 0, 255, 0, 2.5)
    }

    /* MORPH */
    for (let i = 0; i < this.MORPH_GROUP.children.length; i++) {
      if (this.MORPH_GROUP.children[i].children[1].scale.x == .01) {
        this.MORPH_GROUP.children[i].children[1].scale.set(1, 1, 1)
      } else if (this.MORPH_GROUP.children[i].children[1].scale.x == 1) {
        this.MORPH_GROUP.children[i].children[1].scale.set(.01, .01, .01)
      }
    }

  }

  /* FUNCTION - Update */
  update() {

    /* TIME */
    this.TIME_object = Date.now()
    // ---
    this.TIME_delta = this.TIME_object - this.TIME_last
    this.TIME_last = this.TIME_object
    this.TIME_current += this.TIME_delta / 5000

    /* CAMERA */
    this.CAMERA_OBJECT.position.x = Math.cos(this.TIME_current) * 100
    this.CAMERA_OBJECT.position.z = Math.sin(this.TIME_current) * 100
    // ---
    this.CAMERA_OBJECT.lookAt(this.SCENE_OBJECT.position)

    /* MORPH */
    for (let i = 0; i < this.MORPH_NUMBER; i++) {
      let morph = this.MORPH_GROUP.children[i].children[1]
      morph.rotation.set(Math.cos(this.TIME_current + morph.position.x), 0, Math.sin(this.TIME_current + morph.position.x))
    }
    /* RENDER */
    this.RENDER_OBJECT.render(this.SCENE_OBJECT, this.CAMERA_OBJECT)

    /* UPDATE */
    requestAnimationFrame(this.update.bind(this))
  }

  /* ------------------------------------------------- */

}

class Ground {
  /* ------------------  VARIABLES  ------------------ */

  constructor() {
    this.ratio = window.innerWidth / window.innerHeight
    /* VARIABLES - Mesh */
    this.MESH_GEOMETRY_WIDTH = 170 /* --- mettre une valeur en fonction du ratio --- */
    this.MESH_GEOMETRY_HEIGHT = 2.5 /* --- mettre une valeur en fonction du ratio --- */
    this.MESH_GEOMETRY_DEPTH = 170 /* --- mettre une valeur en fonction du ratio --- */
    // ---
    this.MESH_GEOMETRY = new THREE.BoxGeometry(this.MESH_GEOMETRY_WIDTH, this.MESH_GEOMETRY_HEIGHT, this.MESH_GEOMETRY_DEPTH)
    // ---
    this.MESH_MATERIAL_COLOR = 0x010101
    this.MESH_MATERIAL_EMESSIVE = 0x000000
    this.MESH_MATERIAL_SPECULAR = 0x111111
    this.MESH_MATERIAL_SHININESS = 100
    // ---
    this.MESH_MATERIAL = new THREE.MeshPhongMaterial({
      color: this.MESH_MATERIAL_COLOR,
      emissive: this.MESH_MATERIAL_EMESSIVE,
      specular: this.MESH_MATERIAL_SPECULAR,
      shininess: this.MESH_MATERIAL_SHININESS
    })
    // this.MESH_MATERIAL = new THREE.MeshNormalMaterial()
    // ---
    this.MESH_OBJECT = new THREE.Mesh(this.MESH_GEOMETRY, this.MESH_MATERIAL)
    // ---
    this.MESH_POSITION_X = 0
    this.MESH_POSITION_Y = -10 + (-10 / 6) /* --- mettre une valeur en fonction de la taille de Planet --- */
    this.MESH_POSITION_Z = 0

    /* INITIALIZE */
    this.initialize()

  }

  /* ------------------  FUNCTIONS  ------------------ */

  /* FUNCTION - Initialize */
  initialize() {
    this.MESH_OBJECT.position.set(this.MESH_POSITION_X, this.MESH_POSITION_Y, this.MESH_POSITION_Z)
  }

  /* ------------------------------------------------- */

}

class Morph {
  /* ------------------  VARIABLES  ------------------ */

  constructor() {

    /* VARIABLES - Light */
    // ---
    this.LIGHT_AMBIENCE = 0xffffff
    this.LIGHT_INTENSITY = 0
    this.LIGHT_DISTANCE = 5
    // ---
    this.LIGHT_OBJECT = new THREE.PointLight(this.LIGHT_AMBIENCE, this.LIGHT_INTENSITY, this.LIGHT_DISTANCE)
    // ---
    this.LIGHT_OBJECT_POSITION_X = this.random_two_numbers(this.random_interval(-170 / 3, -15), this.random_interval(15, 170 / 3))
    this.LIGHT_OBJECT_POSITION_Y = this.random_interval(-10 + 2.5, 10 + (10 / 6))
    this.LIGHT_OBJECT_POSITION_Z = this.random_two_numbers(this.random_interval(-170 / 3, -15), this.random_interval(15, 170 / 3))
    // --- 
    this.LIGHT_MESH_GEOMETRY_RADIUS = .25
    this.LIGHT_MESH_GEOMETRY_SEGMENTS_WIDTH = 16
    this.LIGHT_MESH_GEOMETRY_SEGMENTS_HEIGHT = 8
    // ---
    this.LIGHT_MESH_GEOMETRY = new THREE.SphereGeometry(this.LIGHT_MESH_GEOMETRY_RADIUS, this.LIGHT_MESH_GEOMETRY_SEGMENTS_WIDTH, this.LIGHT_MESH_GEOMETRY_SEGMENTS_HEIGHT)
    // ---
    this.LIGHT_MESH_MATERIAL_COLOR = 0xffffff
    this.LIGHT_MESH_MATERIAL_OPACITY = 0
    // ---
    this.LIGHT_MESH_MATERIAL = new THREE.MeshBasicMaterial({
      color: this.LIGHT_MESH_MATERIAL_COLOR,
      transparent: true,
      opacity: this.LIGHT_MESH_MATERIAL_OPACITY
    })
    // ---
    this.LIGHT_MESH = new THREE.Mesh(this.LIGHT_MESH_GEOMETRY, this.LIGHT_MESH_MATERIAL)

    /* VARIABLES - Mesh */
    this.MESH_GEOMETRY_RADIUS = 2.5
    this.MESH_GEOMETRY_SEGMENTS_WIDTH = 16
    this.MESH_GEOMETRY_SEGMENTS_HEIGHT = 8
    // ---
    this.MESH_GEOMETRY = new THREE.SphereGeometry(this.MESH_GEOMETRY_RADIUS, this.MESH_GEOMETRY_SEGMENTS_WIDTH, this.MESH_GEOMETRY_SEGMENTS_HEIGHT)
    // ---
    this.MESH_MATERIAL_ALPHA_MAP_TEXTURE = new THREE.CanvasTexture(this.generate_texture())
    this.MESH_MATERIAL_ALPHA_MAP_TEXTURE.magFilter = THREE.NearestFilter
    this.MESH_MATERIAL_ALPHA_MAP_TEXTURE.wrapT = THREE.RepeatWrapping
    this.MESH_MATERIAL_ALPHA_MAP_TEXTURE.wrapS = THREE.RepeatWrapping
    this.MESH_MATERIAL_ALPHA_MAP_TEXTURE.repeat.set(1, 3.5)
    // ---
    this.MESH_MATERIAL_COLOR = 0x010101
    this.MESH_MATERIAL_EMESSIVE = 0x000000
    this.MESH_MATERIAL_SPECULAR = 0x111111
    this.MESH_MATERIAL_SHININESS = 100
    this.MESH_MATERIAL_SIDE = THREE.DoubleSide
    this.MESH_MATERIAL_ALPHA_MAP = this.MESH_MATERIAL_ALPHA_MAP_TEXTURE
    this.MESH_MATERIAL_ALPHA_TEST = .5
    // ---
    this.MESH_MATERIAL = new THREE.MeshPhongMaterial({
      color: this.MESH_MATERIAL_COLOR,
      emissive: this.MESH_MATERIAL_EMESSIVE,
      specular: this.MESH_MATERIAL_SPECULAR,
      shininess: this.MESH_MATERIAL_SHININESS,
      side: this.MESH_MATERIAL_SIDE,
      alphaMap: this.MESH_MATERIAL_ALPHA_MAP,
      alphaTest: this.MESH_MATERIAL_ALPHA_TEST
    })
    // ---
    this.MESH_OBJECT = new THREE.Mesh(this.MESH_GEOMETRY, this.MESH_MATERIAL)

    /* VARIABLE - Group */
    this.GROUP_OBJECT = new THREE.Group()

    /* INITIALIZE */
    this.initialize()

  }

  /* ------------------  FUNCTIONS  ------------------ */

  /* FUNCTION - Initialize */
  initialize() {

    /* LIGHT */
    this.LIGHT_OBJECT.add(this.LIGHT_MESH)
    // ---
    this.LIGHT_OBJECT.position.set(this.LIGHT_OBJECT_POSITION_X, this.LIGHT_OBJECT_POSITION_Y, this.LIGHT_OBJECT_POSITION_Z)
    // ---
    this.GROUP_OBJECT.add(this.LIGHT_OBJECT)

    /* MESH */
    this.MESH_OBJECT.position.set(this.LIGHT_OBJECT.position.x, this.LIGHT_OBJECT.position.y, this.LIGHT_OBJECT.position.z)
    // ---
    this.MESH_OBJECT.scale.set(.01, .01, .01)
    // ---
    this.GROUP_OBJECT.add(this.MESH_OBJECT)

  }

  /* FUNCTIONS - Texture */
  generate_texture() {

    /* CANVAS */
    let canvas = document.createElement('canvas')
    // ---
    canvas.width = 2
    canvas.height = 2

    /* CONTEXT */
    let context = canvas.getContext('2d')
    // ---
    context.fillStyle = 'white'
    context.fillRect(0, 1, 2, 1)

    /* RETURN */
    return canvas;

  }

  /* FUNCTIONS - Random */
  random_interval(PARAMETER_MIN, PARAMETER_MAX) {

    /* RETURN */
    return Math.random() * (PARAMETER_MAX - PARAMETER_MIN + 1) + PARAMETER_MIN

  }
  // ---
  random_two_numbers(PARAMETER_VALUE_01, PARAMETER_VALUE_02) {

    let RANDOM_tab = [PARAMETER_VALUE_01, PARAMETER_VALUE_02]

    /* RETURN */
    return RANDOM_tab[Math.round(Math.random())]

  }

  /* FUNCTION - Update */
  update() {}
  /* ------------------------------------------------- */

}

class Planet {
  /* ------------------  VARIABLES  ------------------ */

  constructor() {

    /* VARIABLES - Mesh */
    this.MESH_GEOMETRY_SIZE = 10 /* --- mettre une valeur en fonction du ratio --- */
    // ---
    this.MESH_GEOMETRY = new THREE.IcosahedronGeometry(this.MESH_GEOMETRY_SIZE)
    // ---
    this.MESH_MATERIAL_COLOR = 0x010101
    this.MESH_MATERIAL_EMESSIVE = 0x000000
    this.MESH_MATERIAL_SPECULAR = 0x111111
    this.MESH_MATERIAL_SHININESS = 100
    // ---
    this.MESH_MATERIAL = new THREE.MeshPhongMaterial({
      color: this.MESH_MATERIAL_COLOR,
      emissive: this.MESH_MATERIAL_EMESSIVE,
      specular: this.MESH_MATERIAL_SPECULAR,
      shininess: this.MESH_MATERIAL_SHININESS
    })
    // this.MESH_MATERIAL = new THREE.MeshNormalMaterial()
    // ---
    this.MESH_OBJECT = new THREE.Mesh(this.MESH_GEOMETRY, this.MESH_MATERIAL)

    /* VARIABLES - Light */
    // --- 
    this.LIGHT_MESH_GEOMETRY_RADIUS = .25
    this.LIGHT_MESH_GEOMETRY_SEGMENTS_WIDTH = 16
    this.LIGHT_MESH_GEOMETRY_SEGMENTS_HEIGHT = 8
    // ---
    this.LIGHT_MESH_GEOMETRY = new THREE.SphereGeometry(this.LIGHT_MESH_GEOMETRY_RADIUS, this.LIGHT_MESH_GEOMETRY_SEGMENTS_WIDTH, this.LIGHT_MESH_GEOMETRY_SEGMENTS_HEIGHT)
    // ---
    this.LIGHT_MESH_MATERIAL_COLOR = 0xffffff
    this.LIGHT_MESH_MATERIAL_OPACITY = 1
    // ---
    this.LIGHT_MESH_MATERIAL = new THREE.MeshBasicMaterial({
      color: this.LIGHT_MESH_MATERIAL_COLOR,
      transparent: true,
      opacity: this.LIGHT_MESH_MATERIAL_OPACITY
    })
    // this.LIGHT_MESH_MATERIAL = new THREE.MeshNormalMaterial()
    // ---
    this.LIGHT_MESH
    // ---
    this.LIGHT_AMBIENCE = 0xffffff
    this.LIGHT_INTENSITY = 1
    this.LIGHT_DISTANCE = 100
    // ---
    this.LIGHT_OBJECT
    // ---
    this.LIGHT_NUMBER = 20
    // ---
    this.LIGHT_GROUP = new THREE.Group()

    /* VARIABLE - Group */
    this.GROUP_OBJECT = new THREE.Group()

    /* INITIALIZE */
    this.initialize()

  }

  /* ------------------  FUNCTIONS  ------------------ */

  /* FUNCTION - Initialize */
  initialize() {

    /* MESH */
    this.GROUP_OBJECT.add(this.MESH_OBJECT)

    /* LIGHT */
    for (let i = 0; i < this.LIGHT_NUMBER; i++) {

      this.LIGHT_OBJECT = new THREE.PointLight(this.LIGHT_AMBIENCE, this.LIGHT_INTENSITY, this.LIGHT_DISTANCE)
      // ---
      this.LIGHT_OBJECT.position.set(0, -this.MESH_GEOMETRY_SIZE, 0)
      this.LIGHT_OBJECT.position._x = this.random_interval(0, Math.PI * 2)
      this.LIGHT_OBJECT.position._y = this.random_interval(0, Math.PI * 2)
      this.LIGHT_OBJECT.position._z = this.random_interval(0, Math.PI * 2)
      // ---
      this.LIGHT_MESH = new THREE.Mesh(this.LIGHT_MESH_GEOMETRY, this.LIGHT_MESH_MATERIAL)
      this.LIGHT_OBJECT.add(this.LIGHT_MESH)
      // ---
      this.LIGHT_GROUP.add(this.LIGHT_OBJECT)
    }
    // ---
    this.GROUP_OBJECT.add(this.LIGHT_GROUP)

  }

  /* FUNCTIONS - Random */
  random_interval(PARAMETER_MIN, PARAMETER_MAX) {

    /* RETURN */
    return Math.random() * (PARAMETER_MAX - PARAMETER_MIN + 1) + PARAMETER_MIN

  }

  /* FUNCTION - Update */
  update() {}

  /* ------------------------------------------------- */

}

class Sound {

  /**
   * src        : path to mp3
   * bpm        : beat per minute
   * offsetTime : remove blank sound at start for beat calculation (in seconds)
   * callback   : ready callback
   * debug      : enable debug display
   */
  constructor(src, bpm, offsetTime, callback, debug) {

    // create context
    this.ctx;
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    } catch (e) {
      throw new Error('Web Audio API is not supported in this browser');
    }

    // values
    this._bpm = bpm;
    this._beatDuration = 60 / this._bpm;
    this._offsetTime = offsetTime;
    this._sections = [];
    this._kicks = [];
    this._beats = [];
    this._startTime = 0;
    this._pauseTime = 0;
    this._isPlaying = false;
    this._isLoaded = false;
    this._progress = 0;

    // events
    this._onUpdate = this.onUpdate.bind(this);
    this._onEnded = this.onEnded.bind(this);

    // create gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);

    // create analyser
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.connect(this.gainNode);
    this.analyserNode.smoothingTimeConstant = .8;
    this.analyserNode.fftSize = 512;
    let bufferLength = this.analyserNode.frequencyBinCount;
    this.frequencyDataArray = new Uint8Array(bufferLength);
    this.timeDomainDataArray = new Uint8Array(bufferLength);

    // create debug
    if (debug) this.debug = new Debug(this);

    // load
    this._load(src, callback);

    // update
    window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
  }

  // load MP3

  _load(src, callback) {

    if (src) {

      this._isLoaded = false;
      this._progress = 0;

      // Load asynchronously
      let request = new XMLHttpRequest();
      request.open("GET", src, true);
      request.responseType = "arraybuffer";
      request.onprogress = (e) => {
        this._progress = e.loaded / e.total;
      };
      request.onload = () => {
        this.ctx.decodeAudioData(request.response, (buffer) => {
          this._buffer = buffer;
          this._isLoaded = true;
          if (callback) callback();
        }, function (e) {
          console.log(e);
        });
      };
      request.send();
    }
  }

  get progress() {

    return this._progress;
  }

  get isLoaded() {

    return this._isLoaded;
  }

  // sound actions

  play(offset = 0) {

    if (this.req) cancelAnimationFrame(this.req);
    this._onUpdate();

    this._isPlaying = true;
    let elapseTime = this._pauseTime - this._startTime + offset;
    this._startTime = this.ctx.currentTime - elapseTime;

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.connect(this.analyserNode);
    this.sourceNode.buffer = this._buffer;
    this.sourceNode.start(0, elapseTime);
    this.sourceNode.addEventListener('ended', this._onEnded, false);
  }

  pause() {

    if (this.req) cancelAnimationFrame(this.req);

    if (this.sourceNode) {
      this.sourceNode.removeEventListener('ended', this._onEnded, false);
      this.sourceNode.stop(0);
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this._pauseTime = this.ctx.currentTime;
    this._isPlaying = false;
  }

  get duration() {

    return this._isLoaded ? this._buffer.duration : 0;
  }

  get time() {

    return this.isPlaying ? this.ctx.currentTime - this._startTime : this._pauseTime - this._startTime;
  }

  set volume(value) {

    this.gainNode.gain.value = value;
  }

  get volume() {

    return this.gainNode.gain.value;
  }

  get isPlaying() {

    return this._isPlaying;
  }

  // callback at specific time

  before(label, time, callback) {

    let _this = this;
    this._sections.push({
      label: label,
      condition: function () {
        return _this.time < time;
      },
      callback: callback
    });
    return this;
  }

  after(label, time, callback) {

    let _this = this;
    this._sections.push({
      label: label,
      condition: function () {
        return _this.time > time;
      },
      callback: callback
    });
    return this;
  }

  between(label, startTime, endTime, callback) {

    let _this = this;
    this._sections.push({
      label: label,
      condition: function () {
        return _this.time > startTime && _this.time < endTime;
      },
      callback: callback
    });
    return this;
  }

  onceAt(label, time, callback) {

    let _this = this;
    let thisSection = null;
    this._sections.push({
      label: label,
      condition: function () {
        return _this.time > time && !this.called;
      },
      callback: function () {
        console.log('once :', thisSection.label)
        callback.call(this);
        thisSection.called = true;
      },
      called: false
    });
    thisSection = this._sections[this._sections.length - 1];
    return this;
  }

  // sound analyser

  getSpectrum() {

    this.analyserNode.getByteFrequencyData(this.frequencyDataArray);

    return this.frequencyDataArray;
  }

  getWaveform() {

    this.analyserNode.getByteTimeDomainData(this.timeDomainDataArray);

    return this.timeDomainDataArray;
  }

  getFrequency(freq, endFreq = null) {

    let sum = 0;
    let spectrum = this.getSpectrum();
    if (endFreq !== undefined) {
      for (var i = freq; i <= endFreq; i++) {
        sum += spectrum[i];
      }
      return sum / (endFreq - freq + 1);
    } else {
      return spectrum[freq];
    }
  }

  /**
   * Kicks are detected when the amplitude (normalized values between 0 and 1) of a specified frequency, or the max amplitude over a range, is greater than the minimum threshold, as well as greater than the previously registered kick's amplitude, which is decreased by the decay rate per frame.
   * frequency : the frequency (element of the spectrum) to check for a spike. Can be a single frequency (number) or a range (2 element array) that uses the frequency with highest amplitude.
   * threshold : the minimum amplitude of the frequency range in order for a kick to occur.
   * decay     : the rate that the previously registered kick's amplitude is reduced by on every frame.
   * onKick    : the callback to be called when a kick is detected.
   * offKick   : the callback to be called when there is no kick on the current frame.
   */

  createKick({
    frequency,
    threshold,
    decay,
    onKick,
    offKick
  }) {
    let kick = new Kick({
      frequency,
      threshold,
      decay,
      onKick,
      offKick
    });
    this._kicks.push(kick);
    return kick;
  }

  /**
   * Beat are detected when the time correspond to duration of one beat (in second) multiplied by the factor
   * factor : the factor to multiply the duration of one beat
   * onBeat : the callback to be called when a beat is detected.
   */

  createBeat({
    factor,
    onBeat
  }) {

    let beat = new Beat({
      factor,
      onBeat
    });
    this._beats.push(beat);
    return beat;
  }

  get beatDuration() {

    return this._beatDuration;
  }

  //

  onUpdate() {

    this.req = requestAnimationFrame(this._onUpdate);

    for (let i in this._sections) {
      if (this._sections[i].condition())
        this._sections[i].callback.call(this);
    }

    let spectrum = this.getSpectrum();
    for (let i in this._kicks) {
      this._kicks[i].calc(spectrum);
    }

    let time = Math.max(0, this.time - this._offsetTime);
    for (let i in this._beats) {
      this._beats[i].calc(time, this._beatDuration);
    }

    if (this.debug) this.debug.draw();
  }

  onEnded() {

    this.stop();
  }
};

class Kick {

  constructor({
    frequency,
    threshold,
    decay,
    onKick,
    offKick
  }) {

    this.frequency = frequency !== undefined ? frequency : [0, 10];
    this.threshold = threshold !== undefined ? threshold : 0.3;
    this.decay = decay !== undefined ? decay : 0.02;
    this.onKick = onKick;
    this.offKick = offKick;
    this.isOn = false;
    this.isKick = false;
    this.currentThreshold = this.threshold;
  }

  on() {

    this.isOn = true;
  }

  off() {

    this.isOn = false;
  }

  set({
    frequency,
    threshold,
    decay,
    onKick,
    offKick
  }) {

    this.frequency = frequency !== undefined ? frequency : this.frequency;
    this.threshold = threshold !== undefined ? threshold : this.threshold;
    this.decay = decay !== undefined ? decay : this.decay;
    this.onKick = onKick || this.onKick;
    this.offKick = offKick || this.offKick;
  }

  calc(spectrum) {

    if (!this.isOn) {
      return;
    }
    let magnitude = this.maxAmplitude(spectrum, this.frequency);
    if (magnitude >= this.currentThreshold && magnitude >= this.threshold) {
      this.currentThreshold = magnitude;
      this.onKick && this.onKick(magnitude);
      this.isKick = true;
    } else {
      this.offKick && this.offKick(magnitude);
      this.currentThreshold -= this.decay;
      this.isKick = false;
    }
  }

  maxAmplitude(fft, frequency) {

    let max = 0;

    // Sloppy array check
    if (!frequency.length) {
      return frequency < fft.length ? fft[~~frequency] : null;
    }

    for (var i = frequency[0], l = frequency[1]; i <= l; i++) {
      if (fft[i] > max) {
        max = fft[i];
      }
    }

    return max;
  }
};

class Beat {

  constructor({
    factor,
    onBeat
  }) {

    this.factor = factor !== undefined ? factor : 1;
    this.onBeat = onBeat;
    this.isOn = false;
    this.currentTime = 0;
  }

  on() {

    this.isOn = true;
  }

  off() {

    this.isOn = false;
  }

  set({
    factor,
    onBeat
  }) {

    this.factor = factor !== undefined ? factor : this.factor;
    this.onBeat = onBeat || this.onBeat;
  }

  calc(time, beatDuration) {
    if (time == 0) {
      return;
    }
    let beatDurationFactored = beatDuration * this.factor;
    if (time >= this.currentTime + beatDurationFactored) {
      if (this.isOn) this.onBeat && this.onBeat();
      this.currentTime += beatDurationFactored;
    }
  }
}

class Debug {

  constructor(sound) {

    this.sound = sound;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 300;
    this.canvas.style.position = 'absolute';
    this.canvas.style.bottom = 0;
    this.canvas.style.left = 0;
    this.canvas.style.zIndex = 3;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', this.resize.bind(this), false);
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
  }

  draw() {

    let borderHeight = 10;

    // draw background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
    this.ctx.strokeStyle = '#a1a1a1';
    this.ctx.stroke();

    // draw spectrum
    this.ctx.beginPath();
    let spectrum = this.sound.getSpectrum();
    let spectrumValue = null;
    let spectrumLength = spectrum.length;
    let spectrumWidth = this.canvas.width / spectrumLength;
    let spectrumHeight = this.canvas.height - borderHeight;
    for (let i = 0; i < spectrumLength; i++) {

      spectrumValue = spectrum[i] / 256;
      this.ctx.rect(i * spectrumWidth, spectrumHeight - spectrumHeight * spectrumValue, spectrumWidth / 2, spectrumHeight * spectrumValue);
    }
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    // draw frequency
    this.ctx.beginPath();
    this.ctx.font = "10px Arial";
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = "left";
    for (let i = 0, len = spectrumLength; i < len; i++) {

      if (i % 10 == 0) {
        this.ctx.rect(i * spectrumWidth, spectrumHeight, spectrumWidth / 2, borderHeight);
        this.ctx.fillText(i, i * spectrumWidth + 4, spectrumHeight + borderHeight * .5);
      }
    }
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    // draw kick
    let kicks = this.sound._kicks;
    let kick = null;
    let kickLength = kicks.length;
    let kickFrequencyStart = null;
    let kickFrequencyLength = null;
    for (let i = 0, len = kickLength; i < len; i++) {

      kick = kicks[i];
      if (kick.isOn) {
        kickFrequencyStart = (kick.frequency.length ? kick.frequency[0] : kick.frequency);
        kickFrequencyLength = (kick.frequency.length ? kick.frequency[1] - kick.frequency[0] + 1 : 1);
        this.ctx.beginPath();
        this.ctx.rect(kickFrequencyStart * spectrumWidth, spectrumHeight - spectrumHeight * (kick.threshold / 256), kickFrequencyLength * spectrumWidth - (spectrumWidth * .5), 2);
        this.ctx.rect(kickFrequencyStart * spectrumWidth, spectrumHeight - spectrumHeight * (kick.currentThreshold / 256), kickFrequencyLength * spectrumWidth - (spectrumWidth * .5), 5);
        this.ctx.fillStyle = kick.isKick ? '#00ff00' : '#ff0000';
        this.ctx.fill();
      }
    }

    // draw waveform
    this.ctx.beginPath();
    let waveform = this.sound.getWaveform();
    let waveformValue = null;
    let waveformLength = waveform.length;
    let waveformWidth = this.canvas.width / waveformLength;
    let waveformHeight = this.canvas.height - borderHeight;
    for (let i = 0; i < waveformLength; i++) {

      waveformValue = waveform[i] / 256;
      if (i == 0) this.ctx.moveTo(i * waveformWidth, waveformHeight * waveformValue);
      else this.ctx.lineTo(i * waveformWidth, waveformHeight * waveformValue);
    }
    this.ctx.strokeStyle = '#0000ff';
    this.ctx.stroke();

    // draw time
    this.ctx.beginPath();
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = 'top';
    this.ctx.font = "15px Arial";
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText((Math.round(this.sound.time * 10) / 10) + ' / ' + (Math.round(this.sound.duration * 10) / 10), this.canvas.width - 5, 5);

    // draw section
    this.ctx.beginPath();
    let sections = this.sound._sections;
    let section = null;
    let sectionLength = sections.length;
    let sectionLabels = '';
    for (let i = 0, len = sectionLength; i < len; i++) {

      section = sections[i];
      if (section.condition()) {
        sectionLabels += section.label + ' - ';
      }
    }
    if (sectionLabels.length > 0) sectionLabels = sectionLabels.substr(0, sectionLabels.length - 3);
    this.ctx.fillText(sectionLabels, this.canvas.width - 5, 25);
    this.ctx.fill();
  }
}

new App()
