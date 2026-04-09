export interface EnvConfig {
  sourcePublicPath: string;
  rootFolder: string;
  proxyApiUrl: string;
  env: string;
}

export interface CustomConfig {
  system: string;
  Local: EnvConfig;
  Debug: EnvConfig;
  QAS: EnvConfig;
  Release: EnvConfig;
}

const customConfig: CustomConfig = {
  system: JSON.stringify('Yeet'),
  Local: {
    sourcePublicPath: '/',
    rootFolder: '""',
    proxyApiUrl: JSON.stringify(`//localhost:8080`),   // relative — Vite proxies /chat and /agent → Go on :8080
    env: JSON.stringify('Local'),
  },
  Debug: {
    sourcePublicPath: '/',
    rootFolder: '""',
    proxyApiUrl: JSON.stringify(`//localhost:8080`),   // relative — Vite proxies /chat and /agent → Go on :8080
    env: JSON.stringify('Debug'),
  },
  QAS: {
    sourcePublicPath: '/',
    rootFolder: '""',
    proxyApiUrl: JSON.stringify(`//localhost:8080`),
    env: JSON.stringify('QAS'),
  },
  Release: {
    sourcePublicPath: '/',
    rootFolder: '""',
    proxyApiUrl: JSON.stringify(`//localhost:8080`),   // relative — Go serves both static and API on the same port
    env: JSON.stringify('Release'),
  },
};

export default customConfig;
