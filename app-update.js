// Добавить в конец app.js

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой! Максимум 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const message = {
            id: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'photo',
            photo: event.target.result,
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
            chat.lastMessage = '📷 Фото';
            chat.time = time;
            saveChats();
            renderChats();
        }
        
        renderMessages(currentChatId);
        
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

// Обновленная функция renderMessages с показом имени
function renderMessagesUpdated(chatId) {
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
        const isSent = msg.userId === currentUser.id;
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let content = '';
        
        if (msg.type === 'photo') {
            content = `
                <div class="message-bubble">
                    ${!isSent ? `<div class="message-sender">${msg.userName || 'Пользователь'}</div>` : ''}
                    <img src="${msg.photo}" class="message-photo" alt="photo">
                    <div class="message-time">${msg.time}</div>
                </div>
            `;
        } else {
            content = `
                <div class="message-bubble">
                    ${!isSent ? `<div class="message-sender">${msg.userName || 'Пользователь'}</div>` : ''}
                    <div class="message-text">${escapeHtml(msg.text)}</div>
                    <div class="message-time">${msg.time}</div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = content;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}
