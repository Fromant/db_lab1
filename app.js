const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const path = require('path');
const db = new sqlite3.Database('./database.db');

// Initialize Database
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');
    
    const schema = `
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        hire_date DATE NOT NULL,
        fire_date DATE
    );

    CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        second_parent_id INTEGER,
        child_name TEXT NOT NULL,
        birth_date DATE NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (second_parent_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS bonuses_dict (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value REAL NOT NULL,
        description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bonuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bonus_dict_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        FOREIGN KEY (bonus_dict_id) REFERENCES bonuses_dict(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        description TEXT,
        payrate REAL NOT NULL,
        estimated_work_rate REAL DEFAULT 0,
        max_work_rate REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS position_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        position_id INTEGER NOT NULL,
        work_rate REAL NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (position_id) REFERENCES positions(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        payrate REAL NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contract_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        contract_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
    );
    `;

    db.exec(schema);
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Employees Endpoints
app.post('/api/employees', (req, res) => {
    const { full_name, hire_date, fire_date } = req.body;
    db.run(
        'INSERT INTO employees (full_name, hire_date, fire_date) VALUES (?, ?, ?)',
        [full_name, hire_date, fire_date || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Positions Endpoints
app.post('/api/positions', (req, res) => {
    const { title, description, payrate, max_work_rate } = req.body;
    db.run(
        'INSERT INTO positions (title, description, payrate, max_work_rate) VALUES (?, ?, ?, ?)',
        [title, description, payrate, max_work_rate],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Contracts Endpoints
app.post('/api/contracts', (req, res) => {
    const { description, payrate, start_date, end_date } = req.body;
    db.run(
        'INSERT INTO contracts (description, payrate, start_date, end_date) VALUES (?, ?, ?, ?)',
        [description, payrate, start_date, end_date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Children Endpoints
app.post('/api/children', (req, res) => {
    const { employee_id, second_parent_id, child_name, birth_date } = req.body;
    db.run(
        'INSERT INTO children (employee_id, second_parent_id, child_name, birth_date) VALUES (?, ?, ?, ?)',
        [employee_id, second_parent_id || null, child_name, birth_date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Bonus Types Endpoints
app.post('/api/bonus-types', (req, res) => {
    const { value, description } = req.body;
    db.run(
        'INSERT INTO bonuses_dict (value, description) VALUES (?, ?)',
        [value, description],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Position Assignments
app.post('/api/position-assignments', (req, res) => {
    const { employee_id, position_id, work_rate, start_date, end_date } = req.body;
    db.run(
        'INSERT INTO position_schedule (employee_id, position_id, work_rate, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [employee_id, position_id, work_rate, start_date, end_date || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Contract Assignments
app.post('/api/contract-assignments', (req, res) => {
    const { employee_id, contract_id, start_date, end_date } = req.body;
    db.run(
        'INSERT INTO contract_schedule (employee_id, contract_id, start_date, end_date) VALUES (?, ?, ?, ?)',
        [employee_id, contract_id, start_date, end_date || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Bonus Assignments
app.post('/api/bonuses', (req, res) => {
    const { bonus_dict_id, employee_id, date } = req.body;
    db.run(
        'INSERT INTO bonuses (bonus_dict_id, employee_id, date) VALUES (?, ?, ?)',
        [bonus_dict_id, employee_id, date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Search Endpoints
app.get('/api/search/employees', (req, res) => {
    const term = req.query.term;
    db.all(
        'SELECT id, full_name FROM employees WHERE full_name LIKE ?',
        [`%${term}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get('/api/search/positions', (req, res) => {
    db.all('SELECT id, title FROM positions', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/search/contracts', (req, res) => {
    db.all('SELECT id, description FROM contracts', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/search/bonuses', (req, res) => {
    db.all('SELECT id, description FROM bonuses_dict', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update active position assignments endpoint
app.get('/api/position-assignments/active', (req, res) => {
    const { employeeId } = req.query;
    let query = `
        SELECT ps.*, e.full_name, p.title 
        FROM position_schedule ps
        JOIN employees e ON ps.employee_id = e.id
        JOIN positions p ON ps.position_id = p.id
        WHERE (ps.end_date IS NULL OR ps.end_date > DATE('now'))
    `;
    
    const params = [];
    if (employeeId) {
        query += ' AND ps.employee_id = ?';
        params.push(employeeId);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Terminate position assignment
app.put('/api/position-assignments/:id/terminate', (req, res) => {
    const { end_date } = req.body;
    db.run(
        'UPDATE position_schedule SET end_date = ? WHERE id = ?',
        [end_date || new Date().toISOString().split('T')[0], req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Position terminated successfully' });
        }
    );
});

// Similarly update contract assignments endpoint
app.get('/api/contract-assignments/active', (req, res) => {
    const { employeeId } = req.query;
    let query = `
        SELECT cs.*, e.full_name, c.description 
        FROM contract_schedule cs
        JOIN employees e ON cs.employee_id = e.id
        JOIN contracts c ON cs.contract_id = c.id
        WHERE (cs.end_date IS NULL OR cs.end_date > DATE('now'))
    `;
    
    const params = [];
    if (employeeId) {
        query += ' AND cs.employee_id = ?';
        params.push(employeeId);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Terminate contract assignment
app.put('/api/contract-assignments/:id/terminate', (req, res) => {
    const { end_date } = req.body;
    db.run(
        'UPDATE contract_schedule SET end_date = ? WHERE id = ?',
        [end_date || new Date().toISOString().split('T')[0], req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Contract terminated successfully' });
        }
    );
});

// Annual Report
app.get('/api/reports/annual', (req, res) => {
    const { start, end } = req.query;
    db.all(`
        SELECT 
            e.id,
            e.full_name,
            COALESCE(SUM(p.payrate * ps.work_rate), 0) AS position_income,
            COALESCE(SUM(c.payrate), 0) AS contract_income,
            COALESCE(SUM(bd.value), 0) AS bonus_total,
            (SELECT COUNT(*) FROM children 
             WHERE employee_id = e.id 
             AND birth_date >= date('now', '-18 years')) AS child_count
        FROM employees e
        LEFT JOIN position_schedule ps ON e.id = ps.employee_id
            AND ps.start_date <= ? AND (ps.end_date >= ? OR ps.end_date IS NULL)
        LEFT JOIN positions p ON ps.position_id = p.id
        LEFT JOIN contract_schedule cs ON e.id = cs.employee_id
            AND cs.start_date <= ? AND (cs.end_date >= ? OR cs.end_date IS NULL)
        LEFT JOIN contracts c ON cs.contract_id = c.id
        LEFT JOIN bonuses b ON e.id = b.employee_id
            AND b.date BETWEEN ? AND ?
        LEFT JOIN bonuses_dict bd ON b.bonus_dict_id = bd.id
        GROUP BY e.id
        ORDER BY (position_income + contract_income + bonus_total) DESC
    `, [end, start, end, start, start, end], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const report = rows.map(row => ({
            ...row,
            total_income: row.position_income + row.contract_income + row.bonus_total,
            tax_rate: Math.max(13 - (row.child_count * 3), 0),
            tax_amount: (row.position_income + row.contract_income + row.bonus_total) 
                      * Math.max(13 - (row.child_count * 3), 0) / 100,
            net_income: (row.position_income + row.contract_income + row.bonus_total) 
                      * (1 - Math.max(13 - (row.child_count * 3), 0) / 100)
        }));
        
        res.json(report);
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));