"use strict";
const express = require("express");
const multer = require("multer");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(multer().none());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const INVALID_REQUEST = 400;
const SERVER_ERROR = 500;
const PORT_NUMBER = 8000;
const PARAM_ERROR = "One or more required parameters is missing";
const SERVER_ERR_MSG = "An error occurred on the server. Try again later.";

/*
Accept username and password
Check if auth successful- check if user exists, then check if password matches that of
Update isLoggedIn
Return information about the user
*/
app.post("/bookstore/login", async (req, res) => {
  try {
    res.type("text");
    if (!req.body.username || !req.body.password) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    let username = req.body.username;
    let password = req.body.password;
    let db = await getDBConnection();

    const user = await usernameExists(username);
    if (!user) {
      return res.status(INVALID_REQUEST).send("User does not exist");
    }
    if (!isValidPassword(password)) {
      return res.status(INVALID_REQUEST).send("Password format invalid");
    }
    if (await isCorrectPassword(username, password)) {
      await db.run("UPDATE users SET is_logged_in=? WHERE username=?", [
        1,
        username,
      ]);
      await db.close();
      res.json(user);
    } else {
      await db.close();
      res.status(INVALID_REQUEST).send("Incorrect Password");
    }
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Check if user exists
Log out the user by setting is_logged_in to 0
Return a text message
*/
app.post("/bookstore/logout", async (req, res) => {
  try {
    res.type("text");
    if (!req.body.userID) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    let db = await getDBConnection();
    let userID = req.body.userID;

    const user = await userIDExists(userID);

    if (!user) {
      return res.status(INVALID_REQUEST).send("User does not exist");
    }

    await db.run("UPDATE users SET is_logged_in=? WHERE id=?", [0, userID]);
    await db.close();
    res.send("Logout successful");
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Check if email, username, password provided
Check if user does NOT already exist
Check if password is valid
Return a text message
*/
app.post("/bookstore/register", async (req, res) => {
  try {
    res.type("text");
    if (!req.body.email || !req.body.username || !req.body.password) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    let email = req.body.email;
    let username = req.body.username;
    let password = req.body.password;
    let db = await getDBConnection();

    if ((await usernameExists(username)) !== undefined) {
      return res.status(INVALID_REQUEST).send("User already exists");
    }
    if (!isValidPassword(password)) {
      return res.status(INVALID_REQUEST).send("Password format invalid");
    }

    let addUserQry =
      "INSERT INTO users (email, username, password) VALUES (?, ?, ?)";
    await db.run(addUserQry, [email, username, password]);
    await db.close();
    res.send("Successfully registered");
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Buy an item

Check if user is logged in given id
Check item ID is valid
Check if quantity in cart <= item left in inventory
Check if user has enough credit for the purchase

Buy the item:
Make a new entry in Purchases table
Decrement user credits by that amount
Decrement item quantity by quantity bought

Increment seller's credits by amount bought * price  TODO

Return text
*/
app.post("/bookstore/purchase", async (req, res) => {
  try {
    res.type("text");
    if (!req.body.userID || !req.body.itemID || !req.body.quantity) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    let userID = req.body.userID;
    let itemID = req.body.itemID;
    let quantity = req.body.quantity;
    let db = await getDBConnection();

    const user = await userIDExists(userID);
    if (!user) {
      return res.status(INVALID_REQUEST).send("User does not exist.");
    }

    const item = await itemExists(itemID);
    if (!item) {
      return res.status(INVALID_REQUEST).send("Item does not exist");
    }
    const available = item.quantity;
    if (quantity > available) {
      return res
        .status(INVALID_REQUEST)
        .send("Quantity of item in cart exceeds quantity in stock");
    }
    const price = item.price;
    const buyerCredits = user.credits;
    if (buyerCredits < price * quantity) {
      return res.status(INVALID_REQUEST).send("Insufficient credits");
    }

    let newQuantity = available - quantity;
    await db.run("UPDATE inventory SET quantity=? WHERE id=?", [
      newQuantity,
      itemID,
    ]);

    // Decrement buyer's credits
    const newBalanceBuyer = buyerCredits - price * quantity;
    await db.run("UPDATE users SET credits=? WHERE id=?", [
      newBalanceBuyer,
      userID,
    ]);

    const seller = await userIDExists(item.seller);
    const sellerCredits = seller.credits;
    await db.run("UPDATE users SET credits=? WHERE id=?", [
      sellerCredits + price * quantity,
      seller.id,
    ]);

    await db.run(
      "INSERT INTO purchases (item_id, user_id, quantity, price_per_item, total_cost) " +
        "VALUES(?, ?, ?, ?, ?)",
      [itemID, userID, quantity, price, price * quantity]
    );
    await db.close();
    res.send("Successfully bought item");
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
View inventory of ALL books
But must specify subject- "all" for no subject in particular
Can also provide query- search string (author, title, description)

Return JSON of all books that meet description
*/
app.get("/bookstore/inventory/:subject", async (req, res) => {
  try {
    let db = await getDBConnection();
    const subject = req.params.subject;
    let qry =
      "SELECT i.*, u.username \
              FROM inventory i, users u \
              WHERE i.seller = u.id ";
    const placeholderVals = [];

    if (subject !== "All") {
      qry += "AND subject=?";
      placeholderVals.push(subject);
    }
    if (req.query.search) {
      const search = "%" + req.query.search + "%";
      qry += " AND (title LIKE ? OR author LIKE ? OR description LIKE ?) ";
      for (let i = 0; i < 3; i++) {
        placeholderVals.push(search);
      }
    }
    qry += " ORDER BY title";
    // console.log(qry);
    // console.log(placeholderVals);
    let result = await db.all(qry, placeholderVals);
    res.json(result);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
History of given user

Check if user ID exists
Return all purchases that have that USER ID, json

*/
app.post("/bookstore/viewBuyHistory", async (req, res) => {
  try {
    let db = await getDBConnection();
    res.type("text");
    if (!req.body.userID) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    const userID = req.body.userID;
    if (!(await userIDExists(userID))) {
      return res.status(INVALID_REQUEST).send("User does not exist");
    }
    let qry =
      "SELECT p.*, i.title, i.author, u.username \
        FROM purchases p, inventory i, users u \
        WHERE user_id=? AND p.item_id = i.id AND u.id = i.seller \
        ORDER BY DATETIME(datetime_purchased) DESC";
    let result = await db.all(qry, [userID]);
    res.json(result);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
View purchases of item belonging to seller

Given: required sellerID and optional query for a specific item ID
Query the purchases table first for all purchases made on an item sold by seller
Then if query provided, filter those for only items with itemID

*/
app.post("/bookstore/viewSellHistory", async (req, res) => {
  try {
    let db = await getDBConnection();
    res.type("text");
    if (!req.body.sellerID) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    const sellerID = req.body.sellerID;
    if (!(await userIDExists(sellerID))) {
      return res.status(INVALID_REQUEST).send("Seller does not exist");
    }
    const placeholderVals = [sellerID];
    let qry =
      " SELECT u.username, i.title, i.author, p.quantity, p.price_per_item, \
        p.total_cost, p.datetime_purchased \
        FROM purchases p, inventory i, users u \
        WHERE i.seller=? AND p.item_id= i.id AND u.id = p.user_id \
        ORDER BY DATETIME(datetime_purchased) DESC";

    if (req.query.itemID) {
      qry += " AND p.item_id=?";
      placeholderVals.push(req.query.itemID);
    }

    let result = await db.all(qry, placeholderVals);
    res.json(result);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

async function itemExists(itemID) {
  try {
    let db = await getDBConnection();
    let checkItem = "SELECT * FROM inventory WHERE id=?";
    let result = await db.get(checkItem, [itemID]);
    await db.close();
    return result;
  } catch (err) {
    throw new Error("Failed");
  }
}

async function isCorrectPassword(username, password) {
  try {
    let db = await getDBConnection();
    let checkPW = "SELECT password FROM users WHERE username=?";
    let result = await db.get(checkPW, [username]);
    await db.close();
    return result.password === password;
  } catch (err) {
    throw new Error("Failed");
  }
}

function isValidPassword(password) {
  const pattern = /^[a-zA-Z]\S{3,19}$/;
  return pattern.test(password);
}

async function usernameExists(username) {
  try {
    let db = await getDBConnection();
    let checkUser = "SELECT * FROM users WHERE username=?";
    let result = await db.get(checkUser, [username]);
    await db.close();
    return result;
  } catch (err) {
    throw new Error("Failed");
  }
}

async function userIDExists(userID) {
  try {
    let db = await getDBConnection();
    let checkUser = "SELECT * FROM users WHERE id=?";
    let result = await db.get(checkUser, [userID]);
    await db.close();
    return result;
  } catch (err) {
    throw new Error("Failed");
  }
}

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur are caught in the function that calls this function.
 * @returns {Object} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "bookstore.db",
    driver: sqlite3.Database,
  });
  return db;
}

app.use(express.static("public"));
const PORT = process.env.PORT || PORT_NUMBER;
app.listen(PORT);
