const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // ← Connexion avec Promises

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ message: 'Utilisateur non trouvé' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash); // ou user.password selon ton DB
    if (!validPassword) return res.status(401).json({ message: 'Mot de passe invalide' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '1h' });
    res.json({ token, role: user.role });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Vérifier si l'email ou le username existe déjà
    const [emailExists] = await pool.query('SELECT id FROM Users WHERE email = ?', [email]);
    if (emailExists.length > 0) return res.status(409).json({ message: 'Email déjà utilisé' });
    
    const [usernameExists] = await pool.query('SELECT id FROM Users WHERE username = ?', [username]);
    if (usernameExists.length > 0) return res.status(409).json({ message: 'Nom d\'utilisateur déjà utilisé' });
    
    // Hacher le mot de passe
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Créer l'utilisateur
    await pool.query(
      'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password_hash]
    );
    
    res.status(201).json({ success: true, message: 'Utilisateur créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
