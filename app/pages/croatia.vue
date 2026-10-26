<script setup lang="ts">
const images = [
  { src: '/images/croatia_01.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_02.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_03.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_04.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_05.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_06.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_07.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_08.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_09.jpg', orientation: 'vertical' as const },
  { src: '/images/croatia_10.jpg', orientation: 'vertical' as const }
]
</script>

<template>
  <TravelGallery :images="images" />
</template>
