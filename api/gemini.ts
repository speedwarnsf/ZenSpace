import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, Type, Chat } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export const config = {
  maxDuration: 90,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ai) return res.status(500).json({ error: 'API key not configured on server' });

  try {
    const { action, model, contents, config: reqConfig, systemInstruction, message, chatContext } = req.body;

    if (action === 'chat') {
      // Chat message
      const chat = ai.chats.create({
        model: model || 'gemini-2.0-flash',
        config: { systemInstruction: chatContext || '' }
      });
      const response = await chat.sendMessage({ message: message || '' });
      return res.status(200).json({ text: response.text });
    }

    // generateContent
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.0-flash',
      contents,
      config: reqConfig,
    });

    // Return full response
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Gemini proxy error:', error);
    const status = error.status || error.httpStatusCode || 500;
    return res.status(status).json({ 
      error: error.message || 'Gemini API error',
      code: error.code || 'PROXY_ERROR'
    });
  }
}
