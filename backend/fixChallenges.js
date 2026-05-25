const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const r = await mongoose.connection
        .collection('codingchallenges')
        .updateMany({ isPublished: false }, { $set: { isPublished: true } });
    console.log('Fixed:', r.modifiedCount, 'challenges published');
    process.exit();
}).catch(err => {
    console.error('Error:', err.message);
    process.exit();
});