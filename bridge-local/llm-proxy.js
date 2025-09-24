const axios = require('axios');

class LLMProxy {
  constructor(config) {
    this.config = config;
  }

  async checkOllamaStatus() {
    try {
      const response = await axios.get(`${this.config.ollama_url}/api/tags`, {
        timeout: 5000
      });
      return {
        ok: true,
        backend: 'ollama',
        available_models: response.data.models?.map(m => m.name) || [],
        default_model: this.config.default_model
      };
    } catch (error) {
      return {
        ok: false,
        backend: 'ollama',
        error: error.code === 'ECONNREFUSED' ? 'Connection refused - Ollama not running?' : error.message
      };
    }
  }

  async checkLMStudioStatus() {
    try {
      const response = await axios.get(`${this.config.lmstudio_url}/v1/models`, {
        timeout: 5000
      });
      return {
        ok: true,
        backend: 'lmstudio',
        available_models: response.data.data?.map(m => m.id) || [],
        default_model: this.config.default_model
      };
    } catch (error) {
      return {
        ok: false,
        backend: 'lmstudio',
        error: error.code === 'ECONNREFUSED' ? 'Connection refused - LM Studio not running or server disabled?' : error.message
      };
    }
  }

  async getStatus() {
    const [ollamaStatus, lmStudioStatus] = await Promise.all([
      this.checkOllamaStatus(),
      this.checkLMStudioStatus()
    ]);

    // Déterminer le meilleur backend disponible
    let activeLLM = null;
    if (ollamaStatus.ok) {
      activeLLM = ollamaStatus;
    } else if (lmStudioStatus.ok) {
      activeLLM = lmStudioStatus;
    }

    return {
      ok: true,
      transcription: {
        device: "cpu", 
        models: ["tiny", "small"]
      },
      llm: activeLLM || {
        ok: false,
        backends_tested: [ollamaStatus, lmStudioStatus],
        error: "No LLM backend available"
      }
    };
  }

  async proxyChatCompletion(req, res) {
    try {
      const { model, messages, stream = false, temperature = 0.7 } = req.body;

      // Déterminer quel backend utiliser
      const status = await this.getStatus();
      if (!status.llm.ok) {
        return res.status(503).json({
          error: 'No LLM backend available',
          details: status.llm
        });
      }

      const backend = status.llm.backend;
      let targetUrl, requestBody;

      if (backend === 'ollama') {
        targetUrl = `${this.config.ollama_url}/api/chat`;
        requestBody = {
          model: model || this.config.default_model,
          messages: messages,
          stream: stream,
          options: {
            temperature: temperature
          }
        };
      } else if (backend === 'lmstudio') {
        targetUrl = `${this.config.lmstudio_url}/v1/chat/completions`;
        requestBody = {
          model: model || this.config.default_model,
          messages: messages,
          stream: stream,
          temperature: temperature
        };
      }

      console.log(`Proxying to ${backend}:`, targetUrl);

      if (stream) {
        // Streaming response
        const response = await axios.post(targetUrl, requestBody, {
          responseType: 'stream',
          timeout: this.config.timeout
        });

        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        });

        response.data.on('data', (chunk) => {
          res.write(chunk);
        });

        response.data.on('end', () => {
          res.end();
        });

        response.data.on('error', (error) => {
          console.error('Streaming error:', error);
          res.end();
        });

      } else {
        // Regular response
        const response = await axios.post(targetUrl, requestBody, {
          timeout: this.config.timeout
        });

        let result;
        if (backend === 'ollama') {
          // Convertir la réponse Ollama au format OpenAI
          result = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: response.data.model,
            choices: [{
              index: 0,
              message: response.data.message,
              finish_reason: 'stop'
            }]
          };
        } else {
          result = response.data;
        }

        res.json(result);
      }

    } catch (error) {
      console.error('LLM proxy error:', error.message);
      res.status(500).json({
        error: 'LLM request failed',
        details: error.message
      });
    }
  }
}

module.exports = LLMProxy;