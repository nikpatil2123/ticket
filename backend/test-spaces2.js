const nodemailer = require('nodemailer');
const transporter2 = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'elogbook.info@paruluniversity.ac.in',
    pass: 'zbtqeyudyijlxbqy',
  },
});
transporter2.verify(function (error, success) {
  if (error) {
    console.log("Error without spaces:", error.message);
  } else {
    console.log("Success without spaces!");
  }
});
