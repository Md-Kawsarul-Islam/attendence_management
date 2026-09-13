```javascript
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const conn = require('./connect');
const path = require('path');

const app = express();

// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    'https://attendence-management-nine.vercel.app';


// ======================================================
// TRUST RENDER PROXY
// ======================================================

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}


// ======================================================
// CORS
// ======================================================

app.use((req, res, next) => {

    const origin = req.headers.origin;

    if (origin === FRONTEND_URL) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,OPTIONS'
    );

    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());


// Public frontend files
app.use(express.static(
    path.join(__dirname, 'public')
));


// ======================================================
// SESSION
// ======================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            'change-this-session-secret',

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            // Required because Vercel and Render
            // are different origins.
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',

            secure:
                process.env.NODE_ENV === 'production',

            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);


// ======================================================
// HELPER FUNCTIONS
// ======================================================

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}


function sendSuccess(res, message, extra = {}) {
    return res.json({
        success: true,
        message,
        ...extra
    });
}


// ======================================================
// AUTH
// ======================================================


// ====================== REGISTER ======================

app.post('/register', async (req, res) => {

    const {
        name,
        email,
        password,
        role
    } = req.body;

    try {

        if (!name || !email || !password || !role) {
            return sendError(
                res,
                400,
                'All fields are required'
            );
        }


        // Only an existing admin can create another admin.
        if (
            role === 'admin' &&
            req.session.role !== 'admin'
        ) {
            return sendError(
                res,
                403,
                'Only an admin can create another admin'
            );
        }


        // Check existing email
        const [rows] = await conn.query(
            'SELECT email FROM users WHERE email = ?',
            [email]
        );


        if (rows.length > 0) {
            return sendError(
                res,
                409,
                'Email already registered'
            );
        }


        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Insert user
        await conn.query(
            `
            INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)
            `,
            [
                name,
                email,
                hashedPassword,
                role
            ]
        );


        return sendSuccess(
            res,
            'Registration successful. Please login.'
        );

    } catch (err) {

        console.error(
            'REGISTER ERROR:',
            err
        );

        return sendError(
            res,
            500,
            'Error registering user'
        );
    }
});


// ====================== LOGIN ======================

app.post('/login', async (req, res) => {

    const {
        email,
        password
    } = req.body;


    try {

        if (!email || !password) {
            return sendError(
                res,
                400,
                'Email and password are required'
            );
        }


        const [rows] = await conn.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );


        if (rows.length === 0) {
            return sendError(
                res,
                401,
                'Incorrect email or password'
            );
        }


        const user = rows[0];


        const match =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!match) {
            return sendError(
                res,
                401,
                'Incorrect email or password'
            );
        }


        // ==============================
        // CREATE SESSION
        // ==============================

        req.session.name = user.name;

        req.session.email = user.email;

        req.session.role = user.role;


        // Explicitly save session before
        // sending response.
        req.session.save((err) => {

            if (err) {

                console.error(
                    'SESSION SAVE ERROR:',
                    err
                );

                return sendError(
                    res,
                    500,
                    'Unable to create login session'
                );
            }


            return sendSuccess(
                res,
                'Login successful',
                {
                    role: user.role,
                    name: user.name,
                    email: user.email
                }
            );

        });

    } catch (err) {

        console.error(
            'LOGIN ERROR:',
            err
        );

        return sendError(
            res,
            500,
            'Error logging in'
        );
    }
});


// ======================================================
// SESSION DATA
// ======================================================

app.get('/session-data', (req, res) => {

    res.json({

        login_error:
            req.session.login_error || null,

        register_error:
            req.session.register_error || null,

        active_form:
            req.session.active_form || 'login'
    });


    // Clear old messages
    delete req.session.login_error;
    delete req.session.register_error;
    delete req.session.active_form;
});


// ======================================================
// CURRENT USER
// ======================================================

app.get('/currentUser', (req, res) => {

    if (req.session.name) {

        return res.json({
            success: true,
            loggedIn: true,
            name: req.session.name,
            email: req.session.email,
            role: req.session.role
        });

    }


    return res.json({
        success: true,
        loggedIn: false,
        name: 'Guest',
        role: 'none'
    });
});


// ======================================================
// LOGOUT
// ======================================================

app.get('/logout', (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.error(
                'LOGOUT ERROR:',
                err
            );

            return sendError(
                res,
                500,
                'Logout failed'
            );
        }


        res.clearCookie('connect.sid', {
            httpOnly: true,
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            secure:
                process.env.NODE_ENV === 'production'
        });


        return sendSuccess(
            res,
            'Logout successful'
        );
    });
});


// ======================================================
// PAGE PROTECTION
// ======================================================

function protect(role) {

    return (req, res, next) => {

        if (
            req.session &&
            req.session.role === role
        ) {
            return next();
        }


        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    };
}


// ======================================================
// ADMIN PAGE
// ======================================================

app.get(
    '/admin_page.html',
    protect('admin'),
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'private',
                'admin_page.html'
            )
        );
    }
);


// ======================================================
// USER PAGE
// ======================================================

app.get(
    '/user_page.html',
    protect('user'),
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'private',
                'user_page.html'
            )
        );
    }
);


// ======================================================
// ATTENDANCE REPORT
// ======================================================

app.get(
    '/attendance_report.html',
    protect('admin'),
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'private',
                'attendance_report.html'
            )
        );
    }
);


// ======================================================
// STUDENTS
// ======================================================

app.get('/students', async (req, res) => {

    try {

        const [rows] = await conn.query(
            'SELECT * FROM students ORDER BY sid ASC'
        );

        res.json(rows);

    } catch (err) {

        console.error(
            'GET STUDENTS ERROR:',
            err
        );

        res.status(500).json({
            success: false,
            message: 'Failed to load students'
        });
    }
});


app.post(
    '/addStudent',
    protect('admin'),
    async (req, res) => {

        const {
            sid,
            name,
            dept
        } = req.body;

        try {

            await conn.query(
                `
                INSERT INTO students
                (sid, name, dept)
                VALUES (?, ?, ?)
                `,
                [
                    sid,
                    name,
                    dept
                ]
            );

            res.json({
                success: true,
                message: 'Student Added'
            });

        } catch (err) {

            console.error(
                'ADD STUDENT ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to add student'
            });
        }
    }
);


app.delete(
    '/deleteStudent/:id',
    protect('admin'),
    async (req, res) => {

        try {

            await conn.query(
                'DELETE FROM students WHERE id = ?',
                [req.params.id]
            );

            res.json({
                success: true,
                message: 'Deleted'
            });

        } catch (err) {

            console.error(
                'DELETE STUDENT ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to delete student'
            });
        }
    }
);


app.put(
    '/updateStudent/:id',
    protect('admin'),
    async (req, res) => {

        const {
            name,
            dept
        } = req.body;

        try {

            await conn.query(
                `
                UPDATE students
                SET name = ?, dept = ?
                WHERE id = ?
                `,
                [
                    name,
                    dept,
                    req.params.id
                ]
            );

            res.json({
                success: true,
                message: 'Updated'
            });

        } catch (err) {

            console.error(
                'UPDATE STUDENT ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to update student'
            });
        }
    }
);


// ======================================================
// COURSES
// ======================================================

app.get('/courses', async (req, res) => {

    try {

        const [rows] = await conn.query(
            'SELECT * FROM courses'
        );

        res.json(rows);

    } catch (err) {

        console.error(
            'GET COURSES ERROR:',
            err
        );

        res.status(500).json({
            success: false,
            message: 'Failed to load courses'
        });
    }
});


app.post(
    '/addCourse',
    protect('admin'),
    async (req, res) => {

        const {
            course_name
        } = req.body;

        if (!course_name) {

            return res.status(400).json({
                success: false,
                message: 'Course name required'
            });
        }

        try {

            await conn.query(
                `
                INSERT INTO courses
                (course_name)
                VALUES (?)
                `,
                [course_name]
            );

            res.json({
                success: true,
                message: 'Course Added'
            });

        } catch (err) {

            console.error(
                'ADD COURSE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to add course'
            });
        }
    }
);


app.delete(
    '/deleteCourse/:id',
    protect('admin'),
    async (req, res) => {

        try {

            await conn.query(
                'DELETE FROM courses WHERE id = ?',
                [req.params.id]
            );

            res.json({
                success: true,
                message: 'Course Deleted'
            });

        } catch (err) {

            console.error(
                'DELETE COURSE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to delete course'
            });
        }
    }
);


app.put(
    '/updateCourse/:id',
    protect('admin'),
    async (req, res) => {

        const {
            course_name
        } = req.body;

        if (!course_name) {

            return res.status(400).json({
                success: false,
                message: 'Course name required'
            });
        }

        try {

            await conn.query(
                `
                UPDATE courses
                SET course_name = ?
                WHERE id = ?
                `,
                [
                    course_name,
                    req.params.id
                ]
            );

            res.json({
                success: true,
                message: 'Course Updated'
            });

        } catch (err) {

            console.error(
                'UPDATE COURSE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to update course'
            });
        }
    }
);


// ======================================================
// ATTENDANCE
// ======================================================

app.post(
    '/submitAttendance',
    protect('admin'),
    async (req, res) => {

        const {
            course_id,
            date,
            attendance
        } = req.body;


        if (
            !course_id ||
            !date ||
            !Array.isArray(attendance) ||
            attendance.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message: 'Invalid attendance data'
            });
        }


        const values = attendance.map(
            (a) => [
                a.student_id,
                course_id,
                date,
                a.status
            ]
        );


        try {

            await conn.query(
                `
                INSERT INTO attendance
                (student_id, course_id, date, status)
                VALUES ?
                `,
                [values]
            );

            res.json({
                success: true,
                message: 'Attendance Saved'
            });

        } catch (err) {

            console.error(
                'SUBMIT ATTENDANCE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to save attendance'
            });
        }
    }
);


app.get(
    '/attendance/:date',
    async (req, res) => {

        try {

            const [rows] = await conn.query(
                `
                SELECT *
                FROM attendance
                WHERE date = ?
                `,
                [req.params.date]
            );

            res.json(rows);

        } catch (err) {

            console.error(
                'GET ATTENDANCE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: 'Failed to load attendance'
            });
        }
    }
);


app.get(
    '/attendanceReport',
    protect('admin'),
    async (req, res) => {

        const {
            course_id,
            date
        } = req.query;


        if (!course_id || !date) {

            return res.status(400).json({
                success: false,
                message:
                    'Course ID and Date are required'
            });
        }


        const sql = `
            SELECT
                attendance.id,
                students.sid,
                students.name,
                courses.course_name,
                attendance.status,
                attendance.date
            FROM attendance
            JOIN students
                ON attendance.student_id = students.id
            JOIN courses
                ON attendance.course_id = courses.id
            WHERE attendance.course_id = ?
                AND attendance.date = ?
            ORDER BY students.sid ASC
        `;


        try {

            const [rows] =
                await conn.query(
                    sql,
                    [
                        course_id,
                        date
                    ]
                );

            res.json(rows);

        } catch (err) {

            console.error(
                'ATTENDANCE REPORT ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message:
                    'Failed to load attendance report'
            });
        }
    }
);


app.put(
    '/updateAttendance',
    protect('admin'),
    async (req, res) => {

        const updates =
            req.body.updates;


        if (!Array.isArray(updates)) {

            return res.status(400).json({
                success: false,
                message: 'Invalid updates'
            });
        }


        try {

            await Promise.all(
                updates.map(
                    (u) =>
                        conn.query(
                            `
                            UPDATE attendance
                            SET status = ?
                            WHERE id = ?
                            `,
                            [
                                u.status,
                                u.id
                            ]
                        )
                )
            );


            res.json({
                success: true,
                message: 'Updated'
            });

        } catch (err) {

            console.error(
                'UPDATE ATTENDANCE ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message:
                    'Error updating attendance'
            });
        }
    }
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {

    res.json({
        ok: true,
        message: 'Attendance backend is running'
    });

});


// ======================================================
// ROOT
// ======================================================

app.get('/', (req, res) => {

    res.json({
        success: true,
        message: 'Attendance Management API is running'
    });

});


// ======================================================
// SERVER
// ======================================================

if (require.main === module) {

    app.listen(
        PORT,
        () => {

            console.log(
                `Server running on port ${PORT}`
            );

            console.log(
                `Frontend URL: ${FRONTEND_URL}`
            );
        }
    );
}


module.exports = app;
```
