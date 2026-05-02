const fastify = require("fastify")();
const multipart = require('@fastify/multipart');
const path = require("path");
const pointOfView = require("@fastify/view");
const ejs = require("ejs");
const fastifyStatic = require("@fastify/static");
const getRoutes = require("./routes/getRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const { pageNotFound } = require("./controllers/getController");
const { connectDB } = require("./controllers/dbConnection");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const rateLimit = require("@fastify/rate-limit");

require('dotenv').config();

const PORT = process.env.PORT || 3000;


const oauthPlugin = require('@fastify/oauth2');
const generateSitemap = require("./controllers/generateSiteMap");

connectDB();

fastify.addHook("onSend", async (request, reply, payload) => {
  reply.header("X-Frame-Options", "DENY");
  reply.header("Content-Security-Policy", "frame-ancestors 'none';");
  return payload;
});

// Serve all static files from "public" folder
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/", // Now CSS, JS, images are all served directly
});


fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 429) {
    return reply
      .code(429)
      .type('text/html')
      .send('Please wait a moment and try again.')
  }

  reply.send(error)
})





async function rateLimitxHelmetImpose() {

  // await fastify.register(require('@fastify/helmet'));

  // await fastify.register(rateLimit, {
  //   max: 20,
  //   timeWindow: '1 minute',
  //   keyGenerator: (req) => req.ip,
  // })


  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,

    skip: (req) => {
      const ua = req.headers['user-agent'] || '';

      return (
        ua.includes('Googlebot') ||   // Google
        ua.includes('Bingbot') ||     // Bing
        ua.includes('Slurp') ||       // Yahoo
        ua.includes('DuckDuckBot')    // DuckDuckGo
      );
    }
  });

};
rateLimitxHelmetImpose();

// Register EJS
fastify.register(pointOfView, {
  engine: { ejs },
  root: path.join(__dirname, "views"),
  layout: false,
});

fastify.register(multipart, { limits: { fileSize: 30 * 1024 * 1024 } });

fastify.register(require('@fastify/cookie'));

fastify.register(oauthPlugin, {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.OAUTH_CLIENT_ID,
      secret: process.env.OAUTH_CLIENT_SECRET
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/auth/google',
  callbackUri: 'http://localhost:3000/auth/google/callback'
});

fastify.addHook('preHandler', async (request, reply) => {

  // console.clear();

  // console.log("preHandler is working");

  const token = request.cookies.token;

  if (!token) {
    request.user = null;
    reply.locals.user = null;
    return;
  }

  // console.log("token is " + token)

  try {
    // 1. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // console.log("decoded:", decoded);

    // 2. Find user in DB
    const user = await User.findById(decoded.id);

    // console.log("Index hai ");
    // console.log(user);

    // console.log("user is " + user);

    if (!user) {
      request.user = null;
      reply.locals.user = null;
      return;
    }

    // 3. Attach full user object
    request.user = user;

    // optional (for frontend templating)
    if (user.name) {
      reply.locals.user = user.name;
    } else {
      reply.locals.user = user.email;
    }

  } catch (err) {
    console.log("JWT error:", err.message);

    request.user = null;
    reply.locals.user = null;
  }
});

generateSitemap();

// GET Routes
fastify.register(getRoutes);

fastify.register(userRoutes, { prefix: '/user' });

fastify.register(postRoutes);

// 404 handler
fastify.setNotFoundHandler(pageNotFound);

// Start server
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
