require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

// Verify database connection before starting server
pool.query("SELECT NOW()")
    .then(() => {
        app.listen(PORT, () => {
            process.stdout.write(`Server running on port ${PORT}\n`);
        });
    })
    .catch((err) => {
        process.stderr.write(`Database connection failed: ${err.message}\n`);
        process.exit(1);
    });