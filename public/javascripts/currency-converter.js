// Currency conversion functionality
document.addEventListener('DOMContentLoaded', function() {
    const currencySwitcher = document.getElementById('currency-switcher');
    if (!currencySwitcher) return; // Exit if element not found
    
    // Load saved currency preference
    const savedCurrency = localStorage.getItem('selectedCurrency') || 'INR';
    currencySwitcher.value = savedCurrency;
    
    // Apply currency formatting to prices on page load
    updatePriceDisplay(savedCurrency);
    
    // Add change event listener
    currencySwitcher.addEventListener('change', function() {
        const selectedCurrency = this.value;
        localStorage.setItem('selectedCurrency', selectedCurrency);
        
        // Update all prices on the page
        updatePriceDisplay(selectedCurrency);
    });
});

// Function to update prices based on selected currency
function updatePriceDisplay(currency) {
    // Currency conversion rates (example rates - should be updated with real-time rates)
    const conversionRates = {
        'INR': 1,        // Base currency
        'USD': 0.012,    // 1 INR = 0.012 USD
        'EUR': 0.011,    // 1 INR = 0.011 EUR
        'GBP': 0.0095    // 1 INR = 0.0095 GBP
    };
    
    // Currency symbols
    const symbols = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    };
    
    // Find all price elements on the page
    const priceElements = document.querySelectorAll('[data-price]');
    
    priceElements.forEach(element => {
        // Get the original price in INR
        const basePrice = parseFloat(element.getAttribute('data-price'));
        
        // Skip if no valid price
        if (isNaN(basePrice)) return;
        
        // Convert to selected currency
        const convertedPrice = basePrice * conversionRates[currency];
        
        // Format the price with appropriate decimal places
        // USD, EUR, GBP typically show 2 decimal places, INR typically shows none
        const formattedPrice = currency === 'INR' 
            ? Math.round(convertedPrice)
            : convertedPrice.toFixed(2);
        
        // Update the display
        element.textContent = `${symbols[currency]} ${formattedPrice}`;
    });
}