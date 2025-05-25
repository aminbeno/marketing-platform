const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware d'authentification (copié de posts.js)
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


// Supprimer une stratégie spécifique à un client
router.delete('/clients/:clientId/strategies/:id', isAuthenticated, async (req, res) => {
  const { clientId, id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM strategies WHERE id=? AND client_id=?', [id, clientId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Stratégie non trouvée ou vous n'avez pas les droits pour la supprimer" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur lors de la suppression" });
  }
});



// Obtenir toutes les stratégies d'un client
router.get('/clients/:clientId/strategies', async (req, res) => {
  const { clientId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM strategies WHERE client_id = ? ORDER BY id DESC', [clientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Ajouter une stratégie à un client
router.post('/clients/:clientId/strategies', isAuthenticated, async (req, res) => {
  const { clientId } = req.params;
  const { titre, description, statut } = req.body;
  try {
    await db.query('INSERT INTO strategies (client_id, titre, description, statut) VALUES (?, ?, ?, ?)', [clientId, titre, description, statut || 'en attente']);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l'ajout" });
  }
});

// Modifier une stratégie
router.put('/clients/:clientId/strategies/:id', isAuthenticated, async (req, res) => {
  const { clientId, id } = req.params;
  const { titre, description, statut } = req.body;
  try {
    const [result] = await db.query('UPDATE strategies SET titre=?, description=?, statut=? WHERE id=? AND client_id=?', [titre, description, statut, id, clientId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Stratégie non trouvée ou vous n'avez pas les droits pour la modifier" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la modification" });
  }
});



// Voir une stratégie
router.get('/strategies/:id',  isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM strategies WHERE id=? AND client_id=?', [id, req.user.client_id]);
    if (rows.length === 0) return res.status(404).json({ message: "Stratégie non trouvée" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// Routes pour les actions stratégiques (imbriquées sous les stratégies)

// Récupérer toutes les actions pour une stratégie donnée
router.get('/:strategyId/actions', isAuthenticated, async (req, res) => {
  try {
    const { strategyId } = req.params;
    const [rows] = await db.query('SELECT * FROM actions_strategiques WHERE strategy_id = ? ORDER BY id DESC', [strategyId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer une action spécifique par ID
router.get('/:strategyId/actions/:actionId', isAuthenticated, async (req, res) => {
  try {
    const { strategyId, actionId } = req.params;
    const [rows] = await db.query('SELECT * FROM actions_strategiques WHERE strategy_id = ? AND id = ?', [strategyId, actionId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Action stratégique non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle action pour une stratégie
router.post('/:strategyId/actions', isAuthenticated, async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { type_action, frequence, canal, budget_estime, note, est_faite } = req.body;
    if (!type_action || !frequence || !canal) return res.status(400).json({ error: 'Le type d\'action, la fréquence et le canal sont requis.' });
    const [result] = await db.query('INSERT INTO actions_strategiques (strategy_id, type_action, frequence, canal, budget_estime, note, est_faite) VALUES (?, ?, ?, ?, ?, ?, ?)', [strategyId, type_action, frequence, canal, budget_estime, note, est_faite === 'oui' ? 'oui' : 'non']);
    res.status(201).json({ id: result.insertId, strategy_id: strategyId, type_action, frequence, canal, budget_estime, note, est_faite: est_faite === 'oui' ? 'oui' : 'non' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une action existante
router.put('/:strategyId/actions/:actionId', isAuthenticated, async (req, res) => {
  try {
    const { strategyId, actionId } = req.params;
    const { type_action, frequence, canal, budget_estime, note, est_faite } = req.body;
    if (!type_action || !frequence || !canal) return res.status(400).json({ error: 'Le type d\'action, la fréquence et le canal sont requis.' });
    const [result] = await db.query('UPDATE actions_strategiques SET type_action = ?, frequence = ?, canal = ?, budget_estime = ?, note = ?, est_faite = ? WHERE strategy_id = ? AND id = ?', [type_action, frequence, canal, budget_estime, note, est_faite === 'oui' ? 'oui' : 'non', strategyId, actionId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Action stratégique non trouvée' });
    res.json({ id: actionId, strategy_id: strategyId, type_action, frequence, canal, budget_estime, note, est_faite: est_faite === 'oui' ? 'oui' : 'non' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une action
router.delete('/:strategyId/actions/:actionId', isAuthenticated, async (req, res) => {
  try {
    const { strategyId, actionId } = req.params;
    const [result] = await db.query('DELETE FROM actions_strategiques WHERE strategy_id = ? AND id = ?', [strategyId, actionId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Action stratégique non trouvée' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;