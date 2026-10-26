<script setup lang="ts">
import { gsap } from 'gsap'
import type { AudioTrack, PlayStatus } from '~/experiences/core/audio'
import { createDiscomania } from '~/experiences/discomania'

useTheme('dark')

const main = useTemplateRef<HTMLElement>('main')
const status = ref<PlayStatus>('idle')
let track: AudioTrack | null = null
let unsubscribe: (() => void) | null = null
let ctx: gsap.Context | undefined

function factory() {
  const discomania = createDiscomania()
  unsubscribe?.()
  track = discomania.audio
  unsubscribe = track.subscribe((next) => {
    status.value = next
  })
  return discomania
}

function play() {
  void track?.play()
}

function showStatus(next: PlayStatus) {
  ctx?.add(() => {
    gsap.to('.button__load', { autoAlpha: next === 'loading' ? 1 : 0, duration: 0.75 })
    gsap.to('.button__play', { autoAlpha: next === 'idle' ? 1 : 0, duration: 0.75 })
    if (next !== 'playing') return
    gsap.to(['.text_ref', '.text_informations'], { autoAlpha: 0.5, duration: 0.75 })
    gsap.to('.section_player', { autoAlpha: 0, duration: 0.75 })
  })
}

watch(status, showStatus)

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.set('.button__load', { autoAlpha: 0 })
    gsap.to(main.value, { opacity: 1, duration: 1 })
  }, main.value!)
  showStatus(status.value)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
  track = null
  ctx?.revert()
})
</script>

<template>
  <main id="main" ref="main">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <div class="section_player">
      <div class="container">
        <p class="button__load">Loading</p>
        <p class="button__play" @click="play">Play</p>
      </div>
      <p class="text__explain">This project is an audiovisualization, put on your headphones for a better experience.</p>
    </div>
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
#main .link__back {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: 3;
}
#main .text_ref {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  opacity: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
}
#main .text_informations {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  opacity: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
}
#main .section_player {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  overflow: hidden;
  z-index: 2;
}
#main .section_player .container {
  position: relative;
  margin-bottom: 20px;
}
#main .section_player .container .button__load {
  position: absolute;
  bottom: 0;
  left: 0;
  display: block;
  width: 100%;
  text-align: center;
  padding: 25px 0;
  text-transform: uppercase;
  font-weight: 900;
}
#main .section_player .container .button__play {
  opacity: 0;
  visibility: hidden;
  padding: 25px;
  border: white solid 2px;
  border-radius: 25%;
  text-transform: uppercase;
  font-weight: 900;
  transition: all 0.5s ease;
}
#main .section_player .container .button__play:hover {
  background: white;
  color: black;
  transition: all 0.5s ease;
}
#main .section_player .text__explain {
  max-width: 300px;
  font-size: 14px;
  opacity: 0.5;
  text-align: center;
}
@media (hover: hover) and (pointer: fine) {
  #main {
    height: auto;
    overflow: visible;
  }
  #main .section_player {
    height: 100vh;
  }
}
@media (hover: hover) and (pointer: fine) and (min-width: 601px) {
  #main .text_ref {
    left: auto;
    right: 0;
    transform: none;
  }
  #main .text_informations {
    bottom: 0;
    left: 0;
    transform: none;
  }
}
</style>
