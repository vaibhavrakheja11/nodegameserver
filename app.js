const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const express = require('express');

const app = express();

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
  }
});
app.use(cors());
const port = process.env.PORT || 3000;
const host = 'localhost';  // Change this to 'localhost'

// Handle new client connections
io.on('connection', (socket) => {
  console.log('A Unity client connected: ', socket.id);

  // Send a welcome message to the client
  socket.emit('welcome', { message: 'Welcome to the server!', id: socket.id });

  // Handle custom events from Unity clients
  socket.on('test', (data) => {
    console.log(`Received test event from ${socket.id}:`, data);
    // You can broadcast this data to all connected clients, if needed
    io.emit('customEventResponse', { message: `Message from ${socket.id}: ${data.message}` });
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('A Unity client disconnected: ', socket.id);
  });
});

// Start the server on localhost
server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
