# Security Policy

## Supported versions

Active branch versions are supported with best-effort security fixes.

## Reporting a vulnerability

Please do not open public issues for sensitive vulnerabilities.
Report privately to the maintainers with:

- Affected component
- Reproduction steps
- Impact assessment
- Suggested remediation

## Security controls in this repository

- JWT-based auth for protected APIs
- Rate limiting on API routes
- Helmet security headers
- Request sanitization (mongo sanitize, xss-clean, hpp)
- Structured logging with token/password redaction

## Secret management

- Never commit live API keys or credentials.
- Use env files from templates and CI/CD secrets for deployment.
