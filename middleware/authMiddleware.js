const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    const acceptHeader = String(req.headers.accept || '');
    const requestedWith = String(req.headers['x-requested-with'] || '');
    const expectsJson = req.xhr || requestedWith.toLowerCase() === 'xmlhttprequest' || acceptHeader.includes('application/json');
    const expectsEventStream = acceptHeader.includes('text/event-stream');

    if (expectsEventStream) {
      return res.status(401).end();
    }

    if (expectsJson) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

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
