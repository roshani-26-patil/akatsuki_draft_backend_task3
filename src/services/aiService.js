import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Custom Error for AI service configuration or execution issues
 */
export class AIServiceError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * AI Content Improvement Service
 * Communicates with the configured AI provider (Google Gemini by default)
 * to enhance writing clarity, grammar, and flow while preserving author intent.
 *
 * @param {Object} postData - { title, description, content }
 * @returns {Promise<{ title: string, description: string, content: string }>}
 */
export const improveContentWithAI = async ({ title, description = '', content }) => {
  const apiKey = process.env.AI_API_KEY;
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const modelName = process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

  // Verify that an API key is configured
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini')) {
    throw new AIServiceError(
      'AI service is not configured. Please set a valid AI_API_KEY in your environment variables.',
      503
    );
  }

  // Validate input parameters
  if (!title || !content) {
    throw new AIServiceError('Title and content are required for AI improvement.', 400);
  }

  const prompt = `You are an expert editorial assistant for Akatsuki's Draft, a high-quality content sharing platform.
Improve the following draft by enhancing its grammar, clarity, vocabulary, readability, structure, and overall writing quality.
Crucial requirements:
1. Preserve the author's original meaning, core message, and intent.
2. Return ONLY a valid JSON object (no markdown code blocks, no backticks, no explanatory text).
3. The JSON must have exactly these keys: "title", "description", "content".

Original Title:
${title}

Original Description:
${description || 'N/A'}

Original Content:
${content}
`;

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      return parseAIResponse(text, { title, description, content });
    } else if (provider === 'openai') {
      // Direct REST call to OpenAI API (avoids requiring another heavy SDK)
      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an expert editor. You must respond strictly in JSON with keys "title", "description", and "content".',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!openAiResponse.ok) {
        const errorBody = await openAiResponse.text();
        throw new AIServiceError(`OpenAI API error: ${openAiResponse.statusText}`, 502, errorBody);
      }

      const data = await openAiResponse.json();
      const rawContent = data.choices?.[0]?.message?.content?.trim();
      return parseAIResponse(rawContent, { title, description, content });
    } else {
      throw new AIServiceError(`Unsupported AI provider: ${provider}. Supported providers are 'gemini' and 'openai'.`, 400);
    }
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }
    console.error('[AI Service Error]:', error.message);
    throw new AIServiceError(
      `AI improvement failed: ${error.message}`,
      error.status === 429 ? 429 : 502,
      error
    );
  }
};

/**
 * Safely parse and validate the JSON output from the AI model
 */
function parseAIResponse(rawJson, fallbackOriginals) {
  if (!rawJson) {
    throw new AIServiceError('AI returned an empty response.', 502);
  }

  // Strip markdown code block fences if present
  let cleanText = rawJson;
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  cleanText = cleanText.trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseError) {
    console.error('Failed to parse AI JSON response:', cleanText);
    throw new AIServiceError('AI generated an invalid format that could not be parsed.', 502);
  }

  // Validate fields
  if (!parsed.title || typeof parsed.title !== 'string') {
    parsed.title = fallbackOriginals.title;
  }
  if (!parsed.content || typeof parsed.content !== 'string') {
    throw new AIServiceError('AI output did not contain improved content.', 502);
  }
  if (parsed.description === undefined || typeof parsed.description !== 'string') {
    parsed.description = fallbackOriginals.description || '';
  }

  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    content: parsed.content.trim(),
  };
}

export default improveContentWithAI;
