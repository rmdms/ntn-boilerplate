<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

useTheme('dark')
</script>

<template>
  <div id="portfolio">
    <main class="error">
      <h1 class="tt__subtitle fs__sm">{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
      <a href="/" @click.prevent="clearError({ redirect: '/' })">Rémy Dumas</a>
    </main>
  </div>
</template>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  gap: 24px;
}
</style>
