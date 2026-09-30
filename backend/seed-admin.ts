import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/ticket';
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  // CLI Arguments or defaults
  const args = process.argv.slice(2);
  const email = args[0] || 'nikhil.patil46327@paruluniversity.ac.in';
  const password = args[1] || 'Admin@1234!';
  const firstName = args[2] || 'Admin';
  const lastName = args[3] || 'User';
  
  // By default, the specified email gets SUPER_ADMIN, anyone else gets ADMIN unless passed in.
  const targetRoleName = args[4] || (email === 'nikhil.patil46327@paruluniversity.ac.in' ? 'SUPER_ADMIN' : 'ADMIN');

  console.log(`Creating ${targetRoleName} user: ${email}...`);

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

  // Ensure SUPER_ADMIN role exists
  let superAdminRole = await db.collection('roles').findOne({ name: 'SUPER_ADMIN' });
  if (!superAdminRole) {
    const roleRes = await db.collection('roles').insertOne({
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with absolute full access permissions',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    superAdminRole = { _id: roleRes.insertedId, name: 'SUPER_ADMIN' };
    console.log('Created SUPER_ADMIN role.');
  }

  const roleToAssign = targetRoleName === 'SUPER_ADMIN' ? superAdminRole : adminRole;

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
          roleId: roleToAssign._id,
          departmentId: department._id,
          isActive: true,
          updatedAt: new Date()
        } 
      }
    );
    console.log(`Successfully updated existing user ${email} with ${targetRoleName} role, department & new password!`);
  } else {
    await db.collection('users').insertOne({
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: roleToAssign._id,
      departmentId: department._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Successfully created new ${targetRoleName} user ${email}!`);
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
