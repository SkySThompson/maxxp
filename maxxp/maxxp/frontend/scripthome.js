let currentSlide = 0;
const slides = document.querySelectorAll(".hero-image");
const textContainer = document.querySelector(".slide-text");

// Text content for each image (in the same order)
const slideTexts = [
    {
        strong1: "Empowering smart decisions",
        strong2: "with real-time energy data",
        small: "enabling efficiency, sustainability, and cost savings."
    },
    {
        strong1: "Harnessing the power of the sun",
        strong2: "to drive clean energy solutions",
        small: " for a greener and more sustainable world."
    },
    {
        strong1: "Innovative hydro solutions",
        strong2: "to maximize energy potential",
        small: " while preserving natural resources."
    }
];

function showSlide(index) {
    // Remove 'active' class from all images
    slides.forEach(slide => slide.classList.remove("active"));
   
    // Add 'active' class to the current slide
    slides[index].classList.add("active");

    // Update the text dynamically
    textContainer.innerHTML = `
        <span class="strong-text">${slideTexts[index].strong1}</span><br>
        <span class="strong-text">${slideTexts[index].strong2}</span><br>
        <span class="small-text">${slideTexts[index].small}</span>
    `;
}

// Function to change slides manually
function changeSlide(direction) {
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    if (currentSlide >= slides.length) currentSlide = 0;
    showSlide(currentSlide);
}

// Auto slide every 5 seconds
setInterval(() => changeSlide(1), 8000);

// Show the first slide initially
showSlide(currentSlide);