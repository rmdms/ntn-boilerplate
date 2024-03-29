<template>
  <main id="main" v-if="load">
    <a class="link__back" href="/">Rémy Dumas</a>
    <div class="section_player">
      <div class="container">
        <p class="button__load">Loading</p>
        <p class="button__play">Play</p>
      </div>
      <p class="text__explain">This project is an audiovisualization, put on your headphones for a better experience.</p>
      <p class="text__safari" v-if="isSafari">Don't forget to accept the sound content reading.</p>
    </div>
    <p class="text_informations">Code : <a href="https://threejs.org/" target="_blank">ThreeJS</a> + <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API" target="_blank">Web Audio API</a></p>
    <p class="text_ref">Music : <a href="https://www.youtube.com/watch?v=lcg6wekmCRA" target="_blank">Everything Black - Unlike Pluto</a></p>
  </main>
</template>

<script>
import { mapMutations, mapState } from 'vuex'

export default {
  data () {
    return {
      isSafari: false
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
      this.checkNavigator()
      this.appearDOM()
    },
    checkNavigator() {
      const isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
      
      if (isSafari && iOS) {
          this.$data.isSafari = true
      } else if(isSafari) {
          this.$data.isSafari = true
      }
    },
    appearDOM() {
      const timeline = new TimelineMax()
      timeline.to(document.getElementById('main'), 1, {
        opacity: 1,
        onComplete: ()=>{
          require('~/assets/scripts/black/script.js')
        }
      })
    },
  },
  mounted() {
    setTimeout(()=> {
      this.initialize()
    }, 0)
  }
}
</script>

<style scoped>
#main {
	 position: relative;
	 margin: 5vh 7.5vw;
	 opacity: 0;
}
 #main .link__back {
	 position: absolute;
	 top: 0;
	 left: 0;
	 overflow: hidden;
	 z-index: 3;
}
 #main .text_ref {
	 position: absolute;
	 font-size: 14px;
	 opacity: 0;
	 text-align: center;
	 white-space: nowrap;
	 overflow: hidden;
	 z-index: 2;
}
 #main .text_informations {
	 position: absolute;
	 font-size: 14px;
	 opacity: 0;
	 text-align: center;
	 white-space: nowrap;
	 overflow: hidden;
	 z-index: 2;
}
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
 #main .section_player .text__safari {
	 max-width: 300px;
	 font-size: 14px;
	 opacity: 0.5;
	 text-align: center;
}
 .is__desktop #main .section_player {
	 height: 100vh;
}
 .is__desktop #main .text_ref {
	 bottom: 0;
	 right: 0;
}
 .is__desktop #main .text_informations {
	 bottom: 0;
	 left: 0;
}
 @media (max-width: 600px) {
	 .is__desktop #main .text_ref {
		 bottom: 0;
		 left: 50%;
		 transform: translateX(-50%);
	}
	 .is__desktop #main .text_informations {
		 bottom: 25px;
		 left: 50%;
		 transform: translateX(-50%);
	}
}
 .is__mobile #main {
	 height: 90vh;
	 overflow: hidden;
}
 .is__mobile #main .text_ref {
	 bottom: 0;
	 left: 50%;
	 transform: translateX(-50%);
}
 .is__mobile #main .text_informations {
	 bottom: 25px;
	 left: 50%;
	 transform: translateX(-50%);
}
 
</style>
