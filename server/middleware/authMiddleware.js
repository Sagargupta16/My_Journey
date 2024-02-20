const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const authenticateUser = async (req, res, next) => {
	try {
		const token = req.headers['authorization']?.split(' ')[1];

		if (!token) throw new Error('Invalid or missing Authorization header');
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (decoded.exp * 1000 < Date.now()) throw new Error('Token has expired');

		let user;
		try {
			user = await User.findOne({ _id: decoded.id });
		} catch (error) {
			console.error('User lookup error:', error.message);
			throw new Error('Error looking up user');
		}

		if (!user) throw new Error('User not found');

		req.token = token;
		req.user = user;
		logger.info(`User ${user.email} authenticated`);
		next();
	} catch (error) {
		logger.error(error.message);
		if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
			res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
		} else {
			res.status(401).json({ message: 'Unauthorized' });
		}
	}
};

module.exports = { authenticateUser };
