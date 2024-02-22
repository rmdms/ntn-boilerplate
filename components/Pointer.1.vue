<template>
  <div id="pointer" v-if="load">
  </div>
</template>

<script>
import SimplexNoise from 'simplex-noise'
import { mapState } from 'vuex'

export default {
    data() {
        return {
            simplex: new SimplexNoise(),
            pointer: {
                size: 100,
                color: '#fff',
                position: {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                }
            },
            particles: {
                size: 0.75,
                color: '#fff',
                array: []
            }
        }
    },
    computed: {
        ...mapState({
            load: state => state.load
        })
    },
    methods: {
        addCanvas() {
            let canvas = document.createElement('canvas')
            this.$data.context = canvas.getContext('2d')
            canvas.height = window.innerHeight
            canvas.width = window.innerWidth
            document.getElementById('pointer').appendChild(canvas)
        },
        addEvents() {
            window.addEventListener('mousemove', this.updatePointer)
        },
        drawArc(parameterArc) {
            this.$data.context.save()
            this.$data.context.beginPath()
            this.$data.context.fillStyle = parameterArc.color
            this.$data.context.arc(parameterArc.position.x, parameterArc.position.y, parameterArc.size, 0, Math.PI * 2, true)
            this.$data.context.fill()
            this.$data.context.closePath()
            this.$data.context.restore()
        },
        drawParticles() {
            for (let angle = 0; angle < (2 * Math.PI); angle += ((2 * Math.PI) / 2000)) {
                let particle = {
                    size: this.$data.particles.size,
                    color: this.$data.particles.color,
                    position: {
                        x: (Math.cos(angle) * this.$data.pointer.size),
                        y: Math.sin(angle) * this.$data.pointer.size,
                        _x: (Math.cos(angle) * this.$data.pointer.size),
                        _y: Math.sin(angle) * this.$data.pointer.size
                    }
                }
                this.$data.particles.array.push(particle)
                this.drawArc(particle)
		    }
        },
        updateCanvas(time) {
            requestAnimationFrame(this.updateCanvas)
            this.$data.context.clearRect(0, 0, window.innerWidth, window.innerHeight)
            this.drawArc(this.$data.pointer)
            this.updateParticles(time)
        },
        updatePointer(e) {
            this.$data.pointer.position.x = e.clientX
            this.$data.pointer.position.y = e.clientY
        },
        updateParticles(time) {
            if (this.$data.particles.array.length) {
                for (let i = 0; i < this.$data.particles.array.length; i++) {
                    const particle = this.$data.particles.array[i]
                    const noise = this.$data.simplex.noise2D(particle.position.x + time, particle.position.y + time)
                    particle.position.x = particle.position._x + this.$data.pointer.position.x
		            particle.position.y = particle.position._y + this.$data.pointer.position.y
                    particle.position.x += Math.sin(time / 1000 * noise) * noise * 10
                    particle.position.y += Math.cos(time / 1000 * noise) * noise * 10
                    if (Math.sin(time * noise) * noise * 2 < 0) {
                        particle.color = "#fff"
                    } else {
                        particle.color = "#000"
                    }
                    this.drawArc(particle)
                }
            } else {
                this.drawParticles()
            }
        },
        
    },
    mounted() {
        this.addCanvas()
        this.updateCanvas()
        this.addEvents()
    }
}
</script>

<style scoped>
</style>