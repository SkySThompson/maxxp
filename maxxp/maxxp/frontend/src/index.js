const express = require("express");
const path = require("path");
const LogInCollection = require("./mongo"); 
const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up paths
const templatePath = path.join(__dirname, '../frontend'); // Path to frontend templates
console.log(templatePath);

// Set view engine to hbs
app.set('view engine', 'hbs');
app.set('views', templatePath);

// Serve static files from the frontend directory
app.use(express.static(templatePath)); // Serve static files from the frontend directory

// Routes
app.get('/signup', (req, res) => {
    res.render('signup'); // Render the signup page
});

app.get('/', (req, res) => {
    res.render('login'); // Render the login page
});

app.post('/signup', async (req, res) => {
    const data = {
        name: req.body.name,
        password: req.body.password
    };

    try {
        // Check if the user already exists
        const existingUser  = await LogInCollection.findOne({ name: req.body.name });
        if (existingUser ) {
            return res.status(400).send("User  details already exist");
        }

        // Save the new user
        await LogInCollection.insertMany([data]);
        res.status(201).render("home", {
            naming: req.body.name
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while signing up");
    }
});

app.post('/login', async (req, res) => {
    try {
        const check = await LogInCollection.findOne({ email: req.body.email });

        if (check && check.password === req.body.password) {
            res.status(200).render("home", { naming: `${req.body.email}` });
        } else {
            res.status(401).send("Incorrect password or user does not exist");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred during login");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
