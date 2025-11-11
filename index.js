const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const uri =
  'mongodb+srv://RentWheelDB:peQnpx1z6RGq3THZ@cluster0.wbbieaf.mongodb.net/?appName=Cluster0';

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
    await client.connect();

    // create Database && Collection
    const db = client.db('rentDB');
    const carsCollection = db.collection('cars');

    // Create a cars collection
    app.post('/cars', async (req, res) => {
      const newProduct = req.body;
      const result = await carsCollection.insertOne(newProduct);
      res.send(result);
    });

    // get cars / find all cars
    app.get('/cars', async (req, res) => {
      const cursor = carsCollection.find();
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

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
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
