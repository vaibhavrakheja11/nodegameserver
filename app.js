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
const fs = require('fs');
const path = require('path');
const express = require('express');
const { createServer } = require('https');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Initialize a visit count variable
let visitCount = 0;

// Add CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from the 'Client/WebGL' directory
app.use(express.static(path.join(__dirname, 'Client', 'WebGL')));

// Handle root route
app.get('/', (req, res) => {
    visitCount++; // Increment the visit count
    res.sendFile(path.join(__dirname, 'Client', 'WebGL', 'index.html'), (err) => {
        if (err) {
            console.error(`Error serving index.html: ${err}`);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Handle /gameserver/ route by serving a specific file
app.get('/gameserver/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'WebGL', 'gameserver.html'), (err) => {
        if (err) {
            console.error(`Error serving gameserver.html: ${err}`);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Endpoint to get the visit count
app.get('/visit-count', (req, res) => {
    res.json({ visitCount });
});

// Read SSL certificate files
const options = {
    key: fs.readFileSync(path.join(__dirname, 'cert', 'private.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', 'certificate.crt'))
};

// Create the HTTPS server and attach the WebSocket server to it
const server = createServer(options, app);
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', function(ws) {
  const clientId = crypto.randomUUID();  // Generate a unique client ID

  // Associate the client ID with the WebSocket connection
  ws.clientId = clientId;

  console.log(`Client connected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);

  // Send "hello world" every 5 seconds
  const textInterval = setInterval(() => ws.send("hello world!"), 5000);

  // Send random bytes every 6 seconds
  const binaryInterval = setInterval(() => {
    const binaryData = crypto.randomBytes(8).buffer;
    ws.send(binaryData);
  }, 6000);

  ws.on('message', function(data) {
    if (typeof(data) === "string") {
      // Log only the first 100 characters of the string to avoid log spamming
      console.log(`String received from client (ID=${clientId}):`, data.slice(0, 100), data.length > 100 ? "..." : "");
    } else {
      // Log the binary data size instead of the full data to reduce log spamming
      console.log(`Binary data received from client (ID=${clientId}), size:`, data.byteLength, "bytes");
    }
  });

  ws.on('close', function() {
    console.log(`Client disconnected: ID=${clientId}, IP=${ws._socket.remoteAddress}`);
    clearInterval(textInterval);
    clearInterval(binaryInterval);
  });
});

// Start the server
server.listen(port, function() {
  console.log(`Server listening on https://localhost:${port}`);
});