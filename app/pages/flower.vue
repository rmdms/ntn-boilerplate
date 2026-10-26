<script setup lang="ts">
import { createFlower } from '~/experiences/flower'

useTheme('dark')

const main = useTemplateRef<HTMLElement>('main')
const surface = useTemplateRef<HTMLElement>('surface')
const { attach, play } = useAudioPlayer(main)

function factory() {
  const flower = createFlower({ controlsTarget: () => surface.value })
  attach(flower.audio)
  return flower
}
</script>

<template>
  <main id="main" ref="main" class="experience-page">
    <div ref="surface" class="orbit__surface" />
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <AudioPlayer tight-explain @play="play" />
    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a> + <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API" target="_blank">Web Audio API</a></p>
    <p class="text_ref">Music : <a href="https://www.youtube.com/watch?v=lcg6wekmCRA" target="_blank">All Night - Big Boi</a></p>
    <ExperienceHost :factory="factory" />
  </main>
</template>

<style scoped>
#main {
  position: relative;
  height: 90vh;
  margin: 5vh 7.5vw;
  overflow: hidden;
  opacity: 0;
}
#main .orbit__surface {
  position: fixed;
  inset: 0;
  z-index: 1;
}
#main.experience-page .link__back {
  z-index: 3;
}
#main.experience-page .text_ref,
#main.experience-page .text_informations {
  opacity: 0;
}
@media (hover: hover) and (pointer: fine) and (min-width: 601px) {
  #main {
    height: calc(100vh - 10vh);
    overflow: visible;
  }
}
</style>
