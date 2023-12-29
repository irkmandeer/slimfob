
const assert = require('assert')
const { Vec3 } = require('vec3')
const v8 = require('v8')
const { once } = require('events')

const { BEDROCK_PLAYER_OFFSET, toNotchianYaw, toNotchianPitch, fromNotchianYaw,
    fromNotchianPitch, vectorToFace, faceToVector, zigzag32_decode, zigzag32_encode } = require('../../conversions')

module.exports = (bot) => {

    //-----------------------------------------------------------------------------------
    // prismarine-physics\index.js:82 - TODO: make attributes.json for bedrock (saw the min max etc in packet somewhere. game_start?)
    // Movement speed seems to be 0.7 in java, but bedrock attributes show 1.0. Bot ragdols, so guess it's too fast
    //bot.registry.attributesByName = { movementSpeed: { resource: 'minecraft:movement' } }     //bedrock (java: minecraft:movement_speed)
    bot.registry.attributesByName = { movementSpeed: { resource: 'minecraft:toofast' } }        //disabled for now

    //-----------------------------------------------------------------------------------

    const { Physics, PlayerState } = require('prismarine-physics')

    var shouldUsePhysics = false
    var physicsEnabled = true //injected as parameter in physics.js

    const world = { getBlock: (pos) => { return bot.blockAt(pos, false) } }  //Is it more efficient to not just use world directly
    const physics = Physics(bot.registry, world)

    bot.jumpQueued = false // prismarine-physics
    bot.jumpTicks = 0 // autojump cooldown / prismarine-physics
    bot.physics = physics
    bot.physicsEnabled = physicsEnabled ?? true

    //-----------------------------------------------------------------------------------

    // bot.on('spawn', () => { shouldUsePhysics = true }) //TODO: Check if riding
    // bot.on('mount', () => { shouldUsePhysics = false }) //TODO: Mount / Unmount not implemented
    bot._client.on('respawn', () => { shouldUsePhysics = false }) //Not sure if this works as expected

    //-----------------------------------------------------------------------------------

    const controlState = {
        forward: false,
        back: false,
        left: false,
        right: false,
        jump: false,
        sprint: false,
        sneak: false
    }
    bot._controlState = controlState //used by updatePosition

    bot.setControlState = (control, state) => {

        assert.ok(control in controlState, `invalid control: ${control}`)
        assert.ok(typeof state === 'boolean', `invalid state: ${state}`)
        if (controlState[control] === state) return

        controlState[control] = state

        if (control === 'jump' && state) {

            bot.jumpQueued = true //prismarine-physics
        }
        // else if (control === 'sprint') ??
        // else if (control === 'sneak')  ??
    }

    bot.getControlState = (control) => {

        assert.ok(control in controlState, `invalid control: ${control}`)
        return controlState[control]
    }

    bot.clearControlStates = () => {

        for (const control in controlState) {
            bot.setControlState(control, false)
        }
    }

    bot.controlState = {}  //This is needed by pathfinder to do simulation physics. Otherwise all x z values are buggered

    for (const control of Object.keys(controlState)) {
        Object.defineProperty(bot.controlState, control, {
            get() {

                return controlState[control]
            },
            set(state) {

                bot.setControlState(control, state)
                return state
            }
        })
    }

    //-----------------------------------------------------------------------------------
}