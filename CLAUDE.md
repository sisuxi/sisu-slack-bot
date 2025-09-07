# Claude Code Project Instructions

## Project: Ninja Bot - Slack AI Assistant

### Project Overview
This is a Slack bot that integrates with Claude AI to provide intelligent conversation analysis, summaries, and Q&A capabilities. The bot uses Socket Mode for real-time event handling and TypeScript for type safety.

### Key Architecture Decisions

1. **Socket Mode over Webhooks**: Using Socket Mode eliminates the need for public URLs and simplifies deployment
2. **TypeScript**: Provides type safety and better IDE support for Slack and Claude API integrations
3. **Service Layer Pattern**: Separated Slack and Claude logic into distinct services for maintainability
4. **Command Pattern**: Implemented extensible command system for easy feature additions

### Learnings & Best Practices

#### File Operations
- **Always check file existence before writing**: Use `Read` tool first or create new files with appropriate commands
- **Use absolute paths**: Always use full paths starting with `/Users/...` to avoid path resolution issues

#### Git Workflow
- **Feature branches**: Always create feature branches for new work
- **Incremental commits**: Make frequent, logical commits with descriptive messages
- **PR checkpoints**: Create PRs at logical milestones for better tracking and rollback capability

#### Slack Bot Specific
- **Event Types**: 
  - `app_mention`: Bot mentioned in channels/threads
  - `message`: Direct messages and channel messages
  - Filter bot messages to avoid loops
  
- **Thread Context**: Always fetch thread messages when responding to thread mentions
- **Reactions**: Use reactions (`thinking_face`, `white_check_mark`, `x`) for better UX
- **Socket Mode Requirements**: Both `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are required

#### Claude Integration
- **Structured Prompts**: Format conversation context clearly with user identifiers
- **Error Handling**: Always wrap Claude API calls in try-catch blocks
- **Token Management**: Configure max_tokens appropriately for different command types

### Common Commands

```bash
# Development
npm run dev           # Run with hot reload
npm run build        # Build TypeScript
npm run typecheck    # Check types without building

# Deployment
./scripts/deploy.sh  # Deploy with Docker
docker-compose logs -f  # View logs

# Testing
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Environment Variables

Required:
- `SLACK_BOT_TOKEN`: Bot User OAuth Token (xoxb-...)
- `SLACK_SIGNING_SECRET`: App signing secret
- `SLACK_APP_TOKEN`: App-level token for Socket Mode (xapp-...)
- `ANTHROPIC_API_KEY`: Claude API key

Optional:
- `CLAUDE_MODEL`: Model to use (default: claude-3-5-sonnet-20241022)
- `CLAUDE_MAX_TOKENS`: Max response tokens (default: 4096)
- `CLAUDE_TEMPERATURE`: Response creativity (default: 0.7)
- `LOG_LEVEL`: Logging verbosity (debug|info|warn|error)

### Project Structure Rationale

```
src/
├── handlers/    # Event handling logic, separated from services
├── services/    # Business logic for Slack and Claude
├── types/       # Centralized TypeScript definitions
├── utils/       # Shared utilities (config, logger)
└── index.ts     # Application entry point with minimal logic
```

### Testing Checklist

Before deployment:
1. ✅ TypeScript builds without errors (`npm run build`)
2. ✅ ESLint passes (`npm run lint`)
3. ✅ Environment variables are set
4. ✅ Bot responds to mentions
5. ✅ Bot handles DMs correctly
6. ✅ Thread context is properly fetched
7. ✅ Error handling shows user-friendly messages

### Future Enhancements

1. **Rate Limiting**: Implement per-user rate limits for Claude API calls
2. **Caching**: Cache thread summaries to reduce API calls
3. **Analytics**: Track command usage and response times
4. **Custom Commands**: Allow workspace admins to define custom commands
5. **Webhook Support**: Add webhook mode as alternative to Socket Mode
6. **Tests**: Add comprehensive unit and integration tests

### Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Bot not responding | Check Socket Mode is enabled and app_token is correct |
| "Missing required environment variables" | Ensure all tokens are set in .env file |
| Connection errors | Verify network connectivity and Slack API status |
| Claude API errors | Check API key validity and rate limits |
| Type errors | Run `npm run typecheck` to identify issues |

### Security Notes

- Never commit .env file (included in .gitignore)
- Use minimal required Slack permissions
- Implement rate limiting for production
- Regular token rotation recommended
- Run container as non-root user (already configured)