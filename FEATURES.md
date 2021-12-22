## Done- server side

Register
Login
Logout
Purchase
Inventory / Search
History

## Done- client side

Login
Logout
Inventory view, filtering

## TODO

Add a notification system - when someone buys your product, you get a notification or see
a list of purchases that have been made which you sold

Hashing for password

Confirmation code fix

## LEFTOFF / NEXT STEPS

Make the viewHistory and viewSoldHistory views

## TAKE A LOOK AT LATER

Cannot ever have .hidden and .profile at the same time since the display: conflicts

## Code for later

The following code is for the bookshelfs

```css
#shelf {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.book {
  flex: 0 0 auto;
  border: brown solid 12px;
  border-radius: 12px;
  padding: 12px;
  margin: 12px;
}
```
