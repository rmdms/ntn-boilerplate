<template>
  <main id="main" v-if="load">
    <a class="link__back" href="/">Rémy Dumas</a>
    <a class="link__pictures" href="/photography">Gallery</a>
    <div class="section_pictures">
      <div class="img img-vertical">
        <img src="/images/croatia_01.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_02.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_03.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_04.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_05.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_06.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_07.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_08.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_09.jpg" alt="">
      </div>
      <div class="img img-vertical">
        <img src="/images/croatia_10.jpg" alt="">
      </div>
    </div>
  </main>
</template>

<script>
import TweenMax from 'gsap'
import { mapMutations, mapState } from 'vuex'

export default {
  data () {
    return {
      scroll: null,
      timeline: null
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
    listen() {
      this.listenUser()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    //  DOM -----
    initializeDOM() {
      this.setTheme('dark')
      this.appearDOM()
    },
    appearDOM() {
      TweenMax.from(document.querySelector('main'), 1.25, {
        autoAlpha: 0.0
      })
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // USER -----
    listenUser() {
      window.addEventListener('wheel', this.wheelUser)
      window.addEventListener('resize', this.resizeUser)
    },
    wheelUser(parameter_event) {
      const event = parameter_event

      const parent = document.querySelector('.section_pictures')
      const elements = parent.querySelectorAll('img')
      let delta = event.deltaY / 120 || -event.detail / 3 || 0
      const height = -(parent.clientHeight)
      const time = 0.5

      this.$data.scroll -= parseInt(delta * 45)
      
      if ((delta > 1) || (delta < -1)) {
        delta *=  0.15
      } 

      if (this.$data.scroll > 0) {
        delta = 0
        this.$data.scroll = 0
      } else if (this.$data.scroll < height + elements[elements.length-1].clientHeight * 1.25) {
        delta = 0
        this.$data.scroll = height + elements[elements.length-1].clientHeight * 1.25
      }
      
      TweenMax.staggerTo(elements, time, {
        y: this.$data.scroll + delta,
        skewY: `${delta * 2.5}deg`,
        onComplete: ()=>{
          TweenMax.staggerTo(elements, time, {
            skewY: `${0}deg`
          }, 0.001)
        }
      }, 0.001)
    },
    // wheelUser(parameter_event) {
    //   const event = parameter_event

    //   const parent = document.querySelector('.section_pictures')
    //   const elements = parent.querySelectorAll('.img')
    //   let delta = event.deltaY / 120 || -event.detail / 3 || 0
    //   const height = -(parent.clientHeight)

    //   this.$data.scroll -= parseInt(delta * 45)

    //   if (this.$data.scroll > 0) {
    //     delta = 0
    //     this.$data.scroll = 0
    //   } else if (this.$data.scroll < height + elements[elements.length-1].clientHeight) {
    //     delta = 0
    //     this.$data.scroll = height + elements[elements.length-1].clientHeight
    //   }

    //   TweenMax.staggerTo(elements, 0.5, {
    //     y: this.$data.scroll + delta,
    //     skewY: `${delta * 2.5}deg`
    //   }, 0.001, 0)
    // },
    resizeUser(parameter_event) {
      this.wheelUser(parameter_event)
    }

  },
  mounted() {
    setTimeout(()=> {
      this.initialize()
      this.listen()
    }, 0)
  }
}
</script>

<style scoped lang="scss">
  #main {
    position: relative;
    height: calc(100vh - 10vh);
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
    .link__pictures {
      position: absolute;
      top: 0; right: 0;
      overflow: hidden;
      z-index: 2;
    }
    .section_pictures {
      position: absolute;
      top: 0; left: 0;
      margin: 5vw 5vh;
      .img {
        margin: 5vw 5vh;
        &.img-horizontal {
          width: calc(75% - 4vw);
        }
        &.img-vertical {
          width: calc(55% - 4vw);
        }
        &:nth-child(even) {
          float: left;
        }
        &:nth-child(odd) {
          float: right;
        }
        img {
          width: 100%;
        }
      }
      // .img-horizontal {
      //   img {
      //     width: 100%;
      //   }
      // }
    }
  }
  .is {
    &__desktop {
      #main {
        .img {
          @media (max-width: 600px) {
            float: inherit !important;
            margin: 50px auto;
            width: 100% !important;
          }
        }
      }
    }
    &__mobile {
      #main {
        .img {
          float: inherit !important;
          margin: 50px auto;
          width: 100% !important;
        }
        .section_pictures {
          // position: relative;
        }
      }
    }
  }
</style>
