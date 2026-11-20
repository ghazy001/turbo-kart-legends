/** Only explicitly configured origins are trusted; forwarded request headers never configure pairing. */
export function publicOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('TKL_PUBLIC_ORIGIN must be an HTTPS origin, for example https://your-game.up.railway.app');
  }
  return url.origin;
}

export function productionConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = env.PORT === undefined ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const origin = env.TKL_PUBLIC_ORIGIN !== undefined ? publicOrigin(env.TKL_PUBLIC_ORIGIN)
    : env.RAILWAY_PUBLIC_DOMAIN ? publicOrigin(`https://${env.RAILWAY_PUBLIC_DOMAIN}`) : undefined;
  return { port, origin };
}
