
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
    let bookings = [];
    let bookingsMap = {};
    
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
        document.getElementById('busLayout').style.display = 'none';
        return;
      }
      
      document.getElementById('loader').classList.remove('hide');
      
      try {
        // Fetch tour details
        await fetchTourDetails(parseInt(tourId));
        
        // Fetch existing bookings
        await fetchBookings(parseInt(tourId));
        
        // Update statistics
        updateBookingStats();
        
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
          document.getElementById('busLayout').style.display = 'none';
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
      tourDetailsDiv.id = 'tourDetails';
      
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
      container.insertBefore(tourDetailsDiv, document.getElementById('statusMessage').nextSibling);
    }
    
    // Fetch existing bookings for this tour
    async function fetchBookings(tourId) {
      try {
        const bookingsSnapshot = await db.collection('bookings')
          .where('bookingTourid', '==', tourId)
          .get();
        
        bookings = [];
        bookingsMap = {};
        
        if (!bookingsSnapshot.empty) {
          bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            const seatNo = booking.bookingCustomerSeatNo;
            
            // Store booking data
            booking.id = doc.id;
            bookings.push(booking);
            bookingsMap[seatNo] = booking;
            
            // Mark the seat as booked in UI
            const seatElement = document.getElementById('span' + seatNo);
            if (seatElement) {
              seatElement.classList.add('booked');
            }
          });
          
          // Display bookings in the table
          displayBookingsInTable();
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
        showStatusMessage('Error loading bookings. Please try again later.', 'error');
      }
    }
    
    // Display booking details when a seat is clicked
    function viewBookingDetails(element) {
      const seatNumber = parseInt(element.innerText);
      const booking = bookingsMap[seatNumber];
      
      if (booking) {
        // Display booking details in the modal
        const detailsModal = document.getElementById('bookingDetailsModal');
        const detailsContent = document.getElementById('bookingDetails');
        
        // Format booking date
        let bookingDate = booking.bookingDate;
        if (bookingDate && bookingDate.toDate) {
          bookingDate = bookingDate.toDate().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        detailsContent.innerHTML = `
          <h3>Booking Details for Seat ${seatNumber}</h3>
          <div class="detail-item">
            <label>Booking ID:</label>
            <span>${booking.bookingid}</span>
          </div>
          <div class="detail-item">
            <label>Passenger Name:</label>
            <span>${booking.bookingCustomerName}</span>
          </div>
          <div class="detail-item">
            <label>Email:</label>
            <span>${booking.bookingCustomerEmail}</span>
          </div>
          <div class="detail-item">
            <label>Phone Number:</label>
            <span>${booking.bookingCustomerPhoneNo}</span>
          </div>
          <div class="detail-item">
            <label>Aadhaar Number:</label>
            <span>${booking.bookingCustomerAadhaarNo}</span>
          </div>
          <div class="detail-item">
            <label>Seat Number:</label>
            <span>${booking.bookingCustomerSeatNo}</span>
          </div>
          <div class="detail-item">
            <label>Booking Status:</label>
            <span>${booking.bookingCustomerStatus}</span>
          </div>
          <div class="detail-item">
            <label>Booking Date:</label>
            <span>${bookingDate}</span>
          </div>
          <div class="action-buttons">
            <button class="action-btn cancel" onclick="cancelBooking('${booking.id}', ${seatNumber})">Cancel Booking</button>
          </div>
        `;
        
        // Show the modal
        detailsModal.style.display = 'block';
      } else {
        showStatusMessage(`No booking found for seat ${seatNumber}.`, 'error');
      }
    }
    
    // Cancel a booking
    async function cancelBooking(bookingId, seatNumber) {
      if (confirm(`Are you sure you want to cancel the booking for seat ${seatNumber}?`)) {
        try {
          await db.collection('bookings').doc(bookingId).delete();
          
          // Update local data
          bookingsMap[seatNumber].bookingCustomerStatus = 'cancelled';
          
          // Update UI
          showStatusMessage(`Booking for seat ${seatNumber} has been cancelled.`, 'success');
          closeModal('bookingDetailsModal');
          
          // Refresh bookings table
          displayBookingsInTable();
          
          // Update statistics
          updateBookingStats();
        } catch (error) {
          console.error("Error cancelling booking:", error);
          showStatusMessage('Error cancelling booking. Please try again later.', 'error');
        }
      }
    }
    
    // Display bookings in the table
    function displayBookingsInTable() {
      const tableBody = document.getElementById('bookingsTableBody');
      tableBody.innerHTML = '';
      
      bookings.sort((a, b) => a.bookingCustomerSeatNo - b.bookingCustomerSeatNo);
      
      bookings.forEach(booking => {
        // Format booking date
        let bookingDate = booking.bookingDate;
        if (bookingDate && bookingDate.toDate) {
          bookingDate = bookingDate.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${booking.bookingCustomerSeatNo}</td>
          <td>${booking.bookingCustomerName}</td>
          <td>${booking.bookingCustomerPhoneNo}</td>
          <td>${booking.bookingCustomerEmail}</td>
          <td>${booking.bookingCustomerAadhaarNo}</td>
          <td>${booking.bookingCustomerStatus}</td>
          <td>${bookingDate}</td>
          <td>
            <button class="action-btn" onclick="viewBookingDetailsFromTable(${booking.bookingCustomerSeatNo})">View</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
    
    // View booking details from table
    function viewBookingDetailsFromTable(seatNumber) {
      const seatElement = document.getElementById(`span${seatNumber}`);
      if (seatElement) {
        viewBookingDetails(seatElement);
      }
    }
    
    // Update booking statistics
    function updateBookingStats() {
      const totalSeats = 51; // Total seats in the bus
      const bookedSeats = bookings.filter(b => b.bookingCustomerStatus === 'confirmed').length;
      const cancelledSeats = bookings.filter(b => b.bookingCustomerStatus === 'cancelled').length;
      const availableSeats = totalSeats - bookedSeats;
      
      let totalRevenue = 0;
      if (tourData) {
        totalRevenue = bookedSeats * tourData.tourFare;
      }
      
      document.getElementById('totalSeats').innerText = totalSeats;
      document.getElementById('bookedSeats').innerText = bookedSeats;
      document.getElementById('availableSeats').innerText = availableSeats;
      document.getElementById('cancelledSeats').innerText = cancelledSeats;
      document.getElementById('occupancyRate').innerText = `${Math.round((bookedSeats / totalSeats) * 100)}%`;
      document.getElementById('totalRevenue').innerText = `₹${totalRevenue}`;
    }
    
    // Print booking details
    function printBookingDetails() {
      const printSection = document.getElementById('printSection');
      printSection.innerHTML = '';
      
      // Clone tour details
      const tourDetailsClone = document.getElementById('tourDetails').cloneNode(true);
      
      // Create bookings table for printing
      const bookingsTable = document.createElement('div');
      bookingsTable.className = 'booking-details';
      
      // Get current date and time
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Get active bookings only
      const activeBookings = bookings.filter(b => b.bookingCustomerStatus === 'confirmed');
      
      bookingsTable.innerHTML = `
        <h3>Booking Report</h3>
        <p>Generated on: ${formattedDate}</p>
        <p>Total Bookings: ${activeBookings.length}</p>
        <table class="bookings-table" border="1" cellspacing="0">
          <thead>
            <tr>
              <th>Seat No</th>
              <th>Passenger Name</th>
              <th>Phone Number</th>
              <th>Email</th>
              <th>Aadhaar Number</th>
              <th>Booking Date</th>
            </tr>
          </thead>
          <tbody>
            ${activeBookings.map(booking => {
              // Format booking date
              let bookingDate = booking.bookingDate;
              if (bookingDate && bookingDate.toDate) {
                bookingDate = bookingDate.toDate().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              }
              
              return `
                <tr>
                  <td>${booking.bookingCustomerSeatNo}</td>
                  <td>${booking.bookingCustomerName}</td>
                  <td>${booking.bookingCustomerPhoneNo}</td>
                  <td>${booking.bookingCustomerEmail}</td>
                  <td>${booking.bookingCustomerAadhaarNo}</td>
                  <td>${bookingDate}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px;">
          <h4>Booking Summary</h4>
          <table border="1" cellspacing="0" style="width: 100%;">
            <tr>
              <th>Total Seats</th>
              <th>Booked Seats</th>
              <th>Available Seats</th>
              <th>Occupancy Rate</th>
              <th>Total Revenue</th>
            </tr>
            <tr>
              <td>52</td>
              <td>${activeBookings.length}</td>
              <td>${51 - activeBookings.length}</td>
              <td>${Math.round((activeBookings.length / 51) * 100)}%</td>
              <td>₹${activeBookings.length * (tourData ? tourData.tourFare : 0)}</td>
            </tr>
          </table>
        </div>
      `;
      
      printSection.appendChild(tourDetailsClone);
      printSection.appendChild(bookingsTable);
      
      window.print();
    }
    
    // Export booking details to CSV
    function exportBookingsToCSV() {
      // Get active bookings only
      const activeBookings = bookings.filter(b => b.bookingCustomerStatus === 'confirmed');
      
      if (activeBookings.length === 0) {
        showStatusMessage('No bookings to export.', 'error');
        return;
      }
      
      // Create CSV content
      let csvContent = 'Seat No,Passenger Name,Phone Number,Email,Aadhaar Number,Booking Status,Booking Date\n';
      
      activeBookings.forEach(booking => {
        // Format booking date
        let bookingDate = booking.bookingDate;
        if (bookingDate && bookingDate.toDate) {
          bookingDate = bookingDate.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        // Escape fields that might contain commas
        const escapeCsv = (field) => {
          if (field === null || field === undefined) return '';
          return `"${String(field).replace(/"/g, '""')}"`;
        };
        
        csvContent += [
          booking.bookingCustomerSeatNo,
          escapeCsv(booking.bookingCustomerName),
          escapeCsv(booking.bookingCustomerPhoneNo),
          escapeCsv(booking.bookingCustomerEmail),
          booking.bookingCustomerAadhaarNo,
          booking.bookingCustomerStatus,
          escapeCsv(bookingDate)
        ].join(',') + '\n';
      });
      
      // Create downloadable link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tour_${tourData.tourid}_bookings.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    
    // Close modal
    function closeModal(modalId) {
      document.getElementById(modalId).style.display = 'none';
    }
    
    // Window click event to close modals
    window.onclick = function(event) {
      const modals = document.getElementsByClassName('modal');
      for (let i = 0; i < modals.length; i++) {
        if (event.target === modals[i]) {
          modals[i].style.display = 'none';
        }
      }
    };
 
