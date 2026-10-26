<script setup lang="ts">
import { loadTracker, type LoadStatus } from '~/experiences/core/asset-loader'

const SHOW_DELAY_MS = 300

const route = useRoute()
const visible = ref(false)
const status = ref<LoadStatus>({ phase: 'idle', ratio: 0 })
let showTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribe: (() => void) | undefined

function clearTimer() {
  clearTimeout(showTimer)
  showTimer = undefined
}

function onStatus(next: LoadStatus) {
  status.value = next
  if (next.phase === 'loading') {
    if (!visible.value && !showTimer) showTimer = setTimeout(() => (visible.value = true), SHOW_DELAY_MS)
    return
  }
  clearTimer()
  visible.value = next.phase === 'error'
}

onMounted(() => {
  unsubscribe = loadTracker.subscribe(onStatus)
})

watch(() => route.path, () => {
  if (status.value.phase !== 'error') return
  visible.value = false
  status.value = { phase: 'idle', ratio: 0 }
})

onBeforeUnmount(() => {
  clearTimer()
  unsubscribe?.()
})
</script>

<template>
  <Transition name="site-loader">
    <div
      v-if="visible"
      id="loader"
      :role="status.phase === 'error' ? 'alert' : 'progressbar'"
      aria-label="Loading"
      :aria-valuenow="status.phase === 'error' ? undefined : Math.round(status.ratio * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <p>
        <span>Developer.</span>
        <span>Student.</span>
        <span>Photographer.</span>
      </p>
      <p v-if="status.phase === 'error'" class="loader__error">
        This page could not load.
        <NuxtLink to="/">Back home</NuxtLink>
      </p>
      <div v-else class="loader__bar" :style="{ transform: `scaleX(${status.ratio})` }" />
    </div>
  </Transition>
</template>

<style scoped>
#loader {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 1);
  color: #141414;
}
.loader__bar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #141414;
  transform-origin: left center;
  transition: transform 0.2s linear;
}
.loader__error {
  margin-top: 12px;
}
.loader__error a {
  margin-left: 12px;
  text-decoration: underline;
}
.site-loader-leave-active {
  transition: opacity 0.4s ease;
}
.site-loader-leave-to {
  opacity: 0;
}
</style>
