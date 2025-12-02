#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import chalk from "chalk";
import fs from "fs";
import path from "path";

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
// MAIN PROGRAM
// ============================================================================

const program = new Command();

program
  .name("docstalk")
  .description("AI-powered documentation assistant")
  .version("0.3.0-alpha");

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
      const url = process.env.DOCSTALK_API_URL || "http://localhost:3001";
      const endpoint = `${url}/api/v1/chat/auto/stream`;

      // Prepare request body
      const body = {
        message: query,
        stream: true,
        ...(options.source && { forceDocSource: options.source }),
      };

      console.log(chalk.gray(`\n📡 Connecting to ${endpoint}...\n`));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    console.log(chalk.blue("DocsTalk CLI"));
    console.log(`Version: ${chalk.green("0.3.0-alpha")}`);
    console.log(`Mode: ${isDev ? chalk.yellow("Development") : chalk.green("Production")}`);
  });

// ============================================================================
// DEVELOPER COMMANDS (Hidden from main help, grouped under 'dev')
// ============================================================================

const devCommand = program
  .command("dev")
  .description("Developer commands (scrape, index, serve, etc.)")
  .action(() => {
    console.log(chalk.blue("📦 DocsTalk Developer Commands\n"));
    console.log("Available commands:");
    console.log(chalk.gray("  docstalk dev serve          Start development server"));
    console.log(chalk.gray("  docstalk dev scrape         Scrape documentation"));
    console.log(chalk.gray("  docstalk dev index          Index documentation"));
    console.log(chalk.gray("  docstalk dev test-router    Test routing logic"));
    console.log(chalk.gray("\nUse 'docstalk dev <command> --help' for more info"));
  });

// dev serve
devCommand
  .command("serve")
  .description("Start the development server")
  .action(async () => {
    if (!projectRoot) {
      console.error(
        chalk.red("❌ Error: Must be inside DocsTalk project to use dev commands")
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
  .option("--partial", "Scrape specific URL(s) only and merge with existing chunks")
  .action(async (sourceOrUrl, options) => {
    if (!projectRoot) {
      console.error(
        chalk.red("❌ Error: Must be inside DocsTalk project to use dev commands")
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

        await execa("pnpm", ["--filter", "@docstalk/api", "index", sourceName], {
          cwd: projectRoot,
          stdio: "inherit",
        });
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
  .action(async (source) => {
    if (!projectRoot) {
      console.error(
        chalk.red("❌ Error: Must be inside DocsTalk project to use dev commands")
      );
      process.exit(1);
    }

    console.log(chalk.blue(`📊 Indexing ${source}...`));
    try {
      await execa("pnpm", ["--filter", "@docstalk/api", "index", source], {
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
    if (!projectRoot) {
      console.error(
        chalk.red("❌ Error: Must be inside DocsTalk project to use dev commands")
      );
      process.exit(1);
    }

    console.log(chalk.blue(`🧪 Testing router: ${query}`));

    try {
      const url = process.env.DOCSTALK_API_URL || "http://localhost:3001";
      const endpoint = `${url}/api/v1/chat/auto/stream`;

      const body = {
        message: query,
        stream: false,
        ...(options.source && { forceDocSource: options.source }),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error(
        chalk.red("❌ Error: Must be inside DocsTalk project")
      );
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
