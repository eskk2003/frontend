// app.js
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_BASE_URL = 'http://localhost:5000/api'; // Change this to your deployed backend URL
    
    // State management
    let currentSection = 'dashboard';
    let guests = [];
    let rooms = [];
    let bookings = [];
    let currentEditId = null;
    
    // DOM Elements
    const apiStatus = document.getElementById('api-status');
    const apiUrlDisplay = document.getElementById('api-url-display');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navbar = document.querySelector('.navbar');
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.navbar a');
    const loadingOverlay = document.getElementById('loading-overlay');
    const modal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    
    // Dashboard elements
    const totalGuestsEl = document.getElementById('total-guests');
    const totalRoomsEl = document.getElementById('total-rooms');
    const totalBookingsEl = document.getElementById('total-bookings');
    const revenueEl = document.getElementById('revenue');
    
    // Initialize
    function init() {
        setupEventListeners();
        updateApiDisplay();
        checkApiConnection();
        loadDashboardData();
        showSection('dashboard');
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                showSection(section);
                if (window.innerWidth <= 768) {
                    navbar.classList.remove('active');
                }
            });
        });
        
        // Quick action buttons
        document.querySelectorAll('[data-section]').forEach(btn => {
            if (btn.tagName === 'BUTTON') {
                btn.addEventListener('click', () => {
                    const section = btn.getAttribute('data-section');
                    showSection(section);
                });
            }
        });
        
        // Mobile menu
        mobileMenuBtn.addEventListener('click', () => {
            navbar.classList.toggle('active');
        });
        
        // Modal
        modalCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Forms
        setupFormListeners();
        
        // Search functionality
        setupSearchListeners();
        
        // Pagination
        setupPaginationListeners();
    }
    
    // Show specific section
    function showSection(sectionId) {
        // Update navigation
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            currentSection = sectionId;
            
            // Load data for the section
            switch(sectionId) {
                case 'guests':
                    loadGuests();
                    break;
                case 'rooms':
                    loadRooms();
                    break;
                case 'bookings':
                    loadBookings();
                    loadGuestsForSelect();
                    loadRoomsForSelect();
                    break;
                case 'dashboard':
                    loadDashboardData();
                    break;
            }
        }
    }
    
    // API Connection check
    async function checkApiConnection() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/guests`);
            if (response.ok) {
                apiStatus.textContent = 'Connected';
                apiStatus.style.color = '#27ae60';
            } else {
                apiStatus.textContent = 'Error';
                apiStatus.style.color = '#e74c3c';
            }
        } catch (error) {
            apiStatus.textContent = 'Disconnected';
            apiStatus.style.color = '#e74c3c';
            console.error('API Connection Error:', error);
        } finally {
            hideLoading();
        }
    }
    
    function updateApiDisplay() {
        apiUrlDisplay.textContent = `Backend API: ${API_BASE_URL}`;
    }
    
    // Loading overlay
    function showLoading() {
        loadingOverlay.classList.add('active');
    }
    
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }
    
    // Modal functions
    function showConfirmationModal(message, onConfirm) {
        modalMessage.textContent = message;
        modal.classList.add('active');
        
        // Remove previous listeners
        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        
        // Add new listener
        newConfirmBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            if (onConfirm) onConfirm();
        });
        
        // Update reference
        modalConfirm = newConfirmBtn;
    }
    
    // API Helper Functions
    async function apiFetch(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    // Dashboard functions
    async function loadDashboardData() {
        try {
            showLoading();
            
            // Fetch all data in parallel
            const [guestsData, roomsData, bookingsData] = await Promise.all([
                apiFetch('/guests'),
                apiFetch('/rooms'),
                apiFetch('/bookings')
            ]);
            
            guests = guestsData || [];
            rooms = roomsData || [];
            bookings = bookingsData || [];
            
            // Update dashboard stats
            totalGuestsEl.textContent = guests.length;
            totalRoomsEl.textContent = rooms.length;
            totalBookingsEl.textContent = bookings.filter(b => 
                b.status === 'booked' || b.status === 'checked-in').length;
            
            // Calculate revenue (simple example: sum of all room prices for active bookings)
            const activeBookings = bookings.filter(b => 
                b.status === 'booked' || b.status === 'checked-in');
            const revenue = activeBookings.reduce((sum, booking) => {
                const room = rooms.find(r => r._id === booking.roomId);
                return sum + (room ? room.price : 0);
            }, 0);
            
            revenueEl.textContent = `$${revenue.toFixed(2)}`;
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            hideLoading();
        }
    }
    
    // Guest functions
    async function loadGuests() {
        try {
            showLoading();
            guests = await apiFetch('/guests');
            renderGuestsTable(guests);
        } catch (error) {
            console.error('Error loading guests:', error);
            alert('Failed to load guests');
        } finally {
            hideLoading();
        }
    }
    
    function renderGuestsTable(guestList) {
        const tbody = document.getElementById('guests-table-body');
        tbody.innerHTML = '';
        
        if (guestList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="no-data">No guests found</td></tr>`;
            return;
        }
        
        guestList.forEach(guest => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${guest.name}</td>
                <td>${guest.email || '-'}</td>
                <td>${guest.phone || '-'}</td>
                <td>
                    <div class="action-buttons-container">
                        <button class="btn btn-sm btn-primary edit-guest" data-id="${guest._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-guest" data-id="${guest._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners to new buttons
        document.querySelectorAll('.edit-guest').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editGuest(id);
            });
        });
        
        document.querySelectorAll('.delete-guest').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const guest = guests.find(g => g._id === id);
                showConfirmationModal(
                    `Are you sure you want to delete guest "${guest.name}"?`,
                    () => deleteGuest(id)
                );
            });
        });
    }
    
    async function editGuest(id) {
        const guest = guests.find(g => g._id === id);
        if (!guest) return;
        
        document.getElementById('guest-id').value = guest._id;
        document.getElementById('guest-name').value = guest.name || '';
        document.getElementById('guest-email').value = guest.email || '';
        document.getElementById('guest-phone').value = guest.phone || '';
        
        document.getElementById('guest-submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Guest';
        
        // Scroll to form
        document.querySelector('#guest-form').scrollIntoView({ behavior: 'smooth' });
    }
    
    async function deleteGuest(id) {
        try {
            showLoading();
            await apiFetch(`/guests/${id}`, { method: 'DELETE' });
            await loadGuests();
            await loadDashboardData(); // Refresh dashboard
            await loadGuestsForSelect(); // Refresh booking form select
            alert('Guest deleted successfully');
        } catch (error) {
            console.error('Error deleting guest:', error);
            alert('Failed to delete guest');
        } finally {
            hideLoading();
        }
    }
    
    // Room functions
    async function loadRooms() {
        try {
            showLoading();
            rooms = await apiFetch('/rooms');
            renderRoomsTable(rooms);
        } catch (error) {
            console.error('Error loading rooms:', error);
            alert('Failed to load rooms');
        } finally {
            hideLoading();
        }
    }
    
    function renderRoomsTable(roomList) {
        const tbody = document.getElementById('rooms-table-body');
        tbody.innerHTML = '';
        
        if (roomList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No rooms found</td></tr>`;
            return;
        }
        
        roomList.forEach(room => {
            const statusClass = `status-${room.status}`;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.number}</td>
                <td>${room.type}</td>
                <td>$${room.price.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${room.status}</span></td>
                <td>
                    <div class="action-buttons-container">
                        <button class="btn btn-sm btn-primary edit-room" data-id="${room._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-room" data-id="${room._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners to new buttons
        document.querySelectorAll('.edit-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editRoom(id);
            });
        });
        
        document.querySelectorAll('.delete-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const room = rooms.find(r => r._id === id);
                showConfirmationModal(
                    `Are you sure you want to delete room "${room.number}"?`,
                    () => deleteRoom(id)
                );
            });
        });
    }
    
    async function editRoom(id) {
        const room = rooms.find(r => r._id === id);
        if (!room) return;
        
        document.getElementById('room-id').value = room._id;
        document.getElementById('room-number').value = room.number || '';
        document.getElementById('room-type').value = room.type || '';
        document.getElementById('room-price').value = room.price || '';
        document.getElementById('room-status').value = room.status || 'available';
        
        document.getElementById('room-submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Room';
        
        // Scroll to form
        document.querySelector('#room-form').scrollIntoView({ behavior: 'smooth' });
    }
    
    async function deleteRoom(id) {
        try {
            showLoading();
            await apiFetch(`/rooms/${id}`, { method: 'DELETE' });
            await loadRooms();
            await loadDashboardData(); // Refresh dashboard
            await loadRoomsForSelect(); // Refresh booking form select
            alert('Room deleted successfully');
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Failed to delete room');
        } finally {
            hideLoading();
        }
    }
    
    // Booking functions
    async function loadBookings() {
        try {
            showLoading();
            bookings = await apiFetch('/bookings');
            renderBookingsTable(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            alert('Failed to load bookings');
        } finally {
            hideLoading();
        }
    }
    
    async function loadGuestsForSelect() {
        try {
            const guestsData = await apiFetch('/guests');
            const select = document.getElementById('booking-guest');
            select.innerHTML = '<option value="">Select Guest</option>';
            
            guestsData.forEach(guest => {
                const option = document.createElement('option');
                option.value = guest._id;
                option.textContent = guest.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading guests for select:', error);
        }
    }
    
    async function loadRoomsForSelect() {
        try {
            const roomsData = await apiFetch('/rooms');
            const select = document.getElementById('booking-room');
            select.innerHTML = '<option value="">Select Room</option>';
            
            roomsData.forEach(room => {
                const option = document.createElement('option');
                option.value = room._id;
                option.textContent = `${room.number} (${room.type} - $${room.price})`;
                option.disabled = room.status === 'occupied';
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading rooms for select:', error);
        }
    }
    
    function renderBookingsTable(bookingList) {
        const tbody = document.getElementById('bookings-table-body');
        tbody.innerHTML = '';
        
        if (bookingList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No bookings found</td></tr>`;
            return;
        }
        
        // Get guest and room names for display
        const bookingsWithDetails = bookingList.map(booking => {
            const guest = guests.find(g => g._id === booking.guestId);
            const room = rooms.find(r => r._id === booking.roomId);
            return {
                ...booking,
                guestName: guest ? guest.name : 'Unknown',
                roomNumber: room ? room.number : 'Unknown'
            };
        });
        
        bookingsWithDetails.forEach(booking => {
            const statusClass = `status-${booking.status}`;
            const checkIn = new Date(booking.checkIn).toLocaleDateString();
            const checkOut = new Date(booking.checkOut).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${booking.guestName}</td>
                <td>${booking.roomNumber}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
                <td>
                    <div class="action-buttons-container">
                        <button class="btn btn-sm btn-primary edit-booking" data-id="${booking._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-booking" data-id="${booking._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners to new buttons
        document.querySelectorAll('.edit-booking').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editBooking(id);
            });
        });
        
        document.querySelectorAll('.delete-booking').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const booking = bookings.find(b => b._id === id);
                showConfirmationModal(
                    `Are you sure you want to delete this booking?`,
                    () => deleteBooking(id)
                );
            });
        });
    }
    
    async function editBooking(id) {
        const booking = bookings.find(b => b._id === id);
        if (!booking) return;
        
        document.getElementById('booking-id').value = booking._id;
        document.getElementById('booking-guest').value = booking.guestId || '';
        document.getElementById('booking-room').value = booking.roomId || '';
        document.getElementById('check-in').value = booking.checkIn.split('T')[0];
        document.getElementById('check-out').value = booking.checkOut.split('T')[0];
        document.getElementById('booking-status').value = booking.status || 'booked';
        
        document.getElementById('booking-submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Booking';
        
        // Scroll to form
        document.querySelector('#booking-form').scrollIntoView({ behavior: 'smooth' });
    }
    
    async function deleteBooking(id) {
        try {
            showLoading();
            await apiFetch(`/bookings/${id}`, { method: 'DELETE' });
            await loadBookings();
            await loadDashboardData(); // Refresh dashboard
            alert('Booking deleted successfully');
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('Failed to delete booking');
        } finally {
            hideLoading();
        }
    }
    
    // Form setup
    function setupFormListeners() {
        // Guest form
        const guestForm = document.getElementById('guest-form');
        guestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveGuest();
        });
        
        document.getElementById('guest-reset-btn').addEventListener('click', () => {
            resetGuestForm();
        });
        
        // Room form
        const roomForm = document.getElementById('room-form');
        roomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRoom();
        });
        
        document.getElementById('room-reset-btn').addEventListener('click', () => {
            resetRoomForm();
        });
        
        // Booking form
        const bookingForm = document.getElementById('booking-form');
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveBooking();
        });
        
        document.getElementById('booking-reset-btn').addEventListener('click', () => {
            resetBookingForm();
        });
        
        // Set min date for check-in/out to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('check-in').min = today;
        document.getElementById('check-out').min = today;
        
        // Update check-out min date when check-in changes
        document.getElementById('check-in').addEventListener('change', function() {
            document.getElementById('check-out').min = this.value;
        });
    }
    
    // Form save functions
    async function saveGuest() {
        const id = document.getElementById('guest-id').value;
        const guestData = {
            name: document.getElementById('guest-name').value,
            email: document.getElementById('guest-email').value,
            phone: document.getElementById('guest-phone').value
        };
        
        try {
            showLoading();
            let result;
            
            if (id) {
                // Update existing guest
                result = await apiFetch(`/guests/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(guestData)
                });
            } else {
                // Create new guest
                result = await apiFetch('/guests', {
                    method: 'POST',
                    body: JSON.stringify(guestData)
                });
            }
            
            resetGuestForm();
            await loadGuests();
            await loadDashboardData();
            await loadGuestsForSelect();
            
            alert(`Guest ${id ? 'updated' : 'created'} successfully`);
        } catch (error) {
            console.error('Error saving guest:', error);
            alert('Failed to save guest');
        } finally {
            hideLoading();
        }
    }
    
    async function saveRoom() {
        const id = document.getElementById('room-id').value;
        const roomData = {
            number: document.getElementById('room-number').value,
            type: document.getElementById('room-type').value,
            price: parseFloat(document.getElementById('room-price').value),
            status: document.getElementById('room-status').value
        };
        
        try {
            showLoading();
            let result;
            
            if (id) {
                // Update existing room
                result = await apiFetch(`/rooms/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(roomData)
                });
            } else {
                // Create new room
                result = await apiFetch('/rooms', {
                    method: 'POST',
                    body: JSON.stringify(roomData)
                });
            }
            
            resetRoomForm();
            await loadRooms();
            await loadDashboardData();
            await loadRoomsForSelect();
            
            alert(`Room ${id ? 'updated' : 'created'} successfully`);
        } catch (error) {
            console.error('Error saving room:', error);
            alert('Failed to save room');
        } finally {
            hideLoading();
        }
    }
    
    async function saveBooking() {
        const id = document.getElementById('booking-id').value;
        const bookingData = {
            guestId: document.getElementById('booking-guest').value,
            roomId: document.getElementById('booking-room').value,
            checkIn: document.getElementById('check-in').value,
            checkOut: document.getElementById('check-out').value,
            status: document.getElementById('booking-status').value
        };
        
        // Validate dates
        if (new Date(bookingData.checkOut) <= new Date(bookingData.checkIn)) {
            alert('Check-out date must be after check-in date');
            return;
        }
        
        try {
            showLoading();
            let result;
            
            if (id) {
                // Update existing booking
                result = await apiFetch(`/bookings/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(bookingData)
                });
            } else {
                // Create new booking
                result = await apiFetch('/bookings', {
                    method: 'POST',
                    body: JSON.stringify(bookingData)
                });
            }
            
            resetBookingForm();
            await loadBookings();
            await loadDashboardData();
            
            alert(`Booking ${id ? 'updated' : 'created'} successfully`);
        } catch (error) {
            console.error('Error saving booking:', error);
            alert('Failed to save booking');
        } finally {
            hideLoading();
        }
    }
    
    // Form reset functions
    function resetGuestForm() {
        document.getElementById('guest-form').reset();
        document.getElementById('guest-id').value = '';
        document.getElementById('guest-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Guest';
    }
    
    function resetRoomForm() {
        document.getElementById('room-form').reset();
        document.getElementById('room-id').value = '';
        document.getElementById('room-status').value = 'available';
        document.getElementById('room-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Room';
    }
    
    function resetBookingForm() {
        document.getElementById('booking-form').reset();
        document.getElementById('booking-id').value = '';
        document.getElementById('booking-status').value = 'booked';
        
        // Set min dates
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('check-in').min = today;
        document.getElementById('check-out').min = today;
        
        document.getElementById('booking-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Booking';
    }
    
    // Search functionality
    function setupSearchListeners() {
        // Guest search
        const guestSearch = document.getElementById('guest-search');
        guestSearch.addEventListener('input', () => {
            const searchTerm = guestSearch.value.toLowerCase();
            const filtered = guests.filter(guest => 
                guest.name.toLowerCase().includes(searchTerm) ||
                (guest.email && guest.email.toLowerCase().includes(searchTerm)) ||
                (guest.phone && guest.phone.toLowerCase().includes(searchTerm))
            );
            renderGuestsTable(filtered);
        });
        
        // Room search
        const roomSearch = document.getElementById('room-search');
        roomSearch.addEventListener('input', () => {
            const searchTerm = roomSearch.value.toLowerCase();
            const filtered = rooms.filter(room => 
                room.number.toLowerCase().includes(searchTerm) ||
                room.type.toLowerCase().includes(searchTerm)
            );
            renderRoomsTable(filtered);
        });
        
        // Booking search
        const bookingSearch = document.getElementById('booking-search');
        bookingSearch.addEventListener('input', () => {
            const searchTerm = bookingSearch.value.toLowerCase();
            const filtered = bookings.filter(booking => {
                const guest = guests.find(g => g._id === booking.guestId);
                const room = rooms.find(r => r._id === booking.roomId);
                return (
                    (guest && guest.name.toLowerCase().includes(searchTerm)) ||
                    (room && room.number.toLowerCase().includes(searchTerm)) ||
                    booking.status.toLowerCase().includes(searchTerm)
                );
            });
            renderBookingsTable(filtered);
        });
    }
    
    // Pagination setup (simplified - in a real app you'd implement server-side pagination)
    function setupPaginationListeners() {
        // This is a simplified client-side pagination example
        // In a real app with large datasets, implement server-side pagination
        
        // Add pagination event listeners here if needed
        // For now, we're using search/filter instead of pagination
    }
    
    // Initialize the application
    init();
});