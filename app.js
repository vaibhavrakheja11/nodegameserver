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
  console.log("client joined.");

  // send "hello world" interval
  const textInterval = setInterval(() => ws.send("hello world!"), 100);

  // send random bytes interval
  const binaryInterval = setInterval(() => ws.send(crypto.randomBytes(8).buffer), 110);

  ws.on('message', function(data) {
    if (typeof(data) === "string") {
      // client sent a string
      console.log("string received from client -> '" + data + "'");
    } else {
      console.log("binary received from client -> " + Array.from(data).join(", ") + "");
    }
  });

  ws.on('close', function() {
    console.log("client left.");
    clearInterval(textInterval);
    clearInterval(binaryInterval);
  });
});

// Start the server
server.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});
