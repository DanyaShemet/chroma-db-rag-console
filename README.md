## Console RAG Demo with Chroma

Невеликий консольний проєкт для дослідження RAG:

- завантажує `.pdf` або `.txt`
- ділить текст на chunk-и
- створює embeddings
- зберігає їх у ChromaDB
- відповідає на питання через RAG або напряму без RAG

## Швидкий старт

### 1. Встановіть залежності

```bash
npm install
```

### 2. Створіть `.env` з прикладу

```bash
cp .env.example .env
```

### 3. Заповніть `.env`

Мінімальний варіант для OpenAI:

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-...

LLM_PROVIDER=openai
OPENAI_CHAT_MODEL=gpt-5.4

CHROMA_URL=http://localhost:8000
CHROMA_TENANT=default_tenant
CHROMA_DATABASE=default_database

RAG_TOP_K=3
RAG_CANDIDATE_LIMIT=8
RAG_MAX_DISTANCE=1.2
```

Якщо хочете використовувати Gemini:

- встановіть `EMBEDDING_PROVIDER=gemini`, якщо embeddings мають бути через Gemini
- встановіть `LLM_PROVIDER=gemini`, якщо відповіді мають генеруватись через Gemini
- заповніть `GEMINI_API_KEY`
- за потреби змініть `GEMINI_CHAT_MODEL`

### 4. Запустіть Chroma

```bash
chroma run --path ./chroma-data
```

Chroma треба тримати запущеним в окремому терміналі.

### 5. Запустіть проєкт

```bash
npm run start
```

Ця команда:

- очищає `dist`
- компілює TypeScript
- запускає консольний застосунок

## Режим розробки

Якщо ви змінюєте код і хочете, щоб TypeScript автоматично перекомпілювався, а CLI перезапускався після змін, використовуйте два паралельні процеси.

Термінал 1:

```bash
npm run dev:watch
```

Термінал 2:

```bash
npm run dev:cli
```

Цей варіант зручний, якщо ви хочете окремо бачити компіляцію і окремо поведінку CLI.

Важливо:

- Chroma все одно має бути запущений окремо
- якщо ви змінюєте код, працюйте через `dev:watch` + `dev:cli`, а не через `npm run start`

## Приклад першого запуску

Після старту в консолі можна виконати:

```text
load ./pdf/example.pdf
ask Що сказано про головну тему документа?
ask-direct Що ти знаєш про головну тему документа?
list
chunks
exit
```

## Команди в CLI

- `load <path-to-file>`: індексувати `.pdf` або `.txt`
- `ask <question>`: відповідь через RAG
- `ask-direct <question>`: відповідь без RAG, щоб порівняти з прямою генерацією
- `list`: показати кількість chunk-ів і список файлів
- `chunks [filter]`: показати збережені chunk-и
- `chunk <filter> <n>`: показати повний вміст одного chunk-а
- `reset`: видалити всі записи з поточної collection
- `db-info`: показати інформацію про поточну collection
- `db-drop`: повністю видалити поточну collection
- `help`: показати список команд
- `exit`: вийти з програми

## Корисні пояснення

- collection за замовчуванням формується як `rag_<EMBEDDING_MODEL>`, наприклад `rag_text-embedding-3-small`
- `CHROMA_COLLECTION` краще залишати порожнім, якщо хочете автоматично розділяти дані за embedding model
- `RAG_TOP_K`, `RAG_CANDIDATE_LIMIT`, `RAG_MAX_DISTANCE` впливають на те, які chunk-и потрапляють у фінальну відповідь
- `ask` і `ask-direct` варто порівнювати між собою під час дослідження сильних і слабких сторін RAG


## Завдання для дослідження

Список завдань винесено в окремий файл: [TASKS.md](./task.md)

## Базовий сценарій

1. Скопіювати `.env.example` в `.env`.
2. Вставити свій API key.
3. Запустити Chroma в окремому терміналі.
4. Виконати `npm run start`.
5. Завантажити документ через `load`.
6. Поставити одне й те саме питання через `ask` і `ask-direct`.
7. Порівняти результат і пояснити різницю.
