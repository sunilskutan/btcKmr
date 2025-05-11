
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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    // Global variables
    let tourData = null;
    let selectedSeats = {};
    let bookedSeats = [];
    
    // Parse URL parameters
    function getUrlParameter(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    }
    
    // Initialize the page
    document.addEventListener('DOMContentLoaded', async function() {
      const tourId = getUrlParameter('tourId');
      
      if (!tourId) {
        showStatusMessage('Tour ID is missing from URL. Please provide a valid tour ID.', 'error');
        document.getElementById('sf').style.display = 'none';
        document.getElementById('bookSeats').style.display = 'none';
        return;
      }
      
      document.getElementById('loader').classList.remove('hide');
      
      try {
        // Fetch tour details
        await fetchTourDetails(parseInt(tourId));
        
        // Fetch existing bookings
        await fetchBookings(parseInt(tourId));
        
        document.getElementById('loader').classList.add('hide');
      } catch (error) {
        console.error("Error initializing page:", error);
        showStatusMessage('Error loading tour data. Please try again later.', 'error');
        document.getElementById('loader').classList.add('hide');
      }
    });
    
    // Fetch tour details from Firestore
    async function fetchTourDetails(tourId) {
      try {
        const toursSnapshot = await db.collection('tours')
          .where('tourid', '==', tourId)
          .limit(1)
          .get();
        
        if (toursSnapshot.empty) {
          showStatusMessage('Tour not found. Please check the tour ID.', 'error');
          document.getElementById('sf').style.display = 'none';
          document.getElementById('bookSeats').style.display = 'none';
          return;
        }
        
        tourData = toursSnapshot.docs[0].data();
        displayTourDetails(tourData);
      } catch (error) {
        console.error("Error fetching tour details:", error);
        showStatusMessage('Error loading tour details. Please try again later.', 'error');
        throw error;
      }
    }
    
    // Display tour details on the page
    function displayTourDetails(tour) {
      const tourDetailsDiv = document.createElement('div');
      tourDetailsDiv.className = 'tour-details';
      
      // Convert timestamp to date
      let tourDate = tour.tourDate;
      if (tourDate && tourDate.toDate) {
        tourDate = tourDate.toDate().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      tourDetailsDiv.innerHTML = `
        <h3>Tour Information</h3>
        <div class="tour-info">
          <div class="info-card">
            <h4>Tour ID</h4>
            <p>${tour.tourid}</p>
          </div>
          <div class="info-card">
            <h4>Bus ID</h4>
            <p>${tour.tourBusid}</p>
          </div>
          <div class="info-card">
            <h4>Date</h4>
            <p>${tourDate}</p>
          </div>
          <div class="info-card">
            <h4>Fare</h4>
            <p>₹${tour.tourFare}</p>
          </div>
          <div class="info-card">
            <h4>Place ID</h4>
            <p>${tour.tourPlaceid}</p>
          </div>
        </div>
        <div class="tour-description">
          <h4>Tour Details</h4>
          <p>${tour.tourDetails}</p>
        </div>
      `;
      
      // Insert tour details at the top of the container
      const container = document.querySelector('.container');
      container.insertBefore(tourDetailsDiv, container.firstChild);
    }
    
    // Fetch existing bookings for this tour
    async function fetchBookings(tourId) {
      try {
        const bookingsSnapshot = await db.collection('bookings')
          .where('bookingTourid', '==', tourId)
          .get();
        
        if (!bookingsSnapshot.empty) {
          bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            const seatNo = booking.bookingCustomerSeatNo;
            bookedSeats.push(seatNo);
            
            // Mark the seat as booked in UI
            const seatElement = document.getElementById('span' + seatNo);
            if (seatElement) {
              seatElement.classList.add('booked');
            }
          });
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
        showStatusMessage('Error loading booked seats. Some seats might appear available even though they are booked.', 'error');
      }
    }
    
    // Handle seat selection
    function book(element) {
      const seatNumber = parseInt(element.innerText);
      
      // Check if the seat is already booked
      if (bookedSeats.includes(seatNumber)) {
        showStatusMessage(`Seat ${seatNumber} is already booked.`, 'error');
        return;
      }
      
      // Toggle selection
      if (selectedSeats[seatNumber]) {
        // Deselect the seat
        delete selectedSeats[seatNumber];
        element.classList.remove('selected');
        
        // Remove the booking form
        const formElement = document.getElementById(`form-seat-${seatNumber}`);
        if (formElement) {
          formElement.remove();
        }
      } else {
        // Select the seat
        selectedSeats[seatNumber] = {
          seatNumber: seatNumber
        };
        element.classList.add('selected');
        
        // Create booking form for this seat
        createBookingForm(seatNumber);
      }
      
      updateSelectedSeatsDisplay();
    }
    
    // Create a booking form for a selected seat
    function createBookingForm(seatNumber) {
      const formsContainer = document.getElementById('bookingFormsContainer');
      
      const formElement = document.createElement('div');
      formElement.id = `form-seat-${seatNumber}`;
      formElement.className = 'booking-form';
      
      formElement.innerHTML = `
        <button class="close-btn" onclick="removeBookingForm(${seatNumber})">&times;</button>
        <h4>Booking Details for Seat ${seatNumber}</h4>
        <div class="form-group">
          <label for="name-${seatNumber}">Full Name</label>
          <input type="text" id="name-${seatNumber}" required placeholder="Enter full name">
        </div>
        <div class="form-group">
          <label for="email-${seatNumber}">Email</label>
          <input type="email" id="email-${seatNumber}" required placeholder="Enter email address">
        </div>
        <div class="form-group">
          <label for="phone-${seatNumber}">Phone Number</label>
          <input type="tel" id="phone-${seatNumber}" required placeholder="Enter 10-digit phone number">
        </div>
        <div class="form-group">
          <label for="aadhaar-${seatNumber}">Aadhaar Number</label>
          <input type="text" id="aadhaar-${seatNumber}" required placeholder="Enter 12-digit Aadhaar number">
        </div>
      `;
      
      formsContainer.appendChild(formElement);
    }
    
    // Remove booking form when deselected
    function removeBookingForm(seatNumber) {
      const formElement = document.getElementById(`form-seat-${seatNumber}`);
      if (formElement) {
        formElement.remove();
      }
      
      // Deselect the seat
      const seatElement = document.getElementById(`span${seatNumber}`);
      if (seatElement) {
        seatElement.classList.remove('selected');
      }
      
      delete selectedSeats[seatNumber];
      updateSelectedSeatsDisplay();
    }
    
    // Update the selected seats display
    function updateSelectedSeatsDisplay() {
      const selectedSeatsElement = document.getElementById('selectedSeats');
      const seatCount = Object.keys(selectedSeats).length;
      
      if (seatCount > 0) {
        const seatNumbers = Object.keys(selectedSeats).join(', ');
        selectedSeatsElement.innerText = `Selected Seats: ${seatNumbers} (${seatCount} seats)`;
        
        if (tourData) {
          const totalFare = seatCount * tourData.tourFare;
          selectedSeatsElement.innerText += ` | Total: ₹${totalFare}`;
        }
      } else {
        selectedSeatsElement.innerText = 'No seats selected';
      }
      
      // Enable/disable book button based on selections
      document.getElementById('bookSeats').disabled = seatCount === 0;
    }
    
    // Submit all bookings
    async function submitAllBookings(event) {
      event.preventDefault();
      
      const seatNumbers = Object.keys(selectedSeats);
      if (seatNumbers.length === 0) {
        showStatusMessage('Please select at least one seat to book.', 'error');
        return;
      }
      
      // Validate all forms
      for (const seatNumber of seatNumbers) {
        const nameInput = document.getElementById(`name-${seatNumber}`);
        const emailInput = document.getElementById(`email-${seatNumber}`);
        const phoneInput = document.getElementById(`phone-${seatNumber}`);
        const aadhaarInput = document.getElementById(`aadhaar-${seatNumber}`);
        
        if (!nameInput.value) {
          showStatusMessage(`Please enter name for seat ${seatNumber}.`, 'error');
          nameInput.focus();
          return;
        }
        
        if (!emailInput.value || !isValidEmail(emailInput.value)) {
          showStatusMessage(`Please enter a valid email for seat ${seatNumber}.`, 'error');
          emailInput.focus();
          return;
        }
        
        if (!phoneInput.value || !isValidPhone(phoneInput.value)) {
          showStatusMessage(`Please enter a valid 10-digit phone number for seat ${seatNumber}.`, 'error');
          phoneInput.focus();
          return;
        }
        
        if (!aadhaarInput.value || !isValidAadhaar(aadhaarInput.value)) {
          showStatusMessage(`Please enter a valid 12-digit Aadhaar number for seat ${seatNumber}.`, 'error');
          aadhaarInput.focus();
          return;
        }
        
        // Store form data in selectedSeats object
        selectedSeats[seatNumber] = {
          seatNumber: parseInt(seatNumber),
          name: nameInput.value,
          email: emailInput.value,
          phone: phoneInput.value,
          aadhaar: aadhaarInput.value
        };
      }
      
      // Disable the submit button and show loading
      const submitButton = document.getElementById('bookSeats');
      submitButton.disabled = true;
      document.getElementById('loader').classList.remove('hide');
      showStatusMessage('Processing your bookings...', 'loading');
      
      try {
        // Submit each booking to Firebase
        const promises = [];
        
        for (const seatNumber of seatNumbers) {
          const seatData = selectedSeats[seatNumber];
          
          const bookingData = {
            bookingCustomerAadhaarNo: parseInt(seatData.aadhaar),
            bookingCustomerEmail: seatData.email,
            bookingCustomerName: seatData.name,
            bookingCustomerPhoneNo: seatData.phone,
            bookingCustomerSeatNo: parseInt(seatNumber),
            bookingCustomerStatus: 'confirmed',
            bookingDate: firebase.firestore.Timestamp.now(),
            bookingTourid: tourData.tourid,
            bookingid: Date.now() + parseInt(seatNumber) // Generate a unique booking ID
          };
          
          promises.push(db.collection('bookings').add(bookingData));
        }
        
        await Promise.all(promises);
        
        // Show success message
        showStatusMessage('Booking successful! Your seats have been reserved.', 'success');
        
        // Mark the booked seats
        for (const seatNumber of seatNumbers) {
          bookedSeats.push(parseInt(seatNumber));
          const seatElement = document.getElementById(`span${seatNumber}`);
          if (seatElement) {
            seatElement.classList.remove('selected');
            seatElement.classList.add('booked');
          }
          
          // Remove booking form
          const formElement = document.getElementById(`form-seat-${seatNumber}`);
          if (formElement) {
            formElement.remove();
          }
        }
        
        // Clear selected seats
        selectedSeats = {};
        updateSelectedSeatsDisplay();
        
      } catch (error) {
        console.error("Error submitting bookings:", error);
        showStatusMessage('Error processing your booking. Please try again later.', 'error');
      } finally {
        submitButton.disabled = false;
        document.getElementById('loader').classList.add('hide');
      }
    }
    
    // Show status message
    function showStatusMessage(message, type) {
      const statusElement = document.getElementById('statusMessage');
      statusElement.innerText = message;
      statusElement.className = 'status-message';
      
      if (type) {
        statusElement.classList.add(type);
      }
      
      // Auto-hide success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          statusElement.innerText = '';
          statusElement.className = 'status-message hide';
        }, 5000);
      }
    }
    
    // Validation helpers
    function isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }
    
    function isValidPhone(phone) {
      const re = /^\d{10}$/;
      return re.test(phone);
    }
    
    function isValidAadhaar(aadhaar) {
      const re = /^\d{12}$/;
      return re.test(aadhaar);
    }
  