console.log("SERVER FILE LOADED");

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

console.log("ABOUT TO START SERVER");

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});