## 💻 Console demo with Chroma

Перед запуском:

- запустіть Chroma server, наприклад `chroma run --path ./chroma-data`
- заповніть `OPENAI_API_KEY`
- за потреби змініть `CHROMA_URL`, `CHROMA_TENANT`, `CHROMA_DATABASE`, `CHROMA_COLLECTION`

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
