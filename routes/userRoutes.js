// routes/user.js
async function userRoutes(fastify, options) {

  // 🔐 Protect all routes in this file
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user) {
      return reply.redirect('/login');
    }
  });

  fastify.get('/dashboard', async (request, reply) => {
    return reply.view("pages/dashboard.ejs");
  });

  fastify.get('/downloads', async (request, reply) => {
    return { message: 'Your downloads' };
  });

}

module.exports = userRoutes;