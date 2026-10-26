<script setup lang="ts">
useTheme('dark')

const routes = ['flower', 'discomania', 'illuminate', 'field', 'attract', 'photography', 'croatia', 'netherlands', 'sweden', 'north_thailand', 'south_thailand']
</script>

<template>
  <main id="main">
    <ul>
      <li v-for="route in routes" :key="route">
        <NuxtLink :to="`/${route}`">{{ route }}</NuxtLink>
      </li>
    </ul>
  </main>
</template>
