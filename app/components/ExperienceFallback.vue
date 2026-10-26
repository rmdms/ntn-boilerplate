<template>
  <p class="experience-fallback tt__subtitle fs__sm" role="status">
    This experience could not start.
    <NuxtLink to="/">Back home</NuxtLink>
  </p>
</template>

<style scoped>
.experience-fallback {
  position: relative;
  z-index: 2;
}
.experience-fallback a {
  margin-left: 12px;
  text-decoration: underline;
}
</style>
