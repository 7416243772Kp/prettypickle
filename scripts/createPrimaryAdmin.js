require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../models/Admin');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Check if primary admin exists
        const existing = await Admin.findOne({ role: 'primary' });
        if (existing) {
            console.log(`Primary admin already exists: ${existing.email}`);
            console.log('Delete it manually from MongoDB if you want to create a new one.');
            process.exit(0);
        }

        console.log('=== Create Primary Admin ===\n');
        const name = await ask('Admin Name: ');
        const email = await ask('Admin Email: ');
        const password = await ask('Admin Password: ');

        const admin = await Admin.create({
            name,
            email,
            password,
            role: 'primary'
        });

        console.log(`\n✅ Primary admin created successfully!`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`\nLogin at: ${process.env.SITE_URL}/admin-login`);
        console.log('You will be asked to set up TOTP on first login.\n');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
