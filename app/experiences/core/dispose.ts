import type { Material, Object3D, Texture } from "three";
import type { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

function isTexture(value: unknown): value is Texture {
  return (value as Texture | null)?.isTexture === true;
}

// Render-target textures are owned and released by their render target.
function disposeTextureValue(value: unknown) {
  if (isTexture(value) && !value.isRenderTargetTexture) value.dispose();
  else if (Array.isArray(value)) value.forEach(disposeTextureValue);
}

/** Disposes a material and every texture it holds, including textures only referenced from uniforms. */
export function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) disposeTextureValue(value);
  const uniforms = (
    material as Material & { uniforms?: Record<string, { value: unknown }> }
  ).uniforms;
  if (uniforms)
    for (const uniform of Object.values(uniforms))
      disposeTextureValue(uniform?.value);
  material.dispose();
}

type Disposable3D = Object3D & {
  geometry?: { dispose(): void };
  material?: Material | Material[];
  dispose?: () => void;
  background?: unknown;
  environment?: unknown;
};

/** Traverses the object and releases geometries, materials, textures and object-level resources (lights' shadow maps, instance buffers). */
export function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const node = object as Disposable3D;
    node.geometry?.dispose();
    if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
    else if (node.material) disposeMaterial(node.material);
    disposeTextureValue(node.background);
    disposeTextureValue(node.environment);
    if (typeof node.dispose === "function") node.dispose();
  });
}

/** Disposes every pass, then the composer's own render targets and copy pass. */
export function disposeComposer(composer: EffectComposer) {
  for (const pass of composer.passes) pass.dispose();
  composer.dispose();
}
