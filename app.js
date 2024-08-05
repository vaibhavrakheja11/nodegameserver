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

let sessions = [];
let waitingClient = null;

io.on('connection', (socket) => {
  console.log('A client connected');
  
  // Store the connected socket URL
  socketUrl = socket.handshake.headers.origin || 'URL not available';
  
  socket.on('ready', () => {
    if (waitingClient) {
      // Create a new session with two clients
      let sessionId = sessions.length;
      sessions.push([waitingClient, socket]);
      waitingClient.join(`session_${sessionId}`);
      socket.join(`session_${sessionId}`);
      io.to(`session_${sessionId}`).emit('sessionReady', { sessionId });
      waitingClient = null;
    } else {
      // Set this client as waiting for the next one
      waitingClient = socket;
      socket.emit('waitingForPartner');
    }
  });

  // Handle incoming messages from clients
  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Broadcast the message to all clients in the same session
    io.to(`session_${data.sessionId}`).emit('message', data);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('A client disconnected');
    if (waitingClient === socket) {
      waitingClient = null;
    } else {
      // Find the session this client was part of
      let sessionIndex = sessions.findIndex(session => session.includes(socket));
      if (sessionIndex !== -1) {
        // Remove the client from the session
        let session = sessions[sessionIndex];
        sessions[sessionIndex] = session.filter(client => client !== socket);
        io.to(`session_${sessionIndex}`).emit('partnerDisconnected');
      }
    }
    socketUrl = '';
  });
});

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
