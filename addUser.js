
    // Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDEVLQe8XTKsOyqGKBc7T8s41qbcIyxJTI",
      authDomain: "btckmr.firebaseapp.com",
      projectId: "btckmr",
      storageBucket: "btckmr.firebasestorage.app",
      messagingSenderId: "1038756102997",
      appId: "1:1038756102997:web:e4a4924826c44bf432e5dc",
      measurementId: "G-E73FZRNCFM"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const registerBtn = document.getElementById("registerBtn");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const messageBox = document.getElementById("messageBox");
    const passwordInput = document.getElementById("userPassword");
    const strengthMeter = document.getElementById("passwordStrength");

    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    function validatePhone(phone) {
      const re = /^\d{10}$/;
      return re.test(phone.replace(/\s+/g, ''));
    }

    function validatePassword(password) {
      return password.length >= 6;
    }

    function showMessage(text, isError = false) {
      messageBox.textContent = text;
      messageBox.style.display = "block";
      messageBox.className = "message " + (isError ? "error" : "success");
      
      if (!isError) {
        setTimeout(() => { 
          messageBox.style.opacity = "0";
          messageBox.style.transform = "translateY(-10px)";
          setTimeout(() => {
            messageBox.style.display = "none";
            messageBox.style.opacity = "1";
            messageBox.style.transform = "translateY(0)";
          }, 300);
        }, 5000);
      }
      
      // Scroll to message
      messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setLoading(isLoading) {
      loadingIndicator.style.display = isLoading ? "block" : "none";
      registerBtn.disabled = isLoading;
      
      if (isLoading) {
        registerBtn.innerHTML = '<div class="spinner"></div><span>Processing...</span>';
      } else {
        registerBtn.innerHTML = '<span>Create Account</span>';
      }
    }

    // Password strength meter
    passwordInput.addEventListener("input", function() {
      const password = this.value;
      let strength = 0;
      
      if (password.length >= 6) strength += 25;
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;
      
      strengthMeter.style.width = strength + "%";
      
      if (strength <= 25) {
        strengthMeter.style.backgroundColor = "#EA4335";
      } else if (strength <= 50) {
        strengthMeter.style.backgroundColor = "#FBBC05";
      } else if (strength <= 75) {
        strengthMeter.style.backgroundColor = "#4285F4";
      } else {
        strengthMeter.style.backgroundColor = "#34A853";
      }
    });

    // Form input validation
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
          this.classList.add('filled');
        } else {
          this.classList.remove('filled');
        }
      });
    });

    // Captcha Handling
    function generateCaptcha() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz123456789";
      let captcha = "";
      for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      document.getElementById("captchaText").innerText = captcha;
      return captcha;
    }

    let currentCaptcha = generateCaptcha(); // Initial captcha

    window.generateCaptcha = function() {
      currentCaptcha = generateCaptcha();
    };

    // Format Aadhaar number input
    const aadhaarInput = document.getElementById("userAadhaarNumber");
    aadhaarInput.addEventListener("input", function(e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 12) value = value.slice(0, 12);
      e.target.value = value;
    });

    // Format phone number input
    const phoneInput = document.getElementById("userPhoneNo");
    phoneInput.addEventListener("input", function(e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 10) value = value.slice(0, 10);
      e.target.value = value;
    });

    async function addUser() {
      const userName = document.getElementById("userName").value.trim();
      const userPassword = document.getElementById("userPassword").value.trim();
      const userPhoneNo = document.getElementById("userPhoneNo").value.trim();
      const userEmail = document.getElementById("userEmail").value.trim();
      const userAadhaarNumber = document.getElementById("userAadhaarNumber").value.trim();
      const userCaptchaInput = document.getElementById("userInput").value.trim();
      const userRole = "Tourist";
      const userStatus = "Active";

      // Basic validations
      if (!userName) return showMessage("Please enter your full name", true);
      if (!validateEmail(userEmail)) return showMessage("Please enter a valid email address", true);
      if (!validatePhone(userPhoneNo)) return showMessage("Please enter a valid 10-digit phone number", true);
      if (!validatePassword(userPassword)) return showMessage("Password must be at least 6 characters", true);
      if (!userAadhaarNumber.match(/^\d{12}$/)) return showMessage("Aadhaar number must be 12 digits", true);
      if (userCaptchaInput.toUpperCase() !== currentCaptcha.toUpperCase()) return showMessage("Captcha verification failed. Please try again.", true);

      setLoading(true);

      try {
        // Check if email or phone already exists
        const emailCheck = await db.collection("users").where("userEmail", "==", userEmail).get();
        if (!emailCheck.empty) {
          setLoading(false);
          return showMessage("Email address is already registered", true);
        }

        const phoneCheck = await db.collection("users").where("userPhoneNo", "==", userPhoneNo).get();
        if (!phoneCheck.empty) {
          setLoading(false);
          return showMessage("Phone number is already registered", true);
        }

        // Add user to database
        await db.collection("users").add({
          userName,
          userPassword, // Note: In production, this should be hashed
          userPhoneNo,
          userEmail,
          userAadhaarNumber,
          userRole,
          userStatus,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showMessage("Account created successfully! Redirecting to login...");
        document.getElementById("registrationForm").reset();
        generateCaptcha(); // Refresh captcha
        
        // In a real application, you might redirect to login page after a delay
        // setTimeout(() => { window.location.href = "login.html"; }, 3000);
      } catch (error) {
        console.error("Error adding user: ", error);
        showMessage("An error occurred while creating your account. Please try again.", true);
      }

      setLoading(false);
    }

    registerBtn.addEventListener("click", addUser);

    // Press Enter to submit form
    document.addEventListener("keypress", function(e) {
      if (e.key === "Enter" && !registerBtn.disabled) {
        addUser();
      }
    });
