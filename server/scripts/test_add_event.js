const axios = require('axios');

async function testAddEvent() {
    try {
        const response = await axios.post('http://localhost:5000/api/calendar/', {
            nameEn: 'Regional Managers Meeting',
            date: '2026-03-20',
            type: 'MEETING',
            venue: 'Regional Office Conference Hall'
        });
        console.log('Event added successfully:', response.data);
    } catch (error) {
        console.error('Error adding event:', error.response ? error.response.data : error.message);
    }
}

testAddEvent();
