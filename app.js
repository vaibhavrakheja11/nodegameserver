const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const host = 'localhost';  // Change this to your desired host

// CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from the 'Client/WebGL' directory
app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

let sessions = []; // Array to hold active sessions
let lastLogTime = 0; // Timestamp of the last log
const LOG_INTERVAL = 1000; // Log interval in milliseconds

// Handle root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'WebGL', 'index.html'), (err) => {
        if (err) {
            console.error(`Error serving index.html: ${err}`);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Create the HTTP server and attach the WebSocket server to it
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Function to create a new session
function createSession() {
    const sessionId = crypto.randomUUID();
    const session = { id: sessionId, clients: {}, playerCount: 0 };
    sessions.push(session);
    console.log(`Session created: ${sessionId}`);
    return session;
}

// Function to broadcast player information to all clients in the same session
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

// Function to assign color based on the player's order in the session
function assignColor(playerCount) {
    // Assign colors based on the order of players in the session
    return playerCount === 1 ? 'red' : 'blue';
}

// Function to handle client connection
function handleConnection(ws) {
    console.log(`New connection established from ${ws._socket.remoteAddress}`);
    
    let session = sessions.find(s => Object.keys(s.clients).length < 2);
    if (!session) {
        session = createSession();
    }

    const clientId = crypto.randomUUID(); // Generate a unique client ID
    const playerColor = assignColor(session.playerCount + 1); // Assign color based on player count
    ws.clientId = clientId;
    ws.sessionId = session.id;
    ws.playerColor = playerColor; // Store player color in WebSocket object
    session.clients[clientId] = ws;
    session.playerCount++;

    console.log(`Client ${clientId} connected to session ${session.id} with color ${playerColor}`);

    // Send the client ID, session ID, and assigned color to the client
    const initialMessage = JSON.stringify({
        type: 'session',
        clientId: clientId,
        sessionId: session.id,
        isFirstPlayer: session.playerCount === 1,
        color: playerColor // Make sure color is included in the message
    });
    ws.send(initialMessage);

    // Handle incoming messages from the client
    ws.on('message', function(data) {
        let messageData;

        if (Buffer.isBuffer(data)) {
            // Convert binary buffer to string
            data = data.toString();
        }
    
        if (typeof data === 'string') {
            try {
                messageData = JSON.parse(data);

                if (messageData.type === 'playerUpdate') {
                    broadcastPlayerInfo(session.id, messageData);
                }
            } catch (e) {
                console.error('JSON parse error:', e.message);
            }
        }
    });

    // Handle client disconnection
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


// Attach WebSocket connection handler
wss.on('connection', handleConnection);

// Start the server
server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
