const assert = require('assert')
const { Vec3 } = require('vec3')

const { BEDROCK_PLAYER_OFFSET, toNotchianYaw, toNotchianPitch, fromNotchianYaw, fromNotchianPitch } = require('../../conversions')

module.exports = (bot) => {

    const Entity = require('prismarine-entity')(bot.registry)

    bot.entities = {} //by runtime_id

    //-----------------------------------------------------------------------------------

    bot.getEntity = getEntity //Maybe not the best place to publish this method to
    bot.updateEntityMetadata = updateEntityMetadata //Maybe not the best place to publish this method to
    bot.updateEntityAttributes = updateEntityAttributes

    //-----------------------------------------------------------------------------------

    //TODO: Handle players leaving range. remove_entity will remove the entity from the entity list, but
    //the entity object will still be set in bot.players[]
    //remove_entity and add_player does not fire when players die and respawn, unless the player respawns in range 
    //add_player won't fire if the player spawns out of range
    //add_player fires even if the player is dead
    //So to sum up, player entities don't get removed when dying, only when leaving range or quitting
    //player list won't remove the player unless the player leaves the server
    //move_player will fire before add_player when teleporting or moving closer
    //mob_equipment is also sent when entity spawns

    //-----------------------------------------------------------------------------------
    // Get Entity (Entity Storage, creates new entity if needed, expects packet handler to set data)
    function getEntity(runtime_id) {

        return bot.entities[BigInt(runtime_id)] || (bot.entities[BigInt(runtime_id)] = extendEntity(new Entity(BigInt(runtime_id))))
    }

    //-----------------------------------------------------------------------------------
    // Extend Entity (Add Attribute and Modifiers methods)
    function extendEntity(entity) {

        entity.getAttribute = (name) => {

            if (bot.entity.attributes && bot.entity.attributes[name]) {

                return bot.entity.attributes[name]['value'] ?? null
            }
            return null
        }

        entity.getAttributeModifiers = (name) => {

            console.log('entity.getAttributeModifiers')

            for (const attribute of Object.values(entity.attributes)) {

                const modfier = attribute.modifiers.find((modifier) => { return modifier.name === name })
                console.log('getAttributeModifiers - TODO: Check type, dont just return null', name, modfier)
                if (modfier) return modfier
            }

            return null
        }

        return entity
    }

    //-----------------------------------------------------------------------------------
    // Handle Remove Entity Packet (players leaving range, items picked up, mobs dying, player dying??)
    bot._client.on('remove_entity', (packet) => {

        // Remove invalid entities
        for (const [runtime_id, entity] of Object.entries(bot.entities)) {

            if (!entity.entity_id) {

                console.log('WARNING, removed entity with missing entity_id!', { runtime_id })
                delete bot.entities[runtime_id]
            }
        }

        // Find and remove entity (by entitiy_id)
        const entity = Object.values(bot.entities).find((e) => BigInt(e?.entity_id ?? 0) === BigInt(packet.entity_id_self))
        if (entity) {

            assert.ok(entity.runtime_id)

            entity.isValid = false
            bot.emit('entityGone', entity)
            delete bot.entities[BigInt(entity.runtime_id)]
        } else {

            console.log('remove_entity entity not found?!', packet)
        }
    })

    //-----------------------------------------------------------------------------------
    // Handle Add Entity Packet  
    bot._client.on('add_entity', (packet) => {

        const entity = getEntity(packet.runtime_id)

        Object.assign(entity, {

            runtime_id: BigInt(packet.runtime_id),
            entity_id: BigInt(packet.unique_id),
            type: 'mob', //I assume (no, eg rockets, xp_orb, etc also uses add_entity)
            name: packet.entity_type.replace(/^minecraft:/, ''),
            displayName: packet.entity_type.replace(/^minecraft:/, ''), //TODO
        })

        entity.position.set(packet.position.x, packet.position.y, packet.position.z)
        entity.velocity.set(packet.velocity.x, packet.velocity.y, packet.velocity.z)

        entity.pitch = fromNotchianPitch(packet.pitch) //Notchian?
        entity.yaw = fromNotchianYaw(packet.yaw) //Notchian?
        entity.head_yaw = fromNotchianYaw(packet.head_yaw)  //Notchian?
        entity.body_yaw = fromNotchianYaw(packet.body_yaw)  //Notchian?

        updateEntityAttributes(entity, packet.attributes)
        updateEntityMetadata(entity, packet.metadata) //Not sure if bedrock and java meta is compatible

        bot.emit('entitySpawn', entity)

        //TODO: packet.properties: { ints: [], floats: [] } 
        //TODO: packet.links: []

        // packet.metadata = '<DELETED>'
        // packet.attributes = '<DELETED>'
        // console.log('add_entity', packet)
    })

    //-----------------------------------------------------------------------------------
    // Handle new Item Entity Packet
    bot._client.on('add_item_entity', (packet) => {

        const entity = getEntity(packet.runtime_entity_id)
        const network_id = packet.item.network_id

        Object.assign(entity, {

            runtime_id: BigInt(packet.runtime_entity_id),
            entity_id: BigInt(packet.entity_id_self),
            type: 'item', //I assume?
            name: bot.registry.items[network_id]?.name ?? undefined,
            displayName: bot.registry.items[network_id]?.displayName ?? undefined,
        })

        entity.position.set(packet.position.x, packet.position.y, packet.position.z)
        entity.velocity.set(packet.velocity.x, packet.velocity.y, packet.velocity.z)

        updateEntityMetadata(entity, packet.metadata) //Not sure if bedrock and java meta is compatible

        //TODO: convert item to prismarine-item
        bot.emit('entitySpawn', entity)
        bot.emit('itemDrop', entity)

        //TODO: packet.is_from_fishing: false ?
    })

    //-----------------------------------------------------------------------------------
    // Parse and Update Entity Metadata (Is Bedrock and Java metadata / parseMetadata compatible?)
    function updateEntityMetadata(entity, metadata) {

        if (metadata !== undefined) {
            for (const { key, value } of metadata) {
                entity.metadata[key] = value
            }
        }
        bot.emit('entityMetadata', entity) //don't think this is in mineflayer
    }

    //-----------------------------------------------------------------------------------
    // Update Entity Attributes
    function updateEntityAttributes(entity, attributes) {

        if (!entity.attributes) entity.attributes = {}

        for (const attribute of attributes) {

            entity.attributes[attribute.name] = {
                value: attribute.current,  //Seems like potions, etc directly change this value
                modifiers: attribute.modifiers ?? [] //is the modfiers in the needed format?
            }
        }
        bot.emit('entityAttributes', entity)
    }

    //-----------------------------------------------------------------------------------
    // Handle Update Entity Attributes Packet (This is used by prismarine-physics)
    bot._client.on('update_attributes', (packet) => {

        const entity = getEntity(packet.runtime_entity_id)
        updateEntityAttributes(entity, packet.attributes)
    })

    //-----------------------------------------------------------------------------------
    // Handle Update Entity Metadata Packet (Not sure where this is used, but handling it was easy)
    bot._client.on('set_entity_data', (packet) => {

        const entity = getEntity(packet.runtime_entity_id)
        updateEntityMetadata(entity, packet.metadata) //Not sure if bedrock and java meta is compatible        
    })

    //-----------------------------------------------------------------------------------
    // Handle Entity Motion
    bot._client.on('set_entity_motion', (packet) => {

        const entity = getEntity(packet.runtime_entity_id)
        entity.velocity.set(packet.velocity.x, packet.velocity.y, packet.velocity.z) //Notchian Velocity?

        bot.emit('entityMoved', entity)
    })

    //-----------------------------------------------------------------------------------
    // Handle Motion Hints
    bot._client.on('motion_prediction_hints', (packet) => {

        const entity = getEntity(packet.runtime_entity_id)
        entity.velocity.set(packet.velocity.x, packet.velocity.y, packet.velocity.z) //Notchian Velocity?
        entity.onGround = packet.on_ground

        bot.emit('entityMoved', entity)
    })

    //-----------------------------------------------------------------------------------
    // Move Delta
    bot._client.on('move_entity_delta', (packet) => {

        // console.log('move_entity_delta', packet)
        const entity = getEntity(packet.runtime_entity_id)

        const x = packet.flags.has_x ? packet.x : entity.position.x //this is the actual position, not a delta
        const y = packet.flags.has_y ? packet.y : entity.position.y
        const z = packet.flags.has_z ? packet.z : entity.position.z

        //const rot_x = packet.flags.has_rot_x ? packet.rot_x : pitch? yaw? Notchian?
        //const rot_y = packet.flags.has_rot_y ? packet.rot_y : pitch? yaw? Notchian?
        //const rot_z = packet.flags.has_rot_z ? packet.rot_z : pitch? yaw? Notchian?
        //packet.flags.teleport
        //packet.flags.force_move

        entity.position.set(x, y, z)
        entity.onGround = packet.flags.on_ground

        bot.emit('entityMoved', entity)
    })

}