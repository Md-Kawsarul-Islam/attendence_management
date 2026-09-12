let updatedData = {};

// Load courses into dropdown
async function loadCourses() {
    try {
        const res = await fetch('/courses');
        const data = await res.json();

        const courseSelect = document.getElementById('courseFilter');
        courseSelect.innerHTML = '<option value="">-- Select Course --</option>';

        data.forEach(c => {
            courseSelect.innerHTML += `<option value="${c.id}">${c.course_name}</option>`;
        });
    } catch (err) {
        console.error("Error loading courses:", err);
    }
}

// Load attendance report
async function loadReport() {
    const courseId = document.getElementById('courseFilter').value;
    const date = document.getElementById('reportDate').value;

    if (!courseId || !date) {
        alert("Please select course and date");
        return;
    }

    try {
        const res = await fetch(`/attendanceReport?course_id=${courseId}&date=${date}`);
        const data = await res.json();

        // Reset updatedData to avoid carrying over old report data
        updatedData = {};  // Resetting updatedData

        const tableBody = document.getElementById('reportList');
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No records found</td></tr>`;
            return;
        }

        // Populate table with new report data
        data.forEach(r => {
            updatedData[r.id] = r.status;

            tableBody.innerHTML += `
            <tr>
                <td>${r.sid}</td>
                <td>${r.name}</td>
                <td>${r.course_name}</td>
                <td>
                    <button class="present-btn" style="opacity:${r.status==='Present'?'1':'0.5'}"
                        onclick="setStatus(${r.id}, 'Present', this)">Present</button>
                    <button class="absent-btn" style="opacity:${r.status==='Absent'?'1':'0.5'}"
                        onclick="setStatus(${r.id}, 'Absent', this)">Absent</button>
                </td>
            </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading report:", err);
    }
}

// Set status
function setStatus(id, status, btn) {
    updatedData[id] = status;

    const buttons = btn.parentElement.querySelectorAll('button');
    buttons.forEach(b => b.style.opacity = '0.5');
    btn.style.opacity = '1';
}

// Save updates
async function updateAttendance() {
    const updates = Object.keys(updatedData).map(id => ({
        id: parseInt(id),   // ensure numeric ID
        status: updatedData[id]
    }));

    try {
        const res = await fetch('/updateAttendance', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        });

        if (res.ok) {
            alert("Attendance Updated");
            loadReport(); // reload table with fresh data
        } else {
            alert("Error updating attendance");
        }
    } catch (err) {
        console.error("Error updating attendance:", err);
    }
}

// Set today's date as max for date input
function setDateLimit() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("reportDate");
    dateInput.setAttribute("max", today);
    dateInput.value = today; // optional: auto-fill with today
}

// Run on page load
window.onload = () => {
    loadCourses();
    setDateLimit();
};