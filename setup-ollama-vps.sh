#!/bin/bash

# Ollama Setup Script for VPS
# Run this on your VPS server

set -e

echo "🚀 Starting Ollama installation on VPS..."
echo "📊 System Info:"
echo "   RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   CPU: $(nproc) cores"
echo "   Disk: $(df -h / | awk 'NR==2 {print $4}') available"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo bash setup-ollama-vps.sh)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update -qq
apt upgrade -y -qq

# Install dependencies
echo "📦 Installing dependencies..."
apt install -y curl wget git htop

# Install Ollama
echo "📦 Installing Ollama..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
else
    curl -fsSL https://ollama.ai/install.sh | sh
    echo "✅ Ollama installed successfully"
fi

# Wait for Ollama to start
sleep 3

# Check if service is running
if systemctl is-active --quiet ollama; then
    echo "✅ Ollama service is running"
else
    echo "🔄 Starting Ollama service..."
    systemctl start ollama
    sleep 2
fi

# Enable service on boot
systemctl enable ollama

# Pull nomic-embed-text model
echo ""
echo "📥 Downloading nomic-embed-text model (274 MB)..."
echo "   This may take 2-5 minutes depending on your connection..."
ollama pull nomic-embed-text

# Test embedding generation
echo ""
echo "🧪 Testing embedding generation..."
TEST_RESULT=$(curl -s http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "This is a test document for embedding generation."
}')

if echo "$TEST_RESULT" | grep -q "embedding"; then
    DIMENSIONS=$(echo "$TEST_RESULT" | grep -o '"embedding":\[[^]]*\]' | grep -o ',' | wc -l)
    DIMENSIONS=$((DIMENSIONS + 1))
    echo "✅ Embedding test successful!"
    echo "   Dimensions: $DIMENSIONS"
else
    echo "❌ Embedding test failed"
    echo "   Response: $TEST_RESULT"
    exit 1
fi

# Create systemd service override for external access (optional)
echo ""
echo "⚙️  Configuring Ollama for external access..."
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

# Reload and restart service
systemctl daemon-reload
systemctl restart ollama
sleep 2

# Display status
echo ""
echo "✨ Installation complete!"
echo ""
echo "📊 Ollama Status:"
systemctl status ollama --no-pager | head -n 5

echo ""
echo "📋 Installation Summary:"
echo "   ✅ Ollama installed"
echo "   ✅ nomic-embed-text model downloaded"
echo "   ✅ Service enabled and running"
echo "   ✅ Configured for external access"
echo ""
echo "🔗 Access URLs:"
echo "   - Local: http://localhost:11434"
echo "   - External: http://$(curl -s ifconfig.me):11434"
echo ""
echo "🧪 Test embedding:"
echo "   curl http://localhost:11434/api/embeddings -d '{\"model\": \"nomic-embed-text\", \"prompt\": \"test\"}'"
echo ""
echo "📊 Monitor performance:"
echo "   - CPU/RAM: htop"
echo "   - Logs: journalctl -u ollama -f"
echo "   - Models: ollama list"
echo ""
echo "🔥 Next steps:"
echo "   1. Update your app's .env:"
echo "      OLLAMA_URL=http://localhost:11434"
echo "      OLLAMA_EMBEDDING_MODEL=nomic-embed-text"
echo ""
echo "   2. Use the embeddings in your app:"
echo "      See: FREE_RAG_WITH_OLLAMA.md"
echo ""
