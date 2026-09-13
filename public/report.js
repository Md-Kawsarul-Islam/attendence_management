const API_URL =
"https://attendence-management-xvy5.onrender.com";

let updatedData = {};

// =====================================================
// LOAD COURSES
// =====================================================

async function loadCourses() {

```
try {

    const res =
        await fetch(
            `${API_URL}/courses`,
            {
                credentials: "include"
            }
        );


    if (!res.ok) {

        console.error(
            "Courses request failed:",
            res.status
        );

        return;
    }


    const data =
        await res.json();


    const courseSelect =
        document.getElementById(
            "courseFilter"
        );


    if (!courseSelect) return;


    courseSelect.innerHTML =
        '<option value="">-- Select Course --</option>';


    if (!Array.isArray(data)) return;


    data.forEach(course => {

        const option =
            document.createElement("option");

        option.value =
            course.id;

        option.textContent =
            course.course_name;

        courseSelect.appendChild(option);

    });

} catch (err) {

    console.error(
        "Error loading courses:",
        err
    );

}
```

}

// =====================================================
// LOAD ATTENDANCE REPORT
// =====================================================

async function loadReport() {

```
const courseId =
    document
        .getElementById("courseFilter")
        .value;


const date =
    document
        .getElementById("reportDate")
        .value;


if (!courseId || !date) {

    alert(
        "Please select course and date."
    );

    return;

}


try {

    const res =
        await fetch(
            `${API_URL}/attendanceReport?course_id=${encodeURIComponent(courseId)}&date=${encodeURIComponent(date)}`,
            {
                credentials:
                    "include"
            }
        );


    const data =
        await res.json();


    if (!res.ok) {

        alert(
            data.message ||
            "Unable to load attendance report."
        );

        return;

    }


    updatedData = {};


    const tableBody =
        document.getElementById(
            "reportList"
        );


    if (!tableBody) return;


    tableBody.innerHTML = "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No records found
                </td>
            </tr>
        `;

        return;

    }


    data.forEach(record => {

        updatedData[record.id] =
            record.status;


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                ${escapeHTML(record.sid)}
            </td>

            <td>
                ${escapeHTML(record.name)}
            </td>

            <td>
                ${escapeHTML(record.course_name)}
            </td>

            <td>

                <button
                    type="button"
                    class="present-btn"
                    style="opacity:${
                        record.status === "Present"
                            ? "1"
                            : "0.5"
                    }"
                    onclick="setStatus(
                        ${record.id},
                        'Present',
                        this
                    )"
                >
                    Present
                </button>


                <button
                    type="button"
                    class="absent-btn"
                    style="opacity:${
                        record.status === "Absent"
                            ? "1"
                            : "0.5"
                    }"
                    onclick="setStatus(
                        ${record.id},
                        'Absent',
                        this
                    )"
                >
                    Absent
                </button>

            </td>
        `;


        tableBody.appendChild(row);

    });


} catch (err) {

    console.error(
        "Error loading report:",
        err
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// =====================================================
// SET STATUS
// =====================================================

function setStatus(
id,
status,
btn
) {

```
updatedData[id] =
    status;


const buttons =
    btn.parentElement
        .querySelectorAll("button");


buttons.forEach(button => {

    button.style.opacity =
        "0.5";

});


btn.style.opacity =
    "1";
```

}

// =====================================================
// UPDATE ATTENDANCE
// =====================================================

async function updateAttendance() {

```
const updates =
    Object.keys(updatedData)
        .map(id => ({

            id:
                parseInt(id, 10),

            status:
                updatedData[id]

        }));


if (updates.length === 0) {

    alert(
        "No attendance records to update."
    );

    return;

}


try {

    const res =
        await fetch(
            `${API_URL}/updateAttendance`,
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
                        updates
                    })
            }
        );


    const data =
        await res.json();


    if (!res.ok) {

        alert(
            data.message ||
            "Error updating attendance."
        );

        return;

    }


    alert(
        data.message ||
        "Attendance updated successfully."
    );


    await loadReport();


} catch (err) {

    console.error(
        "Error updating attendance:",
        err
    );

    alert(
        "Unable to connect to server."
    );

}
```

}

// =====================================================
// DATE LIMIT
// =====================================================

function setDateLimit() {

```
const today =
    new Date()
        .toISOString()
        .split("T")[0];


const dateInput =
    document.getElementById(
        "reportDate"
    );


if (!dateInput) return;


dateInput.setAttribute(
    "max",
    today
);


dateInput.value =
    today;
```

}

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

```
return String(
    value ?? ""
)
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );
```

}

// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
"DOMContentLoaded",
() => {

```
    loadCourses();

    setDateLimit();

}
```

);
