import * as THREE from 'three'
import TweenMax from 'gsap'

// document.addEventListener("DOMContentLoaded", initialiser);

var renderer, container, camera, scene, light;

var audio, audioCtx, analyser, source, frequencyData, maxTotal;

var geometry, sphere;

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
  light.intensity = 1.75;
  light.position.set(0, 0, 200);
  scene.add(light);

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    // Recalculer projection
    camera.updateProjectionMatrix();
  });

  //   /* ---------------------- AUDIO ---------------------- */

  // Audio
  audio = new Audio();
  audio.src = '/audios/AllNight_By_BigBoi.mp3';

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
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  maxTotal = analyser.frequencyBinCount * 255;

  /* --------------------- SPHERE --------------------- */

  geometry = new THREE.SphereGeometry(5, 50, 50);
  var i = 0;

  // Adapter sphere en fonction des fréquences
  while (geometry.vertices.length < analyser.frequencyBinCount / 2) {
    i++;
    geometry = new THREE.SphereGeometry(100 * .5, i, i);
  }

  // Sphere
  sphere = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      shading: THREE.FlatShading
    })
  )

  for (let i = 0; i < geometry.vertices.length; i++) {
    geometry.vertices[i]._x = geometry.vertices[i].x;
    geometry.vertices[i]._y = geometry.vertices[i].y;
    geometry.vertices[i]._z = geometry.vertices[i].z;
  }

  scene.add(sphere);

  /* ------------------- ANIMATION ------------------- */

  loop();

}

function loop() {

  frame++;

  // Récupérer les fréquences
  analyser.getByteFrequencyData(frequencyData);

  var total = 0;

  for (let i = 0; i < geometry.vertices.length; i++) {
    total += frequencyData[i];

    var v = geometry.vertices[i];
    var f = (frequencyData[i] / 255);

    v.x = v._x * f;
    v.y = v._y * f;
    v.z = v._z * f;
  }

  // Mettre à jour les vertices
  geometry.verticesNeedUpdate = true;

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