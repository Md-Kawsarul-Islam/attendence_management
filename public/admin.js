const API_URL =
"https://attendence-management-xvy5.onrender.com";

// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener("DOMContentLoaded", () => {

```
loadStudents();
loadCourses();
loadAdminName();

const studentForm =
    document.getElementById("studentForm");

if (studentForm) {
    studentForm.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();
            addStudent();
        }
    );
}


const courseForm =
    document.getElementById("courseForm");

if (courseForm) {
    courseForm.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();
            addCourse();
        }
    );
}
```

});

// =====================================================
// COMMON FETCH OPTIONS
// =====================================================

const authOptions = {
credentials: "include"
};

// =====================================================
// LOAD ADMIN NAME
// =====================================================

async function loadAdminName() {

```
try {

    const response =
        await fetch(
            `${API_URL}/currentUser`,
            {
                credentials: "include"
            }
        );


    if (!response.ok) {

        console.error(
            "Current user request failed:",
            response.status
        );

        return;
    }


    const data =
        await response.json();


    if (
        data.role &&
        data.role !== "admin"
    ) {

        alert(
            "You must be an admin to access this page."
        );

        window.location.href =
            `${API_URL}/`;

        return;
    }


    const username =
        document.getElementById("username");


    if (
        username &&
        data.name
    ) {

        username.textContent =
            data.name;

    }

} catch (error) {

    console.error(
        "Load admin name error:",
        error
    );

}
```

}

// =====================================================
// STUDENT MANAGEMENT
// =====================================================

let allStudents = [];

// ---------------- ADD STUDENT ----------------

async function addStudent() {

```
const sid =
    document
        .getElementById("sid")
        .value
        .trim();

const name =
    document
        .getElementById("sname")
        .value
        .trim();

const dept =
    document
        .getElementById("dept")
        .value
        .trim();


if (!sid || !name || !dept) {

    alert(
        "Please fill all fields."
    );

    return;
}


try {

    const response =
        await fetch(
            `${API_URL}/addStudent`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials:
                    "include",

                body:
                    JSON.stringify({
                        sid,
                        name,
                        dept
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to add student."
        );

        return;
    }


    alert(
        data.message ||
        "Student added successfully."
    );


    document.getElementById(
        "studentForm"
    ).reset();


    loadStudents();

} catch (error) {

    console.error(
        "Add student error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// ---------------- LOAD STUDENTS ----------------

async function loadStudents() {

```
try {

    const response =
        await fetch(
            `${API_URL}/students`,
            {
                credentials:
                    "include"
            }
        );


    if (!response.ok) {

        console.error(
            "Load students failed:",
            response.status
        );

        return;
    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        console.error(
            "Invalid student data:",
            data
        );

        return;
    }


    allStudents = data;

    renderStudents(
        allStudents
    );

} catch (error) {

    console.error(
        "Load students error:",
        error
    );

}
```

}

// ---------------- RENDER STUDENTS ----------------

function renderStudents(students) {

```
const list =
    document.getElementById(
        "studentList"
    );


if (!list) return;


list.innerHTML = "";


if (students.length === 0) {

    list.innerHTML = `
        <tr>
            <td colspan="4">
                No students found.
            </td>
        </tr>
    `;

    return;
}


students.forEach(student => {

    list.innerHTML += `
        <tr>

            <td>
                ${escapeHTML(student.sid)}
            </td>

            <td>
                ${escapeHTML(student.name)}
            </td>

            <td>
                ${escapeHTML(student.dept)}
            </td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editStudent(${student.id})"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteStudent(${student.id})"
                >
                    Delete
                </button>

            </td>

        </tr>
    `;

});
```

}

// ---------------- FILTER STUDENTS ----------------

function applyFilter() {

```
const searchInput =
    document.getElementById(
        "searchInput"
    );

const deptFilter =
    document.getElementById(
        "deptFilter"
    );


const search =
    searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";


const dept =
    deptFilter
        ? deptFilter.value
        : "";


const filtered =
    allStudents.filter(student => {

        const studentName =
            String(
                student.name || ""
            ).toLowerCase();

        const studentSID =
            String(
                student.sid || ""
            ).toLowerCase();


        const studentDept =
            String(
                student.dept || ""
            );


        const matchesSearch =
            studentName.includes(search) ||
            studentSID.includes(search);


        const matchesDept =
            dept === "" ||
            studentDept === dept;


        return (
            matchesSearch &&
            matchesDept
        );

    });


renderStudents(filtered);
```

}

// ---------------- DELETE STUDENT ----------------

async function deleteStudent(id) {

```
if (
    !confirm(
        "Are you sure you want to delete this student?"
    )
) {

    return;

}


try {

    const response =
        await fetch(
            `${API_URL}/deleteStudent/${id}`,
            {
                method: "DELETE",
                credentials:
                    "include"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to delete student."
        );

        return;
    }


    alert(
        data.message ||
        "Student deleted successfully."
    );


    loadStudents();

} catch (error) {

    console.error(
        "Delete student error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// ---------------- EDIT STUDENT ----------------

async function editStudent(id) {

```
const name =
    prompt(
        "Enter new name:"
    );


if (!name) return;


const dept =
    prompt(
        "Enter new department:"
    );


if (!dept) return;


try {

    const response =
        await fetch(
            `${API_URL}/updateStudent/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials:
                    "include",

                body:
                    JSON.stringify({
                        name,
                        dept
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to update student."
        );

        return;
    }


    alert(
        data.message ||
        "Student updated successfully."
    );


    loadStudents();

} catch (error) {

    console.error(
        "Edit student error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// =====================================================
// COURSE MANAGEMENT
// =====================================================

let allCourses = [];

// ---------------- ADD COURSE ----------------

async function addCourse() {

```
const input =
    document.getElementById(
        "courseName"
    );


if (!input) return;


const courseName =
    input.value.trim();


if (!courseName) {

    alert(
        "Please enter course name."
    );

    return;
}


try {

    const response =
        await fetch(
            `${API_URL}/addCourse`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials:
                    "include",

                body:
                    JSON.stringify({
                        course_name:
                            courseName
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to add course."
        );

        return;
    }


    alert(
        data.message ||
        "Course added successfully."
    );


    input.value = "";


    loadCourses();

} catch (error) {

    console.error(
        "Add course error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// ---------------- LOAD COURSES ----------------

async function loadCourses() {

```
try {

    const response =
        await fetch(
            `${API_URL}/courses`,
            {
                credentials:
                    "include"
            }
        );


    if (!response.ok) {

        console.error(
            "Load courses failed:",
            response.status
        );

        return;
    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        console.error(
            "Invalid course data:",
            data
        );

        return;
    }


    allCourses = data;

    renderCourses(
        allCourses
    );

} catch (error) {

    console.error(
        "Load courses error:",
        error
    );

}
```

}

// ---------------- RENDER COURSES ----------------

function renderCourses(courses) {

```
const list =
    document.getElementById(
        "courseList"
    );


if (!list) return;


list.innerHTML = "";


if (courses.length === 0) {

    list.innerHTML = `
        <tr>
            <td colspan="3">
                No courses found.
            </td>
        </tr>
    `;

    return;
}


courses.forEach(course => {

    list.innerHTML += `
        <tr>

            <td>
                ${course.id}
            </td>

            <td>
                ${escapeHTML(
                    course.course_name
                )}
            </td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editCourse(${course.id})"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteCourse(${course.id})"
                >
                    Delete
                </button>

            </td>

        </tr>
    `;

});
```

}

// ---------------- COURSE FILTER ----------------

function applyCourseFilter() {

```
const input =
    document.getElementById(
        "courseSearch"
    );


const search =
    input
        ? input.value
            .trim()
            .toLowerCase()
        : "";


const filtered =
    allCourses.filter(course => {

        const name =
            String(
                course.course_name || ""
            ).toLowerCase();

        return name.includes(search);

    });


renderCourses(filtered);
```

}

// ---------------- DELETE COURSE ----------------

async function deleteCourse(id) {

```
if (
    !confirm(
        "Are you sure you want to delete this course?"
    )
) {

    return;

}


try {

    const response =
        await fetch(
            `${API_URL}/deleteCourse/${id}`,
            {
                method: "DELETE",
                credentials:
                    "include"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to delete course."
        );

        return;
    }


    alert(
        data.message ||
        "Course deleted successfully."
    );


    loadCourses();

} catch (error) {

    console.error(
        "Delete course error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// ---------------- EDIT COURSE ----------------

async function editCourse(id) {

```
const courseName =
    prompt(
        "Enter new course name:"
    );


if (!courseName) return;


try {

    const response =
        await fetch(
            `${API_URL}/updateCourse/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials:
                    "include",

                body:
                    JSON.stringify({
                        course_name:
                            courseName.trim()
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.message ||
            "Failed to update course."
        );

        return;
    }


    alert(
        data.message ||
        "Course updated successfully."
    );


    loadCourses();

} catch (error) {

    console.error(
        "Edit course error:",
        error
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

```
return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
```

}
