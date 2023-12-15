const assert = require('assert')
const { Vec3 } = require('vec3')

module.exports = (bot) => {

    const Block = require('prismarine-block')(bot.registry)
    const ChunkColumn = require('prismarine-chunk')(bot.registry)
    const World = require('prismarine-world')(bot.registry)

    //-----------------------------------------------------------------------------------

    bot.world = new World(null, null).sync

    bot.world.on('blockUpdate', (...args) => bot.emit('blockUpdate', ...args))
    bot.world.on('blockUpdate', (oldBlock, newBlock) => bot.emit(`blockUpdate:${newBlock.position}`, oldBlock, newBlock))
    bot.world.on('chunkColumnLoad', (...args) => bot.emit('chunkColumnLoad', ...args))
    bot.world.on('chunkColumnUnload', (...args) => bot.emit('chunkColumnUnload', ...args))

    //------------------------------------------------------------------------------

    bot.world.on('blockUpdate', (oldBlock, newBlock) => {

        if (newBlock?.name === 'air' && oldBlock?.name !== 'air') bot.emit(`blockBreak:${newBlock.position}`, oldBlock, newBlock)
        if (newBlock?.name !== 'air' && oldBlock?.name === 'air') bot.emit(`blockPlace:${newBlock.position}`, oldBlock, newBlock)
    })

    //-----------------------------------------------------------------------------------    

    bot._client.on('level_chunk', async (packet) => {

        const cc = new ChunkColumn({ x: packet.x, z: packet.z })

        await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count)

        bot.world.setColumn(packet.x, packet.z, cc)

        if (packet.sub_chunk_count >= 0) { //< 1.18.0 sends full chunks, servers might send old chunks

            bot.world.emit('subChunkLoad', new Vec3(packet.x << 4, 0, packet.z << 4))
        }

        //TODO: dimension
        if (bot.registry.version['>=']('1.18.11')) {

            const requests = []
            for (let dy = -4; dy < 20; dy++) {

                requests.push({ dx: 0, dz: 0, dy: dy })
            }
            bot._client.write('subchunk_request', { origin: { x: packet.x, z: packet.z, y: 0 }, requests, dimension: 0 })
        } else if (bot.registry.version['>=']('1.18')) {

            for (let y = -4; y < 20; y++) {
                bot._client.write('subchunk_request', { x: packet.x, z: packet.z, y: y, dimension: 0 })
            }
        }
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('subchunk', async (packet) => {

        assert.ok(!packet.cache_enabled, 'Unhandled subchunk cache_enabled')
        assert.ok(packet.entries, 'Missing subchunk entries') //TODO: request_result >= 1.18.0 < 1.18.11

        //1.18.11+
        for (const entry of packet.entries) {

            const cX = packet.origin.x + entry.dx
            const cY = packet.origin.y + entry.dy
            const cZ = packet.origin.z + entry.dz

            assert.ok(cY >= -4 && cY < 20) //TODO: older versions start at 0

            if (entry.result === 'y_index_out_of_bounds') continue
            if (entry.result === 'chunk_not_found') continue

            if (entry.result === 'success_all_air') {

                bot.world.emit('subChunkLoad', new Vec3(cX << 4, 0, cZ << 4))
                continue
            }

            assert.ok(entry.payload.length > 0, 'Unhandled / Unexpected subchunk payload')

            const cc = await bot.world.getColumn(cX, cZ)

            await cc.networkDecodeSubChunkNoCache(cY, entry.payload)
            bot.world.emit('subChunkLoad', new Vec3(cX << 4, 0, cZ << 4))
        }
    })

    //------------------------------------------------------------------------------    

    function worldSetBlockStateId(pos, stateId) {

        //A temporary fix for prismarine-world ignoring the block level
        const chunk = bot.world.getColumnAt(pos)
        if (!chunk) return

        const pInChunk = posInChunk(pos)
        const oldBlock = chunk.getBlock(pInChunk)

        chunk.setBlockStateId({ ...pInChunk, ...{ l: pos.l ?? undefined } }, stateId) //SubChunk:223 if (l !== undefined)
        bot.world.async.saveAt(pos)
        bot.world._emitBlockUpdate(oldBlock, chunk.getBlock(pInChunk), pos)

        printChunkTest(pos)
    }

    //-----------------------------------------------------------------------------------

    function updateBlockState(point, block_runtime_id) {

        const stateId = bot.registry.blockStatesByRuntimeId ? bot.registry.blockStatesByRuntimeId[block_runtime_id] : block_runtime_id
        const oldStateId = bot.world.getBlockStateId(point)

        if (oldStateId === stateId) {

            const block = bot.world.getBlock(point)
            bot.world.emit('blockUpdate', block, block)
            return
        }

        //Rather use bot.registry.blocksByStateId[stateId]?
        if (Block.fromStateId(oldStateId).type !== Block.fromStateId(stateId).type) {

            updateBlockEntityData(point, null)
        }

        worldSetBlockStateId(point, stateId)
    }

    //-----------------------------------------------------------------------------------

    function posInChunk(pos) {
        return new Vec3(Math.floor(pos.x) & 15, Math.floor(pos.y), Math.floor(pos.z) & 15)
    }

    function updateBlockEntityData(point, nbt) {

        const column = bot.world.getColumnAt(point)
        if (!column) return

        if (nbt) {

            column.setBlockEntity(posInChunk(point), nbt)
        } else {

            column.removeBlockEntity(posInChunk(point))
        }

        const block = bot.world.getBlock(point)
        bot.world.emit('blockUpdate', block, block)
    }
    //-----------------------------------------------------------------------------------

    bot._client.on('block_entity_data', (packet) => {

        const position = new Vec3(packet.position.x, packet.position.y, packet.position.z)
        updateBlockEntityData(position, packet.nbt)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('update_subchunk_blocks', (packet) => {

        for (const block of packet.blocks) {

            const pos = new Vec3(block.position.x, block.position.y, block.position.z)
            updateBlockState(pos, block.runtime_id)
        }
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('update_block', (packet) => {

        const pos = new Vec3(packet.position.x, packet.position.y, packet.position.z)
        pos.l = packet.layer //Needed? prismarine-world (posInChunk) throws away the level

        //OK, the layer needs to be implemented. 
        //Eg. water with a fan inside, remove the water, then the block updates to air, but the fan is still there
        //Eg. Trapdoor, add water, and the trapdoor becomes water
        //Implemented a temporary fix (worldSetBlockStateId)

        updateBlockState(pos, packet.block_runtime_id)
    })

    //-----------------------------------------------------------------------------------

    function printChunkTest(pos = new Vec3(0, 0, 0)) {

        var types = []
        for (let y = -64; y < 70; y++) {

            pos.y = y
            const block = bot.world.getBlock(pos)

            if (block) types.push(block.name)
        }

        console.log('----------------------------------------------------------------')
        console.log(types)
        console.log('----------------------------------------------------------------')
    }

    //bot.once('spawn', printChunkTest)
    bot._client.once('spawn', printChunkTest)

    //-----------------------------------------------------------------------------------
}