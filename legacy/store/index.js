export const state = () => ({
    load: true,
    theme: null,
    timeline: null
})

export const mutations = {
    setLoad(state, value) {
        state.load = value
    },
    setTheme(state, value) {
        state.theme = value
        
        let portfolio = document.body
        if (state.theme === 'light') {
            portfolio.classList.remove('theme__dark')
            portfolio.classList.add('theme__light')
        } else if (state.theme === 'dark') {
            portfolio.classList.remove('theme__light')
            portfolio.classList.add('theme__dark')
        }
    },
    setTimeline(state, value) {
        state.timeline = value
    }
}

export const strict = false;