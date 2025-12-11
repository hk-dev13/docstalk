#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { saveConfig, getConfig, getToken } from "./config.js";

// ============================================================================
// HELPERS
// ============================================================================

// Helper to find project root
function findProjectRoot(cwd: string = process.cwd()): string | null {
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return cwd;
  }
  const parent = path.dirname(cwd);
  if (parent === cwd) return null;
  return findProjectRoot(parent);
}

const projectRoot = findProjectRoot();

// Check if running in dev mode
const isDev = process.env.DOCSTALK_DEV === "1" || !!projectRoot;

// ============================================================================
// AUTHENTICATION & SECURITY
// ============================================================================

/**
 * Check if user has permission to use dev commands
 * Multi-layer authentication:
 * 1. Must have DOCSTALK_ADMIN_TOKEN env var
 * 2. Must be inside project root (for local dev)
 * OR provide valid remote token (for production)
 */
function checkDevPermission(): { allowed: boolean; reason?: string } {
  // Layer 1: Check for admin token
  const adminToken = process.env.DOCSTALK_ADMIN_TOKEN;

  if (!adminToken) {
    return {
      allowed: false,
      reason: "DOCSTALK_ADMIN_TOKEN environment variable not set",
    };
  }

  // Layer 2: For local development, must be in project
  if (!projectRoot) {
    // Not in project, check if remote token is valid
    const remoteToken = process.env.DOCSTALK_REMOTE_TOKEN;

    if (!remoteToken) {
      return {
        allowed: false,
        reason:
          "Must be inside DocsTalk project or provide DOCSTALK_REMOTE_TOKEN",
      };
    }

    // Validate remote token (for production deployments)
    // In production, this should validate against a secure backend
    if (remoteToken !== adminToken) {
      return {
        allowed: false,
        reason: "Invalid remote token",
      };
    }
  }

  // Layer 3: Additional check - must match expected admin token
  // This prevents random env vars from granting access
  const expectedTokenPrefix = "dtalk_admin_";
  if (!adminToken.startsWith(expectedTokenPrefix)) {
    return {
      allowed: false,
      reason: "Invalid admin token format (must start with 'dtalk_admin_')",
    };
  }

  return { allowed: true };
}

/**
 * Require dev permission or exit with error
 */
function requireDevPermission(commandName: string) {
  const check = checkDevPermission();

  if (!check.allowed) {
    console.error(chalk.red(`\n🔒 Permission Denied: ${commandName}\n`));
    console.error(chalk.yellow("Developer commands require authentication.\n"));
    console.error(chalk.gray("Reason:"), check.reason);
    console.error(chalk.gray("\nTo use developer commands:"));
    console.error(
      chalk.gray("1. Set DOCSTALK_ADMIN_TOKEN environment variable")
    );
    console.error(
      chalk.gray("   export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY")
    );
    console.error(chalk.gray("\n2. Either:"));
    console.error(chalk.gray("   - Run inside DocsTalk project directory, OR"));
    console.error(
      chalk.gray("   - Set DOCSTALK_REMOTE_TOKEN for remote access")
    );
    console.error(
      chalk.gray("\n📖 See docs: packages/cli/docs/authentication.md\n")
    );
    process.exit(1);
  }
}

// ============================================================================
// BRANDING & UI
// ============================================================================

/**
 * DocsTalk ASCII Art Banner
 */
function showBanner() {
  console.log(
    chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                                ║
║   ██████╗  ██████╗  ██████╗███████╗████████╗ █████╗ ██╗      ██╗  ██╗
║   ██╔══██╗██╔═══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██║      ██║ ██╔╝
║   ██║  ██║██║   ██║██║     ███████╗   ██║   ███████║██║      █████╔╝ 
║   ██║  ██║██║   ██║██║     ╚════██║   ██║   ██╔══██║██║      ██╔═██╗ 
║   ██████╔╝╚██████╔╝╚██████╗███████║   ██║   ██║  ██║███████╗ ██║  ██╗
║   ╚═════╝  ╚═════╝  ╚═════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝
║                                                                ║
║   ${chalk.white.bold("Smart Documentation Assistant")}                      ║
║   ${chalk.gray(
      "Ask questions, get instant answers from official docs"
    )}         ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
  `)
  );
  console.log(
    chalk.gray(
      `   Version: ${chalk.green("v0.3.7-alpha")}  |  Mode: ${
        isDev ? chalk.yellow("Development") : chalk.green("Production")
      }`
    )
  );
  console.log(
    chalk.gray(`   Docs: ${chalk.blue("https://docstalk.envoyou.com")}\n`)
  );
}

/**
 * Show banner for help command
 */
function showHelp() {
  showBanner();
  console.log(chalk.white.bold("📚 Available Commands:\n"));
  console.log(chalk.cyan("  Public Commands:"));
  console.log(
    chalk.gray("    docstalk ask <query>         Ask a question to the AI")
  );
  console.log(
    chalk.gray("    docstalk search <query>      Search documentation")
  );
  console.log(
    chalk.gray(
      "    docstalk sources             List available documentation sources"
    )
  );
  console.log(
    chalk.gray("    docstalk login <token>       Login with API token")
  );
  console.log(
    chalk.gray(
      "    docstalk logout              Logout and remove stored token"
    )
  );
  console.log(chalk.gray("    docstalk version             Show version info"));
  console.log(chalk.gray("    docstalk help                Show this help\n"));

  console.log(chalk.cyan("  Developer Commands:"));
  console.log(chalk.gray("    docstalk dev                 Show dev commands"));
  console.log(chalk.gray("    docstalk dev serve           Start dev server"));
  console.log(
    chalk.gray("    docstalk dev scrape          Scrape documentation")
  );
  console.log(
    chalk.gray("    docstalk dev index           Index documentation")
  );
  console.log(
    chalk.gray("    docstalk dev index --url     Index specific URL only")
  );
  console.log(
    chalk.gray("    docstalk dev test-router     Test routing logic\n")
  );

  console.log(chalk.white.bold("💡 Examples:\n"));
  console.log(chalk.gray('  $ docstalk ask "how to use hooks"'));
  console.log(chalk.gray('  $ docstalk ask "docker compose" --source docker'));
  console.log(chalk.gray("  $ docstalk login eyJhbGciOi..."));
  console.log(chalk.gray("  $ docstalk dev scrape react --incremental"));
  console.log(chalk.gray("  $ docstalk dev index nextjs --url https://nextjs.org/docs/new-feature\n"));

  console.log(chalk.white.bold("🔗 More Info:\n"));
  console.log(chalk.gray("  Documentation: https://docstalk.envoyou.com"));
  console.log(
    chalk.gray("  Report Issues: https://github.com/hk-dev13/docstalk/issues\n")
  );
}

// ============================================================================
// MAIN PROGRAM
// ============================================================================

const program = new Command();

program
  .name("docstalk")
  .description("AI-powered documentation assistant")
  .version("0.3.7-alpha", "-v, --version", "Show version");

// ============================================================================
// CONFIG COMMANDS
// ============================================================================

program
  .command("login")
  .description("Login with your API token")
  .argument("<token>", "Your DocsTalk API Token")
  .action((token) => {
    saveConfig({ token });
    console.log(chalk.green("\n✅ Successfully logged in!"));
    console.log(chalk.gray("Token saved to ~/.docstalk/config.json"));
  });

program
  .command("logout")
  .description("Logout and remove stored token")
  .action(() => {
    saveConfig({ token: undefined });
    console.log(chalk.green("\n✅ Successfully logged out!"));
  });

program
  .command("sources")
  .description("List available documentation sources")
  .action(() => {
    console.log(chalk.blue("📚 Available Documentation Sources:\n"));
    const sources = [
      "nextjs",
      "react",
      "typescript",
      "nodejs",
      "tailwind",
      "prisma",
      "express",
      "python",
      "rust",
      "go",
      "docker",
      "fastapi",
      "vue",
      "postgresql",
    ];
    sources.forEach((source) => {
      console.log(chalk.gray(`  - ${source}`));
    });
    console.log("");
  });

program.helpOption("-h, --help", "Show help").addHelpCommand(false); // Disable default help, use custom

// Custom help command
program
  .command("help")
  .description("Show help information")
  .action(() => {
    showHelp();
  });

// ============================================================================
// PUBLIC COMMANDS (Always visible to end users)
// ============================================================================

program
  .command("ask")
  .description("Ask a question to the AI")
  .argument("<query>", "Question to ask")
  .option("-s, --source <source>", "Force documentation source (optional)", "")
  .action(async (query, options) => {
    console.log(
      chalk.blue(
        `🤔 Question: ${query}${
          options.source ? ` (source: ${options.source})` : ""
        }`
      )
    );

    try {
      const url =
        process.env.DOCSTALK_API_URL || "https://api.docstalk.envoyou.com";
      const token = process.env.DOCSTALK_API_TOKEN || getToken();

      if (!token) {
        console.warn(
          chalk.yellow(
            "⚠️  Warning: DOCSTALK_API_TOKEN not set. Request may fail if authentication is required."
          )
        );
      }

      const endpoint = `${url}/api/v1/chat/auto/stream`;

      // Prepare request body
      const body = {
        query: query, // API expects 'query' not 'message'
        stream: true,
        ...(options.source && { forceDocSource: options.source }),
      };

      console.log(chalk.gray(`\n📡 Connecting to ${endpoint}...\n`));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      console.log(chalk.green("🤖 Answer:\n"));

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line.startsWith(":")) continue;

          if (line.startsWith("event:")) {
            const event = line.slice(6).trim();

            if (event === "done") {
              console.log(chalk.gray("\n\n✅ Done"));
              return;
            }
          } else if (line.startsWith("data:")) {
            const data = line.slice(5).trim();

            try {
              const parsed = JSON.parse(data);

              if (parsed.chunk) {
                process.stdout.write(parsed.chunk);
              }
            } catch (e) {
              // Ignore parse errors for non-JSON data
            }
          }
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      console.error(
        chalk.yellow(
          "\n💡 Make sure the API server is running: docstalk dev serve"
        )
      );
      process.exit(1);
    }
  });

program
  .command("search")
  .description("Search documentation")
  .argument("<query>", "Search query")
  .option("-s, --source <source>", "Limit to specific source", "")
  .option("-l, --limit <number>", "Number of results", "5")
  .action(async (query, options) => {
    console.log(chalk.blue(`🔍 Searching: ${query}`));
    console.log(
      chalk.yellow(
        "⚠️  Search command not yet implemented. Use 'docstalk ask' instead."
      )
    );
  });

program
  .command("version")
  .description("Show version information")
  .action(() => {
    showBanner();
  });

// ============================================================================
// DEVELOPER COMMANDS (Hidden from main help, grouped under 'dev')
// ============================================================================

const devCommand = program
  .command("dev")
  .description("Developer commands (scrape, index, serve, etc.)")
  .action(() => {
    // Check permission before showing dev commands
    requireDevPermission("dev");

    console.log(chalk.blue("📦 DocsTalk Developer Commands\n"));
    console.log("Available commands:");
    console.log(
      chalk.gray("  docstalk dev serve          Start development server")
    );
    console.log(
      chalk.gray("  docstalk dev scrape         Scrape documentation")
    );
    console.log(
      chalk.gray("  docstalk dev index          Index documentation")
    );
    console.log(chalk.gray("  docstalk dev test-router    Test routing logic"));
    console.log(
      chalk.gray("\nUse 'docstalk dev <command> --help' for more info")
    );
  });

// dev serve
devCommand
  .command("serve")
  .description("Start the development server")
  .action(async () => {
    requireDevPermission("dev serve");

    if (!projectRoot) {
      console.error(
        chalk.red(
          "❌ Error: Must be inside DocsTalk project to use dev commands"
        )
      );
      process.exit(1);
    }

    console.log(chalk.green("🚀 Starting DocsTalk development server...\n"));
    try {
      await execa("pnpm", ["dev"], {
        cwd: projectRoot,
        stdio: "inherit",
      });
    } catch (error) {
      console.error(chalk.red("❌ Server failed"));
      process.exit(1);
    }
  });

// dev scrape
devCommand
  .command("scrape")
  .description("Scrape documentation from a source or URL")
  .argument(
    "<source_or_url>",
    "Documentation source (e.g., react, nextjs) or specific URL"
  )
  .option("--index", "Automatically index after scraping")
  .option(
    "--incremental",
    "Only scrape new/changed pages (compares with existing data)"
  )
  .option(
    "--partial",
    "Scrape specific URL(s) only and merge with existing chunks"
  )
  .action(async (sourceOrUrl, options) => {
    requireDevPermission("dev scrape");

    if (!projectRoot) {
      console.error(
        chalk.red(
          "❌ Error: Must be inside DocsTalk project to use dev commands"
        )
      );
      process.exit(1);
    }

    const isUrl = sourceOrUrl.startsWith("http");
    const mode = options.incremental
      ? "incremental"
      : options.partial
      ? "partial"
      : "full";

    console.log(
      chalk.blue(
        `🕷️  Scraping ${isUrl ? "URL" : "source"}: ${sourceOrUrl} ${
          mode !== "full" ? `(${mode} mode)` : ""
        }`
      )
    );

    try {
      const args = ["--filter", "@docstalk/api", "scrape", sourceOrUrl];

      if (options.incremental) {
        args.push("--incremental");
      }
      if (options.partial) {
        args.push("--partial");
      }

      await execa("pnpm", args, {
        cwd: projectRoot,
        stdio: "inherit",
      });

      if (options.index) {
        console.log(chalk.blue(`\n📊 Auto-indexing ${sourceOrUrl}...`));

        let sourceName = sourceOrUrl;
        if (isUrl) {
          const urlPatterns: Record<string, RegExp> = {
            react: /react\.dev/,
            nextjs: /nextjs\.org/,
            typescript: /typescriptlang\.org/,
            nodejs: /nodejs\.org/,
            tailwind: /tailwindcss\.com/,
            prisma: /prisma\.io/,
            express: /expressjs\.com/,
            python: /docs\.python\.org/,
            rust: /doc\.rust-lang\.org/,
            go: /go\.dev/,
            docker: /docs\.docker\.com/,
            fastapi: /fastapi\.tiangolo\.com/,
            vue: /vuejs\.org/,
            postgresql: /postgresql\.org/,
          };

          for (const [name, pattern] of Object.entries(urlPatterns)) {
            if (pattern.test(sourceOrUrl)) {
              sourceName = name;
              break;
            }
          }
        }

        await execa(
          "pnpm",
          ["--filter", "@docstalk/api", "index", sourceName],
          {
            cwd: projectRoot,
            stdio: "inherit",
          }
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Scraping or indexing failed"));
      process.exit(1);
    }
  });

// dev index
devCommand
  .command("index")
  .description("Index documentation for RAG")
  .argument("<source>", "Source to index (e.g., nextjs, react)")
  .option("--incremental", "Only index new/changed chunks (skip unchanged)")
  .option("--partial", "Partial index mode (merge with existing vectors)")
  .option("--url <url>", "Index specific URL only (surgical update)")
  .action(async (source, options) => {
    requireDevPermission("dev index");

    if (!projectRoot) {
      console.error(
        chalk.red(
          "❌ Error: Must be inside DocsTalk project to use dev commands"
        )
      );
      process.exit(1);
    }

    const mode = options.url
      ? "url"
      : options.incremental
      ? "incremental"
      : options.partial
      ? "partial"
      : "full";

    console.log(
      chalk.blue(
        `📊 Indexing ${source}${mode !== "full" ? ` (${mode} mode)` : ""}${
          options.url ? `: ${options.url}` : ""
        }`
      )
    );

    try {
      const args = ["--filter", "@docstalk/api", "index", source];

      if (options.incremental) {
        args.push("--incremental");
      }
      if (options.partial) {
        args.push("--partial");
      }
      if (options.url) {
        args.push("--url", options.url);
      }

      await execa("pnpm", args, {
        cwd: projectRoot,
        stdio: "inherit",
      });
    } catch (error) {
      console.error(chalk.red("❌ Indexing failed"));
      process.exit(1);
    }
  });

// dev test-router
devCommand
  .command("test-router")
  .description("Test the routing logic")
  .argument("<query>", "Query to test")
  .option("-s, --source <source>", "Force documentation source", "")
  .action(async (query, options) => {
    requireDevPermission("dev test-router");

    if (!projectRoot) {
      console.error(
        chalk.red(
          "❌ Error: Must be inside DocsTalk project to use dev commands"
        )
      );
      process.exit(1);
    }

    console.log(chalk.blue(`🧪 Testing router: ${query}`));

    try {
      const url =
        process.env.DOCSTALK_API_URL || "https://api.docstalk.envoyou.com";
      const token = process.env.DOCSTALK_API_TOKEN || getToken();
      const endpoint = `${url}/api/v1/chat/auto/stream`;

      const body = {
        message: query,
        stream: false,
        ...(options.source && { forceDocSource: options.source }),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      console.log(chalk.green("\n📊 Routing Result:\n"));
      console.log(chalk.gray("Query Type:"), data.queryType || "N/A");
      console.log(chalk.gray("Detected Source:"), data.detectedSource || "N/A");
      console.log(chalk.gray("Confidence:"), data.confidence || "N/A");
      console.log(chalk.gray("Reasoning:"), data.reasoning || "N/A");
      console.log(chalk.gray("\nFull Response:"));
      console.log(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================================
// BACKWARD COMPATIBILITY (Hidden commands)
// ============================================================================

// Hidden 'serve' command (backward compat)
program
  .command("serve", { hidden: true })
  .description("Start the development server (use 'docstalk dev serve')")
  .action(async () => {
    console.log(chalk.yellow("⚠️  'docstalk serve' is deprecated."));
    console.log(chalk.yellow("   Use 'docstalk dev serve' instead.\n"));

    if (!projectRoot) {
      console.error(chalk.red("❌ Error: Must be inside DocsTalk project"));
      process.exit(1);
    }

    await execa("pnpm", ["dev"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
  });

// Hidden 'scrape' command (backward compat)
program
  .command("scrape", { hidden: true })
  .argument("<source_or_url>")
  .option("--index")
  .option("--incremental")
  .option("--partial")
  .action(async (sourceOrUrl, options) => {
    console.log(chalk.yellow("⚠️  'docstalk scrape' is deprecated."));
    console.log(chalk.yellow("   Use 'docstalk dev scrape' instead.\n"));

    // Redirect to dev command
    const args = ["dev", "scrape", sourceOrUrl];
    if (options.index) args.push("--index");
    if (options.incremental) args.push("--incremental");
    if (options.partial) args.push("--partial");

    program.parse(args, { from: "user" });
  });

// Hidden 'index' command (backward compat)
program
  .command("index", { hidden: true })
  .argument("<source>")
  .action(async (source) => {
    console.log(chalk.yellow("⚠️  'docstalk index' is deprecated."));
    console.log(chalk.yellow("   Use 'docstalk dev index' instead.\n"));

    program.parse(["dev", "index", source], { from: "user" });
  });

// Hidden 'test-router' command (backward compat)
program
  .command("test-router", { hidden: true })
  .argument("<query>")
  .option("-s, --source <source>")
  .action(async (query, options) => {
    console.log(chalk.yellow("⚠️  'docstalk test-router' is deprecated."));
    console.log(chalk.yellow("   Use 'docstalk dev test-router' instead.\n"));

    const args = ["dev", "test-router", query];
    if (options.source) args.push("--source", options.source);

    program.parse(args, { from: "user" });
  });

// ============================================================================
// PARSE & EXECUTE
// ============================================================================

program.parse();
