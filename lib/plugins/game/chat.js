const assert = require('assert')
const { once } = require('events')

module.exports = (bot) => {

    bot.chat = chat
    bot.sendCommand = sendCommand //custom

    // bot._client.on('message', (packet) => { console.log('message', packet) })
    // bot._client.on('chat', (packet) => { console.log('chat', packet) })
    // bot._client.on('text', (packet) => { console.log('text', packet) })

    //-----------------------------------------------------------------------------------

    async function chat(message) {

        if (message.startsWith('/')) {

            return await sendCommand(message)
        }

        const text = {
            type: 'chat',
            needs_translation: false,
            source_name: bot._client.username,
            message,
            parameters: undefined,
            xuid: '', //bot._client.startGameData,
            platform_chat_id: ''
        }

        bot._client.write('text', text)
    }

    async function sendCommand(command) {

        assert.ok(bot.player.uuid)

        const command_request = {
            command: command,
            origin: {
                type: 'player',
                uuid: bot.player.uuid,
                request_id: '',
                player_entity_id: undefined
            },
            internal: false,
            version: 66 //?
        }

        bot._client.write('command_request', command_request)
        await once(bot._client, 'command_output')
    }

    //-----------------------------------------------------------------------------------
}