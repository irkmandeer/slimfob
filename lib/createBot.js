const { EventEmitter } = require("events")

module.exports = (options = {}) => {

    //-------------------------------------------------------------------------------------------

    options.version = options.version?.replace('bedrock_', '') ?? undefined
    options.username = options.username ?? 'Player'
    options.host = options.host ?? '127.0.0.1'

    const bot = new EventEmitter()

    // Load Registry (loading the registry while connecting causes annoying connect timeouts)
    if (options.version) bot.registry = require('prismarine-registry')('bedrock_' + options.version)

    // Client Proxy (need to wait for start_game packet before we can inject plugins)
    const BedrockClient = require('./client')
    bot._client = new BedrockClient(options)

    // External Plugin Loader
    require('./plugin_loader')(bot, options)

    //-------------------------------------------------------------------------------------------
    
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

        // Internal Plugins (TODO: Move somewhere else)
        require('./plugins/debug')(bot, options)

        require('./plugins/world/world')(bot, options)
        require('./plugins/world/blocks')(bot, options)

        require('./plugins/entity/entities')(bot, options)
        require('./plugins/entity/players')(bot, options)

        require('./plugins/inventory/inventory')(bot, options)
        require('./plugins/inventory/simple_inventory')(bot, options)
        require('./plugins/inventory/chest')(bot, options)

        require('./plugins/place_block/generic_place')(bot, options)
        require('./plugins/place_block/place_block')(bot, options)

        require('./plugins/digging/digging')(bot, options)
    
        require('./plugins/physics/physics')(bot, options)
        require('./plugins/physics/ticks')(bot, options)
        require('./plugins/physics/look')(bot, options)
        require('./plugins/physics/update_position')(bot, options)
        
        require('./plugins/game/game')(bot, options)
        require('./plugins/game/health')(bot, options)
        require('./plugins/game/chat')(bot, options)
        
        require('./plugins/creative/creative')(bot, options)
    })

    //-------------------------------------------------------------------------------------------

    bot._client.on('load_runtime_data', () => {

        console.log('[load_runtime_data] Loading Item States')
        bot.registry.loadItemStates(bot._client.startGameData.itemstates)


        console.log('[load_runtime_data] Building Block States By Runtime ID')
        if (bot._client.startGameData.block_network_ids_are_hashes) {

            if (!bot.registry.blockStates[0].network_id) {
                console.log('Warning - start_game.block_network_ids_are_hashes is true, but no network_ids found in blockStates!')
            } else {

                bot.registry.blockStatesByRuntimeId = {}
                for (const [index, block] of Object.entries(bot.registry.blockStates)) {

                    const stateId = Number(index)
                    bot.registry.blockStatesByRuntimeId[block.network_id] = stateId
                }
            }
        }

        // console.log(bot.registry.blocksByName['unknown'])
        // console.log(bot.registry.blockStatesByRuntimeId[-2])
        // console.log(bot.registry.blockStates[7476])
        // process.exit(0)

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