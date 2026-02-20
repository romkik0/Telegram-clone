const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Try MongoDB first, fallback to JSON files
let useMongoDb = false;
let db = null;

// MongoDB setup (if MONGODB_URI is provided)
if (process.env.MONGODB_URI) {
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(process.env.MONGODB_URI);
        
        client.connect().then(() => {
            console.log('✅ Connected to MongoDB');
            db = client.db('telegram-clone');
            useMongoDb = true;
        }).catch(err => {
            console.log('⚠️ MongoDB connection failed, using JSON files:', err.message);
            setupJsonDb();
        });
    } catch (error) {
        console.log('⚠️ MongoDB not available, using JSON files');
        setupJsonDb();
    }
} else {
    console.log('ℹ️ No MONGODB_URI, using JSON files');
    setupJsonDb();
}

// JSON Database fallback
const DB_DIR = path.join(__dirname, 'data');
const DB_FILES = {
    users: path.join(DB_DIR, 'users.json'),
    chats: path.join(DB_DIR, 'chats.json'),
    messages: path.join(DB_DIR, 'messages.json')
};

function setupJsonDb() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    
    Object.entries(DB_FILES).forEach(([key, file]) => {
        if (!fs.existsSync(file)) {
            const initialData = key === 'messages' ? {} : [];
            fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
        }
    });
}

// Database abstraction layer
const database = {
    async getUsers() {
        if (useMongoDb && db) {
            return await db.collection('users').find({}).toArray();
        } else {
            const data = fs.readFileSync(DB_FILES.users, 'utf8');
            return JSON.parse(data);
        }
    },
    
    async saveUser(user) {
        if (useMongoDb && db) {
            await db.collection('users').insertOne(user);
        } else {
            const users = JSON.parse(fs.readFileSync(DB_FILES.users, 'utf8'));
            users.push(user);
            fs.writeFileSync(DB_FILES.users, JSON.stringify(users, null, 2));
        }
    },
    
    async updateUser(userId, updates) {
        if (useMongoDb && db) {
            await db.collection('users').updateOne({ id: userId }, { $set: updates });
        } else {
            const users = JSON.parse(fs.readFileSync(DB_FILES.users, 'utf8'));
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                fs.writeFileSync(DB_FILES.users, JSON.stringify(users, null, 2));
            }
        }
    },
    
    async getChats() {
        if (useMongoDb && db) {
            return await db.collection('chats').find({}).toArray();
        } else {
            const data = fs.readFileSync(DB_FILES.chats, 'utf8');
            return JSON.parse(data);
        }
    },
    
    async saveChat(chat) {
        if (useMongoDb && db) {
            await db.collection('chats').insertOne(chat);
        } else {
            const chats = JSON.parse(fs.readFileSync(DB_FILES.chats, 'utf8'));
            chats.push(chat);
            fs.writeFileSync(DB_FILES.chats, JSON.stringify(chats, null, 2));
        }
    },
    
    async updateChat(chatId, updates) {
        if (useMongoDb && db) {
            await db.collection('chats').updateOne({ id: chatId }, { $set: updates });
        } else {
            const chats = JSON.parse(fs.readFileSync(DB_FILES.chats, 'utf8'));
            const index = chats.findIndex(c => c.id === chatId);
            if (index !== -1) {
                chats[index] = { ...chats[index], ...updates };
                fs.writeFileSync(DB_FILES.chats, JSON.stringify(chats, null, 2));
            }
        }
    },
    
    async getMessages(chatId) {
        if (useMongoDb && db) {
            return await db.collection('messages').find({ chatId: chatId }).toArray();
        } else {
            const data = fs.readFileSync(DB_FILES.messages, 'utf8');
            const allMessages = JSON.parse(data);
            return allMessages[chatId] || [];
        }
    },
    
    async saveMessage(chatId, message) {
        if (useMongoDb && db) {
            await db.collection('messages').insertOne({ ...message, chatId });
        } else {
            const allMessages = JSON.parse(fs.readFileSync(DB_FILES.messages, 'utf8'));
            if (!allMessages[chatId]) allMessages[chatId] = [];
            allMessages[chatId].push(message);
            fs.writeFileSync(DB_FILES.messages, JSON.stringify(allMessages, null, 2));
        }
    }
};

// Serve static files
app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints
app.get('/api/users', async (req, res) => {
    try {
        const users = await database.getUsers();
        console.log('📋 GET /api/users - returning', users.length, 'users');
        const safeUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
            bio: u.bio,
            createdAt: u.createdAt
        }));
        res.json(safeUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const users = await database.getUsers();
        const newUser = req.body;
        
        console.log('📝 Registering new user:', newUser.username);
        
        if (users.find(u => u.username === newUser.username)) {
            console.log('❌ Username already exists:', newUser.username);
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        await database.saveUser(newUser);
        console.log('✅ User registered successfully:', newUser.username);
        
        res.json({ success: true, user: {
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            avatar: newUser.avatar
        }});
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await database.getUsers();
        
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
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await database.updateUser(userId, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/chats', async (req, res) => {
    try {
        const chats = await database.getChats();
        res.json(chats);
    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/chats', async (req, res) => {
    try {
        const newChat = req.body;
        await database.saveChat(newChat);
        res.json({ success: true, chat: newChat });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/chats/:id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.id);
        await database.updateChat(chatId, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/messages/:chatId', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chatId);
        const messages = await database.getMessages(chatId);
        res.json(messages);
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/messages/:chatId', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chatId);
        const newMessage = req.body;
        await database.saveMessage(chatId, newMessage);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('✅ New client connected');
    clients.add(ws);
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Received:', data.type, 'for chat:', data.chatId);
            
            // Save to database
            if (data.type === 'message' && data.chatId) {
                const messages = await database.getMessages(data.chatId);
                const exists = messages.find(m => m.id === data.message.id);
                
                if (!exists) {
                    await database.saveMessage(data.chatId, data.message);
                    console.log('💾 Message saved to DB');
                    
                    // Update chat
                    await database.updateChat(data.chatId, {
                        lastMessage: data.message.text || '📷 Фото',
                        time: data.message.time
                    });
                }
            }
            
            // Broadcast to all OTHER clients
            let broadcastCount = 0;
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                    broadcastCount++;
                }
            });
            console.log('📤 Broadcasted to', broadcastCount, 'clients');
            
        } catch (error) {
            console.error('❌ Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('❌ Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

server.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💾 Database: ${useMongoDb ? 'MongoDB' : 'JSON files'}`);
    console.log(`🌐 Open http://localhost:${PORT}`);
    console.log('=================================');
});
