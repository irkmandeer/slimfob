const assert = require('assert')

module.exports = (bot) => {

    const difficultyNames = ['peaceful', 'easy', 'normal', 'hard']
    // const gameModes = ['survival', 'creative', 'adventure', 'spectator']
    // const dimensionNames = { '-1': 'the_nether', '0': 'overworld', '1': 'the_end' }

    bot.game = {
        //levelType         //flat vs default - can this be derived from the world generator flag in startgame?
        //hardcore 
        gameMode: 'fallback',
        worldGameMode: 'survival', //custom
        dimension: 'overworld',
        minY: -64, //prismarine-physics, prismarine-chunk. Which versions does this apply to?
        //height 
        difficulty: 'easy',
        //maxPlayers           //this is in the client advertisemet, but not available here (unless I ping the server manually)
        //enableRespawnScreen  //client side setting?
        //serverViewDistance 
        //serverBrand 
        gameRules: {}
    }

    //TODO: bot.registry.dimensionsByName (minY, height) is missing from registry
    //https://github.com/PrismarineJS/mineflayer/blob/master/lib/plugins/game.js#L46

    //-----------------------------------------------------------------------------------
    bot._client.once('start_game', (packet) => {

        assert.ok(packet.server_authoritative_inventory === true) //always true (1.17+)? Not implemented
        assert.ok(packet.movement_authority === 'server')

        setDimension(packet.dimension)
        setWorldGameMode(packet.world_gamemode)
        setPlayerGameMode(packet.gamemode ?? packet.player_gamemode)  //1.20?
        setDifficulty(packet.difficulty)
        setGameRules(packet.gamerules)

        bot.emit('game')

        console.log(bot.registry.dimensionsByName)
    })

    //-----------------------------------------------------------------------------------

    bot._client.on('update_player_game_type', (packet) => {

        //TODO: check packet for older mc versions
        //TODO: other players entities?
        if (packet.player_unique_id === bot._client.startGameData.entity_id) {

            if (setPlayerGameMode(packet.gamemode)) {

                bot.emit('game')
            }
        }
    })

    //------------------------------------------------------------------------------

    bot._client.on('game_rules_changed', (packet) => {

        if (setGameRules(packet.rules)) bot.emit('game')
    })


    bot._client.on('set_difficulty', (packet) => {

        if (setDifficulty(packet.difficulty)) bot.emit('game')
    })

    //------------------------------------------------------------------------------

    function setWorldGameMode(gamemode) {

        const previousValue = bot.game.worldGameMode
        bot.game.worldGameMode = gamemode

        return bot.game.worldGameMode !== previousValue
    }

    //------------------------------------------------------------------------------

    function setPlayerGameMode(gamemode) {

        const previousValue = bot.game.gameMode
        bot.game.gameMode = gamemode === 'fallback' ? bot.game.worldGameMode : gamemode

        return bot.game.gameMode !== previousValue
    }

    //------------------------------------------------------------------------------

    function setDimension(dimension) {

        const previousValue = bot.game.dimension
        bot.game.dimension = dimension

        return bot.game.dimension !== previousValue
    }

    //------------------------------------------------------------------------------

    function setDifficulty(difficulty) {

        const previousValue = bot.game.difficulty
        bot.game.difficulty = difficultyNames[difficulty] ?? difficulty

        return bot.game.difficulty !== previousValue
    }

    //------------------------------------------------------------------------------

    function setGameRules(gamerules) {
 
        var changed = []
        for (const rule of gamerules) {

            if (bot.game.gameRules[rule.name] !== rule.value) {

                changed.push(rule) //Update the rules first
                bot.game.gameRules[rule.name] = rule.value
            }
        }

        // Then Emit
        for (const rule of changed) {
 
            bot.emit(`gameRuleChanged:${rule.name}`, rule.value)
        }

        return changed.length ? true : false
    }
}