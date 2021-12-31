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
const USER_DNE_ERROR = "User does not exist";
const USER_NOT_LOGGEDIN_ERROR = "User is not logged in";
const SERVER_ERR_MSG = "An error occurred on the server. Try again later.";

/*
Logs in user

Given: username, password
Check:
  If user exists
  If password is correct
Update database to set is_logged_in = 1 for user
Returns JSON about the user
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
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
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
Logout user

Given: user ID
Check: if user exists
Log out the user by setting is_logged_in to 0

Return text
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
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
    }

    await db.run("UPDATE users SET is_logged_in=? WHERE id=?", [0, userID]);
    await db.close();
    res.send("Logout successful");
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Register new user by adding new record into Users table

Given: new user email, username, password
Check
  If user does NOT already exist
  If password is of valid format

Return text
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
Makes purchase

Given: userID, itemID, quantity
Check:
  If user exists and is logged in
  If item exists
  If quantity in cart <= item left in inventory
  If user has enough credit for the purchase

Note: buy the item:
  Make a new entry in Purchases table
  Decrement user credits by amount bought * price
  Increment seller's credits by amount bought * price
  Decrement item quantity by quantity bought

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
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
    }

    if (!(await isLoggedIn(userID))) {
      return res.status(INVALID_REQUEST).send(USER_NOT_LOGGEDIN_ERROR);
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

    // Increment seller's credits
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
Get JSON about all books that match filter criteria
Given:
  subject- "All" for no subject in particular
  Can also provide (optional) query- search string (author, title, description)
Check: none
Return JSON
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
    let result = await db.all(qry, placeholderVals);
    res.json(result);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Get JSON about this user's every purchase
Given: user id
Check:
  User exists and is logged in
Return JSON
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
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
    }

    if (!(await isLoggedIn(userID))) {
      return res.status(INVALID_REQUEST).send(USER_NOT_LOGGEDIN_ERROR);
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
Get JSON about all purchases of any item where item's seller = this user
Given: seller's userID and (optional) query for a specific item ID
Check:
  User exists and is logged in
Return JSON
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
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
    }

    if (!(await isLoggedIn(sellerID))) {
      return res.status(INVALID_REQUEST).send(USER_NOT_LOGGEDIN_ERROR);
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

/**
 * Get JSON about item with id = itemID
 * Given: item id
 * Check: if item exists
 * Return JSON
 */
app.get("/bookstore/itemInfo/:itemID", async (req, res) => {
  try {
    let itemInfo = await itemExists(req.params.itemID);
    if (itemInfo == null) {
      return res
        .type("text")
        .status(INVALID_REQUEST)
        .send("Item does not exist");
    }
    res.json(itemInfo);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/*
Adds new book to Inventory table
Given: new book title, author, subject, description, price, quantity, seller's userID
Check:
  User exists, is logged in
Return text
*/
app.post("/bookstore/listNewItem", async (req, res) => {
  try {
    let db = await getDBConnection();
    res.type("text");
    if (
      !req.body.userID ||
      !req.body.title ||
      !req.body.author ||
      !req.body.description ||
      !req.body.price ||
      !req.body.quantity ||
      !req.body.subject
    ) {
      return res.status(INVALID_REQUEST).send(PARAM_ERROR);
    }
    const userID = req.body.userID;
    if (!(await userIDExists(userID))) {
      return res.status(INVALID_REQUEST).send(USER_DNE_ERROR);
    }
    if (!(await isLoggedIn(userID))) {
      return res.status(INVALID_REQUEST).send(USER_NOT_LOGGEDIN_ERROR);
    }

    let addItemQry =
      "INSERT INTO inventory (title, author, subject, description, \
      price, quantity, seller) VALUES(?, ?, ?, ?, ?, ?, ?)";
    await db.run(addItemQry, [
      req.body.title,
      req.body.author,
      req.body.subject,
      req.body.description,
      req.body.price,
      req.body.quantity,
      req.body.userID,
    ]);
    res.send("Item added for sale!");
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERR_MSG);
  }
});

/**
 * Checks database to see if user with given userID is logged in
 * @param {number} userID
 * @returns {boolean} - true if user is logged in; false otherwise
 */
async function isLoggedIn(userID) {
  try {
    let db = await getDBConnection();
    let checkLoggedIn = await db.get(
      "SELECT is_logged_in FROM users WHERE id=?",
      userID
    );
    await db.close();
    return checkLoggedIn.is_logged_in === 1;
  } catch (error) {
    throw new Error(SERVER_ERR_MSG);
  }
}

/**
 * Returns item information if an item exists with given itemID
 * @param {number} itemID
 * @returns {Object} - Information about item with id of itemID
 */
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

/**
 * Checks database to see if given password is identical to one stored for given user
 * @param {string} username
 * @param {string} password
 * @returns {boolean} true if password is correct; false otherwise
 */
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

/**
 * Returns if given password is of valid format (matches specific Regex pattern)
 * format: between 4 and 20 chars, first char is a capitalized letter, no spaces
 * @param {string} password
 * @returns {boolean} - true if given password is of valid format; false otherwise
 */
function isValidPassword(password) {
  const pattern = /^[a-zA-Z]\S{3,19}$/;
  return pattern.test(password);
}

/**
 * Returns user information if a user exists with given username
 * @param {string} username - user's username
 * @returns {Object} - Information about user (id, credits, etc.)
 */
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

/**
 * Returns user information if a user exists with given userID
 * @param {number} userID - user's ID
 * @returns {Object} - Information about user (id, credits, etc.)
 */
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
