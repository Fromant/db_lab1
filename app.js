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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/positions', (req, res) => {
    const doLoadAll = req.query.doLoadAll;
    if (doLoadAll==="true") {
        db.all('SELECT title, description, payrate, max_work_rate, estimated_work_rate FROM positions', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ rows });
        })
    } else {
        db.all('SELECT title, description, payrate, max_work_rate, estimated_work_rate FROM positions WHERE estimated_work_rate > 0', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ rows });
        })
    };
})

// Positions Endpoints
app.post('/api/positions', (req, res) => {
    const { title, description, payrate, max_work_rate } = req.body;
    db.run(
        'INSERT INTO positions (title, description, payrate, max_work_rate, estimated_work_rate) VALUES (?, ?, ?, ?, ?)',
        [title, description, payrate, max_work_rate, max_work_rate],
        function (err) {
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
        function (err) {
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
        function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Position Assignments
app.post('/api/position-assignments', (req, res) => {
    
});

app.post('/api/position-assignments', (req, res) => {
    const { employee_id, work_rate } = req.body;
    db.get(`
        SELECT SUM(work_rate) AS total 
        FROM position_schedule 
        WHERE employee_id = ? 
        AND (end_date IS NULL OR end_date > DATE('now'))
    `, [employee_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if ((row.total || 0) + work_rate > 1.5) {
            return res.status(400).json({ error: "Total work rate exceeds 1.5" });
        }
        const { employee_id, position_id, work_rate, start_date, end_date } = req.body;
        db.run(
            'INSERT INTO position_schedule (employee_id, position_id, work_rate, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [employee_id, position_id, work_rate, start_date, end_date || null],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID });
            }   
        );
    });
});

app.get('/api/vacancies', (req, res) => {
    db.all(`
        SELECT 
            p.title,
            p.max_work_rate - p.estimated_work_rate AS available_rate
        FROM positions p
        WHERE p.max_work_rate > p.estimated_work_rate
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Contract Assignments
app.post('/api/contract-assignments', (req, res) => {
    const { employee_id, contract_id, start_date, end_date } = req.body;
    db.run(
        'INSERT INTO contract_schedule (employee_id, contract_id, start_date, end_date) VALUES (?, ?, ?, ?)',
        [employee_id, contract_id, start_date, end_date || null],
        function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Search Endpoints
app.get('/api/search/employees', (req, res) => {
    const term = req.query.term;
    db.all(
        'SELECT id, full_name FROM employees WHERE fire_date IS NULL AND full_name LIKE ?',
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

app.get('/api/salary', (req, res) => {
    const { employeeId, year, month } = req.query;
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    db.get(`
        SELECT 
            COALESCE(SUM(p.payrate * ps.work_rate), 0) AS position_income,
            COALESCE(SUM(c.payrate / (JULIANDAY(c.end_date) - JULIANDAY(c.start_date) + 1) * 
                (JULIANDAY(MIN(cs.end_date, ?)) - JULIANDAY(MAX(cs.start_date, ?)) + 1), 0) 
                AS contract_income,
            COALESCE(SUM(bd.value), 0) AS bonus_total,
            (SELECT COUNT(*) FROM children 
             WHERE employee_id = ? 
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
        WHERE e.id = ?
    `, [endDate, startDate, employeeId, endDate, startDate, endDate, startDate, startDate, endDate, employeeId], 
    (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const total = row.position_income + row.contract_income + row.bonus_total;
        const taxRate = Math.max(13 - (row.child_count * 3), 0);
        const netIncome = total * (1 - taxRate / 100);
        if (netIncome <= 0) {
            const letter = `Уважаемый(ая) ${employeeName}, ваш заработок за ${month}-${year} составляет ${netIncome}.`;
            res.json({ message: letter});
        }
        else {
        res.json({
            gross: total,
            tax: total * taxRate / 100,
            net: netIncome,
            childDiscount: row.child_count * 3
            });
        }
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
        function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Contract terminated successfully' });
        }
    );
});

app.put('/api/fire_employee', (req, res) => {
    const { employee_id, fire_date } = req.body;
    db.run(
        'UPDATE employees SET fire_date = ? WHERE id = ?',
        [fire_date || new Date().toISOString().split('T')[0], employee_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Employee fired successfully' });
        }
    )
})

// Annual Report
app.get('/api/reports/annual', (req, res) => {
    const { year } = req.query;
    
    db.all(`
        WITH MonthlyData AS (
            SELECT 
                e.id,
                strftime('%Y-%m', date) AS month,
                SUM(
                    (p.payrate * ps.work_rate) +
                    (c.payrate / (JULIANDAY(c.end_date) - JULIANDAY(c.start_date) + 1)) *
                    (JULIANDAY(MIN(cs.end_date, date)) - JULIANDAY(MAX(cs.start_date, date)) + 1) +
                    bd.value
                ) AS total_income
            FROM employees e
            LEFT JOIN position_schedule ps ON e.id = ps.employee_id
            LEFT JOIN positions p ON ps.position_id = p.id
            LEFT JOIN contract_schedule cs ON e.id = cs.employee_id
            LEFT JOIN contracts c ON cs.contract_id = c.id
            LEFT JOIN bonuses b ON e.id = b.employee_id
            LEFT JOIN bonuses_dict bd ON b.bonus_dict_id = bd.id
            WHERE strftime('%Y', date) = ?
            GROUP BY e.id, month
        )
        SELECT
            e.id,
            e.full_name,
            SUM(md.total_income) AS gross_income,
            COUNT(DISTINCT c.id) AS child_count,
            SUM(md.total_income) * (1 - MAX(0, 13 - (COUNT(DISTINCT c.id)*3))/100) AS net_income
        FROM employees e
        LEFT JOIN MonthlyData md ON e.id = md.id
        LEFT JOIN children c ON e.id = c.employee_id
        GROUP BY e.id
        ORDER BY net_income DESC
    `, [year], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));