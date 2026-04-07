import OpenAI from 'openai';
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4';
function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required.');
    }
    return new OpenAI({ apiKey });
}
export async function getEmbedding(text) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model: embeddingModel,
        input: text,
    });
    return response.data[0].embedding;
}
export function getEmbeddingModelName() {
    return embeddingModel;
}
export function getChatModelName() {
    return chatModel;
}
export async function answerQuestion(question, contextChunks) {
    const openai = getOpenAIClient();
    const context = contextChunks.join('\n---\n');
    const response = await openai.chat.completions.create({
        model: chatModel,
        messages: [
            {
                role: 'system',
                content: 'Answer only from the provided context. If the answer is not in the context, say that you do not know. Do not invent facts.',
            },
            {
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${question}`,
            },
        ],
    });
    return response.choices[0].message.content?.trim() || 'No response from model.';
}
export async function answerQuestionDirect(question) {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
        model: chatModel,
        messages: [
            {
                role: 'system',
                content: 'Answer the user directly without any retrieved context. If you are unsure, say so instead of pretending to know.',
            },
            {
                role: 'user',
                content: question,
            },
        ],
    });
    return response.choices[0].message.content?.trim() || 'No response from model.';
}
//# sourceMappingURL=openai.js.map