import {
  AdditiveBlending,
  DataTexture,
  DynamicDrawUsage,
  FloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  type Material,
  type Matrix4,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  type WebGLProgramParametersWithUniforms,
} from "three";

/** Struct-of-arrays light list: xyz per light, linear rgb per light (intensity folded in), one radius per light. */
export interface LightBuffer {
  count: number;
  readonly position: Float32Array;
  readonly color: Float32Array;
  readonly radius: Float32Array;
}

export function createLightBuffer(capacity: number): LightBuffer {
  return {
    count: 0,
    position: new Float32Array(capacity * 3),
    color: new Float32Array(capacity * 3),
    radius: new Float32Array(capacity),
  };
}

export interface LightPartition {
  /** Lights [0, glowCount) only get a glow sprite. */
  glowCount: number;
  shadedStart: number;
  shadedCount: number;
}

/** The most recent lights (end of the buffer) are shaded; older ones beyond the maximum keep only a glow. */
export function partitionLights(
  total: number,
  maxShaded: number,
): LightPartition {
  const shadedCount = Math.min(total, maxShaded);
  const shadedStart = total - shadedCount;
  return { glowCount: shadedStart, shadedStart, shadedCount };
}

/** Texel i of row 0 holds the view-space position and radius of light start + i, row 1 its colour. */
export function packLights(
  data: Float32Array,
  capacity: number,
  lights: LightBuffer,
  start: number,
  count: number,
  view: Matrix4,
) {
  const e = view.elements;
  for (let i = 0; i < count; i++) {
    const s = (start + i) * 3;
    const x = lights.position[s]!;
    const y = lights.position[s + 1]!;
    const z = lights.position[s + 2]!;
    const p = i * 4;
    data[p] = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
    data[p + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
    data[p + 2] = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
    data[p + 3] = lights.radius[start + i]!;
    const c = (capacity + i) * 4;
    data[c] = lights.color[s]!;
    data[c + 1] = lights.color[s + 1]!;
    data[c + 2] = lights.color[s + 2]!;
    data[c + 3] = 1;
  }
}

const fragmentUniforms = /* glsl */ `
uniform highp sampler2D lightFieldTexture;
uniform int lightFieldCount;
`;

// Windowed linear falloff, matching legacy (non-physical) point lights with decay 1.
const fragmentLoop = (capacity: number) => /* glsl */ `
for ( int i = 0; i < ${capacity}; i ++ ) {
  if ( i >= lightFieldCount ) break;
  vec4 lightFieldA = texelFetch( lightFieldTexture, ivec2( i, 0 ), 0 );
  vec3 lightFieldVector = lightFieldA.xyz - geometryPosition;
  float lightFieldDistance = length( lightFieldVector );
  if ( lightFieldDistance >= lightFieldA.w ) continue;
  IncidentLight lightFieldLight;
  lightFieldLight.direction = lightFieldVector / max( lightFieldDistance, 1e-4 );
  lightFieldLight.color = texelFetch( lightFieldTexture, ivec2( i, 1 ), 0 ).rgb * ( 1.0 - lightFieldDistance / lightFieldA.w );
  lightFieldLight.visible = true;
  RE_Direct( lightFieldLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
}
`;

export interface LightFieldOptions {
  /** Largest shaded count any quality level uses; fixes the texture width and the loop bound. */
  capacity: number;
}

export interface LightField {
  readonly capacity: number;
  readonly texture: DataTexture;
  readonly uniforms: {
    lightFieldTexture: { value: DataTexture };
    lightFieldCount: { value: number };
  };
  /** Clamped to the capacity. */
  maxShaded: number;
  /** Latest partition computed by `update`. */
  readonly partition: LightPartition;
  /** Adds the light loop to a lit built-in material (Phong, Lambert, Standard, Physical); never recompiles on count changes. */
  patch(material: Material): void;
  /** Packs the shaded lights in view space and sets the count uniform. */
  update(lights: LightBuffer, view: Matrix4): LightPartition;
  dispose(): void;
}

export function createLightField({ capacity }: LightFieldOptions): LightField {
  const data = new Float32Array(capacity * 2 * 4);
  const texture = new DataTexture(data, capacity, 2, RGBAFormat, FloatType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const uniforms = {
    lightFieldTexture: { value: texture },
    lightFieldCount: { value: 0 },
  };
  let maxShaded = capacity;
  let partition: LightPartition = {
    glowCount: 0,
    shadedStart: 0,
    shadedCount: 0,
  };

  return {
    capacity,
    texture,
    uniforms,
    get maxShaded() {
      return maxShaded;
    },
    set maxShaded(value: number) {
      maxShaded = Math.max(0, Math.min(capacity, Math.floor(value)));
    },
    get partition() {
      return partition;
    },
    patch(material) {
      const previous = material.onBeforeCompile.bind(material);
      material.onBeforeCompile = (
        shader: WebGLProgramParametersWithUniforms,
        renderer,
      ) => {
        previous(shader, renderer);
        shader.uniforms.lightFieldTexture = uniforms.lightFieldTexture;
        shader.uniforms.lightFieldCount = uniforms.lightFieldCount;
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>\n${fragmentUniforms}`,
          )
          .replace(
            "#include <lights_fragment_begin>",
            `#include <lights_fragment_begin>\n${fragmentLoop(capacity)}`,
          );
      };
      material.customProgramCacheKey = () => `light-field-${capacity}`;
      material.needsUpdate = true;
    },
    update(lights, view) {
      partition = partitionLights(lights.count, maxShaded);
      packLights(
        data,
        capacity,
        lights,
        partition.shadedStart,
        partition.shadedCount,
        view,
      );
      uniforms.lightFieldCount.value = partition.shadedCount;
      texture.needsUpdate = true;
      return partition;
    },
    dispose() {
      texture.dispose();
    },
  };
}

const glowVertex = /* glsl */ `
uniform float glowSize;
varying vec2 vGlowUv;
varying vec3 vGlowColor;
void main() {
  vec4 center = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  center.xy += position.xy * glowSize;
  vGlowUv = uv;
  vGlowColor = instanceColor;
  gl_Position = projectionMatrix * center;
}
`;

const glowFragment = /* glsl */ `
uniform float glowIntensity;
varying vec2 vGlowUv;
varying vec3 vGlowColor;
void main() {
  float d = clamp( 1.0 - length( vGlowUv - 0.5 ) * 2.0, 0.0, 1.0 );
  gl_FragColor = vec4( vGlowColor * glowIntensity * d * d, 1.0 );
  #include <colorspace_fragment>
}
`;

export interface GlowSpritesOptions {
  capacity: number;
  /** World-space diameter of a sprite. */
  size: number;
  intensity: number;
}

export interface GlowSprites {
  readonly mesh: InstancedMesh;
  /** Shows a camera-facing additive sprite for lights [0, count). */
  update(lights: LightBuffer, count: number): void;
  dispose(): void;
}

/** One instanced additive billboard per light that the light loop does not shade. */
export function createGlowSprites({
  capacity,
  size,
  intensity,
}: GlowSpritesOptions): GlowSprites {
  const geometry = new PlaneGeometry(1, 1);
  const material = new ShaderMaterial({
    uniforms: {
      glowSize: { value: size },
      glowIntensity: { value: intensity },
    },
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.instanceColor = new InstancedBufferAttribute(
    new Float32Array(capacity * 3),
    3,
  );
  mesh.instanceColor.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const matrices = mesh.instanceMatrix.array as Float32Array;
  const colors = mesh.instanceColor.array as Float32Array;

  return {
    mesh,
    update(lights, count) {
      const n = Math.min(count, capacity);
      for (let i = 0; i < n; i++) {
        const m = i * 16;
        matrices.fill(0, m, m + 16);
        matrices[m] = matrices[m + 5] = matrices[m + 10] = matrices[m + 15] = 1;
        matrices[m + 12] = lights.position[i * 3]!;
        matrices[m + 13] = lights.position[i * 3 + 1]!;
        matrices[m + 14] = lights.position[i * 3 + 2]!;
        colors[i * 3] = lights.color[i * 3]!;
        colors[i * 3 + 1] = lights.color[i * 3 + 1]!;
        colors[i * 3 + 2] = lights.color[i * 3 + 2]!;
      }
      mesh.count = n;
      if (n > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor!.needsUpdate = true;
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
