# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately:

**Email:** security@lutris.ai

Do not open a public issue. We'll acknowledge within 48 hours and aim to release a fix within 7 days for critical issues.

## MCP server

The MCP HTTP transport (`Lutris.ai-mcp-http`) binds to `127.0.0.1` by default with `eval` disabled, CORS disabled, and file access restricted to the working directory. See [MCP docs](https://lutris.ai/reference/mcp-tools) for configuration.

The stdio transport (`Lutris.ai-mcp`) is intended for local use only and does not apply these restrictions.
