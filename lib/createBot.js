const { EventEmitter } = require("events")

module.exports = (options = {}) => {

    //-------------------------------------------------------------------------------------------

    options.version = options.version?.replace('bedrock_', '') ?? undefined
    options.username = options.username ?? 'Player'
    options.host = options.host ?? '127.0.0.1'

    const bot = new EventEmitter()

    //Load Registry (loading the registry while connecting causes annoying connect timeouts)
    if (options.version) bot.registry = require('prismarine-registry')('bedrock_' + options.version)

    // Client Proxy (need to wait for start_game packet before we can inject plugins)
    const BedrockClient = require('./client')
    bot._client = new BedrockClient(options)

    // External Plugin Loader
    require('./plugin_loader')(bot, options)
 
    //-------------------------------------------------------------------------------------------
    bot._client.once('spawn', () => {

        console.log('[spawn]')
    })

    // for (const event of ['-connect_allowed', 'error', 'loggingIn', 'kick', 'spawn', 'close', '--packet', 'join', 'status', '--heartbeat']) {

    //     bot._client.on(event, () => {

    //         console.log(`[${event}]`)
    //     })
    // }

    //-------------------------------------------------------------------------------------------

    bot._client.on('close', () => bot.emit('end', 'Disconnected'))
    bot._client.on('error', (err) => bot.emit('error', err))

    //-------------------------------------------------------------------------------------------

    bot._client.once('connect_allowed', () => {

        console.log('[connect_allowed]', 'Version:', bot._client.options.version)
        if (!bot.registry) bot.registry = require('prismarine-registry')('bedrock_' + bot._client.options.version)

        const version = bot.registry.version
        bot.protocolVersion = version.version
        bot.majorVersion = version.majorVersion
        bot.version = version.type === 'bedrock' ? 'bedrock_' + version.minecraftVersion : version.minecraftVersion //physics creates registry from version
        options.version = version.minecraftVersion
        bot.supportFeature = bot.registry.supportFeature
    })

    //-------------------------------------------------------------------------------------------

    bot._client.on('load_runtime_data', () => {

        console.log('[load_runtime_data] Loading Item States')
        bot.registry.loadItemStates(bot._client.startGameData.itemstates)
 
        bot.emit('inject_allowed')
    })

    //-------------------------------------------------------------------------------------------

    bot.quit = (reason) => {

        reason = reason ?? 'disconnect.quitting'
        bot._client.disconnect(reason)
    }

    //-------------------------------------------------------------------------------------------

    return bot
}