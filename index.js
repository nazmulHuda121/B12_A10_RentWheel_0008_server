require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const admin = require('firebase-admin');
const port = process.env.PORT || 3000;

const serviceAccount = require('./rent-wheels-auth-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// Tokenization
const logger = (req, res, next) => {
  console.log('Logging info..');
  next();
};

const verifyFireBaseToken = async (req, res, next) => {
  console.log('in the verify middleware', req.headers.authorization);
  if (!req.headers.authorization) {
    //do not allow to go
    return res.status(401).send({ message: 'unauthorize access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorize access' });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log(userInfo);
    next();
  } catch {
    return res.status(401).send({ message: 'unauthorize access' });
  }
  // verify token
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wbbieaf.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get('/', (req, res) => {
  res.send('RentWheels Category 0008 is running');
});

async function run() {
  try {
    // create client
    // await client.connect();

    // create Database && Collection
    const db = client.db('rentDB');
    const carsCollection = db.collection('cars');
    const bookingsCollection = db.collection('bookings');

    // Create a cars collection
    app.post('/cars', async (req, res) => {
      const newProduct = req.body;
      const result = await carsCollection.insertOne(newProduct);
      res.send(result);
    });

    // get cars / find all cars
    app.get('/cars', async (req, res) => {
      console.log('headers', req.headers);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.providerEmail = email;
      }
      const cursor = carsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get browse cars / all users browse car
    app.get('/browse-car', async (req, res) => {
      const query = { status: 'Available' };
      const cursor = carsCollection.find(query).sort({ _id: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // get single cars details / specific car
    app.get('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const query = new ObjectId(id);
      const result = await carsCollection.findOne(query);
      res.send(result);
    });

    // Update car status
    app.patch('/cars/:id/status', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: status },
      };

      const result = await carsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Featured cars
    app.get('/featured-cars', async (req, res) => {
      const cursor = carsCollection.find().sort({ rentPrice: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Delete single car from my listing
    app.delete('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.send(result);
    });

    // Update car by ID
    app.put('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };

      const result = await carsCollection.updateOne(query, updateDoc);

      // also update related booking if exists
      await bookingsCollection.updateMany(
        { carId: id },
        { $set: { status: updatedData.status } }
      );

      res.send(result);
    });

    //---------------------------------########---------------------------------//

    // Create a booking
    app.post('/bookings', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    // get the booking car
    app.get('/bookings', async (req, res) => {
      const cursor = bookingsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get all bookings by user
    app.get('/bookings/:userEmail', async (req, res) => {
      const userEmail = req.params.userEmail;
      const bookings = await db
        .collection('bookings')
        .find({ userEmail })
        .toArray();
      res.send(bookings);
    });
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`RentWheels server is running on port: ${port}`);
});
