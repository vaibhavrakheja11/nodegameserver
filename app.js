const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const host = 'localhost';  // Change this to your desired host

app.use(cors());
app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

let sessions = [];
let lastLogTime = 0; // Timestamp of the last log
const LOG_INTERVAL = 1000; // Log interval in milliseconds
const UPDATE_INTERVAL = 50; // Reduce interval for more frequent updates (20 updates per second)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'WebGL', 'index.html'), (err) => {
        if (err) {
            console.error(`Error serving index.html: ${err}`);
            res.status(500).send('Internal Server Error');
        }
    });
});

const server = createServer(app);
const wss = new WebSocket.Server({ server });

function createSession() {
    const sessionId = crypto.randomUUID();
    const session = { id: sessionId, clients: {}, playerCount: 0 };
    sessions.push(session);
    console.log(`Session created: ${sessionId}`);
    return session;
}

function broadcastPlayerInfo(sessionId, playerData) {
    sessions.forEach(session => {
        if (session.id === sessionId) {
            Object.values(session.clients).forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(playerData));
                }
            });
        }
    });
}

function assignColor(playerCount) {
    return playerCount === 1 ? 'red' : 'blue';
}

function handleConnection(ws) {
    console.log(`New connection established from ${ws._socket.remoteAddress}`);

    let session = sessions.find(s => Object.keys(s.clients).length < 2);
    if (!session) {
        session = createSession();
    }

    const clientId = crypto.randomUUID();
    const playerColor = assignColor(session.playerCount + 1);
    ws.clientId = clientId;
    ws.sessionId = session.id;
    ws.playerColor = playerColor;
    session.clients[clientId] = ws;
    session.playerCount++;

    console.log(`Client ${clientId} connected to session ${session.id} with color ${playerColor}`);

    const initialMessage = JSON.stringify({
        type: 'session',
        clientId: clientId,
        sessionId: session.id,
        isFirstPlayer: session.playerCount === 1,
        color: playerColor
    });
    ws.send(initialMessage);

    ws.on('message', function(data) {
        try {
            const messageData = JSON.parse(data);
            if (messageData.type === 'playerUpdate') {
                broadcastPlayerInfo(session.id, messageData);
            }
        } catch (e) {
            console.error('JSON parse error:', e.message);
        }
    });

    ws.on('close', function() {
        console.log(`Client ${clientId} disconnected from session ${session.id}`);
        delete session.clients[clientId];
        session.playerCount--;

        if (session.playerCount === 0) {
            console.log(`Session ${session.id} ended`);
            sessions = sessions.filter(s => s.id !== session.id);
        }
    });

    ws.on('error', function(error) {
        console.error('WebSocket error:', error);
    });
}

wss.on('connection', handleConnection);

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
