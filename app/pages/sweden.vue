<script setup lang="ts">
const images = [
  { src: '/images/sweden_01.jpg', orientation: 'horizontal' as const },
  { src: '/images/sweden_02.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_03.jpg', orientation: 'horizontal' as const },
  { src: '/images/sweden_04.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_05.jpg', orientation: 'horizontal' as const },
  { src: '/images/sweden_06.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_07.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_08.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_09.jpg', orientation: 'vertical' as const },
  { src: '/images/sweden_10.jpg', orientation: 'horizontal' as const }
]
</script>

<template>
  <TravelGallery :images="images" />
</template>
