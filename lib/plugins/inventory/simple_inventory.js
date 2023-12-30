const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')

// const { BEDROCK_PLAYER_OFFSET, toNotchianYaw, toNotchianPitch, fromNotchianYaw,
//     fromNotchianPitch, vectorToFace, faceToVector, zigzag32_decode, zigzag32_encode } = require('../conversions')

const QUICK_BAR_COUNT = 9
//const QUICK_BAR_START = 36

module.exports = (bot) => {

    // bot.equip = equip
    // bot.unequip = unequip
    // bot.toss = toss
    // bot.tossStack = tossStack
    // bot.getEquipmentDestSlot = getDestSlot
    // bot.simpleClick = { leftMouse, rightMouse }  
    // bot.QUICK_BAR_START = QUICK_BAR_START    

    bot.setQuickBarSlot = setQuickBarSlot

    //------------------------------------------------------------------------------

    function setQuickBarSlot(slot) {

        if (slot >= QUICK_BAR_COUNT) slot = 0
        if (bot.quickBarSlot === slot) return

        bot.quickBarSlot = slot
        bot.updateHeldItem()
        sendMobEquipment()
    }

    //------------------------------------------------------------------------------

    // TODO: Move into a new file and listen for event. Seperate for inventory and offhand. Armor?

    bot.on('heldItemChanged', (newItem) => {

        sendMobEquipment()
    })

    bot.on('offhandItemChanged', (newItem) => {

        sendMobEquipment()
    })

    function sendMobEquipment() {

        if (bot.quickBarSlot === null) return
        if (!bot._client.entityId) return

        //TODO: Compare old and new
        const inventory = {

            runtime_entity_id: bot._client.entityId,
            item: bot.heldItem?.networkItem ?? { network_id: 0 },
            slot: bot.quickBarSlot,
            selected_slot: bot.quickBarSlot,
            window_id: 'inventory'
        }

        console.log('mob_equipment', inventory.window_id, inventory.slot, bot.inventory.slots[inventory.slot]?.name)

        //console.log('mob_equipment', inventory)
        bot._client.write('mob_equipment', inventory)

        const offhand = {

            runtime_entity_id: bot._client.entityId,
            item: bot.offhand.slots[1]?.networkItem ?? { network_id: 0 },
            slot: 1,
            selected_slot: 1,
            window_id: 'offhand'
        }


        console.log('mob_equipment', offhand.window_id, offhand.slot, bot.offhand.slots[offhand.slot]?.name)

        //console.log('mob_equipment', offhand)
        bot._client.write('mob_equipment', offhand)
    }

}