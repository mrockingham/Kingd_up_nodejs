import { Request, Response } from "express";
import nodemailer from "nodemailer";



const CONTACT_EMAIL_TO = "osopenworld@gmail.com";


const EMAIL_USER = process.env.EMAIL_USER; 
const EMAIL_PASS = process.env.EMAIL_PASS; 

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn(
    "EMAIL_USER or EMAIL_PASS environment variables not set. Email will not be sent."
  );
}


const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export const handleContactForm = async (req: Request, res: Response) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
     return res.status(500).json({ error: "Email service is not configured." });
  }

  const { name, email, orderNumber, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    
    const mailOptions = {
      from: `"${name}" <${email}>`, 
      to: CONTACT_EMAIL_TO,
      subject: `New Contact Form Submission - Order #${orderNumber || "N/A"}`,
      html: `
        <p>You received a new contact form submission:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Order Number:</strong> ${orderNumber || "Not Provided"}</li>
        </ul>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};