document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const adminScreen = document.getElementById('admin-screen');
    const chatScreen = document.getElementById('chat-screen');
    
    // Auth Elements
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authUsernameInput = document.getElementById('auth-username');
    const authPasswordInput = document.getElementById('auth-password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggle = document.getElementById('auth-toggle');
    const loginError = document.getElementById('login-error');
    
    let isLoginMode = true;
    
    // Dashboard Elements
    const tabHost = document.getElementById('tab-host');
    const tabJoin = document.getElementById('tab-join');
    const hostSetup = document.getElementById('host-setup');
    const clientSetup = document.getElementById('client-setup');
    const hostWaiting = document.getElementById('host-waiting');
    
    const hostPinInput = document.getElementById('host-pin');
    const startHostBtn = document.getElementById('start-host-btn');
    
    const joinHostUsernameInput = document.getElementById('join-host-username');
    const joinPinInput = document.getElementById('join-pin');
    const connectBtn = document.getElementById('connect-btn');
    const joinError = document.getElementById('auth-error');
    
    // Chat & Call Elements
    const statusDot = document.querySelector('.dot');
    const statusText = document.querySelector('.status-text');
    const messagesList = document.getElementById('messages-list');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const fileBtn = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');
    const callBtn = document.getElementById('call-btn');
    const remoteAudio = document.getElementById('remote-audio');
    
    // Call Modal Elements
    const callModal = document.getElementById('call-modal');
    const acceptCallBtn = document.getElementById('accept-call-btn');
    const declineCallBtn = document.getElementById('decline-call-btn');
    const callerNameSpan = document.getElementById('caller-name');

    // State
    let p2p = null;
    let myUsername = '';
    let activeRoomName = '';
    let receivingFileMeta = null;
    let receiveBuffer = [];
    let receivedSize = 0;
    
    let localAudioStream = null;
    let isCalling = false;

    // --- Format file size ---
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // --- Auth Logic ---
    authToggle.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = "Login to Jerry Drop";
            authSubtitle.textContent = "Welcome back. Please login.";
            authSubmitBtn.textContent = "Login";
            authToggle.textContent = "Need an account? Register";
        } else {
            authTitle.textContent = "Create Account";
            authSubtitle.textContent = "Join Jerry Drop to host and join secure spaces.";
            authSubmitBtn.textContent = "Register";
            authToggle.textContent = "Already have an account? Login";
        }
        loginError.textContent = "";
    });

    authSubmitBtn.addEventListener('click', async () => {
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();
        
        if (!username || !password) {
            loginError.textContent = "Please enter username and password.";
            return;
        }
        
        loginError.textContent = "Processing...";
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.status === 'success') {
                myUsername = username;
                loginScreen.classList.remove('active');
                
                if (data.role === 'admin') {
                    adminScreen.classList.add('active');
                    startAdminStatsLoop();
                } else {
                    dashboardScreen.classList.add('active');
                }
            } else {
                loginError.textContent = data.message || "Authentication failed.";
            }
        } catch (err) {
            loginError.textContent = "Server error. Try again.";
        }
    });

    // --- Admin Logic ---
    let adminStatsInterval = null;
    let adminWs = null;
    
    const startAdminStatsLoop = async () => {
        fetchAdminStats();
        adminStatsInterval = setInterval(fetchAdminStats, 5000);
        
        // Connect to WebSocket to listen for chat logs
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        adminWs = new WebSocket(`${protocol}//${window.location.host}/ws/admin_${Math.random().toString(36).substring(7)}`);
        
        adminWs.onopen = () => {
            adminWs.send(JSON.stringify({ type: 'admin_auth', data: { password: 'Jerry@215' } }));
        };
        
        adminWs.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'admin_chat_log') {
                const logDiv = document.getElementById('admin-chat-log');
                const span = document.createElement('span');
                span.innerHTML = `[Room: <span style="color:#ffcc00">${msg.room}</span>] <span style="color:#00ccff">${msg.sender}</span>: ${msg.content}<br>`;
                logDiv.appendChild(span);
                logDiv.scrollTop = logDiv.scrollHeight;
            }
        };
    };
    
    const fetchAdminStats = async () => {
        try {
            const res = await fetch(`/api/admin/stats?username=${myUsername}`);
            const data = await res.json();
            if (data.status === 'success') {
                document.getElementById('stat-total-users').textContent = data.total_users;
                document.getElementById('stat-active-hosts').textContent = data.active_hosts;
                document.getElementById('stat-total-connections').textContent = data.total_connections;
                
                const ul = document.getElementById('admin-hosts-ul');
                if (data.active_hosts_list.length === 0) {
                    ul.innerHTML = '<li>No active spaces at the moment.</li>';
                } else {
                    ul.innerHTML = '';
                    data.active_hosts_list.forEach(h => {
                        const li = document.createElement('li');
                        li.style.marginBottom = "8px";
                        li.innerHTML = `<i class="ph ph-shield-check" style="color:var(--success)"></i> ${h.hostname} <span style="opacity:0.6; font-size:0.8em; margin-left:8px;">(${h.clients} connected)</span>`;
                        ul.appendChild(li);
                    });
                }

                const tbody = document.getElementById('admin-users-tbody');
                tbody.innerHTML = '';
                if (data.user_list) {
                    data.user_list.forEach(u => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                        tr.innerHTML = `<td style="padding:8px 0;">${u.id}</td><td style="padding:8px 0;">${u.username}</td>`;
                        tbody.appendChild(tr);
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch admin stats", e);
        }
    };
    
    document.getElementById('admin-enter-app-btn')?.addEventListener('click', () => {
        if (adminStatsInterval) clearInterval(adminStatsInterval);
        if (adminWs) adminWs.close();
        adminScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
    });

    // --- Dashboard Tabs ---
    tabHost.addEventListener('click', () => {
        tabHost.style.background = 'var(--primary)';
        tabHost.style.color = 'white';
        tabJoin.style.background = 'rgba(255,255,255,0.1)';
        
        hostSetup.style.display = 'block';
        clientSetup.style.display = 'none';
        hostWaiting.style.display = 'none';
    });

    tabJoin.addEventListener('click', () => {
        tabJoin.style.background = 'var(--primary)';
        tabJoin.style.color = 'white';
        tabHost.style.background = 'rgba(255,255,255,0.1)';
        
        clientSetup.style.display = 'block';
        hostSetup.style.display = 'none';
        hostWaiting.style.display = 'none';
    });

    // --- Hosting Logic ---
    startHostBtn.addEventListener('click', async () => {
        const pin = hostPinInput.value.trim();
        
        try {
            const response = await fetch('/api/host/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: myUsername, pin })
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                document.getElementById('qr-code-img').src = "data:image/png;base64," + data.qr_code;
                document.getElementById('display-pin').textContent = pin || "None";
                document.getElementById('my-space-name').textContent = myUsername;
                
                hostSetup.style.display = 'none';
                tabHost.style.display = 'none';
                tabJoin.style.display = 'none';
                hostWaiting.style.display = 'block';
                
                activeRoomName = myUsername;
                
                // Initialize WebRTC as Host
                initWebRTC(null, pin, myUsername, myUsername);
            }
        } catch (err) {
            console.error('Failed to start hosting', err);
        }
    });

    // --- Joining Logic ---
    connectBtn.addEventListener('click', () => {
        const hostUsername = joinHostUsernameInput.value.trim();
        const pin = joinPinInput.value.trim();
        
        if (hostUsername) {
            joinError.textContent = "Connecting...";
            activeRoomName = hostUsername;
            initWebRTC(null, pin, myUsername, hostUsername);
        } else {
            joinError.textContent = "Please enter the Host's username.";
        }
    });

    // --- WebRTC Setup ---
    const setConnectionState = (state) => {
        if (state === 'connected') {
            statusDot.classList.add('connected');
            statusText.textContent = `Connected to ${p2p.peerName || 'Peer'}`;
            dashboardScreen.classList.remove('active');
            chatScreen.classList.add('active');
            callBtn.classList.remove('hidden');
        } else if (state === 'disconnected') {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
            chatScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            callBtn.classList.add('hidden');
            if (isCalling) endCall();
        } else if (state === 'failed_auth') {
            joinError.textContent = "Invalid PIN or Host not found.";
            joinPinInput.value = '';
        }
    };

    const addMessage = (text, type = 'sent', senderName = '') => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        
        if (senderName && type === 'received') {
            msgDiv.innerHTML = `<strong style="font-size: 0.75em; opacity: 0.8; display: block; margin-bottom: 4px;">${senderName}</strong>${text}`;
        } else {
            msgDiv.textContent = text;
        }
        
        messagesList.appendChild(msgDiv);
        messagesList.scrollTop = messagesList.scrollHeight;
    };

    const addFileMessage = (fileMeta, type = 'sent', fileBlob = null) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type} file-message`;
        
        let icon = 'ph-file';
        if (fileMeta.fileType && fileMeta.fileType.startsWith('image/')) icon = 'ph-image';
        else if (fileMeta.fileType && fileMeta.fileType.startsWith('video/')) icon = 'ph-video';

        let innerHTML = `<i class="ph ${icon} file-icon"></i><div class="file-info"><span class="file-name">${fileMeta.name}</span><span class="file-size">${formatBytes(fileMeta.size)}</span>`;

        if (type === 'received' && fileBlob) {
            const downloadUrl = URL.createObjectURL(fileBlob);
            innerHTML += `<button class="file-download" onclick="const a = document.createElement('a'); a.href='${downloadUrl}'; a.download='${fileMeta.name}'; a.click();"><i class="ph ph-download-simple"></i> Download</button>`;
        } else {
            innerHTML += `<span class="file-size" style="margin-top:4px;">Sent ✓</span>`;
        }

        innerHTML += `</div>`;
        msgDiv.innerHTML = innerHTML;
        
        messagesList.appendChild(msgDiv);
        messagesList.scrollTop = messagesList.scrollHeight;
    };

    const initWebRTC = (serverIp = null, pin = null, myName = null, hostName = null) => {
        p2p = new P2PConnection(
            (msg) => handleIncomingData(msg),
            (state) => setConnectionState(state),
            (stream) => { remoteAudio.srcObject = stream; },
            (type, sender) => handleCallSignal(type, sender)
        );
        p2p.connectSignaling(serverIp, pin, myName, hostName);
    };

    const handleIncomingData = (msg) => {
        if (msg.type === 'text') {
            addMessage(msg.content, 'received', msg.senderName);
        } else if (msg.type === 'file_meta') {
            receivingFileMeta = msg;
            receiveBuffer = [];
            receivedSize = 0;
        } else if (msg.type === 'file_data') {
            receiveBuffer.push(msg.data);
            receivedSize += msg.data.byteLength;
            if (receivedSize === receivingFileMeta.size) {
                const blob = new Blob(receiveBuffer, { type: receivingFileMeta.fileType });
                addFileMessage(receivingFileMeta, 'received', blob);
                receivingFileMeta = null;
                receiveBuffer = [];
            }
        }
    };

    // --- Chat & File UI ---
    sendBtn.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text && p2p && p2p.dataChannel && p2p.dataChannel.readyState === 'open') {
            p2p.send({ type: 'text', content: text, senderName: myUsername });
            
            // Silently log to admin console
            if (p2p.ws && p2p.ws.readyState === WebSocket.OPEN) {
                p2p.ws.send(JSON.stringify({ 
                    type: 'admin_chat_log', 
                    room: activeRoomName, 
                    sender: myUsername, 
                    content: text 
                }));
            }
            
            addMessage(text, 'sent');
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    fileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (p2p && p2p.dataChannel && p2p.dataChannel.readyState === 'open') {
            p2p.sendFileMetadata(file);
            addFileMessage({ name: file.name, size: file.size, fileType: file.type }, 'sent');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const CHUNK_SIZE = 16384; 
                let offset = 0;
                const sendChunk = () => {
                    while (offset < arrayBuffer.byteLength) {
                        if (p2p.dataChannel.bufferedAmount > p2p.dataChannel.bufferedAmountLowThreshold) {
                            p2p.dataChannel.onbufferedamountlow = () => {
                                p2p.dataChannel.onbufferedamountlow = null;
                                sendChunk();
                            };
                            return;
                        }
                        const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
                        p2p.sendFileData(chunk);
                        offset += CHUNK_SIZE;
                    }
                };
                sendChunk();
            };
            reader.readAsArrayBuffer(file);
        }
        fileInput.value = '';
    });

    // --- Call Logic ---
    const startAudioStream = async () => {
        try {
            localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            isCalling = true;
            callBtn.classList.add('active');
            callBtn.innerHTML = '<i class="ph ph-phone-disconnect"></i>';
            await p2p.startAudio(localAudioStream);
            addMessage('Audio stream connected.', 'system');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            addMessage('Failed to access microphone.', 'system');
            endCall();
        }
    };

    const endCall = () => {
        isCalling = false;
        callBtn.classList.remove('active');
        callBtn.innerHTML = '<i class="ph ph-phone"></i>';
        if (localAudioStream) {
            p2p.stopAudio(localAudioStream);
            localAudioStream = null;
        }
        addMessage('Call ended.', 'system');
    };

    const handleCallSignal = async (type, senderId) => {
        if (type === 'call_request') {
            // Show Modal
            callerNameSpan.textContent = p2p.peerName || "Peer";
            callModal.classList.remove('hidden');
        } 
        else if (type === 'call_accepted') {
            addMessage(`${p2p.peerName || 'Peer'} accepted the call.`, 'system');
            await startAudioStream();
        } 
        else if (type === 'call_declined') {
            addMessage(`${p2p.peerName || 'Peer'} declined the call.`, 'system');
        }
    };

    callBtn.addEventListener('click', () => {
        if (isCalling) {
            endCall();
            // Optional: send a 'call_ended' signal if you want the other side to hang up automatically
        } else {
            // Send call request
            p2p.sendSignalingMessage('call_request');
            addMessage('Calling...', 'system');
        }
    });

    acceptCallBtn.addEventListener('click', async () => {
        callModal.classList.add('hidden');
        p2p.sendSignalingMessage('call_accepted');
        await startAudioStream();
    });

    declineCallBtn.addEventListener('click', () => {
        callModal.classList.add('hidden');
        p2p.sendSignalingMessage('call_declined');
        addMessage('Call declined.', 'system');
    });

});
