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

let waitingClient = null;
let sessions = {};

io.on('connection', (socket) => {
  console.log('A client connected: ', socket.id);

  // Handle 'ready' event
  socket.on('ready', () => {
    console.log('Client ready: ', socket.id);

    if (waitingClient) {
      const sessionId = waitingClient.id + '#' + socket.id;
      sessions[sessionId] = [waitingClient, socket];
      
      waitingClient.emit('sessionReady', { sessionId, player: 'Player 1' });
      socket.emit('sessionReady', { sessionId, player: 'Player 2' });
      
      waitingClient = null;
    } else {
      waitingClient = socket;
      socket.emit('waitingForPartner');
    }
  });

  // Handle text message
  socket.on('message', (data) => {
    console.log(`Message from ${socket.id} (${data.player}) in session ${data.sessionId}: `, data.message);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('message', { player: data.player, message: data.message });
    }
  });

  // Handle WebRTC signaling messages
  socket.on('offer', (data) => {
    console.log(`Offer from ${socket.id} in session ${data.sessionId}`);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('offer', data);
    }
  });

  socket.on('answer', (data) => {
    console.log(`Answer from ${socket.id} in session ${data.sessionId}`);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('answer', data);
    }
  });

  socket.on('iceCandidate', (data) => {
    console.log(`ICE candidate from ${socket.id} in session ${data.sessionId}`);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('iceCandidate', data);
    }
  });

  // Handle audio data
  socket.on('audioData', (data) => {
    console.log(`Audio data received from ${socket.id} in session ${data.sessionId}`);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('audioData', data);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected: ', socket.id);
    if (waitingClient === socket) {
      waitingClient = null;
    } else {
      for (const sessionId in sessions) {
        const [client1, client2] = sessions[sessionId];
        if (client1 === socket || client2 === socket) {
          const partner = client1 === socket ? client2 : client1;
          if (partner) {
            partner.emit('partnerDisconnected');
          }
          delete sessions[sessionId];
          break;
        }
      }
    }
  });
});

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
