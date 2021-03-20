module.exports = {
  head: {
    title: 'Rémy Dumas -  Creative Developer',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: "My name is Rémy Dumas, I'm a young creative developer based in Paris, France. Focusing on details, animations and interactions, I'm studying at the Interactive Design & Development class of Gobelins, l'Ecole de l'image." },
      { hid: 'keywords', name: 'keywords', content: "Dumas Rémy, Rmdms, Remsdms, Développeur, Developer, Développeur Web, Web Developer, Développeur Front-End, Front-End Developer, Développeur Créatif, Creative Developer, Creative Technologist, Portfolio, Projets, Web Site, MMI, Métiers du Multimédia et de l'Internet, DUT, Diplôme Universitaire et Technologique, Laval, 53000, Pays de la Loire, BDDI, Bachelor Designer & Developpeur Intéractif, Gobelins, Ecole de l'image, Paris, 75000" }
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

