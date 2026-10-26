import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { AudioTrack, PlayStatus } from '~/experiences/core/audio'

/** Wires an experience's audio track to the player overlay and credits fades of an audio page. */
export function useAudioPlayer(main: Readonly<Ref<HTMLElement | null>>) {
  const status = ref<PlayStatus>('idle')
  let track: AudioTrack | null = null
  let unsubscribe: (() => void) | null = null
  let ctx: gsap.Context | undefined

  function attach(audio: AudioTrack) {
    unsubscribe?.()
    track = audio
    unsubscribe = track.subscribe((next) => {
      status.value = next
    })
  }

  function play() {
    void track?.play()
  }

  function showStatus(next: PlayStatus) {
    ctx?.add(() => {
      gsap.to('.button__load', { autoAlpha: next === 'loading' ? 1 : 0, duration: 0.75 })
      gsap.to('.button__play', { autoAlpha: next === 'idle' ? 1 : 0, duration: 0.75 })
      if (next !== 'playing') return
      gsap.to(['.text_ref', '.text_informations'], { autoAlpha: 0.5, duration: 0.75 })
      gsap.to('.section_player', { autoAlpha: 0, duration: 0.75 })
    })
  }

  watch(status, showStatus)

  onMounted(() => {
    ctx = gsap.context(() => {
      gsap.set('.button__load', { autoAlpha: 0 })
      gsap.to(main.value, { opacity: 1, duration: 1 })
    }, main.value!)
    showStatus(status.value)
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
    track = null
    ctx?.revert()
  })

  return { attach, play }
}
