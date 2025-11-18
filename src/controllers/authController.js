const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre zorunludur' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Bu email zaten kayıtlı' });
    }

    const user = await User.create({ email, password, name });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        credits: user.credits
      }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Geçersiz bilgiler' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        credits: user.credits
      }
    });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        credits: req.user.credits
      }
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
