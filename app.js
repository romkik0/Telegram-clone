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
let users = [];
let chats = [];
let messages = {};
let currentChatId = null;
let ws = null;
let folders = JSON.parse(localStorage.getItem('folders')) || [];
let replyToMessage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        await loadDataFromServer();
        showApp();
    } else {
        showAuth();
    }
}

async function loadDataFromServer() {
    try {
        // Load users
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
            users = await usersRes.json();
            console.log('Loaded users:', users.length);
        }
        
        // Load chats
        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) {
            chats = await chatsRes.json();
            console.log('Loaded chats:', chats.length);
        }
        
        // Load messages for current chats
        messages = {};
        for (const chat of chats) {
            const messagesRes = await fetch(`/api/messages/${chat.id}`);
            if (messagesRes.ok) {
                messages[chat.id] = await messagesRes.json();
            }
        }
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // If server fails, try to use localStorage as fallback
        users = JSON.parse(localStorage.getItem('users_backup')) || [];
        chats = JSON.parse(localStorage.getItem('chats_backup')) || [];
        messages = JSON.parse(localStorage.getItem('messages_backup')) || {};
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
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: hashedPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            await loadDataFromServer();
            showApp();
        } else {
            alert('Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка входа');
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
    
    // Валидация username: только латиница и цифры
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        alert('Username может содержать только латинские буквы и цифры (без пробелов, тире и русских букв)');
        return;
    }
    
    if (username.length < 3) {
        alert('Username должен быть минимум 3 символа');
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
    
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
        id: Date.now(),
        name: name,
        username: username,
        password: hashedPassword,
        avatar: generateAvatar(name),
        bio: '',
        createdAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('User registered:', newUser.username);
            alert('Регистрация успешна! Войдите в систему');
            document.getElementById('loginTab').click();
            document.getElementById('loginUsername').value = username;
        } else {
            alert(data.error || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Ошибка регистрации. Попробуйте еще раз.');
    }
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
    
    // Backup data to localStorage
    localStorage.setItem('users_backup', JSON.stringify(users));
    localStorage.setItem('chats_backup', JSON.stringify(chats));
    localStorage.setItem('messages_backup', JSON.stringify(messages));
    
    console.log('App initialized with', users.length, 'users and', chats.length, 'chats');
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
    
    const chatInfoBtn = document.getElementById('chatInfoBtn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', showChatInfo);
    }
    
    document.getElementById('nightModeToggle').addEventListener('change', toggleNightMode);
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.getElementById('nightModeToggle').click();
    });
    
    document.getElementById('searchInput').addEventListener('input', searchUsers);
    
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Photo upload
    document.getElementById('attachBtn').addEventListener('click', () => {
        document.getElementById('photoInput').click();
    });
    
    document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
    
    // Folders
    const createFolderBtn = document.getElementById('createFolder');
    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', createFolder);
    }
    
    // Chat management
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', addMemberToChat);
    }
    
    // Avatar input
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Файл слишком большой! Максимум 2MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                currentUser.avatar = event.target.result;
                document.getElementById('profileAvatar').src = currentUser.avatar;
                document.getElementById('menuAvatar').src = currentUser.avatar;
            };
            reader.readAsDataURL(file);
        });
    }
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
    
    // Reload users from server for search
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            users = data;
            console.log('Search: loaded', users.length, 'users');
            
            // Search in existing chats first
            const matchingChats = chats.filter(c => 
                c.name.toLowerCase().includes(query)
            );
            
            // Search for users not in chats
            const results = users.filter(u => 
                u.id !== currentUser.id && 
                (u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
            );
            
            const chatList = document.getElementById('chatList');
            chatList.innerHTML = '';
            
            // Show matching chats first
            if (matchingChats.length > 0) {
                const chatsHeader = document.createElement('div');
                chatsHeader.className = 'search-section-header';
                chatsHeader.textContent = 'Чаты и группы';
                chatList.appendChild(chatsHeader);
                
                matchingChats.forEach(chat => {
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
                        </div>
                    `;
                    chatItem.addEventListener('click', () => {
                        document.getElementById('searchInput').value = '';
                        openChat(chat.id);
                    });
                    chatList.appendChild(chatItem);
                });
            }
            
            // Show users
            if (results.length > 0) {
                const usersHeader = document.createElement('div');
                usersHeader.className = 'search-section-header';
                usersHeader.textContent = 'Пользователи';
                chatList.appendChild(usersHeader);
                
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
                    chatItem.addEventListener('click', () => {
                        document.getElementById('searchInput').value = '';
                        startChatWithUser(user);
                    });
                    chatList.appendChild(chatItem);
                });
            }
            
            if (matchingChats.length === 0 && results.length === 0) {
                chatList.innerHTML = `
                    <div class="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <h3>Ничего не найдено</h3>
                        <p>Попробуйте другой запрос</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            const chatList = document.getElementById('chatList');
            chatList.innerHTML = '<div class="empty-state"><h3>Ошибка поиска</h3><p>Попробуйте еще раз</p></div>';
        });
}

async function startChatWithUser(user) {
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
        
        try {
            await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chat)
            });
        } catch (error) {
            console.error('Error creating chat:', error);
        }
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
    
    // Show participant count for groups/channels
    let statusText = 'online';
    if (chat.type === 'group') {
        const memberCount = chat.participants ? chat.participants.length : 1;
        statusText = `${memberCount} участников`;
    } else if (chat.type === 'channel') {
        const memberCount = chat.participants ? chat.participants.length : 1;
        statusText = `${memberCount} подписчиков`;
    }
    
    document.getElementById('chatStatus').textContent = statusText;
    document.getElementById('chatAvatar').src = chat.avatar;
    
    // Show/hide add member button
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (chat.type === 'group' || chat.type === 'channel') {
        addMemberBtn.style.display = 'flex';
    } else {
        addMemberBtn.style.display = 'none';
    }
    
    chat.unread = 0;
    saveChats();
    renderChats();
    
    renderMessages(chatId);
}

function renderMessages(chatId) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    const chatMessages = messages[chatId] || [];
    const chat = chats.find(c => c.id === chatId);
    const isGroupChat = chat && (chat.type === 'group' || chat.type === 'channel');
    
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
        const isSent = msg.userId === currentUser.id;
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = msg.id;
        
        // Get sender info
        let senderAvatar = '';
        let senderName = msg.userName || 'Пользователь';
        
        if (!isSent) {
            const sender = users.find(u => u.id === msg.userId);
            if (sender) {
                senderAvatar = sender.avatar;
                senderName = sender.name;
            } else {
                senderAvatar = generateAvatar(senderName);
            }
        }
        
        let content = '';
        
        // Reply preview
        let replyHtml = '';
        if (msg.replyTo) {
            const replyMsg = chatMessages.find(m => m.id === msg.replyTo);
            if (replyMsg) {
                const replyText = replyMsg.text || (replyMsg.type === 'photo' ? '📷 Фото' : 'Сообщение');
                replyHtml = `
                    <div class="message-reply" onclick="scrollToMessage(${msg.replyTo})">
                        <div class="reply-line"></div>
                        <div class="reply-content">
                            <div class="reply-author">${replyMsg.userName || 'Пользователь'}</div>
                            <div class="reply-text">${escapeHtml(replyText)}</div>
                        </div>
                    </div>
                `;
            }
        }
        
        if (msg.type === 'photo') {
            content = `
                ${!isSent && isGroupChat ? `<img src="${senderAvatar}" class="message-avatar" alt="${senderName}">` : ''}
                <div class="message-bubble">
                    ${!isSent && isGroupChat ? `<div class="message-sender" style="color: ${getColorForUser(msg.userId)}">${senderName}</div>` : ''}
                    ${replyHtml}
                    <img src="${msg.photo}" class="message-photo" alt="photo">
                    <div class="message-footer">
                        <div class="message-time">${msg.time}</div>
                        <button class="reaction-btn" onclick="showReactionPicker(${msg.id})">😊</button>
                        <button class="reply-btn" onclick="setReplyTo(${msg.id})">↩</button>
                    </div>
                    ${renderReactions(msg.reactions)}
                </div>
            `;
        } else {
            content = `
                ${!isSent && isGroupChat ? `<img src="${senderAvatar}" class="message-avatar" alt="${senderName}">` : ''}
                <div class="message-bubble">
                    ${!isSent && isGroupChat ? `<div class="message-sender" style="color: ${getColorForUser(msg.userId)}">${senderName}</div>` : ''}
                    ${replyHtml}
                    <div class="message-text">${escapeHtml(msg.text)}</div>
                    <div class="message-footer">
                        <div class="message-time">${msg.time}</div>
                        <button class="reaction-btn" onclick="showReactionPicker(${msg.id})">😊</button>
                        <button class="reply-btn" onclick="setReplyTo(${msg.id})">↩</button>
                    </div>
                    ${renderReactions(msg.reactions)}
                </div>
            `;
        }
        
        messageDiv.innerHTML = content;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

function getColorForUser(userId) {
    const colors = ['#e17076', '#7f8c8d', '#a695e7', '#7bc862', '#ee7aae', '#6ec9cb', '#65aadd', '#ee8157'];
    const index = userId % colors.length;
    return colors[index];
}

window.scrollToMessage = function(messageId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageEl.classList.add('highlight');
        setTimeout(() => messageEl.classList.remove('highlight'), 2000);
    }
};

function renderReactions(reactions) {
    if (!reactions || Object.keys(reactions).length === 0) return '';
    
    let html = '<div class="message-reactions">';
    for (const [emoji, users] of Object.entries(reactions)) {
        const count = users.length;
        const hasMyReaction = users.includes(currentUser.id);
        html += `<span class="reaction ${hasMyReaction ? 'my-reaction' : ''}">${emoji} ${count}</span>`;
    }
    html += '</div>';
    return html;
}

window.showReactionPicker = function(messageId) {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = emojis.map(e => `<span class="emoji-option" onclick="addReaction(${messageId}, '${e}')">${e}</span>`).join('');
    
    document.body.appendChild(picker);
    
    setTimeout(() => {
        picker.addEventListener('click', () => {
            picker.remove();
        });
        document.addEventListener('click', function removePickerOnClick() {
            picker.remove();
            document.removeEventListener('click', removePickerOnClick);
        });
    }, 10);
};

window.addReaction = async function(messageId, emoji) {
    if (!currentChatId) return;
    
    const chatMessages = messages[currentChatId];
    const message = chatMessages.find(m => m.id === messageId);
    
    if (!message) return;
    
    if (!message.reactions) {
        message.reactions = {};
    }
    
    if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
    }
    
    const userIndex = message.reactions[emoji].indexOf(currentUser.id);
    if (userIndex > -1) {
        message.reactions[emoji].splice(userIndex, 1);
        if (message.reactions[emoji].length === 0) {
            delete message.reactions[emoji];
        }
    } else {
        message.reactions[emoji].push(currentUser.id);
    }
    
    renderMessages(currentChatId);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'reaction',
            chatId: currentChatId,
            messageId: messageId,
            reactions: message.reactions
        }));
    }
};

window.setReplyTo = function(messageId) {
    replyToMessage = messageId;
    const chatMessages = messages[currentChatId];
    const message = chatMessages.find(m => m.id === messageId);
    
    if (!message) return;
    
    const replyPreview = document.getElementById('replyPreview');
    replyPreview.classList.remove('hidden');
    document.getElementById('replyAuthor').textContent = message.userName || 'Пользователь';
    document.getElementById('replyText').textContent = message.text || '📷 Фото';
};

function cancelReply() {
    replyToMessage = null;
    document.getElementById('replyPreview').classList.add('hidden');
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const message = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: text,
        time: time,
        createdAt: now.toISOString(),
        reactions: {}
    };
    
    if (replyToMessage) {
        message.replyTo = replyToMessage;
        cancelReply();
    }
    
    if (!messages[currentChatId]) {
        messages[currentChatId] = [];
    }
    
    messages[currentChatId].push(message);
    
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.lastMessage = text;
        chat.time = time;
        renderChats();
    }
    
    renderMessages(currentChatId);
    input.value = '';
    
    // Send to server
    try {
        await fetch(`/api/messages/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            chatId: currentChatId,
            message: message
        }));
    }
}

async function createGroup() {
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
    
    try {
        await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(group)
        });
    } catch (error) {
        console.error('Error creating group:', error);
    }
    
    renderChats();
    toggleMenu();
}

async function createChannel() {
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
    
    try {
        await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(channel)
        });
    } catch (error) {
        console.error('Error creating channel:', error);
    }
    
    renderChats();
    toggleMenu();
}

function showProfile() {
    toggleMenu();
    
    document.getElementById('profileAvatar').src = currentUser.avatar;
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profileBio').value = currentUser.bio || '';
    
    openModal('profileModal');
}

function showContacts() {
    toggleMenu();
    openModal('contactsModal');
    renderContacts();
}

function showSavedMessages() {
    alert('Сохраненные сообщения');
    toggleMenu();
}

function showSettings() {
    toggleMenu();
    
    const darkMode = document.body.classList.contains('dark-mode');
    document.getElementById('settingsDarkMode').checked = darkMode;
    
    openModal('settingsModal');
    
    document.getElementById('settingsDarkMode').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
            document.getElementById('nightModeToggle').checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
            document.getElementById('nightModeToggle').checked = false;
        }
    });
}

function logout() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        currentChatId = null;
        users = [];
        chats = [];
        messages = {};
        showAuth();
    }
}

// Remove old localStorage save functions - now using server
async function saveChats() {
    // Data is saved on server automatically
}

async function saveMessages() {
    // Data is saved on server automatically
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
    } else if (data.type === 'reaction' && data.chatId) {
        const chatMessages = messages[data.chatId];
        if (chatMessages) {
            const message = chatMessages.find(m => m.id === data.messageId);
            if (message) {
                message.reactions = data.reactions;
                saveMessages();
                if (currentChatId === data.chatId) {
                    renderMessages(data.chatId);
                }
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


async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой! Максимум 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const message = {
            id: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'photo',
            photo: event.target.result,
            time: time,
            createdAt: now.toISOString(),
            reactions: {}
        };
        
        if (replyToMessage) {
            message.replyTo = replyToMessage;
            cancelReply();
        }
        
        if (!messages[currentChatId]) {
            messages[currentChatId] = [];
        }
        
        messages[currentChatId].push(message);
        
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            chat.lastMessage = '📷 Фото';
            chat.time = time;
            renderChats();
        }
        
        renderMessages(currentChatId);
        
        try {
            await fetch(`/api/messages/${currentChatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
        } catch (error) {
            console.error('Error sending photo:', error);
        }
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'message',
                chatId: currentChatId,
                message: message
            }));
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function createFolder() {
    const name = prompt('Название папки:');
    if (!name) return;
    
    const folder = {
        id: Date.now(),
        name: name,
        chatIds: []
    };
    
    folders.push(folder);
    localStorage.setItem('folders', JSON.stringify(folders));
    alert('Папка создана! Теперь вы можете добавлять в неё чаты через меню чата');
    toggleMenu();
}

async function addMemberToChat() {
    if (!currentChatId) {
        alert('Выберите чат');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    if (chat.type === 'private') {
        alert('Нельзя добавлять участников в личный чат');
        return;
    }
    
    const username = prompt('Введите username пользователя для добавления:');
    if (!username) return;
    
    const user = users.find(u => u.username === username.replace('@', ''));
    if (!user) {
        alert('Пользователь не найден');
        return;
    }
    
    if (chat.participants.includes(user.id)) {
        alert('Пользователь уже в чате');
        return;
    }
    
    chat.participants.push(user.id);
    
    try {
        await fetch(`/api/chats/${chat.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chat)
        });
    } catch (error) {
        console.error('Error updating chat:', error);
    }
    
    const systemMessage = {
        id: Date.now(),
        userId: 0,
        userName: 'Система',
        text: `${user.name} добавлен в ${chat.type === 'group' ? 'группу' : 'канал'}`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        reactions: {}
    };
    
    if (!messages[currentChatId]) {
        messages[currentChatId] = [];
    }
    messages[currentChatId].push(systemMessage);
    
    try {
        await fetch(`/api/messages/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(systemMessage)
        });
    } catch (error) {
        console.error('Error sending system message:', error);
    }
    
    renderMessages(currentChatId);
    
    alert(`${user.name} добавлен в чат`);
}

function saveFolders() {
    localStorage.setItem('folders', JSON.stringify(folders));
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

window.closeModal = closeModal;

// Close modal on background click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

// Profile functions
function changeAvatar() {
    document.getElementById('avatarInput').click();
}

document.addEventListener('DOMContentLoaded', () => {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Файл слишком большой! Максимум 2MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                currentUser.avatar = event.target.result;
                document.getElementById('profileAvatar').src = currentUser.avatar;
                document.getElementById('menuAvatar').src = currentUser.avatar;
            };
            reader.readAsDataURL(file);
        });
    }
});

async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    
    if (!name) {
        alert('Введите имя');
        return;
    }
    
    currentUser.name = name;
    currentUser.bio = bio;
    
    try {
        await fetch(`/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentUser)
        });
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('menuUsername').textContent = currentUser.name;
        
        alert('Профиль обновлен!');
        closeModal('profileModal');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Ошибка обновления профиля');
    }
}

window.saveProfile = saveProfile;
window.changeAvatar = changeAvatar;

// Contacts functions
function renderContacts() {
    const contactsList = document.getElementById('contactsList');
    const searchInput = document.getElementById('contactSearch');
    
    // Reload users from server
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            users = data;
            console.log('Contacts loaded:', users.length);
            
            searchInput.oninput = () => {
                const query = searchInput.value.toLowerCase();
                const filtered = users.filter(u => 
                    u.id !== currentUser.id &&
                    (u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
                );
                displayContacts(filtered);
            };
            
            const allUsers = users.filter(u => u.id !== currentUser.id);
            displayContacts(allUsers);
        })
        .catch(error => {
            console.error('Error loading contacts:', error);
            contactsList.innerHTML = '<p style="text-align: center; color: #e53935; padding: 20px;">Ошибка загрузки контактов</p>';
        });
}

function displayContacts(contactsToShow) {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';
    
    if (contactsToShow.length === 0) {
        contactsList.innerHTML = '<p style="text-align: center; color: #a2acb4; padding: 20px;">Пользователи не найдены</p>';
        return;
    }
    
    contactsToShow.forEach(user => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.innerHTML = `
            <img src="${user.avatar}" alt="${user.name}" class="contact-avatar">
            <div class="contact-info">
                <div class="contact-name">${user.name}</div>
                <div class="contact-username">@${user.username}</div>
            </div>
        `;
        contactItem.onclick = () => {
            closeModal('contactsModal');
            startChatWithUser(user);
        };
        contactsList.appendChild(contactItem);
    });
}

// Chat info functions
function showChatInfo() {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    document.getElementById('chatInfoTitle').textContent = chat.type === 'private' ? 'Информация о пользователе' : 'Информация о ' + (chat.type === 'group' ? 'группе' : 'канале');
    document.getElementById('chatInfoAvatar').src = chat.avatar;
    document.getElementById('chatInfoName').textContent = chat.name;
    
    let statusText = '';
    if (chat.type === 'group') {
        statusText = 'Группа';
    } else if (chat.type === 'channel') {
        statusText = 'Канал';
    } else {
        statusText = 'online';
    }
    document.getElementById('chatInfoStatus').textContent = statusText;
    
    // Show members
    const memberCount = chat.participants ? chat.participants.length : 0;
    document.getElementById('chatInfoMemberCount').textContent = memberCount;
    
    const membersList = document.getElementById('chatInfoMembers');
    membersList.innerHTML = '';
    
    if (chat.participants) {
        chat.participants.forEach(userId => {
            const user = users.find(u => u.id === userId);
            if (user) {
                const memberItem = document.createElement('div');
                memberItem.className = 'member-item';
                memberItem.innerHTML = `
                    <img src="${user.avatar}" alt="${user.name}" class="contact-avatar">
                    <div class="contact-info">
                        <div class="contact-name">${user.name}</div>
                        <div class="contact-username">@${user.username}</div>
                    </div>
                `;
                membersList.appendChild(memberItem);
            }
        });
    }
    
    openModal('chatInfoModal');
}

function showAddMemberDialog() {
    closeModal('chatInfoModal');
    addMemberToChat();
}

window.showAddMemberDialog = showAddMemberDialog;
