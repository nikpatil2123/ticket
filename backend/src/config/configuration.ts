export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    uri: process.env.MONGO_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    apiKeys: [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2].filter(Boolean),
    useGroq: process.env.USE_GROQ_API !== 'false',
  },
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  }
});
