const http = require('http');
const hostname = '0.0.0.0'; // Allows external connections
const port = process.env.PORT || 3000;
const socketIo = require('socket.io');
const cors = require('cors');
const express = require('express');
const app = express();
let count = 0;
let socketUrl = ''; // Variable to store the socket URL

// Enable CORS for all routes
app.use(cors());

const server = http.createServer(app);

// Serve a simple response for the root path
app.get('/', (req, res) => {
  res.statusCode = 200;
  count++;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World! NodeJS \n You are visitor number: ' + count + `\n Server running at http://${hostname}:${port}/ URL ${socketUrl}`);
});

// Initialize Socket.IO and attach it to the HTTP server
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins (you can specify your domain instead)
    methods: ['GET', 'POST']
  },
  path: '/gameserver/'
});

let clientCount = 0;
const sessions = {};

io.on('connection', (socket) => {
  console.log('A client connected');
  clientCount++;

  // Store the connected socket URL
  socketUrl = socket.handshake.headers.origin || 'URL not available';
  io.emit('clientCount', { count: clientCount });

  socket.on('ready', () => {
    console.log('Client is ready');
    let sessionId;
    for (let id in sessions) {
      if (sessions[id].users.length < 2) {
        sessionId = id;
        break;
      }
    }

    if (!sessionId) {
      sessionId = `session-${Math.floor(clientCount / 2)}`;
      sessions[sessionId] = { users: [] };
    }

    sessions[sessionId].users.push(socket.id);
    socket.join(sessionId);

    if (sessions[sessionId].users.length === 1) {
      socket.emit('waitingForPartner');
    } else {
      io.to(sessionId).emit('sessionReady', { sessionId });
    }
  });

  socket.on('message', (data) => {
    console.log('Message received:', data);
    io.to(data.sessionId).emit('message', data);
  });

  socket.on('offer', (data) => {
    console.log('Offer received:', data);
    socket.to(data.sessionId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    console.log('Answer received:', data);
    socket.to(data.sessionId).emit('answer', data);
  });

  socket.on('iceCandidate', (data) => {
    console.log('ICE Candidate received:', data);
    socket.to(data.sessionId).emit('iceCandidate', data);
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
    clientCount--;
    io.emit('clientCount', { count: clientCount });
    socketUrl = '';

    for (let sessionId in sessions) {
      const index = sessions[sessionId].users.indexOf(socket.id);
      if (index !== -1) {
        sessions[sessionId].users.splice(index, 1);
        if (sessions[sessionId].users.length === 0) {
          delete sessions[sessionId];
        } else {
          io.to(sessionId).emit('partnerDisconnected');
        }
        break;
      }
    }
  });
});

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
