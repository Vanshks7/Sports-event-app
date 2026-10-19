/**
 * COMPREHENSIVE AUTOMATED TEST SUITE:
 * Registration, Authentication, Unique Player IDs, Duplicate Prevention, RBAC & Security
 */

const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set isolated test environment
process.env.NODE_ENV = 'test';
const testDbPath = path.resolve(__dirname, 'test_multisports.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DATABASE_URL = `sqlite:${testDbPath}`;

const db = require('../server/database/db');
const { runMigrations } = require('../server/database/migrator');
const authService = require('../server/services/authService');
const playerService = require('../server/services/playerService');
const adminService = require('../server/services/adminService');
const config = require('../server/config/env');

let passedTests = 0;
let failedTests = 0;

async function runTest(testName, fn) {
  process.stdout.write(`• ${testName} ... `);
  try {
    await fn();
    console.log('✅ PASS');
    passedTests++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(`  Error: ${err.message}`);
    if (err.stack) console.error(`  ${err.stack.split('\n')[1]}`);
    failedTests++;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' RUNNING COMMUNITY MULTISPORTS TEST SUITE');
  console.log('================================================================\n');

  // 1. Initialize DB and run migrations
  db.init(`sqlite:${testDbPath}`);
  await runMigrations();

  let malePlayerResult;
  let femalePlayerResult;
  let adminResult;

  // ---------------------------------------------------------------------------
  // SUITE 1: REGISTRATION & PERMANENT UNIQUE PLAYER IDs
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Registration & Unique Player ID Engine ---');

  await runTest('1.1: Register male player and assign MP prefix', async () => {
    malePlayerResult = await authService.registerPlayer({
      fullName: 'Rohan Gupta',
      email: 'rohan.gupta@example.com',
      phone: '+91 98111 00001',
      gender: 'MALE',
      dateOfBirth: '1995-04-12',
      ageGroup: '26-35',
      emergencyContact: 'Mr. Gupta (+91 98111 99999)',
      sports: ['pickleball', 'box_cricket'],
      skillLevel: { pickleball: 'INTERMEDIATE', box_cricket: 'ADVANCED' }
    });

    assert.ok(malePlayerResult.user);
    assert.strictEqual(malePlayerResult.user.player_id, 'MP1001');
    assert.strictEqual(malePlayerResult.user.role, 'PLAYER');
    assert.strictEqual(malePlayerResult.user.status, 'PENDING_PASSWORD');
    assert.ok(malePlayerResult.setupToken, 'Setup token should be generated for password establishment');
    assert.strictEqual(malePlayerResult.user.preferences.plays_pickleball, 1);
    assert.strictEqual(malePlayerResult.user.preferences.plays_box_cricket, 1);
    assert.strictEqual(malePlayerResult.user.preferences.plays_paddle, 0);
  });

  await runTest('1.2: Register female player and assign FP prefix', async () => {
    femalePlayerResult = await authService.registerPlayer({
      fullName: 'Sneha Rao',
      email: 'sneha.rao@example.com',
      phone: '+91 98111 00002',
      gender: 'FEMALE',
      ageGroup: '18-25',
      sports: ['paddle_ball', 'pickleball'],
      skillLevel: { paddle_ball: 'ADVANCED', pickleball: 'BEGINNER' }
    });

    assert.ok(femalePlayerResult.user);
    assert.strictEqual(femalePlayerResult.user.player_id, 'FP1001');
    assert.strictEqual(femalePlayerResult.user.status, 'PENDING_PASSWORD');
    assert.strictEqual(femalePlayerResult.user.preferences.plays_paddle, 1);
  });

  await runTest('1.3: Sequential deterministic ID allocation (next male gets MP1002)', async () => {
    const player3 = await authService.registerPlayer({
      fullName: 'Kunal Verma',
      email: 'kunal.verma@example.com',
      phone: '+91 98111 00003',
      gender: 'MALE',
      sports: ['pickleball']
    });

    assert.strictEqual(player3.user.player_id, 'MP1002');
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: DUPLICATE PREVENTION & SAFE REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Duplicate Prevention & Safe Conflict Handling ---');

  await runTest('2.1: Duplicate email registration is safely rejected with 409', async () => {
    try {
      await authService.registerPlayer({
        fullName: 'Rohan Duplicate',
        email: 'rohan.gupta@example.com', // Duplicate
        phone: '+91 98999 88888',
        gender: 'MALE'
      });
      assert.fail('Should have thrown conflict error');
    } catch (err) {
      assert.strictEqual(err.status, 409);
      assert.ok(err.message.includes('already registered'));
      assert.strictEqual(err.existingPlayerId, 'MP1001');
    }
  });

  await runTest('2.2: Duplicate phone number is safely rejected with 409', async () => {
    try {
      await authService.registerPlayer({
        fullName: 'Sneha Clone',
        email: 'different.email@example.com',
        phone: '+91 98111 00002', // Duplicate phone of Sneha
        gender: 'FEMALE'
      });
      assert.fail('Should have thrown conflict error');
    } catch (err) {
      assert.strictEqual(err.status, 409);
      assert.ok(err.message.includes('phone number is already registered'));
      assert.strictEqual(err.existingPlayerId, 'FP1001');
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: PASSWORD SETUP & TOKEN HYGIENE (NO FIXED PASSWORDS)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Password Setup & Token Security ---');

  await runTest('3.1: Reject password setup with invalid token', async () => {
    try {
      await authService.setupPassword('invalid_fake_token_123', 'MySecurePassword@2026');
      assert.fail('Should have rejected invalid token');
    } catch (err) {
      assert.strictEqual(err.status, 400);
      assert.ok(err.message.includes('Invalid or expired'));
    }
  });

  await runTest('3.2: Complete password setup for MP1001 via valid cryptographic token', async () => {
    const setupRes = await authService.setupPassword(
      malePlayerResult.setupToken,
      'RohanStrongPass2026!'
    );

    assert.ok(setupRes.user);
    assert.strictEqual(setupRes.user.status, 'ACTIVE');
    assert.ok(setupRes.token, 'JWT session token should be issued on activation');
  });

  await runTest('3.3: Token cannot be reused after initial use (replay defense)', async () => {
    try {
      await authService.setupPassword(
        malePlayerResult.setupToken,
        'AnotherPassword123!'
      );
      assert.fail('Re-using token should have failed');
    } catch (err) {
      assert.strictEqual(err.status, 400);
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: AUTHENTICATION & LOGIN
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Authentication & Login Verification ---');

  await runTest('4.1: Login with Player ID (MP1001) and correct password', async () => {
    const loginRes = await authService.login('MP1001', 'RohanStrongPass2026!');
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.player_id, 'MP1001');
    assert.strictEqual(loginRes.user.full_name, 'Rohan Gupta');
  });

  await runTest('4.2: Login with Email (case-insensitive) and correct password', async () => {
    const loginRes = await authService.login('ROHAN.GUPTA@example.com', 'RohanStrongPass2026!');
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.email, 'rohan.gupta@example.com');
  });

  await runTest('4.3: Login with incorrect password returns 401', async () => {
    try {
      await authService.login('MP1001', 'WrongPassword123!');
      assert.fail('Should have failed login');
    } catch (err) {
      assert.strictEqual(err.status, 401);
      assert.ok(err.message.includes('Invalid Player ID / Email or password'));
    }
  });

  await runTest('4.4: Login with unactivated account (PENDING_PASSWORD) fails with 403', async () => {
    try {
      // FP1001 (Sneha) hasn't set password yet
      await authService.login('FP1001', 'SomePassword123!');
      assert.fail('Should have rejected login for pending password');
    } catch (err) {
      assert.strictEqual(err.status, 403);
      assert.ok(err.message.includes('password has not been established'));
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: PROFILE MANAGEMENT & PERMISSION ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Profile Management & Self-Update Permissions ---');

  await runTest('5.1: Player can update their own emergency contact and skill levels', async () => {
    const requestingUser = { id: malePlayerResult.user.id, playerId: 'MP1001', role: 'PLAYER' };
    const updated = await playerService.updateProfile(
      malePlayerResult.user.id,
      {
        emergencyContact: 'New Contact: Mrs. Gupta (+91 98111 88888)',
        skillLevel: { pickleball: 'ADVANCED' },
        notes: 'Available for evening tournaments.'
      },
      requestingUser
    );

    assert.strictEqual(updated.emergency_contact, 'New Contact: Mrs. Gupta (+91 98111 88888)');
    assert.strictEqual(updated.preferences.skill_level_pickleball, 'ADVANCED');
    assert.strictEqual(updated.preferences.notes, 'Available for evening tournaments.');
  });

  await runTest('5.2: Player CANNOT modify another player profile (Cross-user 403)', async () => {
    const playerA = { id: malePlayerResult.user.id, playerId: 'MP1001', role: 'PLAYER' };
    try {
      await playerService.updateProfile(
        femalePlayerResult.user.id, // Target is Sneha (FP1001)
        { emergencyContact: 'Hacked by Player A' },
        playerA
      );
      assert.fail('Should have thrown 403');
    } catch (err) {
      assert.strictEqual(err.status, 403);
      assert.ok(err.message.includes('Unauthorized: You can only update your own player profile'));
    }
  });

  await runTest('5.3: Player CANNOT escalate own role to ADMIN or change status', async () => {
    const playerA = { id: malePlayerResult.user.id, playerId: 'MP1001', role: 'PLAYER' };
    const result = await playerService.updateProfile(
      malePlayerResult.user.id,
      { role: 'ADMIN', status: 'SUSPENDED' },
      playerA
    );

    // Role and status must remain unchanged
    assert.strictEqual(result.role, 'PLAYER');
    assert.strictEqual(result.status, 'ACTIVE');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: SECURE INITIAL ADMINISTRATOR BOOTSTRAP & RBAC
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Secure Initial Admin Setup & RBAC Governance ---');

  await runTest('6.1: Bootstrap initial root administrator account', async () => {
    adminResult = await adminService.setupInitialAdmin({
      fullName: 'Tournament Master Admin',
      email: 'admin.master@jito.org',
      phone: '+91 99999 00000',
      password: 'MasterAdminPassword@2026',
      setupSecret: config.adminSetupSecret
    });

    assert.ok(adminResult.admin);
    assert.strictEqual(adminResult.admin.player_id, 'ADM1001');
    assert.strictEqual(adminResult.admin.role, 'ADMIN');
    assert.strictEqual(adminResult.admin.status, 'ACTIVE');
  });

  await runTest('6.2: Second admin bootstrap attempt is PERMANENTLY LOCKED (403)', async () => {
    try {
      await adminService.setupInitialAdmin({
        fullName: 'Attacker Admin',
        email: 'attacker@jito.org',
        phone: '+91 99999 99999',
        password: 'AttackPassword@2026',
        setupSecret: config.adminSetupSecret
      });
      assert.fail('Second bootstrap attempt must fail');
    } catch (err) {
      assert.strictEqual(err.status, 403);
      assert.ok(err.message.includes('Initial admin setup is permanently locked'));
    }
  });

  await runTest('6.3: Admin can view all players in system directory', async () => {
    const directory = await adminService.getAllPlayers();
    assert.ok(Array.isArray(directory));
    assert.ok(directory.length >= 3);
  });

  await runTest('6.4: Admin can update another player role to COORDINATOR', async () => {
    const updated = await adminService.updatePlayerRole(
      malePlayerResult.user.id,
      'COORDINATOR',
      adminResult.admin
    );

    assert.strictEqual(updated.role, 'COORDINATOR');
  });

  await runTest('6.5: Admin can suspend an account and verify login rejection', async () => {
    await adminService.updatePlayerStatus(
      malePlayerResult.user.id,
      'SUSPENDED',
      adminResult.admin
    );

    try {
      await authService.login('MP1001', 'RohanStrongPass2026!');
      assert.fail('Suspended account should not be able to log in');
    } catch (err) {
      assert.strictEqual(err.status, 403);
      assert.ok(err.message.includes('suspended'));
    }
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` TEST RUN COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  // Clean up test DB
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
