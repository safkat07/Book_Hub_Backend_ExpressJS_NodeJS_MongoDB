const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173"
      'book-hub-client.web.app',
      'book-hub-client.firebaseapp.com'

    
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

//middleware to secure api


//verify token
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized User" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded
    next()
  });

  // next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oykwxyb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    //mongodb colLECTION
    const bookCollection = await client
      .db("Book-Hub")
      .collection("BookCollection");
    const addedBooks = await client.db("Book-Hub").collection("addedBooks");
    const borrowBooksCollection = await client
      .db("Book-Hub")
      .collection("borrowBooksCollection");

    //auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    //if user logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //getting all category book
    app.get("/api/v1/bookCollection", async (req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //add new books
    app.post("/api/v1/addedBooks", verifyToken, async (req, res) => {
      console.log('cook cookies', req.cookies);
      const newBooks = req.body;
      console.log(newBooks);
      const result = await addedBooks.insertOne(newBooks);
      res.send(result);
    });


    // getting added books
    app.get("/api/v1/addedBooks",  async (req, res) => {
      console.log('cook cookies', req.cookies);
      const cursor = addedBooks.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //get books through id
    app.get("/api/v1/bookCollection/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    // get single book details
    app.get("/api/v1/addedBooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedBooks.findOne(query);
      res.send(result);
    });

    //???????????????????????????????????????????
    //send borrowed books according to user
    app.post("/api/v1/borrowedbooks", async (req, res) => {
      const borrowedBooks = req.body;
      console.log(borrowedBooks);
      const result = await borrowBooksCollection.insertOne(borrowedBooks);
      res.send(result);
    });

    //get borrowed books by id
    app.get("/api/v1/borrowedbooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await borrowBooksCollection.findOne(query);
      res.send(result);
    });
    app.get("/api/v1/borrowedbooks", async (req, res) => {
      const cursor = borrowBooksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //update the book quentity when a user borrows a book
    //???????????????????????????????????
    app.patch("/api/v1/addedBooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedQuantity = req.body;

      const newQuantity = {
        $set: {
          quantity: updatedQuantity.quantity,
        },
      };
      console.log(updatedQuantity);
      const result = await addedBooks.updateOne(filter, newQuantity, options);
      res.send(result);
    });

    //update single book
    app.put("/api/v1/addedBooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBook = req.body;

      const updateBook = {
        $set: {
          bookName: updatedBook.bookName,
          authorName: updatedBook.authorName,
          bookCategory: updatedBook.bookCategory,
          quantity: updatedBook.quantity,
          description: updatedBook.description,
          rating: updatedBook.rating,
          photo: updatedBook.photo,
        },
      };
      console.log(updateBook);
      const result = await addedBooks.updateOne(filter, updateBook, options);
      res.send(result);
    });

    //update return book status to returned
    //?????????????????????????????????????
    app.put("/api/v1/borrowedbooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateBorrowedBookStatus = req.body;

      const updatedReturn = {
        $set: {
          status: updateBorrowedBookStatus.status,
        },
      };
      console.log(updateBorrowedBookStatus);
      const result = await borrowBooksCollection.updateOne(
        filter,
        updatedReturn,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Book Hub Libraryyyyyyyyyyyyyyyyy server issssss running");
});

app.listen(port, () => {
  console.log(`Book Hub Library server is listening on: ${port}`);
});
