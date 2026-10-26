<script setup lang="ts">
import { createField } from '~/experiences/field'

useTheme('light')
</script>

<template>
  <main id="main">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a></p>
    <p class="text_ref">Twitter : <a href="https://twitter.com/MichaelSungaila/status/1183958085179592704" target="_blank">Environment art - Michael Sungaila</a></p>
    <ExperienceHost :factory="createField" />
  </main>
</template>

<style scoped>
#main {
  position: relative;
  margin: 5vh 7.5vw;
  height: 90vh;
}
#main .link__back {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: 2;
}
#main .text_ref,
#main .text_informations {
  position: absolute;
  font-size: 14px;
  opacity: 0.5;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
  left: 50%;
  transform: translateX(-50%);
}
#main .text_ref {
  bottom: 0;
}
#main .text_informations {
  bottom: 25px;
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
