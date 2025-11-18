(function() {
  'use strict';

  const WIDGET_VERSION = '1.0.0';
  
  if (window.ChatWidget) {
    console.warn('ChatWidget already loaded');
    return;
  }

  class ChatWidget {
    constructor(config) {
      this.config = {
        apiUrl: config.apiUrl || 'http://localhost:3000',
        companyId: config.companyId,
        primaryColor: '#2563eb',
        accentColor: '#1e40af',
        welcomeMessage: 'Hi! How can we help you?',
        placeholderText: 'Type your message...',
        position: 'bottom-right',
        autoOpen: false,
        autoOpenDelay: 3000,
        widgetName: 'Chat Widget',
        ...config,
      };

      this.sessionId = this.getSessionId();
      this.conversationId = null;
      this.isOpen = false;
      this.isMinimized = true;
      this.hasSubmittedInitialForm = false;
      this.socket = null;

      this.init();
    }

    getSessionId() {
      let sessionId = localStorage.getItem('chat_widget_session_id');
      if (!sessionId) {
        sessionId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chat_widget_session_id', sessionId);
      }
      return sessionId;
    }

    async init() {
      // Load Socket.io if not already loaded
      await this.loadSocketIO();
      
      // Fetch latest configuration from server
      await this.fetchConfiguration();
      
      this.injectStyles();
      this.createWidget();
      this.attachEventListeners();
      
      if (this.config.autoOpen) {
        setTimeout(() => this.open(), this.config.autoOpenDelay);
      }

      this.loadExistingConversation();
    }

    async loadSocketIO() {
      if (typeof io !== 'undefined') {
        console.log('✅ Socket.io already loaded');
        return;
      }

      return new Promise((resolve, reject) => {
        console.log('📦 Loading Socket.io from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.async = true;
        script.onload = () => {
          console.log('✅ Socket.io loaded successfully');
          resolve();
        };
        script.onerror = () => {
          console.warn('⚠️ Failed to load Socket.io, real-time features disabled');
          resolve(); // Don't reject, widget should still work without real-time
        };
        document.head.appendChild(script);
      });
    }

    async fetchConfiguration() {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/widget/config/public?companyId=${this.config.companyId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            // Merge server config with initial config
            this.config = {
              ...this.config,
              primaryColor: data.config.primaryColor || this.config.primaryColor,
              accentColor: data.config.accentColor || this.config.accentColor,
              welcomeMessage: data.config.welcomeMessage || this.config.welcomeMessage,
              placeholderText: data.config.placeholderText || this.config.placeholderText,
              position: data.config.position || this.config.position,
              autoOpen: data.config.autoOpen ?? this.config.autoOpen,
              autoOpenDelay: data.config.autoOpenDelay || this.config.autoOpenDelay,
              widgetName: data.config.widgetName || this.config.widgetName,
              requireEmail: data.config.requireEmail ?? this.config.requireEmail,
            };
            console.log('Widget configuration loaded:', this.config);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch widget configuration, using defaults:', error);
      }
    }

    async refreshConfiguration() {
      console.log('🔄 Refreshing widget configuration...');
      
      // Show a subtle update indicator (optional visual feedback)
      this.showUpdateIndicator();
      
      await this.fetchConfiguration();
      
      // Update styles with new configuration
      this.injectStyles();
      
      // Update widget title if it exists
      const titleElement = document.querySelector('.chat-widget-header h3');
      if (titleElement) {
        titleElement.textContent = this.config.widgetName;
      }

      // Update welcome message if initial form is shown
      const welcomeElement = document.querySelector('.chat-widget-welcome');
      if (welcomeElement) {
        welcomeElement.textContent = this.config.welcomeMessage;
      }

      // Update placeholder text if message input exists
      const messageInput = document.getElementById('chat-widget-message-input');
      if (messageInput) {
        messageInput.placeholder = this.config.placeholderText;
      }

      // Update position of widget container
      const container = document.querySelector('.chat-widget-container');
      if (container) {
        // Apply position changes dynamically
        const window = document.getElementById('chat-widget-window');
        if (window) {
          // Re-position the window based on new config
          window.style.right = this.config.position.includes('right') ? '0' : 'auto';
          window.style.left = this.config.position.includes('left') ? '0' : 'auto';
          window.style.top = this.config.position.includes('top') ? '70px' : 'auto';
          window.style.bottom = this.config.position.includes('top') ? 'auto' : '70px';
        }
      }

      console.log('✅ Widget configuration refreshed successfully');
      
      // Hide update indicator after refresh
      this.hideUpdateIndicator();
    }

    showUpdateIndicator() {
      // Add a subtle visual indicator that config is updating
      const button = document.getElementById('chat-widget-toggle');
      if (button && !button.classList.contains('updating')) {
        button.classList.add('updating');
        button.style.animation = 'pulse 1s ease-in-out';
      }
    }

    hideUpdateIndicator() {
      const button = document.getElementById('chat-widget-toggle');
      if (button) {
        button.classList.remove('updating');
        button.style.animation = '';
      }
    }

    injectStyles() {
      // Remove existing widget styles if any
      const existingStyle = document.getElementById('chat-widget-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'chat-widget-styles';
      style.textContent = `
        .chat-widget-container {
          position: fixed;
          ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .chat-widget-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${this.config.primaryColor};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .chat-widget-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }

        .chat-widget-button svg {
          width: 28px;
          height: 28px;
        }

        .chat-widget-window {
          position: absolute;
          ${this.config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          ${this.config.position.includes('top') ? 'top: 70px;' : 'bottom: 70px;'}
          width: 380px;
          height: 600px;
          max-height: 80vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.2);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .chat-widget-window.open {
          display: flex;
        }

        .chat-widget-header {
          background: ${this.config.primaryColor};
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-widget-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .chat-widget-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .chat-widget-close:hover {
          background: rgba(255,255,255,0.1);
        }

        .chat-widget-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f9fafb;
        }

        .chat-widget-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-widget-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .chat-widget-input:focus {
          outline: none;
          border-color: ${this.config.primaryColor};
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .chat-widget-textarea {
          min-height: 100px;
          resize: vertical;
          font-family: inherit;
        }

        .chat-widget-submit {
          background: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .chat-widget-submit:hover {
          background: ${this.config.accentColor};
        }

        .chat-widget-submit:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .chat-widget-messages {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-widget-message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 80%;
          margin-bottom: 12px;
        }

        .chat-widget-message-wrapper.user {
          align-self: flex-end;
        }

        .chat-widget-message-wrapper.agent,
        .chat-widget-message-wrapper.bot {
          align-self: flex-start;
        }

        .chat-widget-message {
          padding: 10px 14px;
          border-radius: 12px;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.4;
          position: relative;
        }

        .chat-widget-message.user {
          align-self: flex-end;
          background: ${this.config.primaryColor};
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-widget-typing-indicator {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px 0;
        }

        .chat-widget-typing-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .chat-widget-typing-avatar-fallback {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #6b7280;
          flex-shrink: 0;
        }

        .chat-widget-typing-bubble {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          border-bottom-left-radius: 4px;
          padding: 12px 16px;
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .chat-widget-typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
          animation: typing 1.4s infinite;
        }

        .chat-widget-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .chat-widget-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .chat-widget-message.agent, .chat-widget-message.bot {
          align-self: flex-start;
          background: white;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .chat-widget-message-time {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }

        .chat-widget-message-image {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          margin-bottom: 8px;
          display: block;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .chat-widget-message-image:hover {
          transform: scale(1.02);
        }

        .chat-widget-agent-name {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          margin-top: 4px;
          margin-left: 0;
        }

        .chat-widget-message-with-avatar {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .chat-widget-message-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .chat-widget-agent-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .chat-widget-agent-avatar-fallback {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #9ca3af;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .chat-widget-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }

        .chat-widget-input-row {
          display: flex;
          gap: 8px;
        }

        .chat-widget-input-row input {
          flex: 1;
        }

        .chat-widget-send {
          background: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .chat-widget-send:hover {
          background: ${this.config.accentColor};
        }

        .chat-widget-send:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .chat-widget-welcome {
          text-align: center;
          color: #6b7280;
          margin-bottom: 20px;
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .chat-widget-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = 'chat-widget-container';
      container.innerHTML = `
        <button class="chat-widget-button" id="chat-widget-toggle">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </button>
        <div class="chat-widget-window" id="chat-widget-window">
          <div class="chat-widget-header">
            <h3>${this.config.widgetName}</h3>
            <button class="chat-widget-close" id="chat-widget-close">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="chat-widget-body" id="chat-widget-body"></div>
          <div class="chat-widget-footer" id="chat-widget-footer" style="display:none;">
            <div class="chat-widget-input-row">
              <input type="text" class="chat-widget-input" id="chat-widget-message-input" placeholder="${this.config.placeholderText}" />
              <button class="chat-widget-send" id="chat-widget-send">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }

    attachEventListeners() {
      document.getElementById('chat-widget-toggle').addEventListener('click', () => {
        this.toggle();
      });

      document.getElementById('chat-widget-close').addEventListener('click', () => {
        this.close();
      });

      const messageInput = document.getElementById('chat-widget-message-input');
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });

      document.getElementById('chat-widget-send').addEventListener('click', () => {
        this.sendMessage();
      });
    }

    async loadExistingConversation() {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/widget/messages?sessionId=${this.sessionId}&companyId=${this.config.companyId}`
        );
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          this.hasSubmittedInitialForm = true;
          this.conversationId = data.conversationId;
          this.renderMessages(data.messages);
          this.showMessageInput();
          this.connectSocket();
        } else {
          this.showInitialForm();
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        this.showInitialForm();
      }
    }

    showInitialForm() {
      const body = document.getElementById('chat-widget-body');
      body.innerHTML = `
        <div class="chat-widget-welcome">${this.config.welcomeMessage}</div>
        <form class="chat-widget-form" id="chat-widget-initial-form">
          <input type="text" class="chat-widget-input" id="chat-widget-name" placeholder="Your Name" required />
          <input type="email" class="chat-widget-input" id="chat-widget-email" placeholder="Your Email" ${this.config.requireEmail ? 'required' : ''} />
          <textarea class="chat-widget-input chat-widget-textarea" id="chat-widget-initial-message" placeholder="How can we help you?" required></textarea>
          <button type="submit" class="chat-widget-submit">Start Chat</button>
        </form>
      `;

      document.getElementById('chat-widget-initial-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitInitialForm();
      });
    }

    async submitInitialForm() {
      const name = document.getElementById('chat-widget-name').value;
      const email = document.getElementById('chat-widget-email').value;
      const message = document.getElementById('chat-widget-initial-message').value;

      const submitBtn = document.querySelector('.chat-widget-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const response = await fetch(`${this.config.apiUrl}/api/widget/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: this.config.companyId,
            name,
            email,
            message,
            sessionId: this.sessionId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          this.hasSubmittedInitialForm = true;
          this.conversationId = data.conversationId;
          
          if (data.config) {
            this.config = { ...this.config, ...data.config };
          }

          this.renderMessages(data.messages);
          this.showMessageInput();
          this.connectSocket();
        } else {
          alert(data.error || 'Failed to start chat');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Start Chat';
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Failed to start chat. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Chat';
      }
    }

    showMessageInput() {
      document.getElementById('chat-widget-footer').style.display = 'block';
    }

    renderMessages(messages) {
      const body = document.getElementById('chat-widget-body');
      body.innerHTML = '<div class="chat-widget-messages" id="chat-widget-messages"></div>';
      
      const messagesContainer = document.getElementById('chat-widget-messages');
      messages.forEach(msg => {
        this.addMessageToUI(msg);
      });
      
      this.scrollToBottom();
    }

    addMessageToUI(message) {
      const messagesContainer = document.getElementById('chat-widget-messages');
      if (!messagesContainer) return;

      // Check if message already exists (avoid duplicates)
      const existingMessage = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
      if (existingMessage) {
        console.log('Message already exists in UI:', message.id);
        return;
      }

      const time = new Date(message.createdAt).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Check if message is from agent/bot and has agent info
      const isAgentOrBot = message.role === 'AGENT' || message.role === 'BOT';
      const agentName = message.meta?.agentName;
      const agentPhoto = message.meta?.agentPhoto;
      
      // Create wrapper div
      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = `chat-widget-message-wrapper ${message.role.toLowerCase()}`;
      wrapperDiv.setAttribute('data-message-id', message.id);
      wrapperDiv.setAttribute('data-created-at', message.createdAt);
      
      let wrapperHTML = '';
      
      // Check if message has an image attachment
      const hasImage = message.meta?.image?.url;
      
      // Create message content with avatar for agent/bot messages
      if (isAgentOrBot && (agentName || agentPhoto)) {
        wrapperHTML += '<div class="chat-widget-message-with-avatar">';
        
        // Avatar on the left
        if (agentPhoto) {
          wrapperHTML += `<img src="${this.escapeHtml(agentPhoto)}" alt="${this.escapeHtml(agentName || 'Agent')}" class="chat-widget-agent-avatar" />`;
        } else if (agentName) {
          wrapperHTML += `<div class="chat-widget-agent-avatar-fallback">${agentName.charAt(0).toUpperCase()}</div>`;
        }
        
        // Message bubble with content
        wrapperHTML += `<div class="chat-widget-message-content">`;
        wrapperHTML += `
          <div class="chat-widget-message ${message.role.toLowerCase()}">
            ${hasImage ? `<img src="${this.escapeHtml(message.meta.image.url)}" alt="Attachment" class="chat-widget-message-image" />` : ''}
            ${message.text ? `<div>${this.escapeHtml(message.text)}</div>` : ''}
            <div class="chat-widget-message-time">${time}</div>
          </div>
        `;
        
        // Add agent name at the bottom, aligned with bubble
        if (agentName) {
          wrapperHTML += `<div class="chat-widget-agent-name">${this.escapeHtml(agentName)}</div>`;
        }
        
        wrapperHTML += '</div>'; // Close message-content
        wrapperHTML += '</div>'; // Close message-with-avatar
      } else {
        // User message or agent message without info
        wrapperHTML += `
          <div class="chat-widget-message ${message.role.toLowerCase()}">
            ${hasImage ? `<img src="${this.escapeHtml(message.meta.image.url)}" alt="Attachment" class="chat-widget-message-image" />` : ''}
            ${message.text ? `<div>${this.escapeHtml(message.text)}</div>` : ''}
            <div class="chat-widget-message-time">${time}</div>
          </div>
        `;
      }
      
      wrapperDiv.innerHTML = wrapperHTML;
      
      // Insert message in correct chronological order
      const messageTime = new Date(message.createdAt).getTime();
      const existingWrappers = Array.from(messagesContainer.querySelectorAll('.chat-widget-message-wrapper'));
      
      let inserted = false;
      for (const wrapper of existingWrappers) {
        const wrapperTime = new Date(wrapper.getAttribute('data-created-at')).getTime();
        if (messageTime < wrapperTime) {
          messagesContainer.insertBefore(wrapperDiv, wrapper);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        messagesContainer.appendChild(wrapperDiv);
      }
      
      this.scrollToBottom();
    }

    async sendMessage() {
      const input = document.getElementById('chat-widget-message-input');
      const message = input.value.trim();
      
      if (!message) return;

      const sendBtn = document.getElementById('chat-widget-send');
      sendBtn.disabled = true;
      input.disabled = true;

      // Generate temporary ID for optimistic update
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create optimistic message object
      const optimisticMessage = {
        id: tempId,
        text: message,
        role: 'USER',
        createdAt: new Date().toISOString(),
        meta: null,
      };

      // Immediately show message in UI (optimistic update)
      this.addMessageToUI(optimisticMessage);
      input.value = '';

      try {
        const response = await fetch(`${this.config.apiUrl}/api/widget/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            companyId: this.config.companyId,
            message,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Replace temporary message with real one from server
          this.replaceOptimisticMessage(tempId, data.message);
        } else {
          // Remove optimistic message on error
          this.removeOptimisticMessage(tempId);
          alert(data.error || 'Failed to send message');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        this.removeOptimisticMessage(tempId);
        alert('Failed to send message. Please try again.');
      } finally {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }

    replaceOptimisticMessage(tempId, realMessage) {
      const messagesContainer = document.getElementById('chat-widget-messages');
      if (!messagesContainer) return;

      const tempElement = messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
      if (tempElement) {
        // Remove temporary message
        tempElement.remove();
      }

      // Add real message (will be inserted at correct position by timestamp)
      this.addMessageToUI(realMessage);
    }

    removeOptimisticMessage(tempId) {
      const messagesContainer = document.getElementById('chat-widget-messages');
      if (!messagesContainer) return;

      const tempElement = messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
      if (tempElement) {
        // Add error styling
        tempElement.style.opacity = '0.5';
        tempElement.title = 'Failed to send';
        
        // Remove after 2 seconds
        setTimeout(() => {
          tempElement.remove();
        }, 2000);
      }
    }

    showBotTyping() {
      const messagesContainer = document.getElementById('chat-widget-messages');
      if (!messagesContainer) return;

      // Check if typing indicator already exists
      if (messagesContainer.querySelector('.chat-widget-typing-indicator')) {
        return;
      }

      // Get bot/agent info from config
      const botName = this.config.botName || 'Bot';
      const botAvatar = this.config.agentPhoto || null;

      const typingDiv = document.createElement('div');
      typingDiv.className = 'chat-widget-typing-indicator';
      typingDiv.id = 'chat-widget-typing';

      let typingHTML = '';
      
      // Add avatar if available
      if (botAvatar) {
        typingHTML += `<img src="${this.escapeHtml(botAvatar)}" alt="${this.escapeHtml(botName)}" class="chat-widget-typing-avatar" />`;
      } else {
        typingHTML += `<div class="chat-widget-typing-avatar-fallback">${botName.charAt(0).toUpperCase()}</div>`;
      }

      // Add typing dots bubble
      typingHTML += `
        <div class="chat-widget-typing-bubble">
          <div class="chat-widget-typing-dot"></div>
          <div class="chat-widget-typing-dot"></div>
          <div class="chat-widget-typing-dot"></div>
        </div>
      `;

      typingDiv.innerHTML = typingHTML;
      messagesContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }

    hideBotTyping() {
      const messagesContainer = document.getElementById('chat-widget-messages');
      if (!messagesContainer) return;

      const typingIndicator = messagesContainer.querySelector('.chat-widget-typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }

    connectSocket() {
      if (this.socket || !this.conversationId) return;

      try {
        if (typeof io === 'undefined') {
          console.warn('Socket.io not loaded, skipping real-time connection');
          return;
        }

        this.socket = io(this.config.apiUrl, {
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('Widget socket connected');
          this.socket.emit('join:conversation', this.conversationId);
          
          // Note: Widget should NOT join company room to avoid duplicate messages
          // Agent messages are emitted to both conversation AND company rooms
          // Widget only needs conversation room to receive messages
          
          // Emit online status when connected
          this.socket.emit('widget:online', {
            conversationId: this.conversationId,
            sessionId: this.sessionId,
          });
        });

        this.socket.on('joined:conversation', (data) => {
          console.log('Joined conversation room:', data.conversationId);
        });

        this.socket.on('message:new', (data) => {
          if (data.message && data.message.role !== 'USER') {
            // Hide typing indicator when bot/agent message arrives
            this.hideBotTyping();
            this.addMessageToUI(data.message);
          }
        });

        // Listen for bot typing events
        this.socket.on('bot:typing', () => {
          this.showBotTyping();
        });

        this.socket.on('bot:stopped-typing', () => {
          this.hideBotTyping();
        });

        this.socket.on('widget:config-updated', (data) => {
          console.log('🔄 Widget configuration updated, refreshing...');
          this.refreshConfiguration();
        });

        this.socket.on('disconnect', () => {
          console.log('Widget socket disconnected');
        });

        // Send heartbeat every 30 seconds to keep online status updated
        this.heartbeatInterval = setInterval(() => {
          if (this.socket && this.socket.connected) {
            this.socket.emit('widget:heartbeat', {
              conversationId: this.conversationId,
              sessionId: this.sessionId,
            });
          }
        }, 30000);

        // Emit offline when page is being closed
        window.addEventListener('beforeunload', () => {
          if (this.socket && this.socket.connected) {
            this.socket.emit('widget:offline', {
              conversationId: this.conversationId,
              sessionId: this.sessionId,
            });
          }
        });
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    }

    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      document.getElementById('chat-widget-window').classList.add('open');
      this.isOpen = true;
      
      if (this.hasSubmittedInitialForm) {
        const input = document.getElementById('chat-widget-message-input');
        if (input) input.focus();
      }
    }

    close() {
      document.getElementById('chat-widget-window').classList.remove('open');
      this.isOpen = false;
    }

    scrollToBottom() {
      const body = document.getElementById('chat-widget-body');
      body.scrollTop = body.scrollHeight;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  window.ChatWidget = ChatWidget;

  if (window.chatWidgetConfig) {
    new ChatWidget(window.chatWidgetConfig);
  }
})();
