<template>
  <header id="header" v-if="load">
    <router-link to="/">Rémy Dumas</router-link>
  </header>
</template>

<script>
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState({
      load: state => state.load
    })
  },
  mounted() {
  }
}
</script>

<style scoped lang="scss">
#header {
  position: fixed;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100vw;
}
.is {
  &__desktop {
    #header {
      padding: 80px 160px;
      
      @media (max-width: 1000px) {
        padding: 8vw 16vw;
      }
      
      @media (max-width: 600px) {
        padding: 48px 16vw;
      }
    }
  }
  &__mobile {
    #header {
      padding: 30px 35px;
    }
  }
}
</style>


// https://codepen.io/DonKarlssonSan/pen/QvdKPb?editors=0010
// https://codepen.io/ClementRoche/pen/QzLKov?editors=0010