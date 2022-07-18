class Cookie {
    constructor(cookieString, res) {
        this.cookie = {}
        this.res = res
        Cookie._init(this.cookie, cookieString)
    }

    static _init(cookie, str = "") {
        const split = str.split('; ')
        if(Array.isArray(split)) {
            split.forEach(cookie_ => {
                const splitIndex = cookie_.indexOf('=', 0)
                const key = cookie_.substring(0, splitIndex)
                cookie[key] = cookie_.substr(splitIndex + 1, cookie_.length)
            })
        }
    }

    has(key) {
        return !!this.cookie[key]
    }

    get(key) {
        return this.cookie[key] || 'null'
    }

    set(key, value) {
        this.res.setHeader('Set-Cookie', `${key}=${value}`)
    }

    remove(key) {
        this.res.setHeader('Set-Cookie', `${key}=`)
    }
}


module.exports = Cookie
