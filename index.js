const fastify = require("fastify")();
const multipart = require('@fastify/multipart');
const path = require("path");
const pointOfView = require("@fastify/view");
const ejs = require("ejs");
const fastifyStatic = require("@fastify/static");
const getRoutes = require("./routes/getRoutes");
const postRoutes = require("./routes/postRoutes");
const { pageNotFound } = require("./controllers/getController");

// Serve all static files from "public" folder
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/", // Now CSS, JS, images are all served directly
});

// Register EJS
fastify.register(pointOfView, {
  engine: { ejs },
  root: path.join(__dirname, "views"),
  layout: false,
});

fastify.register(multipart, { limits: { fileSize: 30 * 1024 * 1024 } });

// GET Routes
fastify.register(getRoutes);

fastify.register(postRoutes);

// 404 handler
fastify.setNotFoundHandler(pageNotFound);

// Start server
fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  console.log("Server running at http://0.0.0.0:3000");
});
