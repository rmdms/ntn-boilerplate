<script setup lang="ts">
const images = [
  { src: '/images/south_thailand_01.jpg', orientation: 'vertical' as const },
  { src: '/images/south_thailand_02.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_03.jpg', orientation: 'vertical' as const },
  { src: '/images/south_thailand_04.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_05.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_06.jpg', orientation: 'vertical' as const },
  { src: '/images/south_thailand_07.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_08.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_09.jpg', orientation: 'horizontal' as const },
  { src: '/images/south_thailand_10.jpg', orientation: 'horizontal' as const }
]
</script>

<template>
  <TravelGallery :images="images" />
</template>
