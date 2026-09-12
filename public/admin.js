// Load students and courses when page loads
window.onload = () => {
    loadStudents();
    loadCourses();
    loadAdminName();
};

// ======================= STUDENT MANAGEMENT =======================

// ADD STUDENT
async function addStudent() {
    const res = await fetch('/currentUser');
    const data = await res.json();

    if (data.role !== 'admin') {
        alert("You must be an admin to add students.");
        return;
    }

    const sid = document.getElementById('sid').value.trim();
    const name = document.getElementById('sname').value.trim();
    const dept = document.getElementById('dept').value.trim();

    if (!sid || !name || !dept) {
        alert("Please fill all fields");
        return;
    }

    await fetch('/addStudent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid, name, dept })
    });

    document.getElementById('sid').value = '';
    document.getElementById('sname').value = '';
    document.getElementById('dept').value = '';

    loadStudents();
}

// Load the current logged-in user's name (Admin or User)
async function loadAdminName() {
    const res = await fetch('/currentUser'); // Change this line
    const data = await res.json();

    if (data.name) {
        document.getElementById('username').innerText = data.name;
    }
}

// LOAD STUDENTS
let allStudents = []; // store all students for filtering

async function loadStudents() {
    const res = await fetch('/students');
    allStudents = await res.json();
    renderStudents(allStudents);
}

function renderStudents(students) {
    const list = document.getElementById('studentList');
    list.innerHTML = '';

    students.forEach(s => {
        list.innerHTML += `
        <tr>
            <td>${s.sid}</td>
            <td>${s.name}</td>
            <td>${s.dept}</td>
            <td>
                <button class="edit-btn" onclick="editStudent(${s.id})">Edit</button>
                <button class="delete-btn" onclick="deleteStudent(${s.id})">Delete</button>
            </td>
        </tr>
        `;
    });
}

function applyFilter() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const dept = document.getElementById('deptFilter').value;

    const filtered = allStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search) || s.sid.toLowerCase().includes(search);
        const matchesDept = dept === "" || s.dept === dept;
        return matchesSearch && matchesDept;
    });

    renderStudents(filtered);
}

// DELETE STUDENT
async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student?")) return;
    await fetch('/deleteStudent/' + id, { method: 'DELETE' });
    loadStudents();
}

// EDIT STUDENT
async function editStudent(id) {
    const name = prompt("Enter new name:");
    const dept = prompt("Enter new department:");

    if (!name || !dept) {
        alert("Both fields are required");
        return;
    }

    await fetch('/updateStudent/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dept })
    });

    loadStudents();
}

// ======================= COURSE MANAGEMENT =======================

// ADD COURSE
async function addCourse() {
    const courseName = document.getElementById('courseName').value.trim();

    if (!courseName) {
        alert("Please enter course name");
        return;
    }

    await fetch('/addCourse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_name: courseName })
    });

    document.getElementById('courseName').value = '';
    loadCourses();
}

// LOAD COURSES
let allCourses = [];

async function loadCourses() {
    const res = await fetch('/courses');
    allCourses = await res.json();
    renderCourses(allCourses);
}

function renderCourses(courses) {
    const list = document.getElementById('courseList');
    list.innerHTML = '';

    courses.forEach(c => {
        list.innerHTML += `
        <tr>
            <td>${c.id}</td>
            <td>${c.course_name}</td>
            <td>
                <button class="edit-btn" onclick="editCourse(${c.id})">Edit</button>
                <button class="delete-btn" onclick="deleteCourse(${c.id})">Delete</button>
            </td>
        </tr>
        `;
    });
}

// COURSE FILTER
function applyCourseFilter() {
    const search = document.getElementById('courseSearch').value.toLowerCase();

    const filtered = allCourses.filter(c => c.course_name.toLowerCase().includes(search));
    renderCourses(filtered);
}

// DELETE COURSE
async function deleteCourse(id) {
    if (!confirm("Are you sure you want to delete this course?")) return;
    await fetch('/deleteCourse/' + id, { method: 'DELETE' });
    loadCourses();
}

// EDIT COURSE
async function editCourse(id) {
    const courseName = prompt("Enter new course name:");

    if (!courseName) {
        alert("Course name required");
        return;
    }

    await fetch('/updateCourse/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_name: courseName })
    });

    loadCourses();
}
