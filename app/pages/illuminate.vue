<script setup lang="ts">
import { gsap } from 'gsap'
import type { ExperienceState } from '~/experiences/core/experience'
import { createIlluminate, type IlluminateExperience } from '~/experiences/illuminate'

useTheme('dark')

const WORDS = 'CLICK TO ILLUMINATE'.split(' ')

const main = useTemplateRef<HTMLElement>('main')
let ctx: gsap.Context | undefined
let experience: IlluminateExperience | null = null
let introduced = false

const animate = (tweens: () => void) => ctx?.add(tweens)

const addLetters = () => animate(() => {
  gsap.fromTo('#content p span', { y: 30, opacity: 0 }, { y: 15, opacity: 1, duration: 0.75, ease: 'power1.out', stagger: 0.05 })
})
const removeLetters = () => animate(() => {
  gsap.to('#content p span', { y: '-=30', opacity: 0, duration: 0.25, ease: 'power1.in' })
})
const addTitle = () => animate(() => {
  gsap.to('#content h1', { opacity: 1, duration: 0.75, ease: 'power1.out' })
})
const removeTitle = () => animate(() => {
  gsap.to('#content h1', { opacity: 0, duration: 0.25, ease: 'power1.out' })
})

const factory = () => {
  experience = createIlluminate({
    onDrop: removeTitle,
    onResetStart(hadLights) {
      if (!hadLights) return
      removeLetters()
      removeTitle()
    },
    onResetRestore() {
      addLetters()
      addTitle()
    },
  })
  return experience
}

function onState(state: ExperienceState) {
  if (state === 'running' && !introduced) {
    introduced = true
    addLetters()
    addTitle()
  }
  if (state === 'disposed') experience = null
}

onMounted(() => {
  ctx = gsap.context(() => {}, main.value!)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <main id="main" ref="main" class="experience-page">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>

    <div id="content">
      <p><template v-for="(word, w) in WORDS" :key="w">{{ w ? ' ' : '' }}<span v-for="(char, c) in word" :key="c">{{ char }}</span></template></p>
      <h1>HAPPY NEW YEAR</h1>
    </div>
    <div id="reset" @click="experience?.reset()">
      <div id="p-circle">
        <div id="circle"></div>
        <div id="cross">
          <div id="left"></div>
          <div id="right"></div>
        </div>
      </div>
      <p></p>
    </div>

    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a> + <a href="http://schteppe.github.io/cannon.js/" target="_blank">CannonJS</a></p>
    <p class="text_ref">Dribbble : <a href="https://dribbble.com/shots/5774627-New-Year-Illuminations" target="_blank">New Year Illuminations - Nathan Riley</a></p>

    <ExperienceHost :factory="factory" @state="onState" />
  </main>
</template>

<style scoped>
#main {
  position: relative;
  margin: 5vh 7.5vw;
  height: calc(100vh - 10vh);
  height: calc(100dvh - 10dvh);
}
#main.experience-page .text_ref {
  bottom: 0;
  right: 0;
  left: auto;
  transform: none;
}
#main.experience-page .text_informations {
  bottom: 0;
  left: 0;
  transform: none;
}
#main #content {
  position: relative;
  z-index: 2;
}
#main #content h1 {
  color: black;
  text-shadow: -1px 0 rgba(100, 100, 100, 0.75), 0 1px rgba(100, 100, 100, 0.75), 1px 0 rgba(100, 100, 100, 0.75), 0 -1px rgba(100, 100, 100, 0.75);
  font-family: Morganite;
  font-size: 335px;
  text-align: center;
  white-space: nowrap;
  opacity: 0;
  position: fixed;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
}
#main #content p {
  position: relative;
  color: white;
  font-family: Morganite;
  font-size: 35px;
  text-align: center;
  white-space: nowrap;
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
}
#main #content p span {
  position: relative;
  display: inline-block;
  opacity: 0;
}
#main #reset {
  position: fixed;
  top: 55%;
  left: 2.25em;
  transform: translateY(-50%);
  z-index: 2;
}
#main #circle {
  border: 1px solid rgba(100, 100, 100, 0.75);
  width: 65px;
  height: 65px;
  border-radius: 100px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
#main #p-circle {
  cursor: pointer;
  border: 1px solid white;
  width: 45px;
  height: 45px;
  border-radius: 100px;
  position: relative;
  transition: all 0.5s ease-out;
}
#main #cross {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
}
#main #left {
  content: "";
  width: 15px;
  height: 1px;
  background: rgba(100, 100, 100, 0.75);
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
#main #right {
  content: "";
  width: 1px;
  height: 15px;
  background: rgba(100, 100, 100, 0.75);
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
#main #circle::after {
  content: "";
  width: 1px;
  height: 20px;
  background: rgba(100, 100, 100, 0.75);
  display: block;
  position: absolute;
  top: 100%;
  right: 50%;
}
#main #reset p {
  margin-top: 35px;
  height: 40px;
  color: white;
  font-family: Morganite;
  font-size: 25px;
  letter-spacing: 2.5px;
  text-align: center;
  white-space: nowrap;
  text-align: center;
  position: relative;
  overflow: hidden;
}
#main #reset p::before {
  content: "RESET";
  position: absolute;
  width: 100%;
  left: 0;
  transition: all 0.5s;
}
#main #reset p::after {
  content: "RESET";
  position: absolute;
  width: 100%;
  left: 0;
  transform: translateY(100%);
  transition: all 0.5s;
}
@media (hover: hover) and (pointer: fine) {
  #main #p-circle:hover {
    background: white;
  }
  #main #p-circle:hover + p::before {
    transform: translateY(-100%);
    transition: all 0.5s ease-out;
  }
  #main #p-circle:hover + p::after {
    transform: translateY(0);
    transition: all 0.5s ease-out;
  }
}
@media (hover: none), (pointer: coarse) {
  #main #content h1 {
    font-size: min(335px, 23vw);
  }
}
@media (max-width: 600px) {
  #main.experience-page .text_ref {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  #main.experience-page .text_informations {
    bottom: 25px;
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
