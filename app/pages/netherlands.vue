<script setup lang="ts">
const images = [
  { src: '/images/netherland_01.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_02.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_03.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_04.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_05.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_06.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_07.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_08.jpg', orientation: 'vertical' as const },
  { src: '/images/netherland_09.jpg', orientation: 'horizontal' as const },
  { src: '/images/netherland_10.jpg', orientation: 'vertical' as const }
]
</script>

<template>
  <TravelGallery :images="images" />
</template>
