const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const conn = require('./connect');
const path = require('path');

const app = express();

// Render/other reverse proxies
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ======================= MIDDLEWARE =======================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

// ======================= AUTH =======================

// Register
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Only allow 'admin' role if the logged-in user is an admin
        if (role === 'admin' && req.session.role !== 'admin') {
            req.session.register_error = "Only an admin can create another admin";
            req.session.active_form = "register";
            return res.redirect('/index.html');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if the email is already registered
        const [rows] = await conn.query("SELECT email FROM users WHERE email = ?", [email]);
        if (rows.length > 0) {
            req.session.register_error = "Email already registered";
            req.session.active_form = "register";
            return res.redirect('/index.html');
        }

        // Insert the new user into the database
        await conn.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, role]
        );
        
        // Redirect to the login page
        res.redirect('/index.html');
    } catch (err) {
        res.status(500).send("Error registering user");
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await conn.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length > 0) {
            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.name = user.name;
                req.session.email = user.email;
                req.session.role = user.role;
                return res.redirect(user.role === 'admin' ? '/admin_page.html' : '/user_page.html');
            }
        }
        req.session.login_error = "Incorrect email or password";
        req.session.active_form = "login";
        return res.redirect('/index.html');
    } catch (err) {
        res.status(500).send("Error logging in");
    }
});

// Session Data for Frontend
app.get('/session-data', (req, res) => {
    res.json({
        login_error: req.session.login_error || null,
        register_error: req.session.register_error || null,
        active_form: req.session.active_form || "login"
    });
});

// Current User API
app.get('/currentUser', (req, res) => {
    if (req.session.name) {
        res.json({ name: req.session.name, role: req.session.role });
    } else {
        res.json({ name: "Guest", role: "none" });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/index.html');
    });
});

// ======================= PAGE PROTECTION =======================

function protect(role) {
    return (req, res, next) => {
        if (req.session.role === role) return next();
        res.redirect('/index.html?error=unauthorized');
    };
}

app.get('/admin_page.html', protect('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin_page.html'));
});

app.get('/user_page.html', protect('user'), (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'user_page.html'));
});

app.get('/attendance_report.html', protect('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'attendance_report.html'));
});

// ======================= STUDENTS =======================

app.get('/students', async (req, res) => {
    try {
        const [rows] = await conn.query("SELECT * FROM students ORDER BY sid ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/addStudent', protect('admin'), async (req, res) => {
    const { sid, name, dept } = req.body;
    try {
        await conn.query("INSERT INTO students (sid, name, dept) VALUES (?, ?, ?)", [sid, name, dept]);
        res.send("Student Added");
    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/deleteStudent/:id', async (req, res) => {
    try {
        await conn.query("DELETE FROM students WHERE id=?", [req.params.id]);
        res.send("Deleted");
    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/updateStudent/:id', async (req, res) => {
    const { name, dept } = req.body;
    try {
        await conn.query("UPDATE students SET name=?, dept=? WHERE id=?", [name, dept, req.params.id]);
        res.send("Updated");
    } catch (err) {
        res.status(500).send(err);
    }
});

// ======================= COURSES =======================

app.get('/courses', async (req, res) => {
    try {
        const [rows] = await conn.query("SELECT * FROM courses");
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/addCourse', protect('admin'), async (req, res) => {
    const { course_name } = req.body;
    if (!course_name) return res.status(400).send("Course name required");
    try {
        await conn.query("INSERT INTO courses (course_name) VALUES (?)", [course_name]);
        res.send("Course Added");
    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/deleteCourse/:id', async (req, res) => {
    try {
        await conn.query("DELETE FROM courses WHERE id=?", [req.params.id]);
        res.send("Course Deleted");
    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/updateCourse/:id', async (req, res) => {
    const { course_name } = req.body;
    if (!course_name) return res.status(400).send("Course name required");
    try {
        await conn.query("UPDATE courses SET course_name=? WHERE id=?", [course_name, req.params.id]);
        res.send("Course Updated");
    } catch (err) {
        res.status(500).send(err);
    }
});

// ======================= ATTENDANCE =======================

app.post('/submitAttendance', async (req, res) => {
    const { course_id, date, attendance } = req.body;
    const values = attendance.map(a => [a.student_id, course_id, date, a.status]);
    try {
        await conn.query(
            "INSERT INTO attendance (student_id, course_id, date, status) VALUES ?",
            [values]
        );
        res.send("Attendance Saved");
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/attendance/:date', async (req, res) => {
    try {
        const [rows] = await conn.query("SELECT * FROM attendance WHERE date=?", [req.params.date]);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/attendanceReport', async (req, res) => {
    const { course_id, date } = req.query;
    if (!course_id || !date) return res.status(400).send("Course ID and Date are required");

    const sql = `
        SELECT 
            attendance.id,
            students.sid,
            students.name,
            courses.course_name,
            attendance.status,
            attendance.date
        FROM attendance
        JOIN students ON attendance.student_id = students.id
        JOIN courses ON attendance.course_id = courses.id
        WHERE attendance.course_id = ? AND attendance.date = ?
        ORDER BY students.sid ASC
    `;
    try {
        const [rows] = await conn.query(sql, [course_id, date]);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/updateAttendance', async (req, res) => {
    const updates = req.body.updates;
    try {
        await Promise.all(updates.map(u =>
            conn.query("UPDATE attendance SET status=? WHERE id=?", [u.status, u.id])
        ));
        res.send("Updated");
    } catch (err) {
        res.status(500).send("Error updating attendance");
    }
});

// Simple health check (does not query the database)
app.get('/health', (req, res) => res.json({ ok: true }));

// ======================= SERVER =======================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
