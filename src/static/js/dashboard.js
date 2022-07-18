function request(url, params) {
    return new Promise((resolve, reject) => {
        try {
            fetch(url).then(async r => {
                resolve(JSON.parse(await r.text()))
            }).catch(e => {
                reject(e)
            })

        } catch (e) {
            reject(e)
        }
    })
}


new Vue({
    el: '#app',
    data: {
        currentTab: 'dashboard',
        pageUrl: '/page/dashboard'
    },
    methods: {
        async startUpHandle() {
            console.log('starting...')
            console.log(await request('/control/startup'))
        },
        async stopHandle() {
            console.log('stopping...')
            console.log(await request('/control/stop'))
        },
        logoutHandle() {
            location.href = '/login'
        },
        changeMenu(tab) {
            this.currentTab = tab
            this.pageUrl = '/page/' + tab
        }
    }
})

