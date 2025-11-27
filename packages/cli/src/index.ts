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
  .option(
    "-s, --source <source>",
    "Documentation source (e.g., nextjs)",
    "nextjs"
  )
  .action(async (query, options) => {
    console.log(
      chalk.blue(`🤔 Asking: "${query}" (Source: ${options.source})...`)
    );

    try {
      const response = await fetch("http://localhost:3001/api/v1/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          docSource: options.source,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        answer: string;
        references: any[];
      };

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

program.parse();
