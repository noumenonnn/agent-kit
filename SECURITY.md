# Security

[Русский](SECURITY.ru.md)

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** option when available. Otherwise, open an issue requesting a private contact channel without disclosing exploit details, tokens, private code, or raw logs.

Include the affected kit version, operating system, agent version, a minimal reproduction with synthetic data, and the expected boundary that failed. Response times are not guaranteed.

## Scope

The current release is the maintained version. This project protects ordinary local setup and restore operations; it is not a sandbox against a hostile process changing the filesystem concurrently.

The installer makes no model calls. Optional Pi delegation requires interactive consent. Context bundles remain local until explicitly shared. Filename exclusions cannot detect every secret embedded in source code. Logs, handoffs, and backups may contain private material and should stay out of commits.

Client permissions and project trust remain authoritative. A skill is not a runtime security boundary. See [context-tools](CONTEXT-TOOLS-RU.md) for the Pi extension's limits.
