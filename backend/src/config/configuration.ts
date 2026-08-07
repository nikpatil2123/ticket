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
    useGroq: process.env.USE_GROQ_API !== 'false',
  },
});
