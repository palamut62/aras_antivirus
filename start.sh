#!/bin/bash
# Aras Antivirus - Bash Baslatici

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================"
echo "       ARAS ANTIVIRUS - FULL KAPASITE BASLATICISI"
echo "========================================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "[BILGI] Ilk kurulum tespit edildi. Bagimliliklar yukleniyor..."
    npm install
    echo "Kurulum tamamlandi!"
    echo ""
fi

echo "[BILGI] Arka plan hizmetleri ve Arayuz hazirlaniyor..."
echo "========================================================"

npm run dev
