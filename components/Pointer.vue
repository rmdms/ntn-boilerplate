<template>
  <div id="pointer">
    <svg id="circle" class="svg" viewBox="25 25 50 50">
        <circle class="shape" cx="50" cy="50" fill="none" stroke="#fff" r="5" stroke-dasharray="100, 100" stroke-dashoffset="0" stroke-linecap="round" stroke-width=".5"/>
    </svg>
  </div>
</template>

<script>
import TweenMax from 'gsap'

export default {
    data() {
      return {
        position: {
          x: 0,
          y: 0
        },
        size: 50
      }
    },
    methods: {
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
      // GLOBAL ---
      initialize() {
        this.initializeDOM()
      },
      listen() {
        this.listenUser()
      },

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      // DOM ------
      initializeDOM() {
        this.appearDOM()
      },
      appearDOM() {
        TweenMax.from(document.getElementById('pointer'), 1.5, {
          opacity: 0
        })
      },

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      // USER -----
      listenUser() {
        window.addEventListener('mousemove', this.mousemoveUser)
        for (const link of document.querySelectorAll('a')) {
          link.addEventListener('mouseover', this.mouseoverUser)
          link.addEventListener('mouseout', this.mouseoutUser)
        }
      },
      mouseoverUser(parameter_event) {
        const event = parameter_event

        TweenMax.to(document.querySelector('circle'), 0.25, {
          fill: '#fff',
          attr:{r: 10}
        })
      },
      mouseoutUser(parameter_event) {
        const event = parameter_event

        TweenMax.to(document.querySelector('circle'), 0.15, {
          fill: 'none',
          attr:{r: 5}
        })
      },
      mousemoveUser(parameter_event) {
        const event = parameter_event

        this.$data.position.x = event.clientX
        this.$data.position.y = event.clientY

        TweenMax.to(document.getElementById('circle'), 0.25, {
          x: (this.$data.position.x - this.$data.size),
          y: (this.$data.position.y - this.$data.size)
        })
      },
      
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      
    },
    mounted() {
      setTimeout(()=> {
        this.initialize()
        this.listen()
      }, 0)
    }
}
</script>

<style scoped>
.is__desktop #pointer {
	 position: absolute;
	 top: 0;
	 left: 0;
	 z-index: 999;
	 pointer-events: none;
	 mix-blend-mode: difference;
}
 .is__desktop #pointer .svg {
	 position: absolute;
	 height: 100px;
	 width: 100px;
	 pointer-events: none;
	 mix-blend-mode: difference;
}
 .is__mobile #pointer {
	 display: none;
}
 
</style>