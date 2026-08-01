import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppConfig } from '../types';

function getProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = getProjectRoot();
const PROJECT_CONFIG_DIR = path.join(PROJECT_ROOT, '.md2wechat');
const PROJECT_CONFIG_FILE = path.join(PROJECT_CONFIG_DIR, 'config.json');

const HOME_CONFIG_DIR = path.join(os.homedir(), '.md2wechat');
const HOME_CONFIG_FILE = path.join(HOME_CONFIG_DIR, 'config.json');

const CONFIG_FILE = PROJECT_CONFIG_FILE;

const defaultConfig: AppConfig = {
  wechat: {
    appId: '',
    appSecret: '',
  },
  notion: {
    token: '',
    dataSourceId: '3934032f-33bf-80c7-8af2-000bb2a27120',
    databaseId: '3934032f-33bf-808b-8e6b-e292e19803b8',
  },
  theme: 'default',
  outputDir: './output',
};

function migrateOldConfig(): void {
  try {
    if (fs.existsSync(HOME_CONFIG_FILE) && !fs.existsSync(PROJECT_CONFIG_FILE)) {
      if (!fs.existsSync(PROJECT_CONFIG_DIR)) {
        fs.mkdirSync(PROJECT_CONFIG_DIR, { recursive: true });
      }
      const content = fs.readFileSync(HOME_CONFIG_FILE, 'utf-8');
      fs.writeFileSync(PROJECT_CONFIG_FILE, content, 'utf-8');
    }
  } catch (_) {
  }
}

migrateOldConfig();

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(PROJECT_CONFIG_FILE)) {
      const content = fs.readFileSync(PROJECT_CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(content);
      return { ...defaultConfig, ...saved };
    }
    if (fs.existsSync(HOME_CONFIG_FILE)) {
      const content = fs.readFileSync(HOME_CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(content);
      return { ...defaultConfig, ...saved };
    }
    return { ...defaultConfig };
  } catch (err) {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  if (!fs.existsSync(PROJECT_CONFIG_DIR)) {
    fs.mkdirSync(PROJECT_CONFIG_DIR, { recursive: true });
  }
  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(PROJECT_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function initConfig(): AppConfig {
  if (fs.existsSync(PROJECT_CONFIG_FILE)) {
    return loadConfig();
  }
  return saveConfig(defaultConfig);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
