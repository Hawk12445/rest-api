// --- Selectors ---
const modal = document.querySelector('#fbcreate-modal');
const closeBtn = document.querySelector('.close-x');
const cancelBtn = document.querySelector('#cancel-action');
const submitBtn = document.querySelector('#submit-btn');
const amountInput = document.querySelector('#amount-input');
const emailInput = document.querySelector('#email-input');

// --- Functions ---

// 1. Modal Behavior (Toggle visibility)
const toggleModal = (show) => {
    modal.style.display = show ? 'flex' : 'none';
};

// 2. Form Validation
const validateInput = (amount, email) => {
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount, byut.");
        return false;
    }
    if (!email || !email.includes('@')) {
        alert("Please enter a valid email address.");
        return false;
    }
    return true;
};

// 3. API Submission Logic
const handleSubmit = async () => {
    const amount = amountInput.value;
    const email = emailInput.value;

    if (!validateInput(amount, email)) return;

    // UI State: Loading
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    const apiUrl = `https://proxy-embed.vercel.app/api/fbcreate?amount=${amount}&email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log("Success:", data);
        alert("Request sent successfully!");
        toggleModal(false); // Close modal on success
    } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong with the API call.");
    } finally {
        // Reset UI State
        submitBtn.innerText = "Submit";
        submitBtn.disabled = false;
    }
};

// --- Event Listeners ---

closeBtn.addEventListener('click', () => toggleModal(false));
cancelBtn.addEventListener('click', () => toggleModal(false));
submitBtn.addEventListener('click', handleSubmit);

// Optional: Close modal if user clicks outside the modal box
window.onclick = (event) => {
    if (event.target === modal) toggleModal(false);
};
