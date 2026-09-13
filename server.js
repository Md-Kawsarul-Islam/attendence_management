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

const IS_PRODUCTION =
    process.env.NODE_ENV === 'production';


// ======================================================
// TRUST RENDER PROXY
// ======================================================

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}


// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    'https://attendence-management-nine.vercel.app',
    FRONTEND_URL
].map(origin => origin.replace(/\/$/, '').trim());

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.setHeader(
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


// ======================================================
// STATIC FILES
// ======================================================

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
            'attendance-management-session-secret',

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            sameSite: IS_PRODUCTION
                ? 'none'
                : 'lax',

            secure: IS_PRODUCTION,

            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);


// ======================================================
// HELPER FUNCTIONS
// ======================================================

function sendSuccess(res, message, data = {}) {
    return res.status(200).json({
        success: true,
        message,
        ...data
    });
}


function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}


// ======================================================
// REGISTER
// ======================================================

app.post('/register', async (req, res) => {
    const {
        name,
        email,
        password,
        role
    } = req.body;

    try {

        // ----------------------------------------------
        // Validation
        // ----------------------------------------------

        if (!name || !email || !password || !role) {
            return sendError(
                res,
                400,
                'All fields are required'
            );
        }


        // ----------------------------------------------
        // Validate role
        // ----------------------------------------------

        const allowedRoles = ['user', 'admin'];

        if (!allowedRoles.includes(role)) {
            return sendError(
                res,
                400,
                'Invalid role'
            );
        }


        // ----------------------------------------------
        // Only admin can create admin
        // ----------------------------------------------

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


        // ----------------------------------------------
        // Check existing email
        // ----------------------------------------------

        const [existingUsers] = await conn.query(
            'SELECT email FROM users WHERE email = ?',
            [email]
        );


        if (existingUsers.length > 0) {
            return sendError(
                res,
                409,
                'Email already registered'
            );
        }


        // ----------------------------------------------
        // Hash password
        // ----------------------------------------------

        const hashedPassword =
            await bcrypt.hash(password, 10);


        // ----------------------------------------------
        // Create user
        // ----------------------------------------------

        const sql =
            'INSERT INTO users ' +
            '(name, email, password, role) ' +
            'VALUES (?, ?, ?, ?)';

        await conn.query(
            sql,
            [
                name,
                email,
                hashedPassword,
                role
            ]
        );


        // ----------------------------------------------
        // Success
        // ----------------------------------------------

        return sendSuccess(
            res,
            'Registration successful. Please login.'
        );

    } catch (error) {

        console.error(
            'REGISTER ERROR:',
            error
        );

        return sendError(
            res,
            500,
            'Error registering user'
        );
    }
});


// ======================================================
// LOGIN
// ======================================================

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return sendError(
                res,
                400,
                'Email and password are required'
            );
        }

        const [users] = await conn.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return sendError(
                res,
                401,
                'Incorrect email or password'
            );
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return sendError(
                res,
                401,
                'Incorrect email or password'
            );
        }

        req.session.name = user.name;
        req.session.email = user.email;
        req.session.role = user.role;

        req.session.save((error) => {
            if (error) {
                console.error('SESSION SAVE ERROR:', error);

                return sendError(
                    res,
                    500,
                    'Unable to create login session'
                );
            }

            // Normal browser form submission
            if (
                req.headers.accept &&
                req.headers.accept.includes('text/html')
            ) {
                if (user.role === 'admin') {
                    return res.redirect('/admin_page.html');
                }

                return res.redirect('/user_page.html');
            }

            // Fetch/API login
            return sendSuccess(
                res,
                'Login successful',
                {
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            );
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);

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

    const data = {
        login_error:
            req.session.login_error || null,

        register_error:
            req.session.register_error || null,

        active_form:
            req.session.active_form || 'login'
    };


    delete req.session.login_error;
    delete req.session.register_error;
    delete req.session.active_form;


    return res.json(data);
});


// ======================================================
// CURRENT USER
// ======================================================

app.get('/currentUser', (req, res) => {

    if (
        req.session &&
        req.session.name &&
        req.session.role
    ) {

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
        email: null,
        role: 'none'
    });
});


// ======================================================
// LOGOUT
// ======================================================

app.get('/logout', (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                'LOGOUT ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Logout failed'
            );
        }

        res.clearCookie(
            'connect.sid',
            {
                httpOnly: true,

                sameSite: IS_PRODUCTION
                    ? 'none'
                    : 'lax',

                secure: IS_PRODUCTION
            }
        );

        // Redirect to login page
        return res.redirect('/');
    });
});


// ======================================================
// AUTHENTICATION / ROLE PROTECTION
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

        return res.sendFile(
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

        return res.sendFile(
            path.join(
                __dirname,
                'private',
                'user_page.html'
            )
        );
    }
);


// ======================================================
// ATTENDANCE REPORT PAGE
// ======================================================

app.get(
    '/attendance_report.html',
    protect('admin'),
    (req, res) => {

        return res.sendFile(
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


// GET STUDENTS
app.get('/students', async (req, res) => {

    try {

        const [rows] = await conn.query(
            'SELECT * FROM students ORDER BY sid ASC'
        );

        return res.json(rows);

    } catch (error) {

        console.error(
            'GET STUDENTS ERROR:',
            error
        );

        return sendError(
            res,
            500,
            'Failed to load students'
        );
    }
});


// ADD STUDENT
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

            if (!sid || !name || !dept) {
                return sendError(
                    res,
                    400,
                    'Student ID, name and department are required'
                );
            }


            const sql =
                'INSERT INTO students ' +
                '(sid, name, dept) ' +
                'VALUES (?, ?, ?)';


            await conn.query(
                sql,
                [
                    sid,
                    name,
                    dept
                ]
            );


            return sendSuccess(
                res,
                'Student Added'
            );

        } catch (error) {

            console.error(
                'ADD STUDENT ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to add student'
            );
        }
    }
);


// DELETE STUDENT
app.delete(
    '/deleteStudent/:id',
    protect('admin'),
    async (req, res) => {

        try {

            await conn.query(
                'DELETE FROM students WHERE id = ?',
                [req.params.id]
            );


            return sendSuccess(
                res,
                'Student Deleted'
            );

        } catch (error) {

            console.error(
                'DELETE STUDENT ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to delete student'
            );
        }
    }
);


// UPDATE STUDENT
app.put(
    '/updateStudent/:id',
    protect('admin'),
    async (req, res) => {

        const {
            name,
            dept
        } = req.body;

        try {

            if (!name || !dept) {
                return sendError(
                    res,
                    400,
                    'Name and department are required'
                );
            }


            const sql =
                'UPDATE students ' +
                'SET name = ?, dept = ? ' +
                'WHERE id = ?';


            await conn.query(
                sql,
                [
                    name,
                    dept,
                    req.params.id
                ]
            );


            return sendSuccess(
                res,
                'Student Updated'
            );

        } catch (error) {

            console.error(
                'UPDATE STUDENT ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to update student'
            );
        }
    }
);


// ======================================================
// COURSES
// ======================================================


// GET COURSES
app.get('/courses', async (req, res) => {

    try {

        const [rows] = await conn.query(
            'SELECT * FROM courses'
        );

        return res.json(rows);

    } catch (error) {

        console.error(
            'GET COURSES ERROR:',
            error
        );

        return sendError(
            res,
            500,
            'Failed to load courses'
        );
    }
});


// ADD COURSE
app.post(
    '/addCourse',
    protect('admin'),
    async (req, res) => {

        const {
            course_name
        } = req.body;

        try {

            if (!course_name) {
                return sendError(
                    res,
                    400,
                    'Course name required'
                );
            }


            const sql =
                'INSERT INTO courses ' +
                '(course_name) ' +
                'VALUES (?)';


            await conn.query(
                sql,
                [course_name]
            );


            return sendSuccess(
                res,
                'Course Added'
            );

        } catch (error) {

            console.error(
                'ADD COURSE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to add course'
            );
        }
    }
);


// DELETE COURSE
app.delete(
    '/deleteCourse/:id',
    protect('admin'),
    async (req, res) => {

        try {

            await conn.query(
                'DELETE FROM courses WHERE id = ?',
                [req.params.id]
            );


            return sendSuccess(
                res,
                'Course Deleted'
            );

        } catch (error) {

            console.error(
                'DELETE COURSE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to delete course'
            );
        }
    }
);


// UPDATE COURSE
app.put(
    '/updateCourse/:id',
    protect('admin'),
    async (req, res) => {

        const {
            course_name
        } = req.body;

        try {

            if (!course_name) {
                return sendError(
                    res,
                    400,
                    'Course name required'
                );
            }


            const sql =
                'UPDATE courses ' +
                'SET course_name = ? ' +
                'WHERE id = ?';


            await conn.query(
                sql,
                [
                    course_name,
                    req.params.id
                ]
            );


            return sendSuccess(
                res,
                'Course Updated'
            );

        } catch (error) {

            console.error(
                'UPDATE COURSE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to update course'
            );
        }
    }
);


// ======================================================
// ATTENDANCE
// ======================================================


// SUBMIT ATTENDANCE
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

            return sendError(
                res,
                400,
                'Invalid attendance data'
            );
        }


        const values = attendance.map(
            (item) => [
                item.student_id,
                course_id,
                date,
                item.status
            ]
        );


        try {

            await conn.query(
                'INSERT INTO attendance ' +
                '(student_id, course_id, date, status) ' +
                'VALUES ?',
                [values]
            );


            return sendSuccess(
                res,
                'Attendance Saved'
            );

        } catch (error) {

            console.error(
                'SUBMIT ATTENDANCE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to save attendance'
            );
        }
    }
);


// GET ATTENDANCE BY DATE
app.get(
    '/attendance/:date',
    async (req, res) => {

        try {

            const [rows] = await conn.query(
                'SELECT * FROM attendance WHERE date = ?',
                [req.params.date]
            );


            return res.json(rows);

        } catch (error) {

            console.error(
                'GET ATTENDANCE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to load attendance'
            );
        }
    }
);


// ATTENDANCE REPORT
app.get(
    '/attendanceReport',
    protect('admin'),
    async (req, res) => {

        const {
            course_id,
            date
        } = req.query;


        if (!course_id || !date) {

            return sendError(
                res,
                400,
                'Course ID and Date are required'
            );
        }


        const sql =
            'SELECT ' +
            'attendance.id, ' +
            'students.sid, ' +
            'students.name, ' +
            'courses.course_name, ' +
            'attendance.status, ' +
            'attendance.date ' +
            'FROM attendance ' +
            'JOIN students ' +
            'ON attendance.student_id = students.id ' +
            'JOIN courses ' +
            'ON attendance.course_id = courses.id ' +
            'WHERE attendance.course_id = ? ' +
            'AND attendance.date = ? ' +
            'ORDER BY students.sid ASC';


        try {

            const [rows] = await conn.query(
                sql,
                [
                    course_id,
                    date
                ]
            );


            return res.json(rows);

        } catch (error) {

            console.error(
                'ATTENDANCE REPORT ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Failed to load attendance report'
            );
        }
    }
);


// UPDATE ATTENDANCE
app.put(
    '/updateAttendance',
    protect('admin'),
    async (req, res) => {

        const updates =
            req.body.updates;


        if (!Array.isArray(updates)) {

            return sendError(
                res,
                400,
                'Invalid updates'
            );
        }


        try {

            for (const item of updates) {

                await conn.query(
                    'UPDATE attendance ' +
                    'SET status = ? ' +
                    'WHERE id = ?',
                    [
                        item.status,
                        item.id
                    ]
                );
            }


            return sendSuccess(
                res,
                'Attendance Updated'
            );

        } catch (error) {

            console.error(
                'UPDATE ATTENDANCE ERROR:',
                error
            );

            return sendError(
                res,
                500,
                'Error updating attendance'
            );
        }
    }
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {

    return res.json({
        ok: true,
        message: 'Attendance backend is running'
    });
});


// ======================================================
// ROOT
// ======================================================

app.get('/', (req, res) => {

    return res.json({
        success: true,
        message: 'Attendance Management API is running'
    });
});


// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {

    return res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {

    console.error(
        'GLOBAL ERROR:',
        error
    );

    return res.status(500).json({
        success: false,
        message: 'Internal server error'
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

            console.log(
                `Production mode: ${IS_PRODUCTION}`
            );
        }
    );
}


module.exports = app;