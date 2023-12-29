const { performance } = require('perf_hooks')

const TICK_INTERVAL_MS = 50 //20 ticks / S = 50ms 
const USE_SET_IMMEDIATE = false

module.exports = (bot) => {

    bot.waitForTicks = waitForTicks

    //-----------------------------------------------------------------------------------
    var accumulator, currentTime, doPhysicsTimerID
    var running = false
    //-----------------------------------------------------------------------------------
    //There are consistent tick skips if set to 50ms. Is there a better way than using a setInterval or setImmediate?

    bot._client.once('start_game', () => {

        accumulator = 0
        currentTime = Math.floor(performance.now())

        running = true
        if (USE_SET_IMMEDIATE) doPhysics()
        if (!USE_SET_IMMEDIATE) doPhysicsTimerID = setInterval(doPhysics, 10)
        console.log('Physics Started')
    })

    //-----------------------------------------------------------------------------------

    bot.once('end', () => {

        running = false
        clearInterval(doPhysicsTimerID)
        doPhysicsTimerID = null
    })

    //-----------------------------------------------------------------------------------

    function doPhysics() {

        if (!running) return

        const now = Math.floor(performance.now())
        const deltaTime = now - currentTime
        currentTime = now
        accumulator += deltaTime

        var ticks = 0
        while (accumulator >= TICK_INTERVAL_MS) {

            bot.emit('gameTick')
            accumulator -= TICK_INTERVAL_MS
            ticks++
        }

        if (ticks > 1) console.log('Tick Skip:', ticks - 1, 'dt:', deltaTime)

        if (USE_SET_IMMEDIATE) {

            if (TICK_INTERVAL_MS - accumulator > 20) {
                setTimeout(doPhysics, 10)

            } else {
                setImmediate(doPhysics)
            }
        }
    }

    //-----------------------------------------------------------------------------------

    async function waitForTicks(ticks) {

        if (ticks <= 0) return
        await new Promise(resolve => {

            bot.on('gameTick', gameTick = () => {
                ticks--
                if (ticks === 0) {
                    bot.removeListener('gameTick', gameTick)
                    resolve()
                }
            })
        })
    }

    //-----------------------------------------------------------------------------------    

    function startTickMonitoring() {

        setTimeout(() => {

            var measureStart = 0
            var measureTicks = 0

            bot.on('gameTick', () => measureTicks++)

            setInterval(() => {

                if (measureStart === 0) {

                    measureStart = performance.now()
                    measureTicks = 0
                    return
                }

                const elapsed = (performance.now() - measureStart) / 1000

                if (elapsed > 10) {

                    console.log('measureTicks:', Math.floor(measureTicks / elapsed * 100) / 100, '/s', 'Elapsed:', Math.floor(elapsed * 100) / 100, 's')

                    measureStart = performance.now()
                    measureTicks = 0
                }

            }, 1000)

        }, 10000)
    }

    //startTickMonitoring()

}