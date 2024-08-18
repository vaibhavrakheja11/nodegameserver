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
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Initialize a visit count variable
let visitCount = 0;

// Add CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from the 'Client/WebGL' directory
app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

// Handle root route to serve index.html
app.get('/', (req, res) => {
    visitCount++; // Increment the visit count
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

// Handle WebSocket connections
wss.on('connection', function(ws) {
    const clientId = crypto.randomUUID();  // Generate a unique client ID
    ws.clientId = clientId;

    console.log(`Client connected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);

    const textInterval = setInterval(() => ws.send("hello world!"), 5000);

    const binaryInterval = setInterval(() => {
        const binaryData = crypto.randomBytes(8).buffer;
        ws.send(binaryData);
    }, 6000);

    ws.on('message', function(data) {
        if (typeof(data) === "string") {
            console.log(`String received from client (ID=${clientId}):`, data.slice(0, 100), data.length > 100 ? "..." : "");
        } else {
            console.log(`Binary data received from client (ID=${clientId}), size:`, data.byteLength, "bytes");
        }
    });

    ws.on('close', function() {
        console.log(`Client disconnected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);
        clearInterval(textInterval);
        clearInterval(binaryInterval);
    });
});

// Start the server
server.listen(port, () => {
  console.log(`Server listening on https://localhost:${port}`);
});