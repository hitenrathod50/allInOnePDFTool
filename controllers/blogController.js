const blogs = require("../data/blogs");

const BLOGS_PER_PAGE = 5;

async function singleBlog(request, reply) {

    const blog = blogs.find(
        blog => blog.slug === request.params.slug
    );

    if (!blog) {
        return reply.code(404).view("404");
    }

    return reply.view(`pages/blog/${blog.slug}`);

};

async function blogList(request, reply) {

    const BLOGS_PER_PAGE = 5;

    const page = Number(request.query.page) || 1;

    const start = (page - 1) * BLOGS_PER_PAGE;

    const pageBlogs = blogs.slice(
        start,
        start + BLOGS_PER_PAGE
    );

    const totalPages = Math.ceil(
        blogs.length / BLOGS_PER_PAGE
    );

    return reply.view("pages/blog/index.ejs", {
        blogs: pageBlogs,
        currentPage: page,
        totalPages
    });

};

module.exports = { singleBlog, blogList }