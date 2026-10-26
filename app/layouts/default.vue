<script setup lang="ts">
import { provide, ref } from 'vue'
import { EXPERIENCE_CANVAS } from '~/experiences/core/renderer-host'

const canvas = ref<HTMLCanvasElement | null>(null)
provide(EXPERIENCE_CANVAS, canvas)

// The prerendered HTML would otherwise show every element in its final state before the page intros start.
// Mounted hooks run child first, so the page has already set its intro start states when this one runs.
const hydrating = ref(true)
onMounted(() => (hydrating.value = false))
</script>

<template>
  <div id="portfolio" :class="{ 'is-hydrating': hydrating }">
    <canvas ref="canvas" class="experience-canvas is-hidden" aria-hidden="true" />
    <CustomPointer />
    <SiteLoader />
    <slot />
  </div>
</template>

<style scoped>
.experience-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.experience-canvas.is-hidden {
  opacity: 0;
}
</style>
