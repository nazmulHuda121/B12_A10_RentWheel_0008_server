const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

    // create Databbase && Collection
    const db = client.db('rentDB');
    const productsCollection = db.collection('cars');

    // Create a cars collection
    app.post('/cars', async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // get cars / find all product
    app.get('/cars', async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Featured cars / products
    app.get('/featured-cars', async (req, res) => {
      const cursor = productsCollection.find().sort({ rentPrice: -1 }).limit(6);
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
