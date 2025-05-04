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
    if (doLoadAll === "true") {
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
    // Извлекаем все необходимые поля из тела запроса
    const { employee_id, position_id, work_rate, start_date, end_date } = req.body;

    // Проверяем наличие обязательных полей
    if (!employee_id || !position_id || work_rate === undefined || !start_date) {
        return res.status(400).json({
            error: "Отсутствуют обязательные поля: employee_id, position_id, work_rate, start_date"
        });
    }

    // Проверяем, что work_rate - число
    if (typeof work_rate !== 'number') {
        return res.status(400).json({ error: "work_rate должен быть числом" });
    }

    // Проверяем вакантый work_rate
    db.get('SELECT estimated_work_rate FROM positions WHERE id = ?', [position_id], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке нагрузки:', err.message);
            return res.status(500).json({ error: "Внутренняя ошибка сервера" });
        }

        const estimated_work_rate = (row?.estimated_work_rate || 0)
        if (work_rate > estimated_work_rate) {
            return res.status(400).json({ error: `Назначаемая рабочая ставка превышает оставшееся количество рабочих ставок. Осталось: ${estimated_work_rate}` })
        }

        // Проверяем текущую нагрузку сотрудника
        db.get(
            `SELECT SUM(work_rate) AS total 
             FROM position_schedule 
             WHERE employee_id = ? 
             AND (end_date IS NULL OR end_date > DATE('now'))`,
            [employee_id],
            (err, row) => {
                if (err) {
                    console.error('Ошибка при проверке нагрузки:', err.message);
                    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
                }

                const totalWorkRate = (row?.total || 0) + work_rate;
                if (totalWorkRate > 1.5) {
                    return res.status(400).json({ error: "Общая нагрузка превышает 1.5" });
                }

                // Создаем новое назначение
                db.run(
                    `INSERT INTO position_schedule 
                 (employee_id, position_id, work_rate, start_date, end_date) 
                 VALUES (?, ?, ?, ?, ?)`,
                    [employee_id, position_id, work_rate, start_date, end_date || null],
                    function (err) {
                        if (err) {
                            console.error('Ошибка при создании назначения:', err.message);
                            return res.status(500).json({ error: "Внутренняя ошибка сервера" });
                        }
                        const id = this.lastID
                        //Обновляем остаток work_rate
                        db.run('UPDATE positions SET estimated_work_rate = ? WHERE id = ?', [estimated_work_rate - work_rate, position_id], (err) => {
                            if (err) {
                                console.error('Ошибка при создании назначения:', err.message);
                                return res.status(500).json({ error: "Внутренняя ошибка сервера" });
                            }
                            res.status(201).json({ id: id });
                        })
                    }
                );


            }
        );

    })
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

app.post('/api/contract-assignments', (req, res) => {
    const { employee_id, contract_id, start_date, end_date } = req.body;

    // Проверка данных
    if (!employee_id || !contract_id || !start_date) {
        return res.status(400).json({ error: "Не указаны обязательные поля" });
    }

    db.run(
        'INSERT INTO contract_schedule (employee_id, contract_id, start_date, end_date) VALUES (?, ?, ?, ?)',
        [employee_id, contract_id, start_date, end_date || null],
        function (err) {
            if (err) {
                console.error('Ошибка SQL:', err.message);
                return res.status(500).json({ error: "Ошибка базы данных" });
            }
            res.json({ id: this.lastID });
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

    // Validate input
    if (!year || !/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: "Invalid year format. Use YYYY." });
    }

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const sql = `
        SELECT 
            e.id,
            e.full_name,
            COALESCE(
                SUM(
                    p.payrate * ps.work_rate * 
                    (
                        (JULIANDAY(IFNULL(ps.end_date, ?)) - 
                        JULIANDAY(IFNULL(ps.start_date, ?)) + 1) 
                        / 30
                    )
                ), 0
            ) AS position_income,
            COALESCE(
                SUM(
                    c.payrate * 
                    (
                        (JULIANDAY(IFNULL(cs.end_date, ?)) - 
                        JULIANDAY(IFNULL(cs.start_date, ?)) + 1) 
                        / 30
                    )
                ), 0
            ) AS contract_income,
            COALESCE(SUM(bd.value), 0) AS bonus_total,
            (
                SELECT COUNT(*) 
                FROM children c 
                WHERE 
                    c.employee_id = e.id AND 
                    c.birth_date > DATE(?, '-18 years')  
            ) AS child_count
        FROM employees e
        LEFT JOIN (
            SELECT * 
            FROM position_schedule 
            WHERE 
                start_date <= ? AND 
                (end_date >= ? OR end_date IS NULL)
        ) ps ON e.id = ps.employee_id
        LEFT JOIN positions p ON ps.position_id = p.id
        LEFT JOIN (
            SELECT * 
            FROM contract_schedule 
            WHERE 
                start_date <= ? AND 
                (end_date >= ? OR end_date IS NULL)
        ) cs ON e.id = cs.employee_id
        LEFT JOIN contracts c ON cs.contract_id = c.id
        LEFT JOIN bonuses b ON 
            e.id = b.employee_id AND 
            b.date BETWEEN ? AND ?
        LEFT JOIN bonuses_dict bd ON b.bonus_dict_id = bd.id
        WHERE 
            (e.fire_date IS NULL OR e.fire_date >= ?)
        GROUP BY e.id
    `;

    const params = [
        // Для IFNULL(ps.end_date) и IFNULL(ps.start_date)
        yearEnd, yearStart,

        // Для IFNULL(cs.end_date) и IFNULL(cs.start_date)
        yearEnd, yearStart,

        yearEnd,

        // Условия для position_schedule (start_date <= ? AND end_date >= ?)
        yearEnd, yearStart,

        // Условия для contract_schedule (start_date <= ? AND end_date >= ?)
        yearEnd, yearStart,

        // Бонусы (BETWEEN ? AND ?)
        yearStart, yearEnd,

        // Условие для fire_date
        yearStart
    ];


    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('SQL Error:', err.message);
            return res.status(500).json({ error: "Database error", details: err.message });
        }

        const report = rows.map(row => {
            const total = row.position_income + row.contract_income + row.bonus_total;
            const taxRate = Math.max(13 - (row.child_count * 3), 0);
            const taxAmount = (total * taxRate) / 100;
            const netIncome = total - taxAmount;

            return {
                employee_name: row.full_name,
                gross_income: total,
                tax_amount: taxAmount,
                net_income: netIncome
            };
        });
        res.json(report);
    });
});

app.get('/api/payslip', async (req, res) => {
    try {
        const { employeeId, start, end } = req.query;

        // Валидация входных параметров
        if (!employeeId) throw new Error('Employee ID, start and end dates are required');

        // Установка периодов по умолчанию
        const startDate = start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end || new Date().toISOString().split('T')[0];

        // Получение данных
        const [employeeData, taxPeriods] = await Promise.all([
            getEmployeeDetails(employeeId, startDate, endDate),
            getTaxPeriods(employeeId, startDate, endDate)
        ]);

        // Расчет детализации периодов
        const periodDetails = calculatePeriodDetails(employeeData, taxPeriods, startDate, endDate);

        // Формирование результата
        const totalGross = [
            ...employeeData.positions.map(p => parseFloat(p.amount.toFixed(2))),
            ...employeeData.contracts.map(c => parseFloat(c.amount.toFixed(2))),
            ...employeeData.bonuses.map(b => parseFloat(b.amount.toFixed(2)))
        ].reduce((sum, val) => sum + val, 0);
        const response = {
            full_name: employeeData.full_name,
            positions: employeeData.positions,
            contracts: employeeData.contracts,
            bonuses: employeeData.bonuses,
            tax_calculation: periodDetails,
            totals: {
                gross: totalGross, // Исправлено - учитываем все компоненты
                tax: periodDetails.taxTotal,
                net: totalGross - periodDetails.taxTotal
            }
        };


        res.json(response);

    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

function calculatePeriodDetails(employeeData, taxPeriods, overallStart, overallEnd) {
    const results = {
        periods: [],
        total: 0,
        taxTotal: 0,
        netTotal: 0,
        taxRateChanges: []
    };

    // const cutoffDate = new Date(overallEnd);
    // cutoffDate.setFullYear(cutoffDate.getFullYear() - 18);

    // // Учитываем детей, родившихся ПОСЛЕ (конец периода - 18 лет)
    // const childCount = employeeData.children
    //     .filter(c => new Date(c.birth_date) > cutoffDate)
    //     .length;

    // Добавляем граничные периоды если нужно
    const fullPeriods = fillMissingPeriods(taxPeriods, overallStart, overallEnd);

    fullPeriods.forEach(period => {
        // Рассчитываем доход для периода
        const periodIncome = calculatePeriodIncome(
            employeeData,
            period.period_start,
            period.period_end
        );

        // Рассчитываем налог
        const periodTax = periodIncome * (period.tax_rate / 100);

        // Сохраняем изменения ставок
        if (period.tax_rate !== results.currentTaxRate) {
            results.taxRateChanges.push({
                date: period.period_start,
                previous_rate: results.currentTaxRate || 13,
                new_rate: period.tax_rate,
                triggered_by: period.change_reason
            });
            results.currentTaxRate = period.tax_rate;
        }

        // Аккумулируем итоги
        results.periods.push({
            period: `${period.period_start} - ${period.period_end}`,
            days: daysBetween(period.period_start, period.period_end),
            child_count: period.child_count,
            tax_rate: period.tax_rate,
            income: periodIncome,
            tax: periodTax
        });

        results.total += periodIncome;
        results.taxTotal += periodTax;
    });

    results.netTotal = results.total - results.taxTotal;
    return results;
}

// Вспомогательные функции
function fillMissingPeriods(periods, overallStart, overallEnd) {
    const filled = [];
    let lastEnd = overallStart;

    periods.forEach(p => {
        if (p.period_start > lastEnd) {
            filled.push(createFallbackPeriod(lastEnd, p.period_start));
        }
        filled.push(p);
        lastEnd = p.period_end;
    });

    if (lastEnd < overallEnd) {
        filled.push(createFallbackPeriod(lastEnd, overallEnd));
    }

    return filled;
}

function createFallbackPeriod(start, end) {
    return {
        period_start: start,
        period_end: end,
        child_count: 0,
        tax_rate: 13,
        change_reason: 'no children'
    };
}

function calculatePeriodIncome(data, periodStart, periodEnd) {
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);

    // Расчет по должностям
    const positionIncome = data.positions.reduce((sum, pos) => {
        const posStart = new Date(pos.start);
        const posEnd = pos.end ? new Date(pos.end) : new Date(8640000000000000);

        const overlapStart = new Date(Math.max(posStart, periodStartDate));
        const overlapEnd = new Date(Math.min(posEnd, periodEndDate));

        if (overlapStart >= overlapEnd) return sum;

        const days = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
        return sum + days * pos.rate * pos.work_rate / 30;
    }, 0);

    // Расчет по контрактам
    const contractIncome = data.contracts.reduce((sum, con) => {
        const conStart = new Date(con.start);
        const conEnd = con.end ? new Date(con.end) : new Date(8640000000000000);

        const overlapStart = new Date(Math.max(conStart, periodStartDate));
        const overlapEnd = new Date(Math.min(conEnd, periodEndDate));

        if (overlapStart >= overlapEnd) return sum;

        const days = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
        return sum + days * con.rate / 30; // Убедитесь, что это правильный расчет
    }, 0);

    // Бонусы/штрафы
    const bonuses = data.bonuses
        .filter(b => {
            const bonusDate = new Date(b.date);
            return bonusDate >= periodStartDate && bonusDate <= periodEndDate;
        })
        .reduce((sum, b) => sum + b.amount, 0);

    return positionIncome + contractIncome + bonuses; // Убедитесь, что все доходы учитываются
}


function daysBetween(start, end) {
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function isDateInPeriod(date, start, end) {
    const d = new Date(date);
    return d >= new Date(start) && d <= new Date(end);
}

async function getTaxPeriods(employeeId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        db.all(`
             WITH child_periods AS (
                SELECT 
                    c.birth_date,
                    MAX(c.birth_date, DATE(?)) AS period_start,
                    MIN(DATE(c.birth_date, '+18 years'), DATE(?)) AS period_end
                FROM children c
                WHERE (c.employee_id = ? OR c.second_parent_id = ?)
                    AND c.birth_date > DATE(?, '-18 years') 
            ),
            tax_calendar AS (
                SELECT 
                    period_start AS date,
                    1 AS is_start
                FROM child_periods
                UNION ALL
                SELECT 
                    period_end AS date,
                    0 AS is_start
                FROM child_periods
            ),
            periods AS (
                SELECT
                    date,
                    SUM(CASE WHEN is_start THEN 1 ELSE -1 END) 
                        OVER (ORDER BY date) AS child_count
                FROM tax_calendar
                WHERE date BETWEEN ? AND ?
            )
            SELECT
                date AS period_date,
                child_count,
                13 - (child_count * 3) AS tax_rate
            FROM periods
            ORDER BY period_date
        `, [
            startDate, endDate,
            employeeId, employeeId, startDate,
            startDate, endDate
        ], (err, rows) => {
            if (err) return reject(err);

            const processed = processPeriods(rows, startDate, endDate);
            resolve(processed);
        });
    });
}

function processPeriods(rows, start, end) {
    const periods = [];
    let current = { start, child_count: 0, tax_rate: 13 };

    rows.forEach(row => {
        if (row.period_date > current.start) {
            periods.push({
                period_start: current.start,
                period_end: row.period_date,
                child_count: current.child_count,
                tax_rate: current.tax_rate
            });
            current.start = row.period_date;
        }
        current.child_count = row.child_count;
        current.tax_rate = 13 - (row.child_count * 3);
    });

    if (current.start < end) {
        periods.push({
            period_start: current.start,
            period_end: end,
            child_count: current.child_count,
            tax_rate: current.tax_rate
        });
    }

    return periods.filter(p => p.period_start < p.period_end);
}

// Получаем данные по должностям
async function getPositions(employeeId, start, end) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                p.title,
                p.payrate * ps.work_rate AS rate,
                ps.work_rate,
                MAX(?, ps.start_date) AS start,
                MIN(COALESCE(ps.end_date, ?),?) AS end,
                ROUND((JULIANDAY(MIN(COALESCE(ps.end_date, ?),?))-JULIANDAY(MAX(?, ps.start_date))+1)
                 * p.payrate * ps.work_rate / 30, 2) AS amount
            FROM position_schedule ps
            JOIN positions p ON ps.position_id = p.id
            WHERE ps.employee_id = ?
                AND ps.start_date <= ?
                AND (ps.end_date >= ? OR ps.end_date IS NULL)
            ORDER BY ps.start_date
        `, [start, end, end, end, end, start, employeeId, end, start], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => ({ ...row, type: 'position' })));
        });
    });
}

// Получаем данные по контрактам
async function getContracts(employeeId, start, end) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                c.description AS title,
                c.payrate AS rate,
                MAX(?, cs.start_date) AS start,
                MIN(COALESCE(cs.end_date, ?), ?) AS end,
                ROUND(
                (JULIANDAY(MIN(COALESCE(cs.end_date, ?), ?)) - JULIANDAY(MAX(?, cs.start_date)) + 1)
                 * c.payrate / 30, 
                2) AS amount
            FROM contract_schedule cs
            JOIN contracts c ON cs.contract_id = c.id
            WHERE cs.employee_id = ?
                AND cs.start_date <= ?
                AND (cs.end_date >= ? OR cs.end_date IS NULL)
            GROUP BY c.id
            ORDER BY cs.start_date
        `, [start, end, end, end, end, start, employeeId, end, start], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => ({ ...row, type: 'contract' })));
        });
    });
}

// Получаем данные по бонусам
async function getBonuses(employeeId, start, end) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                bd.description AS title,
                b.date,
                bd.value AS amount
            FROM bonuses b
            JOIN bonuses_dict bd ON b.bonus_dict_id = bd.id
            WHERE b.employee_id = ?
                AND b.date BETWEEN ? AND ?
            ORDER BY b.date
        `, [employeeId, start, end], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => ({ ...row, type: 'bonus' })));
        });
    });
}

async function getEmployeeDetails(employeeId, start, end) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT full_name, hire_date FROM employees WHERE id=?
        `, [employeeId],
            async (err, rows) => {
                if (err) reject(err);
                else resolve({
                    ...rows,
                    positions: await getPositions(employeeId, start, end),
                    contracts: await getContracts(employeeId, start, end),
                    bonuses: await getBonuses(employeeId, start, end)
                });
            });
    });
}

app.listen(3000, () => console.log('Server running on http://localhost:3000'));