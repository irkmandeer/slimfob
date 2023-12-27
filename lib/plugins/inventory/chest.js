const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')

const { BEDROCK_PLAYER_OFFSET, vectorToFace } = require('../../conversions')

module.exports = (bot) => {

    bot.openContainer = openContainer
    bot.openChest = openContainer
    bot.openDispenser = openContainer

    //-----------------------------------------------------------------------------------
    async function openContainer(containerToOpen, direction, cursorPos) {

        //TODO: openContainer should also handle entities (block and entities)
        direction = direction ?? new Vec3(0, 1, 0)
        cursorPos = cursorPos ?? new Vec3(0.5, 0.5, 0.5)
        return await bot.openBlock(containerToOpen, direction, cursorPos)
    }
}