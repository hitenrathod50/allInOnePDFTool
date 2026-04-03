// services/authService.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Otp = require("../models/Otp");

const jwt = require("jsonwebtoken");

async function isEmailExists(email) {
    return await User.findOne({ email });
};

async function createUser(email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        email,
        password: hashedPassword
    });

    await Otp.deleteMany({ email });

    // ✅ payload
    const payload = {
        id: user._id,
        email: user.email
    };

    // ✅ generate token using fastify
    const token = jwt.sign(payload, process.env.JWT_SECRET)



    return { user, token };
};

async function loginUser(email, password, reply) {

    try {


        // 1. Find user by email
        const user = await User.findOne({ email });

        // 2. If user not found
        if (!user) {
            return reply.send({
                success: false,
                message: "Invalid Credentials"
            });
        }


        console.log(user);

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return reply.send({
                success: false,
                message: "Invalid Credentials"
            });
        }

        const token = jwt.sign({
            id: user._id,
            email: user.email
        }, process.env.JWT_SECRET)

        reply.setCookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/"
        });

        return reply.send({ success: true, user });

    } catch (err) {
        return reply.status(500).send({
            success: false,
            message: "Server Error"
        });
    }



}

async function changeUserPassword(req, reply) {
    try {
        const { password } = req.body;

        // Validation
        if (!password || password.length < 6) {
            return reply.status(400).send({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user
        const response = await User.findByIdAndUpdate(
            req.user._id,
            { password: hashedPassword },
            { new: true } // returns updated document
        );

        if (!response) {
            return reply.status(404).send({
                success: false,
                message: "User not found"
            });
        }

        return reply.send({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Password update error:", error);

        return reply.status(500).send({
            success: false,
            message: "Internal server error"
        });
    }
}




module.exports = { isEmailExists, createUser, loginUser, changeUserPassword }