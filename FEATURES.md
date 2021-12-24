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
View buy history
View sell history

## TODO

Add a notification system - when someone buys your product, you get a notification or see
a list of purchases that have been made which you sold

Hashing for password

Confirmation code fix - debate one confirmation for entire card or for each book?

Sell history page - enable filtering by specific book

## LEFTOFF / NEXT STEPS

## TAKE A LOOK AT LATER

Style the history stuff differently

Do we really need to do a fetch each time we filter?

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
