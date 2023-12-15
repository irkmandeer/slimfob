const assert = require('assert')

module.exports = (bot, options) => {

    bot.loadPlugin = loadPlugin

    //-------------------------------------------------------------------------------------------

    var loaded = false
    const plugins = []

    //-------------------------------------------------------------------------------------------

    function loadPlugin(plugin) {

        assert.ok(typeof plugin === 'function', 'plugin needs to be a function')
        if (plugins.indexOf(plugin) === -1) {

            plugins.push(plugin)
            if (loaded) plugin(bot, options)
        }
    }

    //-------------------------------------------------------------------------------------------

    bot.on('inject_allowed', () => {

        console.log('[inject_allowed]', 'Loading', plugins.length, 'plugin(s)')

        loaded = true
        for (const plugin of plugins) {

            plugin(bot, options)
        }
    })

    //-------------------------------------------------------------------------------------------
}