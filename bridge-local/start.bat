@echo off
echo 🚀 Démarrage du Bridge LLM Local...

:: Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez installer Node.js 18+ depuis https://nodejs.org/
    pause
    exit /b 1
)

:: Installer les dépendances si node_modules n'existe pas
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Échec de l'installation des dépendances
        pause
        exit /b 1
    )
)

:: Démarrer le serveur
echo 🔄 Démarrage du bridge sur le port 27123...
npm start

pause