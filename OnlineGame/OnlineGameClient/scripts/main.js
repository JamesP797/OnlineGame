// Prompts
const username = prompt('Please enter your name')
const color = prompt('Please enter your colour')

// WebSocket connection
const ws = new WebSocket('ws://jamespportfolio.com:55555/')

// DOM elements
const userInput = document.getElementById('userInput')
const chat = document.getElementById('chat')
const scoreBoard = document.getElementById('scoreContainer')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

// Images
const floorImage = document.getElementById('floorImage')
const reticleImage = document.getElementById('reticleImage')

// Globals
let players = []
const bullets = []

const bulletSpeed = 5
const bulletSize = 10
const playerSize = 20

const player = {
    x: randRange(canvas.width - playerSize),
    y: randRange(canvas.height - playerSize),
    lastShot: 0,
    bulletCooldown: 300,
    alive: true,
    color,
    speed: 5,
    health: 10
}

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
}
const mouse = {
    x: 0,
    y: 0,
    down: false
}

setupEvents()

setInterval(() => {
    render()
}, 10)

function render() {
    moveBullets()

    if (player.alive) {
        movePlayer()
        if (mouse.down && Date.now() - player.lastShot >= player.bulletCooldown) {
            spawnBullet()
        }
        checkCollisions()
    }
    ws.send(`COORDS:${player.x},${player.y}`)

    // render background
    context.drawImage(floorImage, 0, 0, 1000, 1000)
    context.fillStyle = 'blue'

    // render bullets
    context.fillStyle = 'red'
    bullets.forEach((bullet) => {
        context.fillRect(bullet.x, bullet.y, bulletSize, bulletSize)
    })

    // render players
    drawPlayer(player)
    players.forEach((otherPlayer) => {
        drawPlayer(otherPlayer)
    })

    // render reticle and health
    context.drawImage(reticleImage, mouse.x - 30, mouse.y - 30, 60, 60)
    context.font = '30px Arial'
    context.fillStyle = 'white'
    context.fillText(`Health: ${player.health}`, 0, canvas.height - 30)
}

function moveBullets() {
    index = bullets.length - 1
    while (index >= 0) {
        const bullet = bullets[index]
        bullet.x += bullet.xs
        bullet.y += bullet.ys
        if (outOfBounds(bullet)) {
            bullets.splice(index, 1)
        }
        index -= 1
    }
}

function movePlayer() {
    if (keys.w && player.y >= player.speed) player.y -= player.speed
    if (keys.a && player.x >= player.speed) player.x -= player.speed
    if (keys.s && player.y <= canvas.height - playerSize - player.speed) player.y += player.speed
    if (keys.d && player.x <= canvas.width - playerSize - player.speed) player.x += player.speed
}

function spawnBullet() {
    const length = Math.sqrt((mouse.x - player.x)**2 + (mouse.y - player.y)**2)
    const bullet = {
        x: player.x,
        y: player.y,
        xs: (mouse.x - player.x) / length * bulletSpeed,
        ys: (mouse.y - player.y) / length * bulletSpeed,
        owner: username,
        active: true
    }
    bullets.push(bullet)
    player.lastShot = Date.now()
    ws.send(`BULLETCOORDS:${bullet.x},${bullet.y},${bullet.xs},${bullet.ys},${username}`)
}

function drawPlayer(player) {
    context.fillStyle = player.color
    context.fillRect(player.x, player.y, playerSize, playerSize)
}

function checkCollisions() {
    bullets.forEach((bullet) => {
        if (bullet.owner !== username && bullet.active && isColliding(bullet)) {
            player.health -= 1
            if (player.health <= 0) {
                player.alive = false
                player.x = -1000
                player.y = -1000
                ws.send(`DEATH:${bullet.owner}`)
                setTimeout(() => {
                    player.x = randRange(canvas.width - playerSize),
                    player.y = randRange(canvas.height - playerSize),
                    player.alive = true
                    player.health = 10
                }, 3000)
            }
            bullet.active = false
        }
    })
}

function isColliding(bullet) {
    const corners = [
        { x: bullet.x, y: bullet.y },                           // top left
        { x: bullet.x + bulletSize, y: bullet.y},               // top right
        { x: bullet.x, y: bullet.y + bulletSize },              // bottom left
        { x: bullet.x + bulletSize, y: bullet.y + bulletSize }  // bottom right
    ]

    let hit = false
    corners.forEach((corner) => {
        if (corner.x < player.x + playerSize && corner.x > player.x && corner.y < player.y + playerSize && corner.y > player.y) {
            hit = true
        }
    })
    
    return hit
}

function outOfBounds(bullet) {
    return (
        bullet.x < -10 || 
        bullet.x > canvas.width + 10 ||
        bullet.y < -10 ||
        bullet.y > canvas.height + 10
    )
}

function setupEvents() {
    ws.onopen = () => {
        ws.send(`NAME:${username},${color}`)
    }
    
    ws.onmessage = (e) => {
        receiveMessage(e.data)
    }
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            ws.send(`MESSAGE:${userInput.value}`)
            userInput.value = null
        }
    })
    
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true
    })
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false
    })
    
    canvas.addEventListener('mousemove', (e) => {
        mouse.x = e.offsetX
        mouse.y = e.offsetY
    })
    
    document.addEventListener('mousedown', () => {
        mouse.down = true
    })
    
    document.addEventListener('mouseup', () => {
        mouse.down = false
    })
}

function receiveMessage(message) {
    const data = message.split(':')
    const type = data[0]
    const value = data[1]
    switch (type) {
        case 'COORDS':
            const coords = value.split(',')
            players = []
            scoreBoard.innerHTML = ''
            coords.forEach((coord) => {
                const [x, y, name, score, color] = coord.split('|')
                if (name !== username) players.push({ x, y, color })
                scoreBoard.innerHTML += `<p><strong>${name}</strong>: ${score}`
            })
            break
        case 'BULLETCOORDS':
            const [x, y, xs, ys, name] = value.split(',')
            const bullet = {
                x: parseFloat(x),
                y: parseFloat(y),
                xs: parseFloat(xs),
                ys: parseFloat(ys),
                owner: name,
                active: true
            }
            bullets.push(bullet)
            break
        case 'MESSAGE':
            const [user, text] = value.split(',')
            chat.innerHTML += `<p><strong>${user}</strong>: ${text}</p>`
    }
}

function randRange(max) {
    return Math.floor(Math.random() * max)
}
