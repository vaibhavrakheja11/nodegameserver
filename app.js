const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins (you can specify your domain instead)
    methods: ['GET', 'POST']
  },
  path: '/socket.io/'
});

io.on('connection', (socket) => {
  console.log('A client connected: ', socket.id);

  socket.on('beep', () => {
    console.log('Received beep event from client');
    socket.emit('boop', { message: 'boop' });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected: ', socket.id);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
