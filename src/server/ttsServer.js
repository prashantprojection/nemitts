import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Stream Deck API removed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// TTS state
let ttsState = {
  muted: false,
  paused: false,
  queue: [],
  currentMessage: null
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  // Add client to set
  clients.add(ws);

  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', data: ttsState }));

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle different message types
      switch (data.type) {
        case 'updateState':
          ttsState = { ...ttsState, ...data.data };
          broadcastState();

          // Stream Deck API state updates removed
          break;

        case 'speak':
          // Forward speak command to all clients
          broadcastMessage({
            type: 'speak',
            text: data.text,
            username: data.username || 'Stream Deck'
          });
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Broadcast state to all clients
function broadcastState() {
  const message = JSON.stringify({ type: 'state', data: ttsState });
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Broadcast a message to all clients
function broadcastMessage(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// API routes
app.post('/api/tts/mute', (req, res) => {
  // Check if the request has a specific mute state
  if (req.body && req.body.muted !== undefined) {
    ttsState.muted = req.body.muted;
  } else {
    // Toggle mute state if no specific state is provided
    ttsState.muted = !ttsState.muted;
  }

  // Broadcast the new state to all clients
  broadcastState();

  res.json({ muted: ttsState.muted });
});

app.post('/api/tts/pause', (req, res) => {
  ttsState.paused = !ttsState.paused;
  broadcastState();
  res.json({ paused: ttsState.paused });
});

app.post('/api/tts/skip', (req, res) => {
  broadcastMessage({ type: 'command', command: 'skip' });
  res.json({ success: true });
});

app.post('/api/tts/clear', (req, res) => {
  ttsState.queue = [];
  broadcastState();
  broadcastMessage({ type: 'command', command: 'clear' });
  res.json({ success: true });
});

app.post('/api/tts/speak', (req, res) => {
  const { text, username } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  broadcastMessage({
    type: 'speak',
    text,
    username: username || 'API'
  });

  res.json({ success: true });
});

app.get('/api/tts/state', (req, res) => {
  res.json(ttsState);
});

// Stream Deck API removed

// Start server
const PORT = process.env.PORT || 8910;
server.listen(PORT, () => {
  console.log(`TTS Server running on port ${PORT}`);
});

// Export for use in main app
export { server, app, ttsState };
