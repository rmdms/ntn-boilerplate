<script setup lang="ts">
import { createAttract } from '~/experiences/attract'

useTheme('dark')
</script>

<template>
  <main id="main" class="experience-page">
    <NuxtLink class="link__back" to="/">Rémy Dumas</NuxtLink>
    <p class="text_informations">Code : <a href="https://developer.mozilla.org/fr/docs/Web/HTML/Canvas" target="_blank">Canvas</a></p>
    <p class="text_ref">Picture : BDE 2018 - MMI Laval</p>
    <ExperienceHost :factory="createAttract" />
  </main>
</template>

<style scoped>
#main {
  position: relative;
  margin: 5vh 7.5vw;
  height: 90vh;
}
</style>
