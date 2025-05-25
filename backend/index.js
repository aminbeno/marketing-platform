const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
