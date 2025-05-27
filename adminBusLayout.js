
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
let tourData = null;
let bookings = [];
let bookingsMap = {};
let totalSeats = 0;

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

// Handle specific bus type UI changes based on busid
function displayBusLayout(busid) {
  // Hide all bus layouts first
  document.getElementById("aclowfloorbus").style.display = "none";
  document.getElementById("superfastbus").style.display = "none";
  document.getElementById("superdeluxebus").style.display = "none";
  document.getElementById("shortwheelbus").style.display = "none";
  
  // Show the appropriate bus layout
  switch (busid) {
    case 1: document.getElementById("aclowfloorbus").style.display = "block"; break;
    case 2: document.getElementById("superfastbus").style.display = "block"; break;
    case 4: document.getElementById("superdeluxebus").style.display = "block"; break;
    case 9: document.getElementById("shortwheelbus").style.display = "block"; break;
    default: document.getElementById("superfastbus").style.display = "block"; break;
  }
}




// Update booking status in the bus layout
function updateSeatStatusInBusLayout() {
  // Reset all seats to their default state first
  const allSeats = document.querySelectorAll('.seat-number');
  allSeats.forEach(seat => {
    seat.classList.remove('booked');
    seat.style.backgroundColor = '';
    seat.style.color = '';
  });
  
  // Apply booking status to seats
  for (const seatNo in bookingsMap) {
    const booking = bookingsMap[seatNo];
    const seatElement = document.getElementById('span' + seatNo);
    
    if (seatElement) {
      seatElement.classList.add('booked');
      
      // Apply specific styling based on booking status
      if (booking.bookingCustomerStatus === 'remitted') {
        seatElement.style.backgroundColor = '#003399'; // Blue color for remitted bookings
        seatElement.style.color = 'white';
      } else if (booking.bookingCustomerStatus === 'confirmed') {
        seatElement.style.backgroundColor = '#28a745'; // Green color for confirmed bookings
        seatElement.style.color = 'white';
      } else if (booking.bookingCustomerStatus === 'cancelled') {
        seatElement.style.backgroundColor = '#dc3545'; // Red color for cancelled bookings
        seatElement.style.color = 'white';
      }
    }
  }
}


// Modify displayTourDetails to show bus layout and update seat status
async function displayTourDetails(tour) {
  const tourDetailsDiv = document.createElement('div');
  tourDetailsDiv.className = 'tour-details';
  tourDetailsDiv.id = 'tourDetails';

  // Convert timestamp to readable date
  let tourDate = tour.tourDate;
  if (tourDate && tourDate.toDate) {
    tourDate = tourDate.toDate().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get busid and fetch totalSeats from Firestore
  let busid = parseInt(tour.tourBusid);

  try {
    const busesSnapshot = await db.collection('buses')
      .where('busid', '==', busid)
      .limit(1)
      .get();

    if (!busesSnapshot.empty) {
      const busDoc = busesSnapshot.docs[0]; // First matching document
      const TotalSeats = busDoc.data().busTotalSeat;
      totalSeats = parseInt(TotalSeats);
    } else {
      showStatusMessage("No matching bus found.", "error");
      totalSeats = 51; // Default fallback if no bus data is found
    }
  } catch (error) {
    console.error("Error getting bus data:", error);
    totalSeats = 51; // Default fallback if there's an error
  }

  // Show the appropriate bus layout
  displayBusLayout(busid);

  // Show tour details
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
  `;

  // Insert the tour details into the page
  const container = document.querySelector('.container');
  container.insertBefore(tourDetailsDiv, document.getElementById('statusMessage').nextSibling);
}

// Fetch bookings function to update seat status after fetching bookings
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


           
 markSeatAsBooked(seatNo);




      });
      
      // Update seat status in the bus layout
      updateSeatStatusInBusLayout();
      
      // Display bookings in the table
      displayBookingsInTable();
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    showStatusMessage('Error loading bookings. Please try again later.', 'error');
  }
}



// Also update the markSeatAsBooked function to handle different booking statuses
function markSeatAsBooked(seatNo) {
  const booking = bookingsMap[seatNo];
  const busTypes = ["aclowfloorbus", "superfastbus", "superdeluxebus","shortwheelbus"];
  
  busTypes.forEach(busType => {
    const seatElement = document.querySelector(`#${busType} #span${seatNo}`);
    if (seatElement) {
      seatElement.classList.add('booked');
      
      // Apply color based on booking status
      if (booking && booking.bookingCustomerStatus === 'remitted') {
        seatElement.style.backgroundColor = '#003399';
        seatElement.style.color = 'white';
      }
    }
  });
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
    
    // Create the basic booking details HTML
    let detailsHTML = `
      <h3>Booking Details for Seat ${seatNumber}</h3>
      <div class="detail-item">
        <label>Booking ID:</label>
        <span>${booking.bookingid}</span>
      </div>

      <div class="detail-item">
        <label>Booked By User id:</label>
        <span>${booking.bookingUserid}</span>
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
        <span style="${booking.bookingCustomerStatus === 'remitted' ? 'color: #003399; font-weight: bold;' : 
                      booking.bookingCustomerStatus === 'confirmed' ? 'color: green;' : 
                      'color: red;'}">${booking.bookingCustomerStatus}</span>
      </div>`;
    
    // Add remittance amount if the booking is remitted
    if (booking.bookingCustomerStatus === 'remitted' && booking.bookingAmount) {
      detailsHTML += `
      <div class="detail-item">
        <label>Remitted Amount:</label>
        <span style="color: #003399; font-weight: bold;">₹${booking.bookingAmount}</span>
      </div>`;
    }
    
    // Add booking date
    detailsHTML += `
      <div class="detail-item">
        <label>Booking Date:</label>
        <span>${bookingDate}</span>
      </div>`;
    
    // Add action buttons based on booking status
    detailsHTML += `<div class="action-buttons">`;
    
    if (booking.bookingCustomerStatus === 'confirmed') {
      // For confirmed bookings, show both Enter Remittance and Cancel Booking buttons
      detailsHTML += `
        <button class="action-btn remittance" onclick="enterRemittance('${booking.id}', ${seatNumber})">Enter Remittance</button>
        <button class="action-btn cancel" onclick="cancelBooking('${booking.id}', ${seatNumber})">Cancel Booking</button>`;
    } else if (booking.bookingCustomerStatus === 'remitted') {
      // For remitted bookings, show a print receipt button
      detailsHTML += `
        <button class="action-btn print" onclick="printReceipt('${booking.id}', ${seatNumber})">Print Receipt</button>`;
    } else if (booking.bookingCustomerStatus === 'cancelled') {
      // For cancelled bookings, show a restore button
      detailsHTML += `
        <button class="action-btn" onclick="restoreBooking('${booking.id}', ${seatNumber})">Restore Booking</button>`;
    }
    
    detailsHTML += `</div>`;
    
    // Set the HTML content of the modal
    detailsContent.innerHTML = detailsHTML;
    
    // Show the modal
    detailsModal.style.display = 'block';
  } else {
    showStatusMessage(`No booking found for seat ${seatNumber}.`, 'error');
  }
}

// Enter remittance function to update seat status after remittance
async function enterRemittance(bookingId, seatNumber) {
  // Prompt for remittance amount
  const remittanceAmount = prompt(`Enter remittance amount for seat ${seatNumber}:`, "");
  
  // Validate the amount
  if (remittanceAmount === null) {
    // User clicked Cancel
    return;
  }
  
  const amount = parseFloat(remittanceAmount);
  if (isNaN(amount) || amount <= 0) {
    showStatusMessage("Please enter a valid amount greater than 0.", "error");
    return;
  }
  
  try {
    // Update the booking in Firebase
    await db.collection('bookings').doc(bookingId).update({
      bookingAmount: amount,
      bookingCustomerStatus: 'remitted'
    });
    
    // Update local data
    bookingsMap[seatNumber].bookingAmount = amount;
    bookingsMap[seatNumber].bookingCustomerStatus = 'remitted';
    
    // Update seat status in the bus layout
    updateSeatStatusInBusLayout();
    
    // Close the modal and show success message
    closeModal('bookingDetailsModal');
    showStatusMessage(`Remittance of ₹${amount} recorded for seat ${seatNumber}.`, 'success');
    
    // Refresh bookings table to show updated status
    displayBookingsInTable();
    
    // Update statistics
    updateBookingStats();
    
  } catch (error) {
    console.error("Error recording remittance:", error);
    showStatusMessage('Error recording remittance. Please try again later.', 'error');
  }
}

// Cancel booking function to update seat status after cancellation
async function cancelBooking(bookingId, seatNumber) {
  if (confirm(`Are you sure you want to cancel the booking for seat ${seatNumber}?`)) {
     if (confirm(`BOOKING DATA WILL BE DELETED PERMANENTLY. Are you sure AGAIN you want to cancel the booking for seat ${seatNumber}?`)) {
    try {
      // Update booking status in Firebase
      await db.collection('bookings').doc(bookingId).delete();
      

      
      // Update UI
      showStatusMessage(`Booking for seat ${seatNumber} has been cancelled.`, 'success');
      closeModal('bookingDetailsModal');
      
      // Update seat status in the bus layout
      updateSeatStatusInBusLayout();
      
      // Refresh bookings table
      displayBookingsInTable();
      
      // Update statistics
      updateBookingStats();

	location.reload();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showStatusMessage('Error cancelling booking. Please try again later.', 'error');
    }
  }
 }
}

// Restore a previously cancelled booking
async function restoreBooking(bookingId, seatNumber) {
  if (confirm(`Are you sure you want to restore the booking for seat ${seatNumber}?`)) {
    try {
      // Update booking status in Firebase
      await db.collection('bookings').doc(bookingId).update({
        bookingCustomerStatus: 'confirmed'
      });
      
      // Update local data
      bookingsMap[seatNumber].bookingCustomerStatus = 'confirmed';
      
      // Update UI
      showStatusMessage(`Booking for seat ${seatNumber} has been restored.`, 'success');
      closeModal('bookingDetailsModal');
      
      // Update seat status in the bus layout
      updateSeatStatusInBusLayout();
      
      // Refresh bookings table
      displayBookingsInTable();
      
      // Update statistics
      updateBookingStats();
    } catch (error) {
      console.error("Error restoring booking:", error);
      showStatusMessage('Error restoring booking. Please try again later.', 'error');
    }
  }
}
























//upto here
// View booking details from table
function viewBookingDetailsFromTable(seatNumber) {
  const seatElement = document.getElementById(`span${seatNumber}`);
  if (seatElement) {
    viewBookingDetails(seatElement);
  } else {
    // If element not found, create a temporary element with the seat number
    const tempElement = document.createElement('span');
    tempElement.innerText = seatNumber;
    viewBookingDetails(tempElement);
  }
}





// Update booking statistics
function updateBookingStats() {
  let bookedSeats = bookings.filter(b => b.bookingCustomerStatus === 'confirmed').length;
  const remittedSeats = bookings.filter(b =>  b.bookingCustomerStatus.includes('remitted')).length;
  bookedSeats=bookedSeats+remittedSeats;
  const cancelledSeats = bookings.filter(b => b.bookingCustomerStatus === 'cancelled').length;
  const availableSeats = totalSeats - bookedSeats;
  
  let totalRevenue = 0;
  let remittedRevenue = 0;
  
  if (tourData) {
    totalRevenue = bookedSeats * tourData.tourFare;
    
    // Calculate actual remitted amount
    bookings.forEach(booking => {
      if (booking.bookingCustomerStatus === 'remitted' && booking.bookingAmount) {
        remittedRevenue += parseFloat(booking.bookingAmount);
      }
    });
  }
  
  document.getElementById('totalSeats').innerText = totalSeats;
  document.getElementById('bookedSeats').innerText = bookedSeats;
  document.getElementById('availableSeats').innerText = availableSeats;
  document.getElementById('cancelledSeats').innerText = remittedSeats;
  document.getElementById('occupancyRate').innerText = `${Math.round((bookedSeats / totalSeats) * 100)}%`;
  document.getElementById('totalRevenue').innerText = `₹${totalRevenue }`;
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
  
  // Get active bookings only (confirmed and remitted)
  const activeBookings = bookings.filter(b => 
    b.bookingCustomerStatus === 'confirmed' || 
    b.bookingCustomerStatus === 'remitted'
  );
  
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
          <th>Status</th>
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
          
          // Format status
          let status = booking.bookingCustomerStatus;
          if (status === 'remitted') {
            status = `Remitted (₹${booking.bookingAmount || 0})`;
          }
          
          return `
            <tr>
              <td>${booking.bookingCustomerSeatNo}</td>
              <td>${booking.bookingCustomerName}</td>
              <td>${booking.bookingCustomerPhoneNo}</td>
              <td>${booking.bookingCustomerEmail}</td>
              <td>${booking.bookingCustomerAadhaarNo}</td>
              <td>${status}</td>
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
          <td>${totalSeats}</td>
          <td>${activeBookings.length}</td>
          <td>${totalSeats - activeBookings.length}</td>
          <td>${Math.round((activeBookings.length / totalSeats) * 100)}%</td>
          <td>₹${activeBookings.reduce((total, booking) => {
            if (booking.bookingCustomerStatus === 'remitted' && booking.bookingAmount) {
              return total + parseFloat(booking.bookingAmount);
            } else {
              return total + parseFloat(tourData ? tourData.tourFare : 0);
            }
          }, 0)}</td>
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
  // Get active bookings only (confirmed and remitted)
  const activeBookings = bookings.filter(b => 
    b.bookingCustomerStatus === 'confirmed' || 
    b.bookingCustomerStatus === 'remitted'
  );
  
  if (activeBookings.length === 0) {
    showStatusMessage('No bookings to export.', 'error');
    return;
  }
  
  // Create CSV content
  let csvContent = 'Seat No,Passenger Name,Phone Number,Email,Aadhaar Number,Booking Status,Amount,Booking Date\n';
  
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
    
    // Determine amount based on status
    let amount = '';
    if (booking.bookingCustomerStatus === 'remitted' && booking.bookingAmount) {
      amount = booking.bookingAmount;
    } else {
      amount = tourData ? tourData.tourFare : '';
    }
    
    csvContent += [
      booking.bookingCustomerSeatNo,
      escapeCsv(booking.bookingCustomerName),
      escapeCsv(booking.bookingCustomerPhoneNo),
      escapeCsv(booking.bookingCustomerEmail),
      booking.bookingCustomerAadhaarNo,
      booking.bookingCustomerStatus,
      amount,
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


function showStatusMessage(message, type) {
  // Inject CSS only once
  if (!document.getElementById('statusMessageStyles')) {
    const style = document.createElement('style');
    style.id = 'statusMessageStyles';
    style.textContent = `
      #statusMessage {
        position: fixed;
        top: 20px;
        left: 0;
        padding: 10px 20px;
        border-radius: 5px;
        font-weight: bold;
        z-index: 9999;
        transform: translateX(-100%);
        opacity: 0;
        transition: all 0.5s ease;
      }
      #statusMessage.slide-in-left {
        transform: translateX(0);
        opacity: 1;
      }
      #statusMessage.info {
        background-color: #3498db;
        color: white;
      }
      #statusMessage.error {
        background-color: #e74c3c;
        color: white;
      }
      #statusMessage.success {
        background-color: #2ecc71;
        color: white;
      }
      #statusMessage.hide {
        opacity: 0;
        transform: translateX(-100%);
      }
    `;
    document.head.appendChild(style);
  }

  // Get or create the status message element
  let statusElement = document.getElementById('statusMessage');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'statusMessage';
    document.body.appendChild(statusElement);
  }

  statusElement.innerText = message;
  statusElement.className = ''; // Clear all previous classes
  void statusElement.offsetWidth; // Trigger reflow for animation

  if (type) {
    statusElement.classList.add(type, 'slide-in-left');
  }

  // Auto-hide success messages after 2 seconds
//  if (type === 'success') {
    setTimeout(() => {
      statusElement.innerText = '';
      statusElement.className = 'hide';
    }, 2000);
 // }
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
    
    // Create a status cell with appropriate styling
    let statusCell = booking.bookingCustomerStatus;
    if (booking.bookingCustomerStatus === 'remitted') {
      statusCell = `<span style="color: #003399; font-weight: bold;">Remitted (₹${booking.bookingAmount || 0})</span>`;
    } else if (booking.bookingCustomerStatus === 'confirmed') {
      statusCell = '<span style="color: green;">Confirmed</span>';
    } else if (booking.bookingCustomerStatus === 'cancelled') {
      statusCell = '<span style="color: red;">Cancelled</span>';
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${booking.bookingCustomerSeatNo}</td>
      <td>${booking.bookingCustomerName}</td>
      <td>${booking.bookingCustomerPhoneNo}</td>
      <td>${booking.bookingCustomerEmail}</td>
      <td>${booking.bookingCustomerAadhaarNo}</td>
      <td>${statusCell}</td>
      <td>${bookingDate}</td>
      <td>
        <button class="action-btn" onclick="viewBookingDetailsFromTable(${booking.bookingCustomerSeatNo})">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}







async function printReceipt(bookingId, seatNumber) {
  try {
    if (!bookingId || typeof bookingId !== 'string') {
      showStatusMessage('Invalid booking ID. Please provide a valid booking ID.', 'error');
      return;
    }

    if (!seatNumber || (typeof seatNumber !== 'string' && typeof seatNumber !== 'number')) {
      showStatusMessage('Invalid seat number. Please provide a valid seat number.', 'error');
      return;
    }

    // Get the booking document reference
    const bookingRef = db.collection('bookings').doc(bookingId);
    
    // Fetch the booking
    const doc = await bookingRef.get();

    if (!doc.exists) {
      showStatusMessage(`Booking ID ${bookingId} not found.`, 'error');
      return;
    }

    const booking = doc.data();

    // Check if receipt has already been printed
    if (booking.receiptPrinted) {
      if (confirm('Receipt has already been printed once. Do you still want to print it again?')) {
        // Continue with printing - but we won't mark it again
        console.log('Reprinting receipt that was already printed before');
      } else {
        // User declined to print again
        return;
      }
    }

    // Mark receipt as printed in the database
    await bookingRef.update({
      receiptPrinted: true,
      receiptPrintedTime: firebase.firestore.FieldValue.serverTimestamp()
    });

    seatNumber = String(seatNumber);
    showStatusMessage('Generating receipt...', 'info');

    const requiredFields = [
      { key: 'bookingid', label: 'Booking ID' },
      { key: 'bookingCustomerName', label: 'Customer Name' },
      { key: 'bookingCustomerPhoneNo', label: 'Phone Number' },
      { key: 'bookingCustomerEmail', label: 'Email' },
      { key: 'bookingCustomerAadhaarNo', label: 'Aadhaar Number' },
      { key: 'bookingAmount', label: 'Booking Amount' }
    ];

    for (const field of requiredFields) {
      if (!booking[field.key]) {
        showStatusMessage(`Booking is missing required information: ${field.label}`, 'error');
        return;
      }
    }

    let bookingDate = 'N/A';
    if (booking.bookingDate) {
      try {
        const dateObj = typeof booking.bookingDate.toDate === 'function'
          ? booking.bookingDate.toDate()
          : new Date(booking.bookingDate);

        if (!isNaN(dateObj.getTime())) {
          bookingDate = dateObj.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (dateError) {
        console.error('Error formatting booking date:', dateError);
      }
    }

    const formattedAmount = Number(booking.bookingAmount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });

    // Keep the full receipt data for display purposes
    const rawReceiptData = `
Booking ID: ${booking.bookingid}
Name: ${booking.bookingCustomerName}
Seat No: ${seatNumber}
Amount: ₹${formattedAmount}
Date: ${bookingDate}
    `.trim();

    // Create extremely compact data for QR code to avoid overflow
    const qrCodeData = `${booking.bookingid}|${seatNumber}|${booking.bookingCustomerName.substring(0, 10)}|${booking.bookingAmount}`.trim();

    const sanitizeHtml = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const receiptWindow = window.open('', '_blank', 'width=650,height=850');
    if (!receiptWindow) {
      showStatusMessage('Failed to open receipt window. Please allow pop-ups in your browser settings.', 'error');
      return;
    }

    // Update the HTML to include a "PRINTED" watermark if it's a reprint
    const watermarkStyle = booking.receiptPrinted ? 
      `
      .receipt-box {
        position: relative;
        overflow: hidden;
      }
      .receipt-box::before {
        content: "DUPLICATE";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 60px;
        color: rgba(255, 0, 0, 0.1);
        font-weight: bold;
        white-space: nowrap;
        pointer-events: none;
        z-index: 1;
      }
      ` : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt for Booking ${sanitizeHtml(booking.bookingid)} - Seat ${sanitizeHtml(seatNumber)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 30px;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #003399;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h3 { color: #003399; margin: 0; font-size: 24px; font-weight: 700; }
    .header h6 { color: #555; margin: 5px 0; font-size: 14px; font-weight: 400; }
    .header h4 { color: #003399; margin: 5px 0; font-size: 18px; font-weight: 600; }
    .receipt-box {
      display: flex; justify-content: space-between; flex-wrap: wrap;
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 20px; background-color: #fafafa;
    }
    ${watermarkStyle}
    .left { flex: 1; min-width: 280px; }
    .row { display: flex; margin-bottom: 12px; font-size: 14px; }
    .label { font-weight: 600; width: 160px; color: #003399; }
    .value { flex: 1; color: #333; word-break: break-word; }
    .qr { margin: 10px auto; text-align: center; }
    .print-button {
      display: block; width: 200px; margin: 20px auto 0; padding: 10px;
      background-color: #003399; color: #fff; border: none; border-radius: 5px;
      font-size: 16px; cursor: pointer;
    }
    .print-button:hover { background-color: #002266; }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      .print-button { display: none; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3>K S R T C Kilimanoor</h3>
      <h6>Budget Tourism Cell</h6>
      <h4>Tour Ticket cum Entry Pass</h4>
    </div>
    <div class="receipt-box">
      <div class="left">
        <div class="row"><span class="label">Booking ID:</span><span class="value">${sanitizeHtml(booking.bookingid)}</span></div>
        <div class="row"><span class="label">Name:</span><span class="value">${sanitizeHtml(booking.bookingCustomerName)}</span></div>
        <div class="row"><span class="label">Phone:</span><span class="value">${sanitizeHtml(booking.bookingCustomerPhoneNo)}</span></div>
        <div class="row"><span class="label">Email:</span><span class="value">${sanitizeHtml(booking.bookingCustomerEmail)}</span></div>
        <div class="row"><span class="label">Aadhaar:</span><span class="value">${sanitizeHtml(booking.bookingCustomerAadhaarNo)}</span></div>
        <div class="row"><span class="label">Seat Number:</span><span class="value"><b>${sanitizeHtml(seatNumber)}</b></span></div>
        <div class="row"><span class="label">Amount Paid:</span><span class="value">₹${sanitizeHtml(formattedAmount)}</span></div>
        <div class="row"><span class="label">Booking Date:</span><span class="value">${sanitizeHtml(bookingDate)}</span></div>
        ${booking.receiptPrinted ? `<div class="row"><span class="label">Original Print:</span><span class="value">This is a duplicate receipt</span></div>` : ''}
      </div>
      <div class="qr"><div id="qrcode"></div></div>
    </div>
    <button class="print-button" onclick="window.print()">Print Receipt</button>
    <div class="footer">
      Please present this receipt when boarding. This receipt serves as your official ticket.
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
    // Define QR code data directly within the script
    const qrData = \`${qrCodeData.replace(/`/g, '\\`')}\`;
    
    // Wait for the QR code library to load
    window.onload = function() {
      try {
        if (typeof QRCode !== 'undefined') {
          new QRCode(document.getElementById("qrcode"), {
            text: qrData,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L  // Reduced to L for maximum capacity
          });
        } else {
          console.error("QR code library not loaded");
          document.getElementById("qrcode").innerHTML = "<p style='color:red;'>QR code library failed to load</p>";
        }
      } catch (e) {
        console.error("QR code error", e);
        document.getElementById("qrcode").innerHTML = "<p style='color:red;'>QR code failed to load: " + e.message + "</p>";
      }
    };
  </script>
</body>
</html>
    `;

    receiptWindow.document.open();
    receiptWindow.document.write(htmlContent);
    receiptWindow.document.close();

    showStatusMessage('Receipt generated successfully.', 'success');
    receiptWindow.focus();
    
    // Also update the local bookings data
    if (bookingsMap[seatNumber]) {
      bookingsMap[seatNumber].receiptPrinted = true;
    }
    
  } catch (error) {
    console.error('Error printing receipt:', error);
    showStatusMessage(`Failed to generate receipt: ${error.message || 'Unknown error'}`, 'error');
  }
}

