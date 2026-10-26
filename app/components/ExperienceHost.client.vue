<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { ExperienceFactory, ExperienceRun, ExperienceState } from '~/experiences/core/experience'
import { EXPERIENCE_CANVAS, getRendererHost, type RendererHost } from '~/experiences/core/renderer-host'
import ExperienceFallback from './ExperienceFallback.vue'

const props = defineProps<{ factory: ExperienceFactory }>()
const emit = defineEmits<{ state: [state: ExperienceState]; progress: [ratio: number] }>()

const failed = ref(false)
const canvas = inject(EXPERIENCE_CANVAS, null)
let host: RendererHost | null = null
let run: ExperienceRun | null = null
let stopContextWatch: (() => void) | null = null

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
  start()
})

onBeforeRouteLeave(() => {
  host?.setVisible(false)
})

onBeforeUnmount(() => {
  stopContextWatch?.()
  stop()
})
</script>

<template>
  <ExperienceFallback v-if="failed" />
</template>
