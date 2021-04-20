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
    this.analyserNode.fftSize = Math.pow(2, 14);
    let bufferLength = this.analyserNode.frequencyBinCount;
    this.bufferLength = this.analyserNode.frequencyBinCount;
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

import * as THREE from 'three'
import TweenMax from 'gsap'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// document.addEventListener("DOMContentLoaded", initialiser);

var renderer, container, camera, scene, light, controls;

var audio, audioCtx, analyser, source, frequencyData, maxTotal;

var geometry, sphere, materialShader, _positions, displacement;

var frame = 0;
var colorFrame = 0;
var rotY = 0;

initialiser();

function initialiser() {
  /* ------------------ INIT THREEJS ------------------ */
  // Renderer
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container = document.querySelector('main');
  container.appendChild(renderer.domElement);

  // Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 100;

  // Scene
  scene = new THREE.Scene();

  // Light
  light = new THREE.DirectionalLight(0xffffff, 1);
  light.intensity = 1.5;
  light.position.set(0, 0, 200);
  scene.add(light);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    // Recalculer projection
    camera.updateProjectionMatrix();
  });

  //   /* ---------------------- AUDIO ---------------------- */

  // Audio
  // audio = new Sound('/audios/AllNight_By_BigBoi.mp3', 0, 0, ()=>{}, false);
  // console.log(audio)
  audio = new Audio('/audios/AllNight_By_BigBoi.mp3');

  // Loop
  audio.addEventListener('ended', function () {
    audio.currentTime = 0;
    audio.play();
  }, false);

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  document.querySelector('.button__play').addEventListener('click', () => {
    setTimeout(
      () => {
        audio.play();
      }, 750
    )
        
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
      }
    })
  });

  // Déterminer le domaine fréquentiel
  analyser.fftSize = Math.pow(2, 14);

  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Récupérer les fréquences
  // frequencyData = audio.frequencyDataArray;
  //  = audio.bufferLength * 255;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  maxTotal = analyser.frequencyBinCount * 255;

  /* --------------------- SPHERE --------------------- */

  geometry = new THREE.SphereBufferGeometry(50, 50, 50);
  var i = 0;

  // Adapter sphere en fonction des fréquences
  while (geometry.attributes.position.count < analyser.frequencyBinCount / 2) {
    i++;
    geometry = new THREE.SphereBufferGeometry(100 * .5, i, i);
  }

  displacement = new Float32Array( geometry.attributes.position.count );
  geometry.setAttribute( 'displacement', new THREE.BufferAttribute( displacement, 1 ) );


  var material = new THREE.MeshStandardMaterial({
    flatShading: THREE.FlatShading
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0}
    shader.vertexShader = `
        attribute float displacement;
        uniform float time;
         ` + shader.vertexShader
    const token = '#include <begin_vertex>'
    const customTransform = `
        vec3 transformed = vec3(position);
        transformed.x = position.x * displacement;
        transformed.y = position.y * displacement;
        transformed.z = position.z * displacement;
    `
   shader.vertexShader = shader.vertexShader.replace(token,customTransform)
   materialShader = shader
  }

  // Sphere
  sphere = new THREE.Mesh(
    geometry, material
  )

  scene.add(sphere);

  /* ------------------- ANIMATION ------------------- */

  loop();

}

function loop(time) {

  controls.update();

  frame++;

  // if(materialShader) 
  //  materialShader.uniforms.time.value = frequencyData[0] / 255;

  // Récupérer les fréquences
  analyser.getByteFrequencyData(frequencyData);
  // console.log(frequencyData)

  var total = 0;

  for ( let i = 0; i < displacement.length; i ++ ) {
    // if (i%4) {
      total += frequencyData[i];
    // }
    var f = (frequencyData[i] / 255);
    displacement[ i ] = Math.sin( f );
  }

  sphere.geometry.attributes.displacement.needsUpdate = true;
  sphere.geometry.attributes.position.needsUpdate = true;

  // Changer couleur
  if ((frame > colorFrame + 60) && (total / maxTotal > .1)) {
    sphere.material.color.setHex(Math.random() * 0xffffff);
    colorFrame = frame;
  }

  rotY += 0.005;

  sphere.rotation.x = 1.5;
  sphere.rotation.y = rotY;

  renderer.render(scene, camera);

  requestAnimationFrame(loop);

}

// import * as THREE from 'three'

// let renderer, scene, camera;

// let sphere, uniforms;

// let displacement, noise;

// init();
// animate();

// function init() {

//   camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
//   camera.position.z = 300;

//   scene = new THREE.Scene();
//   scene.background = new THREE.Color( 0x050505 );

//   uniforms = {

//     "amplitude": { value: 1.0 },
//     "color": { value: new THREE.Color( 0xff2200 ) },
//     // "colorTexture": { value: new THREE.TextureLoader().load( "textures/water.jpg" ) }

//   };

//   // uniforms[ "colorTexture" ].value.wrapS = uniforms[ "colorTexture" ].value.wrapT = THREE.RepeatWrapping;

//   const shaderMaterial = new THREE.ShaderMaterial( {

//     uniforms: uniforms,
//     vertexShader: `
//       uniform float amplitude;

// 			attribute float displacement;

// 			varying vec3 vNormal;
// 			varying vec2 vUv;

// 			void main() {

// 				vNormal = normal;
// 				vUv = ( 0.5 + amplitude ) * uv + vec2( amplitude );

// 				vec3 newPosition = position + amplitude * normal * vec3( displacement );
// 				gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

// 			}
//     `,
//     fragmentShader: `
//       varying vec3 vNormal;
// 			varying vec2 vUv;

// 			uniform vec3 color;
// 			// uniform sampler2D colorTexture;

// 			void main() {

// 				vec3 light = vec3( 0.5, 0.2, 1.0 );
// 				light = normalize( light );

// 				float dProd = dot( vNormal, light ) * 0.5 + 0.5;

// 				// vec4 tcolor = texture2D( colorTexture, vUv );
//         vec4 tcolor = vec4(1.0);
// 				vec4 gray = vec4( vec3( tcolor.r * 0.3 + tcolor.g * 0.59 + tcolor.b * 0.11 ), 1.0 );

// 				gl_FragColor = gray * vec4( vec3( dProd ) * vec3( color ), 1.0 );

// 			}
//     `

//   } );


//   const radius = 50, segments = 128, rings = 64;

//   const geometry = new THREE.SphereGeometry( radius, segments, rings );

//   displacement = new Float32Array( geometry.attributes.position.count );
//   geometry.setAttribute( 'displacement', new THREE.BufferAttribute( displacement, 1 ) );

//   sphere = new THREE.Mesh( geometry, shaderMaterial );
//   scene.add( sphere );

//   renderer = new THREE.WebGLRenderer();
//   renderer.setPixelRatio( window.devicePixelRatio );
//   renderer.setSize( window.innerWidth, window.innerHeight );

//   const container = document.getElementById( 'main' );
//   container.appendChild( renderer.domElement );

//   //

//   window.addEventListener( 'resize', onWindowResize );

// }

// function onWindowResize() {

//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();

//   renderer.setSize( window.innerWidth, window.innerHeight );

// }

// function animate() {

//   requestAnimationFrame( animate );

//   render();

// }

// function render() {

//   const time = Date.now() * 0.01;

//   sphere.rotation.y = sphere.rotation.z = 0.01 * time;

//   uniforms[ "amplitude" ].value = 2.5 * Math.sin( sphere.rotation.y * 0.125 );
//   uniforms[ "color" ].value.offsetHSL( 0.0005, 0, 0 );

//   for ( let i = 0; i < displacement.length; i ++ ) {

//     displacement[ i ] = Math.sin( 0.1 * i + time );

//     // noise[ i ] += 0.5 * ( 0.5 - Math.random() );
//     // noise[ i ] = THREE.MathUtils.clamp( noise[ i ], - 5, 5 );

//     // displacement[ i ] += noise[ i ];

//   }

//   sphere.geometry.attributes.displacement.needsUpdate = true;

//   renderer.render( scene, camera );

// }