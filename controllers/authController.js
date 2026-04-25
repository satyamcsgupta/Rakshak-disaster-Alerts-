const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { states } = require('./alertController');
const { languageNames } = require('../config/languages');

const buildRegisterViewModel = (formData = {}, error = null) => ({
  pageTitle: 'Register',
  states,
  languages: languageNames,
  error,
  formData
});

exports.showRegister = (req, res) => {
  res.render('auth/register', buildRegisterViewModel());
};

exports.register = async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    confirmPassword,
    state,
    city,
    language,
    role,
    emergencyContactName,
    emergencyContactPhone
  } = req.body;

  const finalRole = ['user', 'volunteer'].includes(role) ? role : 'user';

  if (password !== confirmPassword) {
    return res.render('auth/register', buildRegisterViewModel(req.body, 'Password and confirm password must match.'));
  }

  if (password.length < 6) {
    return res.render('auth/register', buildRegisterViewModel(req.body, 'Password must be at least 6 characters.'));
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.render('auth/register', buildRegisterViewModel(req.body, 'Email is already registered.'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      state,
      city,
      language,
      role: finalRole,
      emergencyContactName,
      emergencyContactPhone
    });

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      state: user.state,
      city: user.city,
      language: user.language,
      role: user.role
    };

    res.redirect(user.role === 'admin'
      ? '/admin'
      : `/alerts?state=${encodeURIComponent(user.state)}&language=${encodeURIComponent(user.language)}`);
  } catch (error) {
    res.render('auth/register', buildRegisterViewModel(req.body, 'Registration failed. Please check all fields and try again.'));
  }
};

exports.showLogin = (req, res) => {
  res.render('auth/login', {
    pageTitle: 'Login',
    error: null,
    email: ''
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.render('auth/login', {
      pageTitle: 'Login',
      error: 'Invalid email or password.',
      email
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.render('auth/login', {
      pageTitle: 'Login',
      error: 'Invalid email or password.',
      email
    });
  }

  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    state: user.state,
    city: user.city,
    language: user.language,
    role: user.role
  };

  res.redirect(user.role === 'admin'
    ? '/admin'
    : `/alerts?state=${encodeURIComponent(user.state)}&language=${encodeURIComponent(user.language)}`);
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

exports.showProfile = async (req, res) => {
  const user = await User.findById(req.session.user.id);

  res.render('auth/profile', {
    pageTitle: 'My Profile',
    states,
    languages: languageNames,
    error: null,
    success: null,
    formData: user
  });
};

exports.updateProfile = async (req, res) => {
  const {
    name,
    email,
    phone,
    state,
    city,
    language,
    emergencyContactName,
    emergencyContactPhone
  } = req.body;

  try {
    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.session.user.id }
    });

    if (existingUser) {
      return res.render('auth/profile', {
        pageTitle: 'My Profile',
        states,
        languages: languageNames,
        error: 'That email is already used by another account.',
        success: null,
        formData: req.body
      });
    }

    const user = await User.findByIdAndUpdate(
      req.session.user.id,
      {
        name,
        email,
        phone,
        state,
        city,
        language,
        emergencyContactName,
        emergencyContactPhone
      },
      { new: true, runValidators: true }
    );

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      state: user.state,
      city: user.city,
      language: user.language,
      role: user.role
    };

    res.render('auth/profile', {
      pageTitle: 'My Profile',
      states,
      languages: languageNames,
      error: null,
      success: 'Profile updated successfully.',
      formData: user
    });
  } catch (error) {
    res.render('auth/profile', {
      pageTitle: 'My Profile',
      states,
      languages: languageNames,
      error: 'Could not update profile. Please check your details.',
      success: null,
      formData: req.body
    });
  }
};
