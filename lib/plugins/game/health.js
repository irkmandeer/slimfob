
module.exports = (bot) => {

    //-----------------------------------------------------------------------------------

    bot.isAlive = false
    bot.health = 0
    bot.food = 0
    bot.foodSaturation = 0

    //-----------------------------------------------------------------------------------

    bot._client.once('spawn', async (packet) => {

        bot.isAlive = true
        bot.emit('spawn')

        var respawnTimeoutID = null
        bot._client.on('respawn', (packet) => {

            bot.emit('respawn')

            //if we recieved this packet, then we are dead
            if (bot.isAlive) {

                bot.isAlive = false
                bot.emit('death')
            }

            //server searching - send respawn packet
            if (packet.state === 0 && !respawnTimeoutID) {

                respawnTimeoutID = setTimeout(() => {  //wait a random bit of time. Needed?

                    bot._client.write('respawn', {

                        runtime_entity_id: bot._client.entityId,
                        state: 2, //client ready
                        position: { x: 0, y: 0, z: 0 }
                    })

                }, Math.floor(Math.random() * 3000) + 2000)
            }

            //server ready - send player_action packet
            if (packet.state === 1) {

                respawnTimeoutID = null

                bot._client.write('player_action', {

                    runtime_entity_id: bot._client.entityId,
                    action: 'respawn',
                    position: { x: 0, y: 0, z: 0 },
                    result_position: { x: 0, y: 0, z: 0 },
                    face: -1
                })

                bot.isAlive = true
                bot.emit('spawn')
            }

        })
    })

    //-----------------------------------------------------------------------------------
    bot._client.once('set_health', async (packet) => {

        // AFAIK this packet is depriciated
        // Mineflayer uses health for spawn and death events, but respawn above should handle all that
        // @see https://github.com/PrismarineJS/mineflayer/blob/master/lib/plugins/health.js#L17
        if (bot.health !== packet.health) {

            bot.health = packet.health
            bot.emit('health')
        }
    })

    //-----------------------------------------------------------------------------------

    bot.on('entityAttributes', (entity) => {

        if (entity.runtime_id !== bot._client.entityId) return

        const attributes = { health: 'minecraft:health', food: 'minecraft:player.hunger', foodSaturation: 'minecraft:player.saturation' }

        var changed = false
        for (const property in attributes) {

            const attribute = attributes[property]

            if (entity.attributes[attribute] && bot[property] !== entity.attributes[attribute].value) {

                bot[property] = entity.attributes[attribute].value //are these the same units as in java?
                changed = true
            }
        }

        if (changed) console.log('health:', bot.health, 'food:', bot.food, 'foodSaturation:', bot.foodSaturation,)
        if (changed) bot.emit('health')
    })

    //-----------------------------------------------------------------------------------

}