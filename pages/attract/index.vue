<template>
  <main id="main" v-if="load">
    <a class="link__back" href="/">Rémy Dumas</a>
    <p class="text_informations">Code : <a href="https://developer.mozilla.org/fr/docs/Web/HTML/Canvas" target="_blank">Canvas</a></p>
    <p class="text_ref">Picture : BDE 2018 - MMI Laval</p>
    <canvas id="canvas"></canvas>
  </main>
</template>

<script>
import { mapMutations, mapState } from 'vuex'

export default {
  data () {
    return {
    }
  },
  computed: {
    ...mapState({
      load: state => state.load
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme"
    }),
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // GLOBAL ---
    initialize() {
      this.initializeDOM()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    //  DOM -----
    initializeDOM() {
      this.setTheme('dark')
      this.appearDOM()
    },
    appearDOM() {
      const timeline = new TimelineMax()
      require('~/assets/scripts/attract/script.js')
    }
  },
  mounted() {
    setTimeout(()=> {
      this.initialize()
    }, 0)
  }
}
</script>

<style scoped lang="scss">
  #main {
    position: relative;
    margin: 5vh 7.5vw;
    canvas {
      height: 100vh;
      widows: 100vw;
      background: black;
    }
    .link__back {
      position: absolute;
      top: 0; left: 0;
      overflow: hidden;
      z-index: 2;
    }
    .text_ref {
      position: absolute;
      bottom: 0; right: 0;
      font-size: 14px;
      opacity: 0.5;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      z-index: 2;
    }
    .text_informations {
      position: absolute;
      bottom: 0; left: 0;
      font-size: 14px;
      opacity: 0.5;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      z-index: 2;
    }
    .button__play {
      position: absolute;
      bottom: 50%; left: 50%;
      text-transform: uppercase;
      transform: translate(-50%, -50%);
      overflow: hidden;
      z-index: 2;
    }
  }
  .is {
    &__desktop {
      #main {
        height: calc(100vh - 10vh);
        .text_ref {
          bottom: 0; right: 0;
        }
        .text_informations {
          bottom: 0; left: 0;
        }
        @media (max-width: 600px) {
          .text_ref {
            bottom: 0; left: 50%;
            transform: translateX(-50%);
          }
          .text_informations {
            bottom: 25px; left: 50%;
            transform: translateX(-50%);
          }
        }
      }
    }
    &__mobile {
      #main {
        height: 90vh;
        .text_ref {
          bottom: 0; left: 50%;
          transform: translateX(-50%);
        }
        .text_informations {
          bottom: 25px; left: 50%;
          transform: translateX(-50%);
        }
      }
    }
  }
</style>
