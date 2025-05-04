// Form Visibility Control
document.getElementById('entitySelector').addEventListener('change', function () {
    document.querySelectorAll('.form-section').forEach(el => el.style.display = 'none');
    document.getElementById(this.value + 'Form').style.display = 'block';
});

// Autocomplete Setup
function setupAutocomplete(input, endpoint, displayField) {
    input.addEventListener('input', async () => {
        try {
            // Удаляем предыдущие элементы
            document.querySelectorAll('.autocomplete-item').forEach(el => el.remove());

            const term = input.value.trim();
            if (term.length < 2) return; // Не ищем при коротких запросах

            // Запрос к API
            const response = await fetch(`/api/search/${endpoint}?term=${term}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const data = await response.json();
            if (!data.length) return; // Нет данных

            // Создаем список
            const list = document.createElement('div');
            list.className = 'autocomplete-items';

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = item[displayField];
                div.dataset.id = item.id;
                div.onclick = () => {
                    input.value = item[displayField];
                    input.dataset.selectedId = item.id.toString();
                    console.log('Выбрано:', item.id, item[displayField]);
                    list.remove();
                };
                list.appendChild(div);
            });

            input.parentNode.appendChild(list);

        } catch (error) {
            console.error('Ошибка автозаполнения:', error);
        }
    });
}

// Initialize Autocompletes
document.querySelectorAll('.employee-search').forEach(input => {
    setupAutocomplete(input, 'employees', 'full_name');
});

document.querySelectorAll('.position-search').forEach(input => {
    setupAutocomplete(input, 'positions', 'title');
});

document.querySelectorAll('.contract-search').forEach(input => {
    setupAutocomplete(input, 'contracts', 'description');
});

document.querySelectorAll('.bonus-search').forEach(input => {
    setupAutocomplete(input, 'bonuses', 'description');
});

// Entity Creation Functions
async function addEmployee() {
    const data = {
        full_name: document.getElementById('empName').value,
        hire_date: document.getElementById('empHireDate').value,
        fire_date: document.getElementById('empFireDate').value || null
    };

    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Employee added with ID: ${result.id}`);
        clearForm('employee');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function fireEmployee() {
    const data = {
        employee_id: document.getElementById('fireEmployee').dataset.selectedId,
        fire_date: document.getElementById('empFireDate').value || null
    };

    if (!data.employee_id) {
        console.log(document.getElementById('fireEmployee'))
        alert("Please, choose employee to fire")
        return;
    }

    try {
        const response = await fetch('/api/fire_employee', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            alert('Firing successful!');
        } else {
            throw new Error('Failed to fire');
        }
        clearForm('fire');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function addPosition() {
    const data = {
        title: document.getElementById('positionTitle').value,
        description: document.getElementById('positionDesc').value,
        payrate: parseFloat(document.getElementById('positionPayrate').value),
        max_work_rate: parseFloat(document.getElementById('positionMaxRate').value)
    };

    try {
        const response = await fetch('/api/positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Position added with ID: ${result.id}`);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function addContract() {
    const data = {
        description: document.getElementById('contractDesc').value,
        payrate: parseFloat(document.getElementById('contractPayrate').value),
        start_date: document.getElementById('contractStart').value,
        end_date: document.getElementById('contractEnd').value
    };

    try {
        const response = await fetch('/api/contracts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Contract added with ID: ${result.id}`);
        clearForm('contract');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function addChild() {
    const data = {
        employee_id: document.getElementById('childParent').dataset.selectedId,
        second_parent_id: document.getElementById('childSecondParent').dataset.selectedId || null,
        child_name: document.getElementById('childName').value,
        birth_date: document.getElementById('childBirthDate').value
    };

    if (!data.employee_id) {
        alert('Please select a parent employee');
        return;
    }

    try {
        const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Child record added with ID: ${result.id}`);
        clearForm('child');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function addBonusType() {
    const data = {
        description: document.getElementById('bonusDesc').value,
        value: parseFloat(document.getElementById('bonusValue').value),
    };

    try {
        const response = await fetch('/api/bonus-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Bonus type added with ID: ${result.id}`);
        clearForm('bonusType');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function assignPosition() {
    const data = {
        employee_id: document.getElementById('assignEmpPosition').dataset.selectedId,
        position_id: document.getElementById('assignPosition').dataset.selectedId,
        work_rate: parseFloat(document.getElementById('assignWorkRate').value),
        start_date: document.getElementById('assignPosStart').value,
        end_date: document.getElementById('assignPosEnd').value || null
    };

    if (!data.employee_id || !data.position_id || !data.start_date) {
        alert('Please select both employee and position and start date');
        return;
    }

    try {
        const response = await fetch('/api/position-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.error) alert(`Произошла ошибка: ${result.error}`);
        else alert(`Position assigned successfully! ID: ${result.id}`);
        clearForm('positionAssignment');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function assignContract() {
    const employeeInput = document.getElementById('assignEmpContract');
    const contractInput = document.getElementById('assignContract');

    console.log('employeeInput:', employeeInput?.dataset.selectedId); // Проверка значения
    console.log('contractInput:', contractInput?.dataset.selectedId); // Проверка значения

    if (!employeeInput || !contractInput) {
        alert('Элементы формы не найдены');
        return;
    }

    const employeeId = Number(employeeInput.dataset.selectedId);
    const contractId = Number(contractInput.dataset.selectedId);

    console.log('employeeId (number):', employeeId); // Проверка преобразования
    console.log('contractId (number):', contractId); // Проверка преобразования

    if (isNaN(employeeId)) {
        alert('Сотрудник не выбран');
        return;
    }
    if (isNaN(contractId)) {
        alert('Контракт не выбран');
        return;
    }

    // Формируем данные
    const data = {
        employee_id: employeeId,
        contract_id: contractId,
        start_date: document.getElementById('assignConStart').value,
        end_date: document.getElementById('assignConEnd').value || null
    };

    console.log('Данные для отправки:', data);

    try {
        const response = await fetch('/api/contract-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка сервера: ${errorText}`);
        }

        const result = await response.json();
        if (result.error) alert(`Произошка ошибка: ${result.error}`)
        else alert(`Контракт назначен (ID: ${result.id})`);
        clearForm('contractAssignment');
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

async function assignBonus() {
    const data = {
        bonus_dict_id: parseFloat(document.getElementById('assignBonusType').dataset.selectedId),
        employee_id: document.getElementById('assignEmpBonus').dataset.selectedId,
        date: document.getElementById('bonusDate').value
    };

    if (!data.bonus_dict_id || !data.employee_id) {
        alert('Please select both employee and contract');
        return;
    }

    try {
        const response = await fetch('/api/bonuses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.error) alert(`Произошка ошибка: ${result.error}`)
            else alert(`Bonus assigned with ID: ${result.id}`);
        clearForm('bonusAssignment');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function clearForm(formType) {
    document.getElementById(`${formType}Form`).querySelectorAll('input').forEach(input => {
        input.value = '';
        if (input.dataset.selectedId) delete input.dataset.selectedId;
    });
}
// Date input explanations
function addDateHints() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        const hint = document.createElement('small');
        hint.className = 'date-hint';
        hint.textContent = input.required ? '(required)' : '(optional)';
        input.parentNode.appendChild(hint);
    });
}
addDateHints();

async function loadActiveAssignments() {
    const employeeId = document.getElementById('terminateEmployee').dataset.selectedId;
    if (!employeeId) {
        alert('Please select an employee');
        return;
    }

    try {
        const [positions, contracts] = await Promise.all([
            fetch(`/api/position-assignments/active?employeeId=${employeeId}`).then(r => r.json()),
            fetch(`/api/contract-assignments/active?employeeId=${employeeId}`).then(r => r.json())
        ]);

        const html = `
    <h3>Active Positions</h3>
    ${positions.map(pos => `
        <div class="assignment-card">
            <strong>${pos.title}</strong> (since ${pos.start_date})
            <input type="date" id="fire_date_position_${pos.id}">
            <button class="terminate-btn" 
                    onclick="terminateAssignment('position', ${pos.id})">
                Terminate Position
            </button>
        </div>
    `).join('')}
    
    <h3>Active Contracts</h3>
    ${contracts.map(con => `
        <div class="assignment-card">
            <strong>${con.description}</strong> (since ${con.start_date})
            <input type="date" id="fire_date_contract_${con.id}">
            <button class="terminate-btn" 
                    onclick="terminateAssignment('contract', ${con.id})">
                Terminate Contract
            </button>
        </div>
    `).join('')}
`;

        document.getElementById('activeAssignments').innerHTML = html;
    } catch (error) {
        alert('Error loading assignments: ' + error.message);
    }
}

async function terminateAssignment(type, id) {
    let endDate = document.getElementById(`fire_date_${type}_${id}`).value;
    try {
        const response = await fetch(`/api/${type}-assignments/${id}/terminate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ end_date: endDate || undefined })
        });

        if (response.ok) {
            alert('Termination successful!');
            loadActiveAssignments();
        } else {
            throw new Error('Failed to terminate');
        }
    } catch (error) {
        alert('Termination failed: ' + error.message);
    }
}

async function loadListPositions() {
    const doLoadOnlyAvailable = document.getElementById("position_do_load_available").checked;
    try {
        fetch(`/api/positions?doLoadAll=${!doLoadOnlyAvailable}`).then(async res => {
            const rows = (await res.json()).rows;

            const html = [`<table class="report-table">
                <tr>
                    <th>Position name</th>
                    <th>Position description</th>
                    <th>Position payrate</th>
                    <th>Position max work rate</th>
                    <th>Position estimated work rate</th>
                </tr>`];

            rows.forEach(position => {
                html.push(`
                <tr>
                    <td>${position.title}</td>
                    <td>${position.description}</td>
                    <td>${position.payrate}</td>
                    <td>${position.max_work_rate}</td>
                    <td>${position.estimated_work_rate}</td>
                </tr>`)
            });

            html.push('</table>')

            document.getElementById('positions_loaded').innerHTML = html.join('');
        })
    } catch (error) {
        alert('Error loading assignments: ' + error.message);
    }
};

//getting Salary
async function calculateSalary() {
    const employeeInput = document.getElementById('salaryEmployeeName');
    const employeeId = employeeInput.dataset.selectedId;
    const year = document.getElementById('salaryYear').value;
    const month = document.getElementById('salaryMonth').value.padStart(2, '0');

    if (!employeeId || !year || !month) {
        alert("Please select an employee and fill all fields");
        return;
    }

    try {
        const response = await fetch(`/api/salary?employeeId=${employeeId}&year=${year}&month=${month}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        const formatValue = (value) => {
            return value === 0 ? 'No income' : `$${value.toFixed(2)}`;
        };

        const html = `
            <div class="salary-result-item">
                <strong>Gross:</strong> ${formatValue(data.gross)}
            </div>
            <div class="salary-result-item">
                <strong>Tax:</strong> ${data.tax === 0 ? 'No tax' : `$${data.tax.toFixed(2)}`}
            </div>
            <div class="salary-result-item">
                <strong>Net Income:</strong> ${formatValue(data.net)}
            </div>
            <div class="salary-result-item">
                <strong>Child Discount:</strong> ${data.childDiscount || 0}%
            </div>
        `;

        document.getElementById('salaryResult').innerHTML = html;

    } catch (error) {
        document.getElementById('salaryResult').innerHTML = `
            <div class="error">Error: ${error.message}</div>
        `;
    }
}

// Report Generation
async function generateReport() {
    const year = document.getElementById('reportYear').value;

    if (!year || !/^\d{4}$/.test(year)) {
        alert("Please enter a valid year in YYYY format");
        return;
    }

    try {
        const response = await fetch(`/api/reports/annual?year=${year}`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const reportData = await response.json();

        const formatIncome = (value) => {
            return value === 0 ? 'No income' : `$${value.toFixed(2)}`;
        };

        const html = `
            <table class="report-table">
                <tr>
                    <th>Имя</th>
                    <th>Доход до вычетов</th>
                    <th>Вычеты</th>
                    <th>Доход после вычетов</th>
                </tr>
                ${reportData.map(emp => `
                    <tr>
                        <td>${emp.employee_name || 'Неизвестно'}</td>
                        <td>${formatIncome(emp.gross_income)}</td>
                        <td>${emp.tax_amount === 0 ? 'Нет вычетов' : `${emp.tax_amount.toFixed(2)}`}</td>
                        <td>${formatIncome(emp.net_income)}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        document.getElementById('reportResults').innerHTML = html;

    } catch (error) {
        document.getElementById('reportResults').innerHTML =
            `<p class="error">Error: ${error.message}</p>`;
    }
}

document.addEventListener("keydown", (event) => {
    const keyName = event.key;
    if (keyName === "Escape") document.querySelectorAll('.autocomplete-item').forEach(el => el.remove());
})

async function generatePayslip() {
    const employeeId = document.getElementById('payslipEmployee').dataset.selectedId;
    const start = document.getElementById('payslipStart').value;
    const end = document.getElementById('payslipEnd').value;

    if (!employeeId) {
        alert('Заполните поле сотрудника!');
        return;
    }

    try {
        const response = await fetch(`/api/payslip?employeeId=${employeeId}&start=${start}&end=${end}`);
        if(!response.ok) {
            alert(`Произошла ошибка: ${response.status}`)
            return;
        }
        const data = await response.json();

        const periodDetails = data.tax_calculation

        const html = `
            <div class="payslip-section">
                <h3>Сотрудник: ${data.full_name}</h3>
                <p>Период: ${start} - ${end}</p>

                <h4>Основные доходы</h4>
                ${renderIncomeTable(data.positions)}

                <h4>Контракты</h4>
                ${renderIncomeTable(data.contracts)}

                <h4>Бонусы/Штрафы</h4>
                ${renderBonuses(data.bonuses)}


                <div class="total-block">
                    <h4>Детализация налоговых периодов</h4>
                    ${renderTaxPeriods(periodDetails)}
                    <h4>Итоговый расчет</h4>
                    <p>Общий доход: $${data.totals.gross.toFixed(2)}</p>
                    <p>Общий налог: $${data.totals.tax.toFixed(2)}</p>
                    <h3>Чистая выплата: $${data.totals.net.toFixed(2)}</h3>
                </div>
            </div>
        `;

        document.getElementById('payslipResult').innerHTML = html;
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function renderTaxPeriods(periodDetails) {
    return `
        <table class="payslip-table">
            <tr>
                <th>Период</th>
                <th>Детей</th>
                <th>Ставка</th>
                <th>Доход</th>
                <th>Налог</th>
            </tr>
            ${periodDetails.periods.map(p => `
                <tr>
                    <td>${p.period}</td>
                    <td>${p.child_count}</td>
                    <td>${p.tax_rate}%</td>
                    <td>$${p.income.toFixed(2)}</td>
                    <td>$${p.tax.toFixed(2)}</td>
                </tr>
            `).join('')}
        </table>
    `;
}

function renderIncomeTable(items) {
    if (items.length === 0) return '<p>Нет данных</p>';

    return `
        <table class="payslip-table">
            <tr>
                <th>Тип</th>
                <th>Название</th>
                <th>Ставка</th>
                <th>Период</th>
                <th>Сумма</th>
            </tr>
            ${items.map(item => `
                <tr>
                    <td>${item.type === 'position' ? 'Должность' : 'Контракт'}</td>
                    <td>${item.title}</td>
                    <td>$${item.rate.toFixed(2)}</td>
                    <td>
                        ${formatDate(item.start)} - 
                        ${item.end ? formatDate(item.end) : 'н.в.'}
                    </td>
                    <td>$${item.amount.toFixed(2)}</td>
                </tr>
            `).join('')}
        </table>
    `;
}

// Новая функция форматирования даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU'); // Формат DD.MM.YYYY
}

function renderBonuses(bonuses) {
    if (bonuses.length === 0) return '<p>Нет данных</p>';

    return `
        <table class="payslip-table">
            <tr>
                <th>Описание</th>
                <th>Дата</th>
                <th>Сумма</th>
            </tr>
            ${bonuses.map(b => `
                <tr>
                    <td>${b.title}</td>
                    <td>${b.date}</td>
                    <td class="${b.amount < 0 ? 'negative' : ''}">
                        $${b.amount.toFixed(2)}
                    </td>
                </tr>
            `).join('')}
        </table>
    `;
}

function calculateTotal(data) {
    return [
        ...data.positions.map(i => i.amount),
        ...data.contracts.map(c => c.amount),
        ...data.bonuses.map(b => b.amount)
    ].reduce((sum, val) => sum + val, 0);
}