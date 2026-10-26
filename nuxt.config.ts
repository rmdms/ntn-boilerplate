import { fileURLToPath } from "node:url";

const siteURL = "https://www.remydumas.fr";
const title = "Rémy Dumas -  Creative Developer";
const description =
  "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Passionate about digital art and creative technologies, I am currently graduating from a Master in Design and Management of Interactive Innovation at the Gobelins school and I am looking to join an interactive design studio as a creative developer. I am specialized in front-end and creative development. I particularly like physical installations, immersive artworks and engaged experiences. Today, I am willing to learn more about 3D graphics. Alongside my studies, I worked in 3 digital companies on projects for various clients like Pom'Potes, Withings, WWF, Microqlima Records, Louvre Museum and EDF.";
const keywords =
  "Dumas Rémy, Rmdms, Remsdms, Développeur, Developer, Développeur Web, Web Developer, Développeur Front-End, Front-End Developer, Développeur Créatif, Creative Developer, Creative Technologist, Portfolio, Projets, Web Site, MMI, Métiers du Multimédia et de l'Internet, DUT, Diplôme Universitaire et Technologique, Laval, 53000, Pays de la Loire, BDDI, Bachelor Designer & Developpeur Intéractif, DMII, Design et Managenement de l'Innovation Interactive, Gobelins, Ecole de l'image, Paris, 75000, digital art, art numérique, creative technologies, technologies créative, installation numérique, digital installations, physical installations, installations physique, immersive artworks, immersive experiences, œuvres d'art immersives, expériences immersives, engaged experiences, expériences engagées";
const imageURL = `${siteURL}/images/og_image.jpg`;

// Test-only fixture page for tests/e2e/dispose.e2e.ts; absent from production builds.
const e2e = Boolean(process.env.NUXT_PUBLIC_E2E);
const e2eRoute = "/__e2e/dispose";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  ssr: true,
  modules: ["@nuxt/image"],
  css: ["~/assets/styles/main.css"],
  image: {
    provider: "ipxStatic",
    format: ["avif", "webp"],
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title,
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no",
        },
        { name: "description", content: description },
        { name: "keywords", content: keywords },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: imageURL },
        { property: "og:url", content: siteURL },
        { property: "og:site_name", content: title },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageURL },
        { name: "twitter:site", content: "@remsdms" },
        { name: "twitter:creator", content: "@remsdms" },
      ],
      link: [
        { rel: "canonical", href: siteURL },
        { rel: "icon", type: "image/x-icon", href: "/images/favicon.ico" },
      ],
    },
  },
  typescript: {
    strict: true,
  },
  hooks: {
    "pages:extend"(pages) {
      if (!e2e) return;
      pages.push({
        name: "e2e-dispose",
        path: e2eRoute,
        file: fileURLToPath(new URL("./tests/fixtures/e2e-dispose.vue", import.meta.url)),
      });
    },
  },
  nitro: {
    prerender: { routes: e2e ? [e2eRoute] : [] },
  },
});
