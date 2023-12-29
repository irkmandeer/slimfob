// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10

console._log = console.log
var elapsed_ticks = 0
console.log = function () {

    console._log.apply(console, [...['[' + new Date().toISOString().substring(11, 23) + ']', `[${elapsed_ticks}]`], ...arguments])
};



const { Relay, ping } = require('bedrock-protocol')
const { performance } = require('perf_hooks')


//-----------------------------------------------------------------------------------
ping({ host: '127.0.0.1', port: 19132 }).then(res => {

    const relay = new Relay({
        host: '0.0.0.0', port: 19131,
        version: res.version,
        offline: true,
        username: 'niel@thesmiths.za.net',
        destination: { host: '127.0.0.1', port: 19132 },

        // offline: false,
        // destination: {
        //     realms: { pickRealm: (realms) => realms.find(e => e.name === 'My Realm') },
        //     offline: false,
        // },
        // version: '1.20.30',
    })

    relay.conLog = console.debug
    relay.listen()
    relay.on('connect', (player) => {

        elapsed_ticks = 0
        console.log('New connection', player.connection.address)
        player.on('clientbound', clientbound)
        player.on('serverbound', serverbound)
    })
})

//-----------------------------------------------------------------------------------

function clientbound({ name, params }) {

    if (name === 'move_player') {

        if (params.mode !== 'normal') {
            console.log('[clientbound]', name, params)
            // process.exit(0)
        }

        return
    }

    if (name === 'move_player') return
    if (name === 'set_entity_data') return
    if (name === 'subchunk') return
    if (name === 'level_chunk') return
    if (name === 'entity_event') return
    if (name === 'set_time') return
    if (name === 'mob_equipment') return
    if (name === 'level_event') return
    // if (name === 'update_block') return
    if (name === 'level_sound_event') return
    if (name === 'update_attributes') return
    if (name === 'animate') return
    if (name === 'move_entity_delta') return


    switch (name) {

        case 'crafting_event':
        case 'completed_using_item':
        case 'item_stack_response':
        case 'inventory_transaction':
        case 'container_open':
        case 'container_close':
        case 'block_entity_data':
        case 'entity_event':
        case 'player_hotbar':
        case 'gui_data_pick_item':
        case 'inventory_content':
        case 'text':

            // case 'update_block':
            console.log('[clientbound]', name, params)
            break

        default:
            console.log('[clientbound]', name)
    }
}

//-----------------------------------------------------------------------------------

var tickSince = 0
function serverbound({ name, params }) {

    if (name === 'player_auth_input') elapsed_ticks++

    if (name === 'move_player') {

        if (params.mode !== 'normal') {
            console.log('[serverbound]', name, params)
            process.exit(0)
        }
        return
    }

    if (name === 'player_auth_input' && (params.transaction || params.block_action)) {

        console.log('[serverbound]', name, params)
    }

    if (name === 'move_player') return
    if (name === 'player_auth_input') return
    if (name === 'subchunk_request') return

    switch (name) {

        case 'block_entity_data':
        case 'crafting_event':
        case 'player_action':
        case 'animate':
        case 'inventory_transaction':
        case 'move_player':
        case 'item_stack_request':
        case 'container_close':
        case 'interact':
        // case 'level_sound_event':
        case 'entity_event':
        case 'text':
            console.log('[serverbound]', name, params)
            break

        default:

            console.log('[serverbound]', name)
            break
    }
}

//-----------------------------------------------------------------------------------


