#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import chalk from "chalk";
import fs from "fs";
import path from "path";

const program = new Command();

program.name("docstalk").description("CLI for DocsTalk").version("0.1.0");

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

if (!projectRoot) {
  console.error(
    chalk.red(
      "❌ Error: Could not find pnpm-workspace.yaml. Are you inside the DocsTalk project?"
    )
  );
  process.exit(1);
}

program
  .command("scrape")
  .description("Scrape documentation from a URL")
  .argument("<url>", "URL to scrape")
  .action(async (url) => {
    console.log(chalk.blue(`🕷️  Scraping ${url}...`));
    try {
      await execa("pnpm", ["--filter", "@docstalk/api", "scrape", url], {
        cwd: projectRoot,
        stdio: "inherit",
      });
    } catch (error) {
      console.error(chalk.red("❌ Scraping failed"));
      process.exit(1);
    }
  });

program
  .command("index")
  .description("Index documentation for RAG")
  .argument("<source>", "Source to index (e.g., nextjs, react)")
  .action(async (source) => {
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

program
  .command("serve")
  .description("Start the development server")
  .action(async () => {
    console.log(chalk.green("🚀 Starting DocsTalk..."));
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

program
  .command("ask")
  .description("Ask a question to the AI")
  .argument("<query>", "Question to ask")
  .option("-s, --source <source>", "Force documentation source (optional)", "")
  .action(async (query, options) => {
    console.log(
      chalk.blue(
        `🤔 Asking: "${query}" ${
          options.source ? `(Force Source: ${options.source})` : "(Auto-detect)"
        }...`
      )
    );

    try {
      const response = await fetch("http://127.0.0.1:3001/api/v1/chat/auto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          forceDocSource: options.source || undefined,
          userId: "cli_user",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as any;

      // Handle Clarification
      if (data.needsClarification) {
        console.log("\n" + chalk.yellow("❓ Clarification Needed:"));
        console.log(data.clarification.message);
        console.log(chalk.gray("\nOptions:"));
        data.clarification.options.forEach((opt: any) => {
          console.log(`- ${chalk.bold(opt.label)}: ${opt.description}`);
        });
        console.log(chalk.gray("\nTip: Use --source <id> to specify context."));
        return;
      }

      // Handle Routing Info
      if (data.routing) {
        console.log(
          chalk.gray(
            `\n[Router] Type: ${data.routing.queryType}, Source: ${data.routing.detectedSource} (${data.routing.confidence}%)`
          )
        );
        if (data.routing.reasoning) {
          console.log(
            chalk.gray(`[Router] Reasoning: ${data.routing.reasoning}`)
          );
        }
      }

      console.log("\n" + chalk.green("🤖 Answer:"));
      console.log(data.answer);

      if (data.references && data.references.length > 0) {
        console.log("\n" + chalk.yellow("📚 References:"));
        data.references.forEach((ref: any, i: number) => {
          console.log(
            `${i + 1}. ${chalk.cyan(ref.title)} - ${chalk.gray(ref.url)}`
          );
        });
      }
      console.log(""); // Newline
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Failed to get answer. Is the server running? (docstalk serve)"
        )
      );
      if (error instanceof Error) {
        console.error(chalk.gray(error.message));
      }
      process.exit(1);
    }
  });

program
  .command("test-router")
  .description("Test AI Router auto-detect functionality")
  .option("-v, --verbose", "Show full responses", false)
  .action(async (options) => {
    console.log(chalk.green("🧪 Testing AI Router System\n"));
    console.log(chalk.gray("=".repeat(50)));

    const API_URL = "http://127.0.0.1:3001";
    const testCases = [
      {
        name: "React Query (useState)",
        query: "How to use useState hook?",
        expectedSource: "react",
      },
      {
        name: "Next.js Query (App Router)",
        query: "What is App Router in Next.js?",
        expectedSource: "nextjs",
      },
      {
        name: "TypeScript Query (interfaces)",
        query: "How do I define interfaces in TypeScript?",
        expectedSource: "typescript",
      },
      {
        name: "Meta Query (platform info)",
        query: "What documentation sources do you support?",
        expectedSource: "meta",
      },
      {
        name: "Multi-Source Query",
        query: "Explain components",
        expectedSource: "specific", // Now specific with additionalSources
      },
      {
        name: "General Query",
        query: "Cara masak nasi goreng",
        expectedSource: "general",
      },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
      try {
        console.log(
          `\n${chalk.blue("➤")} ${chalk.bold(test.name)}: ${chalk.gray(
            `"${test.query}"`
          )}`
        );

        const response = await fetch(`${API_URL}/api/v1/chat/auto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: test.query,
            userId: "test_cli_user",
            userEmail: "test@cli.com",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check routing
        if (data.routing) {
          const detected =
            data.routing.detectedSource || data.routing.queryType;
          const confidence = data.routing.confidence || 100;

          // Loose matching for test success
          const isMatch =
            detected === test.expectedSource ||
            data.routing.queryType === test.expectedSource ||
            (test.expectedSource === "specific" &&
              data.routing.queryType === "specific");

          if (isMatch) {
            console.log(
              chalk.green(
                `  ✓ Correctly detected: ${detected} (confidence: ${confidence}%)`
              )
            );
            passed++;
          } else {
            console.log(
              chalk.red(
                `  ✗ Expected ${test.expectedSource}, got ${detected} (Type: ${data.routing.queryType})`
              )
            );
            failed++;
          }

          if (options.verbose && data.answer) {
            console.log(
              chalk.gray(`  Answer: ${data.answer.substring(0, 100)}...`)
            );
          }
        } else if (data.needsClarification) {
          console.log(chalk.yellow(`  ? Clarification requested`));
          if (test.expectedSource === "ambiguous") {
            passed++;
          } else {
            failed++;
          }
        } else {
          console.log(chalk.yellow(`  ? Unknown response format`));
          failed++;
        }
      } catch (error) {
        console.log(
          chalk.red(
            `  ✗ Test failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
        failed++;
      }
    }

    // Summary
    console.log(chalk.gray("\n" + "=".repeat(50)));
    console.log(
      `\n${chalk.bold("Summary:")} ${chalk.green(`${passed} passed`)}, ${
        failed > 0
          ? chalk.red(`${failed} failed`)
          : chalk.gray(`${failed} failed`)
      }`
    );

    if (failed === 0) {
      console.log(chalk.green("\n✅ All tests passed!\n"));
    } else {
      console.log(
        chalk.red("\n❌ Some tests failed. Check the server logs.\n")
      );
      process.exit(1);
    }
  });

program.parse();
