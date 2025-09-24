#!/bin/bash

echo "🚀 Démarrage du Bridge LLM Local..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 18+ depuis https://nodejs.org/"
    exit 1
fi

# Vérifier la version de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(process.version.slice(1).localeCompare('$REQUIRED_VERSION', undefined, { numeric: true }) >= 0 ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $REQUIRED_VERSION ou supérieure requise. Version actuelle: v$NODE_VERSION"
    exit 1
fi

# Installer les dépendances si node_modules n'existe pas
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Échec de l'installation des dépendances"
        exit 1
    fi
fi

# Démarrer le serveur
echo "🔄 Démarrage du bridge sur le port 27123..."
npm start