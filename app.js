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
const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = 3000;

// Add CORS middleware to allow requests from any origin
app.use(cors());

// Create the HTTP server and attach the WebSocket server to it
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', function(ws) {
  const clientId = crypto.randomUUID();  // Generate a unique client ID

  // Associate the client ID with the WebSocket connection
  ws.clientId = clientId;

  console.log(`Client connected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);

  // send "hello world" every 5 seconds
  const textInterval = setInterval(() => ws.send("hello world!"), 5000);

  // send random bytes every 6 seconds
  const binaryInterval = setInterval(() => {
    const binaryData = crypto.randomBytes(8).buffer;
    ws.send(binaryData);
  }, 6000);

  ws.on('message', function(data) {
    if (typeof(data) === "string") {
      // Log only the first 100 characters of the string to avoid log spamming
      console.log(`String received from client (ID=${clientId}):`, data.slice(0, 100), data.length > 100 ? "..." : "");
    } else {
      // Log the binary data size instead of the full data to reduce log spamming
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
server.listen(port, function() {
  console.log(`Server listening on http://localhost:${port}`);
});