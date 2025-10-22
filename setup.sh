# Enable the site
echo "Ì†ΩÌ¥ó Enabling site configuration..."
sudo ln -sf /etc/nginx/sites-available/chatbot.raka.my.id /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "‚úÖ Testing nginx configuration..."
sudo nginx -t#!/usr/bin/env bash

# Complete HTTPS Setup Script for chatbot.raka.my.id
# This script installs nginx, certbot, configures nginx, and sets up SSL certificates

set -e  # Exit on any error

echo "Ì†ΩÌ∫Ä Setting up HTTPS for chatbot.raka.my.id..."

# Update package lists
echo "Ì†ΩÌ≥¶ Updating package lists..."
sudo apt update

# Install nginx
echo "Ì†ºÌºê Installing nginx..."
sudo apt install -y nginx

# Install certbot and nginx plugin
echo "Ì†ΩÌ¥ê Installing certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create nginx configuration
echo "‚öôÔ∏è Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/chatbot.raka.my.id > /dev/null <<EOF
server {
    listen 80;
    server_name chatbot.raka.my.id;

    # Redirect all HTTP requests to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chatbot.raka.my.id;

    # SSL Configuration (certbot will modify this)
    ssl_certificate /etc/letsencrypt/live/chatbot.raka.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chatbot.raka.my.id/privkey.pem;
    
    # Strong SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA;
    ssl_prefer_server_ciphers on;
    ssl_dhparam /etc/nginx/dhparam.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy settings for your Node.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Optional: serve static files directly (if your app has static assets)
    location /static/ {
        alias /path/to/your/static/files/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Generate DH parameters for stronger SSL security
echo "Ì†ΩÌ¥í Generating DH parameters (this may take a while)..."
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Enable the site
echo "Ì†ΩÌ¥ó Enabling site configuration..."
sudo ln -sf /etc/nginx/sites-available/chatbot.raka.my.id /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "‚úÖ Testing nginx configuration..."
sudo nginx -t

# Start and enable nginx
echo "Ì†ΩÌ∫Ä Starting nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Create a temporary basic configuration for certbot
echo "Ì†ΩÌ≥ù Creating temporary configuration for SSL certificate generation..."
sudo tee /etc/nginx/sites-available/temp-chatbot > /dev/null <<EOF
server {
    listen 80;
    server_name chatbot.raka.my.id;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable temporary configuration
sudo ln -sf /etc/nginx/sites-available/temp-chatbot /etc/nginx/sites-enabled/chatbot.raka.my.id
sudo nginx -s reload

echo "Ì†ΩÌ¥ê Obtaining SSL certificate..."
# Obtain SSL certificate
sudo certbot --nginx -d chatbot.raka.my.id --non-interactive --agree-tos --email your-email@example.com

# Now switch back to the full configuration
echo "Ì†ΩÌ¥Ñ Applying full SSL configuration..."
sudo ln -sf /etc/nginx/sites-available/chatbot.raka.my.id /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-available/temp-chatbot

# Test final configuration
sudo nginx -t

# Reload nginx with SSL configuration
sudo nginx -s reload

# Set up automatic certificate renewal
echo "Ì†ΩÌ¥Ñ Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test certificate renewal
echo "Ì†æÌ∑™ Testing certificate renewal..."
sudo certbot renew --dry-run

# Configure firewall (if ufw is installed)
if command -v ufw >/dev/null 2>&1; then
    echo "Ì†ΩÌ¥• Configuring firewall..."
    sudo ufw allow 'Nginx Full'
    sudo ufw delete allow 'Nginx HTTP' 2>/dev/null || true
fi

echo ""
echo "‚úÖ Setup complete! Your application should now be available at:"
echo "Ì†ºÌºê https://chatbot.raka.my.id"
echo ""
echo "Ì†ΩÌ≥ã Next steps:"
echo "1. Make sure your domain chatbot.raka.my.id points to this server's IP"
echo "2. Update the email in the certbot command above with your actual email"
echo "3. Your Node.js app should be running on port 3000"
echo "4. SSL certificates will auto-renew every 90 days"
echo ""
echo "Ì†ΩÌ¥ß Useful commands:"
echo "- Check nginx status: sudo systemctl status nginx"
echo "- Test nginx config: sudo nginx -t"
echo "- Reload nginx: sudo nginx -s reload"
echo "- Check SSL certificate: sudo certbot certificates"
echo "- Manual renewal: sudo certbot renew"