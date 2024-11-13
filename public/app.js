const socket = io();
let currentUser = null;

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            currentUser = data;
            socket.emit('user-online', currentUser.userId);
            showChat();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please login.');
            toggleForms();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('message');
    const imageInput = document.getElementById('image-upload');
    const content = messageInput.value.trim();
    
    if (!content && !imageInput.files[0]) return;

    const formData = new FormData();
    formData.append('sender', currentUser.userId);
    formData.append('content', content);
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            messageInput.value = '';
            imageInput.value = '';
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Socket event listeners
socket.on('new-message', (message) => {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    let content = `<strong>${message.sender.username}</strong>: ${message.content}`;
    if (message.image) {
        content += `<br><img src="${message.image}" alt="Shared image" style="max-width: 200px;">`;
    }
    
    messageElement.innerHTML = content;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

socket.on('user-status-change', ({ userId, online }) => {
    updateUserStatus(userId, online);
});

function showChat() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
}

function toggleForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
}
