const http = require('http')
const childProcess = require('child_process')
const url_ = require('url')
const template = require('./Template')
const staticFile = require('./Static')
const config = require('./Config')
const tokenList = new Map()
const uuid = require('uuid')
const {Template} = require("ejs");
const Cookie = require("./Cookie");
const path = require("path");
let javaProcess = null
const fs = require('fs')
let javaLog = []
const os = require('os-utils')
const os_ = require('os')
const moment = require("moment");
const UploadPlugin = require("./UploadPlugin");
const zip = require('extract-zip')

const charts = {
    cpuUsage: [],
    memUsage: []
}

const players = new Map()

class Router {
    constructor() {
        this.routerList = new Map()
    }

    async match(url, req, res) {
        const path = url_.parse(url,true)
        if(this.routerList.has(path.pathname)) {
            const cb = this.routerList.get(path.pathname)
            if(typeof cb === 'function') {
                res.statusCode = 200
                return await cb(req, res)
            }
            res.statusCode = 404
            return '404 Not Found.'
        } else {
            res.statusCode = 404
            return '404 Not Found.'
        }

    }

    addRouter(path, cb) {
        if(!this.routerList.has(path)) {
            this.routerList.set(path, cb)
            return true
        } else {
            return false
        }
    }

    delRouter(path) {
        this.routerList.delete(path)
    }
}

const router = new Router()

router.addRouter('/login', async function (req, res) {
    return template.render('login', {
        bodyContext: 'Render Body'
    })
})

router.addRouter('/doLogin', async function (req, res) {
    const { query } = url_.parse(req.url, true)
    if(query.username === config.auth.username && query.password === config.auth.password) {
        const token = uuid.v4()
        tokenList.set(token, {
            token,
            expire: Date.now() + (10 * 60 * 1000)
        })
        res.setHeader('Set-Cookie', 'v_token=' + token)
        return '<script>location.href = "/dashboard"</script>'
    }
    return '<script>alert("Wrong account password");location.href = "/login"</script>'
})

router.addRouter('/dashboard', (req, res) => {
    if(checkLogin(req, res)) {
        return template.render('dashboard', {})
    }
})


// page
router.addRouter('/page/dashboard', (req, res) => {
    checkLogin(req, res)
    return template.render('page_dashboard', {})
})

router.addRouter('/page/user', (req, res) => {
    checkLogin(req, res)
    return template.render('page_user', {})
})

router.addRouter('/page/operator', (req, res) => {
    checkLogin(req, res)
    return template.render('page_operator', {})
})

router.addRouter('/page/whitelist', (req, res) => {
    checkLogin(req, res)
    return template.render('page_whitelist', {})
})

router.addRouter('/page/setting', (req, res) => {
    checkLogin(req, res)
    return template.render('page_setting', {})
})


// Control Api

// 启动服务器
router.addRouter('/control/startup', async (req, res) => {
    if(!checkLogin(req, res)) return { code: 200, success: false, msg: 'startup failed.'}
    if(javaProcess === null) {
        javaLog = []
        const result = await startupServer()
        return { code: 200, success: true, msg: result}
    }
    return { code: 200, success: false, msg: 'The server is starting'}
})

router.addRouter('/control/stop', (req, res) => {
    checkLogin(req, res)
    if(javaProcess === null) {
        javaLog = []
        return { code: 200, success: false, msg: 'The server not run.'}
    } else {
        javaProcess.kill()
        javaProcess = null
        return { code: 200, success: true, msg: 'kill process'}
    }
})


router.addRouter('/control/getLog', (req, res) => {
    if(checkLogin(req,res)) {
        return javaLog.join('\n')
    }
})

router.addRouter('/control/cmd/op', (req, res) => {
    if(checkLogin(req,res)) {
        if(javaProcess) {
            const username = req.query['name']
            if(username) {
                javaProcess.stdin.write(`op ${username}\n`)
                return { code: 200, success: true, msg: 'add op success'}
            } else {
                return { code: 200, success: false, msg: 'Query "name" is null'}
            }

        } else {
            return { code: 200, success: false, msg: 'Server is not start'}
        }
    }
})

router.addRouter('/control/cmd/deop', (req, res) => {
    if(checkLogin(req,res)) {
        if(javaProcess) {
            const username = req.query['name']
            if(username) {
                javaProcess.stdin.write(`deop ${username}\n`)
                return { code: 200, success: true, msg: 'deop success'}
            } else {
                return { code: 200, success: false, msg: 'Query "name" is null'}
            }

        } else {
            return { code: 200, success: false, msg: 'Server is not start'}
        }
    }
})

router.addRouter('/control/cmd/ban', (req, res) => {
    if(checkLogin(req,res)) {
        if(javaProcess) {
            const username = req.query['name']
            const reason = req.query['reason']
            if(username) {
                javaProcess.stdin.write(`ban ${username} ${reason}\n`)
                return { code: 200, success: true, msg: 'ban success'}
            } else {
                return { code: 200, success: false, msg: 'Query "name" is null'}
            }

        } else {
            return { code: 200, success: false, msg: 'Server is not start'}
        }
    }
})
router.addRouter('/control/cmd/add-whitelist', (req, res) => {
    if(checkLogin(req,res)) {
        if(javaProcess) {
            const username = req.query['name']
            if(username) {
                javaProcess.stdin.write(`whitelist add ${username}\n`)
                return { code: 200, success: true, msg: 'add whitelist success'}
            } else {
                return { code: 200, success: false, msg: 'Query "name" is null'}
            }

        } else {
            return { code: 200, success: false, msg: 'Server is not start'}
        }
    }
})
router.addRouter('/control/cmd/remove-whitelist', (req, res) => {
    if(checkLogin(req,res)) {
        if(javaProcess) {
            const username = req.query['name']
            if(username) {
                javaProcess.stdin.write(`whitelist remove ${username}\n`)
                return { code: 200, success: true, msg: 'remove whitelist success'}
            } else {
                return { code: 200, success: false, msg: 'Query "name" is null'}
            }

        } else {
            return { code: 200, success: false, msg: 'Server is not start'}
        }
    }
})

router.addRouter('/control/config/whitelist', (req, res) => {
    if(checkLogin(req,res)) {
        const json = fs.readFileSync(path.join(__dirname, '../bin', 'whitelist.json')).toString()
        return { code: 200, success: true, data: JSON.parse(json),msg: 'ok'}
    }
})

router.addRouter('/control/config/opList', (req, res) => {
    if(checkLogin(req,res)) {
        const json = fs.readFileSync(path.join(__dirname, '../bin', 'ops.json')).toString()
        return { code: 200, success: true, data: JSON.parse(json),msg: 'ok'}
    }
})

router.addRouter('/control/config/banned-ips', (req, res) => {
    if(checkLogin(req,res)) {
        const json = fs.readFileSync(path.join(__dirname, '../bin', 'banned-ips.json')).toString()
        return { code: 200, success: true, data: JSON.parse(json),msg: 'ok'}
    }
})

router.addRouter('/control/config/banned-players', (req, res) => {
    if(checkLogin(req,res)) {
        const json = fs.readFileSync(path.join(__dirname, '../bin', 'banned-players.json')).toString()
        return { code: 200, success: true, data: JSON.parse(json),msg: 'ok'}
    }
})

router.addRouter('/control/config/user-cache', (req, res) => {
    if(checkLogin(req,res)) {
        const json = fs.readFileSync(path.join(__dirname, '../bin', 'usercache.json')).toString()
        return { code: 200, success: true, data: JSON.parse(json),msg: 'ok'}
    }
})

router.addRouter('/control/config/server', (req, res) => {
    if(checkLogin(req,res)) {
        const configBuffer = fs.readFileSync(path.join(__dirname, '../bin', 'server.properties')).toString()
        const configLine = configBuffer.split('\n')
        const configRet = {}
        configLine.forEach(line => {
            const splitLine = line.split('=')
            if(splitLine.length === 2) {
                configRet[splitLine[0]] = splitLine[1]
            }
        })
        return { code: 200, success: true, data: configRet, msg: 'ok'}
    }
})

router.addRouter('/control/config/server-save', (req, res) => {
    if(checkLogin(req,res)) {
        const {setting} = url_.parse(req.url, true).query
        try {
            const settingJson = JSON.parse(setting)
            const keys = Object.keys(settingJson)
            const line = []
            keys.forEach(key => {
                line.push(key + '=' + settingJson[key])
            })
            fs.writeFileSync(path.join(__dirname, '../bin', 'server.properties'), line.join('\n'))
            return { code: 200, success: true, data: line.join('\n'), msg: 'ok'}
        } catch (e) {
            return { code: 200, success: false, msg: 'save failed'}
        }
    }
})

router.addRouter('/control/server-info', async (req, res) => {
    if(checkLogin(req, res)) {
        const cpuUsage = await new Promise(resolve => {
            os.cpuUsage((v) => {
                resolve(Number((v * 100).toFixed(2)))
            })
        })

        return {
            code: 200,
            success: true,
            msg: 'ok',
            data: {
                memUsage: Number((100 - (os.freememPercentage() * 100).toFixed(2))),
                cpu: os_.cpus()[0].model + ' - ' + os_.cpus()[0].speed + 'M hz x' + os.cpuCount(),
                cpuCore: os.cpuCount(),
                freemem: os.freemem(),
                totalMem: os.totalmem(),
                platform: os.platform(),
                uptime: os.sysUptime(),
                cpuUsage,
                isRunning: javaProcess !== null,
                onlinePlayers: players.size
            }
        }
    }
})

router.addRouter('/control/charts-data', (req, res) => {
    checkLogin(req, res)
    return { code: 200, success: true, msg: 'ok', data: charts}
})

router.addRouter('/control/map-upload', async (req, res) => {
    checkLogin(req, res)
    try {
        if(Array.isArray(req.files.map)) {
            if(javaProcess !== null) {
                javaProcess.kill()
                javaProcess = null
            }
            const file = req.files.map[0]
            if(typeof file === 'object') {
                const newPath = path.join(__dirname, '../bin', `resource_map_${ Date.now() }.zip`)
                fs.linkSync(file.path, newPath)
                if(fs.existsSync(newPath)) {
                    const extractPath = path.join(newPath, '..' , 'extract_' + Date.now())
                    const targetPath = path.join(newPath, '..' , 'world')
                    await zip(newPath, { dir: extractPath })
                    fs.unlinkSync(newPath) // 删除Zip文件
                    rmdir(targetPath + '_old') // 删除旧地图
                    if(fs.existsSync(path.join(extractPath, 'world'))) {
                        fs.renameSync(targetPath, targetPath + '_old_' + Date.now()) // 替换地图 备份
                        fs.renameSync(path.join(extractPath, 'world'), targetPath) // 新地图拷贝到world
                        rmdir(extractPath) // 删除解压目录
                        await startupServer() // 重新启动服务器
                        return { code: 200, success: true, msg: 'ok' }
                    } else {
                        rmdir(extractPath)
                        return { code: 200, success: false, msg: 'zip not found map data' }
                    }

                }
            }
        }
    } catch (e) {
        console.log(e)
        return { code: 200, success: false, msg: 'extract zip failed' }
    }
})

setInterval(async () => {
    const cpuUsage = await new Promise(resolve => {
        os.cpuUsage((v) => {
            resolve(Number((v * 100).toFixed(2)))
        })
    })
    charts.cpuUsage.push({
        time: moment().format('HH:mm:ss'),
        value: cpuUsage
    })
    charts.memUsage.push({
        time: moment().format('HH:mm:ss'),
        value: Number((100 - (os.freememPercentage() * 100).toFixed(2)))
    })
    if(charts.cpuUsage.length > 20) {
        charts.cpuUsage.splice(0, 1)
    }
    if(charts.memUsage.length > 20) {
        charts.memUsage.splice(0, 1)
    }
},5000)

function checkLogin(req, res) {
    if(tokenList.has(req.cookies.get('v_token'))) {
        const tokenInfo = tokenList.get(req.cookies.get('v_token'))
        if(tokenInfo.expire < Date.now()) return setAlert('Token expire time.', '/login')
        return true
    } else {
        res.write(setAlert('Not auth, jump to login!', '/login'))
        res.end()
        throw '__define__'
    }
}


function rmdir(filePath, callback) {
    if(typeof callback !== "function") callback = () => {}
    try {
        fs.stat(filePath, function(err, stat) {
            if(err) return console.log(err.message)
            if(stat.isFile()) {
                fs.unlink(filePath, callback)
            }else {
                fs.readdir(filePath, function(err, data) {
                    if(err) return console.log(err.message)
                    let dirs = data.map(dir => path.join(filePath, dir))
                    let index = 0
                    !(function next() {
                        // 此处递归删除掉所有子文件 后删除当前 文件夹
                        if(index === dirs.length) {
                            fs.rmdir(filePath, callback)
                        }else {
                            rmdir(dirs[index++],next)
                        }
                    })()
                })
            }
        })
    } catch (e) {
        console.log(e.message)
    }
    // 先判断当前filePath的类型(文件还是文件夹,如果是文件直接删除, 如果是文件夹, 去取当前文件夹下的内容, 拿到每一个递归)
}

function startupServer() {
    if(javaProcess !== null) javaProcess.kill()
    let timer = null
    return new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            try {
                javaProcess.kill()
                resolve(false)
            } catch (e) {
                javaProcess = null
                resolve(false)
            }
        }, 1000 * 3 * 60) // 3分钟定时器启动失败就 throw
        javaProcess = childProcess.spawn(path.join(config.javaPath || '', 'java'), ['-Xms350M','-Xmx2048M','-jar', path.join(__dirname, '../bin', 'server.jar'), 'nogui'], {cwd: path.join(__dirname, '../bin')})
        javaProcess.stdout.on("data", chunk => {
            const str = chunk.toString()
           //javaLog.push(str)
            if(str.indexOf('You need to agree to the EULA') > 0) {
                // 第一次启动选择同意
                fs.writeFileSync(path.join(__dirname, '../bin', 'eula.txt'), 'eula=true')
                javaProcess.kill()
                clearTimeout(timer)
                startupServer().then(() => {
                    resolve(true)
                }).catch(err => {
                    resolve(false)
                })
            } else if(str.indexOf('For help, type "help"') > 0) {
                clearTimeout(timer)
                resolve(true)
            } else if(str.indexOf('joined the game') > 0) {
                const nameMatch = /:\s(.*?)\sjoined/gm.exec(str)
                if(nameMatch) {
                    players.set(nameMatch[1], {
                        time: Date.now()
                    })
                }
            } else if(str.indexOf('left the game') > 0) {
                const nameMatch = /:\s(.*?)\sleft/gm.exec(str)
                if(nameMatch) {
                    players.delete(nameMatch[1])
                }
            } else {
                // user use command reg record
                const commandReg = /:\s\[(.*?):(.*?)\]$/gm
                if(commandReg.test(str)) {
                    console.log(str, 'user used command')
                }
            }
        })
        javaProcess.stderr.on("error", (err) => {
            console.log(err)
            javaProcess.kill()
            javaProcess = null
        })
        javaProcess.on("close", ev => {
            console.log('close java: ' + ev)
            javaProcess = null
        })

        javaProcess.on("error", ev => {
            console.log('error java: ' + ev)
        })
    })

}

function setAlert(text, href) {
    if(href) {
        return `<script>alert("${text}");location.href = '${href}'</script>`
    }
    return `<script>alert("${text}");</script>`
}

module.exports = function () {
    const app = http.createServer(async(req, res) => {
        try {
            const upload = new UploadPlugin()
            req.files = await upload.parse(req)
            req.cookies = new Cookie(req.headers.cookie)
            res.statusCode = 200
            req.query = url_.parse(req.url, true).query
            if(req.url.indexOf('/static') === 0) {
                staticFile(req.url, res)
                return true
            }
            const chunk = await router.match(req.url, req, res)
            switch (typeof chunk) {
                case "object":
                    res.setHeader('Content-Type', 'application/json')
                    res.write(JSON.stringify(chunk))
                    break
                default:
                    res.write(chunk)
                    break
            }
            res.end()
        } catch (e) {
            if(e === '__define__') return
            res.statusCode = 500
            res.write(e.stack)
            res.end()
        }
    })

    app.listen(4000, '0.0.0.0', function () {
        console.log('Web server listening http://localhost:4000')
    })
}


