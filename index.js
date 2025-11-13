// Load environment variables from .env file
require('dotenv').config();

// Import dependencies
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Firebase Admin SDK using service account
const serviceAccount = require('./rent-wheels-auth-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware setup
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());

// Logger middleware
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

// Firebase token verification middleware
const verifyFireBaseToken = async (req, res, next) => {
  console.log('Verifying Firebase token...');

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res
      .status(401)
      .send({ message: 'Unauthorized: Invalid token format' });
  }

  try {
    const decodedUser = await admin.auth().verifyIdToken(token);
    req.token_email = decodedUser.email;
    console.log('Token verified for:', decodedUser.email);
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).send({ message: 'Unauthorized: Token invalid' });
  }
};

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wbbieaf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Base route
app.get('/', (req, res) => {
  res.send('RentWheels Server is Running!');
});

// Main server function
async function run() {
  try {
    const db = client.db('rentDB');
    const carsCollection = db.collection('cars');
    const bookingsCollection = db.collection('bookings');

    // -------------------  Car Routes -------------------

    // Create new car
    app.post('/cars', async (req, res) => {
      const newCar = req.body;
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
    });

    // Get all cars (with optional provider email filter)
    app.get('/cars', logger, verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: 'Forbidden access' });
        }
        query.providerEmail = email;
      }

      const result = await carsCollection.find(query).toArray();
      res.send(result);
    });

    // Get only "Available" cars for browsing
    app.get('/browse-car', async (req, res) => {
      const query = { status: 'Available' };
      const result = await carsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // Get a single car by ID
    app.get('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const result = await carsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Update car status
    app.patch('/cars/:id/status', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const result = await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

    // Featured cars (Top 6 by price)
    app.get('/featured-cars', async (req, res) => {
      const result = await carsCollection
        .find()
        .sort({ rentPrice: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // Update a car
    app.put('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      // Update related bookings if exist
      await bookingsCollection.updateMany(
        { carId: id },
        { $set: { status: updatedData.status } }
      );

      res.send(result);
    });

    // Delete car
    app.delete('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const result = await carsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // -------------------  Booking Routes -------------------

    // Create a booking
    app.post('/bookings', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    // Get all bookings
    app.get('/bookings', async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });

    // Get bookings by user
    app.get('/bookings/:userEmail', async (req, res) => {
      const userEmail = req.params.userEmail;
      const bookings = await bookingsCollection.find({ userEmail }).toArray();
      res.send(bookings);
    });

    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Error connecting to DB:', error.message);
  }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
  console.log(`RentWheels Server running on port: ${port}`);
});
