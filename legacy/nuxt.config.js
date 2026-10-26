import Project from "./project.js";

const env = process.env.NODE_ENV;
const fullURL = `${Project.siteURL}${Project.baseURL}`;

module.exports = {
  head: {
    title: 'Rémy Dumas -  Creative Developer',
    meta: [
      // BASE
      { charset: "utf-8" },
      { "http-equiv": "X-UA-Compatible", content: "IE=edge, chrome=1" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no"
      },
      // SEO
      {
        hid: "description",
        name: "description",
        content: "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Passionate about digital art and creative technologies, I am currently graduating from a Master in Design and Management of Interactive Innovation at the Gobelins school and I am looking to join an interactive design studio as a creative developer. I am specialized in front-end and creative development. I particularly like physical installations, immersive artworks and engaged experiences. Today, I am willing to learn more about 3D graphics. Alongside my studies, I worked in 3 digital companies on projects for various clients like Pom'Potes, Withings, WWF, Microqlima Records, Louvre Museum and EDF."
      },
      { rel: "canonical", href: fullURL },
      {
        name: "keywords",
        content: "Dumas Rémy, Rmdms, Remsdms, Développeur, Developer, Développeur Web, Web Developer, Développeur Front-End, Front-End Developer, Développeur Créatif, Creative Developer, Creative Technologist, Portfolio, Projets, Web Site, MMI, Métiers du Multimédia et de l'Internet, DUT, Diplôme Universitaire et Technologique, Laval, 53000, Pays de la Loire, BDDI, Bachelor Designer & Developpeur Intéractif, DMII, Design et Managenement de l'Innovation Interactive, Gobelins, Ecole de l'image, Paris, 75000, digital art, art numérique, creative technologies, technologies créative, installation numérique, digital installations, physical installations, installations physique, immersive artworks, immersive experiences, œuvres d'art immersives, expériences immersives, engaged experiences, expériences engagées"
      },
      // OPEN GRAPH
      { name: "og:type", content: "website" },
      { name: "og:title", content: Project.head.title },
      {
        name: "og:description",
        content: "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Passionate about digital art and creative technologies, I am currently graduating from a Master in Design and Management of Interactive Innovation at the Gobelins school and I am looking to join an interactive design studio as a creative developer. I am specialized in front-end and creative development. I particularly like physical installations, immersive artworks and engaged experiences. Today, I am willing to learn more about 3D graphics. Alongside my studies, I worked in 3 digital companies on projects for various clients like Pom'Potes, Withings, WWF, Microqlima Records, Louvre Museum and EDF."
      },
      {
        name: "og:image",
        content:
          `${fullURL}${Project.head.imageURL}`
      },
      { name: "og:url", content: fullURL },
      {
        name: "og:site_name”",
        content: Project.head.title
      },
      // TWITTER CARD
      {
        name: "twitter:title",
        content: Project.head.title
      },
      {
        name: "twitter:description",
        content: "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Passionate about digital art and creative technologies, I am currently graduating from a Master in Design and Management of Interactive Innovation at the Gobelins school and I am looking to join an interactive design studio as a creative developer. I am specialized in front-end and creative development. I particularly like physical installations, immersive artworks and engaged experiences. Today, I am willing to learn more about 3D graphics. Alongside my studies, I worked in 3 digital companies on projects for various clients like Pom'Potes, Withings, WWF, Microqlima Records, Louvre Museum and EDF."
      },
      {
        name: "twitter:image",
        content:
          `${fullURL}${Project.head.imageURL}`
      },
      {
        name: "twitter:site",
        content:
          Project.head.twitterAccount
      },
      {
        name: "twitter:creator",
        content:
          Project.head.twitterAccount
      }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/images/favicon.ico' }
    ]
  },
  mode: 'spa',
  loading: false,
  build: {
    // extend (config, { isDev, isClient }) {
    //   if (isDev && isClient) {
    //     config.module.rules.push({
    //       enforce: 'pre',
    //       test: /\.(js|vue)$/,
    //       loader: 'eslint-loader',
    //       exclude: /(node_modules)/
    //     })
    //   }
    // }
  }
}

