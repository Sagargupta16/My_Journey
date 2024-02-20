const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.postSignup = async (req, res) => {
	try {
		const user = req.body;
		if (!user.name || !user.email || !user.password) return res.status(400).json({ errors: ['Name, Email and Password required'] });

		const existingUser = await User.findOne({ email: user.email.toString() });
		if (existingUser)
			return res.status(400).json({
				errors: ['User with the same email already exists']
			});

		if (user.password.length < 6 || !/[a-z]/.test(user.password) || !/[A-Z]/.test(user.password) || !/\d/.test(user.password)) {
			return res.status(401).json({
				errors: ['Password must be atleast 6 characters long and contain atleast one uppercase, one lowercase and one numeric character.']
			});
		}

		const hashedPassword = await bcrypt.hash(user.password, Number(process.env.JWT_SALT_ROUNDS));
		user.password = hashedPassword;

		await new User(user).save();
		logger.info(`New user created: ${user.email}`);

		res.status(201).json({
			messages: ['User created successfully']
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({ errors: ['Internal server error'] });
	}
};

exports.getLogin = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) return res.status(400).json({ status: false, errors: ['Email and Password required'] });

		const user = await User.findOne({ email: email.toString() });
		if (!user) return res.status(401).json({ status: false, errors: ['User Not Found'] });

		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) return res.status(401).json({ status: false, errors: ['Incorrect Password'] });

		const token = jwt.sign(
			{
				id: user._id,
				name: user.name,
				email: user.email
			},
			process.env.JWT_SECRET,
			{ expiresIn: '7d' }
		);
		logger.info(`User logged in: ${email}`);
		res.json({ status: true, data: { token }, messages: ['Login Successful'] });
	} catch (error) {
		logger.error(error);
		res.status(500).json({ status: false, errors: ['Internal server error'] });
	}
};

// postVerifyEmail with OTP
exports.postVerifyEmail = async (req, res) => {
	try {
		console.log(req.body);
		const { email } = req.body;

		// Generate a secure OTP
		const otp = crypto.randomInt(100000, 999999);

		// Rest of the code remains unchanged
		if (!email) return res.status(400).json({ status: false, errors: ['Email required'] });

		const user = await User.findOne({ email: email.toString() });
		if (!user) return res.status(401).json({ status: false, errors: ['User Not Found'] });

		const existingOtp = await Otp.findOne({ email: email.toString() });
		if (existingOtp) await Otp.findByIdAndDelete(existingOtp._id);

		await new Otp({ email, otp }).save();

		logger.info(`OTP generated for ${email}: ${otp}`);

		// Create a nodemailer transporter
		let transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.EMAIL_ID,
				pass: process.env.EMAIL_PASSWORD
			},
			secure: true
		});

		// Define email options
		let mailOptions = {
			from: 'My Journey',
			to: email,
			subject: 'OTP for Verification',
			text: `Your OTP is: ${otp} use it to verify your account within 10 minutes.`
		};

		// Send email
		let info = await transporter.sendMail(mailOptions);
		console.log('Message sent: %s', info.messageId);

		res.status(200).json({
			status: true,
			messages: [`OTP sent to ${email}`]
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({ status: false, errors: ['Internal server error'] });
	}
};

// postVerifyOTP
exports.postVerifyOTP = async (req, res) => {
	try {
		const { email, otp } = req.body;

		if (!email || !otp) return res.status(400).json({ status: false, errors: ['Email and OTP required'] });

		const user = await User.findOne({ email: email.toString() });
		if (!user) return res.status(401).json({ status: false, errors: ['User Not Found'] });

		const existingOtp = await Otp.findOne({ email: email.toString() });
		if (!existingOtp) return res.status(401).json({ status: false, errors: ['OTP not generated'] });
		if (existingOtp.otp !== otp) return res.status(401).json({ status: false, errors: ['Incorrect OTP'] });

		// Check OTP expiry
		const otpExpiry = new Date(existingOtp.createdAt).getTime() + 600000;
		const currentTime = new Date().getTime();
		if (currentTime > otpExpiry) return res.status(401).json({ status: false, errors: ['OTP expired'] });

		logger.info(`User verified: ${email}`);

		res.status(200).json({
			status: true,
			messages: ['Email verified successfully']
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({ status: false, errors: ['Internal server error'] });
	}
};

// postResetPassword
exports.postResetPassword = async (req, res) => {
	try {
		const { email, otp, newPassword } = req.body;
		if (!email || !newPassword) return res.status(400).json({ status: false, errors: ['Email and Password required'] });

		const user = await User.findOne({ email: email.toString() });
		if (!user) return res.status(401).json({ status: false, errors: ['User Not Found'] });

		const existing = await Otp.findOne({ email: email.toString() });
		if (!existing) return res.status(401).json({ status: false, errors: ['OTP not generated'] });

		if (existing.otp !== otp) return res.status(401).json({ status: false, errors: ['Incorrect OTP'] });

		if (newPassword.length < 6 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword))
			return res.status(401).json({
				status: false,
				errors: ['Password must be atleast 6 characters long and contain atleast one uppercase, one lowercase and one numeric character.']
			});

		// Check OTP expiry
		const otpExpiry = new Date(existing.createdAt).getTime() + 600000;
		const currentTime = new Date().getTime();
		if (currentTime > otpExpiry) return res.status(401).json({ status: false, errors: ['OTP expired'] });

		const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.JWT_SALT_ROUNDS));
		user.password = hashedPassword;
		await user.save();

		await Otp.findByIdAndDelete(existing._id);

		logger.info(`Password reset for ${email}`);

		res.status(200).json({
			status: true,
			messages: ['Password reset successfully']
		});
	} catch (error) {
		console.log(error);
		logger.error(error);
		res.status(500).json({ status: false, errors: ['Internal server error'] });
	}
};
