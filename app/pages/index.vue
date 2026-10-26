<script setup lang="ts">
import { gsap } from 'gsap'

useTheme('dark')

const INTRODUCTION = "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Passionate about digital art and creative technologies, I am currently looking for engaged and creative projects as a creative developer."

const projects = [
  { to: '/flower', name: 'Flower' },
  { to: '/discomania', name: 'Discomania' },
  { to: '/illuminate', name: 'Illuminate' },
  { to: '/field', name: 'Summer field' },
  { to: '/attract', name: 'Attract' },
  { to: '/photography', name: 'Photography' }
]

const main = useTemplateRef<HTMLElement>('main')
let ctx: gsap.Context | undefined

const { listen } = useWheelScroll({
  targets: () => [...(main.value?.querySelectorAll('section') ?? [])],
  min: () => -(main.value?.clientHeight ?? 0) / 1.5,
  y: step => step.scroll,
  skew: step => step.delta * 7.5
})

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.timeline()
      .from('#content__visual img', { autoAlpha: 0, duration: 1 })
      .from('.section__introduction > p .letter', { y: 500, skewY: 50, duration: 1, stagger: 0.00075 }, '-=0.5')
      .addLabel('introduced')
      .from('.section__projects > h2 .letter', { y: 50, skewY: 50, duration: 0.75, stagger: 0.00075 }, '-=0.25')
      .from('.section__projects ul .letter', { y: 50, skewY: 50, duration: 0.75, stagger: 0.00075 }, '-=0.25')
      .call(listen, [], 'introduced+=0.5')
  }, main.value!)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <main id="main" ref="main">
    <div id="content__informations">
      <section class="section__introduction">
        <p><SplitLetters :text="INTRODUCTION" /></p>
      </section>
      <section class="section__projects">
        <h2 class="tt__subtitle fs__sm"><SplitLetters text="Projects" /></h2>
        <ul>
          <li v-for="project in projects" :key="project.to">
            <NuxtLink :to="project.to"><SplitLetters :text="project.name" /></NuxtLink>
          </li>
        </ul>
      </section>
      <section class="section__agencies">
        <h2 class="tt__subtitle fs__sm">Experiences</h2>
        <p>I am glad to have collaborated and to have been formed with agencies such as Socialclub, Adveris or Innovia. This gave me the opportunity to work on projects for various clients like: Pom'Potes, Withings, WWF, Microqlima Records, Roche Musique, Louvre Museum, Grévin Museum and more.</p>
      </section>
      <section class="section__contact">
        <h2 class="tt__subtitle fs__sm">Contact</h2>
        <p>Reach out by <a href="mailto:remy.benjamin.dumas@gmail.com">Email</a> or on <a href="https://twitter.com/remsdms">Twitter</a>, <a href="https://dribbble.com/remsdms">Dribbble</a>, <a href="https://www.linkedin.com/in/r%C3%A9my-dumas-58475812b/">Linkedin</a>.</p>
      </section>
    </div>
    <div id="content__visual">
      <NuxtPicture src="/images/profil.png" alt="" loading="lazy" sizes="100vw md:70vw" />
    </div>
  </main>
</template>

<style scoped>
#main #content__informations {
  position: relative;
  margin: 0 17vw 0 17vw;
  padding-top: 40vh;
  max-width: 300px;
  z-index: 2;
}
#main #content__informations h2 {
  margin-bottom: 40px;
}
#main #content__informations li a {
  display: block;
}
#main #content__visual {
  position: absolute;
  bottom: 0;
  right: -5vw;
  width: 100%;
  padding-top: 25vh;
  z-index: 1;
}
#main #content__visual :deep(img) {
  height: 75vh;
  width: auto;
  transform: rotateY(180deg);
}
@media (hover: hover) and (pointer: fine) {
  #main #content__informations {
    max-width: 400px;
  }
  #main #content__informations h2,
  #main #content__informations p,
  #main #content__informations li {
    overflow: hidden;
  }
  #main #content__visual {
    max-width: 70vw;
  }
}
@media (hover: hover) and (pointer: fine) and (max-width: 800px) {
  #main #content__visual {
    width: 564px;
    max-width: initial;
    right: -40px;
  }
}
@media not all and (hover: hover) and (pointer: fine) {
  #main #content__visual {
    display: none;
  }
}
</style>
