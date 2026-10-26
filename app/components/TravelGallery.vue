<script setup lang="ts">
import { gsap } from 'gsap'

type Orientation = 'vertical' | 'horizontal'

const props = defineProps<{ prefix: string, orientations: string }>()

const images = computed(() => [...props.orientations].map((code, index) => ({
  src: `/images/${props.prefix}_${String(index + 1).padStart(2, '0')}.jpg`,
  orientation: (code === 'V' ? 'vertical' : 'horizontal') as Orientation
})))

const SIZES: Record<Orientation, string> = {
  vertical: '100vw md:60vw',
  horizontal: '100vw md:80vw'
}

useTheme('dark')

const main = useTemplateRef<HTMLElement>('main')
const pictures = useTemplateRef<HTMLElement>('pictures')
let ctx: gsap.Context | undefined

const imageElements = () => [...(pictures.value?.querySelectorAll('img') ?? [])]

const { listen } = useWheelScroll({
  targets: imageElements,
  min: () => -(pictures.value?.clientHeight ?? 0) + (imageElements().at(-1)?.clientHeight ?? 0) * 1.25,
  y: step => step.scroll + step.delta,
  skew: step => step.delta * 2.5,
  clampOnResize: true
})

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from(main.value, { autoAlpha: 0, duration: 1.25 })
  })
  listen()
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <main id="main" ref="main">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <NuxtLink class="link__pictures" to="/photography">Gallery</NuxtLink>
    <div ref="pictures" class="section_pictures">
      <div v-for="image in images" :key="image.src" :class="['img', `img-${image.orientation}`]">
        <NuxtPicture :src="image.src" alt="" loading="lazy" :sizes="SIZES[image.orientation]" />
      </div>
    </div>
  </main>
</template>

<style scoped>
#main {
  position: relative;
  height: calc(100vh - 10vh);
  margin: 5vh 7.5vw;
}
#main .link__back {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: 2;
}
#main .link__pictures {
  position: absolute;
  top: 0;
  right: 0;
  overflow: hidden;
  z-index: 2;
}
#main .section_pictures {
  position: absolute;
  top: 0;
  left: 0;
  margin: 5vw 5vh;
}
#main .section_pictures .img {
  margin: 5vw 5vh;
}
#main .section_pictures .img.img-horizontal {
  width: calc(75% - 4vw);
}
#main .section_pictures .img.img-vertical {
  width: calc(55% - 4vw);
}
#main .section_pictures .img:nth-child(even) {
  float: left;
}
#main .section_pictures .img:nth-child(odd) {
  float: right;
}
#main .section_pictures .img :deep(img) {
  width: 100%;
}
@media not all and (hover: hover) and (pointer: fine), (max-width: 600px) {
  #main .img {
    float: inherit !important;
    margin: 50px auto;
    width: 100% !important;
  }
}
</style>
