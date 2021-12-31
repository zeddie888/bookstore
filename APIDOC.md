# Bookstore API Documentation

The purpose of the Bookstore API is to handle the transfer of data to and from the client side -
handle login/logout requests, book purchases, search filtering, etc.

## Register a New User

**Request Format:** `/bookstore/register`

**Body Parameters:** `email`, `username`, `password`

**Request Type:** `POST`

**Returned Data Format**: Text

**Description:** Registers a new user, if a user with given username does not already exist

**Example Request:** `/bookstore/register`

**Example Response:**

```
Successfully registered
```

**Error Handling:**

- Possible 400 (Invalid Request):
  - If the username or password are empty, a 400 error is thrown with the message `One or more required parameters are missing`
  - If the username already exists in the database, a 400 error is thrown with the message `User already exists`
  - If the password is of invalid format, a 400 error is thrown with the message `Password format invalid`
- Possible 500 (Server Error):
  - A 500 error is thrown with the text message "`An error occurred on the server. Try again later.`"
