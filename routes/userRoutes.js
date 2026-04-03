// routes/user.js
async function userRoutes(fastify, options) {

  // 🔐 Protect all routes in this file
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user) {
      return reply.redirect('/login');
    }
  });

  fastify.get('/dashboard', async (request, reply) => {

    const formatted = request.user.createdOn.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const user = {
      email: request.user.email || "email",
      name: request.user.name || request.user.email || "username",
      creationDate: formatted || "creation date ",
      subscription: request.user.subscription || "none",
      pdfData: request.user.pdfData || [],
    };

    return reply.view("pages/dashboard.ejs", user);
  });

  fastify.get('/downloads', async (request, reply) => {
    return { message: 'Your downloads' };
  });

}

module.exports = userRoutes;