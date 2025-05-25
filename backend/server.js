const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
const path = require('path');

const db = require('./db'); // Connexion DB
const authRoutes = require('./routes/auth'); // <-- Importation de la route auth
const adminRoutes = require('./routes/admin');
const clientsRouter = require('./routes/clients');
const postsRoutes = require('./routes/posts');
const strategiesRoutes = require('./routes/strategies');

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir les fichiers statiques depuis le dossier uploads
app.use('/uploads/admin', express.static(path.join(__dirname, 'uploads/admin')));

// Servir les fichiers statiques depuis le dossier public du frontend
app.use('/public', express.static(path.join(__dirname, '../frontend/public')));

// Route d'authentification
app.use('/api/auth', authRoutes); // <-- Ajout de la route
app.use('/api/admin', adminRoutes);
app.use('/api/clients', clientsRouter);
app.use('/api/user', require('./routes/user'));
app.use('/api/posts', postsRoutes);
app.use('/api/strategies', strategiesRoutes);

// Route de test
app.get('/api', (req, res) => {
  res.json({ message: "API fonctionne bien 🚀" });
});

app.listen(PORT, () => {
  console.log(`Serveur Node démarré sur http://localhost:${PORT}`);
});
