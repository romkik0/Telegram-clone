# 📚 Примеры использования и кастомизации

## 🎨 Изменение цветов

### Изменить основной цвет (синий)

В `styles.css` найдите и замените:

```css
/* Было */
background: #5288c1;

/* Стало (например, зеленый) */
background: #4CAF50;
```

### Изменить цвет фона

```css
/* Было */
background: #0e1621;

/* Стало (например, темнее) */
background: #000000;
```

### Создать свою цветовую схему

```css
:root {
  --primary-color: #5288c1;
  --background-dark: #0e1621;
  --background-light: #212d3b;
  --text-color: #ffffff;
  --text-muted: #6c7883;
}
```

---

## 💬 Добавление новых чатов

В `app.js` добавьте в массив `chats`:

```javascript
chats.push({
    id: 5,
    name: 'Новый друг',
    avatar: 'https://via.placeholder.com/50',
    lastMessage: 'Привет!',
    time: 'Сейчас',
    unread: 3,
    online: true,
    type: 'private'
});
```

Типы чатов:
- `'private'` - личный чат
- `'group'` - группа
- `'channel'` - канал

---

## 🤖 Добавление бота

```javascript
// В app.js добавьте:
const bot = {
    id: 999,
    name: 'Помощник',
    avatar: 'https://via.placeholder.com/50',
    lastMessage: 'Чем могу помочь?',
    time: 'Онлайн',
    unread: 0,
    online: true,
    type: 'bot'
};

chats.unshift(bot); // Добавить в начало списка

// Автоответы бота
function botResponse(message) {
    const responses = {
        'привет': 'Привет! Как дела?',
        'помощь': 'Я могу помочь с настройками',
        'время': `Сейчас ${new Date().toLocaleTimeString()}`
    };
    
    const lowerMessage = message.toLowerCase();
    for (let key in responses) {
        if (lowerMessage.includes(key)) {
            return responses[key];
        }
    }
    
    return 'Не понял. Напишите "помощь"';
}
```

---

## 📁 Загрузка файлов

Добавьте в `index.html`:

```html
<input type="file" id="fileInput" style="display: none;">
<button class="icon-btn" onclick="document.getElementById('fileInput').click()">📎</button>
```

В `app.js`:

```javascript
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            sendMessage(`📎 Файл: ${file.name}`);
        };
        reader.readAsDataURL(file);
    }
});
```

---

## 🔔 Уведомления браузера

В `app.js` добавьте:

```javascript
// Запросить разрешение
if ('Notification' in window) {
    Notification.requestPermission();
}

// Показать уведомление
function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'https://via.placeholder.com/50'
        });
    }
}

// Использование
function simulateResponse() {
    // ... существующий код ...
    showNotification('Новое сообщение', message.text);
}
```

---

## 💾 Сохранение сообщений в LocalStorage

```javascript
// Сохранить
function saveMessages() {
    localStorage.setItem('messages', JSON.stringify(messages));
}

// Загрузить
function loadMessages() {
    const saved = localStorage.getItem('messages');
    if (saved) {
        messages = JSON.parse(saved);
    }
}

// Вызывать после каждого сообщения
function sendMessage() {
    // ... существующий код ...
    saveMessages();
}

// Загрузить при старте
document.addEventListener('DOMContentLoaded', () => {
    loadMessages();
    // ... остальной код ...
});
```

---

## 🔍 Поиск по сообщениям

```javascript
function searchMessages(query) {
    const results = [];
    for (let chatId in messages) {
        messages[chatId].forEach(msg => {
            if (msg.text.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    chatId: chatId,
                    message: msg
                });
            }
        });
    }
    return results;
}

// Использование
const searchInput = document.querySelector('.search-input');
searchInput.addEventListener('input', (e) => {
    const results = searchMessages(e.target.value);
    console.log('Найдено:', results);
});
```

---

## ⏰ Отложенные сообщения

```javascript
function scheduleMessage(text, delay) {
    setTimeout(() => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const message = {
            id: Date.now(),
            text: text,
            time: time,
            sent: true
        };
        
        messages[currentChatId].push(message);
        renderMessages(currentChatId);
    }, delay);
}

// Использование: отправить через 5 секунд
scheduleMessage('Отложенное сообщение', 5000);
```

---

## 📊 Статистика чата

```javascript
function getChatStats(chatId) {
    const chatMessages = messages[chatId] || [];
    
    return {
        total: chatMessages.length,
        sent: chatMessages.filter(m => m.sent).length,
        received: chatMessages.filter(m => !m.sent).length,
        avgLength: chatMessages.reduce((sum, m) => sum + m.text.length, 0) / chatMessages.length
    };
}

// Использование
const stats = getChatStats(currentChatId);
console.log('Статистика:', stats);
```

---

## 🎭 Статусы "печатает..."

```javascript
let typingTimeout;

document.getElementById('messageInput').addEventListener('input', () => {
    // Показать "печатает..." другим пользователям
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'typing',
            chatId: currentChatId
        }));
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        // Скрыть "печатает..."
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'stop_typing',
                chatId: currentChatId
            }));
        }
    }, 1000);
});
```

---

## 🌐 Подключение к реальной базе данных

### MongoDB пример:

```javascript
// server.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/telegram-clone');

const MessageSchema = new mongoose.Schema({
    chatId: Number,
    text: String,
    time: String,
    sent: Boolean,
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

// Сохранить сообщение
app.post('/api/messages', async (req, res) => {
    const message = new Message(req.body);
    await message.save();
    res.json(message);
});

// Получить сообщения
app.get('/api/messages/:chatId', async (req, res) => {
    const messages = await Message.find({ chatId: req.params.chatId });
    res.json(messages);
});
```

---

## 🔐 Добавление аутентификации

```javascript
// Простая аутентификация с JWT
const jwt = require('jsonwebtoken');

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    // Сохранить пользователя в БД
    const token = jwt.sign({ username }, 'secret_key');
    res.json({ token });
});

// Проверка токена
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}
```

---

## 🎨 Темы оформления

```javascript
const themes = {
    light: {
        background: '#ffffff',
        text: '#000000',
        primary: '#5288c1'
    },
    dark: {
        background: '#0e1621',
        text: '#ffffff',
        primary: '#5288c1'
    },
    ocean: {
        background: '#1a237e',
        text: '#ffffff',
        primary: '#00bcd4'
    }
};

function applyTheme(themeName) {
    const theme = themes[themeName];
    document.documentElement.style.setProperty('--bg-color', theme.background);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--primary-color', theme.primary);
}
```

---

## 📱 PWA (Progressive Web App)

Создайте `manifest.json`:

```json
{
  "name": "Telegram Clone",
  "short_name": "TG Clone",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0e1621",
  "theme_color": "#5288c1",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

В `index.html`:

```html
<link rel="manifest" href="manifest.json">
```

---

## 🚀 Оптимизация производительности

```javascript
// Виртуальный скроллинг для больших списков
function renderVisibleChats() {
    const container = document.getElementById('chatList');
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    const startIndex = Math.floor(scrollTop / 70); // 70px высота чата
    const endIndex = Math.ceil((scrollTop + containerHeight) / 70);
    
    const visibleChats = chats.slice(startIndex, endIndex);
    // Рендерить только видимые чаты
}

// Debounce для поиска
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedSearch = debounce(searchMessages, 300);
```

---

Это лишь некоторые примеры! Экспериментируйте и создавайте свои функции! 🚀
