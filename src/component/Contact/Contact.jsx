import React from "react";

import "./Contact.css";
import instagramIcon from "../../assets/icons/instagram.svg";
import linkedinIcon from "../../assets/icons/linkedin.svg";
import emailIcon from "../../assets/icons/email.svg";

const Contact = () => {
  return (
    <section id="contact" >
    <div className="contact">
      <div className="contact-title">
        <h1>Contact Us</h1>
      </div>
      <div className="contact-section">
        <div className="contact-left">
            <h1>Let's Talk</h1>
            <p>Should you encounter any questions, issues, or difficulties with the website, please feel free to contact us for assistance.</p>
            <div className="contact-details">
                <div className="contact-detail">
                    <img src={emailIcon} alt="Email Icon" />
                    <a>aurasasi20@gmail.com</a>
                </div>
                <div className="contact-detail">
                    <img src={instagramIcon} alt="Instagram Icon" />
                    <a href="https://www.instagram.com/auras_ky20/">@auras_ky20</a>
                </div>
                <div className="contact-detail">
                    <img src={linkedinIcon} alt="LinkedIn Icon" />
                    <a href="https://www.linkedin.com/in/aurasky/">https://www.linkedin.com/in/aurasky/</a>
                </div>
                
            </div>
        </div>
        <form className="contact-right" action="">
                    <label htmlFor="name">Your Name:</label>
                    <input type="text" placeholder="Enter your name" name="name" />
                    <label htmlFor="email">Your Email:</label>
                    <input type="email" placeholder="Enter your email" name="email" />
                    <label htmlFor="message">Your Message:</label>
                    <textarea placeholder="Enter your message" name="message" rows="4"></textarea>
                    <button className="submit-button" type="submit">Send Message</button>
                </form>
      </div>
      
    </div>
    </section>
  );
}

export default Contact;