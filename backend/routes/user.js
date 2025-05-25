const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Middleware d'authentification utilisateur
function isUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(403).json({ error: 'Token manquant' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    if (decoded.role !== 'user') return res.status(403).json({ error: 'Accès refusé' });
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalide' });
  }
}

// Configurer multer pour l'upload d'image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/user');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'user_' + Date.now() + path.extname(file.originalname));
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

// Récupérer le profil utilisateur
router.get('/profile', isUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT username, email, image_url FROM Users WHERE id = ? AND role = ?', [userId, 'user']);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier le profil utilisateur
router.put('/profile', isUser, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: "Le nom d'utilisateur et l'email sont requis." });
    }
    
    let image_url;
    if (req.file) {
      image_url = '/uploads/user/' + req.file.filename;
    }
    
    // Mettre à jour les champs
    const fields = [username, email];
    let query = 'UPDATE Users SET username = ?, email = ?';
    if (image_url) {
      query += ', image_url = ?';
      fields.push(image_url);
    }
    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = ?';
    fields.push(userId, 'user');
    
    const [updateResult] = await db.query(query, fields);
    if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    // Récupérer les nouvelles infos
    const [rows] = await db.query('SELECT username, email, image_url FROM Users WHERE id = ? AND role = ?', [userId, 'user']);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil', details: err.message });
  }
});

module.exports = router;