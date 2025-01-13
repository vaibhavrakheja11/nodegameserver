const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const adminPassword = "admin_password"; // Password for admin authentication
const maxNumberOfClients = 2;

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
function createSession(isAdminSession = false) {
    const sessionId = crypto.randomUUID();
    const session = { id: sessionId, clients: [], isAdminSession };
    sessions.push(session);
    console.log(`New session created: ID=${sessionId}, Admin Session=${isAdminSession}`);
    return session;
}

let adminClients = [];

// Handle WebSocket connection
function handleConnection(ws, req) {
    console.log('New WebSocket connection...');

    // Check if the client is an admin
    const isAdmin = ws.isAdmin === true;

    // If it's an admin, assign to an admin session, otherwise a regular client session
    let session = isAdmin
        ? sessions.find(s => s.isAdminSession) // Find an existing admin session
        : sessions.find(s => s.clients.length < maxNumberOfClients); // Find a regular session for clients

    // If no session exists, create a new one
    if (!session) {
        session = createSession(isAdmin); // Create a new session based on type
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

    // Notify admins about the new client connection
    if (isAdmin) {
        adminClients.push(ws); // Add admin to adminClients list
    } else {
        // Notify all admins about the new client connection
        adminClients.forEach(admin => {
            if (admin.readyState === WebSocket.OPEN) {
                admin.send(JSON.stringify({
                    type: 'update_session',
                    clientId: clientId,
                    sessionId: session.id,
                    platform: platform,
                    message: `Client with ID ${clientId} has joined the session.`
                }));
            }
        });
    }

    // Handle incoming messages from the client
    ws.on('message', function(data) {
        console.log(`Message received from client: "${data}"`);

        // Check if the client is an admin and handle admin password authentication
        if (!isAdmin && data === adminPassword) {
            console.log('Admin password matched. Authenticating...');
            ws.isAdmin = true;
            adminClients.push(ws); // Add to admin list
            console.log('Admin authenticated');
            ws.send(JSON.stringify({
                type: 'update_sessions',
                sessions: sessions.map(session => ({
                    id: session.id,
                    clientCount: session.clients.length,
                    clients: session.clients.map(client => ({
                        id: client.clientId,
                        platform: client.platform
                    }))
                }))
            }));
        } else if (data === 'join') {
            session.clients.push(ws);
        } else if (data === 'leave') {
            session.clients = session.clients.filter(client => client !== ws);
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
                    type: 'update_session',
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
