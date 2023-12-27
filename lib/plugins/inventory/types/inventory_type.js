
const assert = require('assert')

const HOTBAR_SLOT_COUNT = 9
const INVENTORY_SLOT_COUNT = 36 //+hotbar

const CREATIVE_OUTPUT_SLOT = 50
const CREATIVE_INPUT_SLOT_START = 28
const CREATIVE_INPUT_SLOT_END = 31

module.exports = (bot) => {

    const armorSlots = {
        head: 0,
        torso: 1,
        legs: 2,
        feet: 3
    }

    return class InventoryType {

        static inventoryTypefromWindowAndSlot(window_id, slot) {

            if (typeof window_id === 'number' && bot.currentWindow?.window_type)
                return bot.currentWindow.window_type

            if ((window_id === 'first' || window_id === 'last') && bot.currentWindow?.window_type)
                return bot.currentWindow.window_type

            switch (window_id) {

                case 'crafting_input': //inventory_type
                case 'creative_output': //inventory_type
                    // case 'offhand': //window_id and inventory_type 
                    // case 'armor': //window_id and inventory_type
                    return window_id
            }

            switch (window_id) {


                case 'ui': //window id

                    if (slot === CREATIVE_OUTPUT_SLOT) return 'creative_output'
                    if (slot >= CREATIVE_INPUT_SLOT_START && slot <= CREATIVE_INPUT_SLOT_END) return 'crafting_input'

                    break

                case 'offhand': //window id

                    switch (Number(slot)) {

                        //case 0: //offhand
                        case 1:
                            return 'offhand';
                    }

                    break

                case 'armor': //window id

                    switch (Number(slot)) {

                        case 0: //head
                        case 1: //torso
                        case 2: //legs
                        case 3: //feet
                            return 'armor';

                    }
                    break

                case 'inventory': //window id

                    return slot < HOTBAR_SLOT_COUNT ? 'hotbar' : 'hotbar_and_inventory'

                default:

                    console.log(`${window_id}_not_implemented`)
            }

            return undefined
        }
    }



}