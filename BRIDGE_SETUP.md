# Configuration du Bridge Whisper Local

Ce document décrit comment configurer le backend FastAPI pour permettre les connexions CORS depuis l'application web.

## Problème

L'application web (hébergée en HTTPS) doit communiquer avec le bridge Whisper local (http://127.0.0.1:27123). Par défaut, les requêtes OPTIONS (preflight CORS) échouent avec une erreur 405.

## Solution Backend (FastAPI)

### 1. Ajouter le middleware CORS

Dans votre fichier `bridge-small/app.py` (ou équivalent), ajoutez le middleware CORS au démarrage :

```python
# app.py (haut du fichier)
from fastapi import FastAPI, File, UploadFile, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import os
# ... (autres imports existants)

app = FastAPI()

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],              # Autorise toutes les origines (pour développement local)
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
# -------------------------

# ... reste du code
```

### 2. Aucune modification des routes requise

Le middleware CORS gère automatiquement les requêtes OPTIONS (preflight). Vos routes existantes (`/status`, `/transcribe`) n'ont pas besoin d'être modifiées.

### 3. Vérification

Une fois le middleware ajouté, redémarrez votre serveur FastAPI :

```bash
cd bridge-small
python app.py  # ou uvicorn app:app --reload
```

Testez depuis l'application web :
1. Allez dans les paramètres (Settings)
2. Onglet "Bridge Test"
3. Activez "Utiliser le bridge local"
4. Vous devriez voir "✅ Bridge OK"

## Configuration Frontend

Le frontend est déjà configuré pour :
- URL par défaut : `http://127.0.0.1:27123`
- Token par défaut : `devtoken`
- Mode CORS : `cors`
- Credentials : `omit`

### Variables d'environnement (optionnel)

Vous pouvez personnaliser l'URL et le token via les variables d'environnement :

```env
VITE_BRIDGE_URL=http://127.0.0.1:27123
VITE_BRIDGE_TOKEN=devtoken
```

## Endpoints

### GET /status

Retourne le statut du bridge :

```json
{
  "ok": true,
  "model": "small",
  "device": "metal",
  "compute_type": "int8"
}
```

### POST /transcribe

Paramètres :
- `audio` (file) : fichier audio (wav, m4a, mp3, etc.)
- `task` (string, optionnel) : "transcribe" (défaut) ou "translate"
- `language` (string, optionnel) : "fr", "en", etc. (auto-détection si absent)

Retourne :

```json
{
  "text": "Transcription complète...",
  "duration": 12.5,
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Premier segment..."
    }
  ]
}
```

## Dépannage

### Erreur "Failed to fetch"
- Vérifiez que le bridge tourne sur le bon port (27123)
- Vérifiez que le middleware CORS est bien configuré
- Testez directement : `curl http://127.0.0.1:27123/status`

### Erreur 405 (Method Not Allowed)
- Le middleware CORS n'est pas configuré
- Ajoutez le middleware comme indiqué ci-dessus

### Erreur 401 (Unauthorized)
- Vérifiez le token d'authentification
- Par défaut : "devtoken"
- Configurez via `VITE_BRIDGE_TOKEN`

## Architecture

```
┌─────────────────┐         HTTPS          ┌──────────────┐
│                 │                         │              │
│   Web App       │◄───────────────────────►│   Lovable    │
│   (Browser)     │                         │   Platform   │
│                 │                         │              │
└────────┬────────┘                         └──────────────┘
         │
         │ HTTP + CORS
         │ (localhost exception)
         │
         ▼
┌─────────────────┐
│                 │
│  Whisper Bridge │
│  FastAPI        │
│  127.0.0.1:27123│
│                 │
└─────────────────┘
```

## Sécurité

⚠️ **Note importante** : Cette configuration autorise toutes les origines (`allow_origins=["*"]`), ce qui est acceptable pour un développement local mais **NE DOIT PAS** être utilisé en production.

Pour la production, spécifiez les origines autorisées :

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://votre-domaine.com",
        "https://www.votre-domaine.com"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```
