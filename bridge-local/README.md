# Bridge Local de Transcription

## Vue d'ensemble

Le Bridge Local permet d'utiliser des modèles Whisper plus performants directement sur votre machine, offrant une transcription plus rapide et de meilleure qualité que le mode navigateur.

## Fonctionnalités

- **GPU Acceleration** : Support Metal (macOS), CUDA (Windows/Linux), fallback CPU
- **Modèles avancés** : tiny, base, small, medium avec quantification optimisée
- **Performance** : Transcription temps réel pour la plupart des contenus
- **Sécurité** : Aucune donnée transmise sur Internet, traitement 100% local
- **API simple** : Interface REST compatible avec l'application web

## Installation

### Prérequis
- Node.js 18+ ou Python 3.8+
- (Optionnel) GPU compatible Metal/CUDA pour accélération

### Option 1: Binaire pré-compilé (recommandé)
```bash
# Télécharger depuis GitHub Releases
curl -L https://github.com/yourorg/transcription-bridge/releases/latest/download/bridge-{os}-{arch} -o transcription-bridge
chmod +x transcription-bridge
./transcription-bridge
```

### Option 2: Installation depuis source
```bash
git clone https://github.com/yourorg/transcription-bridge
cd transcription-bridge
npm install  # ou pip install -r requirements.txt
npm start    # ou python main.py
```

## API Endpoints

Le bridge expose une API REST sur `http://localhost:27123`:

### GET /status
Retourne l'état du bridge et les modèles disponibles.

```json
{
  "ok": true,
  "device": "metal",
  "models": [
    {
      "name": "tiny",
      "sizeMB": 39,
      "quant": "q5_k_m",
      "lang": ["fr", "en", "es", "de", "it"]
    }
  ]
}
```

### POST /transcribe
Transcrit un fichier audio.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: Fichier audio (webm, wav, mp3, m4a)
- `model`: Modèle à utiliser (tiny, base, small, medium)
- `language`: Code langue (fr, en, auto)

**Response:**
```json
{
  "text": "Transcription complète du fichier audio...",
  "segments": [
    {
      "start": 0.0,
      "end": 3.2,
      "text": "Premier segment de parole",
      "confidence": 0.89
    }
  ],
  "srt": "1\n00:00:00,000 --> 00:00:03,200\nPremier segment de parole\n\n"
}
```

### GET /models
Liste les modèles disponibles en local.

## Configuration

Le bridge utilise un fichier `config.json` :

```json
{
  "port": 27123,
  "host": "127.0.0.1",
  "cors": {
    "origins": [
      "https://your-app.lovable.app",
      "http://localhost:8080"
    ]
  },
  "whisper": {
    "device": "auto",
    "model_dir": "./models",
    "temp_dir": "/tmp"
  },
  "logging": {
    "level": "info",
    "file": "./bridge.log"
  }
}
```

## Démarrage automatique

### macOS (LaunchAgent)
```bash
# Copier le plist dans ~/Library/LaunchAgents/
# Activer au démarrage
launchctl load ~/Library/LaunchAgents/com.yourorg.transcription-bridge.plist
```

### Windows (Service)
```cmd
# Installer comme service Windows
sc create TranscriptionBridge binPath="C:\path\to\bridge.exe"
sc config TranscriptionBridge start=auto
```

### Linux (systemd)
```bash
# Copier le service dans /etc/systemd/system/
sudo systemctl enable transcription-bridge
sudo systemctl start transcription-bridge
```

## Dépannage

### Bridge non détecté
1. Vérifier que le bridge est démarré : `curl http://localhost:27123/status`
2. Vérifier les CORS dans la console navigateur
3. Vérifier les logs : `tail -f bridge.log`

### Performance lente
1. Vérifier l'utilisation GPU : l'API `/status` indique le device utilisé
2. Modèles plus légers : tiny/base pour CPU, small/medium pour GPU
3. Vérifier la RAM disponible (modèle medium = ~2GB)

### Erreurs de transcription
1. Format audio supporté : webm, wav, mp3, m4a
2. Durée maximale : 60 minutes par fichier
3. Vérifier les logs pour les erreurs détaillées

## Sécurité

- **Réseau** : Écoute uniquement sur localhost, CORS strict
- **Données** : Aucune persistence par défaut, nettoyage automatique
- **Mise à jour** : Signatures cryptographiques, auto-update optionnel
- **Isolation** : Pas d'accès Internet sauf pour les mises à jour

## Développement

Pour contribuer au bridge :

```bash
git clone https://github.com/yourorg/transcription-bridge
cd transcription-bridge

# Mode développement
npm run dev  # ou python main.py --dev

# Tests
npm test    # ou pytest

# Build
npm run build  # ou python setup.py build
```

## Support

- **Issues** : https://github.com/yourorg/transcription-bridge/issues
- **Documentation** : https://docs.yourorg.com/transcription-bridge
- **Discord** : https://discord.gg/yourorg