<script setup lang="ts">
import { createField } from '~/experiences/field'

useTheme('light')
</script>

<template>
  <main id="main" class="experience-page">
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
</style>
