<script setup lang="ts">
import { gsap } from 'gsap'
import { createPhotography } from '~/experiences/photography'
import type { ExperienceState } from '~/experiences/core/experience'
import {
  LETTER_DURATION,
  LETTER_STAGGER,
  MOVE_START,
  SCROLLBAR_DURATION,
  SUBTITLE_DURATION,
  TITLE_IN_AT,
  TITLE_OUT_AT,
  TRIPS,
  type Step
} from '~/experiences/photography/slider'

useTheme('dark')

const main = useTemplateRef<HTMLElement>('main')
const scrollbar = useTemplateRef<HTMLElement>('scrollbar')
let ctx: gsap.Context | undefined
let revealed = false

const slideElements = () => [...(main.value?.querySelectorAll<HTMLElement>('.slide') ?? [])]

function parts(slide: HTMLElement, reversed: boolean) {
  const letters = [...slide.querySelectorAll('.tt__title .letter')]
  return {
    letters: reversed ? letters.reverse() : letters,
    subtitle: slide.querySelector('p')!,
    link: slide.querySelector('a.tt__subtitle')!
  }
}

function animateStep({ from, to, direction, timing }: Step) {
  const slides = slideElements()
  const currentSlide = slides[from]
  const otherSlide = slides[to]
  if (!ctx || !currentSlide || !otherSlide || !scrollbar.value) return
  const current = parts(currentSlide, direction > 0)
  const other = parts(otherSlide, direction > 0)
  const percent = to * (100 / (slides.length - 1))

  ctx.add(() => {
    gsap.timeline()
      .set(otherSlide, { autoAlpha: 1, zIndex: 2 }, 0)
      .set([...other.letters, other.subtitle, other.link], { opacity: 0 }, 0)
      .to([current.subtitle, current.link], { opacity: 0, duration: SUBTITLE_DURATION }, 0)
      .to(scrollbar.value, { width: `${percent}%`, duration: SCROLLBAR_DURATION }, MOVE_START)
      .to(current.letters, { opacity: 0, duration: LETTER_DURATION, stagger: LETTER_STAGGER }, TITLE_OUT_AT)
      .to(other.letters, { opacity: 1, duration: LETTER_DURATION, stagger: LETTER_STAGGER }, TITLE_IN_AT)
      .to(other.subtitle, { opacity: 1, duration: SUBTITLE_DURATION }, timing.appearAt)
      .to(other.link, { duration: 0.25, clearProps: 'opacity' }, timing.appearAt)
      .set(currentSlide, { autoAlpha: 0, zIndex: 1 }, timing.end)
  })
}

// A failed start disposes the run, and the page must still show its fallback.
function onState(state: ExperienceState) {
  if (revealed || (state !== 'running' && state !== 'disposed')) return
  revealed = true
  ctx?.add(() => gsap.to(main.value, { opacity: 1, duration: 0.75 }))
}

const factory = () => createPhotography({ onStep: animateStep })

onMounted(() => {
  ctx = gsap.context(() => {}, main.value!)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <main ref="main" class="section__works">
    <NuxtLink class="link__back" to="/" draggable="false">Rémy Dumas</NuxtLink>
    <div class="works__slider">
      <div class="slider__wrapper">
        <div v-for="trip in TRIPS" :key="trip.route" class="slide">
          <p class="tt__subtitle tt__up fs__sm">{{ trip.date }}</p>
          <NuxtLink class="tt__title tt__up fs__xl" :to="trip.route" draggable="false"><SplitLetters :text="trip.title" /></NuxtLink>
          <NuxtLink class="tt__subtitle tt__up fs__sm" :to="trip.route" draggable="false">Discover</NuxtLink>
        </div>
      </div>
      <div class="slider__scrollbar">
        <div ref="scrollbar" class="scrollbar__current" />
      </div>
    </div>
    <ExperienceHost :factory="factory" @state="onState" />
  </main>
</template>

<style scoped>
#portfolio .tt__title {
  font-family: 'Rama Gothic C', sans-serif;
  line-height: 0.8;
  font-weight: 900;
  text-transform: uppercase;
}
#portfolio .tt__subtitle {
  font-family: 'Yantramanav', sans-serif;
  letter-spacing: 1px;
  font-weight: 400;
}
#portfolio p.tt__subtitle {
  color: #dfd5ad;
}
#portfolio .fs__sm {
  font-size: 12px;
}
#portfolio .fs__xl {
  font-size: 300px;
}
@media (max-width: 1200px) {
  #portfolio .fs__xl {
    font-size: 25vw;
  }
}
@media (max-width: 400px) {
  #portfolio .fs__xl {
    font-size: 100px;
  }
}
.section__works {
  position: relative;
  height: 100%;
  min-height: 100vh;
  width: 100vw;
  opacity: 0;
  z-index: 2;
  user-select: none;
  -webkit-user-select: none;
}
.section__works .link__back {
  position: absolute;
  top: 0;
  left: 0;
  margin: 5vh 0 0 7.5vw;
  overflow: hidden;
  z-index: 2;
}
.section__works .works__slider .slider__wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.section__works .works__slider .slider__wrapper .slide {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  overflow: hidden;
}
.section__works .works__slider .slider__wrapper .slide:first-child {
  z-index: 2;
}
.section__works .works__slider .slider__wrapper .slide:not(:first-child) {
  opacity: 0;
  visibility: hidden;
}
.section__works .works__slider .slider__wrapper .slide a.tt__title {
  overflow: hidden;
  display: inherit;
}
.section__works .works__slider .slider__wrapper .slide p {
  margin-right: 10%;
  margin-bottom: 1.5%;
}
.section__works .works__slider .slider__wrapper .slide a.tt__subtitle {
  opacity: 0;
  transition: opacity 0.25s;
}
.section__works .works__slider .slider__wrapper .slide:hover a.tt__subtitle {
  opacity: 1;
  transition: opacity 0.25s;
}
.section__works .works__slider .slider__scrollbar {
  position: fixed;
  bottom: 80px;
  left: 50%;
  height: 2px;
  width: 20%;
  min-width: 250px;
  margin: 0 auto;
  background: #4f4f4f;
  border-radius: 50px;
  transform: translate(-50%, -50%);
  z-index: 1;
}
.section__works .works__slider .slider__scrollbar .scrollbar__current {
  height: 2px;
  width: 0;
  background: #fff;
  border-radius: 50px;
}
.section__works .tt__title {
  line-height: 0.8;
}
@media (max-width: 400px) {
  .section__works .works__slider .slider__wrapper .slide p {
    margin-right: 5%;
  }
}
</style>
