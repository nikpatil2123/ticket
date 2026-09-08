const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'elogbook.info@paruluniversity.ac.in',
    pass: 'zbtq eyud yijl xbqy',
  },
});
transporter.verify(function (error, success) {
  if (error) {
    console.log("Error with spaces:", error.message);
  } else {
    console.log("Success with spaces!");
  }
});

const transporter2 = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'elogbook.info@paruluniversity.ac.in',
    pass: 'zbtqeyudyijlxbyq',
  },
});
transporter2.verify(function (error, success) {
  if (error) {
    console.log("Error without spaces:", error.message);
  } else {
    console.log("Success without spaces!");
  }
});
