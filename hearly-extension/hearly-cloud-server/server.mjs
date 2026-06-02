import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe';

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

async function toWebRequest(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: Buffer.concat(chunks),
  });
}

async function parseFormData(req) {
  const request = await toWebRequest(req);
  return request.formData();
}

async function handleVoiceEnroll(req, res) {
  const form = await parseFormData(req);
  const userName = String(form.get('userName') ?? '').trim();
  const localEmbedding = String(form.get('localEmbedding') ?? '');

  if (!userName || !localEmbedding) {
    json(res, 400, { error: 'userName and localEmbedding are required' });
    return;
  }

  // Replace this with your production speaker-verification provider enrollment.
  json(res, 200, {
    profileId: `local-dev-${crypto.randomUUID()}`,
    embedding: JSON.parse(localEmbedding),
  });
}

async function handleVoiceVerify(_req, res) {
  json(res, 501, {
    error:
      'Speaker verification provider is not configured. Add a voice biometrics provider/model here before launch.',
  });
}

async function handleTranscribe(req, res) {
  if (!OPENAI_API_KEY) {
    json(res, 501, { error: 'OPENAI_API_KEY is not configured' });
    return;
  }

  const form = await parseFormData(req);
  const audio = form.get('audio');
  const language = form.get('language');

  if (!(audio instanceof File)) {
    json(res, 400, { error: 'audio file is required' });
    return;
  }

  const upstream = new FormData();
  upstream.set('model', OPENAI_TRANSCRIBE_MODEL);
  upstream.set('file', audio, audio.name || 'audio.webm');
  if (typeof language === 'string' && language) {
    upstream.set('language', language);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: upstream,
  });

  const text = await response.text();
  if (!response.ok) {
    json(res, response.status, { error: text });
    return;
  }

  const data = JSON.parse(text);
  json(res, 200, {
    text: data.text ?? '',
    language: data.language,
  });
}

async function handleAssistant(req, res) {
  if (!OPENAI_API_KEY) {
    json(res, 501, { error: 'OPENAI_API_KEY is not configured' });
    return;
  }

  const form = await parseFormData(req);
  const context = form.get('context');

  if (!context) {
    json(res, 400, { error: 'context is required' });
    return;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an elite meeting assistant. Provide a concise, action-oriented real-time summary and follow-up tasks based on the following transcript. Keep the output short and format it with brief bullet points.',
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    json(res, response.status, { error: text });
    return;
  }

  const data = JSON.parse(text);
  json(res, 200, {
    suggestion: data.choices?.[0]?.message?.content ?? '',
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      json(res, 204, {});
      return;
    }

    if (req.method !== 'POST') {
      json(res, 405, { error: 'method not allowed' });
      return;
    }

    if (req.url === '/api/voice/enroll') {
      await handleVoiceEnroll(req, res);
      return;
    }

    if (req.url === '/api/voice/verify') {
      await handleVoiceVerify(req, res);
      return;
    }

    if (req.url === '/api/transcribe') {
      await handleTranscribe(req, res);
      return;
    }

    if (req.url === '/api/assistant') {
      await handleAssistant(req, res);
      return;
    }

    json(res, 404, { error: 'not found' });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`Hearly cloud server listening on http://localhost:${PORT}`);
});
