<template>
  <main id="main" v-if="load">
    <div id="content__informations">
      <section class="section__introduction">
        <p>My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Focusing on details, animations and interactions, I'm studying at the Interactive Design & Development class of Gobelins, l'Ecole de l'image.</p>
      </section>
      <section class="section__projects">
        <h2 class="tt__subtitle fs__sm">Projects</h2>
        <ul>
          <a href="/flower"><li>Flower</li></a>
          <a href="/discomania"><li>Discomania</li></a>
          <a href="/illuminate"><li>Illuminate</li></a>
          <a href="/field"><li>Summer field</li></a>
          <a href="/attract"><li>Attract</li></a>
          <a href="/photography"><li>Photography</li></a>
        </ul>
      </section>
      <section class="section__agencies">
        <h2 class="tt__subtitle fs__sm">Experiences</h2>
        <p>I am glad to have collaborated and to have been formed with agencies such as Socialclub, Adveris or Innovia. This gave me the opportunity to work on projects for various clients like: Pom'Potes, Withings, WWF, Microqlima Records, Roche Musique, Louvre Museum, Grévin Museum and more.</p>
      </section>
      <section class="section__contact">
        <h2 class="tt__subtitle fs__sm">Contact</h2> 
        <p>Reach out by <a href="mailto:remy.benjamin.dumas@gmail.com">Email</a> or on <a href="https://twitter.com/remsdms">Twitter</a>, <a href="https://dribbble.com/remsdms">Dribbble</a>, <a href="https://www.linkedin.com/in/r%C3%A9my-dumas-58475812b/">Linkedin</a>.</p>
      </section>
    </div>
    <div id="content__visual">
      <!-- <p>
        <span>Flower</span>
        <span>Discomania</span>
        <span>Illuminate</span>
        <span>Attract</span>
        <span>Photography</span>
      </p> -->
      <img src="~static/images/profil.png" alt="">
    </div>
    <!-- <canvas id="gl__canvas"></canvas> -->
  </main>
</template>

<!--<script>
import mat4 from 'gl-matrix-mat4'
import TweenMax from 'gsap'
import * as THREE from 'three'
import SplitText from '../plugins/SplitText.js'
import { mapMutations, mapState } from 'vuex'

export default {
  data () {
    return {
      gl: null,
      program_info: null,
      buffers: null,
      time: {
        now: 0,
        last: 0,
        delta: 0
      },
      scroll: 0
    }
  },
  computed: {
    ...mapState({
      load: state => state.load
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme"
    }),
    // GLOBAL ---
    initialize() {
      this.initializeDOM()
      this.initializeGL()
      // this.initializeCube()
    },
    update(parameter_time) {
      const time = parameter_time

      if (time) {
        this.$data.time.now = time

        this.$data.time.now *= 0.001
        this.$data.time.delta = this.$data.time.now - this.$data.time.last
        this.$data.time.last = this.$data.time.now

        this.updateGL()
      }

      requestAnimationFrame(this.update)
    },
    listen() {
      this.listenUser()
    },
    // DOM ------
    initializeDOM() {
      this.setTheme('dark')
      this.splitTextAll()
      this.appearDOM()
    },
    appearDOM() {
      const timeline = new TimelineMax()
      const texts = document.querySelectorAll('h1, h2, p, ul')
      texts.forEach((text, i) => {
        const spans = text.querySelectorAll('span')
        switch(i) {
          case 0: case 1: case 2:
            timeline.staggerFrom(spans, (!i)?1.0:0.75, {
              y: (!i)?500:50,
              skewY: 50
            }, 0.00075, (!i)?null:'-=0.25')
            break;
          default: 
            break;
        }
      })
    },
    splitTextAll() {
      for (let text of document.querySelectorAll('h1, h2, p, li')) {
        this.splitText(text)
      }
    },
    splitText(parameter_element) {
      const element = parameter_element
      element.innerHTML = element.textContent.replace(/ /g, '&nbsp;')
      element.innerHTML = element.textContent.replace(/./g, '<span>$&</span>')
    },
    // GL -------
    initializeGL() {
      const canvas = document.getElementById('gl__canvas')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      this.$data.gl = canvas.getContext('webgl')

      if (!this.$data.gl) {
        return
      }

      const vertex_shader_source = `
        attribute vec4 a_vertex_position;
        attribute vec4 a_vertex_color;
        uniform mat4 u_model_view_matrix;
        uniform mat4 u_projection_matrix;
        varying lowp vec4 v_color;
        void main() {
          gl_Position = u_projection_matrix * u_model_view_matrix * a_vertex_position;
          v_color = a_vertex_color;
        }
      `
      const fragment_shader_source = `
        varying lowp vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `
      const shader_program = this.initializeShader(this.$data.gl, vertex_shader_source, fragment_shader_source)
      this.$data.program_info = {
        program: shader_program,
        attrib_locations: {
          vertex_position: this.$data.gl.getAttribLocation(shader_program, 'a_vertex_position'),
          vertex_color: this.$data.gl.getAttribLocation(shader_program, 'a_vertex_color')
        },
        uniform_locations: {
          projection_matrix: this.$data.gl.getUniformLocation(shader_program, 'u_projection_matrix'),
          model_view_matrix: this.$data.gl.getUniformLocation(shader_program, 'u_model_view_matrix')
        }
      }
      
      this.$data.buffers = this.initializeBuffers(this.$data.gl)
    },
    updateGL() {
      this.updateScene(this.$data.gl, this.$data.program_info, this.$data.buffers, this.$data.time.deltaTime)
    },
    // SCENE ----
    updateScene(parameter_gl, parameter_program_informations, parameter_buffers) {
      const gl = parameter_gl, program_informations = parameter_program_informations, buffers = parameter_buffers

      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clearDepth(1.0)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const projection_matrix = mat4.create()
      const fov = 45 * Math.PI / 180
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
      const near = 0.1
      const far = 100.0
      mat4.perspective(projection_matrix, fov, aspect, near, far)

      const model_view_matrix = mat4.create()
      mat4.translate(model_view_matrix, model_view_matrix, [-0.0, 0.0, -6.0])
      mat4.rotate(model_view_matrix, model_view_matrix, this.$data.rotation, [0, 0, 1])
      mat4.rotate(model_view_matrix, model_view_matrix, this.$data.rotation, [0, 1, 0])

      {
        const number_components = 3
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
        gl.vertexAttribPointer(
          program_informations.attrib_locations.vertex_position,
          number_components,
          type,
          normalize,
          stride,
          offset
        )
        gl.enableVertexAttribArray(program_informations.attrib_locations.vertex_position)
      }

      {
        const number_components = 4
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
        gl.vertexAttribPointer(
          program_informations.attrib_locations.vertex_color,
          number_components,
          type,
          normalize,
          stride,
          offset
        )
        gl.enableVertexAttribArray(program_informations.attrib_locations.vertex_color)
      }

      gl.useProgram(program_informations.program)

      gl.uniformMatrix4fv(program_informations.uniform_locations.projection_matrix, false, projection_matrix)
      gl.uniformMatrix4fv(program_informations.uniform_locations.model_view_matrix, false, model_view_matrix)

      {
        const vertex_count = 36
        const type = gl.UNSIGNED_SHORT
        const offset = 0
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
        gl.drawElements(gl.TRIANGLES, vertex_count, type, offset)
      }
      
      this.$data.rotation += this.$data.time.delta
    },
    // BUFFERS ---
    initializeBuffers(parameter_gl) {
      const gl = parameter_gl

      const position_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer)
      const positions = [
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
      ]
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

      const color_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer)
      const face_colors = [
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  0.0,  0.0,  1.0],    
        [0.0,  1.0,  0.0,  1.0],    
        [0.0,  0.0,  1.0,  1.0],    
        [1.0,  1.0,  0.0,  1.0],    
        [1.0,  0.0,  1.0,  1.0]    
      ]
      let colors = []
      for (let j=0; j<face_colors.length; j++) {
        const c = face_colors[j]
        colors = colors.concat(c, c, c, c)
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

      const index_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer)
      const indices = [
        0,  1,  2,      0,  2,  3,
        4,  5,  6,      4,  6,  7,
        8,  9,  10,     8,  10, 11,
        12, 13, 14,     12, 14, 15,
        16, 17, 18,     16, 18, 19,
        20, 21, 22,     20, 22, 23
      ]
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

      return {
        position: position_buffer,
        color: color_buffer,
        indices: index_buffer
      }
    },
    // SHADER ---
    initializeShader(parameter_gl, parameter_vertex_shader_source, parameter_fragment_shader_source) {
      const gl = parameter_gl, vertex_shader_source = parameter_vertex_shader_source, fragment_shader_source = parameter_fragment_shader_source

      const vertex_shader = this.loadShader(gl, gl.VERTEX_SHADER, vertex_shader_source)
      const fragment_shader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragment_shader_source)
      const shader_program = gl.createProgram()
      gl.attachShader(shader_program, vertex_shader)
      gl.attachShader(shader_program, fragment_shader)
      gl.linkProgram(shader_program)

      if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        return null
      }

      return shader_program
    },
    loadShader(parameter_gl, parameter_type, parameter_source) {
      const gl = parameter_gl, type = parameter_type, source = parameter_source

      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }

      return shader
    },
    // // GL -------
    // initializeGL() {
    //   this.$data.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
    //   this.$data.renderer.setSize( window.innerWidth, window.innerHeight )
    //   this.$data.renderer.setPixelRatio(window.devicePixelRatio)
    //   document.querySelector('#main').appendChild(this.$data.renderer.domElement)

    //   this.$data.scene = new THREE.Scene()

    //   this.$data.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    //   this.$data.camera.position.z = 5
    // },
    // updateGL() {
    //   this.$data.renderer.render(this.$data.scene, this.$data.camera)
    // },
    // listenGL() {
    //   window.addEventListener('resize', this.resizeGL)
    // },
    // resizeGL() {
    //   this.$data.camera.aspect = window.innerWidth / window.innerHeight
    //   this.$data.camera.updateProjectionMatrix()
  
    //   this.$data.renderer.setSize(window.innerWidth, window.innerHeight)
    // },
    // // CUBE -----
    // initializeCube() {
    //   let geometry = new THREE.PlaneGeometry(10, 10, 10)
    //   let material = new THREE.ShaderMaterial({
    //         transparent: true,
    //         uniforms: {
    //           uTime: { type: "f", value: 0.0 },
    //           uResolution: { type: "v2", value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    //         },
    //         vertexShader: `
    //           uniform float uTime;
    //           uniform vec2 uResolution;
    //           varying vec3 vColor;

    //           void main(void) {
    //               vColor = position;
    //               gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //           }
    //         `,
    //         fragmentShader: `
    //           uniform float uTime;
    //           uniform vec2 uResolution;
    //           varying vec3 vColor;

    //           float SimplexPerlin3D(vec3 P) {
    //               const float SKEWFACTOR = 1.0 / 3.0;
    //               const float UNSKEWFACTOR = 1.0 / 6.0;
    //               const float SIMPLEX_CORNER_POS = 0.5;
    //               const float SIMPLEX_TETRAHADRON_HEIGHT = 0.70710678118654752440084436210485;
    //               P *= SIMPLEX_TETRAHADRON_HEIGHT;
    //               vec3 Pi = floor(P + dot(P, vec3(SKEWFACTOR)));
    //               vec3 x0 = P - Pi + dot(Pi, vec3(UNSKEWFACTOR));
    //               vec3 g = step(x0.yzx, x0.xyz);
    //               vec3 l = 1.0 - g;
    //               vec3 Pi_1 = min(g.xyz, l.zxy);
    //               vec3 Pi_2 = max(g.xyz, l.zxy);
    //               vec3 x1 = x0 - Pi_1 + UNSKEWFACTOR;
    //               vec3 x2 = x0 - Pi_2 + SKEWFACTOR;
    //               vec3 x3 = x0 - SIMPLEX_CORNER_POS;
    //               vec4 v1234_x = vec4(x0.x, x1.x, x2.x, x3.x);
    //               vec4 v1234_y = vec4(x0.y, x1.y, x2.y, x3.y);
    //               vec4 v1234_z = vec4(x0.z, x1.z, x2.z, x3.z);
    //               Pi.xyz = Pi.xyz - floor(Pi.xyz * (1.0 / 69.0)) * 69.0;
    //               vec3 Pi_inc1 = step(Pi, vec3(69.0 - 1.5)) * (Pi + 1.0);
    //               vec4 Pt = vec4(Pi.xy, Pi_inc1.xy) + vec2(50.0, 161.0).xyxy;
    //               Pt *= Pt;
    //               vec4 V1xy_V2xy = mix(Pt.xyxy, Pt.zwzw, vec4(Pi_1.xy, Pi_2.xy));
    //               Pt = vec4(Pt.x, V1xy_V2xy.xz, Pt.z) * vec4(Pt.y, V1xy_V2xy.yw, Pt.w);
    //               const vec3 SOMELARGEFLOATS = vec3(635.298681, 682.357502, 668.926525);
    //               const vec3 ZINC = vec3(48.500388, 65.294118, 63.934599);
    //               vec3 lowz_mods = vec3(1.0 / (SOMELARGEFLOATS.xyz + Pi.zzz * ZINC.xyz));
    //               vec3 highz_mods = vec3(1.0 / (SOMELARGEFLOATS.xyz + Pi_inc1.zzz * ZINC.xyz));
    //               Pi_1 = (Pi_1.z < 0.5) ? lowz_mods : highz_mods;
    //               Pi_2 = (Pi_2.z < 0.5) ? lowz_mods : highz_mods;
    //               vec4 hash_0 = fract(Pt * vec4(lowz_mods.x, Pi_1.x, Pi_2.x, highz_mods.x)) - 0.49999;
    //               vec4 hash_1 = fract(Pt * vec4(lowz_mods.y, Pi_1.y, Pi_2.y, highz_mods.y)) - 0.49999;
    //               vec4 hash_2 = fract(Pt * vec4(lowz_mods.z, Pi_1.z, Pi_2.z, highz_mods.z)) - 0.49999;
    //               vec4 grad_results = inversesqrt(hash_0 * hash_0 + hash_1 * hash_1 + hash_2 * hash_2) * (hash_0 * v1234_x + hash_1 * v1234_y + hash_2 * v1234_z);
    //               const float FINAL_NORMALIZATION = 37.837227241611314102871574478976;
    //               vec4 kernel_weights = v1234_x * v1234_x + v1234_y * v1234_y + v1234_z * v1234_z;
    //               kernel_weights = max(0.5 - kernel_weights, 0.0);
    //               kernel_weights = kernel_weights * kernel_weights * kernel_weights;
    //               return dot(kernel_weights, grad_results) * FINAL_NORMALIZATION;
    //           }

    //           vec3 hue_to_rgb(float hue) {
    //             float R = abs(hue * 6.0 - 3.0) - 1.0;
    //             float G = 2.0 - abs(hue * 6.0 - 2.0);
    //             float B = 2.0 - abs(hue * 6.0 - 4.0);
    //             return saturate(vec3(R,G,B));
    //           }

    //           vec3 hsl_to_rgb(vec3 hsl) {
    //             vec3 rgb = hue_to_rgb(hsl.x);
    //             float C = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
    //             return (rgb - 0.5) * C + hsl.z;
    //           }

    //           float map(float value, float inMin, float inMax, float outMin, float outMax) {
    //             return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
    //           }

    //           void main(void) {
    //               float noise = SimplexPerlin3D(vColor * 0.75 + uTime * 0.75);

    //               float hue = map(noise, 0.0, 1.0, 0.0, 0.15);
    //               hue = floor(hue * 50.0) / 50.0;
    //               // hue = 0.0;

    //               // float saturation = map(noise, 0.0, 1.0, 0.5, 1.0);
    //               // saturation = floor(saturation * 50.0) / 50.0;
    //               float saturation = 0.5;

    //               // float lightness = map(noise, 0.0, 1.0, 0.25, 0.75);
    //               // lightness = floor(lightness * 50.0) / 50.0;
    //               float lightness = 0.5;

    //               vec3 rgb = hsl_to_rgb(vec3(hue, saturation, lightness));
    //               gl_FragColor = vec4(rgb, noise);
    //           }
    //         `
    //     })
    //   let cube = new THREE.Mesh(geometry, material)
    //   cube.position.set(0, 0, 0)
    //   this.$data.scene.add( cube )
    // },
    // updateCube(parameter_time) {
    //   const time = parameter_time
    //   this.$data.scene.children[0].material.uniforms.uTime.value = time
    //   // this.$data.scene.children[0].rotation.x += 0.01
    //   // this.$data.scene.children[0].rotation.y += 0.01
    // },
    // USER -----
    listenUser() {
      for (const link of document.querySelectorAll('a')) {
        link.addEventListener('mouseover', this.mouseoverUser)
        link.addEventListener('mouseout', this.mouseoutUser)
      }
      window.addEventListener('wheel', this.wheelUser)
    },
    mouseoverUser(parameter_event) {
      const event = parameter_event
    },
    mouseoutUser(parameter_event) {
      const event = parameter_event
    },
    wheelUser(parameter_event) {
      const event = parameter_event

      const parent = document.querySelector('#main')
      const elements = parent.querySelectorAll('section')
      // const canvas = this.$data.scene.children[0]
      let delta = event.deltaY / 120 || -event.detail / 3
      const height = -(parent.clientHeight)

      this.$data.scroll -= parseInt(delta * 45)

      if (this.$data.scroll > 0) {
        delta = 0
        this.$data.scroll = 0
      } else if (this.$data.scroll < height / 1.5) {
        delta = 0
        this.$data.scroll = height / 1.5
      }

      TweenMax.staggerTo(elements, 0.5, {
        y: this.$data.scroll,
        skewY: `${delta * 10}deg`
      }, 0.001, 0)

      // TweenMax.to(canvas.rotation, 0.5, {
      //   x: `+=${delta}`
      // }, 0)
    }
  },
  mounted() {
    setTimeout(()=>{
      this.initialize()
      this.update()
      this.listen()
    }, 0)
  }
}
</script> -->

<script>
import mat4 from 'gl-matrix-mat4'
import TweenMax from 'gsap'
import { mapMutations, mapState } from 'vuex'

export default {
  data () {
    return {
      gl: null,
      program_info: null,
      buffers: null,
      time: {
        now: 0,
        last: 0,
        delta: 0
      },
      rotation: 0,
      scroll: 0
    }
  },
  computed: {
    ...mapState({
      load: state => state.load
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme"
    }),
    
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // GLOBAL ---
    initialize() {
      this.initializeDOM()
      // this.initializeGL()
    },
    update(parameter_time) {
      const time = parameter_time
      if (time) {
        this.$data.time.now = time

        this.$data.time.now *= 0.001
        this.$data.time.delta = this.$data.time.now - this.$data.time.last
        this.$data.time.last = this.$data.time.now

        // this.updateGL()
      }
      requestAnimationFrame(this.update)
    },
    listen() {
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    //  DOM -----
    initializeDOM() {
      this.setTheme('dark')
      this.splitTextAll()
      // this.checkNavigator()
      this.appearDOM()
    },
    // checkNavigator() {
    //   const isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)
      
    //   if (isSafari) {
    //     this.$data.isSafari = true;
    //     document.querySelector('#portfolio').style.overflow = 'inherit'
    //     document.querySelector('#portfolio').style.overflow = 'inherit'
    //   }
    // },
    appearDOM() {
      const timeline = new TimelineMax()

      const image = document.querySelector('img')
      timeline.from(image, 1.0, {
        // x: 250,
        autoAlpha: 0
      })

      // const test = document.querySelector('#content__visual p')
      // timeline.from(test, 1, {
      //   x: 250,
      //   skewX: '-2.5deg'
      // })

      const texts = document.querySelectorAll('h1, h2, p, ul')
      texts.forEach((text, i) => {
        const letters = text.querySelectorAll('.letter')
        switch(i) {
          case 0: case 1: case 2:
            timeline.staggerFrom(letters, (!i)?1.0:0.75, {
              y: (!i)?500:50,
              skewY: 50
            }, 0.00075, (!i)?'-=0.5':'-=0.25', ()=>{
              setTimeout(()=>{
                this.listenUser()
              }, 500)
            })
            break;
          default: 
            break;
        }
      })
    },
    splitTextAll() {
      for (let text of document.querySelectorAll('.section__introduction > p, .section__projects > h2, li')) {
        this.splitText(text)
      }
    },
    splitText(parameter_element) {
      const element = parameter_element

      const text = element.textContent.split(' ')
      let split = ''
      text.forEach((word, i) => {
        word = word.replace(/./g, '<span class="letter">$&</span>')
        if (i) split += '<span class="word">&nbsp;</span>'
        split += `<span class="word">${word}</span>`
      })
      element.innerHTML = split
    },
    
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // USER -----
    listenUser() {
      window.addEventListener('wheel', this.wheelUser)
    },
    
    wheelUser(parameter_event) {
      const event = parameter_event

      const parent = document.querySelector('#main')
      const elements = parent.querySelectorAll('section')
      let delta = event.deltaY / 120 || -event.detail / 3 || 0
      const height = -(parent.clientHeight)
      const time = 0.5

      this.$data.scroll -= parseInt(delta * 45)
      
      if ((delta > 1) || (delta < -1)) {
        delta *=  0.15
      } 

      if (this.$data.scroll > 0) {
        delta = 0
        this.$data.scroll = 0
      } else if (this.$data.scroll < height / 1.5) {
        delta = 0
        this.$data.scroll = height / 1.5
      }
      
      TweenMax.staggerTo(elements, time, {
        y: this.$data.scroll,
        skewY: `${delta * 7.5}deg`,
        onComplete: ()=>{
          TweenMax.staggerTo(elements, time, {
            skewY: `${0}deg`
          }, 0.001)
        }
      }, 0.001)
      // timeline.staggerTo(elements, 0.5, {
      //   skewY: `${0}deg`
      // }, 0.001)

      // const big = document.querySelector('#content__visual p')
      // TweenMax.to(big, 0.5, {
      //   y: this.$data.scroll,
      //   skewY: `${delta * 7.5}deg`
      // }, 0)
    },
    
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // GL -------
    initializeGL() {
      const canvas = document.getElementById('gl__canvas')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      this.$data.gl = canvas.getContext('webgl')

      if (!this.$data.gl) {
        return
      }

      const vertex_shader_source = `
        attribute vec4 a_vertex_position;
        attribute vec4 a_vertex_color;
        uniform lowp mat4 u_model_view_matrix;
        uniform lowp mat4 u_projection_matrix;
        uniform lowp float u_time;
        varying lowp vec4 v_color;

        void main() {
          vec4 position = vec4(a_vertex_position);
          gl_Position = u_projection_matrix * u_model_view_matrix * position;
          v_color = a_vertex_position;
        }
      `
      const fragment_shader_source = `
        precision mediump float;

        varying lowp vec4 v_color;
        uniform lowp float u_time;

        float SimplexPerlin3D(vec3 P) {
          const float SKEWFACTOR = 1.0 / 3.0;
          const float UNSKEWFACTOR = 1.0 / 6.0;
          const float SIMPLEX_CORNER_POS = 0.5;
          const float SIMPLEX_TETRAHADRON_HEIGHT = 0.70710678118654752440084436210485;
          P *= SIMPLEX_TETRAHADRON_HEIGHT;
          vec3 Pi = floor(P + dot(P, vec3(SKEWFACTOR)));
          vec3 x0 = P - Pi + dot(Pi, vec3(UNSKEWFACTOR));
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 Pi_1 = min(g.xyz, l.zxy);
          vec3 Pi_2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - Pi_1 + UNSKEWFACTOR;
          vec3 x2 = x0 - Pi_2 + SKEWFACTOR;
          vec3 x3 = x0 - SIMPLEX_CORNER_POS;
          vec4 v1234_x = vec4(x0.x, x1.x, x2.x, x3.x);
          vec4 v1234_y = vec4(x0.y, x1.y, x2.y, x3.y);
          vec4 v1234_z = vec4(x0.z, x1.z, x2.z, x3.z);
          Pi.xyz = Pi.xyz - floor(Pi.xyz * (1.0 / 69.0)) * 69.0;
          vec3 Pi_inc1 = step(Pi, vec3(69.0 - 1.5)) * (Pi + 1.0);
          vec4 Pt = vec4(Pi.xy, Pi_inc1.xy) + vec2(50.0, 161.0).xyxy;
          Pt *= Pt;
          vec4 V1xy_V2xy = mix(Pt.xyxy, Pt.zwzw, vec4(Pi_1.xy, Pi_2.xy));
          Pt = vec4(Pt.x, V1xy_V2xy.xz, Pt.z) * vec4(Pt.y, V1xy_V2xy.yw, Pt.w);
          const vec3 SOMELARGEFLOATS = vec3(635.298681, 682.357502, 668.926525);
          const vec3 ZINC = vec3(48.500388, 65.294118, 63.934599);
          vec3 lowz_mods = vec3(1.0 / (SOMELARGEFLOATS.xyz + Pi.zzz * ZINC.xyz));
          vec3 highz_mods = vec3(1.0 / (SOMELARGEFLOATS.xyz + Pi_inc1.zzz * ZINC.xyz));
          Pi_1 = (Pi_1.z < 0.5) ? lowz_mods : highz_mods;
          Pi_2 = (Pi_2.z < 0.5) ? lowz_mods : highz_mods;
          vec4 hash_0 = fract(Pt * vec4(lowz_mods.x, Pi_1.x, Pi_2.x, highz_mods.x)) - 0.49999;
          vec4 hash_1 = fract(Pt * vec4(lowz_mods.y, Pi_1.y, Pi_2.y, highz_mods.y)) - 0.49999;
          vec4 hash_2 = fract(Pt * vec4(lowz_mods.z, Pi_1.z, Pi_2.z, highz_mods.z)) - 0.49999;
          vec4 grad_results = inversesqrt(hash_0 * hash_0 + hash_1 * hash_1 + hash_2 * hash_2) * (hash_0 * v1234_x + hash_1 * v1234_y + hash_2 * v1234_z);
          const float FINAL_NORMALIZATION = 37.837227241611314102871574478976;
          vec4 kernel_weights = v1234_x * v1234_x + v1234_y * v1234_y + v1234_z * v1234_z;
          kernel_weights = max(0.5 - kernel_weights, 0.0);
          kernel_weights = kernel_weights * kernel_weights * kernel_weights;
          return dot(kernel_weights, grad_results) * FINAL_NORMALIZATION;
        }

        vec3 hsb_to_rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
          rgb = rgb*rgb*(3.0-2.0*rgb);
          return c.z * mix(vec3(1.0), rgb, c.y);
        }

        float map(float value, float inMin, float inMax, float outMin, float outMax) {
          return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
        }

        void main(void) {
            float noise = -SimplexPerlin3D(vec3(v_color * 0.25 + u_time * 0.25));

            // noise = smoothstep(noise, 0.0, 0.5);
            noise = map(noise, 0.0, 1.0, 0.05098039215, 0.5098039215);
            noise = floor(noise * 500.0) / 500.0;
            
            // float hue = 1.0;
            // float saturation = 1.0;
            // float brightness = 1.0;
            // vec3 color = hsb_to_rgb(vec3(hue, saturation, brightness));

            gl_FragColor = vec4(vec3(0.0), 1.0);
        }
      `
      const shader_program = this.initializeShader(this.$data.gl, vertex_shader_source, fragment_shader_source)
      this.$data.program_info = {
        program: shader_program,
        attrib_locations: {
          vertex_position: this.$data.gl.getAttribLocation(shader_program, 'a_vertex_position'),
          vertex_color: this.$data.gl.getAttribLocation(shader_program, 'a_vertex_color')
        },
        uniform_locations: {
          projection_matrix: this.$data.gl.getUniformLocation(shader_program, 'u_projection_matrix'),
          model_view_matrix: this.$data.gl.getUniformLocation(shader_program, 'u_model_view_matrix'),
          time: this.$data.gl.getUniformLocation(shader_program, 'u_time')
        }
      }
      
      this.$data.buffers = this.initializeBuffers(this.$data.gl)
    },
    updateGL() {
      this.updateScene(this.$data.gl, this.$data.program_info, this.$data.buffers, this.$data.time.deltaTime)
    },

    // SCENE ----
    updateScene(parameter_gl, parameter_program_informations, parameter_buffers) {
      const gl = parameter_gl, program_informations = parameter_program_informations, buffers = parameter_buffers

      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clearDepth(1.0)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const projection_matrix = mat4.create()
      const fov = 45 * Math.PI / 180
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
      const near = 0.1
      const far = 100.0
      mat4.perspective(projection_matrix, fov, aspect, near, far)

      const model_view_matrix = mat4.create()
      mat4.translate(model_view_matrix, model_view_matrix, [-0.0, 0.0, -6.0])
      // mat4.rotate(model_view_matrix, model_view_matrix, this.$data.rotation, [0, 0, 1])
      // mat4.rotate(model_view_matrix, model_view_matrix, this.$data.rotation, [0, 1, 0])

      {
        const number_components = 3
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
        gl.vertexAttribPointer(
          program_informations.attrib_locations.vertex_position,
          number_components,
          type,
          normalize,
          stride,
          offset
        )
        gl.enableVertexAttribArray(program_informations.attrib_locations.vertex_position)
      }

      {
        const number_components = 4
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
        gl.vertexAttribPointer(
          program_informations.attrib_locations.vertex_color,
          number_components,
          type,
          normalize,
          stride,
          offset
        )
        gl.enableVertexAttribArray(program_informations.attrib_locations.vertex_color)
      }

      gl.useProgram(program_informations.program)

      gl.uniformMatrix4fv(program_informations.uniform_locations.projection_matrix, false, projection_matrix)
      gl.uniformMatrix4fv(program_informations.uniform_locations.model_view_matrix, false, model_view_matrix)
      gl.uniform1f(program_informations.uniform_locations.time, this.$data.time.now)

      {
        const vertex_count = 36
        const type = gl.UNSIGNED_SHORT
        const offset = 0
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
        gl.drawElements(gl.TRIANGLES, vertex_count, type, offset)
      }
      
      this.$data.rotation += this.$data.time.delta
    },

    // BUFFERS ---
    initializeBuffers(parameter_gl) {
      const gl = parameter_gl

      const position_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer)
      const positions = [
        -5, -5,  0.01,
         5, -5,  0.01,
         5,  5,  0.01,
        -5,  5,  0.01,
        -5, -5, -0.01,
        -5,  5, -0.01,
         5,  5, -0.01,
         5, -5, -0.01,
        -5,  5, -0.01,
        -5,  5,  0.01,
         5,  5,  0.01,
         5,  5, -0.01,
        -5, -5, -0.01,
         5, -5, -0.01,
         5, -5,  0.01,
        -5, -5,  0.01,
         5, -5, -0.01,
         5,  5, -0.01,
         5,  5,  0.01,
         5, -5,  0.01,
        -5, -5, -0.01,
        -5, -5,  0.01,
        -5,  5,  0.01,
        -5,  5, -0.01
      ]
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

      const color_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer)
      const face_colors = [
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  1.0,  1.0,  1.0],    
        [1.0,  1.0,  1.0,  1.0]    
      ]
      let colors = []
      for (let j=0; j<face_colors.length; j++) {
        const c = face_colors[j]
        colors = colors.concat(c, c, c, c)
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

      const index_buffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer)
      const indices = [
        0,  1,  2,      0,  2,  3,
        4,  5,  6,      4,  6,  7,
        8,  9,  10,     8,  10, 11,
        12, 13, 14,     12, 14, 15,
        16, 17, 18,     16, 18, 19,
        20, 21, 22,     20, 22, 23
      ]
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

      return {
        position: position_buffer,
        color: color_buffer,
        indices: index_buffer
      }
    },

    // SHADER ---
    initializeShader(parameter_gl, parameter_vertex_shader_source, parameter_fragment_shader_source) {
      const gl = parameter_gl, vertex_shader_source = parameter_vertex_shader_source, fragment_shader_source = parameter_fragment_shader_source

      const vertex_shader = this.loadShader(gl, gl.VERTEX_SHADER, vertex_shader_source)
      const fragment_shader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragment_shader_source)
      const shader_program = gl.createProgram()
      gl.attachShader(shader_program, vertex_shader)
      gl.attachShader(shader_program, fragment_shader)
      gl.linkProgram(shader_program)

      if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shader_program))
        return null
      }

      return shader_program
    },
    loadShader(parameter_gl, parameter_type, parameter_source) {
      const gl = parameter_gl, type = parameter_type, source = parameter_source

      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }

      return shader
    }
    
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  },
  mounted() {
    setTimeout(()=> {
      this.initialize()
      this.update()
      this.listen()
    }, 10)
  }
}
</script>

<style scoped lang="scss">
  #main {
    #content__informations {
      position: relative;
      margin: 0 17vw 0 17vw;
      // margin: 0 50vw 0 17vw;
      padding-top: 40vh;
      max-width: 300px;
      z-index: 2;
      h2 {
        margin-bottom: 40px;
      }
    }
    #content__visual {
      // position: absolute;
      // top: 0; left: 0;
      // display: flex;
      // justify-content: center;
      width: 100%;
      padding-top: 25vh;
      z-index: 1;
      span {
        display: block;
      }
      p {
        color: rgba(25, 25, 25, 0.95);
        max-width: 40vw;
        font-size: 50vh;
        font-family: 'C';
        line-height: 1.0;
      }
    }
    #content__visual {
      position: absolute;
      bottom: 0; right: -5vw;
      z-index: 1;
      img {
        height: 75vh;
        width: auto;
        transform: rotateY(180deg);
      }
    }
  }
  .is {
    &__desktop {
      #main {
        #content__informations {
          max-width: 400px;
          h1, h2, p, li {
            overflow: hidden;
          }
        }
        #content__visual {
          // display: none;
          // color: rgba(15, 15, 15, 0.95);
          max-width: 70vw;
          @media (max-width: 800px) {
            width: 564px;
            max-width: initial;
            right: -40px;
          }
        }
      }
    }
    &__mobile {
      #main {
        #content__visual {
          display: none;
        }
      }
    }
  }
</style>
