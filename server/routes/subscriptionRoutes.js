import { Router } from 'express';
import pool from '../db.js';

const router = Router();


// Abonelik paketleri endpoint'leri
router.get("/subscription-packages", async (req, res) => {
    try {
      let page = parseInt(req.query.page, 10);
      let limit = parseInt(req.query.limit, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 30;
      if (limit > 500) limit = 500;
      const offset = (page - 1) * limit;
      const search = req.query.search || "";
  
      const searchCondition = search
        ? "WHERE package_name LIKE ? OR package_description LIKE ?"
        : "";
  
      const query = `
        SELECT 
          id,
          package_name,
          package_description,
          package_price,
          premium_price,
          status,
          created_at,
          updated_at,
          package_date,
          package_api_rights
        FROM packages
        ${searchCondition}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `;
  
      const countQuery = `
        SELECT COUNT(*) as total FROM packages
        ${searchCondition}
      `;
  
      const values = [parseInt(limit), parseInt(offset)];
      if (search) {
        values.unshift(`%${search}%`, `%${search}%`);
      }
      
      const countParams = search ? [`%${search}%`, `%${search}%`] : [];

      const [packages] = await pool.execute(query, values);
      const [countResult] = await pool.execute(countQuery, countParams);
  
      res.json({
        packages: packages,
        total: parseInt(countResult[0].total),
        page,
        limit,
      });
    } catch (error) {
      console.error("Error fetching subscription packages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});
  
router.post("/subscription-packages", async (req, res) => {
    try {
      const {
        package_name,
        package_description,
        package_price,
        premium_price,
        package_date,
        package_api_rights,
        status
      } = req.body;
  
      const query = `
        INSERT INTO packages (
          package_name,
          package_description,
          package_price,
          premium_price,
          package_date,
          package_api_rights,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
  
      const values = [
        package_name,
        package_description,
        package_price,
        premium_price,
        package_date,
        package_api_rights,
        status || 1
      ];
  
      const [result] = await pool.execute(query, values);
      res.status(201).json({ 
        id: result.insertId,
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      console.error("Error creating subscription package:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});
  
router.delete("/subscription-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const query = "DELETE FROM packages WHERE id = ?";
      const [result] = await pool.execute(query, [id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Package not found" });
      }
  
      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription package:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});
  
// Paket güncelleme endpoint'i
router.put("/subscription-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        package_name,
        package_description,
        package_price,
        premium_price,
        package_date,
        package_api_rights,
        status
      } = req.body;
  
      // Önce paketin var olup olmadığını kontrol et
      const [checkResult] = await pool.execute(
        "SELECT id FROM packages WHERE id = ?",
        [id]
      );
  
      if (checkResult.length === 0) {
        return res.status(404).json({ error: "Package not found" });
      }
  
      const query = `
        UPDATE packages SET
          package_name = ?,
          package_description = ?,
          package_price = ?,
          premium_price = ?,
          package_date = ?,
          package_api_rights = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
  
      const values = [
        package_name,
        package_description,
        package_price,
        premium_price,
        package_date,
        package_api_rights,
        status || 1,
        id
      ];
  
      const [result] = await pool.execute(query, values);
  
      if (result.affectedRows === 0) {
        return res.status(500).json({ error: "Failed to update package" });
      }
  
      // Güncellenmiş paketi getir
      const [updatedPackage] = await pool.execute(
        "SELECT * FROM packages WHERE id = ?",
        [id]
      );
  
      res.json(updatedPackage[0]);
    } catch (error) {
      console.error("Error updating subscription package:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/subscription-packages/:id
router.get("/subscription-packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT id, package_name, package_description, package_price, premium_price, status, created_at, updated_at, package_date, package_api_rights FROM packages WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching subscription package by id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
  
export default router; 