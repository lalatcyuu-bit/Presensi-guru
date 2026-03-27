// utils/socket.js
const jwt = require('jsonwebtoken')

let _io = null

const initSocket = (io) => {
    _io = io

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token
        if (!token) return next(new Error('Token tidak ada'))

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.user = decoded
            next()
        } catch {
            next(new Error('Token tidak valid'))
        }
    })

    io.on('connection', (socket) => {
        const { role, id } = socket.user

        if (role === 'piket' || role === 'admin') {
            socket.join('piket-room')
            console.log(`[Socket] ${role} #${id} connected → joined piket-room`)
        }

        socket.on('disconnect', () => {
            console.log(`[Socket] user #${id} disconnected`)
        })
    })
}

const emitToRoom = (event, data) => {
    if (!_io) return
    _io.to('piket-room').emit(event, data)
}

module.exports = { initSocket, emitToRoom }