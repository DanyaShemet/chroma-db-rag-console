import OpenAI from 'openai'

const embeddingProvider = (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase()
const llmProvider = (process.env.LLM_PROVIDER || 'openai').toLowerCase()

function getDefaultEmbeddingModel(): string {
  if (embeddingProvider === 'gemini') {
    return 'text-embedding-004'
  }

  if (embeddingProvider === 'huggingface') {
    return 'sentence-transformers/all-MiniLM-L6-v2'
  }

  return 'text-embedding-3-small'
}

function getDefaultChatModel(): string {
  if (llmProvider === 'gemini') {
    return 'gemini-2.0-flash'
  }

  if (llmProvider === 'huggingface') {
    return 'katanemo/Arch-Router-1.5B:hf-inference'
  }

  return 'gpt-5.4'
}

const embeddingModel = process.env.EMBEDDING_MODEL || getDefaultEmbeddingModel()
const openAiChatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4'
const geminiChatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash'
const huggingFaceChatModel = process.env.HUGGINGFACE_CHAT_MODEL || getDefaultChatModel()
const huggingFaceFallbackChatModel = 'katanemo/Arch-Router-1.5B:hf-inference'

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required.')
  }

  return new OpenAI({ apiKey })
}

function getHuggingFaceClient(): OpenAI {
  const apiKey = getHuggingFaceApiKey()

  return new OpenAI({
    apiKey,
    baseURL: 'https://router.huggingface.co/v1',
  })
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (embeddingProvider === 'gemini') {
    return getGeminiEmbedding(text)
  }

  if (embeddingProvider === 'huggingface') {
    return getHuggingFaceEmbedding(text)
  }

  if (embeddingProvider === 'openai') {
    return getOpenAIEmbedding(text)
  }

  throw new Error(`Unsupported EMBEDDING_PROVIDER: ${embeddingProvider}. Use "openai", "gemini", or "huggingface".`)
}

async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  })

  return response.data[0].embedding
}

export function getEmbeddingModelName(): string {
  return embeddingModel
}

export function getEmbeddingProviderName(): string {
  return embeddingProvider
}

export function getChatModelName(): string {
  if (llmProvider === 'gemini') {
    return geminiChatModel
  }

  if (llmProvider === 'huggingface') {
    return huggingFaceChatModel
  }

  return openAiChatModel
}

export function getChatProviderName(): string {
  return llmProvider
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for answer generation.')
  }

  return apiKey
}

function getHuggingFaceApiKey(): string {
  const apiKey = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY

  if (!apiKey) {
    throw new Error('HF_TOKEN or HUGGINGFACE_API_KEY is required for Hugging Face requests.')
  }

  return apiKey
}

async function getGeminiEmbedding(text: string): Promise<number[]> {
  const apiKey = getGeminiApiKey()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini embedding request failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as {
    embedding?: {
      values?: number[]
    }
  }
  const values = data.embedding?.values

  if (!values?.length) {
    throw new Error('Gemini embedding response did not contain embedding values.')
  }

  return values
}

async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const apiKey = getHuggingFaceApiKey()
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(embeddingModel)}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: text,
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Hugging Face embedding request failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as number[] | number[][]
  let values: number[]

  if (Array.isArray(data[0])) {
    values = data[0]
  } else {
    values = data as number[]
  }

  if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== 'number')) {
    throw new Error('Hugging Face embedding response did not contain a numeric embedding vector.')
  }

  return values
}

async function generateGeminiText(systemInstruction: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiChatModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini request failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
        }>
      }
    }>
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()

  return text || 'No response from model.'
}

async function generateHuggingFaceText(systemInstruction: string, userPrompt: string): Promise<string> {
  const client = getHuggingFaceClient()
  const messages = [
    {
      role: 'system' as const,
      content: systemInstruction,
    },
    {
      role: 'user' as const,
      content: userPrompt,
    },
  ]

  try {
    const response = await client.chat.completions.create({
      model: huggingFaceChatModel,
      messages,
    })

    return response.choices[0].message.content?.trim() || 'No response from model.'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const canRetryWithFallback =
      huggingFaceChatModel !== huggingFaceFallbackChatModel &&
      message.includes('is not supported by provider')

    if (!canRetryWithFallback) {
      throw error
    }

    const response = await client.chat.completions.create({
      model: huggingFaceFallbackChatModel,
      messages,
    })

    return response.choices[0].message.content?.trim() || 'No response from model.'
  }
}

async function generateOpenAIText(systemInstruction: string, userPrompt: string): Promise<string> {
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: openAiChatModel,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  return response.choices[0].message.content?.trim() || 'No response from model.'
}

async function generateText(systemInstruction: string, userPrompt: string): Promise<string> {
  if (llmProvider === 'gemini') {
    return generateGeminiText(systemInstruction, userPrompt)
  }

  if (llmProvider === 'huggingface') {
    return generateHuggingFaceText(systemInstruction, userPrompt)
  }

  if (llmProvider === 'openai') {
    return generateOpenAIText(systemInstruction, userPrompt)
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${llmProvider}. Use "openai", "gemini", or "huggingface".`)
}

export async function answerQuestion(question: string, contextChunks: string[]): Promise<string> {
  const context = contextChunks.join('\n---\n')

  return generateText(
    'Answer only from the provided context. If the answer is not in the context, say that you do not know. Do not invent facts.',
    `Context:\n${context}\n\nQuestion: ${question}`,
  )
}

export async function answerQuestionDirect(question: string): Promise<string> {
  return generateText(
    'Answer the user directly without any retrieved context. If you are unsure, say so instead of pretending to know.',
    question,
  )
}
