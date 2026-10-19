/**
 * CLI SECURE INITIAL ADMINISTRATOR BOOTSTRAP SCRIPT
 * Usage:
 *   node server/scripts/setup-admin.js --name "Admin Name" --email "admin@jito.org" --phone "+91 99999 11111" --password "StrongPass123!"
 */

const db = require('../database/db');
const adminService = require('../services/adminService');
const config = require('../config/env');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      parsed[key] = val;
    }
  }
  return parsed;
}

async function run() {
  console.log('================================================================');
  console.log(' COMMUNITY MULTISPORTS — SECURE ADMIN BOOTSTRAP TOOL');
  console.log('================================================================');

  const needed = await adminService.isInitialAdminSetupNeeded();
  if (!needed) {
    console.error('[ERROR] Initial administrator setup is locked. An admin account already exists in the database.');
    process.exit(1);
  }

  const args = parseArgs();
  const fullName = args.name || 'Master Tournament Administrator';
  const email = args.email || 'admin@jito.org';
  const phone = args.phone || '+91 98200 00000';
  const password = args.password || 'AdminRootSecure2026!';

  try {
    const result = await adminService.setupInitialAdmin({
      fullName,
      email,
      phone,
      password,
      setupSecret: config.adminSetupSecret
    });

    console.log('\n✅ Initial Administrator Created Successfully!');
    console.log('----------------------------------------------------------------');
    console.log(` Player ID : ${result.admin.player_id}`);
    console.log(` Full Name : ${result.admin.full_name}`);
    console.log(` Email     : ${result.admin.email}`);
    console.log(` Role      : ${result.admin.role}`);
    console.log(` Status    : ${result.admin.status}`);
    console.log('----------------------------------------------------------------');
    console.log('🔐 Setup is now PERMANENTLY LOCKED against subsequent invocations.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Admin setup failed:', err.message);
    process.exit(1);
  }
}

run();
