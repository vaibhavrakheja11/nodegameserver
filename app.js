const http = require('http');
const hostname = '0.0.0.0'; // Allows external connections
const port = process.env.PORT || 5000;
const fs = require('fs');
let count = 0;
let socketUrl = ''; // Variable to store the socket URL

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  count++;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World! NodeJS \n You are visitor number: ' + count + `\n Server running at http://${hostname}:${port}/ URL ${socketUrl}`);
});

//const io = socketIo(server);
const io = require("socket.io")(http, {   path: "/gameserver/" });
let clientCount = 0;
io.attach(server);
io.on('connection', (socket) => {
  console.log('A Unity client connected');
  clientCount++;
  
  // Store the connected socket URL
  socketUrl = socket.handshake.headers.origin || 'URL not available';
  io.emit('clientCount', { count: clientCount });

  
  // Handle incoming messages from Unity clients
  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Broadcast the message to all connected clients
    io.emit('message', data);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('A Unity client disconnected');
    clientCount--;
    io.emit('clientCount', { count: clientCount });
    socketUrl = '';
  });
});

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
