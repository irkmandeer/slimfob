module.exports = (bot) => {

    bot.lookAt = lookAt
    bot.look = look //pathfinder

    async function look(yaw, pitch, force) {

        bot.entity.yaw = yaw
        bot.entity.pitch = pitch
        bot.entity.head_yaw = yaw
    }

    async function lookAt(point, force) {

        const delta = point.minus(bot.entity.position.offset(0, bot.entity.height, 0))
        const yaw = Math.atan2(-delta.x, -delta.z)
        const groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)
        const pitch = Math.atan2(delta.y, groundDistance)
        await bot.look(yaw, pitch, force)
    }

}