const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // If MongoDB is connected, validate that userId is a proper ObjectId
    // (Demo-mode sessions have numeric string IDs like "1766774496866")
    if (global.IS_DEMO_MODE !== true && mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({
          error: 'Invalid session',
          message: 'Your session was created in demo mode. Please log out and register/login again.',
          code: 'DEMO_SESSION_INVALID'
        });
      }
    }

    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
