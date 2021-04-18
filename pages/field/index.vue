<template>
  <main id="main" v-if="load">
    <a class="link__back" href="/">Rémy Dumas</a>
    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a></p>
    <p class="text_ref">Twitter : <a href="https://twitter.com/MichaelSungaila/status/1183958085179592704" target="_blank">Environment art - Michael Sungaila</a></p>
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
      this.setTheme('light')
      this.appearDOM()
    },
    appearDOM() {
      if (!document.querySelector('.is__mobile')) {
        require('~/assets/scripts/field/script.js')
      }
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
    #content {
      position: relative;
      z-index: 2;
    }
    #content h1 {
        color: black;
        text-shadow: -1px 0 rgba(100, 100, 100, 0.75), 0 1px rgba(100, 100, 100, 0.75), 1px 0 rgba(100, 100, 100, 0.75), 0 -1px rgba(100, 100, 100, 0.75);
        font-family: Morganite;
        font-size: 335px;
        text-align: center;
        white-space: nowrap;
        opacity: 0;
        position: fixed;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    #content p {
        position: relative;
        color: white;
        font-family: Morganite;
        font-size: 35px;
        text-align: center;
        white-space: nowrap;
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    #content p span {
        position: relative;
        display:inline-block;
    }
    #reset {
        position: fixed;
        top: 55%;
        left: 2.25em;
        transform: translateY(-50%);
        z-index: 2;
    }

    #circle {
        border: 1px solid rgba(100, 100, 100, 0.75);
        width: 65px;
        height: 65px;
        border-radius: 100px; 
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    #p-circle {
        cursor: pointer;
        border: 1px solid white;
        width: 45px;
        height: 45px;
        border-radius: 100px; 
        position: relative;
        transition: all .5s ease-out;
    }

    #p-circle:hover {
        background: white;
    }

    #cross {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
    }

    #left {
        content: "";
        width: 15px;
        height: 1px;
        background: rgba(100, 100, 100, 0.75);
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    #right {
        content: "";
        width: 1px;
        height: 15px;
        background: rgba(100, 100, 100, 0.75);
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    #circle::after {
        content: "";
        width: 1px;
        height: 20px;
        background: rgba(100, 100, 100, 0.75);
        display: block;
        position: absolute;
        top: 100%;
        right: 50%;

    }

    #reset p {
        margin-top: 35px;
        height: 40px;
        color: white;
        font-family: Morganite;
        font-size: 25px;
        letter-spacing: 2.5px;
        text-align: center;
        white-space: nowrap;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    #p-circle:hover + p::before {
        transform: translateY(-100%);
        transition: all .5s ease-out;
    }

    #p-circle:hover + p::after {
        transform: translateY(0);
        transition: all .5s ease-out;
    }

    #reset p::before {
        content: "RESET";
        position: absolute;
        width: 100%;
        left: 0;
        transition: all .5s;
    }

    #reset p::after {
        content: "RESET";
        position: absolute;
        width: 100%;
        left: 0;
        transform: translateY(100%);
        transition: all .5s;
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
        .section__mobile {
            display: none;
          .text__explain {
          }
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
        position: relative;
        height: calc(100vh - 10vh);
        margin: 5vh 7.5vw;
        #reset, #content {
          display: none !important;
        }
        .section__mobile {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          overflow: hidden;
          .text__explain {
            text-align: center;
            opacity: 0.5;
          }
        }
        .text_ref {
          display: none;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
        }
        .text_informations {
          display: none;
          bottom: 25px; left: 50%;
          transform: translateX(-50%);
        }
      }
    }
  }
</style>
