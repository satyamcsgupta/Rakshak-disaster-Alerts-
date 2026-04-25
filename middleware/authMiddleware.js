const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  next();
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/alerts');
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.redirect('/alerts');
  }

  next();
};

const requireVolunteer = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  if (req.session.user.role !== 'volunteer' && req.session.user.role !== 'admin') {
    return res.redirect('/alerts');
  }

  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  requireAdmin,
  requireVolunteer
};
