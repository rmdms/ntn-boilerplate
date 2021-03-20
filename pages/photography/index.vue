<template>
  <main class="section__works">
    <a class="link__back" href="/">Rémy Dumas</a>
    <div class="works__slider">
      <div class="slider__wrapper">
          <div class="slide">
            <p class="tt__subtitle tt__up fs__sm">July 2016</p>
            <a class="tt__title tt__up fs__xl" href="/sweden">Sweden</a>
            <a class="tt__subtitle tt__up fs__sm" href="/sweden">Discover</a>
          </div>

          <div class="slide">
            <p class="tt__subtitle tt__up fs__sm">July 2017</p>
            <a class="tt__title tt__up fs__xl" href="/north_thailand">North&nbsp;Thailand</a>
            <a class="tt__subtitle tt__up fs__sm" href="/north_thailand">Discover</a>
          </div>

          <div class="slide">
            <p class="tt__subtitle tt__up fs__sm">August 2018</p>
            <a class="tt__title tt__up fs__xl" href="/croatia">Croatia</a>
            <a class="tt__subtitle tt__up fs__sm" href="/croatia">Discover</a>
          </div>

          <div class="slide">
            <p class="tt__subtitle tt__up fs__sm">July 2018</p>
            <a class="tt__title tt__up fs__xl" href="/netherlands">Netherlands</a>
            <a class="tt__subtitle tt__up fs__sm" href="/netherlands">Discover</a>
          </div>

          <div class="slide">
            <p class="tt__subtitle tt__up fs__sm">July 2016</p>
            <a class="tt__title tt__up fs__xl" href="/south_thailand">South&nbsp;Thailand</a>
            <a class="tt__subtitle tt__up fs__sm" href="/south_thailand">Discover</a>
          </div>
      </div>
      <div class="slider__scrollbar">
          <div class="scrollbar__current"></div>
      </div>
    </div>
  </main>
</template>

<script>
import TweenMax from 'gsap'
import * as THREE from 'three'
import {mapMutations, mapState} from 'vuex'

import mixins from '~/plugins/mixins.js'
import { Promise } from 'q';

export default {
  data () {
    return {
      isMobile: false,
      renderer: null,
      camera: null,
      tl: null,
      sourcesSlide: [
        ["/images/netherland_slide_01.jpg",
        "/images/netherland_slide_02.jpg",
        "/images/netherland_slide_03.jpg"],
        ["/images/south_thailand_slide_01.jpg",
        "/images/south_thailand_slide_02.jpg",
        "/images/south_thailand_slide_03.jpg"],
        ["/images/sweden_slide_01.jpg", //
        "/images/sweden_slide_02.jpg",
        "/images/sweden_slide_03.jpg"], //
        ["/images/north_thailand_slide_01.jpg",
        "/images/north_thailand_slide_02.jpg",
        "/images/north_thailand_slide_03.jpg"],
        ["/images/croatia_slide_01.jpg",
        "/images/croatia_slide_02.jpg",
        "/images/croatia_slide_03.jpg"]
      ],
      slides: null,
      indexCurrentSlide: 0,
      indexNextSlide: 1,
      indexNextNextSlide: 2,
      indexPreviousSlide: null,
      indexPreviousPreviousSlide: null,
      nextSlide: false,
      previousSlide: false,
      dragSlide: false,
      oldPosition: null,
      spaceBetweenPlanes: 7.5,
      positionPlanes: [
        [{x:-1.0,y:0},{x:1.0,y:0},{x:0,y:0}],
        [{x:-1.0,y:0},{x:1.0,y:0},{x:0,y:0}],
        [{x:-1.0,y:0},{x:1.0,y:0},{x:0,y:0}],
        [{x:-1.0,y:0},{x:1.0,y:0},{x:0,y:0}],
        [{x:-1.0,y:0},{x:1.0,y:0},{x:0,y:0}]
      ]
    }
  },
  computed: {
    ...mapState({
      tl: state => state.tl,
      scene: state => state.scene
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme"
    }),
    addGL() {
      this.$data.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
      this.$data.renderer.setSize( window.innerWidth, window.innerHeight )
      this.$data.renderer.setPixelRatio(window.devicePixelRatio)
      document.querySelector('main').appendChild( this.$data.renderer.domElement )

      this.$data.scene = new THREE.Scene()

      this.$data.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 )
      this.$data.camera.position.z = 5
      this.$data.scene.camera = this.$data.camera
    },
    renderGL(time) {
      requestAnimationFrame( this.renderGL )
      // this.$data.camera.rotation.x = Math.sin(time / 1000) / 100
      // this.$data.camera.rotation.y = Math.cos(time / 1000)
	    this.$data.renderer.render( this.$data.scene, this.$data.camera )
    },
    resizeGL() {
      this.$data.camera.aspect = window.innerWidth / window.innerHeight
      this.$data.camera.updateProjectionMatrix()
    
      this.$data.renderer.setSize(window.innerWidth, window.innerHeight)

      this.resizeScene()
    },
    resizeScene() {
      let width = window.innerWidth
      let height = window.innerHeight

      let in_min = 400
      let in_max = 1200
      let out_min = 0.45
      let out_max = 1

      let scale = (width - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

      scale = Math.min(scale, 1)
      scale = Math.max(scale, 0.45)

      this.$data.scene.scale.set(scale, scale, 1)


      // let rest = (1200 / window.innerHeight) - 1
      // let ratio = (window.innerWidth / window.innerHeight) - rest
      // let ratioSmall = 400 / window.innerHeight

      // // console.log(ratio)
      // // let test = 0.45 + (1 - 0.45) * (ratio - 0) / (1 - 0)
      // // let test = 0.45 + (1 - 0.45) * (ratio - 0) / (1 - 0)
      // // console.log(ratio)

      // if (window.innerWidth < 1200) {``
      //     this.$data.scene.scale.set(window.innerWidth / window.innerHeight, window.innerWidth / window.innerHeight, 1)
      //   // if (window.innerWidth > 400) {
      //   //   this.$data.scene.scale.set(ratio, ratio, 1)
      //   // } else {
      //   //   this.$data.scene.scale.set(0.45, 0.45, 1)
      //   // }
      //   // if (window.innerWidth > 400) {
      //   //   this.$data.scene.scale.set(ratio, ratio, 1)
      //   // } else {
      //   //   this.$data.scene.scale.set(0.29390154298310067, 0.29390154298310067, 1)
      //   // }
      // } else {
      //   this.$data.scene.scale.set(1, 1, 1)
      // }
    },
    addPlaneSlide(texture, i, j, group) {
      let width = (texture.image.width > texture.image.height) ? 1.15 : 0.8
      let height = (texture.image.width > texture.image.height) ? 0.8 : 1.05
      let spacingWidth = .5
      let spacingHeight = 0.75
      let randomX = Math.random() * (spacingWidth - -spacingWidth) + -spacingWidth
      let randomY = Math.random() * (spacingHeight - -spacingHeight) + -spacingHeight
      let position = this.$data.positionPlanes[i][j]
      let geometry = new THREE.PlaneBufferGeometry( width, height, 18, 14 )

      geometry.translate(position.x + ((i - Math.floor(this.$data.slides.length / 2)) * this.$data.spaceBetweenPlanes), randomY, j/2)
      // geometry.translate(position.x + ((i - Math.floor(this.$data.slides.length / 2)) * this.$data.spaceBetweenPlanes), 0, 0)

      let material = new THREE.ShaderMaterial({
        uniforms: {
          u_texture: {
            type: 't',
            value: texture
          },
          u_textureFactor: {
            type: 'v2',
            value: new THREE.Vector2(1, 1)
          },
          u_maxDistance: {
            type: 'f',
            value: 3 * Math.tan(((this.$data.scene.camera.fov * Math.PI) / 180) / 2) * this.$data.scene.camera.position.z
          },
          u_magnitude: {
            type: 'f',
            value: 1.6
          },
          u_progress: {
            type: 'f',
            value: -1.0
          },
          u_blackAndWhite: {
            type: 'f',
            value: 1.0
          },
          u_opacityColor: {
            type: 'f',
            value: 0.1
          },
          u_opacity: {
            type: 'f',
            value: 1.
          }
        },
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_texture;
          uniform vec2 u_textureFactor;
          uniform float u_blackAndWhite;
          uniform float u_opacityColor;
          uniform float u_opacity;
          varying vec2 vUv;
          void main(){
            vec2 textureUV = vec2(vUv.x, 1.-vUv.y) * u_textureFactor - u_textureFactor / 2. + 0.5;
            vec4 textureColor = texture2D(u_texture, textureUV );
            // float alpha = u_opacityColor;

            // if (u_opacity != 1.) {
            //   alpha = u_opacity;
            // }

            vec4 blackAndWhiteTexture = vec4(
              vec3( textureColor.x + textureColor.y+textureColor.z ) / 3.,
              1.
            );

            vec4 bwColored = mix(blackAndWhiteTexture, vec4(u_opacityColor), 0.9);

            vec4 color = mix(textureColor, bwColored, u_blackAndWhite);

            gl_FragColor = color;
          }
          `,
        vertexShader: `
          uniform float u_scroll;
          varying vec2 vUv;
          uniform float u_maxDistance;
          uniform float u_magnitude;
          uniform float u_progress;
          float q(float t)
          {float p=2.0*t*t;
              return t<0.5?p:-p+(4.0*t)-1.0;
          }
          void main() { 
            float distance = length(position.xy);
            float zChange = 0.;
            
            if(distance<u_maxDistance){
                float normalizedDistance = distance / u_maxDistance;
                zChange = q(normalizedDistance);
                // zChange = normalizedDistance * u_magnitude * -0.25; 
                  zChange = 1.-(zChange);
                  zChange *= u_magnitude; 
                  zChange *= u_progress;
            }
            vec3 pos = position.xyz;
            pos.z += zChange;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
            vUv = uv;
          }
          `,
        side: THREE.DoubleSide
      })

      let mesh = new THREE.Mesh(geometry, material)
      mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI)
      group.add(mesh)
      this.$data.scene.add(group)
    },
    controlScrollSlide(e) {
      let direction = (e.deltaY > 0) ? 1 : -1

      if (direction > 0) {
        if (!this.$data.nextSlide) {
          window.removeEventListener('wheel', this.controlScrollSlide)
          this.validNextSlide()
        }
      } else {
        if (!this.$data.previousSlide) {
          window.removeEventListener('wheel', this.controlScrollSlide)
          this.validPreviousSlide()
        }
      }
    },
    controlDragSlide(e) {
      let clientX = e.clientX || e.changedTouches[0].clientX || e.touches[0].clientX
      let distance = this.$data.oldPosition - clientX
      
      if (this.$data.dragSlide) {
        if (distance > 50) {
          if (!this.$data.nextSlide) {
            window.removeEventListener('wheel', this.controlScrollSlide)
            window.removeEventListener('mousemove', this.controlDragSlide)
            window.removeEventListener('touchmove', this.controlDragSlide)
            this.validNextSlide()
          }
        } else if (distance < -50) {
          if (!this.$data.previousSlide) {
            window.removeEventListener('wheel', this.controlScrollSlide)
            window.removeEventListener('mousemove', this.controlDragSlide)
            window.removeEventListener('touchmove', this.controlDragSlide)
            this.validPreviousSlide()
          }
        }
      }
    },
    revertDragSlide(e) {
      this.$data.dragSlide = !this.$data.dragSlide
      this.$data.oldPosition = e.clientX || e.changedTouches[0].clientX || e.touches[0].clientX
      if (!this.$data.isMobile) {
        e.returnValue=false
      }
    },
    validNextSlide() {
      this.$data.nextSlide = true
    },
    validPreviousSlide() {
      this.$data.previousSlide = true
    },
    animateTextSlide(index, direction) {
      let currentSlide = this.$data.slides[this.$data.indexCurrentSlide]
      let currentTitleSlide = currentSlide.querySelectorAll('.tt__title span')
      let currentSubtitleSlide = currentSlide.querySelector('p')
      let currentLinkSlide = currentSlide.querySelector('a.tt__subtitle')
      let otherSlide = this.$data.slides[index]
      let otherTitleSlide = otherSlide.querySelectorAll('.tt__title span')
      let otherSubtitleSlide = otherSlide.querySelector('p')
      let otherLinkSlide = otherSlide.querySelector('a.tt__subtitle')

      if (direction > 0) {
        currentTitleSlide = [].slice.call(currentTitleSlide, 0).reverse()
        otherTitleSlide = [].slice.call(otherTitleSlide, 0).reverse()
      }

      this.changeIndexSlides(direction * 1)
      this.changeOrderSlides(direction)

      this.tl.to(otherSlide, 0, { autoAlpha: 1, zIndex: 2 })
      this.tl.to(otherTitleSlide, 0, { opacity: 0 })
      this.tl.to(otherSubtitleSlide, 0, { opacity: 0 })
      this.tl.to(otherLinkSlide, 0, { opacity: 0 })

      this.animateDisappearBlackAndWhite()
      this.animateDisappearSubtitle(currentSubtitleSlide, currentLinkSlide)
      this.animateMovePlanes(direction)
      this.animateMoveScrollbar()
      this.animateMoveTitle(direction, otherTitleSlide, currentTitleSlide)
      this.animateAppearBlackAndWhite()
      this.animateAppearSubtitle(otherSubtitleSlide, otherLinkSlide)

      this.tl.staggerTo(currentTitleSlide, 0, { y: '0%' })
      this.tl.to(currentSlide, 0,{autoAlpha: 0, zIndex: 1, onComplete: ()=>{
        ;(direction > 0) ? (this.$data.nextSlide = false) : (this.$data.previousSlide = false)
        setTimeout(() => {
          window.addEventListener('wheel', this.controlScrollSlide)
          window.addEventListener('mousemove', this.controlDragSlide)
          window.addEventListener('touchmove', this.controlDragSlide)
        }, 200)
      }})
    },
    animateDisappearBlackAndWhite() {
      this.tl.add('disappear')
      for (let i = 0; i < this.$data.scene.children.length; i++) {
        this.$data.scene.children[i].children.forEach(plane => {
          this.tl.to(plane.material.uniforms.u_blackAndWhite, 0.75, { value: 1.0 }, 'disappear')
        })
      }
    },
    animateDisappearSubtitle(currentSubtitleSlide, currentLinkSlide) {
      this.tl.to(currentSubtitleSlide, 0.5, { opacity: 0 }, 'disappear')
      this.tl.to(currentLinkSlide, 0.5, { opacity: 0 }, 'disappear')
    },
    animateMovePlanes(direction) {
      this.tl.add('moveHorizontal', '-=0.25')
      for (let i = 0; i < this.$data.scene.children.length; i++) {
        if (i === 0) {
          this.$data.scene.children[i].children.forEach(plane => {
            this.animateMovePlane(plane, false, direction)
          })
        } else {
          this.$data.scene.children[i].children.forEach(plane => {
            this.animateMovePlane(plane, true, direction)
          })
        }
      }
    },
    animateMovePlane(plane, delay, direction) {
      let translate = { move: 0, to: direction * -this.$data.spaceBetweenPlanes, time: 0.9, i: 0, old: 0 }
      this.tl.to(translate, translate.time, { move: translate.to, ease: Power2.easeInOut, onUpdate: ()=>{
        plane.geometry.translate(translate.move - translate.old,0,0)
        translate.old = translate.move
        translate.i++
      }}, 'moveHorizontal')
    },
    animateMoveScrollbar() {
      let scrollbar = document.querySelector('.scrollbar__current')
      let percent = this.$data.indexCurrentSlide * (100 / (document.querySelectorAll('.slide').length - 1))
      this.tl.to(scrollbar, 1.0, { width: `${percent}%` }, 'moveHorizontal')
    },
    animateMoveTitle(direction, otherTitleSlide, currentTitleSlide) {
      // this.tl.add('moveTitle01', '-=0.85')
      // this.tl.staggerFrom(otherTitleSlide, 0.5, { y: `${direction * 100}%` }, 0.025, 'moveTitle01')
      // this.tl.add('moveTitle02', '-=1.05')
      // this.tl.staggerTo(currentTitleSlide, 0.5, { y: `${direction * -100}%` }, 0.025, 'moveTitle02')

      this.tl.add('moveTitle01', '-=0.85')
      this.tl.add('moveTitle02', '-=0.55')
      this.tl.staggerTo(otherTitleSlide, 0.5, { opacity: 1 }, 0.025, 'moveTitle02')
      this.tl.staggerTo(currentTitleSlide, 0.5, { opacity: 0 }, 0.025, 'moveTitle01')
    },
    animateAppearSubtitle(otherSubtitleSlide, otherLinkSlide) {
      this.tl.to(otherSubtitleSlide, 0.5, { opacity: 1 }, 'appear')
      this.tl.to(otherLinkSlide, 0.25, { clearProps: 'opacity' }, 'appear')
    },
    animateAppearBlackAndWhite() {
      this.tl.add('appear', '-=0.25')
      for (let i = 0; i < this.$data.scene.children.length; i++) {
        this.$data.scene.children[i].children.forEach(plane => {
          if (i === Math.round((this.$data.scene.children.length - 1) / 2)) {
            this.tl.to(plane.material.uniforms.u_blackAndWhite, 0.75, { value: 0.0 }, 'appear')
          }
        })
      }
    },
    animateParallaxPlanes(e) {
      let dx = e.clientX - (window.innerWidth / 2);
      let dy = e.clientY - (window.innerHeight / 2);

      dx /= 25000
      dy /= 25000
      
      this.$data.scene.children[2].children.forEach((plane, j) => {
        TweenMax.to(plane.position, 0.1, {x: dx / (j+1), y: -dy / (j+1) })
        // plane.geometry.translate(dx,dy,0)
      })
    },
    changeIndexSlides(direction) {
      this.$data.indexCurrentSlide += direction * 1
      this.$data.indexCurrentSlide = this.controlLimitsSlides(this.$data.indexCurrentSlide)

      this.$data.indexNextSlide += direction * 1
      this.$data.indexNextSlide = this.controlLimitsSlides(this.$data.indexNextSlide)

      this.$data.indexNextNextSlide += direction * 1
      this.$data.indexNextNextSlide = this.controlLimitsSlides(this.$data.indexNextNextSlide)

      this.$data.indexPreviousSlide += direction * 1
      this.$data.indexPreviousSlide = this.controlLimitsSlides(this.$data.indexPreviousSlide)

      this.$data.indexPreviousPreviousSlide += direction * 1
      this.$data.indexPreviousPreviousSlide = this.controlLimitsSlides(this.$data.indexPreviousPreviousSlide)

    },
    changeOrderSlides(direction) {
        if (direction > 0) {  
          let firstplane = this.$data.scene.children.shift()
          this.$data.scene.children.push(firstplane)
          this.$data.scene.children[this.$data.scene.children.length -1].children.forEach(plane => {
            plane.geometry.translate(this.$data.scene.children.length * (direction * this.$data.spaceBetweenPlanes), 0, 0)
          })
        } else {
          let laststplane = this.$data.scene.children.pop()
          this.$data.scene.children.unshift(laststplane)
          this.$data.scene.children[0].children.forEach(plane => {
            plane.geometry.translate(this.$data.scene.children.length * (direction * this.$data.spaceBetweenPlanes), 0, 0)
          })
        }
    },
    controlLimitsSlides(index) {
      let numberSlides = document.querySelectorAll('.slide').length - 1
      if (index < 0) {
        return numberSlides
      } else if (index > numberSlides) {
        return 0
      } else {
        return index
      }
    },
    splitText: function(el) {
      el.innerHTML = el.textContent.replace(/./g, '<span>$&</span>')
    }
  },
  mounted() {
    this.$data.tl = new TimelineMax()
    this.setTheme('dark')
    this.$data.slides = document.querySelectorAll('.slide')
    this.$data.indexPreviousSlide = document.querySelectorAll('.slide').length - 1
    this.$data.indexPreviousPreviousSlide = document.querySelectorAll('.slide').length - 2

    for (let text of document.querySelectorAll('.tt__title')) {
        this.splitText(text)
    }

    this.addGL()
    this.renderGL()
    this.resizeScene()
    
    let loader = new THREE.TextureLoader()
    let textures = []
    new Promise(
      (resolve, reject) => {
        for (let i = 0; i < this.$data.sourcesSlide.length; i++) {
          textures.push([])
          this.$data.sourcesSlide[i].map((source, j) => {
            loader.load(source, (texture) => {
              textures[i].push(texture)
              if (i === this.$data.sourcesSlide.length - 1) {
                if (j === this.$data.sourcesSlide[i].length - 1) {
                  resolve()
                }
              }
            })
          })
        }
      }
    ).then(
      () => {
        setTimeout(()=>{
          for (let i = 0; i < textures.length; i++) {
            let group = new THREE.Object3D()
            textures[i].map((source, j) => {
              this.addPlaneSlide(source, i, j, group)
            })
          }
          this.animateAppearBlackAndWhite()
          this.tl.to(document.querySelector('main'), 0.75, {opacity: 1})


          if( navigator.userAgent.match(/Android/i)
          || navigator.userAgent.match(/webOS/i)
          || navigator.userAgent.match(/iPhone/i)
          || navigator.userAgent.match(/iPad/i)
          || navigator.userAgent.match(/iPod/i)
          || navigator.userAgent.match(/BlackBerry/i)
          || navigator.userAgent.match(/Windows Phone/i)
          ){
            this.$data.isMobile = true
            window.addEventListener('touchstart', this.revertDragSlide)
            window.addEventListener('touchend', this.revertDragSlide)
            window.addEventListener('touchmove', this.controlDragSlide)
          } else {
            window.addEventListener('wheel', this.controlScrollSlide)
            window.addEventListener('mousedown', this.revertDragSlide)
            window.addEventListener('mouseup', this.revertDragSlide)
            window.addEventListener('mousemove', this.controlDragSlide)
            window.addEventListener('mousemove', this.animateParallaxPlanes)
          }
        }, 250)
      })

    for (let link of document.querySelectorAll('a')) {
      link.addEventListener('mouseover', this.mouseOn)
      link.addEventListener('mouseout', this.mouseOut)
    }

    window.addEventListener('resize', this.resizeGL)
  },
  beforeDestroy() {
    this.tl.to(document.querySelector('main'), 0.75, {opacity: 0})
    window.removeEventListener('wheel', this.controlScrollSlide)
    window.removeEventListener('mousedown', this.revertDragSlide)
    window.removeEventListener('mouseup', this.revertDragSlide)
    window.removeEventListener('mousemove', this.controlDragSlide)
    window.removeEventListener('resize', this.resizeGL)
  },
  watch : {
    nextSlide: function () {
      if (this.$data.nextSlide) {
        this.animateTextSlide(this.$data.indexNextSlide, 1)
      }
    },
    previousSlide: function () {
      if (this.$data.previousSlide) {
        this.animateTextSlide(this.$data.indexPreviousSlide, -1)
      }
    }
  },
  mixins: [mixins]
}
</script>

<style scoped lang="scss">
  #portfolio {
    .tt__title {
      font-family: 'Rama Gothic C', sans-serif;
      line-height: 0.8;
      font-weight: 900;
      text-transform: uppercase;
    }
    .tt__subtitle {
      font-family: 'Yantramanav', sans-serif;
      letter-spacing: 1px;
      font-weight: 400;
    }
    p.tt__subtitle {
        color: #dfd5ad;
      }
    .fs {
      &__sm { 
        font-size: 12px; 
      }
      &__md {
        font-size: 16px;
      }
      &__lg {
        font-size: 5.95vw;
      }
      &__xl {
        font-size: 300px;
      }
    }
    @media (max-width: 1200px) {
      .fs__xl {
        font-size: 25vw;
      }
    }
    @media (max-width: 900px) {
      canvas {
        display: none;
      }
    }
    @media (max-width: 800px) {
      .fs__lg {
        font-size: 47.6px;
      }
    }
    @media (max-width: 400px) {
      body {
        font-size: 14px;
      }
      .fs__xl {
        font-size: 100px;
      }
    }
  }
  .section__works {
    position: relative;
    height: 100%;
    min-height: 100vh;
    width: 100vw;
    opacity: 0;
    z-index: 2;
    .link__back {
      position: absolute;
      top: 0; left: 0;
      margin: 5vh 0 0 7.5vw;
      overflow: hidden;
      z-index: 2;
    }
    .works__slider {
      .slider {
        &__wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          .slide {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            overflow: hidden;
            &:first-child {
              z-index: 2;
            }
            &:not(:first-child) {
              opacity: 0.0;
              visibility: hidden;
            }
            a.tt__title {
              overflow: hidden;
              display: inherit;
            }
            p { 
              margin-right: 10%;
              margin-bottom: 1.5%;
            }
            a.tt__subtitle {
              opacity: 0.0;
              transition: opacity 0.25s;
            }
            &:hover {
              a.tt__subtitle  {
                opacity: 1.0;
                transition: opacity 0.25s;
              }
            }
          }
        }
        &__scrollbar {
            position: fixed;
            bottom: 80px;
            left: 50%;
            height: 2px;
            width: 20%;
            min-width: 250px;
            margin: 0 auto;
            background: #4f4f4f;
            border-radius: 50px;
            transform: translate(-50%, -50%);
            z-index: 1;
            .scrollbar__current {
                height: 2px;
                width: 0;
                background: #fff;
                border-radius: 50px;
            }
        }
      }
    }
    .tt__title {
      line-height: 0.8;
    }
    @media (max-width: 400px) {
      .works__slider .slider__wrapper .slide p {
        margin-right: 5% ;
      }
    }
  }
</style>