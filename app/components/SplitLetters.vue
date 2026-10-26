<script setup lang="ts">
const props = defineProps<{ text: string }>()

const words = computed(() => props.text.split(' ').map(word => [...word]))
</script>

<template>
  <span class="split-letters">
    <span class="split-letters__label">{{ text }}</span>
    <span aria-hidden="true">
      <template v-for="(letters, i) in words" :key="i">
        <span v-if="i" class="word">&nbsp;</span>
        <span class="word"><span v-for="(letter, j) in letters" :key="j" class="letter">{{ letter }}</span></span>
      </template>
    </span>
  </span>
</template>

<style scoped>
.split-letters {
  display: inline;
}
.split-letters__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
