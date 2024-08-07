const http = require('http');
const hostname = '0.0.0.0'; // Allows external connections
const port = process.env.PORT || 3000;
const socketIo = require('socket.io');
const cors = require('cors');
const express = require('express');
const app = express();
let count = 0;

app.use(cors());

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.statusCode = 200;
  count++;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World! NodeJS \n You are visitor number: ' + count);
});

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  path: '/gameserver/'
});

let waitingClient = null;
let sessions = {};
let playerCounter = 0; // Counter to assign unique player IDs

io.on('connection', (socket) => {
  console.log('A client connected: ', socket.id);

  socket.on('clientType', (type) => {
    if (type === 'Unity') {
      console.log(`Unity client connected: ${socket.id}`);
    } else if (type === 'HTML') {
      console.log(`HTML client connected: ${socket.id}`);
    } else {
      console.log(`Unknown client type connected: ${socket.id}`);
    }
  });

  socket.on('ready', () => {
    console.log('Client ready: ', socket.id);

    if (waitingClient) {
      const sessionId = waitingClient.id + '#' + socket.id;
      const player1Id = `player-${++playerCounter}`;
      const player2Id = `player-${++playerCounter}`;
      sessions[sessionId] = [waitingClient, socket];
      
      waitingClient.emit('sessionReady', { sessionId, playerId: player1Id });
      socket.emit('sessionReady', { sessionId, playerId: player2Id });
      
      waitingClient = null;
    } else {
      waitingClient = socket;
      socket.emit('waitingForPartner');
    }
  });

  socket.on('message', (data) => {
    console.log(`Message from ${socket.id} (${data.player}) in session ${data.sessionId}: `, data.message);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('message', { player: data.player, message: data.message });
    }
    socket.emit('message', { player: data.player, message: data.message });
  });

  socket.on('positionUpdate', (data) => {
    console.log(`Position update from ${socket.id} (${data.player}) in session ${data.sessionId}: `, data.position);
    const [client1, client2] = sessions[data.sessionId] || [];
    const partner = client1 === socket ? client2 : client1;

    if (partner) {
      partner.emit('positionUpdate', { player: data.player, position: data.position });
    }
  });

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

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
