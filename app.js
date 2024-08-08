const http = require('http');
const socketIo = require('socket.io');
const express = require('express');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;
const host = 'localhost';  // Change this to 'localhost'

// Handle new client connections
io.on('connection', (socket) => {
  console.log('A Unity client connected: ', socket.id);

  // Send a welcome message to the client
  socket.emit('welcome', { message: 'Welcome to the server!', id: socket.id });

  // Handle custom events from Unity clients
  socket.on('customEvent', (data) => {
    console.log(`Received custom event from ${socket.id}:`, data);
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
