const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')
const { performance } = require('perf_hooks')
const v8 = require('v8')


const { BEDROCK_PLAYER_OFFSET, vectorToFace } = require('../../conversions')

const WINDOW_TIMEOUT = 5000

module.exports = (bot) => {

    // bot.activateEntity = activateEntity
    // bot.activateEntityAt = activateEntityAt
    // bot.consume = consume
    // bot.activateItem = activateItem
    // bot.deactivateItem = deactivateItem

    // // not really in the public API
    // bot.clickWindow = clickWindow
    // bot.putSelectedItemRange = putSelectedItemRange
    // bot.putAway = putAway
    // bot.transfer = transfer
    // bot.openEntity = openEntity
    // bot.moveSlotItem = moveSlotItem

    bot.openBlock = openBlock
    bot.openInventory = openInventory
    bot.activateBlock = activateBlock
    bot.closeWindow = closeWindow


    bot.updateHeldItem = updateHeldItem

    //-----------------------------------------------------------------------------------

    const ItemStack = require('./types/item_stack')(bot)
    const Container = require('./types/container')(bot)
    const Window = require('./types/window')(bot)
    const InventoryType = require('./types/inventory_type')(bot)


    //-----------------------------------------------------------------------------------

    bot.quickBarSlot = null
    bot.currentWindow = null
    //bot.heldItem = null
    Object.defineProperty(bot, "heldItem", { get() { return bot.inventory.slots[bot.quickBarSlot] ?? null } });
    // bot.usingHeldItem = false

    //-----------------------------------------------------------------------------------

    const container_items = {}

    bot.inventory = new Window('inventory', 'inventory', getContainerItems('inventory'))
    bot.offhand = new Window('offhand', 'offhand', getContainerItems('offhand'))
    bot.armor = new Window('armor', 'armor', getContainerItems('armor'))
    bot.ui = new Window('ui', 'ui', getContainerItems('ui'))

    bot.containers = {}

    //-----------------------------------------------------------------------------------
    function getContainer(window_id) {

        return bot.containers[window_id] ?? (bot.containers[window_id] = new Container(getContainerItems(window_id)))
    }

    function getContainerItems(window_id) {

        return container_items[window_id] ?? (container_items[window_id] = [])
    }

    function deleteContainerItems(window_id) {

        delete container_items[window_id]
        delete bot.containers[window_id]
    }

    //-----------------------------------------------------------------------------------

    function setContainerItem(window_id, slot, item) {

        const slots = getContainerItems(window_id)
        const previousSize = slots.length
        // const newItem = slots[slot] = ItemStack.fromNotch(item)

        const newItem = ItemStack.fromNotch(item)

        newItem.slot = Number(slot)
        newItem.slot_type = InventoryType.inventoryTypefromWindowAndSlot(window_id, slot)
        newItem.window_id = window_id

        const container = getContainer(window_id)
        container.updateSlot(slot, newItem)

        if (slots.length !== previousSize) { //Fill empty slots. TODO: Handle this better

            for (var i = 0; i < slots.length; i++) {

                container.updateSlot(i, slots[i] ?? {
                    network_id: 0,
                    slot: i,
                    window_id
                })

                // slots[i] = slots[i] ?? {
                //     network_id: 0,
                //     slot: i,
                //     window_id
                // }
            }
        }
    }


    //-----------------------------------------------------------------------------------

    bot.on('heldItemChanged', (newItem) => {

        console.log('[heldItemChanged]', newItem?.displayName ?? null)
    })

    bot.on('offhandItemChanged', (newItem) => {

        console.log('[offhandItemChanged]', newItem?.displayName ?? null)
    })

    //-----------------------------------------------------------------------------------

    let previousMainHandHeldItem = null
    let previousOffHandHeldItem = null
    function updateHeldItem() {

        if (bot.entity) {

            bot.entity.heldItem = bot.heldItem
        }

        if (bot.inventory) {

            if (!ItemStack.equal(bot.heldItem, previousMainHandHeldItem)) {

                previousMainHandHeldItem = v8.deserialize(v8.serialize(bot.heldItem))
                bot.emit('heldItemChanged', bot.heldItem)
            }
        }

        if (bot.offhand) { //TODO: Not sure how offhand needs to be handled (if at all)

            if (!ItemStack.equal(bot.offhand.slots[1], previousOffHandHeldItem)) {

                previousOffHandHeldItem = v8.deserialize(v8.serialize(bot.offhand.slots[1]))
                bot.emit('offhandItemChanged', bot.offhand.slots[1])
            }
        }

        // bot.heldItem = bot.inventory.slots[bot.QUICK_BAR_START + bot.quickBarSlot]
        // bot.entity.heldItem = bot.heldItem
        // bot.emit('heldItemChanged', bot.entity.heldItem)
    }

    //-----------------------------------------------------------------------------------

    async function closeWindow(window) {

        const window_id = window?.window_id ?? bot.currentWindow?.window_id ?? 0

        bot._client.write('container_close', { window_id: window_id, server: false })
        const [container_close] = await once(bot._client, 'container_close')

        console.log('container_close', container_close)

        // bot._client.write('close_window', {
        //   windowId: window.id
        // })
        // copyInventory(window)
        // bot.currentWindow = null
        // bot.emit('windowClose', window)
    }

    //-----------------------------------------------------------------------------------

    bot._client.on('player_hotbar', (packet) => {

        if (packet.window_id === 'inventory')
            bot.setQuickBarSlot(packet.selected_slot)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('container_open', (packet) => {

        //console.log('container_open', packet) //window_id always numeric?

        assert.ok(packet.window_id)
        assert.ok(packet.window_type)

        var container

        //TODO: Handle this better
        if (packet.window_type === 'inventory') {
            container = new Window(packet.window_id, packet.window_type, getContainerItems('inventory'))
        } else {

            container = new Window(packet.window_id, packet.window_type, getContainerItems(packet.window_id))
        }

        const block = bot.blockAt(new Vec3(packet.coordinates.x, packet.coordinates.y, packet.coordinates.z))
        container.type = block?.type
        container.name = block?.name
        container.debug = packet
        container.close = async () => {

            await bot.closeWindow(packet.window_id)
        }

        //TODO: Handle this better
        if (container.name === 'barrel') {
            container.window_type = container.name
        }

        bot.currentWindow = container

        if (container.slots.length) {

            bot.emit('windowOpen', container)
        } else {

            // don't emit windowOpen until we have the slot data
            bot.once(`setWindowItems:${packet.window_id}`, () => {

                bot.emit('windowOpen', container)
            })
        }


        // // open window
        // bot.currentWindow = windows.createWindow(packet.windowId, packet.inventoryType, packet.windowTitle, packet.slotCount)
        // prepareWindow(bot.currentWindow)
    })

    //-----------------------------------------------------------------------------------
    bot._client.on('container_close', (packet) => {

        const oldWindow = bot.currentWindow
        bot.currentWindow = null
        bot.emit('windowClose', oldWindow)

        //Not sure if this is safe, but seems window_id in container_open and container_close is always numeric
        //and inventory_content is only numeric for containers etc. So this should not delete, say, the inventory or armor data
        deleteContainerItems(packet.window_id)

        // // close window
        // const oldWindow = bot.currentWindow
        // bot.currentWindow = null
        // bot.emit('windowClose', oldWindow)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('inventory_content', (packet) => {

        for (const [index, item] of Object.entries(packet.input)) {

            var slot = Number(index)
            if (packet.window_id === 'offhand') slot += 1 //TODO: Handle this better

            setContainerItem(packet.window_id, slot, item)
        }

        updateHeldItem()
        bot.emit(`setWindowItems:${packet.window_id}`)

        // const window = packet.windowId === 0 ? bot.inventory : bot.currentWindow
        // if (!window || window.id !== packet.windowId) {
        //     windowItems = packet
        //     return
        // }

        // // set window items
        // for (let i = 0; i < packet.items.length; ++i) {
        //     const item = Item.fromNotch(packet.items[i])
        //     window.updateSlot(i, item)
        // }
        // updateHeldItem()
        // bot.emit(`setWindowItems:${window.id}`)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('inventory_slot', (packet) => {

        // console.log('inventory_slot', packet)
        setContainerItem(packet.window_id, Number(packet.slot), packet.item) //offhand +1 ?
        updateHeldItem()

        // // set slot
        // const window = packet.windowId === 0 ? bot.inventory : bot.currentWindow
        // if (!window || window.id !== packet.windowId) return
        // const newItem = Item.fromNotch(packet.item)
        // const oldItem = window.slots[packet.slot]
        // window.updateSlot(packet.slot, newItem)
        // updateHeldItem()
        // bot.emit(`setSlot:${window.id}`, oldItem, newItem)
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

                setContainerItem(inventory_id, Number(slot), action.new_item)
            }
        }
        updateHeldItem()
    })


    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------

    //-----------------------------------------------------------------------------------

    async function activateBlockWithOptions(block, options = {}) {

        const faceVector = options.faceVector ?? new Vec3(0, 1, 0) //direction
        const face = vectorToFace(faceVector) //directionNum 
        const cursorPos = options.cursorPos ?? new Vec3(0.5, 0.5, 0.5)

        await bot.lookAt(block.position.offset(0.5, 0.5, 0.5), false)

        const position = block.position
        const result_position = position

        const playerPos = bot.entity.position.offset(0, BEDROCK_PLAYER_OFFSET, 0)
        const runtime_entity_id = bot._client.entityId
        const block_runtime_id = block.stateId
        //const block_runtime_id = Block.NetworkIdFromStateId(block.stateId)

        const hotbarSlot = bot.quickBarSlot
        const helditem = bot.heldItem?.networkItem ?? { network_id: 0 }

        var receivedInventoryUpdate = false
        try {

            bot._client.once('inventory_slot', inventory_slot = () => { receivedInventoryUpdate = true })
            bot._client.once('player_hotbar', player_hotbar = () => { receivedInventoryUpdate = true })

            // ------------------------------------------------------

            const start_item_use_on = {
                runtime_entity_id: runtime_entity_id,
                action: 'start_item_use_on',
                position: position,
                result_position: result_position,
                face: face
            }

            //console.log('player_action', start_item_use_on)
            bot._client.write('player_action', start_item_use_on)

            // ------------------------------------------------------

            const swing_arm = {
                action_id: 'swing_arm',
                runtime_entity_id: runtime_entity_id,
                boat_rowing_time: undefined
            }

            //console.log('animate', swing_arm)
            bot._client.write('animate', swing_arm)

            // ------------------------------------------------------

            const inventory_transaction = {

                transaction: {
                    legacy: { legacy_request_id: 0, legacy_transactions: undefined },
                    transaction_type: 'item_use',
                    actions: [],
                    transaction_data: {
                        action_type: 'click_block',
                        block_position: position,
                        face: face,
                        hotbar_slot: hotbarSlot,
                        held_item: helditem,
                        player_pos: playerPos,
                        click_pos: cursorPos,
                        block_runtime_id: block_runtime_id
                    }
                }
            }

            //console.log('inventory_transaction', inventory_transaction)
            bot._client.write('inventory_transaction', inventory_transaction)

            // ------------------------------------------------------

            const stop_item_use_on = {
                runtime_entity_id: runtime_entity_id,
                action: 'stop_item_use_on',
                position: position,
                result_position: { x: 0, y: 0, z: 0 },
                face: 0
            }

            //console.log('player_action', stop_item_use_on)
            bot._client.write('player_action', stop_item_use_on)

            // ------------------------------------------------------
            // Wait a bit for inventory update

            if (bot.heldItem) { //TODO: Check creative

                const start = performance.now()
                while (!receivedInventoryUpdate && performance.now() - start < 500) {

                    //await bot.sendPlayerAuthInputTransaction()
                    await new Promise((resolve) => setTimeout(resolve, 50))
                }
            }

        } finally {

            bot._client.off('inventory_slot', inventory_slot)
            bot._client.off('player_hotbar', player_hotbar)
        }

    }

    //-----------------------------------------------------------------------------------

    async function activateBlock(block, direction, cursorPos) {

        await activateBlockWithOptions(block, {

            faceVector: direction ?? new Vec3(0, 1, 0),
            cursorPos: cursorPos ?? new Vec3(0.5, 0.5, 0.5)
        })
    }

    //-----------------------------------------------------------------------------------

    async function openBlock(block, direction, cursorPos) {

        if (bot.currentWindow) await bot.currentWindow.close()

        //open can fail, and once gets stuck forever
        const window = await new Promise((resolve, reject) => {

            bot.once('windowOpen', windowOpen = (window) => {

                clearTimeout(timeoutId)
                resolve(window)
            })

            const timeoutId = setTimeout(() => {

                bot.off('windowOpen', windowOpen)
                reject(new Error("Timeout waiting for windowOpen event"))

            }, WINDOW_TIMEOUT)

            activateBlockWithOptions(block, {

                faceVector: direction ?? new Vec3(0, 1, 0),
                cursorPos: cursorPos ?? new Vec3(0.5, 0.5, 0.5)
            })
        })

        return window
    }

    //----------------------------------------------------------------------------------- 

    async function openInventory() {

        if (bot.currentWindow) await bot.currentWindow.close() //TODO: Check if current window is inventory

        bot._client.write('interact', {

            action_id: 'open_inventory',
            target_entity_id: bot._client.entityId,
            position: undefined
        })

        // const [container_open] = await once(bot._client, 'container_open')
        // console.log('container_open', container_open)
        const [window] = await once(bot, 'windowOpen')
        return window
    }

    //----------------------------------------------------------------------------------- 
}