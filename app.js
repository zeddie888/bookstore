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
Return information about the user: userID, credits,
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

    if (!(await usernameExists(username))) {
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
      let info = await db.get("SELECT id,credits FROM users WHERE username=?", [
        username,
      ]);
      await db.close();
      res.json(info);
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

    if (!(await userIDExists(userID))) {
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

    if (await usernameExists(username)) {
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
    let checkUser = "SELECT username FROM users WHERE username=?";
    let result = await db.get(checkUser, [username]);
    await db.close();
    return result !== undefined;
  } catch (err) {
    throw new Error("Failed");
  }
}

async function userIDExists(userID) {
  try {
    let db = await getDBConnection();
    let checkUser = "SELECT id FROM users WHERE id=?";
    let result = await db.get(checkUser, [userID]);
    await db.close();
    return result !== undefined;
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
