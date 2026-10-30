#!/usr/bin/env bash
set -e

# Setup 2 GB swap space on Hostinger KVM 1 VPS (Ubuntu/Debian)
echo "=== Lead Reach AI Hostinger VPS 2 GB Swap Setup ==="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

if [ -f /swapfile ]; then
  echo "/swapfile already exists. Current swap status:"
  swapon --show
  exit 0
fi

echo "Creating 2 GB swapfile..."
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

if ! grep -q "/swapfile" /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Added /swapfile to /etc/fstab for persistence across reboots."
fi

# Set optimal swappiness for 4 GB RAM VPS
sysctl vm.swappiness=20
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
  echo 'vm.swappiness=20' >> /etc/sysctl.conf
fi

echo "Swap setup complete! Active swap:"
swapon --show
free -h
