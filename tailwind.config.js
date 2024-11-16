module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",  // all files in src directory
        "./pages/**/*.{js,ts,jsx,tsx}", // all files in pages directory
        "./components/**/*.{js,ts,jsx,tsx}", // all files in components directory
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
        },
    },
} 