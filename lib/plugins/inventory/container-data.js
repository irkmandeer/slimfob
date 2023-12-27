module.exports = (bot) => {

    //-----------------------------------------------------------------------------------

    const containers = {}
    bot._container_data = containers //debug

    //-----------------------------------------------------------------------------------

    function getContainer(window_id) {

        return containers[window_id] ?? (containers[window_id] = [])
    }

    //-----------------------------------------------------------------------------------

    function setInventoryItem(window_id, slot, item) {

        const container = getContainer(window_id)
        const previousSize = container.length

        const newItem = container[slot] = item

        newItem.slot = Number(slot)
        newItem.window_id = window_id

        if (container.length !== previousSize) { //Fill empty slots

            for (var i = 0; i < container.length; i++) {

                container[i] = container[i] ?? {
                    network_id: 0,
                    slot: i,
                    window_id
                }
            }
        }
    }

    //-----------------------------------------------------------------------------------

    bot._client.on('inventory_content', (packet) => {

        for (const [index, item] of Object.entries(packet.input)) {

            var slot = Number(index)
            if (packet.window_id === 'offhand') slot += 1 //TODO: Handle this better

            setInventoryItem(packet.window_id, slot, item)
        }

        bot.emit(`setWindowItems:${packet.window_id}`)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('inventory_slot', (packet) => {

        console.log('inventory_slot', packet)
        setInventoryItem(packet.window_id, Number(packet.slot), packet.item) //offhand +1 ?
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('inventory_transaction', (packet) => {

        //inventory_id seems to be a window_id (WindowIdVarInt)? not inventory_slot_type
        for (const action of packet.transaction.actions) {

            if (typeof action.inventory_id === 'undefined') continue //source_type: 'world_interaction'

            const inventory_id = action.inventory_id
            const slot = action.slot

            //TODO: Need to check if we're using this packet as intended
            if (action.new_item) {

                setInventoryItem(inventory_id, Number(slot), action.new_item)
            }
        }
    })

    //-----------------------------------------------------------------------------------
}