<script setup lang="ts">
import { gsap } from 'gsap'

const SIZE = 50

const route = useRoute()

const fine = ref(false)
const root = useTemplateRef<HTMLDivElement>('root')
const svg = useTemplateRef<SVGSVGElement>('svg')
const circle = useTemplateRef<SVGCircleElement>('circle')
let ctx: gsap.Context | undefined
let moveX: gsap.QuickToFunc | undefined
let moveY: gsap.QuickToFunc | undefined

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  moveX?.(event.clientX - SIZE)
  moveY?.(event.clientY - SIZE)
}

function linkOf(target: EventTarget | null) {
  return target instanceof Element ? target.closest('a') : null
}

function onMouseOver(event: MouseEvent) {
  const link = linkOf(event.target)
  if (!link || link === linkOf(event.relatedTarget)) return
  gsap.to(circle.value, { fill: '#fff', attr: { r: 10 }, duration: 0.25 })
}

function shrink() {
  gsap.to(circle.value, { fill: 'none', attr: { r: 5 }, duration: 0.15 })
}

function onMouseOut(event: MouseEvent) {
  const link = linkOf(event.target)
  if (!link || link === linkOf(event.relatedTarget)) return
  shrink()
}

// A link removed by client-side navigation never fires mouseout.
watch(() => route.path, shrink)

onMounted(async () => {
  fine.value = window.matchMedia(FINE_POINTER_QUERY).matches
  if (!fine.value) return
  await nextTick()
  ctx = gsap.context(() => {
    gsap.from(root.value, { opacity: 0, duration: 1.5 })
    moveX = gsap.quickTo(svg.value, 'x', { duration: 0.25 })
    moveY = gsap.quickTo(svg.value, 'y', { duration: 0.25 })
  })
  window.addEventListener('pointermove', onPointerMove)
  document.addEventListener('mouseover', onMouseOver)
  document.addEventListener('mouseout', onMouseOut)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('mouseover', onMouseOver)
  document.removeEventListener('mouseout', onMouseOut)
  gsap.killTweensOf(circle.value)
  ctx?.revert()
})
</script>

<template>
  <div v-if="fine" id="pointer" ref="root">
    <svg id="circle" ref="svg" class="svg" viewBox="25 25 50 50">
      <circle ref="circle" class="shape" cx="50" cy="50" fill="none" stroke="#fff" r="5" stroke-dasharray="100, 100" stroke-dashoffset="0" stroke-linecap="round" stroke-width=".5" />
    </svg>
  </div>
</template>

<style scoped>
#pointer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
  mix-blend-mode: difference;
}
#pointer .svg {
  position: absolute;
  height: 100px;
  width: 100px;
  pointer-events: none;
  mix-blend-mode: difference;
}
</style>
