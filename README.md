## 💻 Console demo with Chroma

Перед запуском:

- запустіть Chroma server, наприклад `chroma run --path ./chroma-data`
- виберіть `EMBEDDING_PROVIDER` (`openai` або `gemini`) для embeddings
- заповніть `EMBEDDING_MODEL`, він є базовою embedding model і від нього автоматично формується Chroma collection
- для `openai` embeddings заповніть `OPENAI_API_KEY`
- для `gemini` embeddings заповніть `GEMINI_API_KEY`
- виберіть `LLM_PROVIDER` (`openai` або `gemini`) для генерації відповідей
- для `openai` заповніть `OPENAI_CHAT_MODEL`
- для `gemini` заповніть `GEMINI_API_KEY` і за потреби `GEMINI_CHAT_MODEL`
- collection за замовчуванням формується як `rag_<EMBEDDING_MODEL>`, наприклад `rag_text-embedding-3-small` або `rag_gemini-embedding-001`
- `CHROMA_COLLECTION` лишай порожнім, якщо хочеш автоматичне розділення collection по embedding model; задай його лише для свідомого кастомного override
- за потреби змініть `CHROMA_URL`, `CHROMA_TENANT`, `CHROMA_DATABASE`
- для RAG-пошуку можна налаштувати `RAG_TOP_K`, `RAG_CANDIDATE_LIMIT`, `RAG_MAX_DISTANCE`

Команди:

- `npm run start` - зібрати і запустити demo

Після старту в консолі доступні команди:

- `load <path-to-file>` (`.pdf` або `.txt`)
- `ask <question>` для відповіді через RAG
- `ask-direct <question>` для відповіді без RAG, щоб показувати можливі галюцинації
- `list`
- `chunks <file>`
- `reset`
- `exit`
