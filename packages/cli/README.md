# @docstalk/cli

The official CLI tool for **DocsTalk** - the AI-powered documentation assistant.

[![npm version](https://img.shields.io/npm/v/@docstalk/cli.svg)](https://www.npmjs.com/package/@docstalk/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Installation

```bash
npm install -g @docstalk/cli
```

## 💡 Usage

### Public Commands

These commands are available to everyone.

**1. Ask a Question**
Ask the AI about any supported documentation.

```bash
docstalk ask "how to use react hooks?"
```

**2. Specify Source**
Force the AI to use a specific documentation source.

```bash
docstalk ask "docker compose" --source docker
```

**3. List Sources**
See all available documentation sources.

```bash
docstalk sources
```

**4. Login**
Login with your API token (if required by your instance).

```bash
docstalk login <your-token>
```

### Developer Commands

These commands require an **Admin Token** and are used for managing the DocsTalk platform.

**Prerequisites:**

```bash
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY
```

**1. Scrape Documentation**
Scrape official documentation sites.

```bash
docstalk dev scrape react
docstalk dev scrape react --incremental  # Only scrape new/changed pages
```

**2. Index Documentation**
Generate embeddings and store them in the vector database.

```bash
docstalk dev index react
```

**3. Start Development Server**
(Only works inside the DocsTalk monorepo)

```bash
docstalk dev serve
```

## 🔧 Configuration

The CLI can be configured via environment variables or a config file.

| Variable               | Description                      | Default                 |
| ---------------------- | -------------------------------- | ----------------------- |
| `DOCSTALK_API_URL`     | URL of the DocsTalk API          | `http://localhost:3001` |
| `DOCSTALK_API_TOKEN`   | Token for authenticated requests | `null`                  |
| `DOCSTALK_ADMIN_TOKEN` | Admin token for dev commands     | `null`                  |

## 🤝 Contributing

This CLI is part of the [DocsTalk](https://github.com/hk-dev13/docstalk) monorepo. Contributions are welcome!
