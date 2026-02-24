// demoAuth.js - DEMO ONLY - Remove before production

const demoCredentials = [
  { username: 'demo', password: 'demo123', name: 'Demo Faculty', email: 'demo@carthage.edu' },
  { username: 'faculty1', password: 'pass123', name: 'Dr. Smith', email: 'smith@carthage.edu' },
];

function setupDemoAuth(app) {
  // Demo login page
  app.get('/login', (req, res) => {
    res.render('demoLogin', { error: req.query.error });
  });

  // Demo login handler
  app.post('/demo-login', (req, res) => {
    const { username, password } = req.body;
    
    const user = demoCredentials.find(u => u.username === username && u.password === password);
    
    if (user) {
      req.session.demoUser = { name: user.name, email: user.email };
      return res.redirect('/faculty');
    }
    
    res.redirect('/login?error=invalid');
  });

  // Demo logout
  app.get('/logout', (req, res) => {
    req.session.demoUser = null;
    res.redirect('/login');
  });
}

function demoAuthMiddleware(req, res, next) {
  if (req.session.demoUser) {
    req.user = req.session.demoUser;
    return next();
  }
  res.redirect('/login');
}

module.exports = { setupDemoAuth, demoAuthMiddleware };