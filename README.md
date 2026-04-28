# AI Chat Widget

An AI-powered chat bot built with Node.js, Express, PostgreSQL and OpenAI API. Renders via EJS templates and can be embedded on any website.

## Preview

![Chat Widget](./public/preview1.png)
![Chat Widget](./public/preview2.png)

## Features

- Chat with context-aware prompts based on message content
- Message history stored in PostgreSQL via Sequelize
- Rate limiting and message count limits per chat session
- Two embeddable chat UI variants
- Session persistence via localStorage

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL + Sequelize ORM
- **Templating:** EJS
- **AI:** OpenAI API (gpt-4.1-mini)
- **Frontend:** jQuery

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Installation

```bash
git clone https://github.com/lierzillah/ai-chat-example-nodejs
cd your-repo
npm install
```

### Configuration

```bash
cp .env.example .env
```

Fill in your values in `.env`:

`PORT` — server port (default: 3000)
`NODE_ENV` — environment: development or production
`DB_USERNAME` — PostgreSQL username
`DB_PASSWORD` — PostgreSQL password
`DB_NAME` — database name
`DB_HOST` — database host
`OPENAI_API_KEY` — your OpenAI API key
`MAX_MESSAGES_PER_CHAT` — max user messages per session
`MIN_INTERVAL_MS` — min delay between messages (ms)

```bash
cp prompts.example.js prompts.js
```

Fill in your prompts in `prompts.js`

### Run

1. `yarn` — install dependencies
2. `yarn start` — run migrations and start the server
3. Open `/chat_1` or `/chat_2`
