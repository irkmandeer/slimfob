const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')
const v8 = require('v8')


module.exports = (bot) => {

    bot.updateSign = updateSign

    //EDIT: Ok, all of this is pointless, you don't need to open a sign to edit it.
    //      Vanilla does, and not sure if servers will be happy if a sign is not clicked first

    //-----------------------------------------------------------------------------------
    // Updating signs is a bit tricky, when placing the a sign you receive an open_sign
    // packet and the client is expected to send a block_entity_data packet to update the sign.
    // The bot can simply walk away after placing a sign without "closing" it.
    // Trying to edit a sign while a sign is still "open", a block is placed next to the sign
    // Maybe activate block should check if a block is a sign, then wait for the block_entity_data?
    // Should we send a dummy block_entity_data packet in this method, then open the sign again?
    // Or maybe send block_entity_data if an open_sign packet is received when not in the updateSign
    // method? 

    var updatingSign = false
    function autoClosePlaceSign(packet) {

        if (updatingSign) return

        //Ok, this is a bit hacky, but the block entity is not received at this point
        //Maybe wait for the block_entity_data packet?
        //Maybe we should simply wait for a second or two, assuming update sign will be called, which
        //will cancel this method?
        setTimeout(() => {

            const block = bot.blockAt(new Vec3(packet.position.x, packet.position.y, packet.position.z))

            if (block?.entity?.value?.FrontText?.value) {

                const nbt = v8.deserialize(v8.serialize(block.entity)) //Guess we should not modify the original object
                nbt.value.FrontText.value.Text.value = 'auto close front\n' + String(performance.now()) //debug
                nbt.value.BackText.value.Text.value = 'auto close back\n' + String(performance.now()) //debug
                bot._client.write('block_entity_data', { position: packet.position, nbt: nbt })
            }
        }, 200)

    }
    bot._client.on('open_sign', autoClosePlaceSign)

    //-----------------------------------------------------------------------------------

    async function updateSign(block, text, back = false) {

        assert.ok(block.entity?.value?.FrontText?.value, 'Missing block entity data')
        assert.ok(block.entity?.value?.BackText?.value, 'Missing block entity data')

        // Truncate Text
        // - It seems like bedrock does not care about the length of the text, or the amount of lines.
        // - The data is actually preserved and sent to other clients on BDS, it's just not visible
        // - I assume some servers will not like this, so trucating the text
        // - Bedrock does not use lines, it will simply wrap the text, but keeping it the same as
        //   java for now
        // - Mineflayer says "signs have max line length 15", but this seems to include the newline
        //   on bedrock. So, IOW, 4*15 = 60 characters?
        const lines = String(text).split('\n')
        while (lines.length > 4) lines.pop() //mineflayer throws an error here

        for (let i = 0; i < lines.length; ++i) {

            lines[i] = lines[i].substring(0, 14) //mineflayer throws an error here
        }

        // Sneak
        // const wasSneaking = bot.getControlState('sneak')
        // if (wasSneaking) bot.setControlState('sneak', false)

        // Open Sign
        await bot.bedrock.activateBlock(block, new Vec3(0, 0, 1)) //If you activate a block a second time, then a block is placed

        //   return
        // if (wasSneaking) bot.setControlState('sneak', true)


        // //Disable auto close
        // updatingSign = true

        // Wait for open sign packet
        var open_sign_packet = null
        // await new Promise((resolve, reject) => {

        //     let open_sign
        //     var TimeoutId = setTimeout(() => {

        //         updatingSign = false //Enable auto close

        //         if (open_sign) bot.off('open_sign', open_sign)
        //         reject('Timeout waiting for open_sign')
        //     }, 5000)

        //     bot._client.once('open_sign', open_sign = (packet) => {

        //         updatingSign = false //Enable auto close

        //         open_sign_packet = packet
        //         clearTimeout(TimeoutId)
        //         resolve()
        //     })
        // })

        // Font vs back
        // It seems bedrock does not care if you ignore open_sign.is_front = true and
        // You can edit both front or back even at the same time
        // Should we throw an error? It will be difficult to position the bot to open 
        // the correct face...

        const nbt = v8.deserialize(v8.serialize(block.entity)) //Guess we should not modify the original object

        if (!back) {

            nbt.value.FrontText.value.Text.value = lines.join("\n")
        } else {

            nbt.value.BackText.value.Text.value = lines.join("\n")
        }


        // Send update
        bot._client.write('block_entity_data', {

            position: open_sign_packet?.position ?? block.position, //debug
            nbt: nbt
        })

        // Seems like we need to wait for block_entity_data 
        // - Do we need to check if it's the correct block?
        let block_entity_data_listener
        await Promise.race([
            new Promise((resolve) => {

                bot._client.once('block_entity_data', block_entity_data_listener = (packet) => resolve(packet))
            }),
            new Promise((resolve) => setTimeout(resolve, 5000))
        ])
        if (block_entity_data_listener) bot._client.off('block_entity_data', block_entity_data_listener)
    }

    //-----------------------------------------------------------------------------------
}