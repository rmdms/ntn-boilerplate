<template>
  <div id="portfolio">
    <Loader/>
    <Pointer/>
    <!-- <Header/> -->
    <Nuxt/>
  </div>
</template>

<script>
import TweenMax from 'gsap'
import { mapMutations, mapState } from 'vuex'
import Pointer from '~/components/Pointer.vue'
import Loader from '~/components/Loader.vue'
import Header from '~/components/Header.vue'

export default {
  components: {
    Loader,
    Pointer,
    Header
  },
  computed: {
    ...mapState({
      timeline: state => state.timeline
    })
  },
  methods: {
    ...mapMutations({
      setTheme: "setTheme"
    }),
    detectDevice() {
      if( navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)) {
        document.body.classList.add('is__mobile')
        document.querySelector('#portfolio').classList.add('is__mobile')
      } else {
        document.body.classList.add('is__desktop')
        document.querySelector('#portfolio').classList.add('is__desktop')
      }
    }
  },
  mounted() {
    const isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)
    if (isSafari) {
      window.onwheel = function(){ return false; }
    }
    this.detectDevice()
  }
}
</script>

<style lang="scss">
  * {
    box-sizing: border-box;
    outline: none;
    cursor: none !important;
  }
  a, body, canvas, footer, h1, h2, h3, h4, h5, h6, header, html, img, li, nav, p, section, span, ul {
    margin: 0;
    padding: 0;
    border: 0;
    vertical-align: baseline;
  }
  html, body {
    height: auto;
    width: 100%;
  }
  a{
    text-decoration: none;
  }
  ul {
    display: inline-block;
    list-style:none;
    margin-left:0;
    padding-left:0;
  }
  li {
    display: block;
  }
  canvas {
    position: fixed;
    top: 0; left: 0;
    z-index: 0;
  }
  section {
    margin-bottom: 80px;
  }
  span {
    display: inline-block;
  }
  img {
    display: block;
  }
// ---
  @font-face {
    font-family: 'Circular';
    src: url('~static/fonts/circular_standart/circular_standart_book.woff') format('woff');
    font-weight: 500;
    font-style: normal;
    font-display: fallback;
  }
  @font-face {
    font-family: 'Futura';
    src: url('~static/fonts/futura/futura_light.woff') format('woff');
    font-weight: 200;
    font-style: normal;
    font-display: fallback;
  }
  @font-face {
    font-family: 'Morganite';
    src: url('~static/fonts/morganite_semibold/morganite_semibold.woff') format('woff');
    font-style: normal;
    font-display: fallback;
  }
  @font-face {
    font-family: 'B';
    src: url('~static/fonts/b.woff') format('woff');
    font-style: normal;
    font-display: fallback;
  }
  @font-face {
    font-family: 'C';
    src: url('~static/fonts/C.woff') format('woff');
    font-style: normal;
    font-display: fallback;
  }
  @font-face {
    font-family: 'Rama Gothic C';
    src: url('~static/fonts/rama_gothic/rama_gothic_c_heavy.eot') format('embedded-opentype'),
         url('~static/fonts/rama_gothic/rama_gothic_c_heavy.woff') format('woff'),
         url('~static/fonts/rama_gothic/rama_gothic_c_heavy.ttf') format('truetype');
    font-weight: 900;
    font-style: normal;
    font-display: fallback;
  }
// ---
body {
  overflow: hidden;
  &.theme {
    &__dark {
      background: rgba(0,0,0,0.95);
      color: #fff;
      a {
        color: #fff;
      }
    }
    &__light {
      background: rgba(255,255,255,1.0);
      color: #141414;
      a {
        color: #141414;
      }
    }
  }
  // 
  &.is {
    &__desktop {
      overflow: hidden;
    }
    &__mobile {
    }
  }
}
// ---
  #portfolio {
    position: relative;
    width: 100%;
    font-family: 'Circular', sans-serif;
    font-size: 18px;
    font-weight: 500;
    line-height: 2;
    word-spacing: 1px;
    text-rendering: optimizeLegibility;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
    // 
    &.is {
      &__desktop {
        height: 100vh;
        overflow: hidden;
      }
      &__mobile {
      }
    }
    //
    .tt {
      &__subtitle {
        font-family: 'Futura', sans-serif;
        letter-spacing: 5px;
        text-transform: uppercase;
      }
    }
    .fs {
      &__sm {
        font-size: 14px;
        font-weight: 200;
      }
    }
  }
</style>

