#!/usr/bin/env bash
set -euo pipefail

SSH_ALLOW_IP="${1:-}"

if [[ -z "$SSH_ALLOW_IP" ]]; then
  echo "Usage: sudo ./server_hardening.sh <your-public-ip>"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ufw fail2ban

cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d_%H%M%S)

python3 - <<'PY'
from pathlib import Path
path = Path('/etc/ssh/sshd_config')
text = path.read_text(encoding='utf-8')
replacements = {
    '#PasswordAuthentication yes': 'PasswordAuthentication no',
    'PasswordAuthentication yes': 'PasswordAuthentication no',
    '#PermitRootLogin prohibit-password': 'PermitRootLogin no',
    'PermitRootLogin yes': 'PermitRootLogin no',
    '#PubkeyAuthentication yes': 'PubkeyAuthentication yes',
    '#MaxAuthTries 6': 'MaxAuthTries 3',
    '#LoginGraceTime 2m': 'LoginGraceTime 30',
}
for old, new in replacements.items():
    text = text.replace(old, new)
if 'PasswordAuthentication no' not in text:
    text += '\nPasswordAuthentication no\n'
if 'PermitRootLogin no' not in text:
    text += '\nPermitRootLogin no\n'
if 'PubkeyAuthentication yes' not in text:
    text += '\nPubkeyAuthentication yes\n'
if 'MaxAuthTries 3' not in text:
    text += '\nMaxAuthTries 3\n'
if 'LoginGraceTime 30' not in text:
    text += '\nLoginGraceTime 30\n'
path.write_text(text, encoding='utf-8')
PY

cat >/etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 10m
bantime = 12h
EOF

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH only from your current public IP.
ufw allow from "$SSH_ALLOW_IP" to any port 22 proto tcp

# Public web.
ufw allow 80/tcp
ufw allow 443/tcp

# MQTT for ESP32/EMQX.
ufw allow 1883/tcp
ufw allow 8883/tcp

# Close common sensitive ports from public network.
ufw deny 3001/tcp || true
ufw deny 3306/tcp || true
ufw deny 6379/tcp || true
ufw deny 27017/tcp || true

# EMQX dashboard should not be public by default.
ufw deny 18083/tcp || true
ufw deny 8083/tcp || true
ufw deny 8084/tcp || true

ufw --force enable

systemctl restart ssh
systemctl enable fail2ban
systemctl restart fail2ban

echo "Hardening complete."
echo "Allowed SSH IP: $SSH_ALLOW_IP"
ufw status numbered
