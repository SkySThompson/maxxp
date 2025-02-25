async function getHCaptchaToken() {
    return new Promise((resolve, reject) => {
        hcaptcha.execute().then(token => {
            if (!token) {
                reject(new Error("Failed to obtain hCaptcha token"));
            } else {
                resolve(token);
            }
        }).catch(reject);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // Login form handling
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            try {
                const token = await getHCaptchaToken();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                const loginData = {
                    email: username,
                    password: password,
                    token: token
                };

                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = data.redirect + '?message=' + encodeURIComponent(data.welcomeMessage);
                } else {
                    throw new Error(data.error || "Login failed. Please check your credentials.");
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-message').textContent = error.message || "Something went wrong. Please try again.";
                hcaptcha.reset();
            }
        });
    }

    // Signup form handling
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            try {
                const token = await getHCaptchaToken();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;

                const signupData = {
                    email: email,
                    password: password,
                    token: token
                };

                const response = await fetch('/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(signupData)
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Registration successful! Please login.");
                    window.location.href = "login.html";
                } else {
                    throw new Error(data.error || "Registration failed. Please try again.");
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('signup-error').textContent = error.message || "Something went wrong. Please try again.";
                hcaptcha.reset();
            }
        });
    }

    // Contact form handling
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const form = document.getElementById("contact-form");
            const responseMessage = document.getElementById("response-message");

            const formData = new FormData(form);
            const data = {
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message")
            };

            try {
                responseMessage.textContent = "Sending...";
                responseMessage.style.color = "blue";

                const response = await fetch("http://localhost:5000/send-email", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    responseMessage.textContent = "Message sent successfully!";
                    responseMessage.style.color = "green";

                    setTimeout(() => {
                        form.reset();
                        responseMessage.textContent = "";
                    }, 2000);
                } else {
                    responseMessage.textContent = "Error sending message.";
                    responseMessage.style.color = "red";
                }
            } catch (error) {
                responseMessage.textContent = "Failed to connect to the server.";
                responseMessage.style.color = "red";
            }
        });
    }

    // Input validation styling
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("input", function () {
            if (this.checkValidity()) {
                this.style.borderColor = "#4CAF50";
            } else {
                this.style.borderColor = "#f44336";
            }
        });
    });
});