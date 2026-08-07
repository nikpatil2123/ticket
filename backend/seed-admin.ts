import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function createAdmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket_db';
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  // CLI Arguments or defaults
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@paruluniversity.ac.in';
  const password = args[1] || 'Admin@1234!';
  const firstName = args[2] || 'Admin';
  const lastName = args[3] || 'User';

  console.log(`Creating Admin user: ${email}...`);

  // Ensure default Department exists
  let department = await db.collection('departments').findOne({ name: 'System Administration' });
  if (!department) {
    const deptRes = await db.collection('departments').insertOne({
      name: 'System Administration',
      description: 'Default department for system admins',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    department = { _id: deptRes.insertedId, name: 'System Administration' };
    console.log('Created System Administration department.');
  }

  // Ensure ADMIN role exists
  let adminRole = await db.collection('roles').findOne({ name: 'ADMIN' });
  if (!adminRole) {
    const roleRes = await db.collection('roles').insertOne({
      name: 'ADMIN',
      description: 'System Administrator with full access permissions',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    adminRole = { _id: roleRes.insertedId, name: 'ADMIN' };
    console.log('Created ADMIN role.');
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Check if admin user already exists
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          passwordHash,
          roleId: adminRole._id,
          departmentId: department._id,
          isActive: true,
          updatedAt: new Date()
        } 
      }
    );
    console.log(`Successfully updated existing user ${email} with ADMIN role, department & new password!`);
  } else {
    await db.collection('users').insertOne({
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: adminRole._id,
      departmentId: department._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Successfully created new ADMIN user ${email}!`);
  }

  console.log(`\n--- Admin Credentials ---`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`-------------------------\n`);

  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
