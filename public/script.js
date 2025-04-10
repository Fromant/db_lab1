// Form Visibility Control
document.getElementById('entitySelector').addEventListener('change', function () {
    document.querySelectorAll('.form-section').forEach(el => el.style.display = 'none');
    document.getElementById(this.value + 'Form').style.display = 'block';
});

// Autocomplete Setup
function setupAutocomplete(input, endpoint, displayField) {
    input.addEventListener('input', async () => {
        const term = input.value;
        const response = await fetch(`/api/search/${endpoint}?term=${term}`);
        const data = await response.json();

        const list = document.createElement('div');
        list.className = 'autocomplete-items';

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item[displayField];
            div.dataset.id = item.id;
            div.onclick = () => {
                input.value = item[displayField];
                input.dataset.selectedId = item.id;
                list.remove();
            };
            list.appendChild(div);
        });

        input.parentNode.appendChild(list);
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

    if (!data.employee_id || !data.position_id) {
        alert('Please select both employee and position');
        return;
    }

    try {
        const response = await fetch('/api/position-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Position assigned successfully! ID: ${result.id}`);
        clearForm('positionAssignment');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function assignContract() {
    const data = {
        employee_id: document.getElementById('assignEmpContract').dataset.selectedId,
        contract_id: document.getElementById(document.getElementById('assignContract').dataset.selectedId),
        start_date: document.getElementById('assignConStart').value,
        end_date: document.getElementById('assignConEnd').value || null
    };

    if (!data.employee_id || !data.contract_id) {
        alert('Please select both employee and contract');
        return;
    }

    try {
        const response = await fetch('/api/contract-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(`Contract assigned with ID: ${result.id}`);
        clearForm('contractAssignment');
    } catch (error) {
        alert('Error: ' + error.message);
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
        alert(`Bonus assigned with ID: ${result.id}`);
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

// Report Generation
async function generateReport() {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;

    try {
        const response = await fetch(`/api/reports/annual?start=${start}&end=${end}`);
        const data = await response.json();

        const html = `
            <table class="report-table">
                <tr>
                    <th>Employee</th>
                    <th>Position Income</th>
                    <th>Contract Income</th>
                    <th>Bonuses</th>
                    <th>Children</th>
                    <th>Tax Rate</th>
                    <th>Tax Amount</th>
                    <th>Net Income</th>
                </tr>
                ${data.map(emp => `
                    <tr>
                        <td>${emp.full_name}</td>
                        <td>$${emp.position_income.toFixed(2)}</td>
                        <td>$${emp.contract_income.toFixed(2)}</td>
                        <td>$${emp.bonus_total.toFixed(2)}</td>
                        <td>${emp.child_count}</td>
                        <td>${emp.tax_rate}%</td>
                        <td>$${emp.tax_amount.toFixed(2)}</td>
                        <td>$${emp.net_income.toFixed(2)}</td>
                    </tr>
                `).join('')}ф
            </table>
        `;

        document.getElementById('reportResults').innerHTML = html;
    } catch (error) {
        alert('Error generating report: ' + error.message);
    }
}