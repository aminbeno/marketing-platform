const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Middleware d'authentification admin (à adapter selon votre logique)
function isAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(403).json({ error: 'Token manquant' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalide' });
  }
}

// Configurer multer pour l'upload d'image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/admin');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'admin_' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Récupérer le profil admin
router.get('/profile', isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const [rows] = await db.query('SELECT username, email, image_url FROM Users WHERE id = ? AND role = ?', [adminId, 'admin']);
    if (rows.length === 0) return res.status(404).json({ error: 'Admin non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier le profil admin
router.put('/profile', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: "Le nom d'utilisateur et l'email sont requis." });
    }
    let image_url;
    console.log('Requête reçue pour mise à jour admin:', { adminId, username, email, file: req.file });
    if (req.file) {
      if (!req.file.filename) {
        return res.status(400).json({ error: "Nom de fichier manquant" });
      }
      image_url = '/uploads/admin/' + req.file.filename;
      console.log('Image uploadée, chemin complet:', image_url);
    }
    // Mettre à jour les champs
    const fields = [username, email];
    let query = 'UPDATE Users SET username = ?, email = ?';
    if (image_url) {
      query += ', image_url = ?';
      fields.push(image_url);
    }
    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = ?';
    fields.push(adminId, 'admin');
    console.log('Requête SQL:', query);
    console.log('Champs SQL:', fields);
    const [updateResult] = await db.query(query, fields);
    console.log('Résultat update:', updateResult);
    if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Admin non trouvé' });
    // Récupérer les nouvelles infos
    const [rows] = await db.query('SELECT username, email, image_url FROM Users WHERE id = ? AND role = ?', [adminId, 'admin']);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du profil admin:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil', details: err.message });
  }
});

// Récupérer la liste des utilisateurs
router.get('/users', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, email, role FROM Users');
    res.json(rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel utilisateur (admin seulement)
router.post('/users', isAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  
  try {
    // Vérifier si l'email ou le username existe déjà
    const [emailExists] = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
    if (emailExists.length > 0) return res.status(409).json({ error: 'Email déjà utilisé' });
    
    const [usernameExists] = await db.query('SELECT id FROM Users WHERE username = ?', [username]);
    if (usernameExists.length > 0) return res.status(409).json({ error: 'Nom d\'utilisateur déjà utilisé' });
    
    // Hacher le mot de passe
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Créer l'utilisateur
    await db.query(
      'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, role]
    );
    
    res.status(201).json({ success: true, message: 'Utilisateur créé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la création d\'utilisateur:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const [result] = await db.query('DELETE FROM Users WHERE id = ?', [userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// Statistiques des utilisateurs
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as total FROM Users');
    const [recent] = await db.query('SELECT id, username, role FROM Users ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      total: total[0].total,
      recent: recent
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des statistiques utilisateurs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;