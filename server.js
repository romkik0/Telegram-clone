const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Simple JSON database
const DB_DIR = path.join(__dirname, 'data');
const DB_FILES = {
    users: path.join(DB_DIR, 'users.json'),
    chats: path.join(DB_DIR, 'chats.json'),
    messages: path.join(DB_DIR, 'messages.json')
};

// Create data directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database files
Object.entries(DB_FILES).forEach(([key, file]) => {
    if (!fs.existsSync(file)) {
        const initialData = key === 'messages' ? {} : [];
        fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
    }
});

// Database helper functions
const db = {
    read(type) {
        try {
            const data = fs.readFileSync(DB_FILES[type], 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${type}:`, error);
            return type === 'messages' ? {} : [];
        }
    },
    
    write(type, data) {
        try {
            fs.writeFileSync(DB_FILES[type], JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${type}:`, error);
            return false;
        }
    }
};

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints
app.get('/api/users', (req, res) => {
    const users = db.read('users');
    // Don't send passwords to client
    const safeUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        createdAt: u.createdAt
    }));
    res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
    const users = db.read('users');
    const newUser = req.body;
    
    // Check if username exists
    if (users.find(u => u.username === newUser.username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    users.push(newUser);
    db.write('users', users);
    
    res.json({ success: true, user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        avatar: newUser.avatar
    }});
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = db.read('users');
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar,
                bio: user.bio
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.put('/api/users/:id', (req, res) => {
    const users = db.read('users');
    const userId = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
        users[index] = { ...users[index], ...req.body };
        db.write('users', users);
        res.json({ success: true, user: users[index] });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.get('/api/chats', (req, res) => {
    const chats = db.read('chats');
    res.json(chats);
});

app.post('/api/chats', (req, res) => {
    const chats = db.read('chats');
    const newChat = req.body;
    
    chats.push(newChat);
    db.write('chats', chats);
    
    res.json({ success: true, chat: newChat });
});

app.put('/api/chats/:id', (req, res) => {
    const chats = db.read('chats');
    const chatId = parseInt(req.params.id);
    const index = chats.findIndex(c => c.id === chatId);
    
    if (index !== -1) {
        chats[index] = { ...chats[index], ...req.body };
        db.write('chats', chats);
        res.json({ success: true, chat: chats[index] });
    } else {
        res.status(404).json({ error: 'Chat not found' });
    }
});

app.get('/api/messages/:chatId', (req, res) => {
    const messages = db.read('messages');
    const chatId = req.params.chatId;
    res.json(messages[chatId] || []);
});

app.post('/api/messages/:chatId', (req, res) => {
    const messages = db.read('messages');
    const chatId = req.params.chatId;
    const newMessage = req.body;
    
    if (!messages[chatId]) {
        messages[chatId] = [];
    }
    
    messages[chatId].push(newMessage);
    db.write('messages', messages);
    
    res.json({ success: true, message: newMessage });
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Save to database
            if (data.type === 'message' && data.chatId) {
                const messages = db.read('messages');
                if (!messages[data.chatId]) {
                    messages[data.chatId] = [];
                }
                messages[data.chatId].push(data.message);
                db.write('messages', messages);
                
                // Update chat last message
                const chats = db.read('chats');
                const chatIndex = chats.findIndex(c => c.id === data.chatId);
                if (chatIndex !== -1) {
                    chats[chatIndex].lastMessage = data.message.text || '📷 Фото';
                    chats[chatIndex].time = data.message.time;
                    db.write('chats', chats);
                }
            } else if (data.type === 'reaction' && data.chatId) {
                const messages = db.read('messages');
                if (messages[data.chatId]) {
                    const msgIndex = messages[data.chatId].findIndex(m => m.id === data.messageId);
                    if (msgIndex !== -1) {
                        messages[data.chatId][msgIndex].reactions = data.reactions;
                        db.write('messages', messages);
                    }
                }
            }
            
            // Broadcast to all clients
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database directory: ${DB_DIR}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
