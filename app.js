const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const adminPassword = "admin_password"; // Password for admin authentication
const maxNumberOfClients = 5;

// CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from the 'Client/Web' directory
app.use(express.static(path.join(__dirname, 'Client', 'Web')));

let sessions = []; // Array to hold active sessions

// Handle root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'Web', 'index.html'), (err) => {
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
    const session = { id: sessionId, clients: [] };
    sessions.push(session);
    console.log(`New session created: ID=${sessionId}`);
    return session;
}

let adminClients = [];

function handleConnection(ws, req) {
    console.log('New WebSocket connection...'); // Log for debugging

    let session = sessions.find(s => s.clients.length < maxNumberOfClients);
    if (!session) {
        session = createSession();
    }

    const clientId = crypto.randomUUID(); // Generate a unique client ID
    const userAgent = req.headers['user-agent']; // Get the client’s user-agent to determine platform
    let platform = 'Unknown';

    if (userAgent.includes('Chrome')) {
        platform = 'Chrome';
    } else if (userAgent.includes('Unity')) {
        platform = 'Unity';
    } else {
        platform = 'Other';
    }

    ws.clientId = clientId;
    ws.sessionId = session.id;
    ws.platform = platform; // Store the platform for each client
    session.clients.push(ws);

    console.log(`Client connected: ID=${clientId}, Session=${session.id}, Platform=${platform}, IP=${ws._socket.remoteAddress}`);

    // Send the client ID, session ID, and platform to the client
    const initialMessage = JSON.stringify({
        type: 'sessions',
        clientId: clientId,
        sessionId: session.id,
        platform: platform
    });
    ws.send(initialMessage);

    // Send a heartbeat to keep the connection alive
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 10000);

    // Notify all admins about the new client connection
    adminClients.forEach(admin => {
        if (admin.readyState === WebSocket.OPEN) {
            admin.send(JSON.stringify({
                type: 'update_sessions',
                clientId: clientId,
                sessionId: session.id,
                platform: platform,
                message: `Client with ID ${clientId} has joined the session.`
            }));
        }
    });

    // Handle incoming messages from the client
    ws.on('message', function (data) {
        try {
            const message = JSON.parse(data);
    
            // Authenticate admin
            if (message == adminPassword) {
                ws.isAdmin = true;
                adminClients.push(ws);
                console.log('Admin authenticated.');
    
                // Send all session data to the admin
                ws.send(
                    JSON.stringify({
                        type: 'update_sessions',
                        sessions: sessions.map(session => ({
                            id: session.id,
                            clientCount: session.clients.length,
                            clients: session.clients.map(client => ({
                                id: client.clientId,
                                platform: client.platform,
                            })),
                        })),
                    })
                );
                return;
            }
    
            // Handle refresh request from admin
            if (message.type == 'refresh_sessions' && ws.isAdmin) {
                console.log('Admin requested session refresh.');
    
                // Send updated session data to the admin
                ws.send(
                    JSON.stringify({
                        type: 'update_sessions',
                        sessions: sessions.map(session => ({
                            id: session.id,
                            clientCount: session.clients.length,
                            clients: session.clients.map(client => ({
                                id: client.clientId,
                                platform: client.platform,
                            })),
                        })),
                    })
                );
            }
    
            // Handle client join or leave
            if (message.type == 'join') {
                session.clients.push(ws);
            } else if (message.type == 'leave') {
                session.clients = session.clients.filter(client => client !== ws);
            }
        } catch (error) {
            console.error('Invalid message format:', data);
        }
    });
    

    // Handle client disconnection
    ws.on('close', function() {
        console.log(`Client disconnected: ID=${clientId}, Session=${session.id}, IP=${ws._socket.remoteAddress}`);
        clearInterval(heartbeatInterval);
        session.clients = session.clients.filter(client => client !== ws);

        if (session.clients.length === 0) {
            console.log(`Session ended: ID=${session.id}`);
            sessions = sessions.filter(s => s !== session);
        }

        // Notify admins about client disconnection
        adminClients.forEach(admin => {
            if (admin.readyState === WebSocket.OPEN) {
                admin.send(JSON.stringify({
                    type: 'update_sessions',
                    clientId: clientId,
                    sessionId: session.id,
                    platform: platform,
                    message: `Client with ID ${clientId} has disconnected.`
                }));
            }
        });
    });
}



// Attach WebSocket connection handler
wss.on('connection', handleConnection);

// Start the server
server.listen(port, () => {
    console.log(`Server listening on https://localhost:${port}`);
});
