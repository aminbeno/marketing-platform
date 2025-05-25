const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtenir tous les clients
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Ajouter un client
router.post('/', async (req, res) => {
  const { nom, secteur_activite, objectif, budget, public_cible } = req.body;
  try {
    await pool.query(
      'INSERT INTO clients (nom, secteur_activite, objectif, budget, public_cible) VALUES (?, ?, ?, ?, ?)',
      [nom, secteur_activite, objectif, budget, public_cible]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l'ajout" });
  }
});

// Statistiques des clients
router.get('/stats', async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as total FROM clients');
    res.json({ total: total[0].total });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Statistiques globales des clients
router.get('/global-stats', async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as total FROM clients');
    res.json({ total: total[0].total });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Secteurs d'activité des clients
router.get('/sectors', async (req, res) => {
  try {
    const [sectors] = await pool.query(
      'SELECT secteur_activite as name, COUNT(*) as count FROM clients GROUP BY secteur_activite'
    );
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Modifier un client
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, secteur_activite, objectif, budget, public_cible } = req.body;
  try {
    await pool.query(
      'UPDATE clients SET nom=?, secteur_activite=?, objectif=?, budget=?, public_cible=? WHERE id=?',
      [nom, secteur_activite, objectif, budget, public_cible, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la modification" });
  }
});

// Supprimer un client
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clients WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

// Voir un client (optionnel)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id=?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Client non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;