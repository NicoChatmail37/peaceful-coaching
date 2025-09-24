#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const LLMProxy = require('./llm-proxy');

// Load configuration
let config;
try {
  config = require('./config.json');
} catch (error) {
  console.error('Error loading config.json:', error.message);
  process.exit(1);
}

const app = express();
const llmProxy = new LLMProxy(config.llm);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.cors.origins;
    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return pattern === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const status = await llmProxy.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check status',
      details: error.message
    });
  }
});

// Chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  await llmProxy.proxyChatCompletion(req, res);
});

// Handle OPTIONS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  res.sendStatus(200);
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || config.port || 27123;
const HOST = process.env.HOST || config.host || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`
🚀 Bridge LLM démarré sur http://${HOST}:${PORT}
📡 Status: http://${HOST}:${PORT}/status
🤖 Chat: http://${HOST}:${PORT}/v1/chat/completions
🔗 CORS: ${config.cors.origins.join(', ')}
  `);
  
  // Test initial des backends
  llmProxy.getStatus().then(status => {
    console.log('\n📊 État des LLM backends:');
    if (status.llm.ok) {
      console.log(`✅ ${status.llm.backend.toUpperCase()}: ${status.llm.available_models.length} modèles disponibles`);
    } else {
      console.log('❌ Aucun backend LLM disponible');
      if (status.llm.backends_tested) {
        status.llm.backends_tested.forEach(backend => {
          console.log(`   - ${backend.backend}: ${backend.error}`);
        });
      }
    }
  }).catch(console.error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bridge...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Arrêt du bridge...');
  process.exit(0);
});