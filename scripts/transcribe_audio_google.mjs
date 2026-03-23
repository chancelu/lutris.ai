import fs from 'fs';
import { google } from '@ai-sdk/google';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node transcribe_audio_google.mjs <audio-file>');
  process.exit(1);
}

const audio = fs.readFileSync(filePath);
const model = google.languageModel('gemini-2.5-flash', {
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const result = await model.doGenerate({
  prompt: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '请把这段中文语音完整转写成简体中文文字，不要总结，不要改写，只输出转写结果。' },
        { type: 'file', data: audio, mediaType: 'audio/ogg' }
      ]
    }
  ]
});

const text = result.content
  .filter(part => part.type === 'text')
  .map(part => part.text)
  .join('\n')
  .trim();

console.log(text || '[EMPTY_TRANSCRIPT]');