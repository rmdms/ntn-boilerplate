// Import modules
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SimplexNoise from "simplex-noise";
// require( 'three-instanced-mesh' )(THREE);

class Flowmap {
    constructor(renderer) {
      this.renderer = renderer;
      this.initialize();
    }
  
    initialize() {
      // UV
      this.uv = {
          x: -1,
          y: -1
      };
      // SCENE
      this.scene =new THREE.Scene();
      // CAMERA
      this.camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 1000);
      this.camera.position.z = 2;
      // TEXTURE
      this.textureShader = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter
      });
      this.textureTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter
      });
      // PLANE
      this.geometry = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight);
      this.material = new THREE.ShaderMaterial({
          uniforms: {
              uTime: { type: "f", value: 0.0 },
              uResolution: { type: "v2", value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
              uMap: { type: "sampler2D", value: this.textureShader.texture },
              uMouse: { type: "v2", value: this.uv }
          },
          vertexShader: `
              uniform vec2 uResolution;
              uniform sampler2D uMap;
              uniform float uDissipation;
              uniform vec2 uMouse;
              varying vec2 vUv;
              void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
              }    
          `,
          fragmentShader: `
              uniform vec2 uResolution;
              uniform sampler2D uMap;
              uniform float uDissipation;
              uniform vec2 uMouse;
              varying vec2 vUv;
      
              void main() {
                  vec4 color = texture2D(uMap, vUv);
                  vec2 cursor = vUv - uMouse;
                  float falloff = smoothstep(0.15, 0.0, length(cursor)) * 0.2;
                  color.rgb = mix(color.rgb, vec3(1.0), vec3(falloff));
                  gl_FragColor = color;
          
                  gl_FragColor.rbg -= vec3(1.0 - 0.98);
                  gl_FragColor.a = 1.0 - 0.98;
              }
          `
      });
      this.plane = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.plane);
    }
  
    update(time, uv) {
      // RENDERER
      this.renderer.setRenderTarget(this.textureTarget);
      this.renderer.render(this.scene, this.camera);
      // RAYCASTING
      this.uv = uv;
      // UNIFORMS
      if (this.material.uniforms) {
          // MOUSE
          this.material.uniforms.uMouse.value = this.uv;
          // TEXTURE
          const t = this.textureShader;
          this.textureShader = this.textureTarget;
          this.textureTarget = t;
          this.material.uniforms.uMap.value = this.textureShader.texture;
      }
    }
  }

class Particles {
    constructor(gl, surface, uvTest) {
        this.renderer = gl.renderer;
        this.scene = gl.scene;
        this.camera = gl.camera;
        this.raycaster = gl.raycaster;
        this.surface = surface;
        this.mouse = {x: 0, y: 0};
        this.initialize();
        // ...
        this.a = 0;
    }
    initialize() {
        // -----

        // CLIP SPACE
        this.camera.updateProjectionMatrix()
        this.camera.updateMatrixWorld()
        this.camera.updateWorldMatrix()
        const viewMatrixCamera = this.camera.matrixWorldInverse.clone()
        const projectionMatrixCamera = this.camera.projectionMatrix.clone()
        const modelMatrixCamera = this.camera.matrixWorld.clone()
        const projPosition = this.camera.position.clone()

        // -----
        // FLOWMAP
        this.flowmap = new Flowmap(this.renderer);
        // GEOMETRY
        const geometry = new THREE.PlaneBufferGeometry(0.2, 0.2, 32, 32);
        // MATERIAL
        const uniforms = {
            uTime: { type: "f", value: 0.0 },
            uResolution: { type: "v2", value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uTexture: { type: "sampler2D", value: new THREE.TextureLoader().load("images/texture-grass.png") },
            uMap: { type: "sampler2D", value: this.flowmap.textureTarget.texture },
            uDirection: { type: "f", value: 0.0 },
            uMouseX: { type: "f", value: this.mouse.x },
            // -----

            // uMap: { type: "sampler2D", value: new THREE.TextureLoader().load("../../static/images/texture-test.jpg") },
            viewMatrixCamera: { type: 'm4', value: viewMatrixCamera },
            projectionMatrixCamera: { type: 'm4', value: projectionMatrixCamera },
            modelMatrixCamera: { type: 'mat4', value: modelMatrixCamera },
            projPosition: { type: 'v3', value: projPosition },
            savedModelMatrix: { type: 'mat4', value: modelMatrixCamera },
            uvTest: { type: 'vec4', value: this.uvTest },

            // -----
        };
        const vertexShader = `
            uniform float uTime;
            uniform float uDirection;
            uniform float uMouseX;
            uniform sampler2D uMap;

            // uniform mat4 viewMatrixCamera;
            // uniform mat4 projectionMatrixCamera;
            // uniform mat4 modelMatrixCamera;
            // uniform mat4 savedModelMatrix;
            // varying float test;
            // uniform vec4 uvTest;

            varying float vPendul;
            varying vec2 vUv;
            varying vec3 vPosition;

            float SimplexPerlin2D( vec2 P ) {
                const float SKEWFACTOR = 0.36602540378443864676372317075294; 
                const float UNSKEWFACTOR = 0.21132486540518711774542560974902; 
                const float SIMPLEX_TRI_HEIGHT = 0.70710678118654752440084436210485;
                const vec3 SIMPLEX_POINTS = vec3( 1.0-UNSKEWFACTOR, -UNSKEWFACTOR, 1.0-2.0*UNSKEWFACTOR );
                P *= SIMPLEX_TRI_HEIGHT;
                vec2 Pi = floor( P + dot( P, vec2( SKEWFACTOR ) ) );
                vec4 Pt = vec4( Pi.xy, Pi.xy + 1.0 );
                Pt = Pt - floor(Pt * ( 1.0 / 71.0 )) * 71.0;
                Pt += vec2( 26.0, 161.0 ).xyxy;
                Pt *= Pt;
                Pt = Pt.xzxz * Pt.yyww;
                vec4 hash_x = fract( Pt * ( 1.0 / 951.135664 ) );
                vec4 hash_y = fract( Pt * ( 1.0 / 642.949883 ) );
                vec2 v0 = Pi - dot( Pi, vec2( UNSKEWFACTOR ) ) - P;
                vec4 v1pos_v1hash = (v0.x < v0.y) ? vec4(SIMPLEX_POINTS.xy, hash_x.y, hash_y.y) : vec4(SIMPLEX_POINTS.yx, hash_x.z, hash_y.z);
                vec4 v12 = vec4( v1pos_v1hash.xy, SIMPLEX_POINTS.zz ) + v0.xyxy;
                vec3 grad_x = vec3( hash_x.x, v1pos_v1hash.z, hash_x.w ) - 0.49999;
                vec3 grad_y = vec3( hash_y.x, v1pos_v1hash.w, hash_y.w ) - 0.49999;
                vec3 grad_results = inversesqrt( grad_x * grad_x + grad_y * grad_y ) * ( grad_x * vec3( v0.x, v12.xz ) + grad_y * vec3( v0.y, v12.yw ) );
                const float FINAL_NORMALIZATION = 99.204334582718712976990005025589;
                vec3 m = vec3( v0.x, v12.xz ) * vec3( v0.x, v12.xz ) + vec3( v0.y, v12.yw ) * vec3( v0.y, v12.yw );
                m = max(0.5 - m, 0.0);
                m = m*m;
                return dot(m*m, grad_results) * FINAL_NORMALIZATION;
            }

            float map(float value, float low1, float high1, float low2, float high2) {
                return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
            }

            #define M_PI 3.14159265358979323846

            float rand(vec2 co){return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);}
            float rand (vec2 co, float l) {return rand(vec2(rand(co), l));}
            float rand (vec2 co, float l, float t) {return rand(vec2(rand(co, l), t));}

            float perlin(vec2 p, float dim, float time) {
                vec2 pos = floor(p * dim);
                vec2 posx = pos + vec2(1.0, 0.0);
                vec2 posy = pos + vec2(0.0, 1.0);
                vec2 posxy = pos + vec2(1.0);
                
                float c = rand(pos, dim, time);
                float cx = rand(posx, dim, time);
                float cy = rand(posy, dim, time);
                float cxy = rand(posxy, dim, time);
                
                vec2 d = fract(p * dim);
                d = -0.5 * cos(d * M_PI) + 0.5;
                
                float ccx = mix(c, cx, d.x);
                float cycxy = mix(cy, cxy, d.x);
                float center = mix(ccx, cycxy, d.y);
                
                return center * 2.0 - 1.0;
            }

            // p must be normalized!
            float perlin(vec2 p, float dim) {
                
                /*vec2 pos = floor(p * dim);
                vec2 posx = pos + vec2(1.0, 0.0);
                vec2 posy = pos + vec2(0.0, 1.0);
                vec2 posxy = pos + vec2(1.0);
                
                // For exclusively black/white noise
                /*float c = step(rand(pos, dim), 0.5);
                float cx = step(rand(posx, dim), 0.5);
                float cy = step(rand(posy, dim), 0.5);
                float cxy = step(rand(posxy, dim), 0.5);*/
                
                /*float c = rand(pos, dim);
                float cx = rand(posx, dim);
                float cy = rand(posy, dim);
                float cxy = rand(posxy, dim);
                
                vec2 d = fract(p * dim);
                d = -0.5 * cos(d * M_PI) + 0.5;
                
                float ccx = mix(c, cx, d.x);
                float cycxy = mix(cy, cxy, d.x);
                float center = mix(ccx, cycxy, d.y);
                
                return center * 2.0 - 1.0;*/
                return perlin(p, dim, 0.0);
            }

            void main(void) {
                vUv = uv;
                vec4 mvPosition = vec4(position, 1.0);
                #ifdef USE_INSTANCING
                    mvPosition = instanceMatrix * mvPosition;
                #endif
                float noise = SimplexPerlin2D(mvPosition.xy * uMouseX + uTime * 0.4 + uDirection);
                // float noise = perlin(mvPosition.xy * 0.75 + uMouseX, 1.0);
                noise = map(noise, -1.0, 1.0, 0.0, 1.0);

                // vec4 worldPosition = modelMatrix * mvPosition;
                // vec4 texCoords = projectionMatrixCamera * viewMatrixCamera * worldPosition;
                // vec2 screenSpaceUv = (worldPosition.xy / worldPosition.w * 1.0) * 0.5 + 0.5;
                // vec4 texture = texture2D(uMap, screenSpaceUv);

                // vec3 vNormal = mat3(savedModelMatrix) * normal;
                // vec4 vWorldPosition = mvPosition;
                // vec4 vTexCoords = vWorldPosition;
                // vec2 tuv = (vTexCoords.xy / vTexCoords.w) * 0.5 + 0.5;
                // vUv = tuv;

                // vec4 texCoords = projectionMatrix * modelViewMatrix * savedModelMatrix * mvPosition;
                // vec2 worldUv = texCoords.xy * 0.5 + 0.5;
                // worldUv.x *= .20;

                // vUv = worldUv;
                vec4 texture = texture2D(uMap, uv.xy);

                vPendul = sin(vUv.y * (noise + texture.x));

                mvPosition.x -= vPendul * 0.095;
                mvPosition.y -= vPendul * 0.095;
                mvPosition.z -= sin(vUv.y * texture.x) * 0.075;
                
                vPosition = mvPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
            }
        `;
        const fragmentShader = `
            uniform sampler2D uTexture;
            uniform sampler2D uMap;
            varying float vPendul;
            varying vec2 vUv;
            varying vec3 vPosition;
            // varying float test;

            float map(float value, float low1, float high1, float low2, float high2) {
                return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
            }

            void main(void) {
                vec2 uv = vec2(vUv.x, vUv.y);
                vec4 texture = texture2D(uTexture, uv);
                vec3 color1 = vec3(0.5176470588, 0.2470588235, 0.03529411765);
                vec3 color2 = vec3(0.7960784314, 0.7215686275, 0.3568627451) * 1.25;
                // vec3 color1 = vec3(0.05882352941, 0.1333333333, 0.3254901961);
                // vec3 color2 = vec3(0.2784313725, 0.4705882353, 0.5411764706) * 1.25;
                if (texture.a < 0.5) discard;
                texture.rgb = vec3(mix(color1, color2, vUv.y));
                texture.rgb += smoothstep(0.25, 1.0, abs(vPendul)) * 0.25; 
                gl_FragColor = vec4(texture.xyz, 1.0);
                // gl_FragColor = vec4(texture2D(uMap, uv).xyz, 1.0);
            }
        `;
        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        });
        // MESH
        const sampleMesh = new THREE.InstancedMesh(geometry, this.material, 2000);
        const _position = new THREE.Vector3();
        const _normal = new THREE.Vector3();
        let _matrix = new THREE.Matrix4();
        // SAMPLER
        const sampler = new MeshSurfaceSampler(this.surface).setWeightAttribute(null).build();
        for (let i = 0; i < 2000; i ++) {
            sampler.sample( _position, _normal );
            _matrix.setPosition( _position.x, _position.y, _position.z + 0.1);
            sampleMesh.setMatrixAt( i, _matrix );
        }
        sampleMesh.instanceMatrix.needsUpdate = true;
        sampleMesh.geometry.rotateX(THREE.Math.degToRad(90));
        // SCENE
        this.scene.add(sampleMesh);
        // this.scene.add(new THREE.Mesh(geometry, this.material));
        // window.addEventListener('wheel', (e)=>{
        //     if (e.deltaY > 0) {
        //         this.material.uniforms.uDirection.value = this.lerp(this.a, e.deltaY, 0.005);
        //         this.a = this.material.uniforms.uDirection.value;
        //         console.log(e.deltaY)
        //     }
        // })
    }
    update(time, intersects, mouse) {
        if (this.material) {
            if (this.material.uniforms) {
                this.material.uniforms.uTime.value = time;
                if (time) {
                        // this.a = this.map((-mouse.x / window.innerWidth) * 2 + 1, -1, 1, -1, 1) * time;
                    // this.a = time*0.5;
                }
                // this.material.uniforms.uDirection.value = (this.mouse.x > mouse.x) ? 1 : -1;
                this.mouse.x = mouse.x;
                // this.material.uniforms.uMouseX.value = this.lerp(this.material.uniforms.uMouseX.value, this.a, 0.007);
                this.material.uniforms.uMouseX.value = this.map((-mouse.x / window.innerWidth) * 2 + 1, -1, 1, 0.4, 0.6);

                // RAYCASTER
                // if (intersects && intersects[0]) {
                //     let intersect = null;
                //     intersects.forEach(mesh => {
                //         if (mesh.instanceId === undefined && mesh.object.name === "clone") {
                //             intersect = mesh;
                //         }
                //     });
                //     if (intersect) {
                //         const uv = intersect.uv;
                //         // FLOWMAP
                //         // this.flowmap.update(time, uv);
                //     } else {
                //         // FLOWMAP
                //         // this.flowmap.update(time, {x: -1.0, y: -1.0});
                //     }
                // } else {
                //     // FLOWMAP
                //     // this.flowmap.update(time, {x: -1.0, y: -1.0});
                // }
            }
        }
    }
    map(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    lerp (start, end, amt){
        return (1-amt)*start+amt*end
    }
}


class Butterfly {
    constructor(scene) {
        this.scene = scene;
        this.initialize();
    }
    initialize() {
        // GEOMETRY
        const geometry = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
        // MATERIAL
        const uniforms = {
            time: { type: "f", value: 0.0 },
            resolution: { type: "v2", value: { x: window.innerWidth, y: window.innerHeight } }
        };
        const vertexShader = `
            varying vec2 vUV;
            varying vec3 vPos;
            void main(void) {
                vUV = uv;
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
            }
        `;
        const fragmentShader = `
            uniform float uTime;
            varying vec2 vUV;
            varying vec3 vPos; 

            precision highp float;
  #extension GL_OES_standard_derivatives : enable

  uniform vec2 resolution;
  uniform float time;

  float snow(vec2 uv, float scale) {
    float w = smoothstep(1.0, 0.0, uv.y * (scale / 1.0));
    
    if (w < 0.1) {
      return 0.0;
    }
    
    float c = -time / scale;
    
    // Fall to left:
    // uv += -time;
    
    uv.y += c;
    uv.x -= c;

    uv.y += c * .0;
    uv.x += cos(uv.y + -time * 0.05) / scale;
    uv   *= scale;

    vec2 s = floor(uv/7.);
    vec2 f = fract(uv/5.);
    vec2 p = vec2(0.0);

    float k = 1.0;
    float d = 1.0;
    
    p = .95 + 0.35 * sin(11.0 * fract(sin((s + p + scale) * mat2(7, 3, 6, 5)) * 5.0)) - f;
    d = length(p);
    k = min(d, k);

    k = smoothstep(0.0, k, sin(f.x + f.y) * 0.0025);
    return k * w;
  }

  void main (void) {
    float size = mix(min(resolution.x, resolution.y), max(resolution.x, resolution.y), 0.5);
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / size;
    // float c = -smoothstep(1.0, 0.0, clamp(uv.y * 0.1 + 0.75, 0.0, 0.75));

    float c;
    // c += snow(uv, 30.0) * 0.3;
    // c += snow(uv, 20.0) * 0.5;
    // c += snow(uv, 15.0) * 0.8;

    c += snow(uv, 40.0);
    c += snow(uv, 30.0);
    c += snow(uv, 20.0);
    c += snow(uv, 10.0);

    gl_FragColor = vec4(vec3(c), c); // 0.0
  }
        `;
        this.material = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });
        // MESH
        this.shape = new THREE.Mesh(geometry, this.material);
        this.shape.name = "butterfly";

        this.shape.position.x = 1;
        this.shape.position.y = -1.75;
        this.shape.position.z = 1;
        this.shape.rotation.x = 75 * Math.PI / 180;
        this.shape.rotation.y = 15 * Math.PI / 180;
        // this.shape.position.z = 0.45;
        // SCENE
        this.scene.add(this.shape);
    }
    update(time) {
        if (this.material) {
            if (this.material.uniforms) {
                this.material.uniforms.time.value = time;
            }
        }}
}

class Sky {
    constructor(scene) {
        this.scene = scene;
        this.initialize();
    }
    initialize() {
        // GEOMETRY
        const geometry = new THREE.SphereBufferGeometry(5, 32, 32);
        // MATERIAL
        const uniforms = {
            uTime: { type: "f", value: 0.0 }
        };
        const vertexShader = `
            uniform float uTime;
            varying vec2 vUV;
            varying vec3 vPos;
            void main(void) {
                vUV = uv;
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
            }
        `;
        const fragmentShader = `
            varying vec2 vUV;
            varying vec3 vPos;

            void main(void) {
                float y = smoothstep(1.0, 0.75, vUV.y);
                vec3 color = vec3(0.7568627450980392 * y, 0.8352941176470589 * y, 0.9372549019607843 * y) + (1.0 - y);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });
        // MESH
        this.shape = new THREE.Mesh(geometry, this.material);
        this.shape.name = "sky";
        this.shape.position.z = -1.5;
        // SCENE
        this.scene.add(this.shape);
        // ...
        // const color = 0xFFFFFF;
        // const density = 0.9;
        // this.scene.fog = new THREE.FogExp2(color, density);
    }
}

class Hill {
    constructor(scene) {
        this.scene = scene;
        this.initialize();
    }
    initialize() {
        // SIMPLEX
        const simplex = new SimplexNoise();
        // GEOMETRY
        const geometry = new THREE.PlaneBufferGeometry(7, 3, 32, 32);
        // MATERIAL
        // const uniforms = {
        //     uTime: { type: "f", value: 0.0 }
        // };
        // const vertexShader = `
        //     uniform float uTime;
        //     varying vec3 vPos;
        //     void main(void) {
        //         vPos = position;
        //         gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
        //     }
        // `;
        // const fragmentShader = `
        //     varying vec3 vPos;

        //     void main(void) {
        //         gl_FragColor = vec4(vPos, 1.0);
        //     }
        // `;
        // this.material = new THREE.ShaderMaterial({
        //     side: THREE.DoubleSide,
        //     uniforms: uniforms,
        //     vertexShader: vertexShader,
        //     fragmentShader: fragmentShader
        // });
        this.material = new THREE.MeshBasicMaterial({
            color: 0x894100,
            side: THREE.DoubleSide
        })
        // MESH
        this.shape = new THREE.Mesh(geometry, this.material);
        const peak = .25;
        const smoothing = 6.5;
        const smoothEdge = 0.5;
        let edges = null;
        let j = 0;
        const vertices = this.shape.geometry.attributes.position.array;
        const uv = this.shape.geometry.attributes.uv.array;
        for (let i = 0; i <= vertices.length; i++) {
            // if (i % 3 !== 0) {
            //     j++
            // }
            // if (j % 2 === 0) {
            //     edges = (
            //         this.smoothstep(0.0, smoothEdge, uv[j])
            //         * this.smoothstep(0.0, smoothEdge, uv[j + 1])
            //         * this.smoothstep(1.0, 1.0 - smoothEdge, uv[j])
            //         * this.smoothstep(1.0, 1.0 - smoothEdge, uv[j + 1])
            //     );
            // }
            // if (i % 3 === 0) {
                // let noise = simplex.noise2D(vertices[i] / smoothing, vertices[i + 1] / smoothing);
                // vertices[i + 2] += peak * this.map(noise, -1.0, 1.0, 0.0, 1.0);
                vertices[i + 2] += .1 * Math.sin(vertices[i]);
                vertices[i + 3] += .35 * Math.sin(vertices[i]);
            //     vertices[i + 2] *= edges;
            // }
        }
        this.shape.geometry.attributes.position.needsUpdate = true;
        this.shape.geometry.computeVertexNormals();
        this.shape.name = "hill";
        // SCENE
        this.scene.add(this.shape);
        this.shape.rotation.z += 0.001; 
        // CLONE
        const clone = this.shape.clone();
        clone.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        clone.position.z = 0.1;
        // clone.rotation.x = 0.1309;
        clone.name = "clone";
        this.scene.add(clone);
        // ...
        this.uvTest = this.shape.geometry.attributes.uv.array;
        // this.shape.geometry.computeBoundingBox();

        // var max = this.shape.geometry.boundingBox.max,
        //     min = this.shape.geometry.boundingBox.min;
        // var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
        // var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
        // var faces = this.shape.geometry.position;
        // console.log(this.shape.geometry)

        // this.uvTest = [];

        // for (var i = 0; i < faces.length ; i++) {

        //     var v1 = this.shape.geometry.vertices[faces[i].a], 
        //         v2 = this.shape.geometry.vertices[faces[i].b], 
        //         v3 = this.shape.geometry.vertices[faces[i].c];

        //     this.uvTest.push([
        //         new THREE.Vector2((v1.x + offset.x)/range.x ,(v1.y + offset.y)/range.y),
        //         new THREE.Vector2((v2.x + offset.x)/range.x ,(v2.y + offset.y)/range.y),
        //         new THREE.Vector2((v3.x + offset.x)/range.x ,(v3.y + offset.y)/range.y)
        //     ]);
        // }
        this.shape.uvsNeedUpdate = true;
    }
    update(time) {
        if (this.material) {
            if (this.material.uniforms) {
                this.material.uniforms.uTime.value = time;
            }
        }
    }
    map(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    smoothstep (min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x*x*(3 - 2*x);
    };
}

class Gl {
    constructor() {
        this.rotCam = {
            x: 75 * Math.PI / 180,
            y: 15 * Math.PI / 180
        }
        this.initialize();
    }
    initialize() {
        // RENDERER
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        // SCENE
        this.scene = new THREE.Scene();
        // CAMERA
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.x = 1.25;
        this.camera.position.y = -2.1;
        this.camera.position.z = .75;
        this.camera.rotation.x = this.rotCam.x;
        this.camera.rotation.y = this.rotCam.y;
        // CONTROLS
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.update();
        // RAYCASTER
		this.raycaster = new THREE.Raycaster();
        // ...
        const renderScene = new RenderPass( this.scene, this.camera );
        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
        bloomPass.threshold = 0.5;
        bloomPass.strength = 0.1;
        bloomPass.radius = 1;
        this.composer = new EffectComposer( this.renderer );
        this.composer.addPass( renderScene );
        this.composer.addPass( bloomPass );
    }
    update(time, mouse) {
        // RENDERER
        // this.renderer.setRenderTarget(null);
        // this.renderer.render(this.scene, this.camera);
        this.composer.render();
        // CONTROLS
        // this.controls.update();
        // MOUSE
        this.camera.rotation.x = this.lerp (this.rotCam.x, (-mouse.y / window.innerWidth) * 2 + 1, 0.05);
        this.camera.rotation.y = this.lerp (this.rotCam.y, (-mouse.x / window.innerWidth) * 2 + 1, 0.05);
        // this.camera.rotation.x = (75 * Math.PI / 180) + ((-mouse.y / window.innerWidth) * 2 + 1) * 0.05;
        // this.camera.rotation.y = (15 * Math.PI / 180) + ((-mouse.x / window.innerWidth) * 2 - 1) * 0.075;
        // RAYCASTER
        if (mouse.x && mouse.y) {
            let moused = { x: null, y: null };
            moused.x = (mouse.x / window.innerWidth) * 2 - 1;
	        moused.y = - (mouse.y / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(moused, this.camera);
            this.intersects = this.raycaster.intersectObjects(this.scene.children);
            return this.intersects;
        }
        return null;
    }
    resize() {
        /* WINDOW */
        const width = window.innerWidth
        const height = window.innerHeight
        // ---
        const ratio = width / height
    
        /* CAMERA */
        this.camera.aspect = ratio
        // ---
        this.camera.updateProjectionMatrix()
    
        /* RENDER */
        this.renderer.setSize(width, height)
    
    }
    map(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    lerp (start, end, amt){
        return (1-amt)*start+amt*end
    }
}

class App {
    constructor() {
        this.initialize();
        this.update();
        this.events();
    }

    initialize() {
        // APP
        this.mouse = {x: 0, y: 0, _x: 0, _y: 0, __x: 0, __y: 0};
        // GL
        this.gl = new Gl();
        // GRASS
        // this.grass = new Grass(this.gl.scene);
        // SKY
        this.sky = new Sky(this.gl.scene);
        // BUTTERFLY
        // this.butterfly = new Butterfly(this.gl.scene);
        // HILL
        this.hill = new Hill(this.gl.scene);
        // PARTICLES
        this.particles = new Particles(this.gl, this.hill.shape, this.hill.uvTest);
    }

    update(time) {
        // MOUSE
        this.mouse.x = this.lerp(this.mouse.x, this.mouse._x, 0.05);
        this.mouse.y = this.lerp(this.mouse.y, this.mouse._y, 0.05);
        // LOOP
        requestAnimationFrame(this.update.bind(this));
        // TIME
        time /= 1000;
        // GL
        const intersects = this.gl.update(time, this.mouse);
        // GRASS
        // this.grass.update(time);
        // BUTTERFLY
        // this.butterfly.update(time);
        // HILL
        this.hill.update(time);
        // PARTICLES
        this.particles.update(time, intersects, this.mouse);
    }

    events() {
        window.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        window.addEventListener("resize", this.onResize.bind(this), false)
    }

    onResize(e) {
        // GL
        this.gl.resize();
    }

    onMouseMove(e) {
        // APP
        this.mouse._x = e.clientX;
        this.mouse._y = e.clientY;
    }


    lerp (start, end, amt){
        return (1-amt)*start+amt*end
    }
}

const app = new App();