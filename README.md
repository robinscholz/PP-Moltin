# 📢 PP Moltin

Receive a Paypal Instant Payment Notifciation (IPN) and change the corresponding order’s status to completed.


## Installation

1. Clone this repository or download a copy to your local environment
2. Add a `.env` file to the root folder
```
MOLTIN_CLIENT_ID=
MOLTIN_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_SANDBOX_EMAIL=
PAYPAL_LIVE_EMAIL=
```
3. Create a flow `orders` on moltin

```
curl -X POST "https://api.moltin.com/v2/flows" \
     -H "Authorization: XXXX" \
     -H "Content-Type: application/json" \
     -d $'{
        "data": {
            "type": "flow",
            "name": "Orders",
            "slug": "orders",
            "description": "Extend the orders collection",
            "enabled": true
        }
     }'
```
4. Add a field `txn_id` to the orders flow
```
curl -X "POST" "https://api.moltin.com/v2/fields" \
     -H "Authorization: XXXX" \
     -H "Content-Type: application/json" \
     -d $'{
      "data": {
        "type": "field",
        "name": "Paypal Transaction ID",
        "slug": "txn_id",
        "field_type": "string",
        "description": "Paypal Transaction ID",
        "required": false,
        "unique": false,
        "enabled": true,
        "order": 1,
        "relationships": {
            "flow": {
                "data": {
                    "type": "flow",
                    "id": "XXXX"
                }
            }
        }
      }
    }'
```

## Usage

Run the app with 
```npm run start```

To run the app in production update the `.env` files
```
PAYPAL_ENVIRONMENT=live
```
