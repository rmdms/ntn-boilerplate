<template>
  <div id="loader" v-if="!load">
    <p>
      <span>Developer.</span>
      <span>Student.</span>
      <span>Photographer.</span>
    </p>    

  </div>
</template>

<script>
import { mapMutations, mapState } from 'vuex'

export default {
  computed: {
    ...mapState({
      load: state => state.load
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme",
      setLoad: "setLoad"
    })
  },
  mounted() {
    this.setTheme('light')
    this.setLoad(true)
  }
}
</script>

<style scoped>
#loader {
	 display: flex;
	 justify-content: center;
	 align-items: center;
	 height: auto;
	 min-height: 100vh;
	 width: 100%;
	 background: rgba(255, 255, 255, 1.0);
	 color: #141414;
}
</style>
