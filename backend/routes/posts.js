const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware d'authentification
function isAuthenticated(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalide' });
  }
}

// Récupérer toutes les stratégies pour un client
router.get('/clients/:clientId/strategies', isAuthenticated, async (req, res) => {
  try {
    const { clientId } = req.params;
    const [rows] = await db.query('SELECT id, titre FROM strategies WHERE client_id = ?', [clientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



// Récupérer les posts d'un client spécifique
router.get('/clients/:clientId/posts', isAuthenticated, async (req, res) => {
  try {
    const { clientId } = req.params;
    const [rows] = await db.query('SELECT * FROM Posts WHERE client_id = ?', [clientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un post par ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM Posts WHERE id = ? AND client_id = ?', [id, req.user.client_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau post
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { content, platform, scheduled_at, client_id, strategy_id } = req.body;
    if (!content || !platform || !scheduled_at) return res.status(400).json({ error: 'Le contenu, la plateforme et la date de planification sont requis.' });
    const [result] = await db.query('INSERT INTO Posts (content, platform, scheduled_at, user_id, client_id, strategy_id) VALUES (?, ?, ?, ?, ?, ?)', [content, platform, scheduled_at, req.user.id, client_id, strategy_id]);
    res.status(201).json({ id: result.insertId, content, platform, scheduled_at, user_id: req.user.id, client_id, strategy_id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un post existant
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { content, platform, scheduled_at, client_id, strategy_id } = req.body;
    if (!content || !platform || !scheduled_at) return res.status(400).json({ error: 'Le contenu, la plateforme et la date de planification sont requis.' });
    const [result] = await db.query('UPDATE Posts SET content = ?, platform = ?, scheduled_at = ?, client_id = ?, strategy_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, platform, scheduled_at, client_id, strategy_id, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post non trouvé' });
    res.json({ id: req.params.id, content, platform, scheduled_at, client_id, strategy_id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un post
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Posts WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;