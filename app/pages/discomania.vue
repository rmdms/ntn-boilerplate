<script setup lang="ts">
import { createDiscomania } from '~/experiences/discomania'

useTheme('dark')

const main = useTemplateRef<HTMLElement>('main')
const { attach, play } = useAudioPlayer(main)

function factory() {
  const discomania = createDiscomania()
  attach(discomania.audio)
  return discomania
}
</script>

<template>
  <main id="main" ref="main" class="experience-page">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <AudioPlayer @play="play" />
    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a> + <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API" target="_blank">Web Audio API</a></p>
    <p class="text_ref">Music : <a href="https://www.youtube.com/watch?v=lcg6wekmCRA" target="_blank">Everything Black - Unlike Pluto</a></p>
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
#main.experience-page .link__back {
  z-index: 3;
}
#main.experience-page .text_ref,
#main.experience-page .text_informations {
  opacity: 0;
}
@media (hover: hover) and (pointer: fine) {
  #main {
    height: auto;
    overflow: visible;
  }
  #main.experience-page .section_player {
    height: 100vh;
  }
}
</style>
