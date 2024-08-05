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
let sessions = {};

io.on('connection', (socket) => {
  console.log('A client connected');
  clientCount++;

  socket.on('ready', () => {
    let sessionId = findOrCreateSession(socket);
    socket.join(sessionId);
    io.to(sessionId).emit('sessionReady', { sessionId });

    // Store the connected socket URL
    socketUrl = socket.handshake.headers.origin || 'URL not available';
    io.emit('clientCount', { count: clientCount });
  });

  socket.on('message', (data) => {
    console.log('Message received:', data);
    io.to(data.sessionId).emit('message', { message: data.message });
  });

  socket.on('signal', (data) => {
    io.to(data.sessionId).emit('signal', { sessionId: data.sessionId, signal: data.signal });
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
    clientCount--;
    socketUrl = '';
    io.emit('clientCount', { count: clientCount });

    let sessionId = removeClientFromSession(socket);
    if (sessionId) {
      io.to(sessionId).emit('partnerDisconnected');
    }
  });
});

function findOrCreateSession(socket) {
  let availableSession = Object.keys(sessions).find(
    sessionId => sessions[sessionId].length === 1
  );

  if (availableSession) {
    sessions[availableSession].push(socket.id);
    return availableSession;
  }

  let sessionId = generateSessionId();
  sessions[sessionId] = [socket.id];
  return sessionId;
}

function removeClientFromSession(socket) {
  for (let sessionId in sessions) {
    let session = sessions[sessionId];
    let index = session.indexOf(socket.id);
    if (index !== -1) {
      session.splice(index, 1);
      if (session.length === 0) {
        delete sessions[sessionId];
      }
      return sessionId;
    }
  }
  return null;
}

function generateSessionId() {
  return 'session-' + Math.random().toString(36).substr(2, 9);
}

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
