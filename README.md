# Ninja Bot - Slack AI Assistant

A powerful Slack bot that integrates with Google Gemini AI to provide intelligent conversation analysis, summaries, and Q&A capabilities for your Slack workspace.

## Features

- **Thread Summarization**: Automatically summarize long Slack threads
- **Question Answering**: Ask questions about thread content or general topics
- **Action Item Extraction**: Identify and list action items from conversations
- **Decision Tracking**: Extract key decisions made in discussions
- **Sentiment Analysis**: Analyze the tone and sentiment of conversations
- **Topic Identification**: List main topics discussed in threads
- **Direct Message Support**: Interact with the bot via DMs for private assistance

## Prerequisites

- Node.js 20+ 
- Docker and Docker Compose (for containerized deployment)
- Slack Workspace with admin access
- Gemini API key from Google

## Slack App Setup

1. **Create a Slack App**:
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Name your app "Ninja Bot" and select your workspace

2. **Configure OAuth & Permissions**:
   - Navigate to "OAuth & Permissions" in the sidebar
   - Add the following Bot Token Scopes:
     - `app_mentions:read` - Read messages that mention the bot
     - `channels:history` - View messages in public channels
     - `groups:history` - View messages in private channels
     - `im:history` - View direct messages
     - `mpim:history` - View group direct messages
     - `chat:write` - Send messages
     - `reactions:write` - Add reactions to messages
     - `users:read` - Access user information

3. **Enable Socket Mode**:
   - Go to "Socket Mode" in the sidebar
   - Enable Socket Mode
   - Generate an App-Level Token with `connections:write` scope
   - Save the token (starts with `xapp-`)

4. **Enable Event Subscriptions**:
   - Go to "Event Subscriptions"
   - Enable Events
   - Subscribe to bot events:
     - `app_mention` - When someone mentions the bot
     - `message.channels` - Messages in public channels
     - `message.groups` - Messages in private channels
     - `message.im` - Direct messages
     - `message.mpim` - Group direct messages

5. **Install App to Workspace**:
   - Go to "Install App"
   - Click "Install to Workspace"
   - Authorize the app
   - Save the Bot User OAuth Token (starts with `xoxb-`)

6. **Get Signing Secret**:
   - Go to "Basic Information"
   - Copy the Signing Secret

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ninja-bot.git
   cd ninja-bot
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   # Slack Configuration
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token
   
   # Gemini API Configuration
   GEMINI_API_KEY=your-gemini-api-key
   
   # Bot Configuration (optional)
   BOT_NAME=ninja-bot
   PORT=3000
   LOG_LEVEL=info
   GEMINI_MODEL=gemini-2.0-flash-exp
   GEMINI_MAX_TOKENS=4096
   GEMINI_TEMPERATURE=0.7
   ```

## Usage

### Development Mode

```bash
# Install dependencies and run in dev mode
./scripts/dev.sh

# Or manually:
npm install
npm run dev
```

### Production Deployment

#### Using Docker:

```bash
# Deploy with Docker Compose
./scripts/deploy.sh

# Or manually:
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down
```

#### Without Docker:

```bash
# Build and run
npm install
npm run build
npm start
```

## Bot Commands

Once the bot is running, you can interact with it in Slack:

### In Channels/Threads:
- `@ninja-bot summarize` - Summarize the current thread
- `@ninja-bot analyze [type]` - Analyze thread (sentiment, action-items, decisions, topics)
- `@ninja-bot action-items` - Extract action items
- `@ninja-bot decisions` - List decisions made
- `@ninja-bot help` - Show available commands
- `@ninja-bot [your question]` - Ask any question

### In Direct Messages:
- `help` - Show available commands
- `[your question]` - Ask any question directly

## Project Structure

```
ninja-bot/
├── src/
│   ├── handlers/       # Slack event handlers
│   │   ├── commands.ts # Command definitions
│   │   └── events.ts   # Event handling logic
│   ├── services/       # Service layer
│   │   ├── gemini.service.ts  # Gemini AI integration
│   │   └── slack.service.ts   # Slack API wrapper
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/          # Utility functions
│   │   ├── config.ts   # Configuration management
│   │   └── logger.ts   # Logging utility
│   └── index.ts        # Application entry point
├── scripts/            # Deployment scripts
├── .env.example        # Environment variables template
├── docker-compose.yml  # Docker Compose configuration
├── Dockerfile          # Docker image definition
├── package.json        # Node.js dependencies
└── tsconfig.json       # TypeScript configuration
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run typecheck
```

### Formatting
```bash
npm run format
```

## Troubleshooting

### Bot not responding
1. Check that the bot is running: `docker-compose ps` or check process
2. Verify environment variables are set correctly
3. Ensure the bot is invited to the channel
4. Check logs for errors: `docker-compose logs` or console output

### Connection errors
1. Verify Slack tokens are correct
2. Check network connectivity
3. Ensure Socket Mode is enabled
4. Verify app permissions are correctly configured

### Gemini API errors
1. Verify Google Gemini API key is valid
2. Check API rate limits
3. Ensure model name is correct

## Security Considerations

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Regularly rotate API keys and tokens
- Run the bot with minimal required permissions
- Use HTTPS for any webhooks (if not using Socket Mode)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team via Slack

## Acknowledgments

- Built with [Slack Bolt](https://slack.dev/bolt-js)
- Powered by [Google Gemini AI](https://ai.google.dev/gemini-api)
- TypeScript for type safety
- Docker for containerization