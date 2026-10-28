import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

/**
 * CLI parser for command line arguments (e.g. --email=... --password=... --name=...)
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value) {
        parsed[key.trim()] = value.trim();
      }
    }
  }
  return parsed;
}

const run = async () => {
  const cliArgs = parseArgs();

  const email = (cliArgs.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = cliArgs.password || process.env.ADMIN_PASSWORD;
  const name = cliArgs.name || process.env.ADMIN_NAME || 'Platform Administrator';

  if (!email) {
    console.error('Error: Administrator email is required.');
    console.error('Provide it via ADMIN_EMAIL in .env or pass --email=admin@example.com');
    process.exit(1);
  }

  try {
    await connectDB();

    console.log(`\nChecking database for user with email: ${email}...`);
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`[Info] User '${email}' is already an administrator.`);
      } else {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`[Success] Promoted existing user '${email}' to administrator role.`);
      }
    } else {
      if (!password || password.length < 6) {
        console.error('Error: Password must be at least 6 characters long to create a new admin.');
        console.error('Provide it via ADMIN_PASSWORD in .env or pass --password=YourPassword123!');
        await disconnectDB();
        process.exit(1);
      }

      const newAdmin = new User({
        name,
        email,
        password, // User pre-save hook will hash with bcrypt
        role: 'admin',
      });

      await newAdmin.save();
      console.log(`[Success] Created new administrator user:`);
      console.log(`  Name:  ${newAdmin.name}`);
      console.log(`  Email: ${newAdmin.email}`);
      console.log(`  Role:  ${newAdmin.role}`);
      console.log(`  ID:    ${newAdmin._id}`);
    }

    await disconnectDB();
    console.log('\nAdmin initialization completed successfully.\n');
    process.exit(0);
  } catch (error) {
    console.error(`[Error] Failed to initialize admin user: ${error.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

run();
