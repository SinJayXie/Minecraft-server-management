const multiparty = require('multiparty')
class UploadPlugin {
    constructor() {
        this.form = new multiparty.Form()
    }

    parse(req) {
        return new Promise(resolve => {
            this.form.parse(req, function (err, fields, files) {
                resolve(files)
            })
        })
    }
}

module.exports = UploadPlugin
