const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')


module.exports = (bot) => {

    bot.blockAt = blockAt

    function blockAt(position) {

        return bot.world.getBlock(position)
    }
}