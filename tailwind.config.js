/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './**/templates/**/*.html', // Adjust this path to match your project structure
        './**/static/js/**/*.js',   // If you have JS files that might include Tailwind classes
        './node_modules/flowbite/**/*.js' // If using Flowbite JS components
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('flowbite/plugin')
    ],
}