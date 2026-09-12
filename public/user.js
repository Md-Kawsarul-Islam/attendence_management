let attendanceData = {};

// Run when page loads
window.addEventListener("load", function () {
    loadCourses();

    // Set today's date
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById('attendanceDate');
    dateInput.value = today;
    dateInput.max = today;
});


// =======================
// Load Courses
// =======================
async function loadCourses() {
    try {
        const res = await fetch('/courses');
        const courses = await res.json();

        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select Course</option>';

        courses.forEach(course => {
            const option = document.createElement("option");
            option.value = course.id;
            option.textContent = course.course_name;
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Error loading courses:", err);
    }
}


// =======================
// Load Students
// =======================
async function loadStudents() {
    const course_id = document.getElementById('courseSelect').value;
    const date = document.getElementById('attendanceDate').value;

    if (!course_id || !date) {
        alert("Please select course and date first");
        return;
    }

    try {
        const res = await fetch(`/students?course_id=${course_id}`);
        const students = await res.json();

        const list = document.getElementById('studentList');
        list.innerHTML = '';

        attendanceData = {};

        students.forEach(student => {
            attendanceData[student.id] = 'Absent';

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${student.sid}</td>
                <td>${student.name}</td>
                <td class="action-cell">
                    <button class="present-btn"
                        onclick="markAttendance(${student.id}, 'Present', this)">
                        Present
                    </button>

                    <button class="absent-btn"
                        onclick="markAttendance(${student.id}, 'Absent', this)">
                        Absent
                    </button>
                </td>
            `;

            list.appendChild(row);
        });

    } catch (err) {
        console.error("Error loading students:", err);
    }
}


// =======================
// Mark Attendance
// =======================
function markAttendance(studentId, status, btn) {
    attendanceData[studentId] = status;

    const buttons = btn.parentElement.querySelectorAll('button');
    buttons.forEach(b => b.style.opacity = '0.4');

    btn.style.opacity = '1';
}


// =======================
// Submit Attendance
// =======================
async function submitAttendance() {
    const course_id = document.getElementById('courseSelect').value;
    const date = document.getElementById('attendanceDate').value;

    if (!course_id || !date) {
        alert("Select course and date");
        return;
    }

    const attendanceList = Object.keys(attendanceData).map(id => ({
        student_id: id,
        status: attendanceData[id]
    }));

    try {
        await fetch('/submitAttendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_id: course_id,
                date: date,
                attendance: attendanceList
            })
        });

        alert("Attendance Submitted Successfully!");

        // Redirect to report page
        window.location.href =
            `/attendance_report.html?course_id=${course_id}&date=${date}`;

    } catch (err) {
        console.error("Error submitting attendance:", err);
    }
}