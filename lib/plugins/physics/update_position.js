
const assert = require('assert')
const { Vec3 } = require('vec3')
const v8 = require('v8')
const { once } = require('events')

const { BEDROCK_PLAYER_OFFSET, toNotchianYaw, toNotchianPitch, fromNotchianYaw,
    fromNotchianPitch, vectorToFace, faceToVector, zigzag32_decode, zigzag32_encode } = require('../../conversions')
const { resolve } = require('path')


module.exports = (bot) => {

    bot.sendPlayerAuthInputTransaction = sendPlayerAuthInputTransaction
    bot._updatePosition = updatePosition // exposed for physics.js

    //-----------------------------------------------------------------------------------
    //Temporary function for actions that needs to send (and wait for) transactions in the auth input packet

    var player_auth_input_transaction = {}
    var ugly_waiting_thing = []
    async function sendPlayerAuthInputTransaction(params = {}, wait = true) {

        Object.assign(player_auth_input_transaction, params)

        //if (wait) return await once(bot, 'updatePlayerPosition') 
        if (wait) await new Promise((resolve) => ugly_waiting_thing.push(resolve)) //Fix this, temp workaround for too many listeners 

        return null
    }

    //-----------------------------------------------------------------------------------
    const lastControls = { sneak: true }

    var shouldUsePhysics = false
    bot._client.on('respawn', () => { shouldUsePhysics = false }) //Dead
    bot._client.on('spawn', () => { shouldUsePhysics = true }) //Not dead


    // // Dummy Physics Tick
    // setInterval(() => {

    //     if (shouldUsePhysics) {

    //         bot.emit('physicsTick')
    //         updatePosition()
    //     }
    // }, 50)

    async function updatePosition(now) {

        const control = bot._controlState

        const move_vector = new Vec3(
            bot.getControlState('left') + bot.getControlState('right') * -1, 0, bot.getControlState('forward') + bot.getControlState('back') * -1
        ).normalize()

        if (bot.getControlState('sneak')) move_vector.scale(bot.physics.sneakSpeed) //I'm out of ideas for now
 
        const packet = {
            pitch: toNotchianPitch(bot.entity.pitch),
            yaw: toNotchianYaw(bot.entity.yaw),
            position: bot.entity.position.offset(0, BEDROCK_PLAYER_OFFSET, 0),
            move_vector: move_vector,
            head_yaw: toNotchianYaw(bot.entity.head_yaw ?? bot.entity.yaw),
            input_data: {
                ascend: false,
                descend: false,
                north_jump: false,
                // north_jump: control.jump, //This is not set when climbing ladders, or swimming up with space (?)
                jump_down: control.jump,
                sprint_down: false, //control.sprint, this is not set in the vanilla packet (?)
                change_height: false,
                jumping: control.jump,
                auto_jumping_in_water: false,
                sneaking: control.sneak,
                sneak_down: control.sneak,
                up: control.forward,
                down: control.back,
                left: control.left,
                right: control.right,
                up_left: false,
                up_right: false,
                want_up: control.jump,
                want_down: control.sneak,
                want_down_slow: false,
                want_up_slow: false,
                sprinting: false, //control.sprint, this is not set in the vanilla packet (?)
                ascend_block: false,
                descend_block: false,
                sneak_toggle_down: false,
                persist_sneak: false,
                start_sprinting: (control.sprint && !lastControls.sprint),
                stop_sprinting: (!control.sprint && lastControls.sprint),
                start_sneaking: (control.sneak && !lastControls.sneak),
                //stop_sneaking: (!control.sneak && lastControls.sneak),
                stop_sneaking: (!control.sneak), //bot getting stuck sneaking for some reason
                start_swimming: false,
                stop_swimming: false,
                start_jumping: (control.jump && !lastControls.jump),
                start_gliding: false,
                stop_gliding: false,
                item_interact: false,
                block_action: false,
                handled_teleport: bot.entity.teleported ?? false,
                emoting: false
            },
            input_mode: 'mouse',
            play_mode: 'screen',
            interaction_model: 'touch',
            gaze_direction: undefined,
            tick: 0,
            delta: bot.entity.velocity,
            transaction: undefined,
            item_stack_request: undefined,
            block_action: undefined,
            analogue_move_vector: { x: 0, z: 0 }
        }

        Object.assign(lastControls, control)
        bot.entity.teleported = false //What happens if the player is dead and the packet is not sent?

        if (player_auth_input_transaction?.transaction) {

            packet.input_data.item_interact = true
            packet.transaction = player_auth_input_transaction.transaction
            delete player_auth_input_transaction.transaction
        }

        if (player_auth_input_transaction?.block_action) {

            packet.input_data.block_action = true
            packet.block_action = player_auth_input_transaction.block_action
            delete player_auth_input_transaction.block_action
            //console.log('packet.block_action', packet.block_action)
        }

        if (bot.isAlive) bot._client.write('player_auth_input', packet) //TODO: health.js


        for (const resolve of ugly_waiting_thing) resolve()
        ugly_waiting_thing = []
    }

}