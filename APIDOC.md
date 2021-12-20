# POST login

Goal: login user
Body: username, password
Return JSON: all user info

# POST logout

Goal: logout user
Body: userID
Return text: success message

# POST register

Goal: register new user
Body: email, username, password
Return text: success message

# POST purchase

Goal: purchase item
Body: userID, itemID, quantity
Return text: success message

# GET inventory/:subject

Goal: get books in inventory w/ subject=subj
Params: subject
Query: search
Return JSON: all books that meet filter req

# GET viewBuyHistory/:userID

Goal: view history of user with userID=userID
Params: userID
Return JSON: all purchases made by that user

# GET viewSellHistory/:sellerID

Goal: view history of all products sold belonging to seller
Params: sellerID
Query: itemID for a specific selling history of an item
Return JSON: all purchases made for seller, possibly for a specific item

# FUNCTIONS

1. async itemExists(itemID) - return db data abt item
2. async isCorrectPassword(username, password) - return if password matches that in db for user, true or false
3. isValidPassword(password)- test if password is of valid format, return true or false
4. async usernameExists(username) - return db data abt user
5. async userIDExists(userID) - return db data abt user
6. async getDBConnection()
