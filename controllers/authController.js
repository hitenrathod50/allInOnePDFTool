// controllers/authController.js
const otpService = require("../services/otpService");
const authService = require("../services/authService");
const emailService = require("../services/emailService");

// Step 1: Send OTP
async function sendOtp(req, reply) {
    const { email } = req.body;

    const exists = await authService.isEmailExists(email);
    if (exists) {
        return reply.send({ success: false, message: "Email already exists" });
    }

    const otp = otpService.generateOtp();

    await otpService.saveOtp(email, otp);
    await emailService.sendOtpEmail(email, otp);

    return reply.send({ success: true, message: "OTP sent" });
};


// Step 2: Verify OTP + Register
async function verifyOtpAndRegister(req, reply) {
    const { email, password, otp } = req.body;

    const validOtp = await otpService.verifyOtp(email, otp);

    if (!validOtp) {
        return reply.send({ success: false, message: "Invalid or expired OTP" });
    }

    const { user, token } = await authService.createUser(email, password);

    reply.setCookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        path: "/"
    });

    // for production user secure : true attribute please

    return reply.send({ success: true, user });
};

async function loginUser(req, reply) {

    const { email, password } = req.body;

    await authService.loginUser(email, password, reply);

}

async function logOutUser(req, reply) {

    const token = req.cookies.token;

    console.log("User want to logout and token is " + token);

    if (!token) {
        req.user = null;
        reply.locals.user = null;
        return;
    }

    reply.clearCookie("token", {
        path: "/"
    });

}

module.exports = { sendOtp, verifyOtpAndRegister, logOutUser, loginUser }