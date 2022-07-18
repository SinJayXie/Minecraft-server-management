const ejs = require('ejs')
const fs = require('fs')
const path = require('path')
const templateDir = path.join(__dirname, 'page')
const ServerName = 'Minecraft server management 1.19'
module.exports = {
    render: async function (template, record) {
        const templatePath = path.join(templateDir, template + '.ejs')
        if(fs.existsSync(templatePath)) {
            const templateBuffer = fs.readFileSync(templatePath)
            return await ejs.render(templateBuffer.toString(), { ServerName, ...record })
        }
        throw Error('Template File: "' + templatePath + '" Not found.')
    }
}
