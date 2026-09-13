```js
let attendanceData = {};

const API_URL =
    "https://attendence-management-xvy5.onrender.com";


// =======================
// Page Load
// =======================
window.addEventListener("load", function () {

    loadCourses();

    // Set today's date
    const today =
        new Date().toISOString().split("T")[0];

    const dateInput =
        document.getElementById("attendanceDate");

    if (dateInput) {
        dateInput.value = today;
        dateInput.max = today;
    }
});


// =======================
// Load Courses
// =======================
async function loadCourses() {

    try {

        const res =
            await fetch(
                `${API_URL}/courses`,
                {
                    credentials: "include"
                }
            );

        if (!res.ok) {
            throw new Error(
                `Failed to load courses: ${res.status}`
            );
        }

        const courses =
            await res.json();

        const select =
            document.getElementById("courseSelect");

        select.innerHTML =
            '<option value="">Select Course</option>';

        courses.forEach(course => {

            const option =
                document.createElement("option");

            option.value = course.id;

            option.textContent =
                course.course_name;

            select.appendChild(option);
        });

    } catch (err) {

        console.error(
            "Error loading courses:",
            err
        );

        alert(
            "Unable to load courses. Please refresh the page."
        );
    }
}


// =======================
// Load Students
// =======================
async function loadStudents() {

    const course_id =
        document.getElementById(
            "courseSelect"
        ).value;

    const date =
        document.getElementById(
            "attendanceDate"
        ).value;


    if (!course_id || !date) {

        alert(
            "Please select course and date first."
        );

        return;
    }


    try {

        const res =
            await fetch(
                `${API_URL}/students?course_id=${encodeURIComponent(course_id)}`,
                {
                    credentials: "include"
                }
            );


        if (!res.ok) {

            if (res.status === 401) {

                alert(
                    "Your session has expired. Please login again."
                );

                window.location.href = "/";

                return;
            }

            throw new Error(
                `Failed to load students: ${res.status}`
            );
        }


        const students =
            await res.json();


        const list =
            document.getElementById(
                "studentList"
            );

        list.innerHTML = "";

        attendanceData = {};


        if (!Array.isArray(students) ||
            students.length === 0) {

            list.innerHTML = `
                <tr>
                    <td colspan="3">
                        No students found.
                    </td>
                </tr>
            `;

            return;
        }


        students.forEach(student => {

            // Default status = Absent
            attendanceData[student.id] =
                "Absent";


            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>
                    ${escapeHTML(student.sid)}
                </td>

                <td>
                    ${escapeHTML(student.name)}
                </td>

                <td class="action-cell">

                    <button
                        type="button"
                        class="present-btn"
                        onclick="markAttendance(
                            ${student.id},
                            'Present',
                            this
                        )">
                        Present
                    </button>

                    <button
                        type="button"
                        class="absent-btn"
                        style="opacity: 1"
                        onclick="markAttendance(
                            ${student.id},
                            'Absent',
                            this
                        )">
                        Absent
                    </button>

                </td>
            `;


            list.appendChild(row);
        });


    } catch (err) {

        console.error(
            "Error loading students:",
            err
        );

        alert(
            "Unable to load students."
        );
    }
}


// =======================
// Mark Attendance
// =======================
function markAttendance(
    studentId,
    status,
    btn
) {

    attendanceData[studentId] =
        status;


    const buttons =
        btn.parentElement
            .querySelectorAll("button");


    buttons.forEach(button => {

        button.style.opacity =
            "0.4";
    });


    btn.style.opacity =
        "1";
}


// =======================
// Submit Attendance
// =======================
async function submitAttendance() {

    const course_id =
        document.getElementById(
            "courseSelect"
        ).value;

    const date =
        document.getElementById(
            "attendanceDate"
        ).value;


    if (!course_id || !date) {

        alert(
            "Please select course and date."
        );

        return;
    }


    const studentIds =
        Object.keys(attendanceData);


    if (studentIds.length === 0) {

        alert(
            "Please load students first."
        );

        return;
    }


    const attendanceList =
        studentIds.map(id => ({

            student_id:
                Number(id),

            status:
                attendanceData[id]

        }));


    try {

        const res =
            await fetch(
                `${API_URL}/submitAttendance`,
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
                            course_id:
                                Number(course_id),

                            date:
                                date,

                            attendance:
                                attendanceList
                        })
                }
            );


        const data =
            await res.json();


        if (!res.ok) {

            if (res.status === 401) {

                alert(
                    "Your session has expired. Please login again."
                );

                window.location.href = "/";

                return;
            }


            alert(
                data.message ||
                "Failed to submit attendance."
            );

            return;
        }


        alert(
            data.message ||
            "Attendance Submitted Successfully!"
        );


        // Redirect to report page
        window.location.href =
            `/attendance_report.html?course_id=${encodeURIComponent(course_id)}&date=${encodeURIComponent(date)}`;


    } catch (err) {

        console.error(
            "Error submitting attendance:",
            err
        );

        alert(
            "Unable to connect to server. Please try again."
        );
    }
}


// =======================
// HTML Escape
// =======================
function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
```
