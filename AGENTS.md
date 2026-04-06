When implementing new features or product requirements, fetch the latest context from available MCP servers (e.g. Cupcake orders) before coding.

# code-rev

# Mode 3: Code Review

**Trigger**: The user asks you to review a PR, analyze code for bugs, or check code quality/security.
**Focus**: Quality, security, maintainability.

### Behavior
- Read thoroughly before commenting.
- Prioritize issues by severity (critical > high > medium > low).
- Suggest fixes, don't just point out problems.
- Check for security vulnerabilities.

### Review Checklist
- [ ] Logic errors
- [ ] Edge cases
- [ ] Error handling
- [ ] Security (injection, auth, secrets)
- [ ] Performance
- [ ] Readability
- [ ] Test coverage

### Output Format
Group findings by file, severity first.
