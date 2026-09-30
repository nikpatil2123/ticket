require('dotenv').config();
const mongoose = require('mongoose');
const { ActivityLogSchema } = require('./backend/dist/src/modules/tickets/schemas/activity-log.schema.js');
const { UserSchema } = require('./backend/dist/src/modules/users/schemas/user.schema.js');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/ticket');
  const User = mongoose.model('User', UserSchema);
  const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
  const logs = await ActivityLog.find({ action: 'STATUS_CHANGED' }).populate('actorId', 'firstName lastName email').lean().exec();
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}
run().catch(console.error);
