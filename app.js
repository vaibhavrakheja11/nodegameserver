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
const express = require('express');
const { createServer } = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Initialize a visit count variable
let visitCount = 0;

// Add CORS middleware to allow requests from any origin
app.use(cors());

// Serve static files from a different directory if needed
// For example, if you have a 'public' directory now:
app.use(express.static(path.join(__dirname, 'client')));

// Handle root route
app.get('/', (req, res) => {
    visitCount++; // Increment the visit count
    res.send('<h1>Hello from the server!</h1><p>Server visit count: ' + visitCount + '</p>');
});

// Create the HTTP server and attach the Socket.IO server to it
const server = createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A client connected: ', socket.id);

    // Send a welcome message to the client
    socket.emit('welcome', { message: 'Welcome to the server!', id: socket.id });

    // Handle custom events from clients
    socket.on('customEvent', (data) => {
        console.log(`Received custom event from ${socket.id}:`, data);
        // Broadcast this data to all connected clients
        io.emit('customEventResponse', { message: `Message from ${socket.id}: ${data.message}` });
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('A client disconnected: ', socket.id);
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});