import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".docstalk");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
}

export function getConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export function saveConfig(config: Config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

export function getToken(): string | undefined {
  // Env var takes precedence
  if (process.env.DOCSTALK_API_TOKEN) {
    return process.env.DOCSTALK_API_TOKEN;
  }
  const config = getConfig();
  return config.token;
}
