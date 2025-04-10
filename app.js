const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const path = require('path');

// Initialize SQLite database (file-based)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

// Create tables (if not exist)
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            position TEXT,
            base_salary REAL NOT NULL,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            date_joined TEXT NOT NULL,
            date_left TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            contract_salary REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL
        )
    `);
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
app.post('/api/employees', (req, res) => {
    const { name, position, base_salary, date_joined } = req.body;
    db.run(
        `INSERT INTO employees (name, position, base_salary, date_joined)
        VALUES (?, ?, ?, ?)`,
        [name, position, base_salary, date_joined],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.post('/api/contracts', (req, res) => {
    const { employee_id, contract_salary, start_date, end_date } = req.body;
    db.run(
        `INSERT INTO contracts (employee_id, contract_salary, start_date, end_date)
        VALUES (?, ?, ?, ?)`,
        [employee_id, contract_salary, start_date, end_date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/reports/annual', (req, res) => {
    const { start, end } = req.query;
    db.all(`
        SELECT 
            e.id,
            e.name,
            e.base_salary * 12 AS base_income,
            COALESCE(SUM(c.contract_salary), 0) AS contract_income
        FROM employees e
        LEFT JOIN contracts c 
            ON e.id = c.employee_id 
            AND c.start_date <= ? 
            AND c.end_date >= ?
        WHERE e.date_joined <= ?
        GROUP BY e.id
        ORDER BY (base_income + contract_income) DESC
    `, [end, start, end], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => ({
            name: row.name,
            total_income: row.base_income + row.contract_income
        })));
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));