let socketClient;

const socketClientHandler = client => {
    socketClient = client
    console.log(`New client connected`)

    // -------  data received from client via 'event' name listener. Client must send data to 'event' name emitter
    // client.on('event', data => {
    //     console.log(`--- data received from socket client ---`)
    //     console.log(data)

    //     client.emit('FromServerAPI', `test data from server = ${new Date(Date.now()).toUTCString()}`)
    // })

    client.on('disconnect', () => {
        console.log(`Client disconnected`)
    })
}

const emitData = data => {
    // socketClient.emit('FromServerAPI', {res: data})
    socketClient.emit('FromServerAPI', data)
}

module.exports = {
    socketClientHandler,
    emitData
}