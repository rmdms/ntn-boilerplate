<script setup lang="ts">
defineProps<{ tightExplain?: boolean }>()
defineEmits<{ play: [] }>()
</script>

<template>
  <div class="section_player">
    <div class="container">
      <p class="button__load">Loading</p>
      <p class="button__play" @click="$emit('play')">Play</p>
    </div>
    <p :class="['text__explain', { 'text__explain--tight': tightExplain }]">This project is an audiovisualization, put on your headphones for a better experience.</p>
  </div>
</template>

<style scoped>
#main .section_player {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  overflow: hidden;
  z-index: 2;
}
#main .section_player .container {
  position: relative;
  margin-bottom: 20px;
}
#main .section_player .container .button__load {
  position: absolute;
  bottom: 0;
  left: 0;
  display: block;
  width: 100%;
  text-align: center;
  padding: 25px 0;
  text-transform: uppercase;
  font-weight: 900;
}
#main .section_player .container .button__play {
  opacity: 0;
  visibility: hidden;
  padding: 25px;
  border: white solid 2px;
  border-radius: 25%;
  text-transform: uppercase;
  font-weight: 900;
  transition: all 0.5s ease;
}
#main .section_player .container .button__play:hover {
  background: white;
  color: black;
  transition: all 0.5s ease;
}
#main .section_player .text__explain {
  max-width: 300px;
  font-size: 14px;
  opacity: 0.5;
  text-align: center;
}
#main .section_player .text__explain.text__explain--tight {
  line-height: 1.25;
}
</style>
