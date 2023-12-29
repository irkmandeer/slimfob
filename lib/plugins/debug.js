module.exports = (bot) => {


    bot._client.on('packet', (des) => {

        const name = des.data.name
        const params = des.data.params

        switch (name) {

            /* Entities */
            case 'entity_event': //TODO
            case 'respawn': //TODO:        
            case 'add_player': //TODO:
            case 'set_entity_data': //entity.json
            case 'mob_equipment': //TODO:
            case 'update_attributes': //entity.json
            case 'set_health': //Ignored
            case 'player_list': //TODO:
            case 'remove_entity': //TODO:
            case 'move_entity_delta': //TODO
            case 'set_entity_motion': //TODO
            case 'animate': //TODO

            case 'add_item_entity': //TODO
                break

            /* Inventory */
            case 'container_close':
            case 'inventory_content': //TODO
            case 'player_hotbar': //TODO
            case 'inventory_slot': //TODO
            case 'item_stack_response':
            case 'inventory_transaction':
            /**/

            case 'update_block':
            case 'subchunk': //world.js
            case 'level_chunk': //world.js
            case 'level_event_generic': //?
            case 'level_event': //level_event { event: 'particle_punch_block', position: { x: -21.5, y: -59.5, z: -94.5 }, data: 16787653 }
                break

            /* Game */
            case 'network_settings':
            case 'server_to_client_handshake':
            case 'set_player_inventory_options': //This seems specific innvetory window layout, don't care I think
            case 'set_spawn_position': //This just returns junk, maybe the protcol is incorrect
            case 'crafting_data':
            case 'trim_data':
            case 'available_commands':
            case 'available_entity_identifiers':
            case 'update_adventure_settings':
            case 'player_fog':
            case 'biome_definition_list':
            case 'creative_content':
            case 'camera_presets': //?
            case 'set_time': //TODO
            case 'tick_sync':
            case 'level_sound_event':
            case 'set_commands_enabled':
            case 'start_game': //game.js
            case 'set_difficulty': //game.js
            case 'game_rules_changed': //game.js
            case 'update_player_game_type': //game.js
            case 'set_last_hurt_by':
                break

            /**/
            case 'move_player': //TODO

                break

            /* Investigate */
            case 'block_event':
            case 'mob_armor_equipment':
            case 'clientbound_map_item_data':
            case 'network_settings':
            case 'resource_packs_info':
            case 'item_component': //Lots of item info in this
            case 'update_abilities':
            case 'network_chunk_publisher_update': //TODO: Use this to prioritise subchunk loading
            case 'chunk_radius_update':
            case 'play_status':
            case 'sync_entity_property': //Think this updated entity properties, eg bee has nectar, not sure if this is usable
            case 'unlocked_recipes': //Don't think this is usable for anything
                break;


            /* Print */

            case 'aaaaaaaaaaaaaaaa':

                console.log('[packet]', name, params)
                break;


            case 'event':
                console.log('[event]', params.event_type)

                break

            default:
                console.log('[packet]', name)
        }
    })
}