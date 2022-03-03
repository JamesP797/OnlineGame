const http = require('http')
const WebSocketServer = require('websocket').server

const server = http.createServer()
server.listen(55555)

const wsServer = new WebSocketServer({
	httpServer: server
})

console.log('websocket server successfully created and listening on port 55555')

const clients = []

wsServer.on('request', (request) => {
	const connection = request.accept(null, request.origin)
	const client = {
		connection,
		name: '',
		coords: {
			x: 0,
			y: 0,
		},
		score: 0,
		color: '',
	}
	clients.push(client)

	connection.on('message', (message) => {
		const data = message.utf8Data.split(':')
		const type = data[0]
		const value = data[1]
		switch (type) {
			case 'NAME':
				client.name = value.split(',')[0]
				client.color = value.split(',')[1]
				console.log(`${client.name} has joined`)
				break
			case 'COORDS':
				client.coords.x = value.split(',')[0]
				client.coords.y = value.split(',')[1]
				break
			case 'BULLETCOORDS':
				clients.forEach((c) => {
					if (c != client) {
						c.connection.sendUTF(message.utf8Data)
					}
				})
				break
			case 'DEATH':
				clients.forEach((c) => {
					if (c.name === value) {
						c.score += 1
					}
				})
				break
			case 'MESSAGE':
				clients.forEach((c) => {
					c.connection.sendUTF(`MESSAGE:${client.name},${value}`)
				})
				break
		}
	})

	connection.on('close', (reasonCode, description) => {
		console.log(`${client.name} has disconnected`)
		index = clients.length - 1
		while (index >= 0) {
			if (clients[index].name === client.name) {
				clients.splice(index, 1)
				break
			}
			index -= 1
		}
	})
})

setInterval(() => {
	clients.forEach((client1) => {
		message = 'COORDS:'
		clients.forEach((client2) => {
			message += `${client2.coords.x}|${client2.coords.y}|${client2.name}|${client2.score}|${client2.color},`
		})
		client1.connection.sendUTF(message.slice(0, message.length - 1))
	})
}, 10)

