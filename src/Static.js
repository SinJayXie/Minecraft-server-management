const fs = require('fs')
const path = require('path')
const mime = require('mime')
const { parse } = require('url')
const baseStatic = __dirname

module.exports = function (url, res) {
    const pathInfo = parse(url, true)
    const requestFile = path.join(baseStatic, pathInfo.pathname)
    if(fs.existsSync(requestFile)) {
        const stat = fs.statSync(requestFile)
        if(stat.isFile()) {
            res.setHeader('Content-Type', mime.getType(requestFile))
            res.setHeader('Context-Length', stat.size)
            const stream = fs.createReadStream(requestFile, { highWaterMark: 256 })
            res.on('close', () => {
                stream.close()
            })
            stream.on('data', chunk => {
                res.write(chunk)
            })
            stream.on('close', () => {
                res.end()
            })
        } else {
            res.statusCode = 404
            res.end('404 Not Found.')
        }
    }
     else {
        res.statusCode = 404
        res.end('404 Not Found.')
    }
}
