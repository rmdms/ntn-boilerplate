<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { ExperienceFactory, ExperienceRun, ExperienceState } from '~/experiences/core/experience'
import { createInput, type Input, type InputMode } from '~/experiences/core/input'
import { EXPERIENCE_CANVAS, getRendererHost, type RendererHost } from '~/experiences/core/renderer-host'
import ExperienceFallback from './ExperienceFallback.vue'

const props = withDefaults(defineProps<{ factory: ExperienceFactory; mode?: InputMode }>(), {
  mode: 'fullscreen',
})
const emit = defineEmits<{ state: [state: ExperienceState]; progress: [ratio: number] }>()

const failed = ref(false)
const canvas = inject(EXPERIENCE_CANVAS, null)
let host: RendererHost | null = null
let run: ExperienceRun | null = null
let stopContextWatch: (() => void) | null = null
let input: Input | null = null

function start() {
  if (!host) return
  failed.value = false
  host.setVisible(true)
  run = host.stage.start(props.factory, {
    onState: (state) => emit('state', state),
    onProgress: (ratio) => emit('progress', ratio),
    onError: (error) => {
      console.error('[experience] failed to start', error)
      failed.value = true
    },
  })
}

function stop() {
  run?.dispose()
  run = null
}

onMounted(() => {
  try {
    if (!canvas?.value) throw new Error('experience canvas missing from layout')
    host = getRendererHost(canvas.value)
  } catch (error) {
    console.error('[experience] WebGL unavailable', error)
    failed.value = true
    // No run will ever report a state, so pages waiting on one to reveal themselves must still hear an end.
    emit('state', 'disposed')
    return
  }
  stopContextWatch = host.onContextChange((lost) => {
    if (lost) {
      stop()
      failed.value = true
    } else {
      start()
    }
  })
  const stage = host.stage
  input = createInput({
    mode: props.mode,
    target: window,
    root: document.documentElement,
    viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
    schedule: (callback) => requestAnimationFrame(callback),
    onFrame: (pointer) => stage.input(pointer),
  })
  start()
})

onBeforeRouteLeave(() => {
  host?.setVisible(false)
})

onBeforeUnmount(() => {
  stopContextWatch?.()
  input?.dispose()
  input = null
  stop()
})
</script>

<template>
  <ExperienceFallback v-if="failed" />
</template>
