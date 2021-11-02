const express = require('express')
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
// const bodyParser = require('body-parser');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");

const app = express()
const port = process.env.PORT || 5000

// Firebase admin initialization
const serviceAccount = require("./react-e-store-simple-firebase-firebase-adminsdk-gjais-a62dc4d856.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
// app.use(bodyParser.json())
// or
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9lnx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const idToken = req.headers.authorization.split('Bearer ')[1];
    // console.log('inside', idToken);
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      // console.log(decodedUser.email)
      req.decodedUserEmail = decodedUser.email;
    }
    catch {

    }
  }
  next()
}

async function run() {
    try {
        await client.connect();
        const database = client.db("online_shop");
        const productCollection = database.collection("products");
        const orderCollection = database.collection("orders");
      
    // // GET API
    //   app.get('/products', async (req, res) => {
    //         const cursor = productCollection.find({})
    //         const products = await cursor.limit(10).toArray();
    //         console.log("Products", products);
    //         res.send(products)
    //   })

    // GET API
      app.get('/products', async (req, res) => {
            // console.log(req.query);
            const cursor = productCollection.find({})
            const page = req.query.page;
            const size = parseInt(req.query.size)
            let products;
            const count = await cursor.count();
            if(page){
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else{
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            })
      })

      // POST API
      app.post('/products/byKey', async (req, res) => {
            // console.log(req.body);
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products)
      })

      // get api
      app.get('/orders', verifyToken, async (req, res) => {
          //  console.log(req.query);
          //  const cursor = orderCollection.find({});
          //  const orders = await cursor.toArray();
          //  res.json(orders)
          
          // console.log(req.headers.authorization);

          // let query = {};
          // const email = req.query.email;
          // if(email){
          //   query = { email: email}
          // }
          // else{

          // }
          // const cursor = orderCollection.find(query);
          // const orders = await cursor.toArray();
          // res.json(orders)

          const email = req.query.email;
          if (req.decodedUserEmail === email) {
              const query = { email: email };
              const cursor = orderCollection.find(query);
              const orders = await cursor.toArray();
              res.json(orders);
          }
          else{
            res.status(401).json({ message: 'User not authorized' })
          }
         
      })

      // POST API 
      app.post('/orders', async (req, res) => {
          const order = req.body;
          //   console.log('Orders', order); 
          order.createdAt = new Date();
          const result = await orderCollection.insertOne(order);
          res.json(result)
      })

    
   
     
    } finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})