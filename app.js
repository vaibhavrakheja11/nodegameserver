// const http = require('http');
// const socketIo = require('socket.io');
// const cors = require('cors');
// const express = require('express');

// const app = express();

// const server = http.createServer(app);
// const io = require('socket.io')(server, {
//   cors: {
//       origin: "*",
//       methods: ["GET", "POST"]
//   }
// });
// app.use(cors());
// const port = process.env.PORT || 3000;
// const host = 'localhost';  // Change this to 'localhost'

// // Handle new client connections
// io.on('connection', (socket) => {
//   console.log('A Unity client connected: ', socket.id);

//   // Send a welcome message to the client
//   socket.emit('welcome', { message: 'Welcome to the server!', id: socket.id });

//   // Handle custom events from Unity clients
//   socket.on('test', (data) => {
//     console.log(`Received test event from ${socket.id}:`, data);
//     // You can broadcast this data to all connected clients, if needed
//     io.emit('customEventResponse', { message: `Message from ${socket.id}: ${data.message}` });
//   });

//   // Handle disconnections
//   socket.on('disconnect', () => {
//     console.log('A Unity client disconnected: ', socket.id);
//   });
// });

// // Start the server on localhost
// server.listen(port, host, () => {
//   console.log(`Server running at http://${host}:${port}/`);
// });
// const express = require('express');
// const { createServer } = require('http');
// const WebSocket = require('ws');
// const path = require('path');
// const cors = require('cors');
// const crypto = require('crypto'); // Ensure crypto is required for UUID and binary data

// const app = express();
// const port = process.env.PORT || 3000;

// // Initialize a visit count variable
// let visitCount = 0;

// // Add CORS middleware to allow requests from any origin
// app.use(cors());

// // Serve static files from the 'Client/WebGL' directory
// app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

// // Handle root route to serve index.html
// app.get('/', (req, res) => {
//     visitCount++; // Increment the visit count
//     res.sendFile(path.join(__dirname, 'Client', 'WebGL', 'index.html'), (err) => {
//         if (err) {
//             console.error(`Error serving index.html: ${err}`);
//             res.status(500).send('Internal Server Error');
//         }
//     });
// });

// // Create the HTTP server and attach the WebSocket server to it
// const server = createServer(app);
// const wss = new WebSocket.Server({ server });

// // Heartbeat mechanism to keep connections alive
// function heartbeat() {
//     this.isAlive = true;
// }

// wss.on('connection', function(ws) {
//     const clientId = crypto.randomUUID();  // Generate a unique client ID
//     ws.clientId = clientId;
//     ws.isAlive = true;
//     ws.on('pong', heartbeat);  // Listen for pong messages to confirm the client is alive

//     console.log(`Client connected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);

//     // Set intervals to send text and binary data to the client
//     const textInterval = setInterval(() => ws.send("hello world!"), 5000);
//     const binaryInterval = setInterval(() => {
//         const binaryData = crypto.randomBytes(8).buffer;
//         ws.send(binaryData);
//     }, 6000);

//     ws.on('message', function(data) {
//         if (typeof(data) === "string") {
//             console.log(`String received from client (ID=${clientId}):`, data.slice(0, 100), data.length > 100 ? "..." : "");
//         } else {
//             console.log(`Binary data received from client (ID=${clientId}), size:`, data.byteLength, "bytes");
//         }
//     });

//     ws.on('close', function() {
//         console.log(`Client disconnected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);
//         clearInterval(textInterval);  // Clear the intervals when the client disconnects
//         clearInterval(binaryInterval);
//     });

//     ws.on('error', function(err) {
//         console.error(`Error on client connection (ID=${clientId}):`, err);
//         clearInterval(textInterval);  // Ensure intervals are cleared even on error
//         clearInterval(binaryInterval);
//         ws.terminate();  // Close the connection on error
//     });
// });

// // Periodically check if clients are alive
// const interval = setInterval(() => {
//     wss.clients.forEach((ws) => {
//         if (ws.isAlive === false) {
//             console.log(`Terminating stale connection: ID=${ws.clientId}`);
//             return ws.terminate();  // Terminate unresponsive connections
//         }

//         ws.isAlive = false;
//         ws.ping(() => {});  // Send a ping to the client
//     });
// }, 30000);  // Check every 30 seconds

// // Handle server shutdown
// wss.on('close', function() {
//     clearInterval(interval);  // Clear the global interval when the server closes
// });

// // Start the server
// server.listen(port, () => {
//   console.log(`Server listening on https://localhost:${port}`);
// });
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from the 'Client/WebGL' directory
app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

let sessions = []; // Array to hold active sessions

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
    const session = { id: sessionId, clients: [] };
    sessions.push(session);
    console.log(`New session created: ID=${sessionId}`);
    return session;
}

// Function to handle client connection
function handleConnection(ws) {
    let session = sessions.find(s => s.clients.length < 2);
    if (!session) {
        session = createSession();
    }

    const clientId = crypto.randomUUID(); // Generate a unique client ID
    ws.clientId = clientId;
    ws.sessionId = session.id;
    session.clients.push(ws);

    console.log(`Client connected: ID=${clientId}, Session=${session.id}, IP=${ws._socket.remoteAddress}`);

    // Send the client ID and session ID to the client
    const initialMessage = JSON.stringify({
        type: 'session',
        clientId: clientId,
        sessionId: session.id
    });
    ws.send(initialMessage);

    // Send a heartbeat to keep the connection alive
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 10000);

    // Send text and binary data periodically
    const textInterval = setInterval(() => ws.send("hello world!"), 5000);
    const binaryInterval = setInterval(() => {
        const binaryData = crypto.randomBytes(8).buffer;
        ws.send(binaryData);
    }, 6000);

    // Handle incoming messages from the client
    ws.on('message', function(data) {
        if (typeof(data) === "string") {
            console.log(`String received from client (ID=${clientId}, Session=${session.id}):`, data.slice(0, 100), data.length > 100 ? "..." : "");
        } else {
            console.log(`Binary data received from client (ID=${clientId}, Session=${session.id}), size:`, data.byteLength, "bytes");
        }
    });

    // Handle client disconnection
    ws.on('close', function() {
        console.log(`Client disconnected: ID=${clientId}, Session=${session.id}, IP=${ws._socket.remoteAddress}`);
        clearInterval(heartbeatInterval);
        clearInterval(textInterval);
        clearInterval(binaryInterval);
        session.clients = session.clients.filter(client => client !== ws);

        if (session.clients.length === 0) {
            console.log(`Session ended: ID=${session.id}`);
            sessions = sessions.filter(s => s !== session);
        }
    });
}

// Attach WebSocket connection handler
wss.on('connection', handleConnection);

// Start the server
server.listen(port, () => {
  console.log(`Server listening on https://localhost:${port}`);
});

