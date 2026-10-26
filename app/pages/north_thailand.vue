<script setup lang="ts">
const images = [
  { src: '/images/north_thailand_01.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_02.jpg', orientation: 'vertical' as const },
  { src: '/images/north_thailand_03.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_04.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_05.jpg', orientation: 'vertical' as const },
  { src: '/images/north_thailand_06.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_07.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_08.jpg', orientation: 'vertical' as const },
  { src: '/images/north_thailand_09.jpg', orientation: 'horizontal' as const },
  { src: '/images/north_thailand_10.jpg', orientation: 'horizontal' as const }
]
</script>

<template>
  <TravelGallery :images="images" />
</template>
