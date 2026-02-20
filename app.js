// Crypto functions for password hashing (client-side)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'telegram_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// State
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let chats = JSON.parse(localStorage.getItem('chats')) || [];
let messages = JSON.parse(localStorage.getItem('messages')) || {};
let currentChatId = null;
let ws = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    initializeApp();
}

function setupEventListeners() {
    // Auth tabs
    document.getElementById('loginTab').addEventListener('click', () => {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('registerTab').classList.remove('active');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    });
    
    document.getElementById('registerTab').addEventListener('click', () => {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    });
    
    // Auth actions
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('registerBtn').addEventListener('click', register);
    
    // Enter key
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('regPasswordConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('Заполните все поля');
        return;
    }
    
    const hashedPassword = await hashPassword(password);
    const user = users.find(u => u.username === username && u.password === hashedPassword);
    
    if (user) {
        currentUser = {
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
    } else {
        alert('Неверный логин или пароль');
    }
}

async function register() {
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    if (!name || !username || !password || !passwordConfirm) {
        alert('Заполните все поля');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('Пароли не совпадают');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен быть минимум 6 символов');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        alert('Пользователь с таким логином уже существует');
        return;
    }
    
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
        id: Date.now(),
        name: name,
        username: username,
        password: hashedPassword,
        avatar: generateAvatar(name),
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Регистрация успешна! Войдите в систему');
    
    document.getElementById('loginTab').click();
    document.getElementById('loginUsername').value = username;
}

function generateAvatar(name) {
    const colors = ['#3390ec', '#2b7cd3', '#5ca3e6', '#1e88e5', '#1976d2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="${color}"/>
            <text x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-weight="500">${initials}</text>
        </svg>
    `)}`;
}

function initializeApp() {
    updateMenuProfile();
    renderChats();
    connectWebSocket();
    setupAppEventListeners();
}

function setupAppEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', toggleMenu);
    document.getElementById('closeMenu').addEventListener('click', toggleMenu);
    
    document.getElementById('myProfile').addEventListener('click', showProfile);
    document.getElementById('newGroup').addEventListener('click', createGroup);
    document.getElementById('newChannel').addEventListener('click', createChannel);
    document.getElementById('contacts').addEventListener('click', showContacts);
    document.getElementById('savedMessages').addEventListener('click', showSavedMessages);
    document.getElementById('settings').addEventListener('click', showSettings);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.getElementById('nightModeToggle').addEventListener('change', toggleNightMode);
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.getElementById('nightModeToggle').click();
    });
    
    document.getElementById('searchInput').addEventListener('input', searchUsers);
    
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function updateMenuProfile() {
    document.getElementById('menuUsername').textContent = currentUser.name;
    document.getElementById('menuAvatar').src = currentUser.avatar;
}

function toggleMenu() {
    document.getElementById('menuPanel').classList.toggle('active');
}

function toggleNightMode(e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

function searchUsers() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!query) {
        renderChats();
        return;
    }
    
    const results = users.filter(u => 
        u.id !== currentUser.id && 
        (u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
    );
    
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    if (results.length === 0) {
        chatList.innerHTML = `
            <div class="empty-state">
                <h3>Пользователи не найдены</h3>
                <p>Попробуйте другой запрос</p>
            </div>
        `;
        return;
    }
    
    results.forEach(user => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `
            <img src="${user.avatar}" alt="${user.name}" class="chat-item-avatar">
            <div class="chat-item-content">
                <div class="chat-item-header">
                    <span class="chat-item-name">${user.name}</span>
                </div>
                <div class="chat-item-message">@${user.username}</div>
            </div>
        `;
        chatItem.addEventListener('click', () => startChatWithUser(user));
        chatList.appendChild(chatItem);
    });
}

function startChatWithUser(user) {
    let chat = chats.find(c => 
        c.type === 'private' && 
        c.participants && 
        c.participants.includes(currentUser.id) && 
        c.participants.includes(user.id)
    );
    
    if (!chat) {
        chat = {
            id: Date.now(),
            type: 'private',
            name: user.name,
            avatar: user.avatar,
            participants: [currentUser.id, user.id],
            lastMessage: '',
            time: 'now',
            unread: 0,
            createdAt: new Date().toISOString()
        };
        chats.unshift(chat);
        saveChats();
    }
    
    document.getElementById('searchInput').value = '';
    renderChats();
    openChat(chat.id);
}

function renderChats() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        chatList.innerHTML = `
            <div class="empty-state">
                <svg width="80" height="80" viewBox="0 0 240 240">
                    <circle cx="120" cy="120" r="120" fill="#e0e0e0"/>
                    <path d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89L81.737 118.6" fill="#c8daea"/>
                </svg>
                <h3>Нет чатов</h3>
                <p>Найдите пользователей через поиск</p>
            </div>
        `;
        return;
    }
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        
        if (currentChatId === chat.id) {
            chatItem.classList.add('active');
        }
        
        chatItem.innerHTML = `
            <img src="${chat.avatar}" alt="${chat.name}" class="chat-item-avatar">
            <div class="chat-item-content">
                <div class="chat-item-header">
                    <span class="chat-item-name">${chat.name}</span>
                    <span class="chat-item-time">${chat.time}</span>
                </div>
                <div class="chat-item-message">${chat.lastMessage || 'Нет сообщений'}</div>
                ${chat.unread > 0 ? `<span class="chat-item-badge">${chat.unread}</span>` : ''}
            </div>
        `;
        
        chatItem.addEventListener('click', () => openChat(chat.id));
        chatList.appendChild(chatItem);
    });
}

function openChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return;
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (activeItem) activeItem.classList.add('active');
    
    document.getElementById('chatName').textContent = chat.name;
    document.getElementById('chatStatus').textContent = 'online';
    document.getElementById('chatAvatar').src = chat.avatar;
    
    chat.unread = 0;
    saveChats();
    renderChats();
    
    renderMessages(chatId);
}

function renderMessages(chatId) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    const chatMessages = messages[chatId] || [];
    
    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div class="welcome-screen">
                <h2>Начните общение</h2>
            </div>
        `;
        return;
    }
    
    chatMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.userId === currentUser.id ? 'sent' : 'received'}`;
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.time}</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const message = {
        id: Date.now(),
        userId: currentUser.id,
        text: text,
        time: time,
        createdAt: now.toISOString()
    };
    
    if (!messages[currentChatId]) {
        messages[currentChatId] = [];
    }
    
    messages[currentChatId].push(message);
    saveMessages();
    
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.lastMessage = text;
        chat.time = time;
        saveChats();
        renderChats();
    }
    
    renderMessages(currentChatId);
    input.value = '';
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            chatId: currentChatId,
            message: message
        }));
    }
}

function createGroup() {
    const name = prompt('Название группы:');
    if (!name) return;
    
    const group = {
        id: Date.now(),
        type: 'group',
        name: name,
        avatar: generateAvatar(name),
        participants: [currentUser.id],
        lastMessage: 'Группа создана',
        time: 'now',
        unread: 0,
        createdAt: new Date().toISOString()
    };
    
    chats.unshift(group);
    saveChats();
    renderChats();
    toggleMenu();
}

function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    
    const channel = {
        id: Date.now(),
        type: 'channel',
        name: name,
        avatar: generateAvatar(name),
        participants: [currentUser.id],
        lastMessage: 'Канал создан',
        time: 'now',
        unread: 0,
        createdAt: new Date().toISOString()
    };
    
    chats.unshift(channel);
    saveChats();
    renderChats();
    toggleMenu();
}

function showProfile() {
    alert(`Профиль:\nИмя: ${currentUser.name}\nЛогин: @${currentUser.username}`);
    toggleMenu();
}

function showContacts() {
    const contacts = users.filter(u => u.id !== currentUser.id).map(u => u.name).join(', ');
    alert('Контакты: ' + (contacts || 'Нет контактов'));
    toggleMenu();
}

function showSavedMessages() {
    alert('Сохраненные сообщения');
    toggleMenu();
}

function showSettings() {
    alert('Настройки');
    toggleMenu();
}

function logout() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        currentChatId = null;
        showAuth();
    }
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function saveMessages() {
    localStorage.setItem('messages', JSON.stringify(messages));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => console.log('Connected');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        ws.onerror = () => console.log('Connection error');
        
        ws.onclose = () => {
            console.log('Disconnected');
            setTimeout(connectWebSocket, 3000);
        };
    } catch (error) {
        console.log('WebSocket unavailable');
    }
}

function handleWebSocketMessage(data) {
    if (data.type === 'message' && data.chatId) {
        if (!messages[data.chatId]) {
            messages[data.chatId] = [];
        }
        messages[data.chatId].push(data.message);
        saveMessages();
        
        if (currentChatId === data.chatId) {
            renderMessages(data.chatId);
        } else {
            const chat = chats.find(c => c.id === data.chatId);
            if (chat) {
                chat.unread = (chat.unread || 0) + 1;
                chat.lastMessage = data.message.text;
                chat.time = data.message.time;
                saveChats();
                renderChats();
            }
        }
    }
}

// Load dark mode
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    setTimeout(() => {
        const toggle = document.getElementById('nightModeToggle');
        if (toggle) toggle.checked = true;
    }, 100);
}
