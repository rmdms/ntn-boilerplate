<script setup lang="ts">
import { inject, nextTick, onMounted, ref, shallowRef } from 'vue'
import { Color } from 'three'
import ExperienceHost from '../../app/components/ExperienceHost.client.vue'
import type { ExperienceFactory, ExperienceState } from '../../app/experiences/core/experience'
import { EXPERIENCE_CANVAS, getRendererHost } from '../../app/experiences/core/renderer-host'
import { createStubExperience, type StubProbe, type StubVariant } from './stub-experience'

// Test-only page, registered by nuxt.config.ts when NUXT_PUBLIC_E2E is set.

const factory = shallowRef<ExperienceFactory | null>(null)
const mountKey = ref(0)
const state = ref<ExperienceState | 'idle'>('idle')
const canvas = inject(EXPERIENCE_CANVAS)

onMounted(() => {
  if (!canvas?.value) throw new Error('experience canvas missing from layout')
  const host = getRendererHost(canvas.value)
  const probe: StubProbe = { uniformTextureDisposed: false }
  const api = {
    probe,
    memory: () => host.memory(),
    state: () => state.value,
    rendererState: () => ({
      clearColor: host.renderer.getClearColor(new Color()).getHex(),
      clearAlpha: host.renderer.getClearAlpha(),
      toneMapping: host.renderer.toneMapping,
      exposure: host.renderer.toneMappingExposure,
    }),
    mount(variant: StubVariant) {
      state.value = 'idle'
      mountKey.value++
      factory.value = () => createStubExperience(variant, probe)
      return nextTick()
    },
    unmount() {
      factory.value = null
      return nextTick()
    },
  }
  ;(window as unknown as { __e2e: typeof api }).__e2e = api
})
</script>

<template>
  <main id="main">
    <h1>dispose fixture</h1>
    <ExperienceHost v-if="factory" :key="mountKey" :factory="factory" @state="state = $event" />
  </main>
</template>
