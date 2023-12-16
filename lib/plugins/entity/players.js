const assert = require('assert')
const { Vec3 } = require('vec3')


const { BEDROCK_PLAYER_OFFSET, fromNotchianYaw, fromNotchianPitch } = require('../../conversions')

const NAMED_ENTITY_HEIGHT = BEDROCK_PLAYER_OFFSET //1.62
const NAMED_ENTITY_WIDTH = 0.6
const CROUCH_HEIGHT = NAMED_ENTITY_HEIGHT - 0.08

module.exports = (bot) => {

    bot.player = null //bot's player
    bot.entity = null //bot's entity
    bot.players = {}  //by username


    //-----------------------------------------------------------------------------------
    const getEntity = bot.getEntity
    const updateEntityMetadata = bot.updateEntityMetadata

    function playerByUUID(uuid) {

        for (const username in bot.players) {

            if (String(bot.players[username].uuid) === String(uuid))
                return bot.players[username]
        }
        return null
    }

    //-----------------------------------------------------------------------------------
    // Create bot entity

    bot._client.once('start_game', (packet) => {

        assert.ok(packet.runtime_entity_id === bot._client.entityId)

        const entity = getEntity(packet.runtime_entity_id)
        Object.assign(entity, {

            uuid: null,
            runtime_id: BigInt(packet.runtime_entity_id),
            entity_id: BigInt(packet.entity_id),
            username: bot._client.username,
            type: 'player', //I assume
            name: 'player', //?
            displayName: 'Player', //?
            height: NAMED_ENTITY_HEIGHT, //1.62 //physics.playerHeight?
            width: NAMED_ENTITY_WIDTH,
        })

        bot.username = entity.username
        bot.entity = entity
    })

    //-----------------------------------------------------------------------------------
    // Update bot position on spawn

    bot._client.on('respawn', (packet) => {

        //server ready - set player spawn position
        if (packet.state === 1) {

            assert.ok(typeof packet.position === 'object') //TODO ~1.16.210

            const entity = getEntity(bot._client.entityId)
            entity.position.set(packet.position.x, packet.position.y - BEDROCK_PLAYER_OFFSET, packet.position.z)
            entity.velocity.set(0, 0, 0)
            entity.onGround = true
        }
    })

    //-----------------------------------------------------------------------------------
    // Handle Move Player
    bot._client.on('move_player', (packet) => {

        if (packet.mode !== 'normal') console.log('entities', 'move_player', packet) //debug

        const entity = getEntity(packet.runtime_id)
        entity.position.set(packet.position.x, packet.position.y - BEDROCK_PLAYER_OFFSET, packet.position.z)
        entity.pitch = fromNotchianPitch(packet.pitch)
        entity.yaw = fromNotchianYaw(packet.yaw)
        entity.head_yaw = fromNotchianYaw(packet.head_yaw)
        entity.onGround = packet.on_ground

        //TODO ridden_runtime_id

        //TODO: Need to handle this better
        if (packet.mode === 'teleport') {

            entity.velocity.set(0, 0, 0) //?

            // Server stops handling input packets until you set the auth input teleport handled flag
            if (entity === bot.entity) {

                bot.entity.teleported = true
            }
        }
    })

    //-----------------------------------------------------------------------------------
    // Handle Player List
    bot._client.on('player_list', (packet) => {

        if (packet.records.type === 'remove') {

            for (const record of packet.records.records) {

                const player = playerByUUID(record.uuid)
                if (player) {

                    assert.ok(player.username)
                    delete bot.players[player.username]
                    bot.emit('playerLeft', player)
                }
            }

        } else if (packet.records.type === 'add') {

            for (const record of packet.records.records) {

                var player = playerByUUID(record.uuid)
                if (!player) {

                    player = {
                        username: record.username,
                        uuid: record.uuid,
                        entity_id: BigInt(record.entity_unique_id),
                        entity: undefined
                    }

                    bot.players[player.username] = player

                    bot.emit('playerJoined', player)
                } else {

                    bot.emit('playerUpdated', player)
                }


                // Can this be handled differently? player_list > add_player (other players)
                // Player will be set before entity is spawned (add_player)
                // When another player leaves range, the entity is removed and added again when retuning
                // add_player won't fire if the player spawns out of range
                const entity = Object.values(bot.entities).find((e) => e.type === 'player' && e.entity_id === player.entity_id)
                if (entity) {

                    console.log('This should never happen for other players.', player.username, '===', bot._client.username)
                    player.entity = entity
                }

                // Can this be handled differently? player_list > start_game > player_list > respawn x3 > spawn
                // Player will be set before entity is created (start_game)
                if (player.username === bot._client.username) {

                    bot.player = player
                }
            }
        }
    })

    //-----------------------------------------------------------------------------------
    // Handle Add Player (entity)
    bot._client.on('add_player', (packet) => {

        const runtime_id = packet.runtime_entity_id ?? packet.runtime_id //1.18 vs 1.19
        const entity_id = packet.unique_entity_id ?? packet.unique_id //1.18 vs 1.19

        const entity = getEntity(runtime_id)

        Object.assign(entity, {

            uuid: packet.uuid,
            username: packet.username,
            runtime_id: BigInt(runtime_id),
            entity_id: BigInt(entity_id),
            type: 'player', //I assume
            name: 'player', //?
            displayName: 'Player', //?
            pitch: fromNotchianPitch(packet.pitch),
            yaw: fromNotchianYaw(packet.yaw),
            head_yaw: fromNotchianYaw(packet.head_yaw),
            height: NAMED_ENTITY_HEIGHT,
            width: NAMED_ENTITY_WIDTH,
        })

        entity.position.set(packet.position.x, packet.position.y - BEDROCK_PLAYER_OFFSET, packet.position.z)
        entity.velocity.set(packet.velocity.x, packet.velocity.y, packet.velocity.z)
        updateEntityMetadata(entity, packet.metadata) //Not sure if bedrock and java meta is compatible

        //packet.held_item //TODO
        //packet.gamemode //TODO
        //packet.properties //TODO?
        //packet.abilities //TODO?
        //packet.permission_level //TODO?
        //packet.command_permission //TODO?
        //packet.links //TODO

        if (bot.players[entity.username]) {

            const player = bot.players[entity.username]
            player.entity = entity
        }

        bot.emit('entitySpawn', entity)
    })

 



    
}